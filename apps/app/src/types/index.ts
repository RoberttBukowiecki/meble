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

  // Selection
  selectedPartId: string | null;
  selectedCabinetId: string | null;
  selectedFurnitureId: string;
  isTransforming: boolean;
  transformMode: 'translate' | 'rotate';

  // Actions - Furniture
  addFurniture: (name: string) => void;
  removeFurniture: (id: string) => void;
  setSelectedFurniture: (id: string) => void;

  // Actions - Parts
  addPart: (furnitureId: string) => void;
  updatePart: (id: string, patch: Partial<Part>) => void;
  removePart: (id: string) => void;
  selectPart: (id: string | null) => void;
  duplicatePart: (id: string) => void;
  setIsTransforming: (isTransforming: boolean) => void;
  setTransformMode: (mode: 'translate' | 'rotate') => void;

  // Actions - Materials
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeMaterial: (id: string) => void;

  // Actions - Cabinets
  addCabinet: (
    furnitureId: string,
    type: CabinetType,
    params: CabinetParams,
    materials: CabinetMaterials
  ) => void;
  updateCabinet: (
    id: string,
    patch: Partial<Omit<Cabinet, 'id' | 'furnitureId' | 'createdAt'>>
  ) => void;
  updateCabinetParams: (id: string, params: CabinetParams) => void;
  removeCabinet: (id: string) => void;
  duplicateCabinet: (id: string) => void;
  selectCabinet: (id: string | null) => void;
}

// ============================================================================
// Cabinet Types
// ============================================================================

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
