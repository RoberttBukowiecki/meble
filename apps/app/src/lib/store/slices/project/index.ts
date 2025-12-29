/**
 * Project slice
 *
 * Combines all project sub-slices into a single unified slice.
 * This modular approach makes the code easier to maintain and test.
 *
 * Sub-slices:
 * - metadataSlice: Project ID, name, description, revision
 * - syncSlice: Sync state, dirty tracking, save confirmation
 * - crudSlice: Load, save, create, update operations
 * - conflictSlice: Conflict detection and resolution
 * - serializationSlice: Project data serialization
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { ProjectSlice } from "./types";
import { createProjectMetadataSlice, initialMetadataState } from "./metadataSlice";
import { createProjectSyncSlice, initialSyncState } from "./syncSlice";
import { createProjectCrudSlice } from "./crudSlice";
import { createProjectConflictSlice } from "./conflictSlice";
import { createProjectSerializationSlice } from "./serializationSlice";

// =============================================================================
// Combined Initial State
// =============================================================================

export const initialProjectState = {
  ...initialMetadataState,
  ...initialSyncState,
};

// =============================================================================
// Combined Slice Creator
// =============================================================================

export const createProjectSlice: StateCreator<StoreState, StoreMutators, [], ProjectSlice> = (
  ...args
) => ({
  ...createProjectMetadataSlice(...args),
  ...createProjectSyncSlice(...args),
  ...createProjectCrudSlice(...args),
  ...createProjectConflictSlice(...args),
  ...createProjectSerializationSlice(...args),
});

// Re-export types
export type { ProjectSlice } from "./types";
