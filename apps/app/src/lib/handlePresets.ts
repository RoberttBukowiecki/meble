import type {
  HandleConfig,
  HandleDimensions,
  HandleCategory,
  HandleType,
  HandlePositionPreset,
  HingeSide,
} from '@/types';

// ============================================================================
// Standard Handle Dimensions
// ============================================================================

export const HANDLE_DIMENSIONS: Record<string, HandleDimensions> = {
  // Bar handles (rękojeści)
  BAR_128: { length: 128, holeSpacing: 128, height: 35 },
  BAR_160: { length: 160, holeSpacing: 160, height: 35 },
  BAR_192: { length: 192, holeSpacing: 192, height: 35 },
  BAR_256: { length: 256, holeSpacing: 256, height: 35 },
  BAR_320: { length: 320, holeSpacing: 320, height: 35 },
  BAR_480: { length: 480, holeSpacing: 480, height: 35 },
  BAR_640: { length: 640, holeSpacing: 640, height: 35 },

  // Strip handles (listwy)
  STRIP_200: { length: 200, width: 20, height: 25 },
  STRIP_400: { length: 400, width: 20, height: 25 },
  STRIP_600: { length: 600, width: 20, height: 25 },
  STRIP_FULL: { length: 0, width: 20, height: 25 }, // Full door width

  // Knobs (gałki)
  KNOB_SMALL: { length: 0, diameter: 25, height: 25 },
  KNOB_MEDIUM: { length: 0, diameter: 32, height: 30 },
  KNOB_LARGE: { length: 0, diameter: 40, height: 35 },

  // Milled (frezowane)
  MILLED_STANDARD: { length: 0, height: 15, width: 40 }, // Full width, milledDepth: 15, milledWidth: 40
  MILLED_PARTIAL: { length: 300, height: 15, width: 40 },

  // GOLA profiles
  GOLA_C: { length: 0, height: 37 }, // C-profile (horizontal at top)
  GOLA_L: { length: 0, height: 65 }, // L-profile (vertical side)
  GOLA_J: { length: 0, height: 38 }, // J-profile (under countertop)

  // Edge-mounted
  EDGE_MOUNTED_STANDARD: { length: 0, height: 20 },

  // TIP-ON / Push mechanisms
  TIP_ON_STANDARD: { length: 76, height: 10 },
  PUSH_LATCH_STANDARD: { length: 40, height: 15 },
};

// ============================================================================
// Handle Position Calculations
// ============================================================================

export type DoorType = 'SINGLE' | 'DOUBLE_LEFT' | 'DOUBLE_RIGHT';

export function calculateHandlePosition(
  config: HandleConfig,
  doorWidth: number,
  doorHeight: number,
  doorType: DoorType,
  hingeSide?: HingeSide
): { x: number; y: number } {
  const { preset, offsetFromEdge = 30 } = config.position;

  // Default offset from edge (mm)
  const edgeOffset = offsetFromEdge;

  // For bars/strips, position is at center of handle
  // For knobs, position is at center of knob

  switch (preset) {
    case 'TOP_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: doorHeight / 2 - edgeOffset };
    case 'TOP_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: doorHeight / 2 - edgeOffset };
    case 'TOP_CENTER':
      return { x: 0, y: doorHeight / 2 - edgeOffset };
    case 'MIDDLE_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: 0 };
    case 'MIDDLE_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: 0 };
    case 'BOTTOM_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: -doorHeight / 2 + edgeOffset };
    case 'BOTTOM_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: -doorHeight / 2 + edgeOffset };
    case 'BOTTOM_CENTER':
      return { x: 0, y: -doorHeight / 2 + edgeOffset };
    case 'CUSTOM':
      return { x: config.position.x ?? 0, y: config.position.y ?? 0 };
    default:
      // Smart positioning based on door type and hinge side
      return getSmartHandlePosition(doorWidth, doorHeight, doorType, hingeSide, edgeOffset);
  }
}

function getSmartHandlePosition(
  doorWidth: number,
  doorHeight: number,
  doorType: DoorType,
  hingeSide?: HingeSide,
  edgeOffset: number = 30
): { x: number; y: number } {
  // Handle should be on opposite side of hinge
  if (doorType === 'SINGLE') {
    const handleSide = hingeSide === 'LEFT' ? 'RIGHT' : 'LEFT';
    const x = handleSide === 'LEFT' ? -doorWidth / 2 + edgeOffset : doorWidth / 2 - edgeOffset;
    return { x, y: 0 }; // Middle height
  }

  if (doorType === 'DOUBLE_LEFT') {
    // Left door - handle on right side (near center gap)
    return { x: doorWidth / 2 - edgeOffset, y: 0 };
  }

  if (doorType === 'DOUBLE_RIGHT') {
    // Right door - handle on left side (near center gap)
    return { x: -doorWidth / 2 + edgeOffset, y: 0 };
  }

  return { x: 0, y: 0 };
}

