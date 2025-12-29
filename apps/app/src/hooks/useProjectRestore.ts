/**
 * Hook to restore project on app startup
 *
 * If there's a persisted currentProjectId, automatically loads
 * the project data from the server.
 *
 * IMPORTANT: This hook waits for Zustand store hydration to complete
 * before checking currentProjectId. Without this, the hook would see
 * null (initial state) instead of the persisted value.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "@/providers/AuthProvider";
import { useHydration } from "./useHydration";

export function useProjectRestore() {
  const hasAttemptedRestore = useRef(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isHydrated = useHydration();

  const { currentProjectId, loadProject, resetProjectState } = useStore(
    useShallow((state) => ({
      currentProjectId: state.currentProjectId,
      loadProject: state.loadProject,
      resetProjectState: state.resetProjectState,
    }))
  );

  useEffect(() => {
    // Wait for store to hydrate from localStorage
    // Without this, currentProjectId would be null (initial state)
    if (!isHydrated) return;

    // Wait for auth to finish loading
    if (authLoading) return;

    // Only attempt restore once
    if (hasAttemptedRestore.current) return;

    // If there's a project ID persisted
    if (currentProjectId) {
      // But user is not authenticated, clear the project state
      if (!isAuthenticated) {
        console.log("[ProjectRestore] User not authenticated, clearing project state");
        resetProjectState();
        hasAttemptedRestore.current = true;
        return;
      }

      // User is authenticated, load the project
      console.log("[ProjectRestore] Restoring project:", currentProjectId);
      hasAttemptedRestore.current = true;

      loadProject(currentProjectId).then((success) => {
        if (success) {
          console.log("[ProjectRestore] Project restored successfully");
        } else {
          console.log("[ProjectRestore] Failed to restore project, clearing state");
          resetProjectState();
        }
      });
    } else {
      console.log("[ProjectRestore] No project to restore");
      hasAttemptedRestore.current = true;
    }
  }, [isHydrated, authLoading, isAuthenticated, currentProjectId, loadProject, resetProjectState]);
}
