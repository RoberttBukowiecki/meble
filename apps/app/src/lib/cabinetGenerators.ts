


import {
  CabinetParams,
  CabinetMaterials,
  Material,
  Part,
  CabinetType,
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
  bodyMaterial: Material
) => Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[];

const FRONT_MARGIN = 2; // mm clearance on each edge for doors/fronts
const DOOR_GAP = 3; // mm gap between double doors

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
  bodyMaterial: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'KITCHEN') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, shelfCount, hasDoors, topBottomPlacement } = params;
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
  parts.push({
    name: 'Dno',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: topBottomPanelWidth, y: depth },
    width: topBottomPanelWidth,
    height: thickness,
    depth: depth,
    position: [0, bottomPanelY, 0],
    rotation: [0, 0, 0],
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
    height: thickness,
    depth: depth,
    position: [0, topPanelY, 0],
    rotation: [0, 0, 0],
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
      height: thickness,
      depth: depth - 10,
      position: [0, shelfY, -5],
      rotation: [0, 0, 0],
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

  return parts;
}

export function generateWardrobe(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Similar to kitchen but:
  // - Taller proportions
  // - Multiple doors (1-4 based on doorCount)
  // - More shelves allowed (0-10)
  return [];
}

export function generateBookshelf(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Similar structure but:
  // - No doors (open front)
  // - Optional back panel (if hasBack)
  // - Focus on shelves (1-10)
  return [];
}

export function generateDrawerCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // More complex:
  // - Drawer fronts (evenly spaced based on drawerCount)
  // - Optional: drawer boxes (sides, back, bottom per drawer)
  // - For MVP: just drawer fronts
  return [];
}
