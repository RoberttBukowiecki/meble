/**
 * Corner Cabinet Generator
 *
 * Generates a corner cabinet with:
 * - Full rectangular body (W × H × D)
 * - Two vertical sides: internal (at wall) and external (where other cabinet joins)
 * - Back panel that overlaps sides (full width W)
 * - Front closing panel (structural, inset between top and bottom)
 * - Door (uses DOOR role for front hiding/handles integration)
 *
 * Structure (top view, wallSide=LEFT, doorPosition=RIGHT):
 *
 *              W (full width)
 *     ┌────────────────────────────┐
 *     │                            │
 *     │       Cabinet interior     │ D (depth)
 *     │                            │
 *     └────────────────────────────┘
 *     ↑  [Front Panel]   [Door]    ↑
 *   Left                        Right
 *   side                        side
 *  (wall)                 (other cabinet)
 *
 * Coordinate system:
 * - Origin (0,0,0) at front-left corner at floor level
 * - X axis: Points RIGHT (0 to W)
 * - Y axis: Points UP (0 to H)
 * - Z axis: Points BACK (0 to D)
 */

import type {
  CornerInternalCabinetParams,
  CabinetMaterials,
  Material,
  EdgeBandingRect,
} from "@/types";
import type { GeneratedPart } from "../types";
import { FRONT_MARGIN } from "../constants";
import { CornerDomain, CORNER_DEFAULTS } from "@/lib/domain/corner";
import { LegsDomain } from "@/lib/domain/legs";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Standard edge banding configs
 */
const ALL_EDGES: EdgeBandingRect = {
  type: "RECT",
  top: true,
  bottom: true,
  left: true,
  right: true,
};

const FRONT_EDGE_ONLY: EdgeBandingRect = {
  type: "RECT",
  top: true,
  bottom: false,
  left: false,
  right: false,
};

const VISIBLE_EDGES: EdgeBandingRect = {
  type: "RECT",
  top: true,
  bottom: false,
  left: true,
  right: true,
};

