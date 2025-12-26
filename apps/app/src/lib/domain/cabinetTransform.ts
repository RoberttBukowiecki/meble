/**
 * Cabinet Transform Domain Module
 *
 * Provides accurate geometric calculations for cabinet positioning,
 * specifically for:
 * - Legs positioning (must use geometric center, not average of part positions)
 * - Countertop positioning (must use local dimensions, not world-space bounds)
 *
 * The key insight is that getCabinetBodyTransform's "center" is the AVERAGE
 * of body part positions, but this is NOT the geometric center when parts
 * are asymmetrically distributed (e.g., BACK panel at the back).
 *
 * This module calculates the TRUE geometric center (midpoint of bounding box)
 * which is what legs and countertops should be positioned relative to.
 */

import { Euler, Quaternion, Vector3 } from "three";
import type { Part, Cabinet } from "@/types";
import { isBodyPartRole } from "@/types/cabinet";
import type { Position, Dimensions } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Geometric bounds of a cabinet with rotation-invariant local dimensions
 */
export interface CabinetGeometricBounds {
  /** World-space minimum corner */
  min: Position;
  /** World-space maximum corner */
  max: Position;
  /** TRUE geometric center (midpoint of bounds, NOT average of positions) */
  geometricCenter: Position;
  /** Cabinet rotation quaternion extracted from reference part */
  rotation: Quaternion;
  /** Rotation-invariant local dimensions (width along cabinet's local X, depth along local Z) */
  localDimensions: Dimensions;
}

/**
 * Anchor point for legs (geometric center at Y=0)
 */
export interface LegsAnchor {
  position: Position;
  rotation: Quaternion;
}

/**
 * Local bounds for countertop calculation
 */
