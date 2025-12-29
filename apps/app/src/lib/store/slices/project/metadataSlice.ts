/**
 * Project metadata slice
 *
 * Handles current project metadata (id, name, description, revision).
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { Project } from "@/types";
import { DEFAULT_SYNC_STATE } from "@/types";
import type { ProjectMetadataSlice } from "./types";

// =============================================================================
// Initial State
// =============================================================================

export const initialMetadataState = {
  currentProjectId: null as string | null,
  currentProjectName: "Nowy projekt",
  currentProjectDescription: null as string | null,
  currentProjectRevision: 0,
};

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectMetadataSlice: StateCreator<
  StoreState,
  StoreMutators,
  [],
  ProjectMetadataSlice
> = (set) => ({
  ...initialMetadataState,

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

  setProjectName: (name: string) => {
    set({ currentProjectName: name });
  },

  resetProjectState: () => {
    set({
      ...initialMetadataState,
      syncState: DEFAULT_SYNC_STATE,
      isProjectLoading: false,
    });
  },
});