const NO_EDGES: EdgeBandingRect = {
  type: "RECT",
  top: false,
  bottom: false,
  left: false,
  right: false,
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate corner cabinet parts
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
  const { W, D, bottomMount, topMount, frontType, doorPosition, doorWidth, hingeSide, doorGap } =
    cornerConfig;

  const t = bodyMaterial.thickness;
  const gap = doorGap ?? CORNER_DEFAULTS.doorGap;
  const actualDoorWidth = doorWidth ?? CORNER_DEFAULTS.doorWidth;

  // Calculate leg offset (adds to all Y positions)
  const legOffset = LegsDomain.calculateLegHeightOffset(params.legs);

  // Mount type calculations
  const isBottomInset = bottomMount === "inset";
  const isTopInset = topMount === "inset";

  // Side height (depends on mounting)
  const sideHeight = CornerDomain.calculateSideHeight(H, bottomMount, topMount, t);
  const bottomOffset = isBottomInset ? 0 : t;
  const sideCenterY = bottomOffset + sideHeight / 2 + legOffset;

  // Interior height (between top and bottom panels)
  const interiorHeight = H - 2 * t;
  const interiorCenterY = t + interiorHeight / 2 + legOffset;

  // ===========================================================================
  // 1. BOTTOM PANEL - full width rectangle (W × D)
  // ===========================================================================
  // For inset: fits between sides (W - 2t)
  // For overlay: full width (W)
  const bottomWidth = isBottomInset ? W - 2 * t : W;
  const bottomDepth = D;

  parts.push({
    name: "Dół",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: bottomWidth, y: bottomDepth },
    width: bottomWidth,
    height: bottomDepth,
    depth: t,
    position: [W / 2, t / 2 + legOffset, D / 2],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: FRONT_EDGE_ONLY,
    cabinetMetadata: { cabinetId, role: "CORNER_BOTTOM" },
  });

  // ===========================================================================
  // 2. TOP PANEL - full width rectangle (W × D)
  // ===========================================================================
  const topWidth = isTopInset ? W - 2 * t : W;
  const topDepth = D;

  parts.push({
    name: "Góra",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: topWidth, y: topDepth },
    width: topWidth,
    height: topDepth,
    depth: t,
    position: [W / 2, H - t / 2 + legOffset, D / 2],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: FRONT_EDGE_ONLY,
    cabinetMetadata: { cabinetId, role: "CORNER_TOP" },
  });

  // ===========================================================================
  // 3. LEFT SIDE PANEL (Internal - at wall)
  // ===========================================================================
  parts.push({
    name: "Bok wewnętrzny",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: D, y: sideHeight },
    width: D,
    height: sideHeight,
    depth: t,
    position: [t / 2, sideCenterY, D / 2],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: VISIBLE_EDGES,
    cabinetMetadata: { cabinetId, role: "CORNER_SIDE_INTERNAL" },
  });

  // ===========================================================================
  // 4. RIGHT SIDE PANEL (External - where other cabinet joins)
  // ===========================================================================
  parts.push({
    name: "Bok zewnętrzny",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: D, y: sideHeight },
    width: D,
    height: sideHeight,
    depth: t,
    position: [W - t / 2, sideCenterY, D / 2],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: VISIBLE_EDGES,
    cabinetMetadata: { cabinetId, role: "CORNER_SIDE_EXTERNAL" },
  });

  // ===========================================================================
  // 5. BACK PANEL - overlaps sides (full width W), positioned outside/behind cabinet
  // ===========================================================================
  if (hasBack && backMaterial) {
    const backThickness = backMaterial.thickness;

    // Back panel overlaps both sides (full width W)
    const backWidth = W;
    // Back height = full cabinet height (overlaps top/bottom too)
    const backHeight = H;
    const backCenterY = H / 2 + legOffset;

    parts.push({
      name: "Plecy",
      furnitureId,
      group: cabinetId,
      shapeType: "RECT",
      shapeParams: { type: "RECT", x: backWidth, y: backHeight },
      width: backWidth,
      height: backHeight,
      depth: backThickness,
      // Position behind cabinet body (flush with back face, not inside)
      position: [W / 2, backCenterY, D + backThickness / 2],
      rotation: [0, 0, 0],
      materialId: materials.backMaterialId || backMaterial.id,
      edgeBanding: NO_EDGES,
      cabinetMetadata: { cabinetId, role: "CORNER_BACK" },
    });
  }

  // ===========================================================================
  // 6. FRONT CLOSING PANEL (structural, inset) + DOOR
  // ===========================================================================
  if (frontType === "SINGLE") {
    // Calculate front panel and door dimensions
    const frontOpeningWidth = W - 2 * t; // Width between sides at front
    const frontPanelWidth = frontOpeningWidth - actualDoorWidth - gap;

    // Front closing panel is structural - inset between top and bottom
    const frontPanelHeight = interiorHeight;

    const isDoorOnRight = doorPosition === "RIGHT";

    // Front closing panel (structural element, inset between top/bottom)
    if (frontPanelWidth > 50) {
      const panelX = isDoorOnRight
        ? t + frontPanelWidth / 2 // Panel on left
        : W - t - frontPanelWidth / 2; // Panel on right

      parts.push({
        name: "Panel przedni",
        furnitureId,
        group: cabinetId,
        shapeType: "RECT",
        shapeParams: { type: "RECT", x: frontPanelWidth, y: frontPanelHeight },
        width: frontPanelWidth,
        height: frontPanelHeight,
        depth: t,
        // Inset at Z = t/2 (behind the front face, like a structural element)
        position: [panelX, interiorCenterY, t / 2],
        rotation: [0, 0, 0],
        materialId: materials.bodyMaterialId, // Uses body material (structural)
        edgeBanding: FRONT_EDGE_ONLY,
        cabinetMetadata: { cabinetId, role: "CORNER_FRONT_PANEL" },
      });
    }

    // Door (uses DOOR role for front hiding/handles integration)
    // Door overlaps external side panel (like standard cabinet fronts)
    if (actualDoorWidth > 50) {
      // Door height with standard front margin (like other cabinets)
      const doorHeight = H - FRONT_MARGIN * 2;
      const doorCenterY = FRONT_MARGIN + doorHeight / 2 + legOffset;

      // Door overlaps external side - positioned to edge with FRONT_MARGIN
      const doorX = isDoorOnRight
        ? W - FRONT_MARGIN - actualDoorWidth / 2 // Door overlaps right side
        : FRONT_MARGIN + actualDoorWidth / 2; // Door overlaps left side

      // Determine hinge side based on door position and explicit setting
      let hinge: "LEFT" | "RIGHT";
      if (hingeSide) {
        hinge = hingeSide === "left" ? "LEFT" : "RIGHT";
      } else {
        // Default: hinge on the external side (overlapping the side panel)
        hinge = isDoorOnRight ? "RIGHT" : "LEFT";
      }

      parts.push({
        name: "Drzwi",
        furnitureId,
        group: cabinetId,
        shapeType: "RECT",
        shapeParams: { type: "RECT", x: actualDoorWidth, y: doorHeight },
        width: actualDoorWidth,
        height: doorHeight,
        depth: t,
        // Door at Z = -t/2 (protruding like a front)
        position: [doorX, doorCenterY, -t / 2],
        rotation: [0, 0, 0],
        materialId: materials.frontMaterialId || materials.bodyMaterialId,
        edgeBanding: ALL_EDGES,
        cabinetMetadata: {
          cabinetId,
          role: "DOOR", // Uses DOOR role for front hiding/handles
          doorMetadata: { hingeSide: hinge, openingDirection: "HORIZONTAL" },
          index: 0,
        },
      });
    }
  }

  // ===========================================================================
  // 7. SHELVES (optional - simple rectangular shelves)
  // ===========================================================================
  const shelfCount = 1; // Default one shelf
  if (shelfCount > 0) {
    const shelfWidth = W - 2 * t;
    // Shelf depth: leave space for front panel (t) at front
    const shelfDepth = D - t;
    const shelfSpacing = (H - 2 * t) / (shelfCount + 1);
    // Shelf starts after front panel (Z = t), centered at t + shelfDepth/2
    const shelfCenterZ = t + shelfDepth / 2;

    for (let i = 0; i < shelfCount; i++) {
      const shelfY = t + shelfSpacing * (i + 1) + legOffset;

      parts.push({
        name: `Półka ${i + 1}`,
        furnitureId,
        group: cabinetId,
        shapeType: "RECT",
        shapeParams: { type: "RECT", x: shelfWidth, y: shelfDepth },
        width: shelfWidth,
        height: shelfDepth,
        depth: t,
        position: [W / 2, shelfY, shelfCenterZ],
        rotation: [-Math.PI / 2, 0, 0],
        materialId: materials.bodyMaterialId,
        edgeBanding: FRONT_EDGE_ONLY,
        cabinetMetadata: { cabinetId, role: "CORNER_SHELF", index: i },
      });
    }
  }

  return parts;
}
