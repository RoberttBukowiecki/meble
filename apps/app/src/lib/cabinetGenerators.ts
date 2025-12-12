


import {
  CabinetParams,
  CabinetMaterials,
  Material,
  Part,
  CabinetType,
  BackMountType,
  TopBottomPlacement,
  DoorConfig,
  HandleConfig,
  KitchenCabinetParams,
  DrawerCabinetParams,
  DrawerSlideConfig,
} from '@/types';
import { generateHandleMetadata, DoorType } from './handlePresets';
import { DEFAULT_DOOR_CONFIG, DRAWER_SLIDE_PRESETS, DRAWER_CONFIG } from './config';

/**
 * Generator function type
 * Returns array of parts WITHOUT id, createdAt, updatedAt (store adds these)
 */
export type CabinetGenerator = (
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
) => Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[];

const FRONT_MARGIN = 2; // mm clearance on each edge for doors/fronts
const DOOR_GAP = 3; // mm gap between double doors
const MIN_BACK_OVERLAP = 4; // Minimum overlap in mm (safety)

// ============================================================================
// Back Panel Generation
// ============================================================================

interface BackPanelConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  backMaterialId: string;
  backMaterialThickness: number;
  overlapRatio: number;
  mountType: BackMountType;
  topBottomPlacement: TopBottomPlacement;
}

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
function generateBackPanel(
  config: BackPanelConfig
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'> {
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
  backWidth = Math.max(backWidth, 50);
  backHeight = Math.max(backHeight, 50);

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

// ============================================================================
// Door Generation
// ============================================================================

interface DoorGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  thickness: number;
  frontMaterialId: string;
  doorConfig: DoorConfig;
  handleConfig?: HandleConfig;
}

/**
 * Generate door parts based on door configuration
 * Supports single/double doors with different opening directions
 */
function generateDoors(
  config: DoorGenerationConfig
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
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
  } = config;

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];

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
      position: [0, cabinetHeight / 2, cabinetDepth / 2 + thickness / 2],
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
      position: [-doorWidth / 2 - DOOR_GAP / 2, cabinetHeight / 2, cabinetDepth / 2 + thickness / 2],
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
      position: [doorWidth / 2 + DOOR_GAP / 2, cabinetHeight / 2, cabinetDepth / 2 + thickness / 2],
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

/**
 * Get appropriate generator for cabinet type
 */
export function getGeneratorForType(type: CabinetType): CabinetGenerator {
  switch (type) {
    case 'KITCHEN':
      return generateKitchenCabinet;
    case 'WARDROBE':
      return generateWardrobe;
    case 'BOOKSHELF':
      return generateBookshelf;
    case 'DRAWER':
      return generateDrawerCabinet;
  }
}

export function generateKitchenCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'KITCHEN') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, shelfCount, hasDoors, topBottomPlacement, hasBack, backOverlapRatio, backMountType } = params;
  const thickness = bodyMaterial.thickness;

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2;
  const topPanelY = height - thickness / 2;
  const bottomPanelY = thickness / 2;
  
  // Conditionally calculate dimensions based on the placement type
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;
  const shelfWidth = width - thickness * 2; // Shelves are always inset

  // 1. BOTTOM panel (sitting on ground, Y = thickness/2)
  // Horizontal panels keep depth as material thickness; rotate to map plan (x/y) onto X/Z axes.
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel (vertical, rotated 90° around Y)
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel (mirror of left)
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. SHELVES (evenly spaced)
  const interiorHeight = Math.max(height - thickness * 2, 0);
  const shelfSpacing = interiorHeight / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1);
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: depth - 10 },
      width: shelfWidth,
      height: depth - 10,
      depth: thickness,
      position: [0, shelfY, -5],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  // 6. DOORS (if enabled)
  if (hasDoors) {
    // Use door config or default
    const doorConfig = (params as KitchenCabinetParams).doorConfig ?? DEFAULT_DOOR_CONFIG;
    const handleConfig = (params as KitchenCabinetParams).handleConfig;

    const doorParts = generateDoors({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      thickness,
      frontMaterialId: materials.frontMaterialId,
      doorConfig,
      handleConfig,
    });

    parts.push(...doorParts);
  }

  // 7. BACK PANEL (if enabled)
  if (hasBack && backMaterial) {
    const backPanel = generateBackPanel({
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
    });
    parts.push(backPanel);
  }

  return parts;
}

