/**
 * Kitchen cabinet generator
 */

import {
  CabinetParams,
  CabinetMaterials,
  Material,
  KitchenCabinetParams,
} from '@/types';
import { GeneratedPart } from './types';
import { DEFAULT_DOOR_CONFIG } from '../config';
import { generateBackPanel } from './backPanel';
import { generateDoors } from './doors';
import { generateDrawers } from './drawers';
import { generateSideFronts } from './sideFronts';

export function generateKitchenCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  if (params.type !== 'KITCHEN') throw new Error('Invalid params type');

  const parts: GeneratedPart[] = [];
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

  // 7. DRAWERS (if configured)
  if (params.drawerConfig && params.drawerConfig.zones.length > 0) {
    const drawerParts = generateDrawers({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bodyThickness: thickness,
      frontThickness: thickness,
      drawerConfig: params.drawerConfig,
    });
    parts.push(...drawerParts);
  }

  // 8. BACK PANEL (if enabled)
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

  // 9. SIDE FRONTS (if configured)
  if (params.sideFronts && (params.sideFronts.left?.enabled || params.sideFronts.right?.enabled)) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      frontMaterialThickness: thickness, // Using body thickness as default for front
      sideFrontsConfig: params.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
    });
    parts.push(...sideFrontParts);
  }

  return parts;
}
