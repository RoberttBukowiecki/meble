/**
 * Hook for warning users about unsaved changes
 *
 * Provides:
 * - beforeunload handler (browser tab close/refresh)
 * - Navigation blocking with confirmation dialog
 * - Integration with project sync state
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

interface UseUnsavedChangesWarningOptions {
  /** Custom message for the warning (browser may ignore for beforeunload) */
  message?: string;
  /** Whether to enable the warning */
  enabled?: boolean;
}

interface UseUnsavedChangesWarningReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether the project is currently loading */
  isProjectLoading: boolean;
  /** Whether a save is currently in progress */
  isSyncing: boolean;
  /** Attempt to save and return success status */
  saveBeforeAction: () => Promise<boolean>;
  /** Check if it's safe to proceed with an action (no unsaved changes or user confirmed) */
  canProceed: () => Promise<boolean>;
  /** Force proceed without saving (for discard scenarios) */
  discardChanges: () => void;
}

const DEFAULT_MESSAGE = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?";

/**
 * Hook that manages unsaved changes warnings
 *
 * @example
 * ```tsx
 * const { hasUnsavedChanges, canProceed, saveBeforeAction } = useUnsavedChangesWarning();
 *
 * const handleSwitchProject = async (projectId: string) => {
 *   if (await canProceed()) {
 *     loadProject(projectId);
 *   }
 * };
 * ```
 */
export function useUnsavedChangesWarning(
  options: UseUnsavedChangesWarningOptions = {}
): UseUnsavedChangesWarningReturn {
  const { message = DEFAULT_MESSAGE, enabled = true } = options;

  const { syncState, isProjectLoading, currentProjectId, saveProject, markAsSaved } = useStore(
    useShallow((state) => ({
      syncState: state.syncState,
      isProjectLoading: state.isProjectLoading,
      currentProjectId: state.currentProjectId,
      saveProject: state.saveProject,
      markAsSaved: state.markAsSaved,
    }))
  );

  // Track if we're in the middle of a discard operation
  const isDiscardingRef = useRef(false);

  const hasUnsavedChanges =
    currentProjectId !== null &&
    (syncState.status === "local_only" || syncState.status === "error");

  const isSyncing = syncState.status === "syncing";

  // beforeunload handler
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || isDiscardingRef.current) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers ignore custom messages, but we still need to set returnValue
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, hasUnsavedChanges, message]);

  // Attempt to save before proceeding
  const saveBeforeAction = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true; // Nothing to save
    }

    if (isSyncing) {
      // Wait for current sync to complete
      return new Promise((resolve) => {
        const unsubscribe = useStore.subscribe((state) => {
          if (state.syncState.status !== "syncing") {
            unsubscribe();
            resolve(state.syncState.status === "synced");
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 30000);
      });
    }

    const result = await saveProject();
    return result.success;
  }, [hasUnsavedChanges, isSyncing, saveProject]);

  // Check if it's safe to proceed (will be used with confirmation dialog)
  const canProceed = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges || isDiscardingRef.current) {
      return true;
    }

    // This will be overridden by components that show a dialog
    // For now, just return false if there are unsaved changes
    return false;
  }, [hasUnsavedChanges]);

  // Discard changes and allow proceeding
  const discardChanges = useCallback(() => {
    isDiscardingRef.current = true;
    // Reset sync state to synced (effectively discarding local changes marker)
    // The actual data will be overwritten when loading new project
  }, []);

  return {
    hasUnsavedChanges,
    isProjectLoading,
    isSyncing,
    saveBeforeAction,
    canProceed,
    discardChanges,
  };
}

/**
 * Simpler hook just for beforeunload - use when you don't need dialog integration
 */
export function useBeforeUnloadWarning(hasUnsavedChanges: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, message]);
}