export function generateWardrobe(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'WARDROBE') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, shelfCount, doorCount, topBottomPlacement, hasBack, backOverlapRatio, backMountType } = params;
  const thickness = bodyMaterial.thickness;

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2;
  const topPanelY = height - thickness / 2;
  const bottomPanelY = thickness / 2;
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;
  const shelfWidth = width - thickness * 2;

  // 1. BOTTOM panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. SHELVES
  const interiorHeight = Math.max(height - thickness * 2, 0);
  const shelfSpacing = interiorHeight / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1);
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: depth - 10 },
      width: shelfWidth,
      height: depth - 10,
      depth: thickness,
      position: [0, shelfY, -5],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  // 6. DOORS (1-4 doors based on doorCount)
  const actualDoorCount = Math.max(1, Math.min(4, doorCount));
  const totalDoorGap = (actualDoorCount - 1) * DOOR_GAP;
  const availableDoorWidth = Math.max(width - FRONT_MARGIN * 2 - totalDoorGap, 0);
  const singleDoorWidth = availableDoorWidth / actualDoorCount;
  const doorHeight = Math.max(height - FRONT_MARGIN * 2, 0);

  for (let i = 0; i < actualDoorCount; i++) {
    const doorCenterX = -availableDoorWidth / 2 + singleDoorWidth / 2 + i * (singleDoorWidth + DOOR_GAP);
    parts.push({
      name: `Front ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: singleDoorWidth, y: doorHeight },
      width: singleDoorWidth,
      height: doorHeight,
      depth: thickness,
      position: [doorCenterX, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DOOR', index: i },
    });
  }

  // 7. BACK PANEL
  if (hasBack && backMaterial) {
    const backPanel = generateBackPanel({
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
    });
    parts.push(backPanel);
  }

  return parts;
}

export function generateBookshelf(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'BOOKSHELF') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, shelfCount, topBottomPlacement, hasBack, backOverlapRatio, backMountType } = params;
  const thickness = bodyMaterial.thickness;

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2;
  const topPanelY = height - thickness / 2;
  const bottomPanelY = thickness / 2;
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;
  const shelfWidth = width - thickness * 2;

  // 1. BOTTOM panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. SHELVES (evenly spaced)
  const interiorHeight = Math.max(height - thickness * 2, 0);
  const shelfSpacing = interiorHeight / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1);
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: depth - 10 },
      width: shelfWidth,
      height: depth - 10,
      depth: thickness,
      position: [0, shelfY, -5],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  // 6. BACK PANEL (bookshelf typically has back for rigidity)
  if (hasBack && backMaterial) {
    const backPanel = generateBackPanel({
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
    });
    parts.push(backPanel);
  }

  return parts;
}

// ============================================================================
// Drawer Generation
// ============================================================================

interface DrawerGenerationParams {
  cabinetId: string;
  furnitureId: string;
  drawerIndex: number;
  // Box positioning (inside cabinet interior)
  boxYOffset: number; // vertical position for drawer box (inside cabinet body)
  boxSpaceHeight: number; // height available for drawer box in interior
  // Front positioning (overlapping cabinet body like doors)
  frontYCenter: number; // Y center for drawer front
  frontHeight: number; // height of the drawer front
  frontWidth: number; // width of the drawer front
  // Cabinet dimensions
  cabinetWidth: number;
  cabinetDepth: number;
  // Materials
  bodyMaterialId: string;
  frontMaterialId: string;
  bottomMaterialId?: string;
  // Configuration
  slideConfig: DrawerSlideConfig;
  hasInternalDrawer: boolean;
  handleConfig?: HandleConfig;
  // Thicknesses
  bodyThickness: number;
  frontThickness: number;
  bottomThickness: number;
}

/**
 * Calculate drawer box dimensions based on slide type and cabinet dimensions
 */
function calculateDrawerBoxDimensions(
  cabinetWidth: number,
  cabinetDepth: number,
  boxSpaceHeight: number,
  sideThickness: number,
  slideConfig: DrawerSlideConfig,
  hasInternalDrawer: boolean,
  bottomThickness: number
) {
  // Drawer box width = cabinet interior width - slide clearances
  const boxWidth = cabinetWidth
    - 2 * sideThickness           // subtract cabinet sides
    - 2 * slideConfig.sideOffset; // subtract slide clearance

  // Drawer box depth
  const boxDepth = cabinetDepth
    - slideConfig.depthOffset     // rear clearance
    - (hasInternalDrawer ? 0 : DRAWER_CONFIG.BOX_FRONT_OFFSET); // front clearance for front panel

  // Drawer box height (sides height) - smaller than the space available
  const boxSideHeight = Math.max(boxSpaceHeight - DRAWER_CONFIG.BOX_HEIGHT_REDUCTION, 50);

  return { boxWidth, boxDepth, boxSideHeight, bottomThickness };
}

/**
 * Generate all parts for a single drawer (box + optional front)
 */
function generateSingleDrawer(
  params: DrawerGenerationParams
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  const dims = calculateDrawerBoxDimensions(
    params.cabinetWidth,
    params.cabinetDepth,
    params.boxSpaceHeight,
    params.bodyThickness,
    params.slideConfig,
    params.hasInternalDrawer,
    params.bottomThickness
  );

  // Calculate box positions
  // Box is centered in X, positioned at boxYOffset + some clearance from bottom
  const boxCenterX = 0;
  const boxBottomY = params.boxYOffset + (params.boxSpaceHeight - dims.boxSideHeight) / 2;
  const boxCenterY = boxBottomY + dims.boxSideHeight / 2;

  // Z positioning: box sits behind the front panel
  const boxCenterZ = -params.cabinetDepth / 2 + params.slideConfig.depthOffset / 2 + dims.boxDepth / 2;

  // Inner dimensions for bottom and back panels
  const innerWidth = dims.boxWidth - 2 * params.bodyThickness;

  // 1. Drawer Bottom
  parts.push({
    name: `Szuflada ${params.drawerIndex + 1} - dno`,
    furnitureId: params.furnitureId,
    group: params.cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: innerWidth, y: dims.boxDepth - params.bodyThickness },
    width: innerWidth,
    height: dims.boxDepth - params.bodyThickness,
    depth: dims.bottomThickness,
    position: [boxCenterX, boxBottomY + dims.bottomThickness / 2, boxCenterZ - params.bodyThickness / 2],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: params.bottomMaterialId || params.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_BOTTOM',
      drawerIndex: params.drawerIndex,
    },
  });

  // 2. Drawer Left Side
  parts.push({
    name: `Szuflada ${params.drawerIndex + 1} - bok lewy`,
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
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_SIDE_LEFT',
      drawerIndex: params.drawerIndex,
    },
  });

  // 3. Drawer Right Side
  parts.push({
    name: `Szuflada ${params.drawerIndex + 1} - bok prawy`,
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
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_SIDE_RIGHT',
      drawerIndex: params.drawerIndex,
    },
  });

  // 4. Drawer Back
  parts.push({
    name: `Szuflada ${params.drawerIndex + 1} - tył`,
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
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_BACK',
      drawerIndex: params.drawerIndex,
    },
  });

  // 5. Drawer Front (if not internal drawer) - positioned to overlap cabinet body
  if (!params.hasInternalDrawer && params.frontWidth > 0 && params.frontHeight > 0) {
    // Front is positioned relative to full cabinet height (like doors)
    const frontCenterZ = params.cabinetDepth / 2 + params.frontThickness / 2;

    // Generate handle metadata if handle config is provided
    const handleMetadata = params.handleConfig
      ? generateHandleMetadata(
          params.handleConfig,
          params.frontWidth,
          params.frontHeight,
          'SINGLE', // Drawer fronts are always single
          undefined // No hinge side for drawers
        )
      : undefined;

    parts.push({
      name: `Szuflada ${params.drawerIndex + 1} - front`,
      furnitureId: params.furnitureId,
      group: params.cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: params.frontWidth, y: params.frontHeight },
      width: params.frontWidth,
      height: params.frontHeight,
      depth: params.frontThickness,
      position: [boxCenterX, params.frontYCenter, frontCenterZ],
      rotation: [0, 0, 0],
      materialId: params.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId: params.cabinetId,
        role: 'DRAWER_FRONT',
        index: params.drawerIndex,
        drawerIndex: params.drawerIndex,
        handleMetadata,
      },
    });
  }

  return parts;
}

export function generateDrawerCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'DRAWER') throw new Error('Invalid params type');

  const drawerParams = params as DrawerCabinetParams;
  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, drawerCount, topBottomPlacement, hasBack, backOverlapRatio, backMountType } = drawerParams;
  const thickness = bodyMaterial.thickness;

  // Get slide configuration
  const slideConfig = DRAWER_SLIDE_PRESETS[drawerParams.drawerSlideType || 'SIDE_MOUNT'];

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2;
  const topPanelY = height - thickness / 2;
  const bottomPanelY = thickness / 2;
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;

  // 1. BOTTOM panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
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
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. DRAWERS (box + front)
  const actualDrawerCount = Math.max(1, Math.min(8, drawerCount));
  const interiorHeight = Math.max(height - thickness * 2, 0);

  // Calculate drawer box heights (inside cabinet)
  let boxHeights: number[];
  if (drawerParams.drawerHeights && drawerParams.drawerHeights.length === actualDrawerCount) {
    boxHeights = drawerParams.drawerHeights;
  } else {
    const singleBoxHeight = interiorHeight / actualDrawerCount;
    boxHeights = Array(actualDrawerCount).fill(singleBoxHeight);
  }

  // Calculate front dimensions (overlapping cabinet body like doors)
  // Total front area = cabinet height - FRONT_MARGIN on top and bottom
  const totalFrontHeight = height - FRONT_MARGIN * 2;
  const totalGapHeight = (actualDrawerCount - 1) * DOOR_GAP;
  const singleFrontHeight = (totalFrontHeight - totalGapHeight) / actualDrawerCount;
  const frontWidth = width - FRONT_MARGIN * 2; // Full width minus margins (like doors)

  // Get front material thickness (assume same as body if not specified separately)
  const frontMaterial = bodyMaterial; // In practice, frontMaterialId should map to a material
  const frontThickness = frontMaterial.thickness;

  // Get bottom material thickness
  const bottomThickness = DRAWER_CONFIG.BOTTOM_THICKNESS;

  // Generate each drawer
  let currentBoxY = thickness; // Box starts above bottom panel (interior)

  for (let i = 0; i < actualDrawerCount; i++) {
    // Calculate front Y position (from bottom, overlapping body)
    // First front starts at FRONT_MARGIN + half its height
    const frontYCenter = FRONT_MARGIN + singleFrontHeight / 2 + i * (singleFrontHeight + DOOR_GAP);

    const drawerParts = generateSingleDrawer({
      cabinetId,
      furnitureId,
      drawerIndex: i,
      boxYOffset: currentBoxY,
      boxSpaceHeight: boxHeights[i],
      frontYCenter,
      frontHeight: singleFrontHeight,
      frontWidth,
      cabinetWidth: width,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bottomMaterialId: drawerParams.bottomMaterialId,
      slideConfig,
      hasInternalDrawer: drawerParams.hasInternalDrawers || false,
      handleConfig: drawerParams.handleConfig,
      bodyThickness: thickness,
      frontThickness,
      bottomThickness,
    });

    parts.push(...drawerParts);
    currentBoxY += boxHeights[i];
  }

  // 6. BACK PANEL
  if (hasBack && backMaterial) {
    const backPanel = generateBackPanel({
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
    });
    parts.push(backPanel);
  }

  return parts;
}
