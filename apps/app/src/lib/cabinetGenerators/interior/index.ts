/**
 * Cabinet Interior Generator
 * Generates shelves and drawers based on unified interior configuration
 */

import {
  CabinetInteriorConfig,
  CabinetSection,
  ShelvesConfiguration,
  ShelfConfig,
  DrawerConfiguration,
  ShelfDepthPreset,
} from '@/types';
import { GeneratedPart } from '../types';
import { generateDrawers } from '../drawers';
import { DRAWER_SLIDE_PRESETS, DEFAULT_SHELF_EDGE_BANDING } from '@/lib/config';

// ============================================================================
// Types
// ============================================================================

export interface InteriorGeneratorConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialId: string;
  frontMaterialId: string;
  bodyThickness: number;
  frontThickness: number;
  interiorConfig: CabinetInteriorConfig;
}

interface SectionBounds {
  section: CabinetSection;
  startY: number;  // From bottom of cabinet interior
  height: number;  // Section height in mm
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate cabinet interior parts based on unified configuration
 */
export function generateInterior(config: InteriorGeneratorConfig): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { interiorConfig, cabinetHeight, bodyThickness } = config;

  if (!interiorConfig || interiorConfig.sections.length === 0) {
    return parts;
  }

  // Calculate section boundaries
  const sectionBounds = calculateSectionBounds(
    interiorConfig.sections,
    cabinetHeight,
    bodyThickness
  );

  // Generate parts for each section
  for (const bounds of sectionBounds) {
    switch (bounds.section.contentType) {
      case 'SHELVES':
        if (bounds.section.shelvesConfig) {
          parts.push(...generateSectionShelves(config, bounds));
        }
        break;
      case 'DRAWERS':
        if (bounds.section.drawerConfig) {
          parts.push(...generateSectionDrawers(config, bounds));
        }
        break;
      case 'EMPTY':
        // No parts to generate
        break;
    }
  }

  return parts;
}

// ============================================================================
// Section Boundary Calculation
// ============================================================================

/**
 * Calculate the Y position and height of each section
 */
function calculateSectionBounds(
  sections: CabinetSection[],
  cabinetHeight: number,
  bodyThickness: number
): SectionBounds[] {
  const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
  const totalRatio = sections.reduce((sum, s) => sum + s.heightRatio, 0);

  const bounds: SectionBounds[] = [];
  let currentY = bodyThickness; // Start from bottom panel

  for (const section of sections) {
    const sectionHeight = (section.heightRatio / totalRatio) * interiorHeight;
    bounds.push({
      section,
      startY: currentY,
      height: sectionHeight,
    });
    currentY += sectionHeight;
  }

  return bounds;
}

// ============================================================================
// Shelf Generation
// ============================================================================

/**
 * Generate shelves for a section
 */
