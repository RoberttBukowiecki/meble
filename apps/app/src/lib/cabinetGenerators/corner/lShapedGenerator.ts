/**
 * L-Shaped Corner Cabinet Generator
 *
 * Generates parts for L-shaped corner cabinets with:
 * - L-shaped bottom and top panels
 * - Two side panels (one for each arm)
 * - Two back panels (one for each arm)
 * - Optional diagonal front panel
 * - Shelves
 */

import type {
  CornerInternalCabinetParams,
  CabinetMaterials,
  Material,
  EdgeBandingRect,
} from '@/types';
import type { GeneratedPart } from '../types';
import { CornerDomain } from '@/lib/domain/corner';
import { LegsDomain } from '@/lib/domain/legs';
import { generateBackPanel } from '../backPanel';
import { generateLegs } from '../legs';

/**
 * Generate L-shaped corner cabinet parts
 */
export function generateLShapedCorner(
  cabinetId: string,
  furnitureId: string,
  params: CornerInternalCabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { cornerConfig, height, depth, hasBack, topBottomPlacement } = params;
  const { armA, armB, cornerOrientation, wallSharingMode } = cornerConfig;
  const thickness = bodyMaterial.thickness;

  // Calculate leg offset (adds to all Y positions)
  const legOffset = LegsDomain.calculateLegHeightOffset(params.legs);

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);

  // Calculate dead zone
  const deadZone = CornerDomain.getDeadZoneDimensions(cornerConfig, depth);

  // Edge banding defaults
  const allEdgesBanding: EdgeBandingRect = {
    type: 'RECT',
    top: true,
    bottom: true,
    left: true,
    right: true,
  };

  const frontEdgeOnly: EdgeBandingRect = {
    type: 'RECT',
    top: true,
    bottom: false,
    left: false,
    right: false,
  };

  // ===========================================================================
  // 1. BOTTOM PANEL (L-shaped)
  // ===========================================================================
  // Use polygon shape for L-shaped panel
  const bottomWidth = isInset ? armA - thickness * 2 : armA;
  const bottomDepth = isInset ? armB - thickness * 2 : armB;

  // Calculate L-shape dimensions
  // The L-shape is: full width on arm A direction, with a notch cut out for dead zone
  const notchWidth = depth + deadZone.width - thickness;
  const notchDepth = bottomDepth - depth + thickness;

  // For simplicity, we'll use rectangular panels for now (can be upgraded to POLYGON later)
  // This creates a simplified L-shape using the main arm dimensions
  parts.push({
    name: 'Dno narożne',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: bottomWidth, y: depth - thickness },
    width: bottomWidth,
    height: depth - thickness,
    depth: thickness,
    position: [
      cornerOrientation === 'LEFT' ? 0 : 0,
      thickness / 2 + legOffset,
      (armB - depth) / 2,
    ],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: allEdgesBanding,
    cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
  });

  // Second part of L-bottom (perpendicular arm)
  const secondArmWidth = depth - thickness;
  const secondArmDepth = armB - depth;

  if (secondArmDepth > 0) {
    parts.push({
      name: 'Dno narożne (ramię B)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: secondArmWidth, y: secondArmDepth },
      width: secondArmWidth,
      height: secondArmDepth,
      depth: thickness,
      position: [
        cornerOrientation === 'LEFT'
          ? -armA / 2 + depth / 2
          : armA / 2 - depth / 2,
        thickness / 2 + legOffset,
        -depth / 2,
      ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: allEdgesBanding,
      cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
    });
  }

  // ===========================================================================
  // 2. TOP PANEL (L-shaped, mirrors bottom)
  // ===========================================================================
  const topY = height - thickness / 2 + legOffset;

  parts.push({
    name: 'Góra narożna',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: bottomWidth, y: depth - thickness },
    width: bottomWidth,
    height: depth - thickness,
    depth: thickness,
    position: [
      cornerOrientation === 'LEFT' ? 0 : 0,
      topY,
      (armB - depth) / 2,
    ],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: allEdgesBanding,
    cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
  });

  if (secondArmDepth > 0) {
    parts.push({
      name: 'Góra narożna (ramię B)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: secondArmWidth, y: secondArmDepth },
      width: secondArmWidth,
      height: secondArmDepth,
      depth: thickness,
      position: [
        cornerOrientation === 'LEFT'
          ? -armA / 2 + depth / 2
          : armA / 2 - depth / 2,
        topY,
        -depth / 2,
      ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: allEdgesBanding,
      cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
    });
  }

  // ===========================================================================
  // 3. SIDE PANELS
  // ===========================================================================
  const sideCenterY = height / 2 + legOffset;

  // Left side panel (arm A outer side)
  const shouldGenerateLeftSide =
    wallSharingMode !== 'SHARED_LEFT' && wallSharingMode !== 'SHARED_BOTH';

  if (shouldGenerateLeftSide) {
    parts.push({
      name: 'Bok lewy (ramię A)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: depth, y: sideHeight },
      width: depth,
      height: sideHeight,
      depth: thickness,
      position: [
        cornerOrientation === 'LEFT'
          ? -armA / 2 + thickness / 2
          : armA / 2 - thickness / 2,
        sideCenterY,
        (armB - depth) / 2,
      ],
      rotation: [0, Math.PI / 2, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'CORNER_LEFT_SIDE' },
    });
  }

  // Right side panel (arm B outer side)
  const shouldGenerateRightSide =
    wallSharingMode !== 'SHARED_RIGHT' && wallSharingMode !== 'SHARED_BOTH';

  if (shouldGenerateRightSide) {
    parts.push({
      name: 'Bok prawy (ramię B)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: armB - depth, y: sideHeight },
      width: armB - depth,
      height: sideHeight,
      depth: thickness,
      position: [
        cornerOrientation === 'LEFT'
          ? -armA / 2 + depth - thickness / 2
          : armA / 2 - depth + thickness / 2,
        sideCenterY,
        -depth / 2,
      ],
      rotation: [0, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'CORNER_RIGHT_SIDE' },
    });
  }

  // ===========================================================================
  // 4. BACK PANELS
  // ===========================================================================
  if (hasBack && backMaterial) {
    // Back panel for arm A
    const backPanelA = generateBackPanel({
      cabinetId,
      furnitureId,
      cabinetWidth: armA - (shouldGenerateLeftSide ? thickness : 0),
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      backMaterialId: materials.backMaterialId || backMaterial.id,
      backMaterialThickness: backMaterial.thickness,
      overlapRatio: params.backOverlapRatio ?? 0.667,
      mountType: params.backMountType ?? 'overlap',
      topBottomPlacement,
    });

    // Adjust position for arm A back
    backPanelA.name = 'Plecy (ramię A)';
    backPanelA.position = [
      cornerOrientation === 'LEFT'
        ? (shouldGenerateLeftSide ? thickness / 2 : 0)
        : -(shouldGenerateLeftSide ? thickness / 2 : 0),
      backPanelA.position[1] + legOffset,
      armB / 2 - backMaterial.thickness / 2,
    ];
    backPanelA.cabinetMetadata = { cabinetId, role: 'CORNER_BACK_LEFT' };
    parts.push(backPanelA);

    // Back panel for arm B (if there's enough space)
    if (armB > depth + 50) {
      const backPanelB = generateBackPanel({
        cabinetId,
        furnitureId,
        cabinetWidth: armB - depth,
        cabinetHeight: height,
        cabinetDepth: depth,
        bodyMaterialThickness: thickness,
        backMaterialId: materials.backMaterialId || backMaterial.id,
        backMaterialThickness: backMaterial.thickness,
        overlapRatio: params.backOverlapRatio ?? 0.667,
        mountType: params.backMountType ?? 'overlap',
        topBottomPlacement,
      });

      // Adjust position for arm B back
      backPanelB.name = 'Plecy (ramię B)';
      backPanelB.position = [
        cornerOrientation === 'LEFT'
          ? -armA / 2 + depth - backMaterial.thickness / 2
          : armA / 2 - depth + backMaterial.thickness / 2,
        backPanelB.position[1] + legOffset,
        -depth / 2 + (armB - depth) / 2,
      ];
      backPanelB.rotation = [0, Math.PI / 2, 0];
      backPanelB.cabinetMetadata = { cabinetId, role: 'CORNER_BACK_RIGHT' };
      parts.push(backPanelB);
    }
  }

  // ===========================================================================
  // 5. DIAGONAL FRONT PANEL (optional, for L-shaped)
  // ===========================================================================
  if (CornerDomain.hasDiagonalFront(cornerConfig)) {
    const diagonalWidth = CornerDomain.calculateDiagonalWidth(cornerConfig, depth);

    // Only add if diagonal width is reasonable
    if (diagonalWidth > 50) {
      // Calculate diagonal panel position and rotation
      // The diagonal spans from the inner corner area
      const diagonalHeight = sideHeight;

      parts.push({
        name: 'Front diagonalny',
        furnitureId,
        group: cabinetId,
        shapeType: 'RECT',
        shapeParams: { type: 'RECT', x: diagonalWidth, y: diagonalHeight },
        width: diagonalWidth,
        height: diagonalHeight,
        depth: thickness,
        position: [
          cornerOrientation === 'LEFT'
            ? -armA / 2 + depth + deadZone.width / 2
            : armA / 2 - depth - deadZone.width / 2,
          sideCenterY,
          (armB - depth) / 2 - deadZone.depth / 2,
        ],
        rotation: [0, cornerOrientation === 'LEFT' ? -Math.PI / 4 : Math.PI / 4, 0],
        materialId: materials.frontMaterialId,
        edgeBanding: allEdgesBanding,
        cabinetMetadata: { cabinetId, role: 'CORNER_DIAGONAL_FRONT' },
      });
    }
  }

  // ===========================================================================
  // 6. SHELVES (L-shaped, simplified to rectangular for now)
  // ===========================================================================
  const shelfCount = 1; // Default shelf count for corner cabinets
  const shelfPositions = CornerDomain.calculateShelfPositions(height, thickness, shelfCount);

  shelfPositions.forEach((shelfY, index) => {
    // Main shelf (arm A direction)
    const shelfWidth = bottomWidth - thickness;
    const shelfDepth = depth - thickness * 2;

    parts.push({
      name: `Półka ${index + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: shelfDepth },
      width: shelfWidth,
      height: shelfDepth,
      depth: thickness,
      position: [
        0,
        shelfY + legOffset,
        (armB - depth) / 2,
      ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: frontEdgeOnly,
      cabinetMetadata: { cabinetId, role: 'CORNER_SHELF', index },
    });
  });

  // ===========================================================================
  // 7. LEGS (if configured)
  // ===========================================================================
  if (params.legs?.enabled) {
    const legParts = generateLegs(
      cabinetId,
      furnitureId,
      params.legs,
      armA,  // Use armA as width
      armB,  // Use armB as depth for leg positioning
      materials
    );
    parts.push(...legParts);
  }

  return parts;
}
