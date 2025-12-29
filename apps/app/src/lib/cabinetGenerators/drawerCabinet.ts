/**
 * Drawer cabinet generator
 */

import { CabinetParams, CabinetMaterials, Material, DrawerCabinetParams } from "@/types";
import { GeneratedPart } from "./types";
import { generateBackPanel } from "./backPanel";
import { generateDrawers } from "./drawers";
import { generateSideFronts } from "./sideFronts";
import { generateDecorativePanels } from "./decorativePanels";
import { generateInterior, hasInteriorContent } from "./interior";
import { LegsDomain } from "@/lib/domain/legs";

export function generateDrawerCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  if (params.type !== "DRAWER") throw new Error("Invalid params type");

  const drawerParams = params as DrawerCabinetParams;
  const parts: GeneratedPart[] = [];
  const { width, height, depth, topBottomPlacement, hasBack, backOverlapRatio, backMountType } =
    drawerParams;
  const thickness = bodyMaterial.thickness;

  // Calculate leg offset (adds to all Y positions)
  const legOffset = LegsDomain.calculateLegHeightOffset(drawerParams.legs);

  const isInset = topBottomPlacement === "inset";
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2 + legOffset;
  const topPanelY = height - thickness / 2 + legOffset;
  const bottomPanelY = thickness / 2 + legOffset;
  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;

  // 1. BOTTOM panel
  parts.push({
    name: "Dno",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: topBottomPanelWidth, y: depth },
    width: topBottomPanelWidth,
    height: depth,
    depth: thickness,
    position: [0, bottomPanelY, 0],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: "RECT", top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: "BOTTOM" },
  });

  // 2. LEFT side panel
  parts.push({
    name: "Bok lewy",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: depth, y: sideHeight },
    width: depth,
    height: sideHeight,
    depth: thickness,
    position: [-width / 2 + thickness / 2, sideCenterY, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: "RECT", top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: "LEFT_SIDE" },
  });

  // 3. RIGHT side panel
  parts.push({
    name: "Bok prawy",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: depth, y: sideHeight },
    width: depth,
    height: sideHeight,
    depth: thickness,
    position: [width / 2 - thickness / 2, sideCenterY, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: "RECT", top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: "RIGHT_SIDE" },
  });

  // 4. TOP panel
  parts.push({
    name: "Góra",
    furnitureId,
    group: cabinetId,
    shapeType: "RECT",
    shapeParams: { type: "RECT", x: topBottomPanelWidth, y: depth },
    width: topBottomPanelWidth,
    height: depth,
    depth: thickness,
    position: [0, topPanelY, 0],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: "RECT", top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: "TOP" },
  });

  // 5. INTERIOR (unified config or legacy drawers)
  if (hasInteriorContent(drawerParams.interiorConfig)) {
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
      interiorConfig: drawerParams.interiorConfig,
      legOffset,
    });
    parts.push(...interiorParts);
  } else if (drawerParams.drawerConfig && drawerParams.drawerConfig.zones.length > 0) {
    // Legacy: DRAWERS (if configured)
    const drawerParts = generateDrawers({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bottomMaterialId: drawerParams.bottomMaterialId,
      bodyThickness: thickness,
      frontThickness: thickness,
      drawerConfig: drawerParams.drawerConfig,
    });
    parts.push(...drawerParts);
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
      mountType: backMountType ?? "overlap",
      topBottomPlacement,
      legOffset,
    });
    parts.push(backPanel);
  }

  // 7. SIDE FRONTS (if configured)
  if (
    drawerParams.sideFronts &&
    (drawerParams.sideFronts.left?.enabled || drawerParams.sideFronts.right?.enabled)
  ) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      frontMaterialThickness: thickness,
      sideFrontsConfig: drawerParams.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
      legOffset,
    });
    parts.push(...sideFrontParts);
  }

  // 8. DECORATIVE PANELS (if configured)
  if (
    drawerParams.decorativePanels &&
    (drawerParams.decorativePanels.top?.enabled || drawerParams.decorativePanels.bottom?.enabled)
  ) {
    const decorativeParts = generateDecorativePanels({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      frontMaterialId: materials.frontMaterialId,
      frontThickness: thickness,
      bodyThickness: thickness,
      decorativePanels: drawerParams.decorativePanels,
      legOffset,
    });
    parts.push(...decorativeParts);
  }

  // NOTE: Legs are now generated separately and stored in Cabinet.legs (not as Part)

  return parts;
}
