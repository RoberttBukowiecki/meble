/**
 * Door generation for cabinets
 */

import { GeneratedPart, DoorGenerationConfig } from './types';
import { FRONT_MARGIN, DOOR_GAP } from './constants';
import { generateHandleMetadata, DoorType } from '../handlePresets';

/**
 * Generate door parts based on door configuration
 * Supports single/double doors with different opening directions
 */
export function generateDoors(config: DoorGenerationConfig): GeneratedPart[] {
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
    legOffset = 0,
  } = config;

  const parts: GeneratedPart[] = [];

  const availableWidth = cabinetWidth - FRONT_MARGIN * 2;
  const doorHeight = cabinetHeight - FRONT_MARGIN * 2;

  if (doorConfig.layout === 'SINGLE') {
    // Single door - full width
    const doorWidth = availableWidth;
    const doorType: DoorType = 'SINGLE';

    parts.push({
      name: 'Front',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [0, cabinetHeight / 2 + legOffset, cabinetDepth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 0,
        doorMetadata: {
          hingeSide: doorConfig.hingeSide,
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, doorType, doorConfig.hingeSide)
          : undefined,
      },
    });
  } else {
    // Double doors
    const doorWidth = (availableWidth - DOOR_GAP) / 2;

    // Left door
    parts.push({
      name: 'Front lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [-doorWidth / 2 - DOOR_GAP / 2, cabinetHeight / 2 + legOffset, cabinetDepth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 0,
        doorMetadata: {
          hingeSide: 'LEFT',
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, 'DOUBLE_LEFT')
          : undefined,
      },
    });

    // Right door
    parts.push({
      name: 'Front prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [doorWidth / 2 + DOOR_GAP / 2, cabinetHeight / 2 + legOffset, cabinetDepth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 1,
        doorMetadata: {
          hingeSide: 'RIGHT',
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, 'DOUBLE_RIGHT')
          : undefined,
      },
    });
  }

  return parts;
}
