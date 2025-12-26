/**
 * Project slice for multi-project system
 *
 * Handles:
 * - Current project metadata
 * - Sync state management
 * - Project data serialization
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../types";
import type {
  Project,
  ProjectData,
  SyncStatus,
  SyncState,
  SaveResult,
  ConflictResolution,
} from "@/types";
import { DEFAULT_SYNC_STATE, EMPTY_PROJECT_DATA } from "@/types";
import {
  getProject,
  createProject,
  saveProjectData,
  updateProjectMetadata,
  estimateProjectSize,
} from "@/lib/supabase/projects";

// =============================================================================
// Types
// =============================================================================

export interface ProjectSlice {
  // Current project state
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectDescription: string | null;
  currentProjectRevision: number;

  // Sync state
  syncState: SyncState;
  isProjectLoading: boolean;

  // Actions - Metadata
  setCurrentProject: (project: Project | null) => void;
  markAsDirty: () => void;
  markAsSaved: (revision: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setProjectName: (name: string) => void;

  // Actions - Project CRUD
  loadProject: (projectId: string) => Promise<boolean>;
  saveProject: () => Promise<SaveResult>;
  saveProjectAs: (name: string) => Promise<string | null>;
  createNewProject: (name?: string) => Promise<string | null>;
  updateProjectName: (name: string) => Promise<boolean>;

  // Actions - Conflict resolution
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;
  clearConflict: () => void;

  // Serialization
  getProjectData: () => ProjectData;
  setProjectData: (data: ProjectData) => void;

  // Utility
  resetProjectState: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialProjectState = {
  currentProjectId: null as string | null,
  currentProjectName: "Nowy projekt",
  currentProjectDescription: null as string | null,
  currentProjectRevision: 0,
  syncState: DEFAULT_SYNC_STATE,
  isProjectLoading: false,
};

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectSlice: StateCreator<StoreState, StoreMutators, [], ProjectSlice> = (
  set,
  get
) => ({
  ...initialProjectState,

  // ---------------------------------------------------------------------------
  // Metadata Actions
  // ---------------------------------------------------------------------------

  setCurrentProject: (project: Project | null) => {
    if (project) {
      set({
        currentProjectId: project.id,
        currentProjectName: project.name,
        currentProjectDescription: project.description,
        currentProjectRevision: project.revision,
        syncState: {
          ...DEFAULT_SYNC_STATE,
          status: "synced",
          lastSyncedAt: new Date(),
        },
      });
    } else {
      set({
        currentProjectId: null,
        currentProjectName: "Nowy projekt",
        currentProjectDescription: null,
        currentProjectRevision: 0,
        syncState: DEFAULT_SYNC_STATE,
      });
    }
  },

  markAsDirty: () => {
    const { syncState, currentProjectId } = get();
    // Only mark as dirty if we have a project and it's not already in a special state
    if (currentProjectId && syncState.status !== "syncing" && syncState.status !== "conflict") {
      set({
        syncState: {
          ...syncState,
          status: "local_only",
          pendingChanges: true,
          lastLocalSaveAt: new Date(),
        },
      });
    }
  },

  markAsSaved: (revision: number) => {
    set({
      currentProjectRevision: revision,
      syncState: {
        ...get().syncState,
        status: "synced",
        pendingChanges: false,
        lastSyncedAt: new Date(),
        errorMessage: undefined,
      },
    });
  },

  setSyncStatus: (status: SyncStatus) => {
    set({
      syncState: {
        ...get().syncState,
        status,
      },
    });
  },

  setProjectName: (name: string) => {
    set({ currentProjectName: name });
  },

  // ---------------------------------------------------------------------------
  // Project CRUD Actions
  // ---------------------------------------------------------------------------

  loadProject: async (projectId: string): Promise<boolean> => {
    set({ isProjectLoading: true });

    try {
      const { data, error } = await getProject(projectId);

      if (error || !data) {
        console.error("Failed to load project:", error);
        set({ isProjectLoading: false });
        return false;
      }

      // Set project metadata
      get().setCurrentProject(data);

      // Load project data into store
      get().setProjectData(data.projectData);

      set({ isProjectLoading: false });
      return true;
    } catch (err) {
      console.error("Error loading project:", err);
      set({ isProjectLoading: false });
      return false;
    }
  },

  saveProject: async (): Promise<SaveResult> => {
    const { currentProjectId, currentProjectRevision, syncState } = get();

    if (!currentProjectId) {
      return { success: false, error: "NOT_FOUND", message: "No project to save" };
    }

    // Set syncing status
    set({
      syncState: { ...syncState, status: "syncing" },
    });

    try {
      const projectData = get().getProjectData();
      const result = await saveProjectData(currentProjectId, currentProjectRevision, projectData);

      if (result.success) {
        get().markAsSaved(result.project.revision);
      } else if (result.error === "CONFLICT") {
        // Store conflict data for resolution
        set({
          syncState: {
            ...get().syncState,
            status: "conflict",
            conflictData: result.serverData,
          },
        });
      } else {
        // Other error
        set({
          syncState: {
            ...get().syncState,
            status: "error",
            errorMessage: result.message ?? "Failed to save project",
          },
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({
        syncState: {
          ...get().syncState,
          status: "error",
          errorMessage: message,
        },
      });
      return { success: false, error: "NETWORK", message };
    }
  },

  saveProjectAs: async (name: string): Promise<string | null> => {
    try {
      const projectData = get().getProjectData();
      const { data, error } = await createProject({ name, projectData });

      if (error || !data) {
        console.error("Failed to create project:", error);
        return null;
      }

      // Switch to new project
      get().setCurrentProject(data);
      return data.id;
    } catch (err) {
      console.error("Error creating project:", err);
      return null;
    }
  },

  createNewProject: async (name?: string): Promise<string | null> => {
    try {
      const { data, error } = await createProject({
        name: name ?? "Nowy projekt",
        projectData: EMPTY_PROJECT_DATA,
      });

      if (error || !data) {
        console.error("Failed to create project:", error);
        return null;
      }

      // Clear current data and switch to new project
      get().setProjectData(EMPTY_PROJECT_DATA);
      get().setCurrentProject(data);
      return data.id;
    } catch (err) {
      console.error("Error creating project:", err);
      return null;
    }
  },

  updateProjectName: async (name: string): Promise<boolean> => {
    const { currentProjectId } = get();
    if (!currentProjectId) return false;

    try {
      const { error } = await updateProjectMetadata(currentProjectId, { name });
      if (error) {
        console.error("Failed to update project name:", error);
        return false;
      }

      set({ currentProjectName: name });
      return true;
    } catch (err) {
      console.error("Error updating project name:", err);
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // Conflict Resolution
  // ---------------------------------------------------------------------------

  resolveConflict: async (resolution: ConflictResolution): Promise<void> => {
    const { currentProjectId, currentProjectName, syncState } = get();

    if (!currentProjectId || syncState.status !== "conflict" || !syncState.conflictData) {
      return;
    }

    const localData = get().getProjectData();
    const serverData = syncState.conflictData;

    switch (resolution) {
      case "keep_local": {
        // Force save - get current revision and save
        const { data: project } = await getProject(currentProjectId);
        if (project) {
          const result = await saveProjectData(currentProjectId, project.revision, localData);
          if (result.success) {
            get().markAsSaved(result.project.revision);
          }
        }
        break;
      }

      case "keep_server": {
        // Load server version
        get().setProjectData(serverData);
        // Refresh project to get correct revision
        await get().loadProject(currentProjectId);
        break;
      }

      case "keep_both": {
        // Save local as new project
        await createProject({
          name: `${currentProjectName} (kopia lokalna)`,
          projectData: localData,
        });
        // Load server version into current project
        get().setProjectData(serverData);
        await get().loadProject(currentProjectId);
        break;
      }
    }

    get().clearConflict();
  },

  clearConflict: () => {
    set({
      syncState: {
        ...get().syncState,
        status: "synced",
        conflictData: undefined,
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  getProjectData: (): ProjectData => {
    const state = get();
    return {
      parts: state.parts,
      materials: state.materials,
      furnitures: state.furnitures,
      cabinets: state.cabinets,
      rooms: state.rooms,
      walls: state.walls,
      openings: state.openings,
      lights: state.lights ?? [],
      countertopGroups: state.countertopGroups,
    };
  },

  setProjectData: (data: ProjectData) => {
    // NOTE: We intentionally DO NOT load materials from project data.
    // Materials are hardcoded in INITIAL_MATERIALS (constants.ts) for now.
    // This will change when we implement material management feature.
    set({
      parts: data.parts ?? [],
      // materials: data.materials ?? [], // Keep using INITIAL_MATERIALS
      furnitures: data.furnitures ?? [],
      cabinets: data.cabinets ?? [],
      rooms: data.rooms ?? [],
      walls: data.walls ?? [],
      openings: data.openings ?? [],
      lights: data.lights ?? [],
      countertopGroups: data.countertopGroups ?? [],
      // Reset selection when loading new project
      selectedPartId: null,
      selectedCabinetId: null,
      selectedPartIds: new Set(),
    });

    // Clear history when loading new project
    get().clearHistory();
  },

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  resetProjectState: () => {
    set(initialProjectState);
  },
});
