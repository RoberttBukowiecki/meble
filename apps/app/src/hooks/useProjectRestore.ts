/**
 * Hook to restore project on app startup
 *
 * If there's a persisted currentProjectId, automatically loads
 * the project data from the server.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "@/providers/AuthProvider";

export function useProjectRestore() {
  const hasAttemptedRestore = useRef(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { currentProjectId, loadProject, resetProjectState } = useStore(
    useShallow((state) => ({
      currentProjectId: state.currentProjectId,
      loadProject: state.loadProject,
      resetProjectState: state.resetProjectState,
    }))
  );

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Only attempt restore once
    if (hasAttemptedRestore.current) return;

    // If there's a project ID persisted
    if (currentProjectId) {
      // But user is not authenticated, clear the project state
      if (!isAuthenticated) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[ProjectRestore] User not authenticated, clearing project state");
        }
        resetProjectState();
        hasAttemptedRestore.current = true;
        return;
      }

      // User is authenticated, load the project
      if (process.env.NODE_ENV === "development") {
        console.debug("[ProjectRestore] Restoring project:", currentProjectId);
      }
      hasAttemptedRestore.current = true;

      loadProject(currentProjectId).then((success) => {
        if (!success) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[ProjectRestore] Failed to restore project, clearing state");
          }
          resetProjectState();
        }
      });
    } else {
      hasAttemptedRestore.current = true;
    }
  }, [authLoading, isAuthenticated, currentProjectId, loadProject, resetProjectState]);
}