/**
 * Get smart handle position preset based on door configuration
 */
export function getDefaultHandlePositionPreset(
  doorType: DoorType,
  hingeSide?: HingeSide
): HandlePositionPreset {
  if (doorType === 'SINGLE') {
    return hingeSide === 'LEFT' ? 'MIDDLE_RIGHT' : 'MIDDLE_LEFT';
  }
  if (doorType === 'DOUBLE_LEFT') {
    return 'MIDDLE_RIGHT';
  }
  if (doorType === 'DOUBLE_RIGHT') {
    return 'MIDDLE_LEFT';
  }
  return 'MIDDLE_RIGHT';
}

// ============================================================================
// Handle Configuration Presets
// ============================================================================

export const HANDLE_PRESETS: Record<string, HandleConfig> = {
  // Traditional - Bar handles
  BAR_128_HORIZONTAL: {
    type: 'BAR',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.BAR_128,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 30 },
    orientation: 'HORIZONTAL',
    finish: 'chrome',
  },
  BAR_160_HORIZONTAL: {
    type: 'BAR',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.BAR_160,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 30 },
    orientation: 'HORIZONTAL',
    finish: 'chrome',
  },
  BAR_320_VERTICAL: {
    type: 'BAR',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.BAR_320,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 30 },
    orientation: 'VERTICAL',
    finish: 'chrome',
  },

  // Traditional - Strip handles
  STRIP_EDGE: {
    type: 'STRIP',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.STRIP_FULL,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'brushed_nickel',
  },

  // Traditional - Knobs
  KNOB_CLASSIC: {
    type: 'KNOB',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.KNOB_MEDIUM,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 40 },
    orientation: 'HORIZONTAL', // N/A for knobs but required
    finish: 'chrome',
  },

  // Modern - Milled
  MILLED_TOP_EDGE: {
    type: 'MILLED',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.MILLED_STANDARD,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    milledDepth: 15,
    milledWidth: 40,
  },

  // Modern - GOLA
  GOLA_HORIZONTAL: {
    type: 'GOLA',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.GOLA_C,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'aluminum',
  },
  GOLA_VERTICAL: {
    type: 'GOLA',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.GOLA_L,
    position: { preset: 'MIDDLE_LEFT', offsetFromEdge: 0 },
    orientation: 'VERTICAL',
    finish: 'aluminum',
  },

  // Modern - Edge mounted
  EDGE_PROFILE: {
    type: 'EDGE_MOUNTED',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.EDGE_MOUNTED_STANDARD,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'black_matte',
  },

  // Handleless - TIP-ON
  TIP_ON: {
    type: 'TIP_ON',
    category: 'HANDLELESS',
    dimensions: HANDLE_DIMENSIONS.TIP_ON_STANDARD,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 50 },
    orientation: 'HORIZONTAL',
  },

  // Handleless - Push latch
  PUSH_LATCH: {
    type: 'PUSH_LATCH',
    category: 'HANDLELESS',
    dimensions: HANDLE_DIMENSIONS.PUSH_LATCH_STANDARD,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 50 },
    orientation: 'HORIZONTAL',
  },
};

// ============================================================================
// UI Labels (Polish)
// ============================================================================

export const HANDLE_TYPE_LABELS: Record<HandleType, string> = {
  BAR: 'Rękojeść / reling',
  STRIP: 'Listwa',
  KNOB: 'Gałka',
  MILLED: 'Uchwyt frezowany',
  GOLA: 'System GOLA',
  EDGE_MOUNTED: 'Uchwyt krawędziowy',
  TIP_ON: 'TIP-ON (push-to-open)',
  PUSH_LATCH: 'Zatrzask push',
};

export const HANDLE_CATEGORY_LABELS: Record<HandleCategory, string> = {
  TRADITIONAL: 'Tradycyjne uchwyty',
  MODERN: 'Nowoczesne rozwiązania',
  HANDLELESS: 'Bez uchwytów',
};

export const HANDLE_FINISH_LABELS: Record<string, string> = {
  chrome: 'Chrom',
  brushed_nickel: 'Nikiel szczotkowany',
  black_matte: 'Czarny mat',
  gold: 'Złoty',
  aluminum: 'Aluminium',
  stainless: 'Stal nierdzewna',
};

