/**
 * Zone-based drawer generation
 * Supports drawer-in-drawer and mixed internal/external drawers
 */

import { DrawerSlideConfig, DrawerConfiguration } from '@/types';
import { GeneratedPart } from '../types';
import { FRONT_MARGIN, DOOR_GAP } from '../constants';
import {
  DRAWER_SLIDE_PRESETS,
  DRAWER_CONFIG,
  DEFAULT_SHELF_EDGE_BANDING,
  DEFAULT_DRAWER_BOX_EDGE_BANDING,
  DEFAULT_DRAWER_FRONT_EDGE_BANDING,
} from '../../config';
import { generateHandleMetadata } from '../../handlePresets';
import { calculateDrawerBoxDimensions } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface DrawerGeneratorConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialId: string;
  frontMaterialId: string;
  bottomMaterialId?: string;
  bodyThickness: number;
  frontThickness: number;
  drawerConfig: DrawerConfiguration;
}

interface DrawerBoxParams {
  cabinetId: string;
  furnitureId: string;
  boxIndex: number;
  zoneIndex: number;
  boxYOffset: number;
  boxSpaceHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
  bodyMaterialId: string;
  bottomMaterialId?: string;
  slideConfig: DrawerSlideConfig;
  isClosedBox: boolean;
  bodyThickness: number;
  bottomThickness: number;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate drawer parts from zone-based configuration
 */
export function generateDrawers(config: DrawerGeneratorConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialId,
    frontMaterialId,
    bottomMaterialId,
    bodyThickness,
    frontThickness,
    drawerConfig,
  } = config;

  const { zones, slideType } = drawerConfig;
  if (zones.length === 0) return [];

  const parts: GeneratedPart[] = [];
  const slideConfig = DRAWER_SLIDE_PRESETS[slideType];

