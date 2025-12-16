/**
 * Wall Cabinet Generator
 *
 * Generates wall-mounted kitchen cabinets designed for wall installation.
 * Key differences from floor cabinets:
 * - No legs (wall-mounted)
 * - Back panel with hanger cutouts for mounting
 * - Support for folding doors (front łamany)
 * - Typically shallower depth
 */

import {
  CabinetParams,
  CabinetMaterials,
  Material,
  WallCabinetParams,
} from '@/types';
import { GeneratedPart } from './types';
import { DEFAULT_DOOR_CONFIG, DEFAULT_HANGER_CUTOUT_CONFIG } from '../config';
import { generateBackPanelWithCutouts } from './backPanel';
import { generateDoors } from './doors';
import { generateFoldingDoors } from './foldingDoors';
import { generateSideFronts } from './sideFronts';
import { generateDecorativePanels } from './decorativePanels';
import { generateInterior, hasInteriorContent } from './interior';

/**
 * Generate all parts for a wall-mounted cabinet
 */
export function generateWallCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  if (params.type !== 'WALL') {
    throw new Error('Invalid params type for wall cabinet generator');
  }

  const parts: GeneratedPart[] = [];
  const wallParams = params as WallCabinetParams;
  const {
    width,
    height,
    depth,
    shelfCount,
    hasDoors,
    topBottomPlacement,
    hasBack,
    backOverlapRatio,
    backMountType,
    hangerCutouts,
    foldingDoorConfig,
  } = wallParams;

  const thickness = bodyMaterial.thickness;

  // Wall cabinets have no legs - Y offset is always 0
  const legOffset = 0;

  // Calculate panel dimensions based on placement type
  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;
  const shelfWidth = width - thickness * 2;

  // Calculate Y positions
  const sideCenterY = height / 2 + legOffset;
  const topPanelY = height - thickness / 2 + legOffset;
  const bottomPanelY = thickness / 2 + legOffset;

  // Generate body parts
  parts.push(...generateBodyParts({
    cabinetId,
    furnitureId,
    width,
    depth,
    thickness,
    sideHeight,
    topBottomPanelWidth,
    sideCenterY,
    topPanelY,
    bottomPanelY,
    materialId: materials.bodyMaterialId,
  }));

  // Generate interior (shelves or zone-based)
  parts.push(...generateInteriorParts({
    cabinetId,
    furnitureId,
    width,
    height,
    depth,
    thickness,
    shelfCount,
    shelfWidth,
    legOffset,
    materials,
    interiorConfig: wallParams.interiorConfig,
  }));

  // Generate doors
  if (hasDoors) {
    parts.push(...generateDoorParts({
      cabinetId,
      furnitureId,
      width,
      height,
      depth,
      thickness,
      legOffset,
      frontMaterialId: materials.frontMaterialId,
      doorConfig: wallParams.doorConfig ?? DEFAULT_DOOR_CONFIG,
      handleConfig: wallParams.handleConfig,
      foldingDoorConfig,
    }));
  }

  // Generate back panel with cutouts
  if (hasBack && backMaterial) {
    const cutoutConfig = hangerCutouts ?? DEFAULT_HANGER_CUTOUT_CONFIG;
    const backPanel = generateBackPanelWithCutouts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      backMaterialId: materials.backMaterialId || backMaterial.id,
      backMaterialThickness: backMaterial.thickness,
      overlapRatio: backOverlapRatio ?? 0.667,
      mountType: backMountType ?? 'overlap',
      topBottomPlacement,
      legOffset,
      hangerCutouts: cutoutConfig,
    });
    parts.push(backPanel);
  }

  // Generate side fronts if configured
  if (wallParams.sideFronts?.left?.enabled || wallParams.sideFronts?.right?.enabled) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      frontMaterialThickness: thickness,
      sideFrontsConfig: wallParams.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
      legOffset,
    });
    parts.push(...sideFrontParts);
  }

  // Generate decorative panels if configured
  if (wallParams.decorativePanels?.top?.enabled || wallParams.decorativePanels?.bottom?.enabled) {
    const decorativeParts = generateDecorativePanels({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      frontMaterialId: materials.frontMaterialId,
      frontThickness: thickness,
      bodyThickness: thickness,
      decorativePanels: wallParams.decorativePanels,
      legOffset,
    });
    parts.push(...decorativeParts);
  }

  // Note: Wall cabinets do NOT have legs

  return parts;
}

