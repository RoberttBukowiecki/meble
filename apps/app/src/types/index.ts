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
 * Material category for filtering in UI
 */
export type MaterialCategory = 'board' | 'hdf' | 'mdf' | 'glass';

/**
 * Material definition for furniture parts
 */
export interface Material {
  id: string;
  name: string;
  color: string;      // Hex color (e.g., "#FFFFFF")
  thickness: number;  // Material thickness in mm
  isDefault?: boolean; // Marks material as a default choice for presets
  category?: MaterialCategory; // Material type for filtering
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
  updateCabinetParams: (id: string, params: CabinetParams, skipHistory?: boolean, centerOffset?: [number, number, number]) => void;
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
// Door Configuration Types
// ============================================================================

/**
 * Door layout type - single or double doors
 */
export type DoorLayout = 'SINGLE' | 'DOUBLE';

/**
 * Hinge side for horizontally opening doors
 */
export type HingeSide = 'LEFT' | 'RIGHT';

/**
 * Door opening direction
 * - HORIZONTAL: Standard side-hinged doors (left or right)
 * - LIFT_UP: Top-hinged doors that open upward (lift mechanisms)
 * - FOLD_DOWN: Bottom-hinged doors that fold down (rarely used)
 */
export type DoorOpeningDirection = 'HORIZONTAL' | 'LIFT_UP' | 'FOLD_DOWN';

/**
 * Door configuration for cabinet parameters
 */
export interface DoorConfig {
  layout: DoorLayout;
  openingDirection: DoorOpeningDirection;
  hingeSide?: HingeSide; // Only for HORIZONTAL + SINGLE
}

/**
 * Extended metadata for door parts
 */
export interface DoorMetadata {
  hingeSide?: HingeSide;
  openingDirection: DoorOpeningDirection;
  openingAngle?: number; // Future: for animation (0-120 degrees)
}

// ============================================================================
// Handle Types
// ============================================================================

/**
 * Handle category - broad classification
 */
export type HandleCategory = 'TRADITIONAL' | 'MODERN' | 'HANDLELESS';

/**
 * Traditional handle types
 */
export type TraditionalHandleType =
  | 'BAR'        // Rękojeść / reling (bar/rail handle)
  | 'STRIP'      // Listwa (strip/profile handle)
  | 'KNOB';      // Gałka (round knob)

/**
 * Modern handle types
 */
export type ModernHandleType =
  | 'MILLED'           // Uchwyt frezowany (routed into top edge of front)
  | 'GOLA'             // System GOLA (integrated groove/channel)
  | 'EDGE_MOUNTED';    // Uchwyt krawędziowy nakładany (edge-mounted profile)

/**
 * Handleless solutions
 */
export type HandlelessType =
  | 'TIP_ON'           // TIP-ON / push-to-open (Blum system)
  | 'PUSH_LATCH';      // Push latch mechanism

/**
 * Union of all handle types
 */
export type HandleType = TraditionalHandleType | ModernHandleType | HandlelessType;

/**
 * Handle orientation on the door
 */
export type HandleOrientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Handle position preset for easy selection
 */
export type HandlePositionPreset =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'TOP_CENTER'
  | 'MIDDLE_LEFT'
  | 'MIDDLE_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_CENTER'
  | 'CUSTOM';

/**
 * Handle dimensions (for visualization and reports)
 */
export interface HandleDimensions {
  length: number;       // mm - for bars/strips
  width?: number;       // mm - for strips
  height?: number;      // mm - handle projection from surface
  diameter?: number;    // mm - for knobs
  holeSpacing?: number; // mm - distance between mounting holes (CC - center to center)
}

/**
 * Handle position on the door
 */
export interface HandlePosition {
  preset: HandlePositionPreset;
  x?: number; // mm from door center (for CUSTOM)
  y?: number; // mm from door center (for CUSTOM)
  offsetFromEdge?: number; // mm from nearest edge
}

/**
 * Complete handle configuration
 */
export interface HandleConfig {
  type: HandleType;
  category: HandleCategory;
  dimensions?: HandleDimensions;
  position: HandlePosition;
  orientation: HandleOrientation;
  // Visual properties
  finish?: string; // e.g., 'chrome', 'brushed_nickel', 'black_matte', 'gold'
  // For milled handles
  milledDepth?: number; // mm - depth of routed groove
  milledWidth?: number; // mm - width of finger grip
}

/**
 * Handle metadata stored on door parts
 */
export interface HandleMetadata {
  config: HandleConfig;
  actualPosition: { x: number; y: number }; // Calculated position on door
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
 * Defines how the back panel is mounted to the cabinet body.
 * 'overlap': Back panel overlaps onto edges (sits in rabbet/dado)
 * 'dado': Back panel sits in a groove/dado (future implementation)
 */
export type BackMountType = 'overlap' | 'dado';

/**
 * Available cabinet template types
 */
export type CabinetType = 'KITCHEN' | 'WARDROBE' | 'BOOKSHELF' | 'DRAWER';

/**
 * Cabinet material configuration
 * Cabinets use three materials: body (structure), front (visible surfaces), and back (rear panel)
 */
export interface CabinetMaterials {
  bodyMaterialId: string;   // For sides, bottom, top, shelves
  frontMaterialId: string;  // For doors, drawer fronts
  backMaterialId?: string;  // For back panel (optional, defaults to HDF)
}

/**
 * Base parameters shared by all cabinets
 */
export interface CabinetBaseParams {
  width: number;   // Overall width (mm)
  height: number;  // Overall height (mm)
  depth: number;   // Overall depth (mm)
  topBottomPlacement: TopBottomPlacement; // How top/bottom panels are attached
  hasBack: boolean;           // Whether to add back panel
  backOverlapRatio: number;   // How much back panel overlaps onto body edges (0-1, default 2/3)
  backMountType: BackMountType; // How back panel is mounted (default 'overlap')
  // Zone-based drawer configuration (new system)
  drawerConfig?: DrawerConfiguration;
  // Legacy drawer configuration (for backward compatibility)
  drawerCount?: number; // Number of drawers (0 = no drawers)
  drawerSlideType?: DrawerSlideType; // Type of drawer slides
  hasInternalDrawers?: boolean; // If true, no drawer fronts (for use behind doors)
  drawerHandleConfig?: HandleConfig; // Handle configuration for drawer fronts
  // Side front panels (decorative end panels)
  sideFronts?: SideFrontsConfig; // Optional side fronts configuration
}

/**
 * Kitchen cabinet specific parameters
 */
export interface KitchenCabinetParams extends CabinetBaseParams {
  type: 'KITCHEN';
  shelfCount: number;  // Number of internal shelves (0-5)
  hasDoors: boolean;   // Whether to add doors
  // Door configuration
  doorConfig?: DoorConfig; // Optional for backward compatibility
  handleConfig?: HandleConfig; // Handle configuration for doors
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
  // hasBack is inherited from CabinetBaseParams
}

// ============================================================================
// Drawer Slide Types
// ============================================================================

/**
 * Type of drawer slide mechanism
 */
export type DrawerSlideType = 'SIDE_MOUNT' | 'UNDERMOUNT' | 'BOTTOM_MOUNT' | 'CENTER_MOUNT';

/**
 * Configuration for drawer slide including clearances
 */
export interface DrawerSlideConfig {
  type: DrawerSlideType;
  sideOffset: number; // mm - clearance per side for drawer box
  depthOffset: number; // mm - how much shorter drawer is than cabinet depth
}

// ============================================================================
// Drawer Zone System (for drawer-in-drawer support)
// ============================================================================

/**
 * Front configuration for a drawer zone
 */
export interface DrawerZoneFront {
  /** Handle configuration for this front */
  handleConfig?: HandleConfig;
}

/**
 * A drawer box within a zone
 */
export interface DrawerZoneBox {
  /** Height ratio within the zone (for multiple boxes) */
  heightRatio: number;
}

/**
 * A drawer zone represents a vertical section of the cabinet
 * that can have one decorative front covering multiple internal boxes
 */
export interface DrawerZone {
  id: string;
  /** Height ratio relative to other zones (default: 1) */
  heightRatio: number;
  /** Decorative front configuration (null = internal zone, no visible front) */
  front: DrawerZoneFront | null;
  /** Drawer boxes within this zone (can be multiple for drawer-in-drawer) */
  boxes: DrawerZoneBox[];
}

/**
 * Complete drawer configuration using zone-based system
 */
export interface DrawerConfiguration {
  zones: DrawerZone[];
  slideType: DrawerSlideType;
  /** Default handle config (can be overridden per zone) */
  defaultHandleConfig?: HandleConfig;
}

// ============================================================================
// Side Front Panel Types
// ============================================================================

/**
 * Configuration for a single side front panel (decorative end panel)
 */
export interface SideFrontConfig {
  enabled: boolean;

