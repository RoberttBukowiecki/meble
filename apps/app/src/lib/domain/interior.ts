/**
 * Interior Domain Module
 *
 * High-level module for cabinet interior configuration.
 * Coordinates sections, shelves, and drawers.
 */

import type {
  CabinetInteriorConfig,
  CabinetSection,
  SectionContentType,
  ShelfDepthPreset,
} from '@/types';
import { INTERIOR_CONFIG } from '@/lib/config';
import type { ValidationResult, Bounds } from './types';
import { validResult, invalidResult, mergeValidations } from './types';
import {
  moveArrayItem,
  removeArrayItemById,
  updateArrayItemById,
  findIndexById,
} from './utils';
import { Section, SectionBounds } from './section';

// ============================================================================
// Types
// ============================================================================

export interface InteriorBoundsInfo {
  sections: SectionBounds[];
  totalInteriorHeight: number;
}

export interface InteriorSummary {
  sectionCount: number;
  totalShelves: number;
  totalDrawerZones: number;
  totalDrawerBoxes: number;
  hasContent: boolean;
}

// ============================================================================
// Interior Domain Module
// ============================================================================

export const Interior = {
  // ==========================================================================
  // CREATORS - Functions that create new interior configurations
  // ==========================================================================

  /**
   * Create an empty interior configuration
   */
  create: (): CabinetInteriorConfig => ({
    sections: [],
  }),

  /**
   * Create interior with one empty section
   */
  createWithEmptySection: (): CabinetInteriorConfig => ({
    sections: [Section.createEmpty()],
  }),

  /**
   * Create interior with shelves
   */
  createWithShelves: (
    shelfCount: number = 2,
    depthPreset: ShelfDepthPreset = 'FULL'
  ): CabinetInteriorConfig => ({
    sections: [Section.createWithShelves(shelfCount, depthPreset)],
  }),

  /**
   * Create interior with drawers
   */
  createWithDrawers: (
    zoneCount: number = 3,
    hasExternalFronts: boolean = true
  ): CabinetInteriorConfig => ({
    sections: [Section.createWithDrawers(zoneCount, hasExternalFronts)],
  }),

  /**
   * Create a mixed interior (shelves on top, drawers on bottom)
   */
  createMixed: (
    shelfCount: number = 2,
    drawerZoneCount: number = 2
  ): CabinetInteriorConfig => ({
    sections: [
      // Bottom section: drawers
      { ...Section.createWithDrawers(drawerZoneCount), heightRatio: 1 },
      // Top section: shelves
      { ...Section.createWithShelves(shelfCount), heightRatio: 1 },
    ],
  }),

  /**
   * Create from a preset type
   */
  createFromPreset: (
    preset: 'empty' | 'shelves' | 'drawers' | 'mixed'
  ): CabinetInteriorConfig => {
    switch (preset) {
      case 'empty':
        return Interior.createWithEmptySection();
      case 'shelves':
        return Interior.createWithShelves();
      case 'drawers':
        return Interior.createWithDrawers();
      case 'mixed':
        return Interior.createMixed();
      default:
        return Interior.create();
    }
  },

  /**
   * Clone an interior configuration
   */
  clone: (config: CabinetInteriorConfig): CabinetInteriorConfig => ({
    sections: config.sections.map((section) => Section.clone(section)),
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies
  // ==========================================================================

  /**
   * Add a section
   */
  addSection: (
    config: CabinetInteriorConfig,
    section?: CabinetSection
  ): CabinetInteriorConfig => {
    if (config.sections.length >= INTERIOR_CONFIG.MAX_SECTIONS) {
      return config;
    }

    return {
      ...config,
      sections: [...config.sections, section ?? Section.createEmpty()],
    };
  },

  /**
   * Add a section at a specific index
   */
  insertSection: (
    config: CabinetInteriorConfig,
    index: number,
    section?: CabinetSection
  ): CabinetInteriorConfig => {
    if (config.sections.length >= INTERIOR_CONFIG.MAX_SECTIONS) {
      return config;
    }

    const newSection = section ?? Section.createEmpty();
    const newSections = [...config.sections];
    newSections.splice(index, 0, newSection);

    return { ...config, sections: newSections };
  },

  /**
   * Remove a section by ID
   */
  removeSection: (
    config: CabinetInteriorConfig,
    sectionId: string
  ): CabinetInteriorConfig => ({
    ...config,
    sections: removeArrayItemById(config.sections, sectionId),
  }),

  /**
   * Update a section by ID
   */
  updateSection: (
    config: CabinetInteriorConfig,
    sectionId: string,
    patch: Partial<Omit<CabinetSection, 'id'>>
  ): CabinetInteriorConfig => ({
    ...config,
    sections: config.sections.map((section) =>
      section.id === sectionId ? { ...section, ...patch } : section
    ),
  }),

  /**
   * Replace a section entirely
   */
  replaceSection: (
    config: CabinetInteriorConfig,
    sectionId: string,
    newSection: CabinetSection
  ): CabinetInteriorConfig => ({
    ...config,
    sections: config.sections.map((s) =>
      s.id === sectionId ? { ...newSection, id: sectionId } : s
    ),
  }),

  /**
   * Move a section up or down
   */
  moveSection: (
    config: CabinetInteriorConfig,
    sectionId: string,
    direction: 'up' | 'down'
  ): CabinetInteriorConfig => {
    const index = findIndexById(config.sections, sectionId);
    if (index === -1) return config;

    // 'up' means higher in the cabinet (higher index), 'down' means lower (lower index)
    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= config.sections.length) return config;

    return {
      ...config,
      sections: moveArrayItem(config.sections, index, newIndex),
    };
  },

  /**
   * Reorder sections by indices
   */
  reorderSections: (
    config: CabinetInteriorConfig,
    fromIndex: number,
    toIndex: number
  ): CabinetInteriorConfig => ({
    ...config,
    sections: moveArrayItem(config.sections, fromIndex, toIndex),
  }),

  /**
   * Set section content type
   */
  setSectionContentType: (
    config: CabinetInteriorConfig,
    sectionId: string,
    contentType: SectionContentType
  ): CabinetInteriorConfig => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return config;

    const updatedSection = Section.updateContentType(section, contentType);
    return Interior.replaceSection(config, sectionId, updatedSection);
  },

  /**
   * Set section height ratio
   */
  setSectionHeightRatio: (
    config: CabinetInteriorConfig,
    sectionId: string,
    ratio: number
  ): CabinetInteriorConfig => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return config;

    const updatedSection = Section.updateHeightRatio(section, ratio);
    return Interior.replaceSection(config, sectionId, updatedSection);
  },

  /**
   * Clear all sections
   */
  clear: (config: CabinetInteriorConfig): CabinetInteriorConfig => ({
    ...config,
    sections: [],
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate bounds for all sections
   */
  calculateBounds: (
    config: CabinetInteriorConfig,
    cabinetHeight: number,
    bodyThickness: number
  ): InteriorBoundsInfo => {
    const sections = Section.calculateBounds(
      config.sections,
      cabinetHeight,
      bodyThickness
    );

    return {
      sections,
      totalInteriorHeight: Section.calculateInteriorHeight(cabinetHeight, bodyThickness),
    };
  },

  /**
   * Calculate interior height
   */
  calculateInteriorHeight: (
    cabinetHeight: number,
    bodyThickness: number
  ): number => Section.calculateInteriorHeight(cabinetHeight, bodyThickness),

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate interior configuration
   */
  validate: (config: CabinetInteriorConfig): ValidationResult => {
    if (config.sections.length > INTERIOR_CONFIG.MAX_SECTIONS) {
      return invalidResult(
        `Cannot have more than ${INTERIOR_CONFIG.MAX_SECTIONS} sections`
      );
    }

    // Validate all sections
    return Section.validateAll(config.sections);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if interior has any content
   */
  hasContent: (config: CabinetInteriorConfig): boolean => {
    if (config.sections.length === 0) return false;
    return config.sections.some((s) => Section.hasContent(s));
  },

  /**
   * Check if interior is empty (no sections or all empty)
   */
  isEmpty: (config: CabinetInteriorConfig): boolean => !Interior.hasContent(config),

  /**
   * Get section by ID
   */
  getSectionById: (
    config: CabinetInteriorConfig,
    sectionId: string
  ): CabinetSection | undefined =>
    config.sections.find((s) => s.id === sectionId),

  /**
   * Get section index by ID
   */
  getSectionIndex: (config: CabinetInteriorConfig, sectionId: string): number =>
    findIndexById(config.sections, sectionId),

  /**
   * Get section count
   */
  getSectionCount: (config: CabinetInteriorConfig): number =>
    config.sections.length,

  /**
   * Get total shelf count across all sections
   */
  getTotalShelfCount: (config: CabinetInteriorConfig): number =>
    config.sections.reduce((sum, s) => sum + Section.getShelfCount(s), 0),

  /**
   * Get total drawer zone count across all sections
   */
  getTotalDrawerZoneCount: (config: CabinetInteriorConfig): number =>
    config.sections.reduce((sum, s) => sum + Section.getDrawerZoneCount(s), 0),

  /**
   * Get total drawer box count across all sections
   */
  getTotalDrawerBoxCount: (config: CabinetInteriorConfig): number =>
    config.sections.reduce((sum, s) => sum + Section.getDrawerBoxCount(s), 0),

  /**
   * Get total drawer front count across all sections
   */
  getTotalDrawerFrontCount: (config: CabinetInteriorConfig): number =>
    config.sections.reduce((sum, s) => sum + Section.getDrawerFrontCount(s), 0),

  /**
   * Get comprehensive summary
   */
  getSummary: (config: CabinetInteriorConfig): InteriorSummary => ({
    sectionCount: config.sections.length,
    totalShelves: Interior.getTotalShelfCount(config),
    totalDrawerZones: Interior.getTotalDrawerZoneCount(config),
    totalDrawerBoxes: Interior.getTotalDrawerBoxCount(config),
    hasContent: Interior.hasContent(config),
  }),

  /**
   * Get human-readable summary text
   */
  getSummaryText: (config: CabinetInteriorConfig): string => {
    if (config.sections.length === 0) return 'Brak konfiguracji';

    const parts: string[] = [];
    const summary = Interior.getSummary(config);

    if (summary.totalShelves > 0) {
      parts.push(`${summary.totalShelves} półek`);
    }

    if (summary.totalDrawerZones > 0) {
      parts.push(`${summary.totalDrawerZones} stref szuflad`);
    }

    if (parts.length === 0) {
      return `${summary.sectionCount} pustych sekcji`;
    }

    return `${parts.join(', ')} (${summary.sectionCount} sekcji)`;
  },

  /**
   * Check if interior has shelves
   */
  hasShelves: (config: CabinetInteriorConfig): boolean =>
    Interior.getTotalShelfCount(config) > 0,

  /**
   * Check if interior has drawers
   */
  hasDrawers: (config: CabinetInteriorConfig): boolean =>
    Interior.getTotalDrawerZoneCount(config) > 0,

  /**
   * Check if can add more sections
   */
  canAddSection: (config: CabinetInteriorConfig): boolean =>
    config.sections.length < INTERIOR_CONFIG.MAX_SECTIONS,

  /**
   * Check if section can be moved up
   */
  canMoveSectionUp: (config: CabinetInteriorConfig, sectionId: string): boolean => {
    const index = findIndexById(config.sections, sectionId);
    return index !== -1 && index < config.sections.length - 1;
  },

  /**
   * Check if section can be moved down
   */
  canMoveSectionDown: (config: CabinetInteriorConfig, sectionId: string): boolean => {
    const index = findIndexById(config.sections, sectionId);
    return index > 0;
  },

  /**
   * Check if section can be removed
   */
  canRemoveSection: (config: CabinetInteriorConfig): boolean =>
    config.sections.length > 0,
} as const;
