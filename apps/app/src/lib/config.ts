/**
 * Application configuration
 * Centralized keyboard shortcuts and settings
 */

import { CabinetParams, CabinetType, DoorConfig, DrawerSlideType, DrawerSlideConfig, DrawerConfiguration, EdgeBandingRect, LegPreset, LegFinish, LegShape, LegCountMode, CornerConfig, LEG_FINISH_COLORS, HangerCutoutConfig, FoldingDoorConfig } from "@/types";

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
  TOGGLE_OBJECT_DIMENSIONS: 'b', // Object dimensions (W/H/D)

  // Selection shortcuts (Cmd/Ctrl modifier required)
  SELECT_ALL: 'a',
  CLEAR_SELECTION: 'Escape',

  // Visibility shortcuts
  HIDE_SELECTED: 'h',           // Hide selected parts/groups
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
// Graphics Configuration
// ============================================================================

export const DEFAULT_GRAPHICS_SETTINGS = {
  quality: 'high',
  shadows: true,
  ambientOcclusion: false,
  lightingMode: 'standard',
} as const;

/**
 * Quality presets for graphics settings
 * Maps quality levels to specific rendering parameters
 */
export const QUALITY_PRESETS = {
  low: {
    shadowMapSize: 512,
    softShadowSamples: 5,
    softShadowSize: 10,
    pixelRatio: 1,
    aoSamples: 8,
    aoRadius: 5,
    aoIntensity: 1,
  },
  medium: {
    shadowMapSize: 1024,
    softShadowSamples: 10,
    softShadowSize: 15,
    pixelRatio: 1.5,
    aoSamples: 16,
    aoRadius: 5,
    aoIntensity: 1.5,
  },
  high: {
    shadowMapSize: 2048,
    softShadowSamples: 17,
    softShadowSize: 25,
    pixelRatio: 2,
    aoSamples: 32,
    aoRadius: 5,
    aoIntensity: 2,
  },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;

// ============================================================================
// UI Feature Toggles
// ============================================================================

export const UI_FEATURES = {
  HIDE_GRAPHICS_SETTINGS: true,   // Hidden by default, can be enabled in settings
  HIDE_ROOMS_TAB: true,
} as const;

// ============================================================================
// Cabinet Configuration
// ============================================================================

// Default back panel overlap ratio (2/3 of body material thickness)
export const DEFAULT_BACK_OVERLAP_RATIO = 0.667;

// Default body (side panels) thickness
export const DEFAULT_BODY_THICKNESS = 18;

// ============================================================================
// Shelf Configuration
// ============================================================================

export const SHELF_CONFIG = {
  /** Setback from cabinet front edge (mm) */
  SETBACK: 10,
  /** Position offset ratio from bottom when multiple shelves (fraction) */
  POSITION_BOTTOM_OFFSET: 0.05,
  /** Position ratio for single shelf (fraction - 0.5 = middle) */
  SINGLE_SHELF_POSITION: 0.5,
} as const;

// ============================================================================
// Back Panel Configuration
// ============================================================================

export const BACK_PANEL_CONFIG = {
  /** Minimum back panel width (mm) */
  MIN_WIDTH: 50,
  /** Minimum back panel height (mm) */
  MIN_HEIGHT: 50,
} as const;

// ============================================================================
// Side Front Configuration
// ============================================================================

export const SIDE_FRONT_CONFIG = {
  /** Minimum side front height (mm) */
  MIN_HEIGHT: 100,
  /** Maximum forward protrusion from cabinet front (mm) */
  MAX_PROTRUSION: 100,
} as const;

// ============================================================================
// Trim Strip Configuration
// ============================================================================

export const TRIM_STRIP_CONFIG = {
  /** Default trim strip thickness (mm) when not specified */
  DEFAULT_THICKNESS: 10,
} as const;

// ============================================================================
// Interior Configuration (Cabinet Interior Dialog)
// ============================================================================

export const INTERIOR_CONFIG = {
  // Zone tree limits
  MAX_ZONE_DEPTH: 4,                  // Maximum nesting levels (0, 1, 2, 3)
  MAX_CHILDREN_PER_ZONE: 6,           // Maximum children in a NESTED zone
  MAX_TOTAL_ZONES: 20,                // Total zones across entire tree

  // Zone size limits (mm)
  MIN_ZONE_HEIGHT_MM: 50,             // Minimum zone height
  MIN_ZONE_WIDTH_MM: 100,             // Minimum zone width

  // Zone height ratio limits
  ZONE_HEIGHT_RATIO_MIN: 1,           // Minimum height ratio
  ZONE_HEIGHT_RATIO_MAX: 4,           // Maximum height ratio

  // Partition limits (mm)
  PARTITION_DEPTH_MIN: 50,
  PARTITION_DEPTH_MAX: 500,

  // Drawer zone limits
  MAX_DRAWER_ZONES_PER_ZONE: 8,       // Maximum drawer zones per zone
  MAX_BOXES_PER_DRAWER_ZONE: 4,       // Maximum boxes (drawer-in-drawer) per zone

  // Shelf limits
  MAX_SHELVES_PER_ZONE: 10,           // Maximum shelves in a shelf zone
  MAX_SHELVES_ABOVE_DRAWER: 4,        // Maximum shelves above drawer box

  // Default presets
  DEFAULT_SHELF_DEPTH_PRESET: 'FULL' as const,      // Default depth for regular shelves
  DEFAULT_ABOVE_BOX_SHELF_PRESET: 'FULL' as const,  // Default depth for shelves above drawer

  // Custom depth limits (mm)
  CUSTOM_SHELF_DEPTH_MIN: 50,
  CUSTOM_SHELF_DEPTH_MAX: 500,
  CUSTOM_SHELF_DEPTH_OFFSET: 10,      // Offset from cabinet depth for max calculation
} as const;

// ============================================================================
// Zone Presets (Interior Configuration Templates)
// ============================================================================

import type {
  InteriorZone,
  CabinetInteriorConfig,
  ZoneContentType,
  ZoneDivisionDirection,
} from '@/types';

/**
 * Create a simple zone with given content type
 */
function createSimpleZone(
  contentType: ZoneContentType,
  depth: number,
  heightRatio: number = 1
): InteriorZone {
  return {
    id: `preset_${depth}_${Math.random().toString(36).slice(2, 5)}`,
    contentType,
    heightConfig: { mode: 'RATIO', ratio: heightRatio },
    depth,
  };
}

/**
 * Create a nested zone with children
 */
function createNestedZone(
  direction: ZoneDivisionDirection,
  depth: number,
  children: InteriorZone[],
  heightRatio: number = 1
): InteriorZone {
  return {
    id: `preset_${depth}_${Math.random().toString(36).slice(2, 5)}`,
    contentType: 'NESTED',
    divisionDirection: direction,
    children,
    heightConfig: { mode: 'RATIO', ratio: heightRatio },
    depth,
  };
}

/**
 * Zone presets for quick interior setup
 */
export const ZONE_PRESETS: Record<string, { labelPl: string; config: CabinetInteriorConfig }> = {
  SINGLE_SHELVES: {
    labelPl: 'Tylko półki',
    config: {
      rootZone: {
        id: 'root',
        contentType: 'SHELVES',
        shelvesConfig: { mode: 'UNIFORM', count: 2, depthPreset: 'FULL', shelves: [] },
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    },
  },

  SINGLE_DRAWERS: {
    labelPl: 'Tylko szuflady',
    config: {
      rootZone: {
        id: 'root',
        contentType: 'DRAWERS',
        drawerConfig: {
          slideType: 'SIDE_MOUNT',
          zones: [
            { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
            { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
            { id: 'z3', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
          ],
        },
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    },
  },

  TWO_COLUMNS_EQUAL: {
    labelPl: '2 kolumny (równe)',
    config: {
      rootZone: createNestedZone('VERTICAL', 0, [
        createSimpleZone('EMPTY', 1),
        createSimpleZone('EMPTY', 1),
      ]),
    },
  },

  THREE_COLUMNS_EQUAL: {
    labelPl: '3 kolumny (równe)',
    config: {
      rootZone: createNestedZone('VERTICAL', 0, [
        createSimpleZone('EMPTY', 1),
        createSimpleZone('EMPTY', 1),
        createSimpleZone('EMPTY', 1),
      ]),
    },
  },

  LEFT_NARROW_RIGHT_WIDE: {
    labelPl: 'Wąska lewa + szeroka prawa',
    config: {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        children: [
          {
            id: 'left',
            contentType: 'EMPTY',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            widthConfig: { mode: 'FIXED', fixedMm: 400 },
            depth: 1,
          },
          {
            id: 'right',
            contentType: 'EMPTY',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
            depth: 1,
          },
        ],
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    },
  },

  TOP_SHELF_BOTTOM_COLUMNS: {
    labelPl: 'Góra: półki, Dół: 2 kolumny',
    config: {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        children: [
          // Bottom section with 2 columns
          createNestedZone('VERTICAL', 1, [
            createSimpleZone('EMPTY', 2),
            createSimpleZone('EMPTY', 2),
          ], 2),
          // Top section with shelves
          {
            id: 'top',
            contentType: 'SHELVES',
            shelvesConfig: { mode: 'UNIFORM', count: 2, depthPreset: 'FULL', shelves: [] },
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 1,
          },
        ],
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    },
  },

  WARDROBE_CLASSIC: {
    labelPl: 'Szafa klasyczna (2 kolumny + półki)',
    config: {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        children: [
          // Left column - shelves
          {
            id: 'left',
            contentType: 'SHELVES',
            shelvesConfig: { mode: 'UNIFORM', count: 4, depthPreset: 'FULL', shelves: [] },
            heightConfig: { mode: 'RATIO', ratio: 1 },
            widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
            depth: 1,
          },
          // Right column - hanging space (empty)
          {
            id: 'right',
            contentType: 'NESTED',
            divisionDirection: 'HORIZONTAL',
            children: [
              // Bottom drawer
              {
                id: 'drawer',
                contentType: 'DRAWERS',
                drawerConfig: {
                  slideType: 'SIDE_MOUNT',
                  zones: [{ id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] }],
                },
                heightConfig: { mode: 'EXACT', exactMm: 200 },
                depth: 2,
              },
              // Hanging space
              {
                id: 'hanging',
                contentType: 'EMPTY',
                heightConfig: { mode: 'RATIO', ratio: 1 },
                depth: 2,
              },
            ],
            heightConfig: { mode: 'RATIO', ratio: 1 },
            widthConfig: { mode: 'PROPORTIONAL', ratio: 2 },
            depth: 1,
          },
        ],
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    },
  },
} as const;

// ============================================================================
// Interior Material Defaults
// ============================================================================

/**
 * Default material type for interior components
 * Used for tracking last used materials per component type
 */
export type InteriorMaterialType =
  | 'shelf'           // Shelf material
  | 'drawerBox'       // Drawer box sides, back, front
  | 'drawerBottom';   // Drawer bottom panel

/**
 * Which body material to use by default for each interior component type
 * By default, all interior components use the cabinet's bodyMaterialId
 * User can customize per-section or store a preference
 */
export const INTERIOR_MATERIAL_DEFAULTS = {
  /** Use cabinet body material for drawer box by default */
  useBodyMaterialForDrawerBox: true,
  /** Use cabinet body material for shelves by default */
  useBodyMaterialForShelves: true,
  /** Use HDF for drawer bottoms by default (thinner) */
  useHdfForDrawerBottom: true,
} as const;

// ============================================================================
// Edge Banding Defaults
// ============================================================================

/**
 * Default edge banding for shelves
 * Front (top), left, right edges banded; back (bottom) NOT banded
 * Note: "top" = front edge when shelf is rotated horizontally [-Math.PI/2, 0, 0]
 */
export const DEFAULT_SHELF_EDGE_BANDING: EdgeBandingRect = {
  type: 'RECT',
  top: true,     // Front edge (visible)
  bottom: false, // Back edge (against cabinet back - not banded)
  left: true,    // Left side
  right: true,   // Right side
};

/**
 * Default edge banding for drawer box parts (sides, back, bottom, box front)
 * All edges banded for durability and finished look
 */
export const DEFAULT_DRAWER_BOX_EDGE_BANDING: EdgeBandingRect = {
  type: 'RECT',
  top: true,
  bottom: true,
  left: true,
  right: true,
};

/**
 * Default edge banding for decorative drawer fronts
 * All edges banded (fully visible panel)
 */
export const DEFAULT_DRAWER_FRONT_EDGE_BANDING: EdgeBandingRect = {
  type: 'RECT',
  top: true,
  bottom: true,
  left: true,
  right: true,
};

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
  BOX_HEIGHT_MIN: 50, // mm - minimum drawer box height fallback
  BOTTOM_THICKNESS: 3, // mm - default drawer bottom thickness
  BOX_FRONT_OFFSET: 20, // mm - gap between box front and front panel

  // Box to front ratio slider configuration (for shelves above drawer)
  BOX_TO_FRONT_RATIO: {
    MIN: 10,    // Minimum ratio in percent (10%)
    MAX: 100,   // Maximum ratio in percent (100%)
    STEP: 5,    // Step size in percent (5% increments for fine control)
    DEFAULT: 100, // Default ratio (100% = box fills entire front)
  },
} as const;

// ============================================================================
// Drawer Zone Presets
// ============================================================================

/**
 * Preset configurations for quick drawer setup
 * Each preset defines a DrawerConfiguration with zones
 */
export const DRAWER_ZONE_PRESETS: Record<string, { label: string; labelPl: string; config: DrawerConfiguration }> = {
  EXTERNAL_INTERNAL: {
    label: '1 External + 1 Internal',
    labelPl: '1 Zewnętrzna + 1 Wewnętrzna',
    config: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'z1', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
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
};

// ============================================================================
// Drawer Configuration Helpers
// ============================================================================

// Note: generateZoneId is exported from @/types (cabinetInterior.ts)

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

// ============================================================================
// Leg Configuration
// ============================================================================

/**
 * Leg preset options for UI dropdowns
 * Heights and adjustment ranges based on common furniture leg standards
 */
export const LEG_PRESET_OPTIONS: Array<{
  value: LegPreset;
  labelPl: string;
  description: string;
  height: number;
  adjustRange: number;
}> = [
  { value: 'SHORT', labelPl: 'Krótkie (50mm)', description: 'Minimalna wysokość dla podstaw', height: 50, adjustRange: 10 },
  { value: 'STANDARD', labelPl: 'Standardowe (100mm)', description: 'Typowa wysokość nóżek', height: 100, adjustRange: 20 },
  { value: 'TALL', labelPl: 'Wysokie (150mm)', description: 'Podwyższone nóżki', height: 150, adjustRange: 30 },
  { value: 'CUSTOM', labelPl: 'Własne', description: 'Niestandardowa wysokość', height: 100, adjustRange: 20 },
];

/**
 * Leg finish options for UI dropdowns
 * Common finishes for furniture legs with corresponding colors for 3D rendering
 * Colors are sourced from LEG_FINISH_COLORS in types/legs.ts
 */
export const LEG_FINISH_OPTIONS: Array<{
  value: LegFinish;
  labelPl: string;
  color: string;
}> = [
  { value: 'BLACK_PLASTIC', labelPl: 'Plastik czarny', color: LEG_FINISH_COLORS.BLACK_PLASTIC },
  { value: 'CHROME', labelPl: 'Chrom', color: LEG_FINISH_COLORS.CHROME },
  { value: 'BRUSHED_STEEL', labelPl: 'Stal szczotkowana', color: LEG_FINISH_COLORS.BRUSHED_STEEL },
  { value: 'WHITE_PLASTIC', labelPl: 'Plastik biały', color: LEG_FINISH_COLORS.WHITE_PLASTIC },
];

/**
 * Leg shape options for UI dropdowns
 */
export const LEG_SHAPE_OPTIONS: Array<{
  value: LegShape;
  labelPl: string;
}> = [
  { value: 'ROUND', labelPl: 'Okrągłe' },
  { value: 'SQUARE', labelPl: 'Kwadratowe' },
];

/**
 * Leg count mode options for UI dropdowns
 */
export const LEG_COUNT_MODE_OPTIONS: Array<{
  value: LegCountMode;
  labelPl: string;
  description: string;
}> = [
  { value: 'AUTO', labelPl: 'Automatyczna', description: 'Ilość dobrana do rozmiaru szafki' },
  { value: 'MANUAL', labelPl: 'Ręczna', description: 'Własna ilość nóżek' },
];

/**
 * Default leg configuration values
 */
export const LEG_DEFAULTS = {
  PRESET: 'STANDARD' as LegPreset,
  HEIGHT: 100,
  ADJUST_RANGE: 20,
  DIAMETER: 30,
  SHAPE: 'ROUND' as LegShape,
  FINISH: 'BLACK_PLASTIC' as LegFinish,
  COUNT_MODE: 'AUTO' as LegCountMode,
  CORNER_INSET: 30,
  MIN_HEIGHT: 20,
  MAX_HEIGHT: 300,
  MIN_DIAMETER: 20,
  MAX_DIAMETER: 60,
} as const;

// ============================================================================
// Wall Cabinet Configuration
// ============================================================================

/**
 * Default hanger cutout configuration for wall-mounted cabinets
 * Standard dimensions for furniture hangers (zawieszki meblowe)
 */
export const DEFAULT_HANGER_CUTOUT_CONFIG: HangerCutoutConfig = {
  enabled: true,
  width: 50,           // mm - standard hanger width
  height: 40,          // mm - standard hanger height
  horizontalInset: 50, // mm - distance from side edge
  verticalInset: 30,   // mm - distance from top edge
};

/**
 * Hanger cutout limits for validation
 */
export const HANGER_CUTOUT_LIMITS = {
  MIN_WIDTH: 30,
  MAX_WIDTH: 100,
  MIN_HEIGHT: 20,
  MAX_HEIGHT: 80,
  MIN_INSET: 20,
} as const;

/**
 * Default folding door configuration
 */
export const DEFAULT_FOLDING_DOOR_CONFIG: FoldingDoorConfig = {
  enabled: false,
  splitRatio: 0.5,  // Equal split between upper and lower sections
  sectionGap: 3,    // mm - gap between sections
};

/**
 * Folding door limits for validation
 */
export const FOLDING_DOOR_LIMITS = {
  MIN_SPLIT_RATIO: 0.3,
  MAX_SPLIT_RATIO: 0.7,
  MIN_GAP: 2,
  MAX_GAP: 10,
} as const;

// ============================================================================
// Corner Cabinet Configuration
// ============================================================================

/**
 * Default corner configuration
 * - W: Full cabinet width
 * - D: Cabinet depth
 * - doorWidth: Width of the door opening
 */
export const DEFAULT_CORNER_CONFIG: CornerConfig = {
  wallSide: 'LEFT',
  W: 1000,
  D: 600,
  bottomMount: 'inset',
  topMount: 'inset',
  frontType: 'SINGLE',
  doorGap: 2,
  doorPosition: 'RIGHT',
  doorWidth: 450,
};

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
  },
  WALL: {
    type: 'WALL',
    width: 800,
    height: 720,
    depth: 350,  // Wall cabinets are typically shallower
    shelfCount: 1,
    hasDoors: true,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    doorConfig: {
      layout: 'DOUBLE',
      openingDirection: 'LIFT_UP',  // Wall cabinets typically open upward
    },
    hangerCutouts: DEFAULT_HANGER_CUTOUT_CONFIG,
    // Note: legs intentionally not included - wall cabinets don't have legs
  },
  CORNER_INTERNAL: {
    type: 'CORNER_INTERNAL',
    width: 800,  // Used as armA
    height: 720,
    depth: 580,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    cornerConfig: DEFAULT_CORNER_CONFIG,
  },
  CORNER_EXTERNAL: {
    type: 'CORNER_EXTERNAL',
    width: 800,
    height: 720,
    depth: 580,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    cornerConfig: DEFAULT_CORNER_CONFIG,
  },
};

// ============================================================================
// Countertop Configuration
// ============================================================================

import type {
  CountertopOverhang,
  SegmentEdgeBanding,
  EdgeBandingOption,
  CountertopJointType,
  JointHardware,
  CornerTreatment,
  CutoutPresetType,
} from '@/types/countertop';

/**
 * Default countertop configuration values
 */
export const COUNTERTOP_DEFAULTS = {
  /** Default thickness in mm (common: 28, 38, 40) */
  THICKNESS: 38,
  /** Default overhang values in mm */
  OVERHANG: {
    front: 30,    // Front overhang (typical 30-50mm)
    back: 0,      // Back (against wall)
    left: 0,      // Left side
    right: 0,     // Right side
  } as CountertopOverhang,
  /** Default edge banding configuration */
  EDGE_BANDING: {
    a: 'NONE',      // Back edge (against wall)
    b: 'NONE',      // Right edge
    c: 'STANDARD',  // Front edge (visible)
    d: 'NONE',      // Left edge
  } as SegmentEdgeBanding,
  /** Default grain direction (along length) */
  GRAIN_ALONG_LENGTH: true,
} as const;

/**
 * Countertop dimensional limits in mm
 */
export const COUNTERTOP_LIMITS = {
  THICKNESS: { min: 18, max: 60 },
  LENGTH: { min: 100, max: 4100 },      // Max standard panel length
  WIDTH: { min: 100, max: 1200 },       // Max standard panel width
  OVERHANG: { min: 0, max: 100 },
} as const;

/**
 * CNC operation constraints
 * Minimum distances to ensure structural integrity
 */
export const CNC_OPERATION_LIMITS = {
  /** Minimum distance from countertop edge in mm */
  MIN_EDGE_DISTANCE: 50,
  /** Minimum distance from joint in mm */
  MIN_JOINT_DISTANCE: 100,
  /** Minimum spacing between CNC operations in mm */
  MIN_OPERATION_SPACING: 50,
  /** Maximum corner radius for rectangular cutouts */
  MAX_CUTOUT_RADIUS: 50,
} as const;

/**
 * Joint hardware presets per joint type
 */
export const JOINT_HARDWARE_PRESETS: Record<CountertopJointType, JointHardware> = {
  MITER_45: { type: 'MITER_BOLT', count: 2 },
  BUTT: { type: 'FLIP_BOLT', count: 3 },
  EUROPEAN_MITER: { type: 'MITER_BOLT', count: 2 },
  PUZZLE: { type: 'DOMINO', count: 4 },
};

/**
 * Common cutout presets for sinks, cooktops, etc.
 * Dimensions in mm
 */
export const CUTOUT_PRESETS: Record<CutoutPresetType, {
  labelPl: string;
  dimensions: { width?: number; height?: number; diameter?: number; radius?: number };
}> = {
  NONE: {
    labelPl: 'Brak',
    dimensions: {},
  },
  SINK_STANDARD: {
    labelPl: 'Zlew standardowy (780×480)',
    dimensions: { width: 780, height: 480, radius: 10 },
  },
  SINK_SMALL: {
    labelPl: 'Zlew mały (580×430)',
    dimensions: { width: 580, height: 430, radius: 10 },
  },
  SINK_ROUND: {
    labelPl: 'Zlew okrągły (Ø450)',
    dimensions: { diameter: 450 },
  },
  COOKTOP_60: {
    labelPl: 'Płyta grzewcza 60cm (560×490)',
    dimensions: { width: 560, height: 490, radius: 5 },
  },
  COOKTOP_80: {
    labelPl: 'Płyta grzewcza 80cm (760×520)',
    dimensions: { width: 760, height: 520, radius: 5 },
  },
  FAUCET_HOLE: {
    labelPl: 'Otwór na baterię (Ø35)',
    dimensions: { diameter: 35 },
  },
  SOAP_DISPENSER: {
    labelPl: 'Dozownik mydła (Ø28)',
    dimensions: { diameter: 28 },
  },
  CUSTOM: {
    labelPl: 'Wymiar własny',
    dimensions: { width: 600, height: 400, radius: 10 }, // Default values, overridden by customCutout
  },
};

/**
 * Corner treatment options with labels
 */
export const CORNER_TREATMENT_OPTIONS: Array<{
  value: CornerTreatment;
  labelPl: string;
  description: string;
}> = [
  { value: 'STRAIGHT', labelPl: 'Narożnik prosty', description: 'Standardowy kąt 90°' },
  { value: 'CHAMFER', labelPl: 'Ścięcie pod kątem', description: 'Ścięcie 45° w narożniku' },
  { value: 'RADIUS', labelPl: 'Zaokrąglenie', description: 'Zaokrąglony narożnik' },
  { value: 'CLIP', labelPl: 'Ścięcie narożnika', description: 'Proste ścięcie narożnika' },
];

/**
 * Edge banding options with labels
 */
export const EDGE_BANDING_OPTIONS: Array<{
  value: EdgeBandingOption;
  labelPl: string;
}> = [
  { value: 'NONE', labelPl: 'Brak' },
  { value: 'STANDARD', labelPl: 'Standardowe' },
  { value: 'ABS_2MM', labelPl: 'ABS 2mm' },
  { value: 'ABS_1MM', labelPl: 'ABS 1mm' },
  { value: 'PVC', labelPl: 'PVC' },
  { value: 'CONTRAST', labelPl: 'Kontrastowe' },
];

/**
 * Joint type options with labels
 */
export const JOINT_TYPE_OPTIONS: Array<{
  value: CountertopJointType;
  labelPl: string;
  description: string;
}> = [
  { value: 'MITER_45', labelPl: 'Uciosowe 45°', description: 'Najczęstsze dla kształtu L' },
  { value: 'BUTT', labelPl: 'Czołowe', description: 'Proste połączenie czołowe' },
  { value: 'EUROPEAN_MITER', labelPl: 'Europejskie', description: 'Hybrydowe: zaczyna uciosowo, kończy czołowo' },
  { value: 'PUZZLE', labelPl: 'Puzzle', description: 'Dekoracyjne połączenie puzzle (premium)' },
];

/**
 * Thickness options for countertops
 */
export const COUNTERTOP_THICKNESS_OPTIONS: Array<{
  value: number;
  labelPl: string;
}> = [
  { value: 28, labelPl: '28 mm' },
  { value: 38, labelPl: '38 mm (standard)' },
  { value: 40, labelPl: '40 mm' },
];

/**
 * Proximity threshold for detecting adjacent cabinets (mm)
 * Cabinets closer than this are considered adjacent for countertop grouping
 */
export const CABINET_ADJACENCY_THRESHOLD = 50;
