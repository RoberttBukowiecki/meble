/**
 * Transform, snapping, and resize type definitions
 */

/**
 * Transform mode for parts
 */
export type TransformMode = "translate" | "rotate" | "resize";

/**
 * Transform space for translation
 * - 'world': Translate along global X, Y, Z axes
 * - 'local': Translate along object's local axes (respects rotation)
 */
export type TransformSpace = "world" | "local";

/**
 * Resize handle direction
 * Represents which face of the part is being resized
 */
export type ResizeHandle =
  | "width+" // +X (right face)
  | "width-" // -X (left face)
  | "height+" // +Y (top face)
  | "height-" // -Y (bottom face)
  | "depth+" // +Z (front face)
  | "depth-"; // -Z (back face)

/**
 * Snap point type
 */
export type SnapType = "edge" | "face" | "edge-to-face";

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
  axis?: "X" | "Y" | "Z";
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
export type SnapAxisConstraint = "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ" | null;

/**
 * Snap version:
 * - v2: Uses group bounding boxes (for cabinet arrangement)
 * - v3: Face-to-face with movement direction awareness (recommended)
 */
export type SnapVersion = "v2" | "v3";

/**
 * Snap settings configuration
 */
export interface SnapSettings {
  // Core settings
  distance: number; // Snap threshold in mm (default: 20)
  collisionOffset: number; // Gap between snapped faces in mm (default: 1.0)

  // Snap types
  faceSnap: boolean; // Enable face-to-face snapping (opposite normals) - "connection"
  edgeSnap: boolean; // Enable parallel face alignment - "alignment"
  tJointSnap: boolean; // Enable T-joint snapping (perpendicular normals)

  // Visualization
  showGuides: boolean; // Show visual snap lines (default: true)
  debug: boolean; // Show debug visualization (OBBs, faces, normals)

  // Version
  version: SnapVersion; // v2 for cabinet groups, v3 for parts (default: v3)

  // Wall snapping
  wallSnap: boolean; // Enable snapping to wall inner surfaces (default: true)
  cornerSnap: boolean; // Enable snapping to interior corners (default: true)
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
    value: number; // Dimension value to snap to
    distance: number; // Current distance to snap
    partId: string; // Part providing snap target
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
  | "width+" // +X face (right)
  | "width-" // -X face (left)
  | "height+" // +Y face (top)
  | "height-" // -Y face (bottom)
  | "depth+" // +Z face (front)
  | "depth-"; // -Z face (back)

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
  groupType: "cabinet" | "group" | "part";
}

/**
 * Dimension line for visualization during transform
 */
export interface DimensionLine {
  id: string;
  axis: "X" | "Y" | "Z";
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

/**
 * Graphics settings for 3D rendering
 */
export interface GraphicsSettings {
  quality: "low" | "medium" | "high";
  shadows: boolean;
  ambientOcclusion: boolean;
  lightingMode: "standard" | "simulation";
}

/**
 * Feature flags for enabling/disabling UI features
 */
export interface FeatureFlags {
  HIDE_GRAPHICS_SETTINGS: boolean;
  HIDE_ROOMS_TAB: boolean;
}

// ============================================================================
// Object Dimensions Display (W/H/D of selected/all objects)
// ============================================================================

/**
 * Display mode for object dimensions
 */
export type ObjectDimensionMode =
  | "selection" // Only selected objects
  | "all"; // All objects in furniture

/**
 * Granularity of dimension display
 */
export type ObjectDimensionGranularity =
  | "group" // Cabinet/group bounding box
  | "part"; // Individual parts

/**
 * Single dimension line for an object
 */
export interface ObjectDimension {
  id: string;
  objectId: string;
  objectType: "part" | "cabinet" | "countertop" | "multiselect";
  axis: "X" | "Y" | "Z";
  label: "W" | "H" | "D";
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  length: number;
  labelPosition: [number, number, number];
}

/**
 * Complete dimension set for an object
 * Dimensions are in local space (relative to center) and should be
 * rendered inside a group with the object's rotation
 */
export interface ObjectDimensionSet {
  objectId: string;
  objectType: "part" | "cabinet" | "countertop" | "multiselect";
  /** World position of object center (group position for rendering) */
  worldCenter: [number, number, number];
  /** Object rotation in radians (group rotation for rendering) */
  rotation: [number, number, number];
  /** Local dimensions (W/H/D) - actual object size, not AABB */
  localSize: [number, number, number];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
  dimensions: ObjectDimension[];
}

/**
 * Settings for object dimension display
 */
export interface ObjectDimensionSettings {
  enabled: boolean;
  mode: ObjectDimensionMode;
  granularity: ObjectDimensionGranularity;
  showLabels: boolean;
  showAxisColors: boolean;
}
