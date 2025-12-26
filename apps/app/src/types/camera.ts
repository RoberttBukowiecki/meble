/**
 * Camera and orthographic view type definitions
 */

/**
 * Camera projection mode
 * - 'perspective': Standard 3D perspective view with vanishing points
 * - 'orthographic': Flat 2D projection without perspective distortion
 */
export type CameraMode = "perspective" | "orthographic";

/**
 * Orthographic view direction
 * Named by the direction the camera looks FROM (not where it points TO)
 */
export type OrthographicView =
  | "TOP" // Looking down from above (-Y axis)
  | "BOTTOM" // Looking up from below (+Y axis)
  | "FRONT" // Looking from front towards back (-Z axis)
  | "BACK" // Looking from back towards front (+Z axis)
  | "LEFT" // Looking from left side (+X axis)
  | "RIGHT"; // Looking from right side (-X axis)

/**
 * Configuration for each orthographic view
 */
export interface OrthographicViewConfig {
  /** Camera position direction (normalized, will be scaled by distance) */
  direction: [number, number, number];
  /** Up vector for camera orientation */
  up: [number, number, number];
  /** Axes that can be edited (translated) in this view */
  editableAxes: ("x" | "y" | "z")[];
  /** The axis around which rotation is allowed */
  rotationAxis: "x" | "y" | "z";
  /** The axis perpendicular to the screen (hidden/locked) */
  perpendicularAxis: "x" | "y" | "z";
  /** Polish label for UI */
  label: string;
}

/**
 * Pre-calculated camera configurations for each orthographic view
 */
export const ORTHOGRAPHIC_VIEW_CONFIGS: Record<OrthographicView, OrthographicViewConfig> = {
  TOP: {
    direction: [0, 1, 0], // Camera above, looking down
    up: [0, 0, -1], // "Up" is towards -Z (north)
    editableAxes: ["x", "z"],
    rotationAxis: "y",
    perpendicularAxis: "y",
    label: "Z góry",
  },
  BOTTOM: {
    direction: [0, -1, 0], // Camera below, looking up
    up: [0, 0, 1], // "Up" is towards +Z
    editableAxes: ["x", "z"],
    rotationAxis: "y",
    perpendicularAxis: "y",
    label: "Z dołu",
  },
  FRONT: {
    direction: [0, 0, 1], // Camera in front, looking back
    up: [0, 1, 0], // "Up" is +Y
    editableAxes: ["x", "y"],
    rotationAxis: "z",
    perpendicularAxis: "z",
    label: "Z przodu",
  },
  BACK: {
    direction: [0, 0, -1], // Camera behind, looking forward
    up: [0, 1, 0], // "Up" is +Y
    editableAxes: ["x", "y"],
    rotationAxis: "z",
    perpendicularAxis: "z",
    label: "Z tyłu",
  },
  LEFT: {
    direction: [-1, 0, 0], // Camera on left, looking right
    up: [0, 1, 0], // "Up" is +Y
    editableAxes: ["y", "z"],
    rotationAxis: "x",
    perpendicularAxis: "x",
    label: "Z lewej",
  },
  RIGHT: {
    direction: [1, 0, 0], // Camera on right, looking left
    up: [0, 1, 0], // "Up" is +Y
    editableAxes: ["y", "z"],
    rotationAxis: "x",
    perpendicularAxis: "x",
    label: "Z prawej",
  },
};

/**
 * All orthographic views as array for iteration
 */
export const ORTHOGRAPHIC_VIEWS: OrthographicView[] = [
  "TOP",
  "FRONT",
  "RIGHT",
  "BACK",
  "LEFT",
  "BOTTOM",
];

/**
 * Default orthographic camera distance from target (in mm)
 * This is multiplied by direction to get camera position
 */
export const DEFAULT_ORTHO_CAMERA_DISTANCE = 5000;

/**
 * Default orthographic zoom level
 * Higher = more zoomed out, lower = more zoomed in
 */
export const DEFAULT_ORTHO_ZOOM = 1;

/**
 * Helper to get editable axes for current view
 */
export function getEditableAxes(view: OrthographicView): ("x" | "y" | "z")[] {
  return ORTHOGRAPHIC_VIEW_CONFIGS[view].editableAxes;
}

/**
 * Helper to get rotation axis for current view
 */
export function getRotationAxis(view: OrthographicView): "x" | "y" | "z" {
  return ORTHOGRAPHIC_VIEW_CONFIGS[view].rotationAxis;
}

/**
 * Helper to get perpendicular (hidden) axis for current view
 */
export function getPerpendicularAxis(view: OrthographicView): "x" | "y" | "z" {
  return ORTHOGRAPHIC_VIEW_CONFIGS[view].perpendicularAxis;
}

/**
 * Check if an axis is editable in the given view
 */
export function isAxisEditable(view: OrthographicView, axis: "x" | "y" | "z"): boolean {
  return ORTHOGRAPHIC_VIEW_CONFIGS[view].editableAxes.includes(axis);
}
