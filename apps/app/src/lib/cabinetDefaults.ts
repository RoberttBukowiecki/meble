/**
 * Cabinet Type Defaults Configuration
 *
 * This file contains backend-configurable defaults for cabinet types.
 * These settings determine what features are enabled by default when
 * creating new cabinets, and which settings are inherited from previous
 * cabinets of the same type.
 *
 * In the future, this configuration can be fetched from a backend/CMS
 * to allow dynamic customization without code changes.
 */

import type { CabinetType, CabinetParams, KitchenCabinetParams } from '@/types';
import type { CabinetCountertopConfig } from '@/types/countertop';
import type { LegsConfig } from '@/types/legs';
import type { DoorConfig } from '@/types/door';
import type { HandleConfig } from '@/types/handle';
import { CABINET_PRESETS, DEFAULT_DOOR_CONFIG, LEG_DEFAULTS } from './config';

// ============================================================================
// Cabinet Type Feature Defaults
// ============================================================================

/**
 * Cabinet type-specific feature defaults.
 * These define which features are enabled by default when creating a new cabinet.
 */
export interface CabinetTypeFeatureDefaults {
  /** Whether legs are enabled by default */
  legsEnabled: boolean;
  /** Whether countertop is enabled by default (kitchen-type cabinets only) */
  countertopEnabled: boolean;
  /** Whether doors are enabled by default */
  doorsEnabled?: boolean;
}

/**
 * Default feature settings per cabinet type.
 *
 * This configuration is the single source of truth for which features
 * are enabled by default for each cabinet type. Modify this object
 * to change defaults across the entire application.
 *
 * @example
 * // KITCHEN cabinets come with countertops and legs enabled by default
 * // WALL cabinets never have legs (they're wall-mounted)
 * // BOOKSHELF cabinets have no doors or countertops by default
 */
export const CABINET_TYPE_FEATURE_DEFAULTS: Record<CabinetType, CabinetTypeFeatureDefaults> = {
  KITCHEN: {
    legsEnabled: true,
    countertopEnabled: true,
    doorsEnabled: true,
  },
  WARDROBE: {
    legsEnabled: true,
    countertopEnabled: false,
    doorsEnabled: true,
  },
  BOOKSHELF: {
    legsEnabled: false,
    countertopEnabled: false,
    doorsEnabled: false,
  },
  DRAWER: {
    legsEnabled: true,
    countertopEnabled: false,
    doorsEnabled: false,
  },
  WALL: {
    legsEnabled: false, // Wall cabinets are wall-mounted, no legs
    countertopEnabled: false,
    doorsEnabled: true,
  },
  CORNER_INTERNAL: {
    legsEnabled: true,
    countertopEnabled: true,
    doorsEnabled: true,
  },
  CORNER_EXTERNAL: {
    legsEnabled: true,
    countertopEnabled: true,
    doorsEnabled: true,
  },
};

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default leg configuration to use when legs are enabled for a cabinet type.
 */
export const DEFAULT_LEGS_CONFIG: LegsConfig = {
  enabled: true,
  legType: {
    preset: LEG_DEFAULTS.PRESET,
    height: LEG_DEFAULTS.HEIGHT,
    adjustRange: LEG_DEFAULTS.ADJUST_RANGE,
    diameter: LEG_DEFAULTS.DIAMETER,
    shape: LEG_DEFAULTS.SHAPE,
    finish: LEG_DEFAULTS.FINISH,
  },
  countMode: LEG_DEFAULTS.COUNT_MODE,
  currentHeight: LEG_DEFAULTS.HEIGHT,
  cornerInset: LEG_DEFAULTS.CORNER_INSET,
};

/**
 * Default countertop configuration to use when countertop is enabled for a cabinet type.
 */
export const DEFAULT_COUNTERTOP_CONFIG: CabinetCountertopConfig = {
  hasCountertop: true,
  // materialId will be set from store's available countertop materials
};

// ============================================================================
// Cabinet Preferences (Last Used Settings)
// ============================================================================

/**
 * Inheritable configuration options that persist across cabinet creations.
 * When creating a new cabinet of the same type, these settings are inherited
 * from the last created cabinet of that type.
 */
export interface CabinetTypePreferences {
  /** Last used legs configuration */
  legs?: LegsConfig;
  /** Last used countertop configuration (for kitchen-type cabinets) */
  countertopConfig?: CabinetCountertopConfig;
  /** Last used door configuration */
  doorConfig?: DoorConfig;
  /** Last used handle configuration */
  handleConfig?: HandleConfig;
}

/**
 * Store type for cabinet preferences per cabinet type.
 */
export type CabinetPreferencesByType = Partial<Record<CabinetType, CabinetTypePreferences>>;