// ============================================================================
// Internal helper functions
// ============================================================================

interface BodyPartsConfig {
  cabinetId: string;
  furnitureId: string;
  width: number;
  depth: number;
  thickness: number;
  sideHeight: number;
  topBottomPanelWidth: number;
  sideCenterY: number;
  topPanelY: number;
  bottomPanelY: number;
  materialId: string;
}

function generateBodyParts(config: BodyPartsConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    width,
    depth,
    thickness,
    sideHeight,
    topBottomPanelWidth,
    sideCenterY,
    topPanelY,
    bottomPanelY,
    materialId,
  } = config;

  return [
    // Bottom panel
    {
      name: 'Dno',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: topBottomPanelWidth, y: depth },
      width: topBottomPanelWidth,
      height: depth,
      depth: thickness,
      position: [0, bottomPanelY, 0],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'BOTTOM' },
    },
    // Left side panel
    {
      name: 'Bok lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: depth, y: sideHeight },
      width: depth,
      height: sideHeight,
      depth: thickness,
      position: [-width / 2 + thickness / 2, sideCenterY, 0],
      rotation: [0, Math.PI / 2, 0],
      materialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
    },
    // Right side panel
    {
      name: 'Bok prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: depth, y: sideHeight },
      width: depth,
      height: sideHeight,
      depth: thickness,
      position: [width / 2 - thickness / 2, sideCenterY, 0],
      rotation: [0, Math.PI / 2, 0],
      materialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
    },
    // Top panel
    {
      name: 'Góra',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: topBottomPanelWidth, y: depth },
      width: topBottomPanelWidth,
      height: depth,
      depth: thickness,
      position: [0, topPanelY, 0],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'TOP' },
    },
  ];
}

interface InteriorPartsConfig {
  cabinetId: string;
  furnitureId: string;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  shelfCount: number;
  shelfWidth: number;
  legOffset: number;
  materials: CabinetMaterials;
  interiorConfig?: WallCabinetParams['interiorConfig'];
}

function generateInteriorParts(config: InteriorPartsConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    width,
    height,
    depth,
    thickness,
    shelfCount,
    shelfWidth,
    legOffset,
    materials,
    interiorConfig,
  } = config;

  // Use unified interior system if configured
  if (hasInteriorContent(interiorConfig)) {
    return generateInterior({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bodyThickness: thickness,
      frontThickness: thickness,
      interiorConfig,
    });
  }

  // Generate simple evenly-spaced shelves
  const parts: GeneratedPart[] = [];
  const interiorHeight = Math.max(height - thickness * 2, 0);
  const shelfSpacing = interiorHeight / (shelfCount + 1);
  const shelfSetback = 10; // mm from front

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1) + legOffset;
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: depth - shelfSetback },
      width: shelfWidth,
      height: depth - shelfSetback,
      depth: thickness,
      position: [0, shelfY, -shelfSetback / 2],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  return parts;
}

interface DoorPartsConfig {
  cabinetId: string;
  furnitureId: string;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  legOffset: number;
  frontMaterialId: string;
  doorConfig: WallCabinetParams['doorConfig'];
  handleConfig: WallCabinetParams['handleConfig'];
  foldingDoorConfig: WallCabinetParams['foldingDoorConfig'];
}

function generateDoorParts(config: DoorPartsConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    width,
    height,
    depth,
    thickness,
    legOffset,
    frontMaterialId,
    doorConfig,
    handleConfig,
    foldingDoorConfig,
  } = config;

  // Use folding doors if enabled
  if (foldingDoorConfig?.enabled && doorConfig) {
    return generateFoldingDoors({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      thickness,
      frontMaterialId,
      doorConfig,
      handleConfig,
      foldingDoorConfig,
      legOffset,
    });
  }

  // Use standard doors
  if (doorConfig) {
    return generateDoors({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      thickness,
      frontMaterialId,
      doorConfig,
      handleConfig,
      legOffset,
    });
  }

  return [];
}
