/**
 * Application configuration
 * Centralized keyboard shortcuts and settings
 */

// ============================================================================
// Keyboard Shortcuts Configuration
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  // Transform modes
  TRANSLATE_MODE: 'm',
  ROTATE_MODE: 'r',

  // Camera controls
  RESET_CAMERA: 'c',

  // Part actions
  DELETE_PART: 'Delete',
  DUPLICATE_PART: 'd',

  // View options
  TOGGLE_GRID: 'g',

  // Future shortcuts
  // UNDO: 'z',
  // REDO: 'y',
  // SELECT_ALL: 'a',
} as const;

// ============================================================================
// 3D Scene Configuration
// ============================================================================

export const SCENE_CONFIG = {
  // Camera
  CAMERA_INITIAL_POSITION: [500, 500, 500] as [number, number, number],
  CAMERA_FOV: 50,

  // Grid
  GRID_SIZE: 20000,
  GRID_CELL_SIZE: 100,
  GRID_FADE_DISTANCE: 100000,

  // Transform controls
  TRANSLATION_SNAP: 10, // mm
  ROTATION_SNAP: 15, // degrees

  // Lighting
  AMBIENT_LIGHT_INTENSITY: 0.5,
  DIRECTIONAL_LIGHT_INTENSITY: 0.8,
} as const;

// ============================================================================
// Material Configuration
// ============================================================================

export const MATERIAL_CONFIG = {
  // Edge color for parts without edge banding
  EDGE_COLOR: '#8B4513', // Saddle brown - wood-like color
  EDGE_OPACITY: 1.0,

  // Default material fallback
  DEFAULT_MATERIAL_COLOR: '#808080',
} as const;

// ============================================================================
// Part Configuration
// ============================================================================

export const PART_CONFIG = {
  DEFAULT_DIMENSIONS: {
    WIDTH: 600,
    HEIGHT: 400,
    DEPTH: 18,
  },

  DUPLICATE_OFFSET: 50, // mm offset on X-axis when duplicating

  // Selection highlight
  SELECTION_EMISSIVE_COLOR: '#4444ff',
  SELECTION_EMISSIVE_INTENSITY: 0.3,
  SELECTION_EDGE_COLOR: '#4444ff',
  SELECTION_EDGE_LINE_WIDTH: 2,
} as const;
