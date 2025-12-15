/**
 * Corner Cabinet Domain Module
 *
 * Handles corner cabinet operations including:
 * - Creating corner configurations
 * - Updating corner parameters
 * - Calculating L-shape geometry and dead zones
 * - Validating corner configurations
 *
 * Following the established domain-driven pattern (like CabinetDomain, Zone, etc.)
 */

import type {
  CornerConfig,
  CornerInternalCabinetParams,
  InternalCornerType,
  CornerOrientation,
  DeadZonePreset,
  CornerDimensionMode,
  CornerMechanismType,
  CornerDoorType,
  WallSharingMode,
} from '@/types';
import type { ValidationResult } from './types';
import { validResult, invalidResult } from './types';
import { DEFAULT_BACK_OVERLAP_RATIO } from '@/lib/config';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Dead zone preset ratios
 * Control how much of the corner is considered "dead" (inaccessible) space
 */
export const DEAD_ZONE_PRESETS = {
  MINIMAL: { widthRatio: 0.15, depthRatio: 0.15 },
  STANDARD: { widthRatio: 0.25, depthRatio: 0.25 },
  ACCESSIBLE: { widthRatio: 0.35, depthRatio: 0.35 },
} as const;

/**
 * Default corner cabinet configuration values
 */
export const CORNER_DEFAULTS = {
  cornerAngle: 90,
  deadZonePreset: 'STANDARD' as DeadZonePreset,
  dimensionMode: 'SYMMETRIC' as CornerDimensionMode,
  mechanismType: 'FIXED_SHELVES' as CornerMechanismType,
  cornerDoorType: 'SINGLE_DIAGONAL' as CornerDoorType,
  wallSharingMode: 'FULL_ISOLATION' as WallSharingMode,
  cornerOrientation: 'LEFT' as CornerOrientation,
  armA: 800,
  armB: 800,
} as const;

/**
 * Corner cabinet dimension limits (mm)
 */
