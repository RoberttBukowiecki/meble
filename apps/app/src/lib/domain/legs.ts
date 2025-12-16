/**
 * Cabinet Legs Domain Module
 *
 * Namespace-like module that organizes business logic for cabinet legs.
 * Provides creators, updaters, calculators, validators, and queries.
 *
 * Usage:
 * ```typescript
 * import { LegsDomain } from '@/lib/domain';
 *
 * // Create leg config
 * const config = LegsDomain.createLegsConfig(true, 'STANDARD');
 *
 * // Update preset
 * const updated = LegsDomain.updateLegPreset(config, 'TALL');
 *
 * // Calculate positions
 * const positions = LegsDomain.calculateLegPositions(800, 500, 4, 50);
 * ```
 */

import type {
  LegsConfig,
  LegTypeConfig,
  LegPreset,
  LegFinish,
  LegShape,
  LegCountMode,
  LegData,
} from '@/types';
import { LEG_FINISH_COLORS, getLegColor } from '@/types';
import { ValidationResult, validResult, invalidResult } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LEG_PRESETS: Record<LegPreset, Omit<LegTypeConfig, 'preset'>> = {
  SHORT: {
    height: 100,
    adjustRange: 20,
    diameter: 30,
    shape: 'ROUND',
    finish: 'BLACK_PLASTIC',
  },
  STANDARD: {
    height: 150,
    adjustRange: 20,
    diameter: 30,
    shape: 'ROUND',
    finish: 'BLACK_PLASTIC',
  },
  TALL: {
    height: 200,
    adjustRange: 30,
    diameter: 40,
    shape: 'ROUND',
    finish: 'BLACK_PLASTIC',
  },
  CUSTOM: {
    height: 150,
    adjustRange: 20,
    diameter: 30,
    shape: 'ROUND',
    finish: 'BLACK_PLASTIC',
  },
};

// LEG_FINISH_COLORS is imported from @/types - single source of truth

export const LEG_DEFAULTS = {
  enabled: false,
  countMode: 'AUTO' as LegCountMode,
  cornerInset: 50,
  preset: 'STANDARD' as LegPreset,
} as const;

export const LEG_LIMITS = {
  MIN_HEIGHT: 50,
  MAX_HEIGHT: 300,
  MIN_DIAMETER: 20,
  MAX_DIAMETER: 60,
  MIN_INSET: 20,
  MAX_INSET: 100,
  MIN_COUNT: 4,
  MAX_COUNT: 12,
} as const;

// ============================================================================
// CREATORS
// ============================================================================

/**
 * Create a leg type configuration for a preset
 */
export function createLegTypeConfig(preset: LegPreset = 'STANDARD'): LegTypeConfig {
  const presetConfig = LEG_PRESETS[preset];
  return {
    preset,
    ...presetConfig,
  };
}

/**
 * Create a complete legs configuration
 */
export function createLegsConfig(
  enabled: boolean = false,
  preset: LegPreset = 'STANDARD'
): LegsConfig {
  const legType = createLegTypeConfig(preset);
  return {
    enabled,
    legType,
    countMode: LEG_DEFAULTS.countMode,
    currentHeight: legType.height,
    cornerInset: LEG_DEFAULTS.cornerInset,
  };
}

/**
 * Create default legs configuration (disabled)
 */
export function createDefaultLegsConfig(): LegsConfig {
  return createLegsConfig(false, 'STANDARD');
}

// ============================================================================
// UPDATERS (Immutable)
// ============================================================================

/**
 * Toggle legs enabled state
 */
export function toggleLegsEnabled(config: LegsConfig): LegsConfig {
  return { ...config, enabled: !config.enabled };
}

/**
 * Update legs enabled state
 */
export function updateLegsEnabled(config: LegsConfig, enabled: boolean): LegsConfig {
  return { ...config, enabled };
}

/**
 * Update leg preset (resets height to preset default)
 */
export function updateLegPreset(config: LegsConfig, preset: LegPreset): LegsConfig {
  const newLegType = createLegTypeConfig(preset);
  return {
    ...config,
    legType: newLegType,
    currentHeight: newLegType.height,
  };
}

/**
 * Update current leg height (clamped to adjust range)
 */