  // Calculate total height ratio
  const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);
  const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
  const totalFrontHeight = cabinetHeight - FRONT_MARGIN * 2;
  const frontWidth = cabinetWidth - FRONT_MARGIN * 2;

  // Track positions
  let currentBoxY = bodyThickness;
  let currentFrontY = FRONT_MARGIN;
  let globalBoxIndex = 0;

  // Process each zone
  for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex++) {
    const zone = zones[zoneIndex];
    const hasExternalFront = zone.front !== null;
    const boxCount = zone.boxes.length;

    // Calculate zone heights
    const zoneInteriorHeight = (zone.heightRatio / totalRatio) * interiorHeight;
    const zoneFrontHeight = (zone.heightRatio / totalRatio) * totalFrontHeight;

    // Calculate gap for fronts between zones
    const frontGap = zoneIndex < zones.length - 1 ? DOOR_GAP : 0;
    const actualFrontHeight = zoneFrontHeight - frontGap;

    // Generate external front for this zone (if has one)
    if (hasExternalFront && actualFrontHeight > 0) {
      const frontPart = generateDrawerFront({
        cabinetId,
        furnitureId,
        zoneIndex,
        frontWidth,
        frontHeight: actualFrontHeight,
        frontYCenter: currentFrontY + actualFrontHeight / 2,
        cabinetDepth,
        frontThickness,
        frontMaterialId,
        handleConfig: zone.front?.handleConfig ?? drawerConfig.defaultHandleConfig,
      });
      parts.push(frontPart);
    }

    // Generate boxes within this zone
    // boxToFrontRatio controls how much of the zone interior height is used by boxes
    // (the rest is empty space above the boxes, while front still covers full zone)
    const boxToFrontRatio = zone.boxToFrontRatio ?? 1.0;
    const effectiveBoxHeight = zoneInteriorHeight * boxToFrontRatio;
    const totalBoxRatio = zone.boxes.reduce((sum, b) => sum + b.heightRatio, 0);

    for (let boxIndex = 0; boxIndex < boxCount; boxIndex++) {
      const box = zone.boxes[boxIndex];
      const boxHeight = (box.heightRatio / totalBoxRatio) * effectiveBoxHeight;

      // Determine if box should be closed (have front panel)
      // - Zone with external front: only first box (behind decorative front) is open
      // - Zone without external front: all boxes are closed
      const isClosedBox = hasExternalFront ? boxIndex > 0 : true;

      const boxParts = generateDrawerBox({
        cabinetId,
        furnitureId,
        boxIndex: globalBoxIndex,
        zoneIndex,
        boxYOffset: currentBoxY,
        boxSpaceHeight: boxHeight,
        cabinetWidth,
        cabinetDepth,
        bodyMaterialId,
        bottomMaterialId,
        slideConfig,
        isClosedBox,
        bodyThickness,
        bottomThickness: DRAWER_CONFIG.BOTTOM_THICKNESS,
      });

      parts.push(...boxParts);
      currentBoxY += boxHeight;
      globalBoxIndex++;
    }

    // Generate shelves above drawer boxes (if configured and boxToFrontRatio < 1.0)
    const shelves = zone.aboveBoxContent?.shelves ?? [];

    if (shelves.length > 0 && boxToFrontRatio < 1.0) {
      const shelfSpaceHeight = zoneInteriorHeight - effectiveBoxHeight;
      const shelfCount = shelves.length;
      const shelfWidth = cabinetWidth - bodyThickness * 2;
      const baseDepth = cabinetDepth - 10;

      shelves.forEach((shelf, shelfIdx) => {
        // First shelf directly above box, others evenly distributed
        // For n shelves: first at 0%, rest at idx/n of remaining space
        const shelfYOffset = shelfIdx === 0
          ? 0
          : (shelfIdx / shelfCount) * shelfSpaceHeight;
        const shelfY = currentBoxY + shelfYOffset;

        // Calculate shelf depth based on preset
        let shelfDepth: number;
        switch (shelf.depthPreset) {
          case 'FULL':
            shelfDepth = baseDepth;
            break;
          case 'HALF':
            shelfDepth = Math.round(baseDepth / 2);
            break;
          case 'CUSTOM':
            shelfDepth = shelf.customDepth ?? Math.round(baseDepth / 2);
            break;
          default:
            shelfDepth = baseDepth;
        }

        // Z offset for recessed shelves
        const depthOffset = (cabinetDepth - shelfDepth) / 2;
        const shelfZ = -depthOffset;

        parts.push({
          name: `Półka ${shelfIdx + 1} nad szufladą ${zoneIndex + 1}`,
          furnitureId,
          group: cabinetId,
          shapeType: 'RECT',
          shapeParams: { type: 'RECT', x: shelfWidth, y: shelfDepth },
          width: shelfWidth,
          height: shelfDepth,
          depth: bodyThickness,
          position: [0, shelfY, shelfZ],
          rotation: [-Math.PI / 2, 0, 0],
          materialId: bodyMaterialId,
          edgeBanding: DEFAULT_SHELF_EDGE_BANDING,
          cabinetMetadata: {
            cabinetId,
            role: 'SHELF',
            index: shelfIdx,
          },
        });
      });
    }

    // Skip the remaining empty space above boxes (when boxToFrontRatio < 1.0)
    currentBoxY += zoneInteriorHeight - effectiveBoxHeight;
    currentFrontY += zoneFrontHeight;
  }

  return parts;
}

// ============================================================================
// Part Generators
// ============================================================================

interface DrawerFrontParams {
  cabinetId: string;
  furnitureId: string;
  zoneIndex: number;
  frontWidth: number;
  frontHeight: number;
  frontYCenter: number;
  cabinetDepth: number;
  frontThickness: number;
  frontMaterialId: string;
  handleConfig?: import('@/types').HandleConfig;
}

/**
 * Generate decorative drawer front
 */
function generateDrawerFront(params: DrawerFrontParams): GeneratedPart {
  const frontCenterZ = params.cabinetDepth / 2 + params.frontThickness / 2;

  const handleMetadata = params.handleConfig
    ? generateHandleMetadata(
        params.handleConfig,
        params.frontWidth,
        params.frontHeight,
        'SINGLE',
        undefined
      )
    : undefined;

  return {
    name: `Front szuflady ${params.zoneIndex + 1}`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: params.frontWidth, y: params.frontHeight },
    width: params.frontWidth,
    height: params.frontHeight,
    depth: params.frontThickness,
    position: [0, params.frontYCenter, frontCenterZ],
    rotation: [0, 0, 0],
    materialId: params.frontMaterialId,
    edgeBanding: DEFAULT_DRAWER_FRONT_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_FRONT',
      index: params.zoneIndex,
      drawerIndex: params.zoneIndex,
      handleMetadata,
    },
  };
}

/**
 * Generate drawer box (bottom, sides, back, optional front)
 */
