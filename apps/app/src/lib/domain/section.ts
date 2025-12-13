/**
 * Section Domain Module
 *
 * Handles cabinet section operations including:
 * - Creating sections with different content types
 * - Updating section configurations
 * - Calculating section bounds and heights
 * - Validating section configurations
 */

import type {
  CabinetSection,
  SectionContentType,
  ShelvesConfiguration,
  DrawerConfiguration,
  ShelfDepthPreset,
} from '@/types';
import {
  generateSectionId,
  DEFAULT_SHELVES_CONFIG,
} from '@/types';
import { createDefaultDrawerConfig, INTERIOR_CONFIG } from '@/lib/config';
import type { ValidationResult, Bounds } from './types';
import { validResult, invalidResult, mergeValidations } from './types';
import { clamp, distributeByRatio } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface SectionBounds extends Bounds {
  section: CabinetSection;
}

export interface SectionHeightInfo {
  heightMm: number;
  heightPercent: number;
}

// ============================================================================
// Section Domain Module
// ============================================================================

export const Section = {
  // ==========================================================================
  // CREATORS - Functions that create new section objects
  // ==========================================================================

  /**
   * Create a new section with specified content type
   */
  create: (contentType: SectionContentType = 'EMPTY'): CabinetSection => {
    const section: CabinetSection = {
      id: generateSectionId(),
      heightRatio: 1,
      contentType,
    };

    if (contentType === 'SHELVES') {
      section.shelvesConfig = { ...DEFAULT_SHELVES_CONFIG, shelves: [] };
    } else if (contentType === 'DRAWERS') {
      section.drawerConfig = createDefaultDrawerConfig(3, true);
    }

    return section;
  },

  /**
   * Create an empty section
   */
  createEmpty: (): CabinetSection => Section.create('EMPTY'),

  /**
   * Create a section with shelves
   */
  createWithShelves: (
    count: number = 2,
    depthPreset: ShelfDepthPreset = 'FULL'
  ): CabinetSection => {
    const section = Section.create('SHELVES');
    if (section.shelvesConfig) {
      section.shelvesConfig.count = clamp(count, 0, INTERIOR_CONFIG.MAX_SHELVES_PER_SECTION);
      section.shelvesConfig.depthPreset = depthPreset;
    }
    return section;
  },

  /**
   * Create a section with drawers
   */
  createWithDrawers: (
    zoneCount: number = 3,
    hasExternalFronts: boolean = true
  ): CabinetSection => {
    const section = Section.create('DRAWERS');
    section.drawerConfig = createDefaultDrawerConfig(
      clamp(zoneCount, 1, INTERIOR_CONFIG.MAX_DRAWER_ZONES),
      hasExternalFronts
    );
    return section;
  },

  /**
   * Clone a section with a new ID
   */
  clone: (section: CabinetSection): CabinetSection => ({
    ...section,
    id: generateSectionId(),
    shelvesConfig: section.shelvesConfig
      ? { ...section.shelvesConfig, shelves: [...section.shelvesConfig.shelves] }
      : undefined,
    drawerConfig: section.drawerConfig
      ? {
          ...section.drawerConfig,
          zones: section.drawerConfig.zones.map((z) => ({
            ...z,
            boxes: [...z.boxes],
          })),
        }
      : undefined,
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies of sections
  // ==========================================================================

  /**
   * Update section height ratio
   */
  updateHeightRatio: (
    section: CabinetSection,
    ratio: number
  ): CabinetSection => ({
    ...section,
    heightRatio: clamp(
      ratio,
      INTERIOR_CONFIG.SECTION_HEIGHT_RATIO_MIN,
      INTERIOR_CONFIG.SECTION_HEIGHT_RATIO_MAX
    ),
  }),

  /**
   * Update section content type
   * Initializes appropriate config when changing types
   */
  updateContentType: (
    section: CabinetSection,
    contentType: SectionContentType
  ): CabinetSection => {
    if (section.contentType === contentType) return section;

    const updated: CabinetSection = {
      ...section,
      contentType,
      shelvesConfig: undefined,
      drawerConfig: undefined,
    };

    if (contentType === 'SHELVES') {
      // Preserve existing shelves config if available, otherwise use default
      updated.shelvesConfig = section.shelvesConfig ?? {
        ...DEFAULT_SHELVES_CONFIG,
        shelves: [],
      };
    } else if (contentType === 'DRAWERS') {
      // Preserve existing drawer config if available, otherwise create default
      updated.drawerConfig = section.drawerConfig ?? createDefaultDrawerConfig(3, true);
    }

    return updated;
  },

  /**
   * Update shelves configuration
   */
  updateShelvesConfig: (
    section: CabinetSection,
    config: Partial<ShelvesConfiguration>
  ): CabinetSection => {
    if (section.contentType !== 'SHELVES' || !section.shelvesConfig) {
      return section;
    }

    return {
      ...section,
      shelvesConfig: {
        ...section.shelvesConfig,
        ...config,
        count: config.count !== undefined
          ? clamp(config.count, 0, INTERIOR_CONFIG.MAX_SHELVES_PER_SECTION)
          : section.shelvesConfig.count,
      },
    };
  },

  /**
   * Update drawer configuration
   */
  updateDrawerConfig: (
    section: CabinetSection,
    config: Partial<DrawerConfiguration>
  ): CabinetSection => {
    if (section.contentType !== 'DRAWERS' || !section.drawerConfig) {
      return section;
    }

    return {
      ...section,
      drawerConfig: {
        ...section.drawerConfig,
        ...config,
      },
    };
  },

  /**
   * Set shelves count (convenience method)
   */
  setShelvesCount: (section: CabinetSection, count: number): CabinetSection =>
    Section.updateShelvesConfig(section, { count }),

  /**
   * Set shelf depth preset (convenience method)
   */
  setShelfDepthPreset: (
    section: CabinetSection,
    preset: ShelfDepthPreset
  ): CabinetSection => Section.updateShelvesConfig(section, { depthPreset: preset }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate bounds (startY, height) for all sections
   * Returns bounds from bottom to top of cabinet interior
   */
  calculateBounds: (
    sections: CabinetSection[],
    cabinetHeight: number,
    bodyThickness: number
  ): SectionBounds[] => {
    if (sections.length === 0) return [];

    const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
    const ratios = sections.map((s) => s.heightRatio);
    const heights = distributeByRatio(interiorHeight, ratios);

    let currentY = bodyThickness; // Start from bottom panel

    return sections.map((section, index) => {
      const bounds: SectionBounds = {
        section,
        startY: currentY,
        height: heights[index],
      };
      currentY += heights[index];
      return bounds;
    });
  },

  /**
   * Calculate height in mm for a single section
   */
  calculateHeightMm: (
    section: CabinetSection,
    allSections: CabinetSection[],
    cabinetHeight: number,
    bodyThickness: number
  ): number => {
    const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
    const totalRatio = allSections.reduce((sum, s) => sum + s.heightRatio, 0);

    if (totalRatio === 0) return 0;
    return Math.round((section.heightRatio / totalRatio) * interiorHeight);
  },

  /**
   * Calculate height info (mm and percentage)
   */
  getHeightInfo: (
    section: CabinetSection,
    allSections: CabinetSection[],
    cabinetHeight: number,
    bodyThickness: number
  ): SectionHeightInfo => {
    const totalRatio = allSections.reduce((sum, s) => sum + s.heightRatio, 0);
    const heightPercent = totalRatio > 0
      ? Math.round((section.heightRatio / totalRatio) * 100)
      : 0;

    return {
      heightMm: Section.calculateHeightMm(section, allSections, cabinetHeight, bodyThickness),
      heightPercent,
    };
  },

  /**
   * Calculate interior height (total height minus top/bottom panels)
   */
  calculateInteriorHeight: (
    cabinetHeight: number,
    bodyThickness: number
  ): number => Math.max(cabinetHeight - bodyThickness * 2, 0),

  /**
   * Calculate interior width in mm (cabinet width minus side panels)
   */
  calculateInteriorWidth: (
    cabinetWidth: number,
    bodyThickness: number
  ): number => Math.max(cabinetWidth - bodyThickness * 2, 0),

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate a single section
   */
  validate: (section: CabinetSection): ValidationResult => {
    const errors: string[] = [];

    if (section.heightRatio <= 0) {
      errors.push('Height ratio must be positive');
    }

    if (section.heightRatio > INTERIOR_CONFIG.SECTION_HEIGHT_RATIO_MAX) {
      errors.push(`Height ratio cannot exceed ${INTERIOR_CONFIG.SECTION_HEIGHT_RATIO_MAX}`);
    }

    if (section.contentType === 'SHELVES') {
      if (!section.shelvesConfig) {
        errors.push('Shelves section must have shelvesConfig');
      } else if (section.shelvesConfig.count < 0) {
        errors.push('Shelf count cannot be negative');
      } else if (section.shelvesConfig.count > INTERIOR_CONFIG.MAX_SHELVES_PER_SECTION) {
        errors.push(`Shelf count cannot exceed ${INTERIOR_CONFIG.MAX_SHELVES_PER_SECTION}`);
      }
    }

    if (section.contentType === 'DRAWERS') {
      if (!section.drawerConfig) {
        errors.push('Drawers section must have drawerConfig');
      } else if (section.drawerConfig.zones.length === 0) {
        errors.push('Drawer section must have at least one zone');
      } else if (section.drawerConfig.zones.length > INTERIOR_CONFIG.MAX_DRAWER_ZONES) {
        errors.push(`Drawer zones cannot exceed ${INTERIOR_CONFIG.MAX_DRAWER_ZONES}`);
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate an array of sections
   */
  validateAll: (sections: CabinetSection[]): ValidationResult => {
    if (sections.length === 0) {
      return validResult(); // Empty is valid
    }

    if (sections.length > INTERIOR_CONFIG.MAX_SECTIONS) {
      return invalidResult(`Cannot have more than ${INTERIOR_CONFIG.MAX_SECTIONS} sections`);
    }

    const results = sections.map((s) => Section.validate(s));
    return mergeValidations(...results);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if section has any content
   */
  hasContent: (section: CabinetSection): boolean =>
    section.contentType !== 'EMPTY',

  /**
   * Check if section has shelves
   */
  hasShelves: (section: CabinetSection): boolean =>
    section.contentType === 'SHELVES' && (section.shelvesConfig?.count ?? 0) > 0,

  /**
   * Check if section has drawers
   */
  hasDrawers: (section: CabinetSection): boolean =>
    section.contentType === 'DRAWERS' && (section.drawerConfig?.zones.length ?? 0) > 0,

  /**
   * Get shelf count (0 if not a shelves section)
   */
  getShelfCount: (section: CabinetSection): number =>
    section.shelvesConfig?.count ?? 0,

  /**
   * Get drawer zone count (0 if not a drawers section)
   */
  getDrawerZoneCount: (section: CabinetSection): number =>
    section.drawerConfig?.zones.length ?? 0,

  /**
   * Get total drawer box count
   */
  getDrawerBoxCount: (section: CabinetSection): number => {
    if (!section.drawerConfig) return 0;
    return section.drawerConfig.zones.reduce(
      (sum, zone) => sum + zone.boxes.length,
      0
    );
  },

  /**
   * Get external front count (visible drawer fronts)
   */
  getDrawerFrontCount: (section: CabinetSection): number => {
    if (!section.drawerConfig) return 0;
    return section.drawerConfig.zones.filter((z) => z.front !== null).length;
  },

  /**
   * Get human-readable summary
   */
  getSummary: (section: CabinetSection): string => {
    switch (section.contentType) {
      case 'EMPTY':
        return 'Pusta';
      case 'SHELVES':
        const shelfCount = section.shelvesConfig?.count ?? 0;
        return shelfCount === 1 ? '1 półka' : `${shelfCount} półek`;
      case 'DRAWERS':
        const zoneCount = section.drawerConfig?.zones.length ?? 0;
        const frontCount = Section.getDrawerFrontCount(section);
        if (frontCount === 0) {
          return `${zoneCount} szuflad wewn.`;
        } else if (frontCount === zoneCount) {
          return `${zoneCount} szuflad`;
        } else {
          return `${frontCount}/${zoneCount} szuflad`;
        }
      default:
        return 'Nieznany';
    }
  },

  /**
   * Get content type label in Polish
   */
  getContentTypeLabel: (contentType: SectionContentType): string => {
    switch (contentType) {
      case 'EMPTY':
        return 'Pusta';
      case 'SHELVES':
        return 'Półki';
      case 'DRAWERS':
        return 'Szuflady';
      default:
        return 'Nieznany';
    }
  },
} as const;