export function updateLegHeight(config: LegsConfig, height: number): LegsConfig {
  const { legType } = config;
  const minHeight = legType.height - legType.adjustRange;
  const maxHeight = legType.height + legType.adjustRange;
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, height));
  return { ...config, currentHeight: clampedHeight };
}

/**
 * Update leg finish
 */
export function updateLegFinish(config: LegsConfig, finish: LegFinish): LegsConfig {
  return {
    ...config,
    legType: { ...config.legType, finish },
  };
}

/**
 * Update leg shape
 */
export function updateLegShape(config: LegsConfig, shape: LegShape): LegsConfig {
  return {
    ...config,
    legType: { ...config.legType, shape },
  };
}

/**
 * Update leg count mode
 */
export function updateLegCountMode(config: LegsConfig, countMode: LegCountMode): LegsConfig {
  return { ...config, countMode };
}

/**
 * Update manual leg count
 */
export function updateManualLegCount(config: LegsConfig, count: number): LegsConfig {
  const clampedCount = Math.max(LEG_LIMITS.MIN_COUNT, Math.min(LEG_LIMITS.MAX_COUNT, count));
  return { ...config, manualCount: clampedCount, countMode: 'MANUAL' };
}

/**
 * Update corner inset
 */
export function updateCornerInset(config: LegsConfig, inset: number): LegsConfig {
  const clampedInset = Math.max(LEG_LIMITS.MIN_INSET, Math.min(LEG_LIMITS.MAX_INSET, inset));
  return { ...config, cornerInset: clampedInset };
}

/**
 * Update custom leg dimensions (sets preset to CUSTOM)
 */
export function updateCustomLegDimensions(
  config: LegsConfig,
  height: number,
  diameter: number
): LegsConfig {
  return {
    ...config,
    legType: {
      ...config.legType,
      preset: 'CUSTOM',
      height,
      diameter,
    },
    currentHeight: height,
  };
}

// ============================================================================
// CALCULATORS
// ============================================================================

/**
 * Calculate optimal leg count based on cabinet width
 */
export function calculateLegCount(widthMm: number): number {
  if (widthMm < 1000) return 4; // < 100cm: 4 legs
  if (widthMm <= 1800) return 6; // 100-180cm: 6 legs
  return 8; // > 180cm: 8 legs
}

/**
 * Get effective leg count (auto or manual)
 */
export function getEffectiveLegCount(config: LegsConfig, cabinetWidth: number): number {
  if (config.countMode === 'MANUAL' && config.manualCount) {
    return config.manualCount;
  }
  return calculateLegCount(cabinetWidth);
}

/**
 * Calculate leg positions for a cabinet
 * Returns array of [x, z] positions relative to cabinet center
 */
export function calculateLegPositions(
  width: number,
  depth: number,
  legCount: number,
  cornerInset: number = 50
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  const halfWidth = width / 2 - cornerInset;
  const halfDepth = depth / 2 - cornerInset;

  if (legCount >= 4) {
    // Corner legs (always present)
    positions.push([-halfWidth, -halfDepth]); // back-left
    positions.push([halfWidth, -halfDepth]); // back-right
    positions.push([-halfWidth, halfDepth]); // front-left
    positions.push([halfWidth, halfDepth]); // front-right
  }

  if (legCount >= 6) {
    // Center legs (front and back)
    positions.push([0, -halfDepth]); // back-center
    positions.push([0, halfDepth]); // front-center
  }

  if (legCount >= 8) {
    // Additional distributed legs
    const quarterWidth = halfWidth / 2;
    positions.push([-quarterWidth, -halfDepth]); // back-left-quarter
    positions.push([quarterWidth, -halfDepth]); // back-right-quarter
  }

  return positions;
}

/**
 * Calculate the Y offset that legs add to a cabinet
 */
export function calculateLegHeightOffset(legsConfig?: LegsConfig): number {
  if (!legsConfig?.enabled) return 0;
  return legsConfig.currentHeight;
}

// getLegColor is imported from @/types - single source of truth

/**
 * Calculate height range for current preset
 */
