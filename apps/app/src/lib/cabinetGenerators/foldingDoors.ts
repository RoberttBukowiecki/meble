/**
 * Folding Door Generator (Front Łamany)
 *
 * Generates doors split into 2 horizontal sections that fold together
 * when opening upward. Used primarily in wall-mounted cabinets.
 *
 * Structure:
 * - Upper section: attached to cabinet top, folds outward
 * - Lower section: attached to upper section, has handle
 */

import { GeneratedPart } from './types';
import { FRONT_MARGIN, DOOR_GAP } from './constants';
import { generateHandleMetadata, DoorType } from '../handlePresets';
import type { DoorConfig, HandleConfig, FoldingDoorConfig, HingeSide } from '@/types';

export interface FoldingDoorGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  thickness: number;
  frontMaterialId: string;
  doorConfig: DoorConfig;
  handleConfig?: HandleConfig;
  foldingDoorConfig: FoldingDoorConfig;
  legOffset?: number;
}

/**
 * Generate folding door parts
 * Creates upper and lower door sections with gap between them
 */
export function generateFoldingDoors(config: FoldingDoorGenerationConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    thickness,
    frontMaterialId,
    doorConfig,
    handleConfig,
    foldingDoorConfig,
    legOffset = 0,
  } = config;

  const parts: GeneratedPart[] = [];

  // Calculate available dimensions
  const availableWidth = cabinetWidth - FRONT_MARGIN * 2;
  const totalDoorHeight = cabinetHeight - FRONT_MARGIN * 2;

  // Calculate section heights based on split ratio
  const { splitRatio, sectionGap } = foldingDoorConfig;
  const availableDoorHeight = totalDoorHeight - sectionGap;
  const lowerSectionHeight = availableDoorHeight * splitRatio;
  const upperSectionHeight = availableDoorHeight * (1 - splitRatio);

  // Calculate Y positions (from cabinet bottom)
  const lowerSectionCenterY = FRONT_MARGIN + lowerSectionHeight / 2 + legOffset;
  const upperSectionCenterY = FRONT_MARGIN + lowerSectionHeight + sectionGap + upperSectionHeight / 2 + legOffset;

  // Z position for all door panels
  const doorZPosition = cabinetDepth / 2 + thickness / 2;

  if (doorConfig.layout === 'SINGLE') {
    // Single folding door (full width, 2 horizontal sections)
    parts.push(...generateSingleFoldingDoor({
      cabinetId,
      furnitureId,
      doorWidth: availableWidth,
      lowerSectionHeight,
      upperSectionHeight,
      lowerSectionCenterY,
      upperSectionCenterY,
      doorZPosition,
      thickness,
      frontMaterialId,
      handleConfig,
    }));
  } else {
    // Double folding doors (2 columns × 2 sections = 4 panels)
    const doorWidth = (availableWidth - DOOR_GAP) / 2;

    // Left door (2 sections)
    parts.push(...generateDoubleFoldingDoorColumn({
      cabinetId,
      furnitureId,
      doorWidth,
      lowerSectionHeight,
      upperSectionHeight,
      lowerSectionCenterY,
      upperSectionCenterY,
      doorZPosition,
      thickness,
      frontMaterialId,
      handleConfig,
      side: 'LEFT',
      xOffset: -doorWidth / 2 - DOOR_GAP / 2,
    }));

    // Right door (2 sections)
    parts.push(...generateDoubleFoldingDoorColumn({
      cabinetId,
      furnitureId,
      doorWidth,
      lowerSectionHeight,
      upperSectionHeight,
      lowerSectionCenterY,
      upperSectionCenterY,
      doorZPosition,
      thickness,
      frontMaterialId,
      handleConfig,
      side: 'RIGHT',
      xOffset: doorWidth / 2 + DOOR_GAP / 2,
    }));
  }

  return parts;
}

// ============================================================================
// Internal helper functions
// ============================================================================

interface SingleFoldingDoorConfig {
  cabinetId: string;
  furnitureId: string;
  doorWidth: number;
  lowerSectionHeight: number;
  upperSectionHeight: number;
  lowerSectionCenterY: number;
  upperSectionCenterY: number;
  doorZPosition: number;
  thickness: number;
  frontMaterialId: string;
  handleConfig?: HandleConfig;
}