function generateDrawerBox(params: DrawerBoxParams): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  const dims = calculateDrawerBoxDimensions(
    params.cabinetWidth,
    params.cabinetDepth,
    params.boxSpaceHeight,
    params.bodyThickness,
    params.slideConfig,
    params.bottomThickness
  );

  // Calculate box positions
  const boxCenterX = 0;
  const boxBottomY = params.boxYOffset + (params.boxSpaceHeight - dims.boxSideHeight) / 2;
  const boxCenterY = boxBottomY + dims.boxSideHeight / 2;
  // Position drawer so its front is flush with cabinet front
  const boxCenterZ = params.cabinetDepth / 2 - dims.boxDepth / 2;

  const innerWidth = dims.boxWidth - 2 * params.bodyThickness;
  const displayIndex = params.boxIndex + 1;

  // 1. Bottom
  // For closed boxes (with front panel): bottom sits between back and front panels
  // For open boxes (with decorative front): bottom extends to the front edge like sides
  const bottomDepth = params.isClosedBox
    ? dims.boxDepth - 2 * params.bodyThickness  // between back and front panels
    : dims.boxDepth - params.bodyThickness;      // only back panel
  const bottomCenterZ = params.isClosedBox
    ? boxCenterZ                                 // centered between panels
    : boxCenterZ + params.bodyThickness / 2;     // shifted forward to align with sides front

  parts.push({
    name: `Szuflada ${displayIndex} - dno`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: innerWidth, y: bottomDepth },
    width: innerWidth,
    height: bottomDepth,
    depth: dims.bottomThickness,
    position: [boxCenterX, boxBottomY + dims.bottomThickness / 2, bottomCenterZ],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: params.bottomMaterialId || params.bodyMaterialId,
    edgeBanding: DEFAULT_DRAWER_BOX_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_BOTTOM',
      drawerIndex: params.boxIndex,
    },
  });

  // 2. Left Side
  parts.push({
    name: `Szuflada ${displayIndex} - bok lewy`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: dims.boxDepth, y: dims.boxSideHeight },
    width: dims.boxDepth,
    height: dims.boxSideHeight,
    depth: params.bodyThickness,
    position: [-dims.boxWidth / 2 + params.bodyThickness / 2, boxCenterY, boxCenterZ],
    rotation: [0, Math.PI / 2, 0],
    materialId: params.bodyMaterialId,
    edgeBanding: DEFAULT_DRAWER_BOX_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_SIDE_LEFT',
      drawerIndex: params.boxIndex,
    },
  });

  // 3. Right Side
  parts.push({
    name: `Szuflada ${displayIndex} - bok prawy`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: dims.boxDepth, y: dims.boxSideHeight },
    width: dims.boxDepth,
    height: dims.boxSideHeight,
    depth: params.bodyThickness,
    position: [dims.boxWidth / 2 - params.bodyThickness / 2, boxCenterY, boxCenterZ],
    rotation: [0, Math.PI / 2, 0],
    materialId: params.bodyMaterialId,
    edgeBanding: DEFAULT_DRAWER_BOX_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_SIDE_RIGHT',
      drawerIndex: params.boxIndex,
    },
  });

  // 4. Back
  parts.push({
    name: `Szuflada ${displayIndex} - tył`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: innerWidth, y: dims.boxSideHeight },
    width: innerWidth,
    height: dims.boxSideHeight,
    depth: params.bodyThickness,
    position: [boxCenterX, boxCenterY, boxCenterZ - dims.boxDepth / 2 + params.bodyThickness / 2],
    rotation: [0, 0, 0],
    materialId: params.bodyMaterialId,
    edgeBanding: DEFAULT_DRAWER_BOX_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_BACK',
      drawerIndex: params.boxIndex,
    },
  });

  // 5. Front panel (for closed boxes - internal drawers)
  if (params.isClosedBox) {
    parts.push({
      name: `Szuflada ${displayIndex} - przód korpusu`,
      furnitureId: params.furnitureId,
      group: params.cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: innerWidth, y: dims.boxSideHeight },
      width: innerWidth,
      height: dims.boxSideHeight,
      depth: params.bodyThickness,
      position: [boxCenterX, boxCenterY, boxCenterZ + dims.boxDepth / 2 - params.bodyThickness / 2],
      rotation: [0, 0, 0],
      materialId: params.bodyMaterialId,
      edgeBanding: DEFAULT_DRAWER_BOX_EDGE_BANDING,
      cabinetMetadata: {
        cabinetId: params.cabinetId,
        role: 'DRAWER_BOX_FRONT',
        drawerIndex: params.boxIndex,
      },
    });
  }

  return parts;
}
