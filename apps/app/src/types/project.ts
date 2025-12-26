/**
 * Multi-project system type definitions
 */

import type { Part } from "./part";
import type { Material } from "./material";
import type { Furniture } from "./furniture";
import type { Cabinet } from "./cabinet";
import type { Room, WallSegment, Opening, LightSource } from "./room";
import type { CountertopGroup } from "./countertop";

// =============================================================================
// Project Types
// =============================================================================

/**
 * Full project record from database
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  schemaVersion: number;
  revision: number;
  dataSizeBytes: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  isArchived: boolean;
}

/**
 * Project item for list display (without full project_data)
 */
export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
  lastOpenedAt: string;
  dataSizeBytes: number;
  // Computed from project_data for display
  partsCount?: number;
  cabinetsCount?: number;
}

/**
 * ONLY project-specific design data goes to Supabase.
 * User preferences, UI state, and history stay in localStorage.
 *
 * This is intentionally minimal and flexible - as the app evolves,
 * we can add new fields without breaking existing projects (JSONB is schemaless).
 */
export interface ProjectData {
  // Core design data - ONLY these go to database
  parts: Part[];
  materials: Material[];
  furnitures: Furniture[];
  cabinets: Cabinet[];
  rooms: Room[];
  walls: WallSegment[];
  openings: Opening[];
  lights: LightSource[];
  countertopGroups: CountertopGroup[];
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * Sync status for cloud synchronization
 */
export type SyncStatus =
  | "synced" // All changes saved to cloud
  | "local_only" // Changes saved locally, pending cloud sync
  | "syncing" // Currently uploading to cloud
  | "offline" // No internet connection
  | "conflict" // Server has newer version
  | "error"; // Save failed (retry pending)

/**
 * Full sync state with metadata
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  lastLocalSaveAt: Date | null;
  pendingChanges: boolean;
  conflictData?: ProjectData; // Server version if conflict
  errorMessage?: string;
}

// =============================================================================
// API Result Types
// =============================================================================

/**
 * Result of save operation with optimistic locking
 */
export type SaveResult =
  | { success: true; project: Project }
  | {
      success: false;
      error: "CONFLICT";
      serverRevision: number;
      serverData: ProjectData;
    }
  | { success: false; error: "NOT_FOUND" | "SIZE_LIMIT" | "NETWORK" | "UNKNOWN"; message?: string };

/**
 * Conflict resolution strategies
 */
export type ConflictResolution =
  | "keep_local" // Overwrite server with local (force save)
  | "keep_server" // Discard local, load server version
  | "keep_both"; // Save local as new project, keep server

/**
 * Project size estimation result
 */
export interface ProjectSizeEstimate {
  bytes: number;
  formatted: string; // e.g., "2.5 MB"
  isOverSoftLimit: boolean; // > 5MB
  isOverHardLimit: boolean; // > 10MB
}

// =============================================================================
// Constants
// =============================================================================

export const PROJECT_SIZE_SOFT_LIMIT = 5 * 1024 * 1024; // 5MB
export const PROJECT_SIZE_HARD_LIMIT = 10 * 1024 * 1024; // 10MB
export const PROJECT_SCHEMA_VERSION = 1;

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_SYNC_STATE: SyncState = {
  status: "synced",
  lastSyncedAt: null,
  lastLocalSaveAt: null,
  pendingChanges: false,
};

export const EMPTY_PROJECT_DATA: ProjectData = {
  parts: [],
  materials: [],
  furnitures: [],
  cabinets: [],
  rooms: [],
  walls: [],
  openings: [],
  lights: [],
  countertopGroups: [],
};
