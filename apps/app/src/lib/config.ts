/**
 * Application configuration
 * Centralized keyboard shortcuts and settings
 */

import { CabinetParams, CabinetType, DoorConfig, DrawerSlideType, DrawerSlideConfig, DrawerConfiguration } from "@/types";

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
  RESIZE_MODE: 's',

  // Camera controls
  RESET_CAMERA: 'c',

  // Part actions
  DELETE_PART: ['Delete', 'Backspace'],
  DUPLICATE_PART: 'd',

  // View options
  TOGGLE_GRID: 'g',

  // Selection shortcuts (Cmd/Ctrl modifier required)
  SELECT_ALL: 'a',
  CLEAR_SELECTION: 'Escape',

  // Visibility shortcuts
  HIDE_SELECTED: 'h',           // H - Hide selected parts/groups
  TOGGLE_HIDE_FRONTS: 'h',      // Ctrl+H - Toggle cabinet front visibility
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
  ROTATION_SNAP_DEGREES: 15, // degrees for Shift-based snapping

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

  // Collision highlight
  COLLISION_EMISSIVE_COLOR: '#ff0000',
  COLLISION_EMISSIVE_INTENSITY: 0.4,
  COLLISION_EDGE_COLOR: '#ff0000',

  // Multiselect visual feedback
  MULTISELECT_EMISSIVE_COLOR: '#6644ff',
  MULTISELECT_EMISSIVE_INTENSITY: 0.25,
  MULTISELECT_EDGE_COLOR: '#6644ff',
  MULTISELECT_PREVIEW_OPACITY: 0.7,
  MULTISELECT_PREVIEW_EMISSIVE: '#4444aa',

  // Bounding box visualization
  MULTISELECT_BBOX_COLOR: '#6644ff',
  MULTISELECT_BBOX_LINE_WIDTH: 2,
  MULTISELECT_BBOX_DASH_SIZE: 10,
  MULTISELECT_BBOX_GAP_SIZE: 5,

  // Resize handle colors
  RESIZE_HANDLE_COLOR: '#f5a623',           // Yellow/orange - default state
  RESIZE_HANDLE_HOVER_COLOR: '#ffc107',     // Brighter yellow - hover state
  RESIZE_HANDLE_ACTIVE_COLOR: '#ffeb3b',    // Bright yellow - active/dragging state
  RESIZE_HANDLE_EMISSIVE_INTENSITY: 0.4,
  RESIZE_HANDLE_HOVER_EMISSIVE_INTENSITY: 0.5,
  RESIZE_HANDLE_ACTIVE_EMISSIVE_INTENSITY: 0.6,
} as const;


// ============================================================================
// Cabinet Configuration
// ============================================================================

// Default back panel overlap ratio (2/3 of body material thickness)
export const DEFAULT_BACK_OVERLAP_RATIO = 0.667;

// Default door configuration
export const DEFAULT_DOOR_CONFIG: DoorConfig = {
  layout: 'DOUBLE',
  openingDirection: 'HORIZONTAL',
  hingeSide: 'LEFT', // For single doors
};

// ============================================================================
// Drawer Slide Configuration
// ============================================================================

/**
 * Preset configurations for different drawer slide types
 * - sideOffset: clearance needed per side for the drawer box
 * - depthOffset: how much shorter the drawer is than cabinet depth
 */
export const DRAWER_SLIDE_PRESETS: Record<DrawerSlideType, DrawerSlideConfig> = {
  SIDE_MOUNT: { type: 'SIDE_MOUNT', sideOffset: 13, depthOffset: 50 },
  UNDERMOUNT: { type: 'UNDERMOUNT', sideOffset: 21, depthOffset: 50 },
  BOTTOM_MOUNT: { type: 'BOTTOM_MOUNT', sideOffset: 13, depthOffset: 50 },
  CENTER_MOUNT: { type: 'CENTER_MOUNT', sideOffset: 0, depthOffset: 50 },
};

// Default drawer configuration
export const DEFAULT_DRAWER_SLIDE_TYPE: DrawerSlideType = 'SIDE_MOUNT';

