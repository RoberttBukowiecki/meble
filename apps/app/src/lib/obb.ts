/**
 * Oriented Bounding Box (OBB) Math Utilities
 *
 * Provides calculations for OBBs that rotate with objects,
 * used in Snap V2 for group-to-group snapping.
 */

import type { Part } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type Vec3 = [number, number, number];

/**
 * Oriented Bounding Box - rotates with the object
 */
export interface OrientedBoundingBox {
  center: Vec3;
  halfExtents: Vec3; // Half-size in local space
  rotation: Vec3; // Euler angles (XYZ)
  axes: [Vec3, Vec3, Vec3]; // Local X, Y, Z axes in world space
}

/**
 * Face of an OBB in world space
 */
export interface OBBFace {
  center: Vec3;
  normal: Vec3; // Outward-facing normal in world space
  halfSize: [number, number]; // Half-width and half-height
  corners: Vec3[]; // 4 corners in world space
  axisIndex: 0 | 1 | 2; // Which local axis this face is perpendicular to
  sign: 1 | -1; // Positive or negative side of axis
}

/**
 * Edge of an OBB in world space
 */
export interface OBBEdge {
  start: Vec3;
  end: Vec3;
  direction: Vec3;
  midpoint: Vec3;
}

// ============================================================================
// Vector Math Utilities
// ============================================================================

export const vec3Add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vec3Sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vec3Scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
export const vec3Dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vec3Cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vec3Length = (v: Vec3): number => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
export const vec3Normalize = (v: Vec3): Vec3 => {
  const len = vec3Length(v);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
};
export const vec3Distance = (a: Vec3, b: Vec3): number => vec3Length(vec3Sub(a, b));
export const vec3Negate = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

// ============================================================================
// Rotation Utilities
// ============================================================================

/**
 * Apply Euler rotation (XYZ order) to a point
 */
export function rotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;

  // Pre-compute sin/cos
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  let [x, y, z] = point;

  // Rotate X
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  y = y1;
  z = z1;

  // Rotate Y
  const x1 = x * cy + z * sy;
  const z2 = -x * sy + z * cy;
  x = x1;
  z = z2;

  // Rotate Z
  const x2 = x * cz - y * sz;
  const y2 = x * sz + y * cz;

  return [x2, y2, z];
}

/**
 * Extract local axes from rotation (in world space)
 */
export function getRotationAxes(rotation: Vec3): [Vec3, Vec3, Vec3] {
  return [
    vec3Normalize(rotatePoint([1, 0, 0], rotation)),
    vec3Normalize(rotatePoint([0, 1, 0], rotation)),
    vec3Normalize(rotatePoint([0, 0, 1], rotation)),
  ];
}

/**
 * Create rotation matrix from Euler angles (XYZ order)
 * Returns 3x3 matrix as flat array [row0, row1, row2]
 */
export function createRotationMatrix(rotation: Vec3): number[] {
  const [rx, ry, rz] = rotation;

  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Combined rotation matrix (XYZ order)
  return [
    cy * cz, -cy * sz, sy,
    sx * sy * cz + cx * sz, -sx * sy * sz + cx * cz, -sx * cy,
    -cx * sy * cz + sx * sz, cx * sy * sz + sx * cz, cx * cy,
  ];
}

/**
 * Transform point by rotation matrix
 */
export function transformByMatrix(point: Vec3, matrix: number[]): Vec3 {
  return [
    matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2],
    matrix[3] * point[0] + matrix[4] * point[1] + matrix[5] * point[2],
    matrix[6] * point[0] + matrix[7] * point[1] + matrix[8] * point[2],
  ];
}

/**
 * Transpose 3x3 matrix (for inverse of rotation matrix)
 */
export function transposeMatrix(matrix: number[]): number[] {
  return [
    matrix[0], matrix[3], matrix[6],
    matrix[1], matrix[4], matrix[7],
    matrix[2], matrix[5], matrix[8],
  ];
}

// ============================================================================
// OBB Creation
// ============================================================================

/**
 * Create OBB from a single part
 */
export function createOBBFromPart(part: Part): OrientedBoundingBox {
  return {
    center: [...part.position],
    halfExtents: [part.width / 2, part.height / 2, part.depth / 2],
    rotation: [...part.rotation],
    axes: getRotationAxes(part.rotation),
  };
}

/**
 * Create OBB from a set of parts with group rotation
 * Calculates the tightest OBB that contains all parts
 */
