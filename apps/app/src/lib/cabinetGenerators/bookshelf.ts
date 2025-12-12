/**
 * Bookshelf cabinet generator
 */

import {
  CabinetParams,
  CabinetMaterials,
  Material,
} from '@/types';
import { GeneratedPart } from './types';
import { generateBackPanel } from './backPanel';
import { generateDrawers } from './drawers';
import { generateSideFronts } from './sideFronts';
import { generateDecorativePanels } from './decorativePanels';
import { generateInterior } from './interior';

export function generateBookshelf(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  if (params.type !== 'BOOKSHELF') throw new Error('Invalid params type');

  const parts: GeneratedPart[] = [];
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

  // 5. INTERIOR (unified config or legacy shelves/drawers)
  if (params.interiorConfig && params.interiorConfig.sections.length > 0) {
    // Use new unified interior system
    const interiorParts = generateInterior({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bodyThickness: thickness,
      frontThickness: thickness,
      interiorConfig: params.interiorConfig,
    });
    parts.push(...interiorParts);
  } else {
    // Legacy: SHELVES (evenly spaced)
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

    // Legacy: DRAWERS (if configured)
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

  // 8. SIDE FRONTS (if configured)
  if (params.sideFronts && (params.sideFronts.left?.enabled || params.sideFronts.right?.enabled)) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      frontMaterialThickness: thickness,
      sideFrontsConfig: params.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
    });
    parts.push(...sideFrontParts);
  }

  // 9. DECORATIVE PANELS (if configured)
  if (params.decorativePanels && (params.decorativePanels.top?.enabled || params.decorativePanels.bottom?.enabled)) {
    const decorativeParts = generateDecorativePanels({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      frontMaterialId: materials.frontMaterialId,
      frontThickness: thickness,
      bodyThickness: thickness,
      decorativePanels: params.decorativePanels,
    });
    parts.push(...decorativeParts);
  }

  return parts;
}
