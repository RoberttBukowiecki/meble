/**
 * L-Shaped Corner Cabinet Generator
 *
 * Features:
 * - Coordinate system: origin at external front corner (0,0,0)
 * - L-shape panel support with DXF export
 * - Top/bottom mounting options (inset/overlay)
 * - Front rail (wieniec przedni) support
 * - Multiple door types (SINGLE, ANGLED)
 *
 * Coordinate system:
 * - Origin (0,0,0) at external front corner at floor level
 * - X axis: Points RIGHT (along arm A width, 0 to W)
 * - Y axis: Points UP (height, 0 to H)
 * - Z axis: Points BACK (into the corner, 0 to D)
 *
 * Dimension terminology:
 * - W: External width (arm A span)
 * - D: External depth (arm B span)
 * - H: Height
 * - bodyDepth: How deep panels/shelves extend (NOT the same as D!)
 * - t: Body material thickness
 * - tf: Front material thickness
 */

import type {
  CornerInternalCabinetParams,
  CabinetMaterials,
  Material,
  EdgeBandingRect,
  EdgeBandingLShape,
  ShapeParamsLShape,
  ShapeParamsRect,
} from '@/types';
import type { GeneratedPart } from '../types';
import { CornerDomain, CORNER_DEFAULTS } from '@/lib/domain/corner';
import { LegsDomain } from '@/lib/domain/legs';
import { generateBackPanel } from '../backPanel';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Standard edge banding configs
 */
const ALL_EDGES: EdgeBandingRect = {
  type: 'RECT',
  top: true,
  bottom: true,
  left: true,
  right: true,
};

const FRONT_EDGE_ONLY: EdgeBandingRect = {
  type: 'RECT',
  top: true,
  bottom: false,
  left: false,
  right: false,
};