export function createOBBFromParts(
  parts: Part[],
  groupRotation: Vec3 = [0, 0, 0]
): OrientedBoundingBox {
  if (parts.length === 0) {
    return {
      center: [0, 0, 0],
      halfExtents: [0, 0, 0],
      rotation: groupRotation,
      axes: getRotationAxes(groupRotation),
    };
  }

  if (parts.length === 1) {
    // For single part, use its rotation if group rotation is zero
    const hasGroupRotation = groupRotation[0] !== 0 || groupRotation[1] !== 0 || groupRotation[2] !== 0;
    if (!hasGroupRotation) {
      return createOBBFromPart(parts[0]);
    }
  }

  // Create inverse rotation matrix to transform world -> local space
  const rotMatrix = createRotationMatrix(groupRotation);
  const invRotMatrix = transposeMatrix(rotMatrix);

  // Transform all part corners to group's local space and find bounds
  const localMin: Vec3 = [Infinity, Infinity, Infinity];
  const localMax: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const part of parts) {
    const corners = getPartCorners(part);
    for (const corner of corners) {
      // Transform corner to local space
      const localCorner = transformByMatrix(corner, invRotMatrix);

      localMin[0] = Math.min(localMin[0], localCorner[0]);
      localMin[1] = Math.min(localMin[1], localCorner[1]);
      localMin[2] = Math.min(localMin[2], localCorner[2]);

      localMax[0] = Math.max(localMax[0], localCorner[0]);
      localMax[1] = Math.max(localMax[1], localCorner[1]);
      localMax[2] = Math.max(localMax[2], localCorner[2]);
    }
  }

  // Calculate center and half-extents in local space
  const localCenter: Vec3 = [
    (localMin[0] + localMax[0]) / 2,
    (localMin[1] + localMax[1]) / 2,
    (localMin[2] + localMax[2]) / 2,
  ];

  const halfExtents: Vec3 = [
    (localMax[0] - localMin[0]) / 2,
    (localMax[1] - localMin[1]) / 2,
    (localMax[2] - localMin[2]) / 2,
  ];

  // Transform center back to world space
  const worldCenter = transformByMatrix(localCenter, rotMatrix);

  return {
    center: worldCenter,
    halfExtents,
    rotation: groupRotation,
    axes: getRotationAxes(groupRotation),
  };
}

/**
 * Get 8 corners of a part's bounding box in world space
 */
export function getPartCorners(part: Part): Vec3[] {
  const halfW = part.width / 2;
  const halfH = part.height / 2;
  const halfD = part.depth / 2;

  // Local space corners
  const localCorners: Vec3[] = [
    [-halfW, -halfH, -halfD],
    [halfW, -halfH, -halfD],
    [halfW, halfH, -halfD],
    [-halfW, halfH, -halfD],
    [-halfW, -halfH, halfD],
    [halfW, -halfH, halfD],
    [halfW, halfH, halfD],
    [-halfW, halfH, halfD],
  ];

  // Transform to world space
  return localCorners.map((corner) => {
    const rotated = rotatePoint(corner, part.rotation);
    return vec3Add(rotated, part.position);
  });
}

// ============================================================================
// OBB Face Calculations
// ============================================================================

/**
 * Get 6 faces of OBB in world space
 */
export function getOBBFaces(obb: OrientedBoundingBox): OBBFace[] {
  const { center, halfExtents, axes } = obb;
  const faces: OBBFace[] = [];

  // Define faces for each axis (+/- direction)
  const faceDefinitions: Array<{ axisIndex: 0 | 1 | 2; sign: 1 | -1 }> = [
    { axisIndex: 0, sign: 1 },  // +X (right)
    { axisIndex: 0, sign: -1 }, // -X (left)
    { axisIndex: 1, sign: 1 },  // +Y (top)
    { axisIndex: 1, sign: -1 }, // -Y (bottom)
    { axisIndex: 2, sign: 1 },  // +Z (front)
    { axisIndex: 2, sign: -1 }, // -Z (back)
  ];

  for (const { axisIndex, sign } of faceDefinitions) {
    // Calculate face center
    const faceCenter = vec3Add(
      center,
      vec3Scale(axes[axisIndex], halfExtents[axisIndex] * sign)
    );

    // Face normal points outward
    const normal = sign === 1 ? axes[axisIndex] : vec3Negate(axes[axisIndex]);

    // Calculate face half-sizes based on which axes are tangent to this face
    const tangentAxes = [
      axisIndex === 0 ? 1 : 0,
      axisIndex === 2 ? 1 : 2,
    ];
    const halfSize: [number, number] = [
      halfExtents[tangentAxes[0]],
      halfExtents[tangentAxes[1]],
    ];

    // Calculate corners
    const tangent1 = axes[tangentAxes[0]];
    const tangent2 = axes[tangentAxes[1]];
    const corners: Vec3[] = [
      vec3Add(vec3Add(faceCenter, vec3Scale(tangent1, -halfSize[0])), vec3Scale(tangent2, -halfSize[1])),
      vec3Add(vec3Add(faceCenter, vec3Scale(tangent1, halfSize[0])), vec3Scale(tangent2, -halfSize[1])),
      vec3Add(vec3Add(faceCenter, vec3Scale(tangent1, halfSize[0])), vec3Scale(tangent2, halfSize[1])),
      vec3Add(vec3Add(faceCenter, vec3Scale(tangent1, -halfSize[0])), vec3Scale(tangent2, halfSize[1])),
    ];

    faces.push({
      center: faceCenter,
      normal,
      halfSize,
      corners,
      axisIndex,
      sign,
    });
  }

  return faces;
}

