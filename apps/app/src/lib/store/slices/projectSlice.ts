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
import { generateAndUploadThumbnail } from "@/lib/thumbnail";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withRetry, isNetworkError } from "@/lib/retry";

// Retry configuration for save operations
const SAVE_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  isRetryable: (error: unknown) => {
    // Only retry network errors, not conflicts or validation errors
    return isNetworkError(error);
  },
};

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
    const prevRevision = get().currentProjectRevision;
    const projectId = get().currentProjectId;
    console.log(
      "[Project] markAsSaved called with revision:",
      revision,
      "(was:",
      prevRevision,
      ")"
    );
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
    console.log(
      "[Project] State updated, currentProjectRevision is now:",
      get().currentProjectRevision
    );

    // Broadcast save to other tabs via BroadcastChannel
    if (typeof BroadcastChannel !== "undefined" && projectId) {
      try {
        const channel = new BroadcastChannel("e-meble-project-sync");
        channel.postMessage({
          type: "PROJECT_SAVED",
          projectId,
          revision,
          tabId: `store-${Date.now()}`,
          timestamp: Date.now(),
        });
        channel.close();
      } catch (err) {
        // BroadcastChannel not supported or error - ignore
        console.debug("[Project] BroadcastChannel not available for sync");
      }
    }
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

      console.log("[Project] Loading project:", projectId);
      console.log("[Project] Loaded project metadata:", {
        name: data?.name,
        revision: data?.revision,
      });
      console.log("[Project] Loaded data:", {
        parts: data?.projectData?.parts?.length ?? 0,
        cabinets: data?.projectData?.cabinets?.length ?? 0,
        rooms: data?.projectData?.rooms?.length ?? 0,
      });

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
    const { currentProjectId, currentProjectRevision, syncState, threeRenderer, threeScene } =
      get();

    if (!currentProjectId) {
      return { success: false, error: "NOT_FOUND", message: "No project to save" };
    }

    // Set syncing status
    set({
      syncState: { ...syncState, status: "syncing" },
    });

    try {
      const projectData = get().getProjectData();

      console.log("[Project] Saving project:", currentProjectId);
      console.log("[Project] Saving data:", {
        parts: projectData.parts?.length ?? 0,
        cabinets: projectData.cabinets?.length ?? 0,
        rooms: projectData.rooms?.length ?? 0,
      });

      // Generate thumbnail if Three.js state is available
      let thumbnailUrl: string | undefined;
      console.log("[Thumbnail] threeRenderer:", !!threeRenderer, "threeScene:", !!threeScene);

      if (threeRenderer && threeScene) {
        // Get current user ID for storage path
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        console.log("[Thumbnail] user:", user?.id);

        if (user) {
          const thumbnailResult = await generateAndUploadThumbnail(
            threeRenderer,
            threeScene,
            user.id,
            currentProjectId
          );

          console.log("[Thumbnail] result:", thumbnailResult);

          if (thumbnailResult.success && thumbnailResult.url) {
            thumbnailUrl = thumbnailResult.url;
          }
          // If thumbnail generation fails, we still proceed with saving the project
          // The thumbnail is optional and shouldn't block the save
        }
      } else {
        console.log("[Thumbnail] Skipped - Three.js state not available");
      }

      console.log("[Project] Calling saveProjectData with revision:", currentProjectRevision);

      // Use retry logic for network resilience
      const retryResult = await withRetry(
        async () => {
          const result = await saveProjectData(
            currentProjectId,
            currentProjectRevision,
            projectData,
            thumbnailUrl
          );

          // If it's a conflict or other non-network error, don't retry
          if (!result.success && result.error !== "NETWORK") {
            // Return the result as-is, don't throw
            return result;
          }

          // If network error, throw to trigger retry
          if (!result.success && result.error === "NETWORK") {
            throw new Error(result.message || "Network error");
          }

          return result;
        },
        {
          ...SAVE_RETRY_OPTIONS,
          onRetry: (attempt, error, delay) => {
            console.log(`[Project] Save retry ${attempt} in ${delay}ms:`, error);
            // Keep syncing status during retries
          },
        }
      );

      // Handle retry result
      let result: SaveResult;
      if (retryResult.success && retryResult.data) {
        result = retryResult.data;
      } else {
        // All retries failed
        result = {
          success: false,
          error: "NETWORK",
          message: `Nie udało się zapisać po ${retryResult.attempts} próbach. Sprawdź połączenie internetowe.`,
        };
      }

      console.log("[Project] saveProjectData result:", result);

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
      console.error("[Project] Unexpected save error:", err);
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
