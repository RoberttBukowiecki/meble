/**
 * History system type definitions for undo/redo operations
 */

import type { Part } from './part';
import type { Cabinet } from './cabinet';
import type {
  CountertopGroup,
  CountertopSegment,
  CncOperation,
  CountertopCornerConfig,
  CountertopJoint,
  CabinetCountertopConfig,
} from './countertop';

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
  | 'DUPLICATE_MULTISELECT'
  // Countertop operations
  | 'ADD_COUNTERTOP_GROUP'
  | 'REMOVE_COUNTERTOP_GROUP'
  | 'UPDATE_COUNTERTOP_GROUP'
  | 'UPDATE_COUNTERTOP_SEGMENT'
  | 'ADD_CNC_OPERATION'
  | 'REMOVE_CNC_OPERATION'
  | 'UPDATE_CNC_OPERATION'
  | 'UPDATE_COUNTERTOP_CORNER'
  | 'UPDATE_COUNTERTOP_JOINT'
  | 'BATCH_UPDATE_COUNTERTOP_CONFIG';

/**
 * Category of history entry for UI grouping
 */
export type HistoryEntryKind =
  | 'geometry'
  | 'material'
  | 'cabinet'
  | 'countertop'
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
 * Countertop group snapshot for add/remove operations
 */
export interface CountertopGroupSnapshot {
  group: CountertopGroup & { _index?: number }; // Group with optional index
}

/**
 * Countertop segment snapshot for update operations
 */
export interface CountertopSegmentSnapshot {
  groupId: string;
  segment: CountertopSegment;
}

/**
 * CNC operation snapshot for add/remove/update operations
 */
export interface CncOperationSnapshot {
  groupId: string;
  segmentId: string;
  operation: CncOperation;
}

/**
 * Countertop corner snapshot for update operations
 */
export interface CountertopCornerSnapshot {
  groupId: string;
  corner: CountertopCornerConfig;
}

/**
 * Countertop joint snapshot for update operations
 */
export interface CountertopJointSnapshot {
  groupId: string;
  joint: CountertopJoint;
}

/**
 * Batch countertop config snapshot for apply-to-all operations
 */
export interface BatchCountertopConfigSnapshot {
  furnitureId: string;
  cabinetConfigs: Array<{
    cabinetId: string;
    config: CabinetCountertopConfig | undefined;
  }>;
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
  before?: PartSnapshot | TransformSnapshot | CabinetRegenerationSnapshot | GroupRenameSnapshot | Partial<Cabinet> | CountertopGroupSnapshot | CountertopSegmentSnapshot | CncOperationSnapshot | CountertopCornerSnapshot | CountertopJointSnapshot | BatchCountertopConfigSnapshot | unknown;
  after?: PartSnapshot | TransformSnapshot | CabinetRegenerationSnapshot | GroupRenameSnapshot | Partial<Cabinet> | CountertopGroupSnapshot | CountertopSegmentSnapshot | CncOperationSnapshot | CountertopCornerSnapshot | CountertopJointSnapshot | BatchCountertopConfigSnapshot | unknown;
  meta: HistoryEntryMeta;
}
