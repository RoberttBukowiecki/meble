/**
 * History system type definitions for undo/redo operations
 */

import type { Part } from './part';
import type { Cabinet } from './cabinet';

/**
 * History entry types for undo/redo operations
 */
export type HistoryEntryType =
  | 'ADD_PART'
  | 'REMOVE_PART'
  | 'UPDATE_PART'
  | 'TRANSFORM_PART'
  | 'DUPLICATE_PART'
  | 'TRANSFORM_CABINET'
  | 'ADD_CABINET'
  | 'REMOVE_CABINET'
  | 'UPDATE_CABINET'
  | 'DUPLICATE_CABINET'
  | 'REGENERATE_CABINET'
  | 'UPDATE_GROUP'
  | 'SELECTION'
  | 'MILESTONE'
  // Multiselect operations
  | 'TRANSFORM_MULTISELECT'
  | 'DELETE_MULTISELECT'
  | 'DUPLICATE_MULTISELECT';

/**
 * Category of history entry for UI grouping
 */
export type HistoryEntryKind =
  | 'geometry'
  | 'material'
  | 'cabinet'
  | 'selection'
  | 'misc';

/**
 * Metadata for a history entry
 */
export interface HistoryEntryMeta {
  id: string;
  timestamp: number;
  label: string;
  batchingId?: string;
  isMilestone?: boolean;
  kind: HistoryEntryKind;
}

/**
 * Transform snapshot for position/rotation/scale
 */
export interface TransformSnapshot {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Cabinet regeneration snapshot capturing old and new state
 */
export interface CabinetRegenerationSnapshot {
  cabinetParams?: Partial<Cabinet>;
  partIds: string[];
  parts: Part[];
  partIdMap?: Record<string, string>; // old -> new
}

/**
 * Manual group rename snapshot
 */
export interface GroupRenameSnapshot {
  id: string;
  furnitureId: string;
  name: string;
  partIds: string[];
}

/**
 * Part snapshot for add/remove operations
 */
export interface PartSnapshot extends Partial<Part> {
  _index?: number; // Original index in parts array
}

/**
 * Cabinet snapshot for add/remove/duplicate operations
 */
export interface CabinetSnapshot {
  cabinet: Cabinet & { _index?: number }; // Cabinet with optional index
  parts: Part[]; // All parts belonging to this cabinet
}

/**
 * History entry representing a single undoable/redoable operation
 */
export interface HistoryEntry {
  type: HistoryEntryType;
  targetId?: string;
  targetIds?: string[];
  furnitureId?: string;
  cabinetId?: string;
  before?: PartSnapshot | TransformSnapshot | CabinetRegenerationSnapshot | GroupRenameSnapshot | Partial<Cabinet> | unknown;
  after?: PartSnapshot | TransformSnapshot | CabinetRegenerationSnapshot | GroupRenameSnapshot | Partial<Cabinet> | unknown;
  meta: HistoryEntryMeta;
}
