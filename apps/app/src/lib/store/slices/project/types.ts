/**
 * Project slice types
 *
 * Shared types for all project sub-slices.
 */

import type {
  Project,
  ProjectData,
  SyncStatus,
  SyncState,
  SaveResult,
  ConflictResolution,
} from "@/types";

// =============================================================================
// Slice Interfaces
// =============================================================================

export interface ProjectMetadataSlice {
  // Current project state
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectDescription: string | null;
  currentProjectRevision: number;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjectName: (name: string) => void;
  resetProjectState: () => void;
}

export interface ProjectSyncSlice {
  // Sync state
  syncState: SyncState;
  isProjectLoading: boolean;

  // Actions
  markAsDirty: () => void;
  markAsSaved: (revision: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setProjectLoading: (loading: boolean) => void;
}

export interface ProjectCrudSlice {
  // Actions
  loadProject: (projectId: string) => Promise<boolean>;
  saveProject: () => Promise<SaveResult>;
  saveProjectAs: (name: string) => Promise<string | null>;
  createNewProject: (name?: string) => Promise<string | null>;
  updateProjectName: (name: string) => Promise<boolean>;
}

export interface ProjectConflictSlice {
  // Actions
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;
  clearConflict: () => void;
}

export interface ProjectSerializationSlice {
  // Actions
  getProjectData: () => ProjectData;
  setProjectData: (data: ProjectData) => void;
}

// Combined project slice interface
export interface ProjectSlice
  extends
    ProjectMetadataSlice,
    ProjectSyncSlice,
    ProjectCrudSlice,
    ProjectConflictSlice,
    ProjectSerializationSlice {}