/**
 * Get 12 edges of OBB in world space
 */
export function getOBBEdges(obb: OrientedBoundingBox): OBBEdge[] {
  const { center, halfExtents, axes } = obb;
  const edges: OBBEdge[] = [];

  // Get all 8 corners first
  const corners: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    const signX = (i & 1) ? 1 : -1;
    const signY = (i & 2) ? 1 : -1;
    const signZ = (i & 4) ? 1 : -1;

    const corner = vec3Add(
      vec3Add(
        vec3Add(center, vec3Scale(axes[0], halfExtents[0] * signX)),
        vec3Scale(axes[1], halfExtents[1] * signY)
      ),
      vec3Scale(axes[2], halfExtents[2] * signZ)
    );
    corners.push(corner);
  }

  // Edge indices (pairs of corner indices)
  const edgeIndices: [number, number][] = [
    // Bottom face edges (Y = -1)
    [0, 1], [1, 3], [3, 2], [2, 0],
    // Top face edges (Y = +1)
    [4, 5], [5, 7], [7, 6], [6, 4],
    // Vertical edges
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  for (const [i, j] of edgeIndices) {
    const start = corners[i];
    const end = corners[j];
    const direction = vec3Normalize(vec3Sub(end, start));
    const midpoint: Vec3 = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ];

    edges.push({ start, end, direction, midpoint });
  }

  return edges;
}

// ============================================================================
// OBB Distance Calculations
// ============================================================================

/** Threshold for considering faces opposite (dot product) */
const OPPOSITE_THRESHOLD = -0.95;

/**
 * Calculate distance between two OBB faces
 * Returns null if faces are not opposite-facing
 */
export function calculateFaceToFaceDistance(
  faceA: OBBFace,
  faceB: OBBFace
): number | null {
  // Check if faces are opposite (normals point toward each other)
  const dotProduct = vec3Dot(faceA.normal, faceB.normal);
  if (dotProduct > OPPOSITE_THRESHOLD) return null; // Not opposite-facing

  // Project face centers onto shared normal
  const centerDiff = vec3Sub(faceB.center, faceA.center);
  const distance = Math.abs(vec3Dot(centerDiff, faceA.normal));

  return distance;
}

/**
 * Check if two OBB faces can snap (opposite normals, within range)
 */
export function canFacesSnap(
  faceA: OBBFace,
  faceB: OBBFace,
  maxDistance: number
): boolean {
  const distance = calculateFaceToFaceDistance(faceA, faceB);
  return distance !== null && distance <= maxDistance;
}

/**
 * Calculate snap offset to align two faces
 * Returns the vector to add to source's position to snap to target
 */
export function calculateFaceSnapOffset(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  collisionOffset: number
): Vec3 {
  // Direction from source to target face
  const centerDiff = vec3Sub(targetFace.center, sourceFace.center);
  const signedDistance = vec3Dot(centerDiff, sourceFace.normal);

  // Calculate offset to bring faces together (with collision offset)
  // Move source toward target face, leaving a small gap
  const adjustedDistance = signedDistance > 0
    ? signedDistance - collisionOffset
    : signedDistance + collisionOffset;

  return vec3Scale(sourceFace.normal, adjustedDistance);
}

// ============================================================================
// OBB Bounding Sphere (for early exit optimization)
// ============================================================================

/**
 * Calculate bounding sphere radius for an OBB
 */
export function getOBBBoundingSphereRadius(obb: OrientedBoundingBox): number {
  const { halfExtents } = obb;
  return Math.sqrt(
    halfExtents[0] * halfExtents[0] +
    halfExtents[1] * halfExtents[1] +
    halfExtents[2] * halfExtents[2]
  );
}

/**
 * Check if two OBBs are potentially close enough to snap
 * Uses bounding sphere check for early exit
 */
export function areOBBsWithinSnapRange(
  obbA: OrientedBoundingBox,
  obbB: OrientedBoundingBox,
  maxSnapDistance: number
): boolean {
  const radiusA = getOBBBoundingSphereRadius(obbA);
  const radiusB = getOBBBoundingSphereRadius(obbB);
  const centerDistance = vec3Distance(obbA.center, obbB.center);

  return centerDistance <= radiusA + radiusB + maxSnapDistance;
}
