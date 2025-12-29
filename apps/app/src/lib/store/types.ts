import type { StateCreator } from "zustand";
import type {
  ProjectState,
  HistoryEntry,
  HistoryEntryType,
  TransformMode,
  TransformSpace,
  GraphicsSettings,
} from "@/types";
import type { UISlice } from "./slices/uiSlice";
import type { SnapSlice } from "./slices/snapSlice";
import type { DimensionSlice } from "./slices/dimensionSlice";
import type { MaterialPreferencesSlice } from "./slices/materialPreferencesSlice";
import type { CountertopSlice } from "./slices/countertopSlice";
import type { CabinetPreferencesSlice } from "./slices/cabinetPreferencesSlice";
import type { ViewSlice } from "./slices/viewSlice";
import type { ProjectSlice } from "./slices/projectSlice";
import type { WallOcclusionSlice } from "./slices/wallOcclusionSlice";
import type { ThreeSlice } from "./slices/threeSlice";

export type StoreState = ProjectState &
  HistorySlice &
  UISlice &
  SnapSlice &
  DimensionSlice &
  GraphicsSlice &
  MaterialPreferencesSlice &
  CountertopSlice &
  CabinetPreferencesSlice &
  ViewSlice &
  ProjectSlice &
  WallOcclusionSlice &
  ThreeSlice;
export type StoreMutators = [["zustand/persist", unknown]];
export type StoreSlice<T> = StateCreator<StoreState, StoreMutators, [], T>;

export interface GraphicsSlice {
  graphicsSettings: GraphicsSettings;
  updateGraphicsSettings: (settings: Partial<GraphicsSettings>) => void;
}

export type SelectionSlice = {
  selectedPartId: string | null;
  selectedCabinetId: string | null;
  selectedFurnitureId: string;
  isTransforming: boolean;
  /** ID of part currently being transformed (for hiding original during preview) */
  transformingPartId: string | null;
  /** ID of cabinet currently being transformed (for hiding all its parts during preview) */
  transformingCabinetId: string | null;
  transformMode: TransformMode;
  /** Transform space for translation: 'world' or 'local' (respects rotation) */
  transformSpace: TransformSpace;

  // Multiselect state
  /** Set of selected part IDs for multiselect */
  selectedPartIds: Set<string>;
  /** First selected part ID (anchor for range select) */
  multiSelectAnchorId: string | null;
  /** Parts being transformed (hide originals, show previews) */
  transformingPartIds: Set<string>;

  // Single selection actions
  selectPart: (id: string | null) => void;
  selectCabinet: (id: string | null) => void;
  setSelectedFurniture: (id: string) => void;
  setIsTransforming: (isTransforming: boolean) => void;
  setTransformingPartId: (id: string | null) => void;
  setTransformingCabinetId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformSpace: (space: TransformSpace) => void;

  // Multiselect actions
  togglePartSelection: (id: string) => void;
  addToSelection: (ids: string[]) => void;
  removeFromSelection: (ids: string[]) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setTransformingPartIds: (ids: Set<string>) => void;
  deleteSelectedParts: () => void;
  duplicateSelectedParts: () => void;
};

export type MaterialsSlice = Pick<
  StoreState,
  "materials" | "addMaterial" | "updateMaterial" | "removeMaterial"
>;

export type FurnitureSlice = Pick<StoreState, "furnitures" | "addFurniture" | "removeFurniture">;

export type PartsSlice = Pick<
  StoreState,
  | "parts"
  | "addPart"
  | "updatePart"
  | "updatePartsBatch"
  | "renamePart"
  | "renameManualGroup"
  | "removePart"
  | "duplicatePart"
>;

export type CabinetSlice = Pick<
  StoreState,
  | "cabinets"
  | "addCabinet"
  | "updateCabinet"
  | "renameCabinet"
  | "updateCabinetParams"
  | "updateCabinetTransform"
  | "removeCabinet"
  | "duplicateCabinet"
>;

export type CollisionSlice = Pick<StoreState, "collisions" | "detectCollisions">;

export type RoomSlice = Pick<
  StoreState,
  | "rooms"
  | "walls"
  | "openings"
  | "activeRoomId"
  | "addRoom"
  | "updateRoom"
  | "removeRoom"
  | "setActiveRoom"
  | "addWall"
  | "updateWall"
  | "removeWall"
  | "updateWalls"
  | "setRoomWalls"
  | "addOpening"
  | "updateOpening"
  | "removeOpening"
  | "addLight"
  | "updateLight"
  | "removeLight"
>;

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
  beginBatch: (type: HistoryEntryType, meta: { targetId?: string; before?: unknown }) => void;
  commitBatch: (afterState: { after?: unknown }) => void;
  cancelBatch: () => void;
  undo: () => void;
  redo: () => void;
  pushEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  jumpTo: (entryId: string) => void;
  setTimelineCursor: (entryId: string | null) => void;
  runWithHistory: <T>(entryBuilder: (result: T) => HistoryEntry, mutator: () => T) => T;
}