const VISIBLE_EDGES: EdgeBandingRect = {
  type: 'RECT',
  top: true,
  bottom: false,
  left: true,
  right: true,
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

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
  const { cornerConfig, height: H, hasBack } = params;
  const {
    W,
    D,
    bodyDepth,
    bottomMount,
    topMount,
    panelGeometry,
    frontRail,
    frontRailMount,
    frontRailWidth,
    frontType,
    hingeSide,
    frontAngle,
    doorGap,
    wallSharingMode,
    cornerOrientation,
  } = cornerConfig;

  const t = bodyMaterial.thickness;
  const tf = materials.frontMaterialId ? t : t; // Use body thickness for front if no separate front material
  const isLeft = cornerOrientation === 'LEFT';

  // Calculate leg offset (adds to all Y positions)
  const legOffset = LegsDomain.calculateLegHeightOffset(params.legs);

  // Side generation flags
  const hasLeftSide = CornerDomain.hasLeftSide(cornerConfig);
  const hasRightSide = CornerDomain.hasRightSide(cornerConfig);

  // Mount type calculations
  const isBottomInset = bottomMount === 'inset';
  const isTopInset = topMount === 'inset';

  // Side height (depends on mounting)
  const sideHeight = CornerDomain.calculateSideHeight(H, bottomMount, topMount, t);
  const bottomOffset = isBottomInset ? 0 : t;
  const sideCenterY = bottomOffset + sideHeight / 2 + legOffset;

  // Check if we should use L-shape geometry
  const useLShape = CornerDomain.shouldUseLShape(cornerConfig);

  // ===========================================================================
  // 1. BOTTOM PANELS
  // ===========================================================================
  const bottomParts = generateBottomPanels(
    cabinetId,
    furnitureId,
    cornerConfig,
    t,
    legOffset,
    materials.bodyMaterialId,
    useLShape,
    hasLeftSide,
    hasRightSide
  );
  parts.push(...bottomParts);

  // ===========================================================================
  // 2. TOP PANELS
  // ===========================================================================
  const topParts = generateTopPanels(
    cabinetId,
    furnitureId,
    cornerConfig,
    H,
    t,
    legOffset,
    materials.bodyMaterialId,
    useLShape,
    hasLeftSide,
    hasRightSide
  );
  parts.push(...topParts);

  // ===========================================================================
  // 3. SIDE PANELS
  // ===========================================================================
  // Left side (only bodyDepth dimension)
  if (hasLeftSide) {
    parts.push({
      name: 'Bok lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: bodyDepth, y: sideHeight },
      width: bodyDepth,
      height: sideHeight,
      depth: t,
      position: [t / 2, sideCenterY, bodyDepth / 2],
      rotation: [0, Math.PI / 2, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: VISIBLE_EDGES,
      cabinetMetadata: { cabinetId, role: 'CORNER_LEFT_SIDE' },
    });
  }

  // Right side (only bodyDepth dimension, positioned at front)
  if (hasRightSide) {
    parts.push({
      name: 'Bok prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: bodyDepth, y: sideHeight },
      width: bodyDepth,
      height: sideHeight,
      depth: t,
      position: [W - bodyDepth / 2, sideCenterY, t / 2],
      rotation: [0, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: VISIBLE_EDGES,
      cabinetMetadata: { cabinetId, role: 'CORNER_RIGHT_SIDE' },
    });
  }

  // ===========================================================================
  // 4. FRONT RAIL (Wieniec przedni)
  // ===========================================================================
  if (frontRail) {
    const railPart = generateFrontRail(
      cabinetId,
      furnitureId,
      cornerConfig,
      H,
      t,
      legOffset,
      materials.bodyMaterialId,
      hasLeftSide
    );
    if (railPart) {
      parts.push(railPart);
    }
  }

  // ===========================================================================
  // 5. BACK PANELS
  // ===========================================================================
  if (hasBack && backMaterial) {
    const backParts = generateBackPanels(
      cabinetId,
      furnitureId,
      params,
      cornerConfig,
      H,
      t,
      legOffset,
      materials,
      backMaterial,
      hasLeftSide
    );
    parts.push(...backParts);
  }

  // ===========================================================================
  // 6. FRONT (DOOR) PANELS
  // ===========================================================================
  const frontPart = generateFront(
    cabinetId,
    furnitureId,
    cornerConfig,
    H,
    t,
    tf,
    legOffset,
    bottomMount,
    topMount,
    materials.frontMaterialId
  );
  if (frontPart) {
    parts.push(frontPart);
  }

  // ===========================================================================
  // 7. SHELVES
  // ===========================================================================
  const shelfParts = generateShelves(
    cabinetId,
    furnitureId,
    cornerConfig,
    H,
    t,
    legOffset,
    materials.bodyMaterialId,
    hasLeftSide,
    hasRightSide,
    1 // Default shelf count
  );
  parts.push(...shelfParts);

  return parts;
}

// ============================================================================
// BOTTOM PANEL GENERATION
// ============================================================================

function generateBottomPanels(
  cabinetId: string,
  furnitureId: string,
  config: {
    W: number;
    D: number;
    bodyDepth: number;
    bottomMount: 'inset' | 'overlay';
    wallSharingMode: string;
  },
  t: number,
  legOffset: number,
  materialId: string,
  useLShape: boolean,
  hasLeftSide: boolean,
  hasRightSide: boolean
): GeneratedPart[] {
  const { W, D, bodyDepth, bottomMount } = config;
  const isInset = bottomMount === 'inset';

  // Panel dimensions
  const panelW = isInset ? W - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) : W;
  const panelD = isInset ? D - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) : D;

  // Y position (center of panel thickness)
  const posY = t / 2 + legOffset;

  if (useLShape) {
    // Single L-shaped panel
    const cut = CornerDomain.calculateLShapeCut(W, D, bodyDepth, isInset, t);
    const edgeBanding = CornerDomain.getEdgeBandingForLShape(config as any);

    // Position at center of L-shape bounding box
    const posX = W / 2;
    const posZ = D / 2;

    return [{
      name: 'Dno',
      furnitureId,
      group: cabinetId,
      shapeType: 'L_SHAPE',
      shapeParams: {
        type: 'L_SHAPE',
        x: panelW,
        y: panelD,
        cutX: cut.cutX,
        cutY: cut.cutY,
      } as ShapeParamsLShape,
      width: panelW,
      height: panelD,
      depth: t,
      position: [posX, posY, posZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding,
      cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
    }];
  } else {
    // TWO_RECT: Two separate rectangular panels
    const parts: GeneratedPart[] = [];

    // Bottom A: main panel under arm A (full width, bodyDepth)
    const bottomAWidth = isInset ? W - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) : W;
    const bottomADepth = bodyDepth - t; // Depth minus back panel space

    const bottomAX = W / 2;
    const bottomAZ = D - bodyDepth / 2;

    parts.push({
      name: 'Dno (ramię A)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: bottomAWidth, y: bottomADepth } as ShapeParamsRect,
      width: bottomAWidth,
      height: bottomADepth,
      depth: t,
      position: [bottomAX, posY, bottomAZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding: ALL_EDGES,
      cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
    });

    // Bottom B: panel under arm B (extends from inner corner toward front)
    const armBLength = D - bodyDepth;
    if (armBLength > 0) {
      const bottomBWidth = bodyDepth - t;
      const bottomBDepth = armBLength;

      const bottomBX = (hasLeftSide ? t : 0) + bottomBWidth / 2;
      const bottomBZ = bodyDepth + armBLength / 2;

      parts.push({
        name: 'Dno (ramię B)',
        furnitureId,
        group: cabinetId,
        shapeType: 'RECT',
        shapeParams: { type: 'RECT', x: bottomBWidth, y: bottomBDepth } as ShapeParamsRect,
        width: bottomBWidth,
        height: bottomBDepth,
        depth: t,
        position: [bottomBX, posY, bottomBZ],
        rotation: [-Math.PI / 2, 0, 0],
        materialId,
        edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
        cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
      });
    }

    return parts;
  }
}

// ============================================================================
// TOP PANEL GENERATION
// ============================================================================

function generateTopPanels(
  cabinetId: string,
  furnitureId: string,
  config: {
    W: number;
    D: number;
    bodyDepth: number;
    topMount: 'inset' | 'overlay';
    wallSharingMode: string;
  },
  H: number,
  t: number,
  legOffset: number,
  materialId: string,
  useLShape: boolean,
  hasLeftSide: boolean,
  hasRightSide: boolean
): GeneratedPart[] {
  const { W, D, bodyDepth, topMount } = config;
  const isInset = topMount === 'inset';

  // Panel dimensions
  const panelW = isInset ? W - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) : W;
  const panelD = isInset ? D - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) : D;

  // Y position (center of panel thickness at top)
  const posY = H - t / 2 + legOffset;

  if (useLShape) {
    // Single L-shaped panel
    const cut = CornerDomain.calculateLShapeCut(W, D, bodyDepth, isInset, t);
    const edgeBanding = CornerDomain.getEdgeBandingForLShape(config as any);

    const posX = W / 2;
    const posZ = D / 2;

    return [{
      name: 'Góra',
      furnitureId,
      group: cabinetId,
      shapeType: 'L_SHAPE',
      shapeParams: {
        type: 'L_SHAPE',
        x: panelW,
        y: panelD,
        cutX: cut.cutX,
        cutY: cut.cutY,
      } as ShapeParamsLShape,
      width: panelW,
      height: panelD,
      depth: t,
      position: [posX, posY, posZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding,
      cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
    }];
  } else {
    // TWO_RECT: Two separate rectangular panels (as top rails/wieńce)
    const parts: GeneratedPart[] = [];
    const railWidth = Math.min(100, bodyDepth - t); // Standard rail width

    // Top rail A: along arm A (at back)
    const railAWidth = W - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0);
    const railAX = W / 2;
    const railAZ = D - railWidth / 2;

    parts.push({
      name: 'Wieniec górny (ramię A)',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: railAWidth, y: railWidth } as ShapeParamsRect,
      width: railAWidth,
      height: railWidth,
      depth: t,
      position: [railAX, posY, railAZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding: FRONT_EDGE_ONLY,
      cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
    });

    // Top rail B: along arm B (at back of arm B)
    const armBLength = D - bodyDepth;
    if (armBLength > 0) {
      const railBX = (hasLeftSide ? t : 0) + railWidth / 2;
      const railBZ = bodyDepth + armBLength / 2;

      parts.push({
        name: 'Wieniec górny (ramię B)',
        furnitureId,
        group: cabinetId,
        shapeType: 'RECT',
        shapeParams: { type: 'RECT', x: railWidth, y: armBLength } as ShapeParamsRect,
        width: railWidth,
        height: armBLength,
        depth: t,
        position: [railBX, posY, railBZ],
        rotation: [-Math.PI / 2, 0, 0],
        materialId,
        edgeBanding: FRONT_EDGE_ONLY,
        cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
      });
    }

    return parts;
  }
}

