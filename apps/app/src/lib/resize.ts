/**
 * Resize Engine
 * Handles part resize calculations with snap integration and collision detection.
 */

import type {
  Part,
  ResizeHandle,
  ResizeResult,
  ResizeConstraints,
  SnapSettings,
  SnapPoint,
} from '@/types';
import { createOBBFromPart, getOBBFaces } from './obb';

/**
 * Get part faces in the format expected by resize operations
 */
function getPartFaces(part: Part) {
  const obb = createOBBFromPart(part);
  return getOBBFaces(obb);
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum dimension in mm */
const MIN_DIMENSION = 10;

/** Maximum dimension in mm */
const MAX_DIMENSION = 10000;

// ============================================================================
// Types
// ============================================================================

type Vec3 = [number, number, number];

// ============================================================================
// Utilities
// ============================================================================

const vec3Add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vec3Scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];

/**
 * Apply Euler rotation (XYZ order) to a vector
 */
function rotateVector(vec: Vec3, rotation: Vec3): Vec3 {
  // Match Three.js Euler 'XYZ' rotation matrix to stay consistent with R3F objects
  const [rx, ry, rz] = rotation;

  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  // Matrix components from THREE.Matrix4.setFromEuler (order: XYZ)
  const m11 = cy * cz;
  const m12 = -cy * sz;
  const m13 = sy;

  const m21 = sx * sy * cz + cx * sz;
  const m22 = -sx * sy * sz + cx * cz;
  const m23 = -sx * cy;

  const m31 = -cx * sy * cz + sx * sz;
  const m32 = cx * sy * sz + sx * cz;
  const m33 = cx * cy;

  const [x, y, z] = vec;

  return [
    m11 * x + m12 * y + m13 * z,
    m21 * x + m22 * y + m23 * z,
    m31 * x + m32 * y + m33 * z,
  ];
}

// ============================================================================
// Handle to Axis Mapping
// ============================================================================

interface HandleInfo {
  axis: 'width' | 'height' | 'depth';
  direction: 1 | -1; // +1 for positive direction, -1 for negative
  localNormal: Vec3;
}

