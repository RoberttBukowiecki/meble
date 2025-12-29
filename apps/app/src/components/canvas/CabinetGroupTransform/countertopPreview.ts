/**
 * Countertop Preview Calculation
 *
 * Pure functions for calculating countertop preview positions
 * during cabinet transformation.
 */

import * as THREE from "three";
import type { Part, KitchenCabinetParams } from "@/types";
import type { CountertopSegment, CountertopGroup } from "@/types/countertop";
import { MATERIAL_CONFIG } from "@/lib/config";
import type { PreviewTransformMap } from "./CabinetPreviewMeshes";

// ============================================================================
// Types
// ============================================================================

export interface CountertopPreviewData {
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

interface CabinetWithParams {
  id: string;
  params: KitchenCabinetParams;
}

interface CabinetWithRotation {
  id: string;
  worldTransform?: { rotation: [number, number, number] };
}

interface MaterialWithColor {
  id: string;
  color: string;
  thickness?: number;
}

// ============================================================================
// Calculate Countertop Preview
// ============================================================================

/**
 * Calculate countertop preview data based on preview part transforms.
 * Uses segment.length and segment.width which include overhangs and bridge gaps.
 *
 * @param segment - The countertop segment to calculate preview for
 * @param group - The countertop group containing the segment
 * @param previewTransforms - Map of part ID to preview position/rotation
 * @param parts - All parts in the scene
 * @param cabinets - Cabinets with params for this segment
 * @param allCabinetsForRotation - All cabinets for rotation lookup
 * @param materials - Materials for color lookup
 * @param groupRotation - Rotation from transform controls
 * @param transformedCabinetId - The cabinet being transformed. Only segments containing
 *   this cabinet will use the transform group rotation. Other segments keep original rotation.
 * @returns Preview data or null if cannot calculate
 */
export function calculateCountertopPreview(
  segment: CountertopSegment,
  group: CountertopGroup,
  previewTransforms: PreviewTransformMap,
  parts: Part[],
  cabinets: CabinetWithParams[],
  allCabinetsForRotation: CabinetWithRotation[],
  materials: MaterialWithColor[],
  groupRotation: THREE.Euler,
  transformedCabinetId: string
): CountertopPreviewData | null {
  // Get cabinets for this segment
  const segmentCabinets = cabinets.filter((c) => segment.cabinetIds.includes(c.id));
  if (segmentCabinets.length === 0) return null;

  // Get segment parts for preview bounds
  const segmentParts = parts.filter((p) =>
    segmentCabinets.some((c) => p.cabinetMetadata?.cabinetId === c.id)
  );

  if (segmentParts.length === 0) return null;

  // Use segment dimensions directly - they already include:
  // - Cabinet dimensions
  // - Overhangs (left, right, front, back)
  // - Bridge gaps (if any)
  // These are the "source of truth" from the domain model
  const countertopWidth = segment.length;
  const countertopDepth = segment.width;

  // Calculate world-space bounds from preview transforms for positioning only
  // Must use rotation-aware extent calculation since parts are rotated
  // IMPORTANT: For parts NOT in previewTransforms (i.e., cabinets not being moved),
  // use their original positions from the parts array
  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;
  let maxY = -Infinity;

  for (const part of segmentParts) {
    // Use preview transform if available, otherwise use original part position
    const transform = previewTransforms.get(part.id);
    const [px, py, pz] = transform ? transform.position : part.position;
    const partRotation = transform ? transform.rotation : part.rotation;

    // Calculate rotation-aware world extents
    const rotationQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(partRotation[0], partRotation[1], partRotation[2])
    );

    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    // Transform extent vectors by part's rotation to get world-space extents
    const extentX = new THREE.Vector3(halfW, 0, 0).applyQuaternion(rotationQuat);
    const extentY = new THREE.Vector3(0, halfH, 0).applyQuaternion(rotationQuat);
    const extentZ = new THREE.Vector3(0, 0, halfD).applyQuaternion(rotationQuat);

    // Calculate world-space half dimensions (max extent in each axis)
    const worldHalfW = Math.abs(extentX.x) + Math.abs(extentY.x) + Math.abs(extentZ.x);
    const worldHalfH = Math.abs(extentX.y) + Math.abs(extentY.y) + Math.abs(extentZ.y);
    const worldHalfD = Math.abs(extentX.z) + Math.abs(extentY.z) + Math.abs(extentZ.z);

    minX = Math.min(minX, px - worldHalfW);
    maxX = Math.max(maxX, px + worldHalfW);
    minZ = Math.min(minZ, pz - worldHalfD);
    maxZ = Math.max(maxZ, pz + worldHalfD);
    maxY = Math.max(maxY, py + worldHalfH);
  }

  // If no valid bounds, skip
  if (!isFinite(minX) || !isFinite(maxX)) return null;

  // Get material for thickness and color
  const material = materials.find((m) => m.id === group.materialId);
  const materialThickness = material?.thickness ?? segment.thickness;
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  // Calculate world position from bounds center
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const topY = maxY + materialThickness / 2;

  // Calculate overhang offset in LOCAL space
  const localOffsetX = (segment.overhang.right - segment.overhang.left) / 2;
  const localOffsetZ = (segment.overhang.front - segment.overhang.back) / 2;

  // Determine which rotation to use:
  // - If this segment contains the cabinet being transformed, use the transform group rotation
  // - Otherwise, use the original rotation from the segment's first cabinet
  const segmentContainsTransformedCabinet = segment.cabinetIds.includes(transformedCabinetId);
  let finalRotation: THREE.Euler;

  if (segmentContainsTransformedCabinet) {
    // Use transform controls rotation for segment being moved
    finalRotation = groupRotation;
  } else {
    // Use original cabinet rotation for segments NOT being transformed
    const firstCabinet = allCabinetsForRotation.find((c) => segment.cabinetIds.includes(c.id));
    const originalRotation = firstCabinet?.worldTransform?.rotation || [0, 0, 0];
    finalRotation = new THREE.Euler(originalRotation[0], originalRotation[1], originalRotation[2]);
  }

  // Transform offset to world space using the determined rotation
  const rotationQuat = new THREE.Quaternion().setFromEuler(finalRotation);
  const localOffset = new THREE.Vector3(localOffsetX, 0, localOffsetZ);
  localOffset.applyQuaternion(rotationQuat);

  return {
    position: [centerX + localOffset.x, topY, centerZ + localOffset.z],
    rotation: [finalRotation.x, finalRotation.y, finalRotation.z],
    dimensions: {
      width: countertopWidth,
      height: materialThickness,
      depth: countertopDepth,
    },
    color,
  };
}
