


import {
  CabinetParams,
  CabinetMaterials,
  Material,
  Part,
  CabinetType,
  BackMountType,
  TopBottomPlacement,
} from '@/types';

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

  // 6. DOORS (if enabled, two doors with 3mm gap)
  if (hasDoors) {
    const availableDoorWidth = Math.max(width - FRONT_MARGIN * 2 - DOOR_GAP, 0);
    const doorWidth = availableDoorWidth / 2;
    const doorHeight = Math.max(height - FRONT_MARGIN * 2, 0);

    parts.push({
      name: 'Front lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [-doorWidth / 2 - DOOR_GAP / 2, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DOOR', index: 0 },
    });

    parts.push({
      name: 'Front prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [doorWidth / 2 + DOOR_GAP / 2, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DOOR', index: 1 },
    });
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

export function generateDrawerCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'DRAWER') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, drawerCount, topBottomPlacement, hasBack, backOverlapRatio, backMountType } = params;
  const thickness = bodyMaterial.thickness;

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

  // 5. DRAWER FRONTS (evenly spaced)
  const actualDrawerCount = Math.max(2, Math.min(8, drawerCount));
  const interiorHeight = Math.max(height - thickness * 2, 0);
  const drawerFrontHeight = (interiorHeight - (actualDrawerCount - 1) * DOOR_GAP) / actualDrawerCount;
  const drawerFrontWidth = Math.max(width - FRONT_MARGIN * 2, 0);

  for (let i = 0; i < actualDrawerCount; i++) {
    const drawerY = thickness + drawerFrontHeight / 2 + i * (drawerFrontHeight + DOOR_GAP);
    parts.push({
      name: `Front szuflady ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: drawerFrontWidth, y: drawerFrontHeight },
      width: drawerFrontWidth,
      height: drawerFrontHeight,
      depth: thickness,
      position: [0, drawerY, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DRAWER_FRONT', index: i },
    });
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