export interface CabinetLocalBounds {
  /** Local width (X extent in cabinet's local frame) */
  localWidth: number;
  /** Local depth (Z extent in cabinet's local frame) */
  localDepth: number;
  /** World Y of cabinet top surface */
  topY: number;
  /** Geometric center in world coordinates */
  worldCenter: Position;
  /** Cabinet rotation */
  rotation: Quaternion;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default construction rotations for cabinet parts.
 * Used to extract cabinet rotation from part rotation.
 */
const DEFAULT_PART_ROTATIONS: Record<string, Position> = {
  BOTTOM: [-Math.PI / 2, 0, 0],
  TOP: [-Math.PI / 2, 0, 0],
  LEFT_SIDE: [0, Math.PI / 2, 0],
  RIGHT_SIDE: [0, Math.PI / 2, 0],
  SHELF: [-Math.PI / 2, 0, 0],
  BACK: [0, 0, 0],
  CORNER_BOTTOM: [-Math.PI / 2, 0, 0],
  CORNER_TOP: [-Math.PI / 2, 0, 0],
  CORNER_SIDE_INTERNAL: [0, Math.PI / 2, 0],
  CORNER_SIDE_EXTERNAL: [0, Math.PI / 2, 0],
  CORNER_BACK: [0, 0, 0],
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Filter parts to only include cabinet body parts
 */
function filterBodyParts(parts: Part[]): Part[] {
  const bodyParts = parts.filter((p) => isBodyPartRole(p.cabinetMetadata?.role));
  return bodyParts.length > 0 ? bodyParts : parts;
}

/**
 * Extract cabinet rotation from a reference part by factoring out default construction rotation.
 */
function extractCabinetRotation(parts: Part[]): Quaternion {
  // Prefer BOTTOM or CORNER_BOTTOM as reference (most stable for rotation calculation)
  const referencePart =
    parts.find((p) => p.cabinetMetadata?.role === "BOTTOM") ??
    parts.find((p) => p.cabinetMetadata?.role === "CORNER_BOTTOM") ??
    parts[0];

  if (!referencePart?.rotation) {
    return new Quaternion();
  }

  const currentRotation = new Quaternion().setFromEuler(
    new Euler().fromArray(referencePart.rotation)
  );

  const role = referencePart.cabinetMetadata?.role ?? "BOTTOM";
  const defaultRotationArray = DEFAULT_PART_ROTATIONS[role] ?? [0, 0, 0];
  const defaultRotation = new Quaternion().setFromEuler(
    new Euler().fromArray(defaultRotationArray)
  );

  // Cabinet rotation = currentRotation * inverse(defaultRotation)
  return currentRotation.clone().multiply(defaultRotation.clone().invert());
}

/**
 * Calculate world-space extents of a part considering its rotation
 */
function getPartWorldExtents(part: Part): { halfW: number; halfH: number; halfD: number } {
  const rotationQuat = new Quaternion().setFromEuler(
    new Euler(part.rotation[0], part.rotation[1], part.rotation[2])
  );

  const halfW = part.width / 2;
  const halfH = part.height / 2;
  const halfD = part.depth / 2;

  // Transform extent vectors by part's rotation to get world-space extents
  const extentX = new Vector3(halfW, 0, 0).applyQuaternion(rotationQuat);
  const extentY = new Vector3(0, halfH, 0).applyQuaternion(rotationQuat);
  const extentZ = new Vector3(0, 0, halfD).applyQuaternion(rotationQuat);

  // Calculate world-space half dimensions (max extent in each axis)
  return {
    halfW: Math.abs(extentX.x) + Math.abs(extentY.x) + Math.abs(extentZ.x),
    halfH: Math.abs(extentX.y) + Math.abs(extentY.y) + Math.abs(extentZ.y),
    halfD: Math.abs(extentX.z) + Math.abs(extentY.z) + Math.abs(extentZ.z),
  };
}

/**
 * Calculate local dimensions by inverse-rotating world extents
 */
function calculateLocalDimensions(
  worldWidth: number,
  worldDepth: number,
  worldHeight: number,
  rotation: Quaternion
): Dimensions {
  // Create extent vector in world space
  const halfExtent = new Vector3(worldWidth / 2, worldHeight / 2, worldDepth / 2);

  // Inverse rotate to get local extent
  const inverseRotation = rotation.clone().invert();
  const localExtent = halfExtent.clone().applyQuaternion(inverseRotation);

  // Take absolute values since rotation might flip signs
  return {
    width: Math.abs(localExtent.x) * 2,
    height: Math.abs(localExtent.y) * 2,
    depth: Math.abs(localExtent.z) * 2,
  };
}

// ============================================================================
// CALCULATORS
// ============================================================================

/**
 * Get cabinet's geometric bounds with TRUE geometric center.
 *
 * Unlike getCabinetBodyTransform which returns the AVERAGE of part positions,
 * this returns the midpoint of the bounding box - the TRUE geometric center.
 *
 * @param parts - All parts of the cabinet
 * @returns Geometric bounds with true center and local dimensions
 */
export function getCabinetGeometricBounds(parts: Part[]): CabinetGeometricBounds {
  const bodyParts = filterBodyParts(parts);

  // Fallback for empty parts
  if (bodyParts.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      geometricCenter: [0, 0, 0],
      rotation: new Quaternion(),
      localDimensions: { width: 0, height: 0, depth: 0 },
    };
  }

  // Calculate world-space bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const part of bodyParts) {
    const [px, py, pz] = part.position;
    const { halfW, halfH, halfD } = getPartWorldExtents(part);

    minX = Math.min(minX, px - halfW);
    maxX = Math.max(maxX, px + halfW);
    minY = Math.min(minY, py - halfH);
    maxY = Math.max(maxY, py + halfH);
    minZ = Math.min(minZ, pz - halfD);
    maxZ = Math.max(maxZ, pz + halfD);
  }

  // TRUE geometric center is the midpoint of bounds (NOT average of positions!)
  const geometricCenter: Position = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];

  // Extract cabinet rotation from reference part
  const rotation = extractCabinetRotation(bodyParts);

  // Calculate local dimensions (rotation-invariant)
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;
  const worldDepth = maxZ - minZ;
  const localDimensions = calculateLocalDimensions(worldWidth, worldDepth, worldHeight, rotation);

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    geometricCenter,
    rotation,
    localDimensions,
  };
}

