/**
 * Side front panel generation for cabinets
 * Decorative end panels that attach to the sides of cabinets
 */

import { SideFrontsConfig } from '@/types';
import { GeneratedPart, SideFrontGenerationConfig } from './types';

/**
 * Generate side front panels for cabinet
 *
 * Side fronts are decorative panels attached to the outer sides of cabinets.
 * They provide a finished look when cabinets are placed at the end of a row.
 *
 * Positioning:
 * - Left side front: positioned outside the left side panel
 * - Right side front: positioned outside the right side panel
 * - Panels extend forward by forwardProtrusion amount
 * - Vertical offsets allow the panel to start higher / end lower than cabinet
 */
export function generateSideFronts(config: SideFrontGenerationConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialThickness,
    frontMaterialThickness,
    sideFrontsConfig,
    defaultFrontMaterialId,
    materialsMap,
    legOffset = 0,
  } = config;

  const parts: GeneratedPart[] = [];

  // Helper to get material thickness
  const getMaterialThickness = (materialId: string | undefined): number => {
    if (!materialId) return frontMaterialThickness;
    const material = materialsMap?.get(materialId);
    return material?.thickness ?? frontMaterialThickness;
  };

  // Generate left side front if configured
  if (sideFrontsConfig.left?.enabled) {
    const leftConfig = sideFrontsConfig.left;
    const leftPart = generateSingleSideFront({
      cabinetId,
      furnitureId,
      cabinetWidth,
      cabinetHeight,
      cabinetDepth,
      bodyMaterialThickness,
      frontMaterialThickness,
      sideFrontConfig: leftConfig,
      defaultFrontMaterialId,
      sideFrontThickness: getMaterialThickness(leftConfig.materialId),
      side: 'left',
      legOffset,
    });
    parts.push(leftPart);
  }

  // Generate right side front if configured
  if (sideFrontsConfig.right?.enabled) {
    const rightConfig = sideFrontsConfig.right;
    const rightPart = generateSingleSideFront({
      cabinetId,
      furnitureId,
      cabinetWidth,
      cabinetHeight,
      cabinetDepth,
      bodyMaterialThickness,
      frontMaterialThickness,
      sideFrontConfig: rightConfig,
      defaultFrontMaterialId,
      sideFrontThickness: getMaterialThickness(rightConfig.materialId),
      side: 'right',
      legOffset,
    });
    parts.push(rightPart);
  }

  return parts;
}

interface SingleSideFrontParams {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  frontMaterialThickness: number;
  sideFrontConfig: NonNullable<SideFrontsConfig['left']>;
  defaultFrontMaterialId: string;
  sideFrontThickness: number;
  side: 'left' | 'right';
  legOffset: number;
}

/**
 * Generate a single side front panel
 */
function generateSingleSideFront(params: SingleSideFrontParams): GeneratedPart {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialThickness,
    frontMaterialThickness,
    sideFrontConfig,
    defaultFrontMaterialId,
    sideFrontThickness,
    side,
    legOffset,
  } = params;

  // Determine material
  const materialId = sideFrontConfig.materialId ?? defaultFrontMaterialId;

  // Calculate forward protrusion (default to front material thickness if 0)
  const forwardProtrusion =
    sideFrontConfig.forwardProtrusion > 0
      ? sideFrontConfig.forwardProtrusion
      : frontMaterialThickness;

  // Calculate effective height considering offsets
  const effectiveHeight =
    cabinetHeight - sideFrontConfig.bottomOffset - sideFrontConfig.topOffset;

  // Side front dimensions
  // Width: the actual depth of the panel (from back to front of cabinet + protrusion)
  // Height: cabinet height minus offsets
  const sideFrontWidth = cabinetDepth + forwardProtrusion;
  const sideFrontHeight = Math.max(effectiveHeight, 50); // Minimum 50mm height

  // Calculate X position (outside the cabinet body)
  // Cabinet body side panel is at: ±(cabinetWidth/2 - bodyMaterialThickness/2)
  // Outer edge of body side is at: ±(cabinetWidth/2)
  // Side front center should be at: ±(cabinetWidth/2 + sideFrontThickness/2)
  const sideFrontX =
    side === 'left'
      ? -(cabinetWidth / 2 + sideFrontThickness / 2)
      : cabinetWidth / 2 + sideFrontThickness / 2;

  // Calculate Y position (center of the side front, considering offsets and leg offset)
  const sideFrontY = sideFrontConfig.bottomOffset + sideFrontHeight / 2 + legOffset;

  // Calculate Z position
  // The side front extends from the back of the cabinet to forwardProtrusion beyond the front
  // Cabinet back is at: -cabinetDepth/2
  // Cabinet front is at: +cabinetDepth/2
  // Side front should span from -cabinetDepth/2 to +cabinetDepth/2 + forwardProtrusion
  // Center Z = (-cabinetDepth/2 + cabinetDepth/2 + forwardProtrusion) / 2 = forwardProtrusion / 2
  const sideFrontZ = forwardProtrusion / 2;

  const name = side === 'left' ? 'Front boczny lewy' : 'Front boczny prawy';
  const role = side === 'left' ? 'SIDE_FRONT_LEFT' : 'SIDE_FRONT_RIGHT';

  return {
    name,
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: {
      type: 'RECT',
      x: sideFrontWidth,
      y: sideFrontHeight,
    },
    width: sideFrontWidth,
    height: sideFrontHeight,
    depth: sideFrontThickness,
    position: [sideFrontX, sideFrontY, sideFrontZ],
    rotation: [0, Math.PI / 2, 0], // Rotated to face outward from cabinet
    materialId,
    edgeBanding: {
      type: 'RECT',
      top: true,
      bottom: true,
      left: true,
      right: true,
    },
    cabinetMetadata: {
      cabinetId,
      role,
    },
  } as GeneratedPart;
}

/**
 * Check if side fronts are configured and enabled
 */
export function hasSideFronts(config: SideFrontsConfig | undefined): boolean {
  if (!config) return false;
  return !!(config.left?.enabled || config.right?.enabled);
}

/**
 * Get summary text for side fronts configuration (for UI display)
 */
export function getSideFrontsSummary(config: SideFrontsConfig | undefined): string {
  if (!config) return 'Brak';

  const parts: string[] = [];
  if (config.left?.enabled) parts.push('Lewa');
  if (config.right?.enabled) parts.push('Prawa');

  return parts.length > 0 ? parts.join(', ') : 'Brak';
}