// Drawer construction constants
export const DRAWER_CONFIG = {
  FRONT_GAP: 3, // mm gap between drawer fronts
  BOX_HEIGHT_REDUCTION: 30, // mm - how much smaller the box is than the front
  BOTTOM_THICKNESS: 3, // mm - default drawer bottom thickness
  BOX_FRONT_OFFSET: 20, // mm - gap between box front and front panel
} as const;

// ============================================================================
// Drawer Zone Presets
// ============================================================================

/**
 * Preset configurations for quick drawer setup
 * Each preset defines a DrawerConfiguration with zones
 */
export const DRAWER_ZONE_PRESETS: Record<string, { label: string; labelPl: string; config: DrawerConfiguration }> = {
  STANDARD_4: {
    label: '4 Standard',
    labelPl: '4 Standardowe',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z3', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z4', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    },
  },

  STANDARD_3: {
    label: '3 Standard',
    labelPl: '3 Standardowe',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z3', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    },
  },

  TALL_2: {
    label: '2 Tall (drawer-in-drawer)',
    labelPl: '2 Wysokie (szuflada w szufladzie)',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }, { heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }, { heightRatio: 1 }] },
      ],
    },
  },

  INTERNAL_3: {
    label: '3 Internal',
    labelPl: '3 Wewnętrzne',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        { id: 'z3', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
      ],
    },
  },

  MIXED: {
    label: 'Mixed (2 internal + 2 external)',
    labelPl: 'Mieszane (2 wewnętrzne + 2 zewnętrzne)',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        { id: 'z3', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z4', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    },
  },
};

// ============================================================================
// Drawer Configuration Helpers
// ============================================================================

/**
 * Generate a unique zone ID
 */
export function generateZoneId(): string {
  return `z${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Get total drawer box count from configuration
 */
export function getTotalBoxCount(config: DrawerConfiguration): number {
  return config.zones.reduce((sum, zone) => sum + zone.boxes.length, 0);
}

/**
 * Get front count (visible drawer fronts)
 */
export function getFrontCount(config: DrawerConfiguration): number {
  return config.zones.filter(zone => zone.front !== null).length;
}

/**
 * Check if drawer configuration has any external fronts (visible drawer fronts)
 */
export function hasDrawerFronts(config: DrawerConfiguration | undefined): boolean {
  if (!config || config.zones.length === 0) return false;
  return config.zones.some(zone => zone.front !== null);
}

/**
 * Convert drawer configuration to internal (remove all external fronts)
 * This is used when doors are added to a cabinet with drawer fronts
 */
export function convertDrawersToInternal(config: DrawerConfiguration): DrawerConfiguration {
  return {
    ...config,
    zones: config.zones.map(zone => ({
      ...zone,
      front: null, // Remove external front
    })),
  };
}

/**
 * Create a default drawer configuration with specified zone count
 */
export function createDefaultDrawerConfig(zoneCount: number, hasExternalFronts: boolean = true): DrawerConfiguration {
  const zones = Array.from({ length: zoneCount }, (_, i) => ({
    id: `z${i + 1}`,
    heightRatio: 1,
    front: hasExternalFronts ? {} : null,
    boxes: [{ heightRatio: 1 }],
  }));

  return {
    slideType: 'SIDE_MOUNT',
    zones,
  };
}

export const CABINET_PRESETS: Record<CabinetType, Partial<CabinetParams>> = {
  KITCHEN: {
    type: 'KITCHEN',
    width: 800,
    height: 720,
    depth: 580,
    shelfCount: 1,
    hasDoors: true,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    doorConfig: DEFAULT_DOOR_CONFIG,
  },
  WARDROBE: {
    type: 'WARDROBE',
    width: 1000,
    height: 2200,
    depth: 600,
    shelfCount: 1,
    doorCount: 2,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
  },
  BOOKSHELF: {
    type: 'BOOKSHELF',
    width: 900,
    height: 1800,
    depth: 300,
    shelfCount: 4,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
  },
  DRAWER: {
    type: 'DRAWER',
    width: 600,
    height: 800,
    depth: 500,
    drawerCount: 4,
    drawerSlideType: 'SIDE_MOUNT',
    hasInternalDrawers: false,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
  }
};