/**
 * Get the anchor point for legs rendering.
 * Returns the geometric center at ground level (Y=0).
 * Legs stand on the ground and extend upward to support the cabinet.
 *
 * @param bounds - Geometric bounds from getCabinetGeometricBounds
 * @returns Position for the legs group
 */
export function getLegsAnchorPoint(bounds: CabinetGeometricBounds): LegsAnchor {
  return {
    // Use geometric center for X/Z, Y=0 (ground level where legs stand)
    position: [bounds.geometricCenter[0], 0, bounds.geometricCenter[2]],
    rotation: bounds.rotation,
  };
}

/**
 * Get geometric bounds from preview transforms (for transform preview rendering).
 *
 * @param parts - Original parts (for metadata)
 * @param previewTransforms - Map of part ID to preview position/rotation
 * @returns Geometric bounds based on preview positions
 */
export function getCabinetGeometricBoundsFromPreview(
  parts: Part[],
  previewTransforms: Map<string, { position: Position; rotation: Position }>
): CabinetGeometricBounds {
  const bodyParts = parts.filter((p) => isBodyPartRole(p.cabinetMetadata?.role));
  const partsToUse = bodyParts.length > 0 ? bodyParts : parts;

  if (partsToUse.length === 0 || previewTransforms.size === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      geometricCenter: [0, 0, 0],
      rotation: new Quaternion(),
      localDimensions: { width: 0, height: 0, depth: 0 },
    };
  }

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const part of partsToUse) {
    const transform = previewTransforms.get(part.id);
    if (!transform) continue;

    const [px, py, pz] = transform.position;

    // Use preview rotation for extent calculation
    const rotationQuat = new Quaternion().setFromEuler(
      new Euler(transform.rotation[0], transform.rotation[1], transform.rotation[2])
    );

    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    const extentX = new Vector3(halfW, 0, 0).applyQuaternion(rotationQuat);
    const extentY = new Vector3(0, halfH, 0).applyQuaternion(rotationQuat);
    const extentZ = new Vector3(0, 0, halfD).applyQuaternion(rotationQuat);

    const worldHalfW = Math.abs(extentX.x) + Math.abs(extentY.x) + Math.abs(extentZ.x);
    const worldHalfH = Math.abs(extentX.y) + Math.abs(extentY.y) + Math.abs(extentZ.y);
    const worldHalfD = Math.abs(extentX.z) + Math.abs(extentY.z) + Math.abs(extentZ.z);

    minX = Math.min(minX, px - worldHalfW);
    maxX = Math.max(maxX, px + worldHalfW);
    minY = Math.min(minY, py - worldHalfH);
    maxY = Math.max(maxY, py + worldHalfH);
    minZ = Math.min(minZ, pz - worldHalfD);
    maxZ = Math.max(maxZ, pz + worldHalfD);
  }

  if (minX === Infinity) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      geometricCenter: [0, 0, 0],
      rotation: new Quaternion(),
      localDimensions: { width: 0, height: 0, depth: 0 },
    };
  }

  const geometricCenter: Position = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];

  // Get rotation from reference part's preview transform
  const referencePart =
    partsToUse.find((p) => p.cabinetMetadata?.role === "BOTTOM") ??
    partsToUse.find((p) => p.cabinetMetadata?.role === "CORNER_BOTTOM") ??
    partsToUse[0];

  const refTransform = previewTransforms.get(referencePart?.id ?? "");
  let rotation = new Quaternion();

  if (refTransform && referencePart) {
    const currentRotation = new Quaternion().setFromEuler(
      new Euler().fromArray(refTransform.rotation)
    );
    const role = referencePart.cabinetMetadata?.role ?? "BOTTOM";
    const defaultRotationArray = DEFAULT_PART_ROTATIONS[role] ?? [0, 0, 0];
    const defaultRotation = new Quaternion().setFromEuler(
      new Euler().fromArray(defaultRotationArray)
    );
    rotation = currentRotation.clone().multiply(defaultRotation.clone().invert());
  }

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;
  const worldDepth = maxZ - minZ;
  const localDimensions = calculateLocalDimensions(worldWidth, worldDepth, worldHeight, rotation);

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    geometricCenter,
    rotation,
    localDimensions,
  };
}

