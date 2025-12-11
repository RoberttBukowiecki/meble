/**
 * Type definitions for furniture modeling application
 */

// ============================================================================
// Shape Types
// ============================================================================

/**
 * Available shape types for furniture parts
 */
export type ShapeType = 'RECT' | 'TRAPEZOID' | 'L_SHAPE' | 'POLYGON';

// ============================================================================
// Shape Parameters (Discriminated Unions)
// ============================================================================

/**
 * Shape parameters for rectangular parts
 * @property x - Length along X axis (mm)
 * @property y - Width along Y axis (mm)
 */
export interface ShapeParamsRect {
  type: 'RECT';
  x: number;
  y: number;
}

/**
 * Shape parameters for trapezoid parts
 * @property frontX - Front edge length (mm)
 * @property backX - Back edge length (mm)
 * @property y - Width along Y axis (mm)
 * @property skosSide - Which side has the angle ('left' | 'right')
 */
export interface ShapeParamsTrapezoid {
  type: 'TRAPEZOID';
  frontX: number;
  backX: number;
  y: number;
  skosSide: 'left' | 'right';
}

/**
 * Shape parameters for L-shaped parts
 * @property x - Total length along X axis (mm)
 * @property y - Total width along Y axis (mm)
 * @property cutX - Cut-out length from corner (mm)
 * @property cutY - Cut-out width from corner (mm)
 */
export interface ShapeParamsLShape {
  type: 'L_SHAPE';
  x: number;
  y: number;
  cutX: number;
  cutY: number;
}

/**
 * Shape parameters for custom polygon parts
 * @property points - Array of [x, y] coordinates defining the polygon
 */
export interface ShapeParamsPolygon {
  type: 'POLYGON';
  points: [number, number][];
}

/**
 * Discriminated union of all shape parameter types
 */
export type ShapeParams =
  | ShapeParamsRect
  | ShapeParamsTrapezoid
  | ShapeParamsLShape
  | ShapeParamsPolygon;

// ============================================================================
// Edge Banding
// ============================================================================

/**
 * Edge banding configuration for rectangular parts
 * Each edge can be banded or not (true/false)
 */
export interface EdgeBandingRect {
  type: 'RECT';
  top: boolean;    // Y+ edge
  bottom: boolean; // Y- edge
  left: boolean;   // X- edge
  right: boolean;  // X+ edge
}

/**
 * Edge banding configuration for complex shapes
 * Array of edge indices that should be banded
 */
export interface EdgeBandingGeneric {
  type: 'GENERIC';
  edges: number[]; // Indices of edges to band
}

/**
 * Discriminated union of edge banding types
 */
export type EdgeBanding = EdgeBandingRect | EdgeBandingGeneric;

// ============================================================================
// Material
// ============================================================================

/**
 * Material definition for furniture parts
 */
export interface Material {
  id: string;
  name: string;
  color: string;      // Hex color (e.g., "#FFFFFF")
  thickness: number;  // Material thickness in mm
  isDefault?: boolean; // Marks material as a default choice for presets
}

// ============================================================================
// Furniture
// ============================================================================

/**
 * Furniture item (project/collection of parts)
 */
export interface Furniture {
  id: string;
  name: string;
  projectId?: string; // Optional parent project ID
}

// ============================================================================
// Part
// ============================================================================

/**
 * Individual furniture part with all properties
 */
export interface Part {
  // Identity
  id: string;
  name: string;
  furnitureId: string; // Reference to parent furniture
  group?: string;      // Optional grouping (e.g., "doors", "shelves")

  // Geometry
  shapeType: ShapeType;
  shapeParams: ShapeParams;

  // 3D Dimensions (calculated from shape + material)
  width: number;  // Bounding box X dimension (mm)
  height: number; // Bounding box Y dimension (mm)
  depth: number;  // Z dimension = material thickness (mm)

  // 3D Transform
  position: [number, number, number]; // [x, y, z] in mm
  rotation: [number, number, number]; // [rx, ry, rz] in radians

  // Material
  materialId: string;
  edgeBanding: EdgeBanding;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * NEW: Cabinet membership metadata (optional)
   * If set, this part belongs to a cabinet and may be regenerated
   * when cabinet parameters change
   */
  cabinetMetadata?: CabinetPartMetadata;
}

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Represents a collision between two parts or groups
 */
export interface Collision {
  partId1: string;
  partId2: string;
  groupId1?: string; // Cabinet ID or manual group ID
  groupId2?: string; // Cabinet ID or manual group ID
}

// ============================================================================
// Application State
// ============================================================================

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

  // Actions - Materials
  addMaterial: (material: Omit<Material, 'id'>) => void;
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
    patch: Partial<Omit<Cabinet, 'id' | 'furnitureId' | 'createdAt'>>,
    skipHistory?: boolean
  ) => void;
  renameCabinet: (id: string, name: string, skipHistory?: boolean) => void;
  updateCabinetParams: (id: string, params: CabinetParams, skipHistory?: boolean) => void;
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
}

// ============================================================================
// Cabinet Types
// ============================================================================

/**
 * Defines how the top and bottom panels are placed relative to the side panels.
 * 'inset': Placed between the side panels.
 * 'overlay': Placed on top of (overlaying) the side panels.
 */
export type TopBottomPlacement = 'inset' | 'overlay';

/**
 * Available cabinet template types
 */
export type CabinetType = 'KITCHEN' | 'WARDROBE' | 'BOOKSHELF' | 'DRAWER';
/**
 * Cabinet material configuration
 * Cabinets use two materials: body (structure) and front (visible surfaces)
 */
export interface CabinetMaterials {
  bodyMaterialId: string;   // For sides, bottom, top, shelves, back
  frontMaterialId: string;  // For doors, drawer fronts
}