  /** Material ID for this side front (defaults to cabinet.materials.frontMaterialId) */
  materialId?: string;

  /** How far the side front extends beyond the cabinet front face (mm) */
  forwardProtrusion: number;

  /** Distance from cabinet bottom to start of side front (mm) */
  bottomOffset: number;

  /** Distance from cabinet top to end of side front (mm) */
  topOffset: number;
}

/**
 * Configuration for both side fronts
 */
export interface SideFrontsConfig {
  left: SideFrontConfig | null;  // null = disabled
  right: SideFrontConfig | null; // null = disabled
}

/**
 * Default side front configuration
 */
export const DEFAULT_SIDE_FRONT_CONFIG: SideFrontConfig = {
  enabled: true,
  materialId: undefined, // Uses frontMaterialId
  forwardProtrusion: 0,  // 0 means use front material thickness as default
  bottomOffset: 0,
  topOffset: 0,
};

/**
 * Drawer cabinet specific parameters
 */
export interface DrawerCabinetParams extends CabinetBaseParams {
  type: 'DRAWER';
  drawerCount: number; // Number of drawers (1-8) - legacy, use drawerConfig instead
  drawerSlideType: DrawerSlideType; // Type of drawer slides - legacy
  hasInternalDrawers: boolean; // If true, no drawer fronts - legacy
  drawerHeights?: number[]; // Optional custom heights per drawer (mm) - legacy
  bottomMaterialId?: string; // Optional separate material for drawer bottoms (thinner)
  handleConfig?: HandleConfig; // Handle configuration for drawer fronts - legacy
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
  /** Visual-only: hide fronts (doors, drawer fronts) in 3D view */
  hideFronts?: boolean;
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
  | 'DRAWER_BOX_FRONT' // Front wall of drawer box (body material) - for internal drawers
  | 'DRAWER_SIDE'
  | 'DRAWER_SIDE_LEFT'
  | 'DRAWER_SIDE_RIGHT'
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM'
  | 'SIDE_FRONT_LEFT'   // Decorative side panel on left
  | 'SIDE_FRONT_RIGHT'; // Decorative side panel on right

/**
 * Extended metadata for parts that belong to cabinets
 */
export interface CabinetPartMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number; // For shelves, doors, drawers (0-based)
  drawerIndex?: number; // Which drawer this part belongs to (0-based)
  // Door-specific metadata
  doorMetadata?: DoorMetadata;
  handleMetadata?: HandleMetadata;
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

// ============================================================================
// Cabinet Resize
// ============================================================================

/**
 * Cabinet resize handle type - 6 faces of bounding box
 */
export type CabinetResizeHandle =
  | 'width+'   // +X face (right)
  | 'width-'   // -X face (left)
  | 'height+'  // +Y face (top)
  | 'height-'  // -Y face (bottom)
  | 'depth+'   // +Z face (front)
  | 'depth-';  // -Z face (back)

/**
 * Bounding box for cabinet resize calculations
 */
export interface CabinetBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

/**
 * Preview transform for a single part during cabinet resize
 */
export interface CabinetPartPreview {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  depth: number;
}

/**
 * Initial transform data captured at drag start
 */
export interface CabinetPartInitialTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number];
}

/**
 * Result of cabinet resize calculation
 */
export interface CabinetResizeResult {
  /** New cabinet dimensions */
  newSize: [number, number, number];
  /** Preview transforms for each part (proportionally scaled) */
  partPreviews: Map<string, CabinetPartPreview>;
  /** New bounding box for dimension display */
  boundingBox: CabinetBoundingBox;
}

// ============================================================================
// Transform Dimensions Display
// ============================================================================

/**
 * Axis-aligned bounding box for dimension calculations
 */
export interface DimensionBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  groupId: string; // Cabinet ID, manual group ID, or part ID
  groupType: 'cabinet' | 'group' | 'part';
}

/**
 * Dimension line for visualization during transform
 */
export interface DimensionLine {
  id: string;
  axis: 'X' | 'Y' | 'Z';
  /** Start point (on moving object's face) */
  startPoint: [number, number, number];
  /** End point (on target object's face) */
  endPoint: [number, number, number];
  /** Distance in mm */
  distance: number;
  /** ID of target cabinet/group/part */
  targetId: string;
}

/**
 * Settings for dimension display during transform
 */
export interface DimensionSettings {
  /** Enable/disable dimension display */
  enabled: boolean;
  /** Maximum number of dimensions to show per axis */
  maxVisiblePerAxis: number;
  /** Hide dimensions beyond this distance (mm) */
  maxDistanceThreshold: number;
  /** Use different colors per axis */
  showAxisColors: boolean;
}