function generateSectionShelves(
  config: InteriorGeneratorConfig,
  bounds: SectionBounds
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { shelvesConfig } = bounds.section;
  if (!shelvesConfig || shelvesConfig.count === 0) return parts;

  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetDepth,
    bodyMaterialId,
    bodyThickness,
  } = config;

  const shelfWidth = cabinetWidth - bodyThickness * 2;

  // Calculate shelf positions
  // First shelf is always near the bottom of the section, others distributed above
  const count = shelvesConfig.count;
  const bottomOffset = 0.05; // 5% offset from very bottom

  for (let i = 0; i < count; i++) {
    // Position shelves: first near bottom, rest distributed evenly above
    // For single shelf: middle of section
    // For multiple: first at ~5%, distributed up to 100%
    const positionRatio = count === 1
      ? 0.5 // Single shelf in the middle
      : (i / count) * (1 - bottomOffset) + bottomOffset;
    const shelfY = bounds.startY + positionRatio * bounds.height;
    const shelfIndex = i;

    // Get depth for this specific shelf
    // In MANUAL mode, use individual shelf config; otherwise use global preset
    const individualShelf = shelvesConfig.mode === 'MANUAL' ? shelvesConfig.shelves[i] : undefined;
    const shelfDepth = individualShelf
      ? calculateIndividualShelfDepth(individualShelf, shelvesConfig, cabinetDepth)
      : calculateShelfDepth(shelvesConfig, cabinetDepth);

    // Z offset for recessed shelves (half depth, etc.)
    const depthOffset = (cabinetDepth - shelfDepth) / 2;
    const shelfZ = -depthOffset;

    // Use custom material: individual shelf > global shelves config > body material
    const shelfMaterialId = individualShelf?.materialId
      ?? shelvesConfig.materialId
      ?? bodyMaterialId;

    parts.push({
      name: `Półka ${shelfIndex + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: shelfDepth },
      width: shelfWidth,
      height: shelfDepth,
      depth: bodyThickness,
      position: [0, shelfY, shelfZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: shelfMaterialId,
      edgeBanding: DEFAULT_SHELF_EDGE_BANDING,
      cabinetMetadata: {
        cabinetId,
        role: 'SHELF',
        index: shelfIndex,
      },
    });
  }

  return parts;
}

/**
 * Calculate shelf depth based on preset
 */
function calculateShelfDepth(
  shelvesConfig: ShelvesConfiguration,
  cabinetDepth: number
): number {
  const baseDepth = cabinetDepth - 10; // Standard 10mm setback from front

  switch (shelvesConfig.depthPreset) {
    case 'FULL':
      return baseDepth;
    case 'HALF':
      return Math.round(baseDepth / 2);
    case 'CUSTOM':
      return shelvesConfig.customDepth ?? Math.round(baseDepth / 2);
    default:
      return baseDepth;
  }
}

/**
 * Calculate individual shelf depth based on its config (for MANUAL mode)
 */
function calculateIndividualShelfDepth(
  shelfConfig: ShelfConfig,
  shelvesConfig: ShelvesConfiguration,
  cabinetDepth: number
): number {
  const baseDepth = cabinetDepth - 10; // Standard 10mm setback from front

  switch (shelfConfig.depthPreset) {
    case 'FULL':
      return baseDepth;
    case 'HALF':
      return Math.round(baseDepth / 2);
    case 'CUSTOM':
      // Use individual customDepth, fallback to global, then default
      return shelfConfig.customDepth ?? shelvesConfig.customDepth ?? Math.round(baseDepth / 2);
    default:
      return baseDepth;
  }
}

// ============================================================================
// Drawer Generation
// ============================================================================

/**
 * Generate drawers for a section
 */
function generateSectionDrawers(
  config: InteriorGeneratorConfig,
  bounds: SectionBounds
): GeneratedPart[] {
  const { drawerConfig } = bounds.section;
  if (!drawerConfig || drawerConfig.zones.length === 0) return [];

  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetDepth,
    bodyMaterialId,
    frontMaterialId,
    bodyThickness,
    frontThickness,
  } = config;

  // Use custom materials from drawer config if specified, otherwise fallback to cabinet defaults
  const boxMaterialId = drawerConfig.boxMaterialId ?? bodyMaterialId;
  const bottomMaterialId = drawerConfig.bottomMaterialId;

  // Adjust drawer generation to work within section bounds
  // We'll use the existing drawer generator but calculate positions based on section
  return generateDrawers({
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight: bounds.height + bodyThickness * 2, // Simulate cabinet height for this section
    cabinetDepth,
    bodyMaterialId: boxMaterialId,
    frontMaterialId,
    bottomMaterialId,
    bodyThickness,
    frontThickness,
    drawerConfig,
  }).map((part) => ({
    ...part,
    // Offset Y positions to account for section start
    position: [
      part.position[0],
      part.position[1] + bounds.startY - bodyThickness, // Adjust for section offset
      part.position[2],
    ] as [number, number, number],
  }));
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if interior config has any content
 */
export function hasInteriorContent(config: CabinetInteriorConfig | undefined): boolean {
  if (!config || config.sections.length === 0) return false;
  return config.sections.some((s) => s.contentType !== 'EMPTY');
}

/**
 * Get summary text for interior config
 */
export function getInteriorSummary(config: CabinetInteriorConfig | undefined): string {
  if (!config || config.sections.length === 0) return 'Brak konfiguracji';

  const parts: string[] = [];

  let totalShelves = 0;
  let totalDrawerZones = 0;

  for (const section of config.sections) {
    if (section.contentType === 'SHELVES' && section.shelvesConfig) {
      totalShelves += section.shelvesConfig.count;
    } else if (section.contentType === 'DRAWERS' && section.drawerConfig) {
      totalDrawerZones += section.drawerConfig.zones.length;
    }
  }

  if (totalShelves > 0) {
    parts.push(`${totalShelves} półek`);
  }

  if (totalDrawerZones > 0) {
    parts.push(`${totalDrawerZones} stref szuflad`);
  }

  if (parts.length === 0) {
    return `${config.sections.length} pustych sekcji`;
  }

  return parts.join(', ') + ` (${config.sections.length} sekcji)`;
}
