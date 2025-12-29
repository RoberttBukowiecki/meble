/**
 * Project conflict resolution slice
 *
 * Handles conflict detection and resolution between local and server versions.
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { ConflictResolution } from "@/types";
import type { ProjectConflictSlice } from "./types";
import { getProject, createProject, saveProjectData } from "@/lib/supabase/projects";

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectConflictSlice: StateCreator<
  StoreState,
  StoreMutators,
  [],
  ProjectConflictSlice
> = (set, get) => ({
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
});
