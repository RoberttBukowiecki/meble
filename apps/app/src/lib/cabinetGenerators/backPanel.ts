/**
 * Back panel generation for cabinets
 */

import { GeneratedPart, BackPanelConfig } from './types';
import { MIN_BACK_OVERLAP } from './constants';
import { BACK_PANEL_CONFIG } from '../config';

/**
 * Generate back panel for cabinet
 * The back panel is mounted OUTSIDE (behind) the cabinet body.
 * It overlaps onto the rear edges of the body panels for mounting.
 *
 * Overlap calculation:
 * - overlapDepth = how much the back panel overlaps onto body panel edges
 * - For 18mm body with 2/3 ratio: overlapDepth = 12mm
 * - This means the back covers 12mm of each body panel's rear edge
 */
export function generateBackPanel(config: BackPanelConfig): GeneratedPart {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialThickness,
    backMaterialId,
    backMaterialThickness,
    overlapRatio,
    topBottomPlacement,
  } = config;

  // Calculate overlap depth (how much back panel overlaps onto body panel edges)
  const overlapDepth = Math.max(
    bodyMaterialThickness * overlapRatio,
    MIN_BACK_OVERLAP
  );

  // Calculate back panel dimensions
  // The back should cover from the outer edge of the cabinet, minus a small inset
  // so it sits ON TOP of the body panels' rear edges
  const edgeInset = bodyMaterialThickness - overlapDepth;

  // Calculate back panel dimensions based on topBottomPlacement
  let backWidth: number;
  let backHeight: number;

  if (topBottomPlacement === 'inset') {
    // Top/bottom are between sides
    // Back width covers: full width minus inset on each side
    // Back height covers: full height minus inset on top and bottom
    backWidth = cabinetWidth - 2 * edgeInset;
    backHeight = cabinetHeight - 2 * edgeInset;
  } else {
    // Top/bottom overlay sides (sit on top of sides)
    // Back covers the same area
    backWidth = cabinetWidth - 2 * edgeInset;
    backHeight = cabinetHeight - 2 * edgeInset;
  }

  // Ensure minimum dimensions
  backWidth = Math.max(backWidth, BACK_PANEL_CONFIG.MIN_WIDTH);
  backHeight = Math.max(backHeight, BACK_PANEL_CONFIG.MIN_HEIGHT);

  // Calculate Z position
  // Back panel is mounted OUTSIDE/BEHIND the cabinet body
  // Z = 0 is cabinet center, negative Z is toward the back
  // Cabinet body's rear edge is at: -cabinetDepth/2
  // Back panel's FRONT face should be at the cabinet's rear edge
  // So back panel CENTER is at: -cabinetDepth/2 - backMaterialThickness/2
  const backZPosition = -cabinetDepth / 2 - backMaterialThickness / 2;

  // Y position: center of cabinet height
  const backYPosition = cabinetHeight / 2;

  return {
    name: 'Plecy',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: {
      type: 'RECT',
      x: backWidth,
      y: backHeight,
    },
    width: backWidth,
    height: backHeight,
    depth: backMaterialThickness,
    position: [0, backYPosition, backZPosition],
    rotation: [0, 0, 0], // Facing backward, parallel to XY plane
    materialId: backMaterialId,
    edgeBanding: {
      type: 'RECT',
      top: false,
      bottom: false,
      left: false,
      right: false,
    },
    cabinetMetadata: {
      cabinetId,
      role: 'BACK',
    },
  };
}
