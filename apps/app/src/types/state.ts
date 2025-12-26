/**
 * Application state type definitions
 */

import type { Part } from "./part";
import type { Material } from "./material";
import type { Furniture } from "./furniture";
import type { Cabinet, CabinetType, CabinetParams, CabinetMaterials } from "./cabinet";
import type { Collision } from "./collision";
import type { Room, WallSegment, Opening, LightSource } from "./room";
import type { TransformMode, TransformSpace } from "./transform";

/**
 * Global application state structure
 */
export interface ProjectState {
  // Data
  parts: Part[];
  materials: Material[];
  furnitures: Furniture[];
  cabinets: Cabinet[];
  collisions: Collision[];
  rooms: Room[];
  walls: WallSegment[];
  openings: Opening[];
  lights: LightSource[];
  activeRoomId: string | null;

  // Selection
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

  // Actions - Furniture
  addFurniture: (name: string) => void;
  removeFurniture: (id: string) => void;
  setSelectedFurniture: (id: string) => void;

  // Actions - Parts
  addPart: (furnitureId: string, skipHistory?: boolean) => void;
  updatePart: (id: string, patch: Partial<Part>, skipHistory?: boolean) => void;
  updatePartsBatch: (updates: Array<{ id: string; patch: Partial<Part> }>) => void;
  renamePart: (id: string, name: string, skipHistory?: boolean) => void;
  renameManualGroup: (groupId: string, name: string, skipHistory?: boolean) => void;
  removePart: (id: string, skipHistory?: boolean) => void;
  selectPart: (id: string | null) => void;
  duplicatePart: (id: string, skipHistory?: boolean) => void;
  setIsTransforming: (isTransforming: boolean) => void;
  setTransformingPartId: (id: string | null) => void;
  setTransformingCabinetId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformSpace: (space: TransformSpace) => void;

  // Actions - Multiselect
  /** Toggle part in/out of selection (Cmd/Ctrl+click) */
  togglePartSelection: (id: string) => void;
  /** Add multiple parts to selection */
  addToSelection: (ids: string[]) => void;
  /** Remove multiple parts from selection */
  removeFromSelection: (ids: string[]) => void;
  /** Select range of parts between anchor and target (Shift+click) */
  selectRange: (fromId: string, toId: string) => void;
  /** Select all parts in current furniture */
  selectAll: () => void;
  /** Clear all selection (parts and cabinet) */
  clearSelection: () => void;
  /** Set parts being transformed (for hiding during preview) */
  setTransformingPartIds: (ids: Set<string>) => void;
  /** Delete all selected parts */
  deleteSelectedParts: () => void;
  /** Duplicate all selected parts */
  duplicateSelectedParts: () => void;

  // Actions - Materials
  addMaterial: (material: Omit<Material, "id">) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeMaterial: (id: string) => void;

  // Actions - Cabinets
  addCabinet: (
    furnitureId: string,
    type: CabinetType,
    params: CabinetParams,
    materials: CabinetMaterials,
    skipHistory?: boolean
  ) => void;
  updateCabinet: (
    id: string,
    patch: Partial<Omit<Cabinet, "id" | "furnitureId" | "createdAt">>,
    skipHistory?: boolean
  ) => void;
  renameCabinet: (id: string, name: string, skipHistory?: boolean) => void;
  updateCabinetParams: (
    id: string,
    params: CabinetParams,
    skipHistory?: boolean,
    centerOffset?: [number, number, number]
  ) => void;
  updateCabinetTransform: (
    id: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
    },
    skipHistory?: boolean
  ) => void;
  removeCabinet: (id: string, skipHistory?: boolean) => void;
  duplicateCabinet: (id: string, skipHistory?: boolean) => void;
  selectCabinet: (id: string | null) => void;

  // Actions - Collision Detection
  detectCollisions: () => void;

  // Actions - Countertop (subset for debounced regeneration)
  generateCountertopsForFurniture: (furnitureId: string, materialId: string) => void;

  // Actions - Room
  addRoom: (room: Room) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  removeRoom: (id: string) => void;
  setActiveRoom: (id: string | null) => void;

  // Actions - Wall
  addWall: (wall: WallSegment) => void;
  updateWall: (id: string, patch: Partial<WallSegment>) => void;
  removeWall: (id: string) => void;
  updateWalls: (walls: WallSegment[]) => void;
  setRoomWalls: (roomId: string, walls: WallSegment[]) => void;

  // Actions - Opening
  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  // Actions - Lights
  addLight: (light: LightSource) => void;
  updateLight: (id: string, patch: Partial<LightSource>) => void;
  removeLight: (id: string) => void;
}

/**
 * Tracks the last used materials for different interior component types.
 * These are stored in the application state and proposed as defaults when
 * the user configures new sections with shelves or drawers.
 * Values are initialized from DEFAULT_INTERIOR_MATERIALS constants.
 */
export interface InteriorMaterialPreferences {
  /** Last used material ID for shelves (defaults to body material) */
  shelfMaterialId: string;
  /** Last used material ID for drawer box (sides, back, front) */
  drawerBoxMaterialId: string;
  /** Last used material ID for drawer bottom (defaults to HDF) */
  drawerBottomMaterialId: string;
}