/**
 * Fields that should be inherited from previous cabinets of the same type.
 */
export const INHERITABLE_CABINET_FIELDS = [
  'legs',
  'countertopConfig',
  'doorConfig',
  'handleConfig',
] as const;

export type InheritableCabinetField = typeof INHERITABLE_CABINET_FIELDS[number];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets initial parameters with type-specific defaults applied.
 * This merges the base preset with feature defaults for the given cabinet type.
 */
export function getInitialCabinetParams(type: CabinetType): Partial<CabinetParams> {
  const preset = CABINET_PRESETS[type];
  const featureDefaults = CABINET_TYPE_FEATURE_DEFAULTS[type];

  const params: Partial<CabinetParams> = { ...preset };

  // Apply legs defaults
  if (featureDefaults.legsEnabled) {
    params.legs = { ...DEFAULT_LEGS_CONFIG };
  }

  // Apply countertop defaults (only for kitchen-type cabinets)
  if (featureDefaults.countertopEnabled && supportsCountertop(type)) {
    (params as Partial<KitchenCabinetParams>).countertopConfig = { ...DEFAULT_COUNTERTOP_CONFIG };
  }

  // Apply doors defaults if specified
  if (featureDefaults.doorsEnabled !== undefined && 'hasDoors' in preset) {
    (params as any).hasDoors = featureDefaults.doorsEnabled;
    if (featureDefaults.doorsEnabled) {
      (params as any).doorConfig = { ...DEFAULT_DOOR_CONFIG };
    }
  }

  return params;
}

/**
 * Merges initial cabinet params with user's last-used preferences for that cabinet type.
 * Preferences override defaults, allowing users to maintain consistent settings.
 */
export function mergeWithPreferences(
  baseParams: Partial<CabinetParams>,
  preferences: CabinetTypePreferences | undefined,
  type: CabinetType
): Partial<CabinetParams> {
  if (!preferences) {
    return baseParams;
  }

  const merged: Partial<CabinetParams> = { ...baseParams };
  const featureDefaults = CABINET_TYPE_FEATURE_DEFAULTS[type];

  // Merge legs config if both are enabled
  if (preferences.legs && featureDefaults.legsEnabled) {
    merged.legs = { ...preferences.legs };
  }

  // Merge countertop config if applicable
  if (preferences.countertopConfig && supportsCountertop(type)) {
    (merged as Partial<KitchenCabinetParams>).countertopConfig = {
      ...preferences.countertopConfig,
    };
  }

  // Merge door config if cabinet supports doors
  if (preferences.doorConfig && supportsDoors(type)) {
    (merged as any).doorConfig = { ...preferences.doorConfig };
  }

  // Merge handle config if cabinet supports handles
  if (preferences.handleConfig && supportsDoors(type)) {
    (merged as any).handleConfig = { ...preferences.handleConfig };
  }

  return merged;
}

/**
 * Extracts inheritable preferences from cabinet params for storage.
 * This is used to save the user's preferences after creating a cabinet.
 */
export function extractPreferences(params: CabinetParams): CabinetTypePreferences {
  const preferences: CabinetTypePreferences = {};

  if (params.legs) {
    preferences.legs = { ...params.legs };
  }

  if ('countertopConfig' in params && (params as KitchenCabinetParams).countertopConfig) {
    const srcConfig = (params as KitchenCabinetParams).countertopConfig!;
    // Note: cutoutPreset and customCutout are intentionally NOT saved
    // CNC cutouts are cabinet-specific and should not be inherited
    preferences.countertopConfig = {
      hasCountertop: srcConfig.hasCountertop,
      materialId: srcConfig.materialId,
      overhangOverride: srcConfig.overhangOverride,
      excludeFromGroup: srcConfig.excludeFromGroup,
      thicknessOverride: srcConfig.thicknessOverride,
    };
  }

  if ('doorConfig' in params && (params as any).doorConfig) {
    preferences.doorConfig = { ...(params as any).doorConfig };
  }

  if ('handleConfig' in params && (params as any).handleConfig) {
    preferences.handleConfig = { ...(params as any).handleConfig };
  }

  return preferences;
}

/**
 * Checks if a cabinet type supports countertop configuration.
 */
export function supportsCountertop(type: CabinetType): boolean {
  return type === 'KITCHEN' || type === 'CORNER_INTERNAL' || type === 'CORNER_EXTERNAL';
}

/**
 * Checks if a cabinet type supports door configuration.
 */
export function supportsDoors(type: CabinetType): boolean {
  return type === 'KITCHEN' || type === 'WALL' || type === 'WARDROBE' ||
         type === 'CORNER_INTERNAL' || type === 'CORNER_EXTERNAL';
}
