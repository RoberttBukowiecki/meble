
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
  const { width, height, depth, shelfCount, hasDoors } = params;
  const thickness = bodyMaterial.thickness;

  // 1. BOTTOM panel (sitting on ground, Y = thickness/2)
  parts.push({
    name: 'Dno',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: width, y: depth },
    width,              // X axis: cabinet width
    height: thickness,  // Y axis: thin vertical dimension (HORIZONTAL PANEL)
    depth,              // Z axis: cabinet depth
    position: [0, thickness / 2, 0],
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
    shapeParams: { type: 'RECT', x: depth, y: height },
    width: depth,
    height: height,
    depth: thickness,
    position: [-width / 2 + thickness / 2, height / 2 + thickness, 0],
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
    shapeParams: { type: 'RECT', x: depth, y: height },
    width: depth,
    height: height,
    depth: thickness,
    position: [width / 2 - thickness / 2, height / 2 + thickness, 0],
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
    shapeParams: { type: 'RECT', x: width, y: depth },
    width,              // X axis: cabinet width
    height: thickness,  // Y axis: thin vertical dimension (HORIZONTAL PANEL)
    depth,              // Z axis: cabinet depth
    position: [0, height + thickness * 1.5, 0],
    rotation: [0, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. SHELVES (evenly spaced)
  const interiorHeight = height - thickness;
  const shelfSpacing = interiorHeight / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1);
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: width - thickness * 2, y: depth - 10 },
      width: width - thickness * 2,  // X axis: inner width
      height: thickness,              // Y axis: thin vertical dimension (HORIZONTAL PANEL)
      depth: depth - 10,              // Z axis: shelf depth (slightly shorter than cabinet)
      position: [0, shelfY, -5],
      rotation: [0, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  // 6. DOORS (if enabled, two doors with 3mm gap)
  if (hasDoors) {
    const doorWidth = (width - thickness * 2 - 3) / 2;  // 3mm gap between doors
    const doorHeight = height - 2;

    parts.push({
      name: 'Front lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [-doorWidth / 2 - 1.5, height / 2 + thickness, depth / 2 + thickness / 2],
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
      position: [doorWidth / 2 + 1.5, height / 2 + thickness, depth / 2 + thickness / 2],
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