/**
 * Base parameters shared by all cabinets
 */
export interface CabinetBaseParams {
  width: number;   // Overall width (mm)
  height: number;  // Overall height (mm)
  depth: number;   // Overall depth (mm)
  topBottomPlacement: TopBottomPlacement; // How top/bottom panels are attached
}

/**
 * Kitchen cabinet specific parameters
 */
export interface KitchenCabinetParams extends CabinetBaseParams {
  type: 'KITCHEN';
  shelfCount: number;  // Number of internal shelves (0-5)
  hasDoors: boolean;   // Whether to add doors
}

/**
 * Wardrobe cabinet specific parameters
 */
export interface WardrobeCabinetParams extends CabinetBaseParams {
  type: 'WARDROBE';
  shelfCount: number;  // Number of internal shelves (0-10)
  doorCount: number;   // Number of doors (1-4)
}

/**
 * Bookshelf cabinet specific parameters
 */
export interface BookshelfCabinetParams extends CabinetBaseParams {
  type: 'BOOKSHELF';
  shelfCount: number;  // Number of shelves (1-10)
  hasBack: boolean;    // Whether to add back panel
}

/**
 * Drawer cabinet specific parameters
 */
export interface DrawerCabinetParams extends CabinetBaseParams {
  type: 'DRAWER';
  drawerCount: number; // Number of drawers (2-8)
}

/**
 * Discriminated union of all cabinet parameter types
 */
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams;

/**
 * Cabinet metadata - stored separately from parts
 * References parts via cabinetId field in Part.cabinetMetadata
 */
export interface Cabinet {
  id: string;
  name: string;
  furnitureId: string;
  type: CabinetType;
  params: CabinetParams;
  materials: CabinetMaterials;
  topBottomPlacement: TopBottomPlacement;
  partIds: string[];  // Array of part IDs that belong to this cabinet
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Part role within a cabinet
 * Used to identify what each part represents for material assignment
 */
export type CabinetPartRole =
  | 'BOTTOM'
  | 'TOP'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE'
  | 'BACK'
  | 'SHELF'
  | 'DOOR'
  | 'DRAWER_FRONT'
  | 'DRAWER_SIDE'
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM';

/**
 * Extended metadata for parts that belong to cabinets
 */
export interface CabinetPartMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number; // For shelves, doors, drawers (0-based)
}

// ============================================================================
// History System
// ============================================================================

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
  | 'MILESTONE';

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

// ============================================================================
// Snapping System
// ============================================================================

/**
 * Transform mode for parts
 */
export type TransformMode = 'translate' | 'rotate' | 'resize';

/**
 * Resize handle direction
 * Represents which face of the part is being resized
 */
export type ResizeHandle =
  | 'width+'  // +X (right face)
  | 'width-'  // -X (left face)
  | 'height+' // +Y (top face)
  | 'height-' // -Y (bottom face)
  | 'depth+'  // +Z (front face)
  | 'depth-'; // -Z (back face)

/**
 * Snap point type
 */
export type SnapType = 'edge' | 'face';

/**
 * Active snap point for visualization
 */
export interface SnapPoint {
  id: string;
  type: SnapType;
  position: [number, number, number];
  normal: [number, number, number];
  partId: string;
  strength: number; // 0-1, based on distance
  /** The axis being snapped (for visualization) */
  axis?: 'X' | 'Y' | 'Z';
}

/**
 * Snap candidate during calculation
 */
export interface SnapCandidate {
  type: SnapType;
  targetPartId: string;
  snapOffset: [number, number, number]; // Vector to add to position
  distance: number;
  alignment: number; // 0-1, how well aligned
  visualGuide: {
    pointA: [number, number, number];
    pointB: [number, number, number];
  };
}

/**
 * Edge of a bounding box in world space
 */
export interface BoundingEdge {
  start: [number, number, number];
  end: [number, number, number];
  direction: [number, number, number];
  midpoint: [number, number, number];
}

/**
 * Face of a bounding box in world space
 */
export interface BoundingFace {
  center: [number, number, number];
  normal: [number, number, number];
  corners: [number, number, number][]; // 4 corners for overlap test
  halfSize: [number, number]; // Half-width and half-height in local face space
}

/**
 * Axis constraint for snapping - limits snap to specific axis during drag
 */
export type SnapAxisConstraint = 'X' | 'Y' | 'Z' | 'XY' | 'XZ' | 'YZ' | 'XYZ' | null;

/**
 * Snap settings configuration
 */
export interface SnapSettings {
  distance: number;             // Snap threshold in mm (default: 10)
  showGuides: boolean;          // Show visual snap lines (default: true)
  magneticPull: boolean;        // Enable magnetic pull effect (default: true)
  strengthCurve: 'linear' | 'quadratic'; // Distance-based strength
  edgeSnap: boolean;            // Enable edge-to-edge snapping
  faceSnap: boolean;            // Enable face-to-face snapping
  collisionOffset: number;      // Offset to prevent collision detection (default: 0.5mm)
}

/**
 * Result of snap calculation
 */
export interface SnapResult {
  snapped: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  snapPoints: SnapPoint[];
}

/**
 * Resize constraints for a dimension
 */
export interface ResizeConstraints {
  min: number;
  max: number;
  snapTargets: {
    value: number;    // Dimension value to snap to
    distance: number; // Current distance to snap
    partId: string;   // Part providing snap target
  }[];
}

/**
 * Result of resize calculation
 */
export interface ResizeResult {
  newWidth: number;
  newHeight: number;
  newDepth: number;
  newPosition: [number, number, number]; // May shift to maintain reference point
  snapped: boolean;
  snapPoints: SnapPoint[];
  collision: boolean;
  collisionPartIds: string[];
}
