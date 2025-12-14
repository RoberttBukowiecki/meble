/**
 * Shelf Domain Module
 *
 * Handles shelf configuration operations including:
 * - Creating shelf configurations
 * - Managing individual shelves in MANUAL mode
 * - Calculating shelf positions and depths
 * - Validating shelf configurations
 */

import type {
  ShelvesConfiguration,
  ShelfConfig,
  ShelfDepthPreset,
} from '@/types';
import { generateShelfId } from '@/types';
import { INTERIOR_CONFIG, SHELF_CONFIG } from '@/lib/config';
import type { ValidationResult } from './types';
import { validResult, invalidResult } from './types';
import { clamp, removeArrayItemById, updateArrayItemById } from './utils';

// ============================================================================
// Shelf Domain Module
// ============================================================================

export const Shelf = {
  // ==========================================================================
  // CREATORS - Functions that create new shelf objects
  // ==========================================================================

  /**
   * Create a single shelf config
   */
  create: (depthPreset: ShelfDepthPreset = 'FULL'): ShelfConfig => ({
    id: generateShelfId(),
    depthPreset,
  }),

  /**
   * Create a shelf with custom depth
   */
  createCustom: (customDepth: number): ShelfConfig => ({
    id: generateShelfId(),
    depthPreset: 'CUSTOM',
    customDepth: clamp(
      customDepth,
      INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN,
      INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX
    ),
  }),

  /**
   * Create a shelves configuration
   */
  createConfig: (
    count: number = 2,
    mode: 'UNIFORM' | 'MANUAL' = 'UNIFORM',
    depthPreset: ShelfDepthPreset = 'FULL'
  ): ShelvesConfiguration => {
    const clampedCount = clamp(count, 0, INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);

    const config: ShelvesConfiguration = {
      mode,
      count: clampedCount,
      depthPreset,
      shelves: [],
    };

    // In MANUAL mode, create individual shelf configs
    if (mode === 'MANUAL') {
      config.shelves = Array.from({ length: clampedCount }, () =>
        Shelf.create(depthPreset)
      );
    }

    return config;
  },

  /**
   * Clone a shelves configuration
   */
  cloneConfig: (config: ShelvesConfiguration): ShelvesConfiguration => ({
    ...config,
    shelves: config.shelves.map((shelf) => ({
      ...shelf,
      id: generateShelfId(),
    })),
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies
  // ==========================================================================

  /**
   * Set shelf count
   */
  setCount: (config: ShelvesConfiguration, count: number): ShelvesConfiguration => {
    const newCount = clamp(count, 0, INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    const currentCount = config.count;

    // In MANUAL mode, adjust the shelves array
    let newShelves = [...config.shelves];
    if (config.mode === 'MANUAL') {
      if (newCount > currentCount) {
        // Add new shelves
        const toAdd = newCount - currentCount;
        for (let i = 0; i < toAdd; i++) {
          newShelves.push(Shelf.create(config.depthPreset));
        }
      } else if (newCount < currentCount) {
        // Remove shelves from the end
        newShelves = newShelves.slice(0, newCount);
      }
    }

    return {
      ...config,
      count: newCount,
      shelves: newShelves,
    };
  },

  /**
   * Set distribution mode
   */
  setMode: (
    config: ShelvesConfiguration,
    mode: 'UNIFORM' | 'MANUAL'
  ): ShelvesConfiguration => {
    if (config.mode === mode) return config;

    const newConfig: ShelvesConfiguration = {
      ...config,
      mode,
    };

    if (mode === 'MANUAL' && config.shelves.length === 0) {
      // Initialize individual shelf configs when switching to MANUAL
      newConfig.shelves = Array.from({ length: config.count }, () =>
        Shelf.create(config.depthPreset)
      );
    }

    return newConfig;
  },

  /**
   * Set global depth preset (for UNIFORM mode)
   */
  setDepthPreset: (
    config: ShelvesConfiguration,
    preset: ShelfDepthPreset
  ): ShelvesConfiguration => ({
    ...config,
    depthPreset: preset,
  }),

  /**
   * Set custom depth (for UNIFORM mode with CUSTOM preset)
   */
  setCustomDepth: (
    config: ShelvesConfiguration,
    depth: number
  ): ShelvesConfiguration => ({
    ...config,
    customDepth: clamp(
      depth,
      INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN,
      INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX
    ),
  }),

  /**
   * Set material ID
   */
  setMaterialId: (
    config: ShelvesConfiguration,
    materialId: string | undefined
  ): ShelvesConfiguration => ({
    ...config,
    materialId,
  }),

  /**
   * Add a shelf (MANUAL mode)
   */
  addShelf: (
    config: ShelvesConfiguration,
    shelf?: ShelfConfig
  ): ShelvesConfiguration => {
    if (config.count >= INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE) {
      return config;
    }

    return {
      ...config,
      count: config.count + 1,
      shelves: [...config.shelves, shelf ?? Shelf.create(config.depthPreset)],
    };
  },

  /**
   * Remove a shelf by ID (MANUAL mode)
   */
  removeShelf: (
    config: ShelvesConfiguration,
    shelfId: string
  ): ShelvesConfiguration => {
    if (config.count <= 0) return config;

    return {
      ...config,
      count: Math.max(0, config.count - 1),
      shelves: removeArrayItemById(config.shelves, shelfId),
    };
  },

  /**
   * Update a single shelf config (MANUAL mode)
   */
  updateShelf: (
    config: ShelvesConfiguration,
    shelfId: string,
    patch: Partial<Omit<ShelfConfig, 'id'>>
  ): ShelvesConfiguration => ({
    ...config,
    shelves: config.shelves.map((shelf) =>
      shelf.id === shelfId ? { ...shelf, ...patch } : shelf
    ),
  }),

  /**
   * Set shelf depth preset (MANUAL mode)
   */
  setShelfDepthPreset: (
    config: ShelvesConfiguration,
    shelfId: string,
    preset: ShelfDepthPreset
  ): ShelvesConfiguration =>
    Shelf.updateShelf(config, shelfId, { depthPreset: preset }),

  /**
   * Set shelf custom depth (MANUAL mode)
   */
  setShelfCustomDepth: (
    config: ShelvesConfiguration,
    shelfId: string,
    depth: number
  ): ShelvesConfiguration =>
    Shelf.updateShelf(config, shelfId, {
      depthPreset: 'CUSTOM',
      customDepth: clamp(
        depth,
        INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN,
        INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX
      ),
    }),

  /**
   * Set shelf material (MANUAL mode)
   */
  setShelfMaterial: (
    config: ShelvesConfiguration,
    shelfId: string,
    materialId: string | undefined
  ): ShelvesConfiguration => Shelf.updateShelf(config, shelfId, { materialId }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate shelf width (cabinet interior width)
   */
  calculateWidth: (cabinetWidth: number, bodyThickness: number): number =>
    Math.max(cabinetWidth - bodyThickness * 2, 0),

  /**
   * Calculate shelf depth in mm based on preset
   */
  calculateDepth: (
    preset: ShelfDepthPreset,
    customDepth: number | undefined,
    cabinetDepth: number
  ): number => {
    const baseDepth = cabinetDepth - SHELF_CONFIG.SETBACK;

    switch (preset) {
      case 'FULL':
        return baseDepth;
      case 'HALF':
        return Math.round(baseDepth / 2);
      case 'CUSTOM':
        return customDepth ?? Math.round(baseDepth / 2);
      default:
        return baseDepth;
    }
  },

  /**
   * Calculate effective depth for a specific shelf (considers individual and global settings)
   */
  calculateEffectiveDepth: (
    shelf: ShelfConfig | undefined,
    config: ShelvesConfiguration,
    cabinetDepth: number
  ): number => {
    if (shelf) {
      // Individual shelf settings take precedence
      return Shelf.calculateDepth(
        shelf.depthPreset,
        shelf.customDepth ?? config.customDepth,
        cabinetDepth
      );
    }

    // Fall back to global settings
    return Shelf.calculateDepth(config.depthPreset, config.customDepth, cabinetDepth);
  },

  /**
   * Calculate shelf positions (Y coordinates) within a section
   * Returns positions from bottom to top
   */
  calculatePositions: (
    config: ShelvesConfiguration,
    sectionStartY: number,
    sectionHeight: number
  ): number[] => {
    if (config.count === 0) return [];

    const positions: number[] = [];

    if (config.mode === 'UNIFORM') {
      // Distribute shelves evenly using config values
      const bottomOffset = SHELF_CONFIG.POSITION_BOTTOM_OFFSET;
      const count = config.count;

      for (let i = 0; i < count; i++) {
        // Single shelf: middle of section (using config)
        // Multiple: first at bottom offset, distributed up to (1 - bottomOffset)
        const positionRatio =
          count === 1 ? SHELF_CONFIG.SINGLE_SHELF_POSITION : (i / count) * (1 - bottomOffset) + bottomOffset;
        positions.push(sectionStartY + positionRatio * sectionHeight);
      }
    } else {
      // MANUAL mode - use positionY if set, otherwise distribute evenly
      for (let i = 0; i < config.shelves.length; i++) {
        const shelf = config.shelves[i];
        if (shelf.positionY !== undefined) {
          positions.push(sectionStartY + shelf.positionY);
        } else {
          // Fall back to uniform distribution
          const positionRatio = (i + 1) / (config.shelves.length + 1);
          positions.push(sectionStartY + positionRatio * sectionHeight);
        }
      }
    }

    return positions;
  },

  /**
   * Calculate Z offset for a recessed shelf (when depth < cabinet depth)
   */
  calculateZOffset: (shelfDepth: number, cabinetDepth: number): number =>
    (cabinetDepth - shelfDepth) / 2,

  /**
   * Calculate maximum custom depth for a cabinet
   */
  calculateMaxCustomDepth: (cabinetDepth: number): number =>
    cabinetDepth - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET,

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate a shelves configuration
   */
  validate: (config: ShelvesConfiguration): ValidationResult => {
    const errors: string[] = [];

    if (config.count < 0) {
      errors.push('Shelf count cannot be negative');
    }

    if (config.count > INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE) {
      errors.push(`Shelf count cannot exceed ${INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE}`);
    }

    if (config.mode === 'MANUAL' && config.shelves.length !== config.count) {
      errors.push('In MANUAL mode, shelves array length must match count');
    }

    if (config.depthPreset === 'CUSTOM') {
      if (config.customDepth === undefined) {
        errors.push('Custom depth must be specified when using CUSTOM preset');
      } else if (
        config.customDepth < INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN ||
        config.customDepth > INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX
      ) {
        errors.push(
          `Custom depth must be between ${INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN} and ${INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX}mm`
        );
      }
    }

    // Validate individual shelves in MANUAL mode
    if (config.mode === 'MANUAL') {
      for (const shelf of config.shelves) {
        const shelfResult = Shelf.validateShelf(shelf);
        if (!shelfResult.valid) {
          errors.push(...shelfResult.errors);
        }
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate a single shelf config
   */
  validateShelf: (shelf: ShelfConfig): ValidationResult => {
    const errors: string[] = [];

    if (shelf.depthPreset === 'CUSTOM') {
      if (shelf.customDepth === undefined) {
        // This is OK - will fall back to global customDepth
      } else if (
        shelf.customDepth < INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN ||
        shelf.customDepth > INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX
      ) {
        errors.push(
          `Shelf custom depth must be between ${INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN} and ${INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX}mm`
        );
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if configuration has any shelves
   */
  hasContent: (config: ShelvesConfiguration): boolean => config.count > 0,

  /**
   * Get shelf by ID
   */
  getShelfById: (
    config: ShelvesConfiguration,
    shelfId: string
  ): ShelfConfig | undefined => config.shelves.find((s) => s.id === shelfId),

  /**
   * Get shelf index by ID
   */
  getShelfIndex: (config: ShelvesConfiguration, shelfId: string): number =>
    config.shelves.findIndex((s) => s.id === shelfId),

  /**
   * Get human-readable summary
   */
  getSummary: (config: ShelvesConfiguration): string => {
    if (config.count === 0) return 'Brak półek';
    if (config.count === 1) return '1 półka';
    return `${config.count} półek`;
  },

  /**
   * Get depth preset label in Polish
   */
  getDepthPresetLabel: (preset: ShelfDepthPreset): string => {
    switch (preset) {
      case 'FULL':
        return 'Pełna';
      case 'HALF':
        return 'Połowa';
      case 'CUSTOM':
        return 'Własna';
      default:
        return 'Nieznana';
    }
  },

  /**
   * Get mode label in Polish
   */
  getModeLabel: (mode: 'UNIFORM' | 'MANUAL'): string => {
    switch (mode) {
      case 'UNIFORM':
        return 'Równomierne';
      case 'MANUAL':
        return 'Ręczne';
      default:
        return 'Nieznany';
    }
  },
} as const;
