/**
 * Application configuration
 * Centralized keyboard shortcuts and settings
 */

import { CabinetParams, CabinetType } from "@/types";

// Utility types/helpers for keyboard shortcuts
export type ShortcutKeys = string | string[];

export const normalizeShortcutKeys = (shortcut: ShortcutKeys): string[] =>
  Array.isArray(shortcut) ? shortcut : [shortcut];

export const formatShortcutLabel = (shortcut: ShortcutKeys): string =>
  normalizeShortcutKeys(shortcut)
    .map((key) => key.toUpperCase())
    .join(' / ');

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
  DELETE_PART: ['Delete', 'Backspace'],
  DUPLICATE_PART: 'd',

  // View options
  TOGGLE_GRID: 'g',

  // Future shortcuts
  // UNDO: 'z',
  // REDO: 'y',
  // SELECT_ALL: 'a',
} as const satisfies Record<string, ShortcutKeys>;

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

  // Cabinet selection highlight
  CABINET_SELECTION_EMISSIVE_COLOR: '#2222aa',
  CABINET_SELECTION_EMISSIVE_INTENSITY: 0.2,
  CABINET_SELECTION_EDGE_COLOR: '#2222aa',
} as const;


// ============================================================================
// Cabinet Configuration
// ============================================================================

export const CABINET_PRESETS: Record<CabinetType, Partial<CabinetParams>> = {
  KITCHEN: {
    type: 'KITCHEN',
    width: 800,
    height: 720,
    depth: 580,
    shelfCount: 1,
    hasDoors: true,
    topBottomPlacement: 'inset',
  },
  WARDROBE: {
    type: 'WARDROBE',
    width: 1000,
    height: 2200,
    depth: 600,
    shelfCount: 1,
    doorCount: 2,
    topBottomPlacement: 'inset',
  },
  BOOKSHELF: {
    type: 'BOOKSHELF',
    width: 900,
    height: 1800,
    depth: 300,
    shelfCount: 4,
    hasBack: true,
    topBottomPlacement: 'inset',
  },
  DRAWER: {
    type: 'DRAWER',
    width: 600,
    height: 800,
    depth: 500,
    drawerCount: 4,
    topBottomPlacement: 'inset',
  }
};