export const POSITION_PRESET_LABELS: Record<HandlePositionPreset, string> = {
  TOP_LEFT: 'Góra lewo',
  TOP_RIGHT: 'Góra prawo',
  TOP_CENTER: 'Góra środek',
  MIDDLE_LEFT: 'Środek lewo',
  MIDDLE_RIGHT: 'Środek prawo',
  BOTTOM_LEFT: 'Dół lewo',
  BOTTOM_RIGHT: 'Dół prawo',
  BOTTOM_CENTER: 'Dół środek',
  CUSTOM: 'Własna pozycja',
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getTypesForCategory(category: HandleCategory): HandleType[] {
  switch (category) {
    case 'TRADITIONAL':
      return ['BAR', 'STRIP', 'KNOB'];
    case 'MODERN':
      return ['MILLED', 'GOLA', 'EDGE_MOUNTED'];
    case 'HANDLELESS':
      return ['TIP_ON', 'PUSH_LATCH'];
  }
}

export function getDefaultPresetForCategory(category: HandleCategory): string {
  switch (category) {
    case 'TRADITIONAL':
      return 'BAR_128_HORIZONTAL';
    case 'MODERN':
      return 'MILLED_TOP_EDGE';
    case 'HANDLELESS':
      return 'TIP_ON';
  }
}

export function getDimensionsForType(type: HandleType): { label: string; dimensions: HandleDimensions }[] {
  switch (type) {
    case 'BAR':
      return [
        { label: '128 mm', dimensions: HANDLE_DIMENSIONS.BAR_128 },
        { label: '160 mm', dimensions: HANDLE_DIMENSIONS.BAR_160 },
        { label: '192 mm', dimensions: HANDLE_DIMENSIONS.BAR_192 },
        { label: '256 mm', dimensions: HANDLE_DIMENSIONS.BAR_256 },
        { label: '320 mm', dimensions: HANDLE_DIMENSIONS.BAR_320 },
        { label: '480 mm', dimensions: HANDLE_DIMENSIONS.BAR_480 },
        { label: '640 mm', dimensions: HANDLE_DIMENSIONS.BAR_640 },
      ];
    case 'STRIP':
      return [
        { label: '200 mm', dimensions: HANDLE_DIMENSIONS.STRIP_200 },
        { label: '400 mm', dimensions: HANDLE_DIMENSIONS.STRIP_400 },
        { label: '600 mm', dimensions: HANDLE_DIMENSIONS.STRIP_600 },
        { label: 'Pełna szerokość', dimensions: HANDLE_DIMENSIONS.STRIP_FULL },
      ];
    case 'KNOB':
      return [
        { label: 'Mała (25 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_SMALL },
        { label: 'Średnia (32 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_MEDIUM },
        { label: 'Duża (40 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_LARGE },
      ];
    case 'MILLED':
      return [
        { label: 'Pełna szerokość', dimensions: HANDLE_DIMENSIONS.MILLED_STANDARD },
        { label: 'Częściowy (300 mm)', dimensions: HANDLE_DIMENSIONS.MILLED_PARTIAL },
      ];
    case 'GOLA':
      return [
        { label: 'Profil C (poziomy)', dimensions: HANDLE_DIMENSIONS.GOLA_C },
        { label: 'Profil L (pionowy)', dimensions: HANDLE_DIMENSIONS.GOLA_L },
        { label: 'Profil J (pod blatem)', dimensions: HANDLE_DIMENSIONS.GOLA_J },
      ];
    case 'EDGE_MOUNTED':
      return [
        { label: 'Standard', dimensions: HANDLE_DIMENSIONS.EDGE_MOUNTED_STANDARD },
      ];
    case 'TIP_ON':
      return [
        { label: 'Standard (76 mm)', dimensions: HANDLE_DIMENSIONS.TIP_ON_STANDARD },
      ];
    case 'PUSH_LATCH':
      return [
        { label: 'Standard (40 mm)', dimensions: HANDLE_DIMENSIONS.PUSH_LATCH_STANDARD },
      ];
    default:
      return [];
  }
}

/**
 * Generate handle metadata for a door part
 */
export function generateHandleMetadata(
  handleConfig: HandleConfig,
  doorWidth: number,
  doorHeight: number,
  doorType: DoorType,
  hingeSide?: HingeSide
): { config: HandleConfig; actualPosition: { x: number; y: number } } {
  const actualPosition = calculateHandlePosition(
    handleConfig,
    doorWidth,
    doorHeight,
    doorType,
    hingeSide
  );

  return {
    config: handleConfig,
    actualPosition,
  };
}