const HANDLE_INFO: Record<ResizeHandle, HandleInfo> = {
  'width+': { axis: 'width', direction: 1, localNormal: [1, 0, 0] },
  'width-': { axis: 'width', direction: -1, localNormal: [-1, 0, 0] },
  'height+': { axis: 'height', direction: 1, localNormal: [0, 1, 0] },
  'height-': { axis: 'height', direction: -1, localNormal: [0, -1, 0] },
  'depth+': { axis: 'depth', direction: 1, localNormal: [0, 0, 1] },
  'depth-': { axis: 'depth', direction: -1, localNormal: [0, 0, -1] },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get resize constraints for a dimension
 */
export function getResizeConstraints(
  part: Part,
  dimension: 'width' | 'height' | 'depth',
  allParts: Part[],
  snapSettings: SnapSettings
): ResizeConstraints {
  const currentValue = part[dimension];

  // Basic constraints
  const min = MIN_DIMENSION;
  const max = MAX_DIMENSION;

  // Find potential snap targets in the resize direction
  const snapTargets: ResizeConstraints['snapTargets'] = [];

  if (snapSettings.faceSnap) {
    const faces = getPartFaces(part);

    // Get faces perpendicular to the resize axis
    const faceIndices =
      dimension === 'width' ? [0, 1] : // +X, -X
      dimension === 'height' ? [2, 3] : // +Y, -Y
      [4, 5]; // +Z, -Z

    for (const targetPart of allParts) {
      if (targetPart.id === part.id) continue;
      if (
        part.cabinetMetadata?.cabinetId &&
        targetPart.cabinetMetadata?.cabinetId === part.cabinetMetadata.cabinetId
      ) {
        continue;
      }

      const targetFaces = getPartFaces(targetPart);

      for (const faceIdx of faceIndices) {
        const face = faces[faceIdx];

        for (const targetFace of targetFaces) {
          // Check if faces could align (opposite normals)
          const dot =
            face.normal[0] * targetFace.normal[0] +
            face.normal[1] * targetFace.normal[1] +
            face.normal[2] * targetFace.normal[2];

          if (dot > -0.95) continue;

          // Calculate distance to target face
          const diff = [
            targetFace.center[0] - face.center[0],
            targetFace.center[1] - face.center[1],
            targetFace.center[2] - face.center[2],
          ];
          const distance = Math.abs(
            diff[0] * face.normal[0] +
            diff[1] * face.normal[1] +
            diff[2] * face.normal[2]
          );

          // Calculate what the dimension would need to be to snap
          // Subtract collision offset to prevent overlapping
          const collisionOffset = snapSettings.collisionOffset ?? 1.0;
          const dimensionDelta = Math.max(0, distance - collisionOffset);
          const newDimension = currentValue + dimensionDelta;

          if (newDimension >= min && newDimension <= max) {
            snapTargets.push({
              value: newDimension,
              distance: dimensionDelta,
              partId: targetPart.id,
            });
          }
        }
      }
    }
  }

  // Sort snap targets by distance
  snapTargets.sort((a, b) => a.distance - b.distance);

  return { min, max, snapTargets: snapTargets.slice(0, 5) };
}

/**
 * Calculate position adjustment for resize
 *
 * When resizing from a handle, the part may need to move to keep
 * the opposite face stationary.
 */
export function calculateResizePositionAdjustment(
  part: Part,
  handle: ResizeHandle,
  oldDimension: number,
  newDimension: number
): Vec3 {
  const info = HANDLE_INFO[handle];
  const delta = newDimension - oldDimension;

  // The center shifts by half the delta in the handle direction
  // Because we're expanding from one side, not both
  const shift = delta / 2 * info.direction;

  // Create local offset vector
  let localOffset: Vec3 = [0, 0, 0];
  if (info.axis === 'width') {
    localOffset = [shift, 0, 0];
  } else if (info.axis === 'height') {
    localOffset = [0, shift, 0];
  } else {
    localOffset = [0, 0, shift];
  }

  // Transform to world space by applying part's rotation
  return rotateVector(localOffset, part.rotation);
}

/**
 * Apply snap during resize
 */
function applyResizeSnap(
  part: Part,
  newDimension: number,
  dimensionAxis: 'width' | 'height' | 'depth',
  handle: ResizeHandle,
  allParts: Part[],
  snapSettings: SnapSettings
): { dimension: number; snapped: boolean; snapPoints: SnapPoint[] } {
  if (!snapSettings.faceSnap) {
    return { dimension: newDimension, snapped: false, snapPoints: [] };
  }

  const constraints = getResizeConstraints(part, dimensionAxis, allParts, snapSettings);

  // Map dimension axis to snap axis
  const axisMap: Record<'width' | 'height' | 'depth', 'X' | 'Y' | 'Z'> = {
    width: 'X',
    height: 'Y',
    depth: 'Z',
  };

  // Check if any snap target is within snap distance
  for (const target of constraints.snapTargets) {
    const diff = Math.abs(target.value - newDimension);
    if (diff <= snapSettings.distance) {
      return {
        dimension: target.value,
        snapped: true,
        snapPoints: [
          {
            id: `resize-snap-${target.partId}`,
            type: 'face',
            position: part.position, // Approximate
            normal: [0, 0, 0],
            partId: target.partId,
            strength: 1 - diff / snapSettings.distance,
            axis: axisMap[dimensionAxis],
          },
        ],
      };
    }
  }

  return { dimension: newDimension, snapped: false, snapPoints: [] };
}

/**
 * Simple collision detection for resize preview
 */
function detectResizeCollisions(
  part: Part,
  newWidth: number,
  newHeight: number,
  newDepth: number,
  newPosition: Vec3,
  allParts: Part[]
): string[] {
  const collisionPartIds: string[] = [];

  // Create a temporary part with new dimensions
  const tempPart: Part = {
    ...part,
    width: newWidth,
    height: newHeight,
    depth: newDepth,
    position: newPosition,
  };

  // Simple AABB overlap check (approximate for rotated parts)
  for (const other of allParts) {
    if (other.id === part.id) continue;
    if (
      part.cabinetMetadata?.cabinetId &&
      other.cabinetMetadata?.cabinetId === part.cabinetMetadata.cabinetId
    ) {
      continue;
    }

    // Get half extents
    const halfA = [tempPart.width / 2, tempPart.height / 2, tempPart.depth / 2];
    const halfB = [other.width / 2, other.height / 2, other.depth / 2];

    // Check AABB overlap (simplified, ignores rotation)
    const overlap =
      Math.abs(tempPart.position[0] - other.position[0]) < halfA[0] + halfB[0] &&
      Math.abs(tempPart.position[1] - other.position[1]) < halfA[1] + halfB[1] &&
      Math.abs(tempPart.position[2] - other.position[2]) < halfA[2] + halfB[2];

    if (overlap) {
      collisionPartIds.push(other.id);
    }
  }

  return collisionPartIds;
}

/**
 * Calculate resize for a part being resized
 *
 * @param part - The part being resized
 * @param handle - Which resize handle is being dragged
 * @param dragOffset - World-space drag offset from handle
 * @param allParts - All parts in the scene
 * @param snapEnabled - Whether snap is enabled
 * @param snapSettings - Snap settings
 * @returns Resize result with new dimensions, position, and collision info
 */
export function calculateResize(
  part: Part,
  handle: ResizeHandle,
  dragOffset: Vec3,
  allParts: Part[],
  snapEnabled: boolean,
  snapSettings: SnapSettings
): ResizeResult {
  const info = HANDLE_INFO[handle];

  // Get the world-space normal for this handle
  const worldNormal = rotateVector(info.localNormal, part.rotation);

  // Project drag offset onto handle's normal direction
  // projectedDelta is positive when dragging outward from the handle
  const projectedDelta =
    dragOffset[0] * worldNormal[0] +
    dragOffset[1] * worldNormal[1] +
    dragOffset[2] * worldNormal[2];

  // Calculate new dimension
  // Dragging outward should ALWAYS increase dimension, regardless of which handle
  // (direction only affects position adjustment, not dimension change)
  const currentDimension = part[info.axis];
  let newDimension = currentDimension + projectedDelta;

  // Apply constraints
  newDimension = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, newDimension));

  // Apply snap if enabled
  let snapped = false;
  let snapPoints: SnapPoint[] = [];

  if (snapEnabled) {
    const snapResult = applyResizeSnap(
      part,
      newDimension,
      info.axis,
      handle,
      allParts,
      snapSettings
    );
    newDimension = snapResult.dimension;
    snapped = snapResult.snapped;
    snapPoints = snapResult.snapPoints;
  }

  // Calculate new dimensions
  const newWidth = info.axis === 'width' ? newDimension : part.width;
  const newHeight = info.axis === 'height' ? newDimension : part.height;
  const newDepth = info.axis === 'depth' ? newDimension : part.depth;

  // Calculate position adjustment
  const positionAdjustment = calculateResizePositionAdjustment(
    part,
    handle,
    currentDimension,
    newDimension
  );
  const newPosition = vec3Add(part.position, positionAdjustment);

  // Detect collisions
  const collisionPartIds = detectResizeCollisions(
    part,
    newWidth,
    newHeight,
    newDepth,
    newPosition,
    allParts
  );

  return {
    newWidth,
    newHeight,
    newDepth,
    newPosition,
    snapped,
    snapPoints,
    collision: collisionPartIds.length > 0,
    collisionPartIds,
  };
}

/**
 * Get handle position in world space for a given part and handle
 */
export function getHandlePosition(part: Part, handle: ResizeHandle): Vec3 {
  const info = HANDLE_INFO[handle];

  // Calculate local position of handle (center of face)
  let localPos: Vec3 = [0, 0, 0];
  if (info.axis === 'width') {
    localPos = [part.width / 2 * info.direction, 0, 0];
  } else if (info.axis === 'height') {
    localPos = [0, part.height / 2 * info.direction, 0];
  } else {
    localPos = [0, 0, part.depth / 2 * info.direction];
  }

  // Transform to world space
  const rotatedPos = rotateVector(localPos, part.rotation);
  return vec3Add(rotatedPos, part.position);
}

/**
 * Get handle normal in world space
 */
export function getHandleNormal(part: Part, handle: ResizeHandle): Vec3 {
  const info = HANDLE_INFO[handle];
  return rotateVector(info.localNormal, part.rotation);
}
