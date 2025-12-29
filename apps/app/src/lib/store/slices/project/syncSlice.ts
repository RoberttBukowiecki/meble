/**
 * Project sync slice
 *
 * Handles sync state management (status, dirty tracking, save confirmation).
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { SyncStatus } from "@/types";
import { DEFAULT_SYNC_STATE } from "@/types";
import type { ProjectSyncSlice } from "./types";
import { isDev } from "@/lib/env";

// =============================================================================
// Initial State
// =============================================================================

export const initialSyncState = {
  syncState: DEFAULT_SYNC_STATE,
  isProjectLoading: false,
};

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectSyncSlice: StateCreator<
  StoreState,
  StoreMutators,
  [],
  ProjectSyncSlice
> = (set, get) => ({
  ...initialSyncState,

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

    if (isDev()) {
      console.log(
        "[Project] markAsSaved called with revision:",
        revision,
        "(was:",
        prevRevision,
        ")"
      );
    }

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

    if (isDev()) {
      console.log(
        "[Project] State updated, currentProjectRevision is now:",
        get().currentProjectRevision
      );
    }

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
        if (isDev()) {
          console.debug("[Project] BroadcastChannel not available for sync");
        }
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

  setProjectLoading: (loading: boolean) => {
    set({ isProjectLoading: loading });
  },
});