export function getHeightRange(config: LegsConfig): { min: number; max: number } {
  const { legType } = config;
  return {
    min: legType.height - legType.adjustRange,
    max: legType.height + legType.adjustRange,
  };
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Validate legs configuration
 */
export function validateLegsConfig(config: LegsConfig): ValidationResult {
  const errors: string[] = [];

  if (
    config.currentHeight < LEG_LIMITS.MIN_HEIGHT ||
    config.currentHeight > LEG_LIMITS.MAX_HEIGHT
  ) {
    errors.push(
      `Leg height must be between ${LEG_LIMITS.MIN_HEIGHT}-${LEG_LIMITS.MAX_HEIGHT}mm`
    );
  }

  if (
    config.legType.diameter < LEG_LIMITS.MIN_DIAMETER ||
    config.legType.diameter > LEG_LIMITS.MAX_DIAMETER
  ) {
    errors.push(
      `Leg diameter must be between ${LEG_LIMITS.MIN_DIAMETER}-${LEG_LIMITS.MAX_DIAMETER}mm`
    );
  }

  if (
    config.cornerInset < LEG_LIMITS.MIN_INSET ||
    config.cornerInset > LEG_LIMITS.MAX_INSET
  ) {
    errors.push(
      `Corner inset must be between ${LEG_LIMITS.MIN_INSET}-${LEG_LIMITS.MAX_INSET}mm`
    );
  }

  if (config.countMode === 'MANUAL' && config.manualCount) {
    if (
      config.manualCount < LEG_LIMITS.MIN_COUNT ||
      config.manualCount > LEG_LIMITS.MAX_COUNT
    ) {
      errors.push(
        `Leg count must be between ${LEG_LIMITS.MIN_COUNT}-${LEG_LIMITS.MAX_COUNT}`
      );
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(...errors);
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Check if legs are enabled
 */
export function isEnabled(config?: LegsConfig): boolean {
  return config?.enabled ?? false;
}

/**
 * Check if leg count is automatic
 */
export function isAutoCount(config: LegsConfig): boolean {
  return config.countMode === 'AUTO';
}

/**
 * Check if custom preset is used
 */
export function isCustomPreset(config: LegsConfig): boolean {
  return config.legType.preset === 'CUSTOM';
}

/**
 * Get preset label (Polish)
 */
export function getPresetLabel(preset: LegPreset): string {
  const labels: Record<LegPreset, string> = {
    SHORT: 'Niskie (100mm)',
    STANDARD: 'Standardowe (150mm)',
    TALL: 'Wysokie (200mm)',
    CUSTOM: 'Niestandardowe',
  };
  return labels[preset];
}

/**
 * Get finish label (Polish)
 */
export function getFinishLabel(finish: LegFinish): string {
  const labels: Record<LegFinish, string> = {
    BLACK_PLASTIC: 'Czarny plastik',
    CHROME: 'Chrom',
    BRUSHED_STEEL: 'Stal szczotkowana',
    WHITE_PLASTIC: 'Bialy plastik',
  };
  return labels[finish];
}

/**
 * Get summary string (Polish)
 */
export function getSummary(config: LegsConfig, cabinetWidth?: number): string {
  if (!config.enabled) return 'Brak';
  const count = cabinetWidth ? getEffectiveLegCount(config, cabinetWidth) : '?';
  const preset = getPresetLabel(config.legType.preset);
  return `${count} szt. ${preset}`;
}

// ============================================================================
// EXPORT DOMAIN OBJECT
// ============================================================================

export const LegsDomain = {
  // Constants
  LEG_PRESETS,
  LEG_FINISH_COLORS,
  LEG_DEFAULTS,
  LEG_LIMITS,

  // Creators
  createLegTypeConfig,
  createLegsConfig,
  createDefaultLegsConfig,

  // Updaters
  toggleLegsEnabled,
  updateLegsEnabled,
  updateLegPreset,
  updateLegHeight,
  updateLegFinish,
  updateLegShape,
  updateLegCountMode,
  updateManualLegCount,
  updateCornerInset,
  updateCustomLegDimensions,

  // Calculators
  calculateLegCount,
  getEffectiveLegCount,
  calculateLegPositions,
  calculateLegHeightOffset,
  getLegColor,
  getHeightRange,

  // Validators
  validateLegsConfig,

  // Queries
  isEnabled,
  isAutoCount,
  isCustomPreset,
  getPresetLabel,
  getFinishLabel,
  getSummary,
};

export default LegsDomain;