// ============================================================================
// FRONT RAIL GENERATION
// ============================================================================

function generateFrontRail(
  cabinetId: string,
  furnitureId: string,
  config: {
    W: number;
    bodyDepth: number;
    frontRailWidth?: number;
    frontRailMount?: 'inset' | 'overlay';
  },
  H: number,
  t: number,
  legOffset: number,
  materialId: string,
  hasLeftSide: boolean
): GeneratedPart | null {
  const { W, bodyDepth, frontRailWidth, frontRailMount } = config;
  const railWidth = frontRailWidth ?? CORNER_DEFAULTS.frontRailWidth;
  const isInset = frontRailMount === 'inset';

  // Rail spans the front opening (from left side to inner corner)
  const openingWidth = W - bodyDepth;
  if (openingWidth <= 0) return null;

  // Calculate rail length based on mount type
  const railLength = isInset
    ? openingWidth - (hasLeftSide ? t : 0)
    : openingWidth;

  if (railLength < 50) return null;

  // Position
  const railX = (hasLeftSide ? t : 0) + railLength / 2;
  const posY = H - t / 2 + legOffset;
  const railZ = railWidth / 2;

  return {
    name: 'Wieniec przedni',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: railLength, y: railWidth } as ShapeParamsRect,
    width: railLength,
    height: railWidth,
    depth: t,
    position: [railX, posY, railZ],
    rotation: [-Math.PI / 2, 0, 0],
    materialId,
    edgeBanding: FRONT_EDGE_ONLY,
    cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
  };
}

