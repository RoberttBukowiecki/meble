/**
 * Project CRUD slice
 *
 * Handles project create, read, update, delete operations.
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { SaveResult } from "@/types";
import { EMPTY_PROJECT_DATA } from "@/types";
import type { ProjectCrudSlice } from "./types";
import {
  getProject,
  createProject,
  saveProjectData,
  updateProjectMetadata,
} from "@/lib/supabase/projects";
import { generateAndUploadThumbnail } from "@/lib/thumbnail";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withRetry, isNetworkError } from "@/lib/retry";
import { isDev, devLog, devError } from "@/lib/env";

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
// Slice Creator
// =============================================================================

export const createProjectCrudSlice: StateCreator<
  StoreState,
  StoreMutators,
  [],
  ProjectCrudSlice
> = (set, get) => ({
  loadProject: async (projectId: string): Promise<boolean> => {
    set({ isProjectLoading: true });

    try {
      const { data, error } = await getProject(projectId);

      devLog("[Project] Loading project:", projectId);
      devLog("[Project] Loaded project metadata:", {
        name: data?.name,
        revision: data?.revision,
      });
      devLog("[Project] Loaded data:", {
        parts: data?.projectData?.parts?.length ?? 0,
        cabinets: data?.projectData?.cabinets?.length ?? 0,
        rooms: data?.projectData?.rooms?.length ?? 0,
      });

      if (error || !data) {
        devError("Failed to load project:", error);
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
      devError("Error loading project:", err);
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

      devLog("[Project] Saving project:", currentProjectId);
      devLog("[Project] Saving data:", {
        parts: projectData.parts?.length ?? 0,
        cabinets: projectData.cabinets?.length ?? 0,
        rooms: projectData.rooms?.length ?? 0,
      });

      // Generate thumbnail if Three.js state is available
      let thumbnailUrl: string | undefined;

      if (isDev()) {
        console.log("[Thumbnail] threeRenderer:", !!threeRenderer, "threeScene:", !!threeScene);
      }

      if (threeRenderer && threeScene) {
        // Get current user ID for storage path
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isDev()) {
          console.log("[Thumbnail] user:", user?.id);
        }

        if (user) {
          const thumbnailResult = await generateAndUploadThumbnail(
            threeRenderer,
            threeScene,
            user.id,
            currentProjectId
          );

          if (isDev()) {
            console.log("[Thumbnail] result:", thumbnailResult);
          }

          if (thumbnailResult.success && thumbnailResult.url) {
            thumbnailUrl = thumbnailResult.url;
          }
          // If thumbnail generation fails, we still proceed with saving the project
          // The thumbnail is optional and shouldn't block the save
        }
      } else {
        devLog("[Thumbnail] Skipped - Three.js state not available");
      }

      devLog("[Project] Calling saveProjectData with revision:", currentProjectRevision);

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
            devLog(`[Project] Save retry ${attempt} in ${delay}ms:`, error);
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

      devLog("[Project] saveProjectData result:", result);

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
      devError("[Project] Unexpected save error:", err);
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
        devError("Failed to create project:", error);
        return null;
      }

      // Switch to new project
      get().setCurrentProject(data);
      return data.id;
    } catch (err) {
      devError("Error creating project:", err);
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
        devError("Failed to create project:", error);
        return null;
      }

      // Clear current data and switch to new project
      get().setProjectData(EMPTY_PROJECT_DATA);
      get().setCurrentProject(data);
      return data.id;
    } catch (err) {
      devError("Error creating project:", err);
      return null;
    }
  },

  updateProjectName: async (name: string): Promise<boolean> => {
    const { currentProjectId } = get();
    if (!currentProjectId) return false;

    try {
      const { error } = await updateProjectMetadata(currentProjectId, { name });
      if (error) {
        devError("Failed to update project name:", error);
        return false;
      }

      set({ currentProjectName: name });
      return true;
    } catch (err) {
      devError("Error updating project name:", err);
      return false;
    }
  },
});
