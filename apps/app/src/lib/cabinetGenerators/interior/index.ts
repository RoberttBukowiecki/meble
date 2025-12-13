/**
 * Cabinet Interior Generator
 * Generates shelves and drawers based on unified interior configuration
 */

import { CabinetInteriorConfig } from '@/types';
import { GeneratedPart } from '../types';
import { generateDrawers } from '../drawers';
import { DEFAULT_SHELF_EDGE_BANDING } from '@/lib/config';
import { Section, Interior, Shelf } from '@/lib/domain';
import type { SectionBounds } from '@/lib/domain/section';

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

  // Calculate section boundaries using domain module
  const sectionBounds = Section.calculateBounds(
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
// Shelf Generation
// ============================================================================

/**
 * Generate shelves for a section using domain module
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

  // Calculate shelf positions using domain module
  const shelfPositions = Shelf.calculatePositions(shelvesConfig, bounds.startY, bounds.height);

  for (let i = 0; i < shelvesConfig.count; i++) {
    const shelfY = shelfPositions[i];
    const shelfIndex = i;

    // Get depth using domain module
    const individualShelf = shelvesConfig.mode === 'MANUAL' ? shelvesConfig.shelves[i] : undefined;
    const shelfDepth = Shelf.calculateEffectiveDepth(individualShelf, shelvesConfig, cabinetDepth);

    // Z offset for recessed shelves using domain module
    const shelfZ = -Shelf.calculateZOffset(shelfDepth, cabinetDepth);

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
// Helpers (delegating to domain module)
// ============================================================================

/**
 * Check if interior config has any content
 */
export function hasInteriorContent(config: CabinetInteriorConfig | undefined): boolean {
  if (!config) return false;
  return Interior.hasContent(config);
}

/**
 * Get summary text for interior config
 */
export function getInteriorSummary(config: CabinetInteriorConfig | undefined): string {
  if (!config) return 'Brak konfiguracji';
  return Interior.getSummaryText(config);
}