/**
 * Get local bounds for countertop calculation from a cabinet.
 * Returns rotation-invariant dimensions that don't change when cabinet rotates.
 *
 * @param cabinet - Cabinet with parts
 * @param parts - All parts in the project
 * @returns Local bounds for countertop positioning
 */
export function getCabinetLocalBounds(cabinet: Cabinet, parts: Part[]): CabinetLocalBounds {
  const cabinetParts = parts.filter((p) => cabinet.partIds.includes(p.id));
  const bounds = getCabinetGeometricBounds(cabinetParts);

  return {
    localWidth: bounds.localDimensions.width,
    localDepth: bounds.localDimensions.depth,
    topY: bounds.max[1],
    worldCenter: bounds.geometricCenter,
    rotation: bounds.rotation,
  };
}

/**
 * Calculate combined local dimensions for multiple cabinets (for countertop segments).
 * Accounts for gaps between cabinets in local space.
 *
 * @param cabinets - Cabinets in the segment
 * @param parts - All parts
 * @returns Combined local width, max local depth, max topY, and combined center
 */
export function getCombinedCabinetLocalBounds(
  cabinets: Cabinet[],
  parts: Part[]
): {
  localWidth: number;
  localDepth: number;
  topY: number;
  worldCenter: Position;
  rotation: Quaternion;
} {
  if (cabinets.length === 0) {
    return {
      localWidth: 0,
      localDepth: 0,
      topY: 0,
      worldCenter: [0, 0, 0],
      rotation: new Quaternion(),
    };
  }

  // Get bounds for each cabinet
  const allBounds = cabinets.map((c) => getCabinetLocalBounds(c, parts));

  // Use first cabinet's rotation as reference
  const rotation = allBounds[0].rotation;

  // Calculate world-space bounding box to get combined center and gap-inclusive width
  let minX = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxZ = -Infinity;
  let maxTopY = -Infinity;
  let maxLocalDepth = 0;

  for (const bound of allBounds) {
    // Get world bounds for this cabinet
    const cabinetParts = cabinets.find((c) => {
      const cb = getCabinetLocalBounds(c, parts);
      return cb.worldCenter[0] === bound.worldCenter[0];
    });

    if (cabinetParts) {
      const cab = cabinetParts;
      const cabParts = parts.filter((p) => cab.partIds.includes(p.id));
      const geoBounds = getCabinetGeometricBounds(cabParts);

      minX = Math.min(minX, geoBounds.min[0]);
      maxX = Math.max(maxX, geoBounds.max[0]);
      minZ = Math.min(minZ, geoBounds.min[2]);
      maxZ = Math.max(maxZ, geoBounds.max[2]);
    }

    maxTopY = Math.max(maxTopY, bound.topY);
    maxLocalDepth = Math.max(maxLocalDepth, bound.localDepth);
  }

  // Calculate total world span and convert to local width
  const worldSpanX = maxX - minX;
  const worldSpanZ = maxZ - minZ;

  // Convert world span to local dimensions using rotation
  const localSpan = calculateLocalDimensions(worldSpanX, worldSpanZ, 0, rotation);

  // Use the larger dimension as width (assuming cabinets are arranged in a line)
  const localWidth = Math.max(localSpan.width, localSpan.depth);

  const worldCenter: Position = [
    (minX + maxX) / 2,
    allBounds.reduce((sum, b) => sum + b.topY, 0) / allBounds.length,
    (minZ + maxZ) / 2,
  ];

  return {
    localWidth,
    localDepth: maxLocalDepth,
    topY: maxTopY,
    worldCenter,
    rotation,
  };
}

// ============================================================================
// EXPORT DOMAIN OBJECT
// ============================================================================

export const CabinetTransformDomain = {
  // Calculators
  getCabinetGeometricBounds,
  getCabinetGeometricBoundsFromPreview,
  getLegsAnchorPoint,
  getCabinetLocalBounds,
  getCombinedCabinetLocalBounds,
};

export default CabinetTransformDomain;