// ============================================================================
// BACK PANEL GENERATION
// ============================================================================

function generateBackPanels(
  cabinetId: string,
  furnitureId: string,
  params: CornerInternalCabinetParams,
  config: {
    W: number;
    D: number;
    bodyDepth: number;
  },
  H: number,
  t: number,
  legOffset: number,
  materials: CabinetMaterials,
  backMaterial: Material,
  hasLeftSide: boolean
): GeneratedPart[] {
  const { W, D, bodyDepth } = config;
  const backThickness = backMaterial.thickness;
  const parts: GeneratedPart[] = [];

  // Back panel A: at Z = D (back of arm A)
  const backAWidth = W - (hasLeftSide ? t : 0);
  const backPanelA = generateBackPanel({
    cabinetId,
    furnitureId,
    cabinetWidth: backAWidth,
    cabinetHeight: H,
    cabinetDepth: bodyDepth,
    bodyMaterialThickness: t,
    backMaterialId: materials.backMaterialId || backMaterial.id,
    backMaterialThickness: backThickness,
    overlapRatio: params.backOverlapRatio ?? 0.667,
    mountType: params.backMountType ?? 'overlap',
    topBottomPlacement: params.topBottomPlacement,
    legOffset,
  });

  backPanelA.name = 'Plecy (ramię A)';
  backPanelA.position = [
    (hasLeftSide ? t : 0) + backAWidth / 2,
    backPanelA.position[1],
    D - backThickness / 2,
  ];
  backPanelA.cabinetMetadata = { cabinetId, role: 'CORNER_BACK_LEFT' };
  parts.push(backPanelA);

  // Back panel B: at X = 0 (back of arm B)
  const armBLength = D - bodyDepth;
  if (armBLength > 50) {
    const backPanelB = generateBackPanel({
      cabinetId,
      furnitureId,
      cabinetWidth: armBLength,
      cabinetHeight: H,
      cabinetDepth: bodyDepth,
      bodyMaterialThickness: t,
      backMaterialId: materials.backMaterialId || backMaterial.id,
      backMaterialThickness: backThickness,
      overlapRatio: params.backOverlapRatio ?? 0.667,
      mountType: params.backMountType ?? 'overlap',
      topBottomPlacement: params.topBottomPlacement,
      legOffset,
    });

    backPanelB.name = 'Plecy (ramię B)';
    backPanelB.position = [
      backThickness / 2,
      backPanelB.position[1],
      bodyDepth + armBLength / 2,
    ];
    backPanelB.rotation = [0, Math.PI / 2, 0];
    backPanelB.cabinetMetadata = { cabinetId, role: 'CORNER_BACK_RIGHT' };
    parts.push(backPanelB);
  }

  return parts;
}

// ============================================================================
// FRONT (DOOR) GENERATION
// ============================================================================

