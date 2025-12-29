/**
 * Project slice for multi-project system
 *
 * This file now re-exports from the modular project slice structure.
 * The implementation is split into smaller, focused sub-slices in the ./project/ directory.
 *
 * @see ./project/index.ts for the combined slice
 * @see ./project/types.ts for type definitions
 * @see ./project/metadataSlice.ts for metadata operations
 * @see ./project/syncSlice.ts for sync state management
 * @see ./project/crudSlice.ts for CRUD operations
 * @see ./project/conflictSlice.ts for conflict resolution
 * @see ./project/serializationSlice.ts for data serialization
 */

export { createProjectSlice, initialProjectState } from "./project";
export type { ProjectSlice } from "./project";
