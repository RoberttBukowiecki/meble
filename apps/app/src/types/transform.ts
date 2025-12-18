/**
 * Transform, snapping, and resize type definitions
 */

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
export type SnapType = 'edge' | 'face' | 'edge-to-face';

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
 * Snap version:
 * - v1: Uses individual part faces (legacy)
 * - v2: Uses group bounding boxes
 * - v3: Face-to-face with movement direction awareness (recommended)
 */
export type SnapVersion = 'v1' | 'v2' | 'v3';

/**
 * Snap settings configuration
 */
export interface SnapSettings {
  distance: number;             // Snap threshold in mm (default: 10)
  showGuides: boolean;          // Show visual snap lines (default: true)
  magneticPull: boolean;        // Enable magnetic pull effect (default: true)
  strengthCurve: 'linear' | 'quadratic'; // Distance-based strength
  edgeSnap: boolean;            // Enable edge-to-edge snapping (parallel faces alignment)
  faceSnap: boolean;            // Enable face-to-face snapping (opposite normals)
  tJointSnap: boolean;          // Enable T-joint snapping (perpendicular normals)
  collisionOffset: number;      // Offset to prevent collision detection (default: 0.5mm)
  version: SnapVersion;         // Snap version: 'v1' (faces) or 'v2' (bounding boxes)
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

/**
 * Graphics settings for 3D rendering
 */
export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  shadows: boolean;
  ambientOcclusion: boolean;
  lightingMode: 'standard' | 'simulation';
}

/**
 * Feature flags for enabling/disabling UI features
 */
export interface FeatureFlags {
  HIDE_GRAPHICS_SETTINGS: boolean;
  HIDE_ROOMS_TAB: boolean;
}