function generateSingleFoldingDoor(config: SingleFoldingDoorConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    doorWidth,
    lowerSectionHeight,
    upperSectionHeight,
    lowerSectionCenterY,
    upperSectionCenterY,
    doorZPosition,
    thickness,
    frontMaterialId,
    handleConfig,
  } = config;

  const parts: GeneratedPart[] = [];

  // Lower section (has handle)
  parts.push({
    name: 'Front dolny',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: doorWidth, y: lowerSectionHeight },
    width: doorWidth,
    height: lowerSectionHeight,
    depth: thickness,
    position: [0, lowerSectionCenterY, doorZPosition],
    rotation: [0, 0, 0],
    materialId: frontMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: {
      cabinetId,
      role: 'DOOR',
      index: 0,
      doorMetadata: {
        openingDirection: 'LIFT_UP',
        foldingSection: 'LOWER',
      },
      handleMetadata: handleConfig
        ? generateHandleMetadata(handleConfig, doorWidth, lowerSectionHeight, 'SINGLE')
        : undefined,
    },
  });

  // Upper section (no handle)
  parts.push({
    name: 'Front górny',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: doorWidth, y: upperSectionHeight },
    width: doorWidth,
    height: upperSectionHeight,
    depth: thickness,
    position: [0, upperSectionCenterY, doorZPosition],
    rotation: [0, 0, 0],
    materialId: frontMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: {
      cabinetId,
      role: 'DOOR',
      index: 1,
      doorMetadata: {
        openingDirection: 'LIFT_UP',
        foldingSection: 'UPPER',
      },
    },
  });

  return parts;
}

interface DoubleFoldingDoorColumnConfig {
  cabinetId: string;
  furnitureId: string;
  doorWidth: number;
  lowerSectionHeight: number;
  upperSectionHeight: number;
  lowerSectionCenterY: number;
  upperSectionCenterY: number;
  doorZPosition: number;
  thickness: number;
  frontMaterialId: string;
  handleConfig?: HandleConfig;
  side: 'LEFT' | 'RIGHT';
  xOffset: number;
}

function generateDoubleFoldingDoorColumn(config: DoubleFoldingDoorColumnConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    doorWidth,
    lowerSectionHeight,
    upperSectionHeight,
    lowerSectionCenterY,
    upperSectionCenterY,
    doorZPosition,
    thickness,
    frontMaterialId,
    handleConfig,
    side,
    xOffset,
  } = config;

  const parts: GeneratedPart[] = [];
  const sideLabel = side === 'LEFT' ? 'lewy' : 'prawy';
  const doorIndex = side === 'LEFT' ? 0 : 2;
  const hingeSide: HingeSide = side;
  const doorType: DoorType = side === 'LEFT' ? 'DOUBLE_LEFT' : 'DOUBLE_RIGHT';

  // Lower section (has handle)
  parts.push({
    name: `Front ${sideLabel} dolny`,
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: doorWidth, y: lowerSectionHeight },
    width: doorWidth,
    height: lowerSectionHeight,
    depth: thickness,
    position: [xOffset, lowerSectionCenterY, doorZPosition],
    rotation: [0, 0, 0],
    materialId: frontMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: {
      cabinetId,
      role: 'DOOR',
      index: doorIndex,
      doorMetadata: {
        hingeSide,
        openingDirection: 'LIFT_UP',
        foldingSection: 'LOWER',
      },
      handleMetadata: handleConfig
        ? generateHandleMetadata(handleConfig, doorWidth, lowerSectionHeight, doorType, hingeSide)
        : undefined,
    },
  });

  // Upper section (no handle)
  parts.push({
    name: `Front ${sideLabel} górny`,
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: doorWidth, y: upperSectionHeight },
    width: doorWidth,
    height: upperSectionHeight,
    depth: thickness,
    position: [xOffset, upperSectionCenterY, doorZPosition],
    rotation: [0, 0, 0],
    materialId: frontMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: {
      cabinetId,
      role: 'DOOR',
      index: doorIndex + 1,
      doorMetadata: {
        hingeSide,
        openingDirection: 'LIFT_UP',
        foldingSection: 'UPPER',
      },
    },
  });

  return parts;
}