function generateFront(
  cabinetId: string,
  furnitureId: string,
  config: {
    W: number;
    D: number;
    bodyDepth: number;
    frontType: string;
    hingeSide?: 'left' | 'right';
    frontAngle?: number;
    doorGap?: number;
    cornerOrientation: string;
  },
  H: number,
  t: number,
  tf: number,
  legOffset: number,
  bottomMount: 'inset' | 'overlay',
  topMount: 'inset' | 'overlay',
  materialId: string
): GeneratedPart | null {
  const { W, D, bodyDepth, frontType, hingeSide, frontAngle, doorGap, cornerOrientation } = config;
  const gap = doorGap ?? CORNER_DEFAULTS.doorGap;
  const isLeft = cornerOrientation === 'LEFT';

  if (frontType === 'NONE') return null;

  // Front height (full opening minus gaps)
  const bottomOffset = bottomMount === 'inset' ? 0 : t;
  const topOffset = topMount === 'inset' ? 0 : t;
  const frontHeight = H - bottomOffset - topOffset - gap * 2;
  const frontCenterY = bottomOffset + gap + frontHeight / 2 + legOffset;

  if (frontType === 'SINGLE') {
    // Single door parallel to XY plane (covers arm A opening)
    const openingWidth = W - bodyDepth;
    const frontWidth = openingWidth - gap * 2;

    if (frontWidth < 50) return null;

    // Position based on hinge side
    const hinge = hingeSide === 'right' ? 'RIGHT' : 'LEFT';
    const frontX = t + gap + frontWidth / 2;

    return {
      name: 'Front',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: frontWidth, y: frontHeight } as ShapeParamsRect,
      width: frontWidth,
      height: frontHeight,
      depth: tf,
      position: [frontX, frontCenterY, -tf / 2],
      rotation: [0, 0, 0],
      materialId,
      edgeBanding: ALL_EDGES,
      cabinetMetadata: {
        cabinetId,
        role: 'CORNER_DIAGONAL_FRONT',
        doorMetadata: { hingeSide: hinge, openingDirection: 'HORIZONTAL' },
      },
    };
  }

  if (frontType === 'ANGLED') {
    // Diagonal door at specified angle (default 45°)
    const angle = frontAngle ?? CORNER_DEFAULTS.frontAngle;
    const angleRad = (angle * Math.PI) / 180;

    // Dead zone dimensions
    const deadZone = CornerDomain.calculateDeadZone(config as any);

    // Diagonal width (hypotenuse)
    const diagonalWidth = CornerDomain.calculateDiagonalWidth(config as any);

    if (diagonalWidth < 50) return null;

    // Center of dead zone
    const centerX = bodyDepth + deadZone.width / 2;
    const centerZ = bodyDepth - deadZone.depth / 2;

    return {
      name: 'Front skośny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: diagonalWidth, y: frontHeight } as ShapeParamsRect,
      width: diagonalWidth,
      height: frontHeight,
      depth: tf,
      position: [centerX, frontCenterY, centerZ],
      rotation: [0, isLeft ? -angleRad : angleRad, 0],
      materialId,
      edgeBanding: ALL_EDGES,
      cabinetMetadata: { cabinetId, role: 'CORNER_DIAGONAL_FRONT' },
    };
  }

  return null;
}

// ============================================================================
// SHELF GENERATION
// ============================================================================

function generateShelves(
  cabinetId: string,
  furnitureId: string,
  config: {
    W: number;
    D: number;
    bodyDepth: number;
  },
  H: number,
  t: number,
  legOffset: number,
  materialId: string,
  hasLeftSide: boolean,
  hasRightSide: boolean,
  shelfCount: number
): GeneratedPart[] {
  const { W, D, bodyDepth } = config;
  const parts: GeneratedPart[] = [];

  // Calculate shelf positions
  const shelfPositions = CornerDomain.calculateShelfPositions(H, t, shelfCount);

  // Shelf dimensions (fits in arm A area)
  const shelfWidth = W - (hasLeftSide ? t : 0) - (hasRightSide ? t : 0) - t;
  const shelfDepth = bodyDepth - t * 2;

  shelfPositions.forEach((shelfY, index) => {
    const shelfX = W / 2;
    const shelfZ = D - bodyDepth / 2;

    parts.push({
      name: `Półka ${index + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: shelfDepth } as ShapeParamsRect,
      width: shelfWidth,
      height: shelfDepth,
      depth: t,
      position: [shelfX, shelfY + legOffset, shelfZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId,
      edgeBanding: FRONT_EDGE_ONLY,
      cabinetMetadata: { cabinetId, role: 'CORNER_SHELF', index },
    });
  });

  return parts;
}