export const CORNER_LIMITS = {
  MIN_ARM: 300,
  MAX_ARM: 1500,
  MIN_ANGLE: 45,
  MAX_ANGLE: 135,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 2500,
  MIN_DEPTH: 300,
  MAX_DEPTH: 800,
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Dead zone dimensions calculated from preset or custom values
 */
export interface DeadZoneDimensions {
  width: number;
  depth: number;
}

/**
 * L-shape polygon points for bottom/top panels
 */
export type LShapePoint = [number, number];

// ============================================================================
// CornerDomain Module
// ============================================================================

export const CornerDomain = {
  // Constants (exposed for external use)
  DEAD_ZONE_PRESETS,
  CORNER_DEFAULTS,
  CORNER_LIMITS,

  // ==========================================================================
  // CREATORS - Functions that create new configurations
  // ==========================================================================

  /**
   * Create a new corner configuration with defaults
   */
  createConfig: (
    cornerType: InternalCornerType = 'L_SHAPED',
    orientation: CornerOrientation = 'LEFT'
  ): CornerConfig => ({
    cornerType,
    cornerOrientation: orientation,
    dimensionMode: CORNER_DEFAULTS.dimensionMode,
    armA: CORNER_DEFAULTS.armA,
    armB: CORNER_DEFAULTS.armB,
    cornerAngle: CORNER_DEFAULTS.cornerAngle,
    deadZonePreset: CORNER_DEFAULTS.deadZonePreset,
    wallSharingMode: CORNER_DEFAULTS.wallSharingMode,
    cornerDoorType: CORNER_DEFAULTS.cornerDoorType,
    mechanismType: CORNER_DEFAULTS.mechanismType,
  }),

  /**
   * Create corner internal cabinet params with defaults
   */
  createParams: (
    width: number,
    height: number,
    depth: number,
    cornerConfig?: Partial<CornerConfig>
  ): CornerInternalCabinetParams => ({
    type: 'CORNER_INTERNAL',
    width,
    height,
    depth,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    cornerConfig: { ...CornerDomain.createConfig(), ...cornerConfig },
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies (immutable)
  // ==========================================================================

  /**
   * Update corner type
   */
  updateCornerType: (
    config: CornerConfig,
    cornerType: InternalCornerType
  ): CornerConfig => ({
    ...config,
    cornerType,
    // Reset door type based on corner type
    cornerDoorType: cornerType === 'L_SHAPED' ? 'SINGLE_DIAGONAL' : 'NONE',
  }),

  /**
   * Update corner orientation (LEFT/RIGHT)
   */
  updateOrientation: (
    config: CornerConfig,
    orientation: CornerOrientation
  ): CornerConfig => ({
    ...config,
    cornerOrientation: orientation,
  }),

  /**
   * Update arm dimensions
   */
  updateArmDimensions: (
    config: CornerConfig,
    armA: number,
    armB?: number
  ): CornerConfig => {
    const effectiveArmB =
      config.dimensionMode === 'SYMMETRIC' ? armA : (armB ?? config.armB);
    return { ...config, armA, armB: effectiveArmB };
  },

  /**
   * Update dimension mode (symmetric/asymmetric)
   */
  updateDimensionMode: (
    config: CornerConfig,
    mode: CornerDimensionMode
  ): CornerConfig => {
    const armB = mode === 'SYMMETRIC' ? config.armA : config.armB;
    return { ...config, dimensionMode: mode, armB };
  },

  /**
   * Update dead zone preset
   */
  updateDeadZonePreset: (
    config: CornerConfig,
    preset: DeadZonePreset
  ): CornerConfig => ({
    ...config,
    deadZonePreset: preset,
    // Clear custom values if switching away from CUSTOM
    deadZoneDepth: preset === 'CUSTOM' ? config.deadZoneDepth : undefined,
    deadZoneWidth: preset === 'CUSTOM' ? config.deadZoneWidth : undefined,
  }),

  /**
   * Update custom dead zone dimensions
   */
  updateCustomDeadZone: (
    config: CornerConfig,
    width: number,
    depth: number
  ): CornerConfig => ({
    ...config,
    deadZonePreset: 'CUSTOM',
    deadZoneWidth: width,
    deadZoneDepth: depth,
  }),

  /**
   * Update wall sharing mode
   */
  updateWallSharingMode: (
    config: CornerConfig,
    mode: WallSharingMode
  ): CornerConfig => ({
    ...config,
    wallSharingMode: mode,
  }),

  /**
   * Update corner angle
   */
  updateCornerAngle: (
    config: CornerConfig,
    angle: number
  ): CornerConfig => ({
    ...config,
    cornerAngle: Math.max(CORNER_LIMITS.MIN_ANGLE, Math.min(CORNER_LIMITS.MAX_ANGLE, angle)),
  }),

  /**
   * Update door type
   */
  updateDoorType: (
    config: CornerConfig,
    doorType: CornerDoorType
  ): CornerConfig => ({
    ...config,
    cornerDoorType: doorType,
  }),

  /**
   * Update mechanism type
   */
  updateMechanismType: (
    config: CornerConfig,
    mechanismType: CornerMechanismType
  ): CornerConfig => ({
    ...config,
    mechanismType,
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Get dead zone dimensions from preset or custom values
   */
  getDeadZoneDimensions: (
    config: CornerConfig,
    cabinetDepth: number
  ): DeadZoneDimensions => {
    const { deadZonePreset, armA, armB, deadZoneWidth, deadZoneDepth } = config;

    if (deadZonePreset === 'CUSTOM' && deadZoneWidth !== undefined && deadZoneDepth !== undefined) {
      return { width: deadZoneWidth, depth: deadZoneDepth };
    }

    const presetConfig = deadZonePreset !== 'CUSTOM'
      ? DEAD_ZONE_PRESETS[deadZonePreset]
      : DEAD_ZONE_PRESETS.STANDARD;
    const avgArm = (armA + armB) / 2;

    return {
      width: Math.round(avgArm * presetConfig.widthRatio),
      depth: Math.round(avgArm * presetConfig.depthRatio),
    };
  },

  /**
   * Calculate L-shape polygon points for bottom/top panel
   * Returns points in local 2D coordinates (XZ plane, Y is up)
   *
   * The L-shape is oriented with:
   * - Origin at the inner corner
   * - Arm A extending along positive X
   * - Arm B extending along positive Z
   * - Dead zone cut-out in the corner
   */
  calculateLShapePoints: (
    config: CornerConfig,
    cabinetDepth: number
  ): LShapePoint[] => {
    const { armA, armB, cornerOrientation } = config;
    const deadZone = CornerDomain.getDeadZoneDimensions(config, cabinetDepth);

    // L-shape points (counterclockwise from outer corner of arm A)
    // For LEFT orientation:
    //   P1 -- P2
    //   |      |
    //   |      P3 -- P4
    //   |            |
    //   P6 -------- P5
    const points: LShapePoint[] = [
      [0, 0],                                    // P1: Outer corner of arm A (front-left)
      [armA, 0],                                 // P2: Front-right of arm A
      [armA, cabinetDepth],                      // P3: Back-right of arm A
      [cabinetDepth + deadZone.width, cabinetDepth], // P4: Start of dead zone
      [cabinetDepth + deadZone.width, armB],     // P5: End of arm B (back)
      [0, armB],                                 // P6: Back-left of arm B
    ];

    // Mirror for RIGHT orientation
    if (cornerOrientation === 'RIGHT') {
      return points.map(([x, z]) => [armA - x, z] as LShapePoint);
    }

    return points;
  },

  /**
   * Calculate diagonal front width (for L-shaped cabinets)
   * This is the width of the angled front panel that covers the corner
   */
  calculateDiagonalWidth: (
    config: CornerConfig,
    cabinetDepth: number
  ): number => {
    const deadZone = CornerDomain.getDeadZoneDimensions(config, cabinetDepth);

    if (config.cornerAngle === 90) {
      // For 90° corners, diagonal is the hypotenuse of the dead zone square
      return Math.round(Math.sqrt(2) * Math.min(deadZone.width, deadZone.depth));
    }

    // For non-90° angles, use law of cosines
    const radians = (config.cornerAngle * Math.PI) / 180;
    return Math.round(
      Math.sqrt(
        Math.pow(deadZone.width, 2) +
        Math.pow(deadZone.depth, 2) -
        2 * deadZone.width * deadZone.depth * Math.cos(radians)
      )
    );
  },

  /**
   * Calculate shelf positions for corner cabinet
   * Returns Y positions for each shelf
   */
  calculateShelfPositions: (
    cabinetHeight: number,
    materialThickness: number,
    shelfCount: number
  ): number[] => {
    if (shelfCount <= 0) return [];

    const usableHeight = cabinetHeight - 2 * materialThickness;
    const spacing = usableHeight / (shelfCount + 1);

    return Array.from({ length: shelfCount }, (_, i) =>
      Math.round(materialThickness + spacing * (i + 1))
    );
  },

  /**
   * Calculate the cabinet bounding box dimensions
   * Used for positioning and collision detection
   */
  calculateBoundingBox: (
    config: CornerConfig,
    cabinetHeight: number,
    cabinetDepth: number
  ): { width: number; height: number; depth: number } => ({
    width: config.armA,
    height: cabinetHeight,
    depth: config.armB,
  }),

  /**
   * Get effective interior space dimensions
   * Accounts for wall thickness and dead zone
   */
  calculateInteriorSpace: (
    config: CornerConfig,
    cabinetHeight: number,
    cabinetDepth: number,
    materialThickness: number
  ): { usableWidth: number; usableHeight: number; usableDepth: number } => {
    const deadZone = CornerDomain.getDeadZoneDimensions(config, cabinetDepth);

    return {
      usableWidth: config.armA - materialThickness - deadZone.width,
      usableHeight: cabinetHeight - 2 * materialThickness,
      usableDepth: cabinetDepth - materialThickness,
    };
  },

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate corner configuration
   */
  validate: (config: CornerConfig): ValidationResult => {
    const errors: string[] = [];

    // Arm A validation
    if (config.armA < CORNER_LIMITS.MIN_ARM || config.armA > CORNER_LIMITS.MAX_ARM) {
      errors.push(`Ramię A musi być między ${CORNER_LIMITS.MIN_ARM}-${CORNER_LIMITS.MAX_ARM}mm`);
    }

    // Arm B validation (only for asymmetric mode)
    if (config.dimensionMode === 'ASYMMETRIC') {
      if (config.armB < CORNER_LIMITS.MIN_ARM || config.armB > CORNER_LIMITS.MAX_ARM) {
        errors.push(`Ramię B musi być między ${CORNER_LIMITS.MIN_ARM}-${CORNER_LIMITS.MAX_ARM}mm`);
      }
    }

    // Angle validation
    if (config.cornerAngle < CORNER_LIMITS.MIN_ANGLE || config.cornerAngle > CORNER_LIMITS.MAX_ANGLE) {
      errors.push(`Kąt narożnika musi być między ${CORNER_LIMITS.MIN_ANGLE}-${CORNER_LIMITS.MAX_ANGLE}°`);
    }

    // Custom dead zone validation
    if (config.deadZonePreset === 'CUSTOM') {
      if (!config.deadZoneWidth || config.deadZoneWidth < 50) {
        errors.push('Szerokość martwej strefy musi być minimum 50mm');
      }
      if (!config.deadZoneDepth || config.deadZoneDepth < 50) {
        errors.push('Głębokość martwej strefy musi być minimum 50mm');
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate corner cabinet params
   */
  validateParams: (params: CornerInternalCabinetParams): ValidationResult => {
    const errors: string[] = [];

    // Dimension validation
    if (params.height < CORNER_LIMITS.MIN_HEIGHT || params.height > CORNER_LIMITS.MAX_HEIGHT) {
      errors.push(`Wysokość musi być między ${CORNER_LIMITS.MIN_HEIGHT}-${CORNER_LIMITS.MAX_HEIGHT}mm`);
    }

    if (params.depth < CORNER_LIMITS.MIN_DEPTH || params.depth > CORNER_LIMITS.MAX_DEPTH) {
      errors.push(`Głębokość musi być między ${CORNER_LIMITS.MIN_DEPTH}-${CORNER_LIMITS.MAX_DEPTH}mm`);
    }

    // Validate corner config
    const configValidation = CornerDomain.validate(params.cornerConfig);
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if config uses symmetric arms
   */
  isSymmetric: (config: CornerConfig): boolean =>
    config.dimensionMode === 'SYMMETRIC',

  /**
   * Check if corner type has diagonal front
   */
  hasDiagonalFront: (config: CornerConfig): boolean =>
    config.cornerType === 'L_SHAPED',

  /**
   * Check if any walls are shared with adjacent cabinets
   */
  hasSharedWalls: (config: CornerConfig): boolean =>
    config.wallSharingMode !== 'FULL_ISOLATION',

  /**
   * Check if corner has doors
   */
  hasDoors: (config: CornerConfig): boolean =>
    config.cornerDoorType !== 'NONE',

  /**
   * Get corner type label in Polish
   */
  getTypeLabel: (type: InternalCornerType): string => {
    const labels: Record<InternalCornerType, string> = {
      L_SHAPED: 'L-kształtna (diagonalna)',
      BLIND_CORNER: 'Ślepa narożna',
      LAZY_SUSAN: 'Karuzela (Lazy Susan)',
    };
    return labels[type];
  },

  /**
   * Get orientation label in Polish
   */
  getOrientationLabel: (orientation: CornerOrientation): string => {
    const labels: Record<CornerOrientation, string> = {
      LEFT: 'Lewa',
      RIGHT: 'Prawa',
    };
    return labels[orientation];
  },

  /**
   * Get dead zone preset label in Polish
   */
  getDeadZonePresetLabel: (preset: DeadZonePreset): string => {
    const labels: Record<DeadZonePreset, string> = {
      MINIMAL: 'Minimalna',
      STANDARD: 'Standardowa',
      ACCESSIBLE: 'Łatwy dostęp',
      CUSTOM: 'Własna',
    };
    return labels[preset];
  },

  /**
   * Get door type label in Polish
   */
  getDoorTypeLabel: (doorType: CornerDoorType): string => {
    const labels: Record<CornerDoorType, string> = {
      BI_FOLD: 'Składane',
      SINGLE_DIAGONAL: 'Pojedyncze (skośne)',
      DOUBLE_L: 'Podwójne (L)',
      NONE: 'Brak',
    };
    return labels[doorType];
  },

  /**
   * Get human-readable summary of corner config
   */
  getSummary: (config: CornerConfig): string => {
    const type = CornerDomain.getTypeLabel(config.cornerType);
    const dims = config.dimensionMode === 'SYMMETRIC'
      ? `${config.armA}mm`
      : `${config.armA}×${config.armB}mm`;
    const orientation = config.cornerOrientation === 'LEFT' ? 'L' : 'P';

    return `${type} ${dims} (${orientation})`;
  },
} as const;

// Default export for convenient imports
export default CornerDomain;
