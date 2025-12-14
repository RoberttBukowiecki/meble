/**
 * Drawer Domain Module
 *
 * Handles drawer configuration operations including:
 * - Creating and managing drawer zones
 * - Managing drawer boxes within zones
 * - Calculating drawer dimensions
 * - Handling box-to-front ratio and above-box shelves
 */

import type {
  DrawerConfiguration,
  DrawerZone,
  DrawerZoneBox,
  DrawerZoneFront,
  DrawerSlideType,
  DrawerSlideConfig,
  AboveBoxShelfConfig,
  ShelfDepthPreset,
} from '@/types';
import { generateAboveBoxShelfId, generateZoneId } from '@/types';
import {
  DRAWER_SLIDE_PRESETS,
  DRAWER_CONFIG,
  INTERIOR_CONFIG,
} from '@/lib/config';
import type { ValidationResult, Bounds, DrawerBoxDimensions } from './types';
import { validResult, invalidResult, mergeValidations } from './types';
import {
  clamp,
  distributeByRatio,
  updateArrayItemById,
  removeArrayItemById,
  findIndexById,
  moveArrayItem,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export interface ZoneBounds extends Bounds {
  zone: DrawerZone;
  zoneIndex: number;
  frontHeight: number;
  boxTotalHeight: number;
}

export interface BoxBounds extends Bounds {
  boxIndex: number;
  heightMm: number;
}

// ============================================================================
// Drawer Domain Module
// ============================================================================

export const Drawer = {
  // ==========================================================================
  // CREATORS - Functions that create new drawer objects
  // ==========================================================================

  /**
   * Create a new drawer configuration
   */
  createConfig: (
    zoneCount: number = 3,
    slideType: DrawerSlideType = 'SIDE_MOUNT',
    hasExternalFronts: boolean = true
  ): DrawerConfiguration => {
    const count = clamp(zoneCount, 1, INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE);
    const zones: DrawerZone[] = Array.from({ length: count }, (_, i) => ({
      id: generateZoneId(),
      heightRatio: 1,
      front: hasExternalFronts ? {} : null,
      boxes: [{ heightRatio: 1 }],
    }));

    return {
      slideType,
      zones,
    };
  },

  /**
   * Create a single drawer zone
   */
  createZone: (hasExternalFront: boolean = true): DrawerZone => ({
    id: generateZoneId(),
    heightRatio: 1,
    front: hasExternalFront ? {} : null,
    boxes: [{ heightRatio: 1 }],
  }),

  /**
   * Create a drawer box
   */
  createBox: (heightRatio: number = 1): DrawerZoneBox => ({
    heightRatio: Math.max(0.1, heightRatio),
  }),

  /**
   * Create an above-box shelf
   */
  createAboveBoxShelf: (
    depthPreset: ShelfDepthPreset = 'FULL'
  ): AboveBoxShelfConfig => ({
    id: generateAboveBoxShelfId(),
    depthPreset,
  }),

  /**
   * Clone a drawer configuration
   */
  cloneConfig: (config: DrawerConfiguration): DrawerConfiguration => ({
    ...config,
    zones: config.zones.map((zone) => ({
      ...zone,
      id: generateZoneId(),
      boxes: [...zone.boxes],
      aboveBoxContent: zone.aboveBoxContent
        ? { shelves: zone.aboveBoxContent.shelves.map((s) => ({ ...s })) }
        : undefined,
    })),
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies
  // ==========================================================================

  /**
   * Add a zone to the configuration
   */
  addZone: (
    config: DrawerConfiguration,
    zone?: DrawerZone
  ): DrawerConfiguration => {
    if (config.zones.length >= INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE) {
      return config;
    }

    return {
      ...config,
      zones: [...config.zones, zone ?? Drawer.createZone()],
    };
  },

  /**
   * Remove a zone by ID
   */
  removeZone: (
    config: DrawerConfiguration,
    zoneId: string
  ): DrawerConfiguration => {
    if (config.zones.length <= 1) {
      return config; // Must have at least one zone
    }

    return {
      ...config,
      zones: removeArrayItemById(config.zones, zoneId),
    };
  },

  /**
   * Update a zone by ID
   */
  updateZone: (
    config: DrawerConfiguration,
    zoneId: string,
    patch: Partial<Omit<DrawerZone, 'id'>>
  ): DrawerConfiguration => ({
    ...config,
    zones: config.zones.map((zone) =>
      zone.id === zoneId ? { ...zone, ...patch } : zone
    ),
  }),

  /**
   * Move a zone up or down
   */
  moveZone: (
    config: DrawerConfiguration,
    zoneId: string,
    direction: 'up' | 'down'
  ): DrawerConfiguration => {
    const index = findIndexById(config.zones, zoneId);
    if (index === -1) return config;

    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= config.zones.length) return config;

    return {
      ...config,
      zones: moveArrayItem(config.zones, index, newIndex),
    };
  },

  /**
   * Update zone height ratio
   */
  setZoneHeightRatio: (
    config: DrawerConfiguration,
    zoneId: string,
    ratio: number
  ): DrawerConfiguration =>
    Drawer.updateZone(config, zoneId, {
      heightRatio: clamp(ratio, 0.1, 10),
    }),

  /**
   * Toggle zone external front
   */
  toggleZoneFront: (
    config: DrawerConfiguration,
    zoneId: string
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone) return config;

    return Drawer.updateZone(config, zoneId, {
      front: zone.front === null ? {} : null,
    });
  },

  /**
   * Update zone front configuration
   */
  updateZoneFront: (
    config: DrawerConfiguration,
    zoneId: string,
    front: DrawerZoneFront | null
  ): DrawerConfiguration => Drawer.updateZone(config, zoneId, { front }),

  /**
   * Set box-to-front ratio for a zone
   */
  setBoxToFrontRatio: (
    config: DrawerConfiguration,
    zoneId: string,
    ratio: number
  ): DrawerConfiguration => {
    const clampedRatio = clamp(
      ratio,
      DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MIN / 100,
      DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MAX / 100
    );

    return Drawer.updateZone(config, zoneId, {
      boxToFrontRatio: clampedRatio,
    });
  },

  /**
   * Add a box to a zone
   */
  addBox: (
    config: DrawerConfiguration,
    zoneId: string
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone || zone.boxes.length >= INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE) {
      return config;
    }

    return Drawer.updateZone(config, zoneId, {
      boxes: [...zone.boxes, Drawer.createBox()],
    });
  },

  /**
   * Remove a box from a zone
   */
  removeBox: (
    config: DrawerConfiguration,
    zoneId: string,
    boxIndex: number
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone || zone.boxes.length <= 1 || boxIndex < 0 || boxIndex >= zone.boxes.length) {
      return config;
    }

    return Drawer.updateZone(config, zoneId, {
      boxes: [...zone.boxes.slice(0, boxIndex), ...zone.boxes.slice(boxIndex + 1)],
    });
  },

  /**
   * Update box height ratio
   */
  setBoxHeightRatio: (
    config: DrawerConfiguration,
    zoneId: string,
    boxIndex: number,
    ratio: number
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone || boxIndex < 0 || boxIndex >= zone.boxes.length) {
      return config;
    }

    const newBoxes = zone.boxes.map((box, i) =>
      i === boxIndex ? { ...box, heightRatio: Math.max(0.1, ratio) } : box
    );

    return Drawer.updateZone(config, zoneId, { boxes: newBoxes });
  },

  /**
   * Add a shelf above the drawer box
   */
  addAboveBoxShelf: (
    config: DrawerConfiguration,
    zoneId: string,
    depthPreset: ShelfDepthPreset = 'FULL'
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone) return config;

    const currentShelves = zone.aboveBoxContent?.shelves ?? [];
    if (currentShelves.length >= INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER) {
      return config;
    }

    return Drawer.updateZone(config, zoneId, {
      aboveBoxContent: {
        shelves: [...currentShelves, Drawer.createAboveBoxShelf(depthPreset)],
      },
    });
  },

  /**
   * Remove a shelf above the drawer box
   */
  removeAboveBoxShelf: (
    config: DrawerConfiguration,
    zoneId: string,
    shelfId: string
  ): DrawerConfiguration => {
    const zone = config.zones.find((z) => z.id === zoneId);
    if (!zone || !zone.aboveBoxContent) return config;

    const newShelves = zone.aboveBoxContent.shelves.filter((s) => s.id !== shelfId);

    return Drawer.updateZone(config, zoneId, {
      aboveBoxContent: newShelves.length > 0 ? { shelves: newShelves } : undefined,
    });
  },

  /**
   * Update slide type
   */
  setSlideType: (
    config: DrawerConfiguration,
    slideType: DrawerSlideType
  ): DrawerConfiguration => ({
    ...config,
    slideType,
  }),

  /**
   * Convert all zones to internal (remove all external fronts)
   */
  convertToInternal: (config: DrawerConfiguration): DrawerConfiguration => ({
    ...config,
    zones: config.zones.map((zone) => ({
      ...zone,
      front: null,
    })),
  }),

  /**
   * Convert all zones to external (add external fronts)
   */
  convertToExternal: (config: DrawerConfiguration): DrawerConfiguration => ({
    ...config,
    zones: config.zones.map((zone) => ({
      ...zone,
      front: zone.front ?? {},
    })),
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate zone bounds within a section
   */
  calculateZoneBounds: (
    zones: DrawerZone[],
    totalHeight: number,
    bodyThickness: number
  ): ZoneBounds[] => {
    if (zones.length === 0) return [];

    const interiorHeight = Math.max(totalHeight - bodyThickness * 2, 0);
    const ratios = zones.map((z) => z.heightRatio);
    const heights = distributeByRatio(interiorHeight, ratios);

    let currentY = bodyThickness;

    return zones.map((zone, index) => {
      const height = heights[index];
      const boxToFrontRatio = zone.front !== null ? (zone.boxToFrontRatio ?? 1.0) : 1.0;
      const boxTotalHeight = height * boxToFrontRatio;

      const bounds: ZoneBounds = {
        zone,
        zoneIndex: index,
        startY: currentY,
        height,
        frontHeight: height, // Front covers full zone
        boxTotalHeight,
      };

      currentY += height;
      return bounds;
    });
  },

  /**
   * Calculate individual box bounds within a zone
   */
  calculateBoxBounds: (
    zone: DrawerZone,
    zoneStartY: number,
    boxTotalHeight: number
  ): BoxBounds[] => {
    if (zone.boxes.length === 0) return [];

    const ratios = zone.boxes.map((b) => b.heightRatio);
    const heights = distributeByRatio(boxTotalHeight, ratios);

    let currentY = zoneStartY;

    return zone.boxes.map((_, index) => {
      const height = heights[index];
      const bounds: BoxBounds = {
        boxIndex: index,
        startY: currentY,
        height,
        heightMm: Math.round(height),
      };
      currentY += height;
      return bounds;
    });
  },

  /**
   * Calculate drawer box dimensions based on cabinet and slide configuration
   */
  calculateBoxDimensions: (
    cabinetWidth: number,
    cabinetDepth: number,
    boxSpaceHeight: number,
    bodyThickness: number,
    slideConfig: DrawerSlideConfig,
    bottomThickness: number = DRAWER_CONFIG.BOTTOM_THICKNESS
  ): DrawerBoxDimensions => {
    // Drawer box width = cabinet interior width - slide clearances
    const boxWidth =
      cabinetWidth -
      2 * bodyThickness - // Subtract cabinet sides
      2 * slideConfig.sideOffset; // Subtract slide clearance

    // Drawer box depth - ends at cabinet front, only rear clearance applies
    const boxDepth = cabinetDepth - slideConfig.depthOffset;

    // Drawer box height (sides height) - smaller than the space available
    const boxSideHeight = Math.max(
      boxSpaceHeight - DRAWER_CONFIG.BOX_HEIGHT_REDUCTION,
      50
    );

    return { boxWidth, boxDepth, boxSideHeight, bottomThickness };
  },

  /**
   * Calculate drawer width (for UI display)
   */
  calculateDrawerWidth: (
    cabinetWidth: number,
    bodyThickness: number,
    slideType: DrawerSlideType
  ): number => {
    const slideConfig = DRAWER_SLIDE_PRESETS[slideType];
    return cabinetWidth - 2 * bodyThickness - 2 * slideConfig.sideOffset;
  },

  /**
   * Get slide configuration for a slide type
   */
  getSlideConfig: (slideType: DrawerSlideType): DrawerSlideConfig =>
    DRAWER_SLIDE_PRESETS[slideType],

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate a drawer configuration
   */
  validate: (config: DrawerConfiguration): ValidationResult => {
    const errors: string[] = [];

    if (config.zones.length === 0) {
      errors.push('Drawer configuration must have at least one zone');
    }

    if (config.zones.length > INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE) {
      errors.push(`Cannot have more than ${INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE} zones`);
    }

    for (let i = 0; i < config.zones.length; i++) {
      const zoneResult = Drawer.validateZone(config.zones[i]);
      if (!zoneResult.valid) {
        errors.push(...zoneResult.errors.map((e) => `Zone ${i + 1}: ${e}`));
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate a single zone
   */
  validateZone: (zone: DrawerZone): ValidationResult => {
    const errors: string[] = [];

    if (zone.heightRatio <= 0) {
      errors.push('Height ratio must be positive');
    }

    if (zone.boxes.length === 0) {
      errors.push('Zone must have at least one box');
    }

    if (zone.boxes.length > INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE) {
      errors.push(`Cannot have more than ${INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE} boxes per zone`);
    }

    for (const box of zone.boxes) {
      if (box.heightRatio <= 0) {
        errors.push('Box height ratio must be positive');
      }
    }

    if (zone.boxToFrontRatio !== undefined) {
      if (zone.boxToFrontRatio < 0.1 || zone.boxToFrontRatio > 1.0) {
        errors.push('Box-to-front ratio must be between 0.1 and 1.0');
      }
    }

    const shelfCount = zone.aboveBoxContent?.shelves.length ?? 0;
    if (shelfCount > INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER) {
      errors.push(`Cannot have more than ${INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER} shelves above drawer`);
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Get total box count across all zones
   */
  getTotalBoxCount: (config: DrawerConfiguration): number =>
    config.zones.reduce((sum, zone) => sum + zone.boxes.length, 0),

  /**
   * Get external front count
   */
  getFrontCount: (config: DrawerConfiguration): number =>
    config.zones.filter((zone) => zone.front !== null).length,

  /**
   * Check if configuration has any external fronts
   */
  hasExternalFronts: (config: DrawerConfiguration): boolean =>
    config.zones.some((zone) => zone.front !== null),

  /**
   * Check if zone has external front
   */
  zoneHasExternalFront: (zone: DrawerZone): boolean => zone.front !== null,

  /**
   * Check if zone has reduced box (boxToFrontRatio < 1)
   */
  zoneHasReducedBox: (zone: DrawerZone): boolean =>
    zone.front !== null && (zone.boxToFrontRatio ?? 1) < 1,

  /**
   * Get above-box shelf count for a zone
   */
  getAboveBoxShelfCount: (zone: DrawerZone): number =>
    zone.aboveBoxContent?.shelves.length ?? 0,

  /**
   * Get zone by ID
   */
  getZoneById: (config: DrawerConfiguration, zoneId: string): DrawerZone | undefined =>
    config.zones.find((z) => z.id === zoneId),

  /**
   * Get zone index by ID
   */
  getZoneIndex: (config: DrawerConfiguration, zoneId: string): number =>
    findIndexById(config.zones, zoneId),

  /**
   * Get human-readable summary
   */
  getSummary: (config: DrawerConfiguration): string => {
    const zoneCount = config.zones.length;
    const frontCount = Drawer.getFrontCount(config);
    const boxCount = Drawer.getTotalBoxCount(config);

    if (frontCount === 0) {
      return `${boxCount} szuflad wewn.`;
    } else if (frontCount === zoneCount && boxCount === zoneCount) {
      return `${zoneCount} szuflad`;
    } else {
      return `${frontCount} frontów, ${boxCount} szuflad`;
    }
  },

  /**
   * Get zone summary
   */
  getZoneSummary: (zone: DrawerZone): string => {
    const hasExternalFront = zone.front !== null;
    const boxCount = zone.boxes.length;
    const shelfCount = zone.aboveBoxContent?.shelves.length ?? 0;
    const boxRatio = zone.boxToFrontRatio ?? 1;

    let summary = hasExternalFront ? 'Front' : 'Wewnętrzna';

    if (boxCount > 1) {
      summary += ` (${boxCount} szuflady)`;
    }

    if (hasExternalFront && boxRatio < 1) {
      summary += ` ${Math.round(boxRatio * 100)}%`;
    }

    if (shelfCount > 0) {
      summary += ` +${shelfCount} półek`;
    }

    return summary;
  },
} as const;
