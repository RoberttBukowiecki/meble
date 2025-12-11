import type { StateCreator } from 'zustand';
import type { ProjectState, HistoryEntry, HistoryEntryType } from '@/types';
import type { UISlice } from './slices/uiSlice';

export type StoreState = ProjectState & HistorySlice & UISlice;
export type StoreMutators = [['zustand/persist', unknown]];
export type StoreSlice<T> = StateCreator<StoreState, StoreMutators, [], T>;

export type SelectionSlice = Pick<
  StoreState,
  | 'selectedPartId'
  | 'selectedCabinetId'
  | 'selectedFurnitureId'
  | 'isTransforming'
  | 'transformMode'
  | 'selectPart'
  | 'selectCabinet'
  | 'setSelectedFurniture'
  | 'setIsTransforming'
  | 'setTransformMode'
>;

export type MaterialsSlice = Pick<
  StoreState,
  'materials' | 'addMaterial' | 'updateMaterial' | 'removeMaterial'
>;

export type FurnitureSlice = Pick<
  StoreState,
  'furnitures' | 'addFurniture' | 'removeFurniture'
>;

export type PartsSlice = Pick<
  StoreState,
  | 'parts'
  | 'addPart'
  | 'updatePart'
  | 'updatePartsBatch'
  | 'renamePart'
  | 'renameManualGroup'
  | 'removePart'
  | 'duplicatePart'
>;

export type CabinetSlice = Pick<
  StoreState,
  | 'cabinets'
  | 'addCabinet'
  | 'updateCabinet'
  | 'renameCabinet'
  | 'updateCabinetParams'
  | 'removeCabinet'
  | 'duplicateCabinet'
>;

export type CollisionSlice = Pick<StoreState, 'collisions' | 'detectCollisions'>;

/**
 * History slice for undo/redo functionality
 */
export interface HistorySlice {
  // State
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  milestoneStack: HistoryEntry[];
  inFlightBatch: {
    type: HistoryEntryType;
    meta: Partial<{
      id: string;
      timestamp: number;
      label: string;
      kind: string;
      targetId?: string;
    }>;
    before?: unknown;
  } | null;
  limit: number;
  milestoneLimit: number;
  approxByteSize: number;
  timelineCursor?: string | null;

  // Selectors
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  beginBatch: (
    type: HistoryEntryType,
    meta: { targetId?: string; before?: unknown }
  ) => void;
  commitBatch: (afterState: { after?: unknown }) => void;
  cancelBatch: () => void;
  undo: () => void;
  redo: () => void;
  pushEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  jumpTo: (entryId: string) => void;
  setTimelineCursor: (entryId: string | null) => void;
  runWithHistory: <T>(
    entryBuilder: (result: T) => HistoryEntry,
    mutator: () => T
  ) => T;
}
