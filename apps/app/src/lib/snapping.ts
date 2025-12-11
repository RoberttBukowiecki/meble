/**
 * Snapping Engine
 * Provides intelligent snap calculations for parts during transform operations.
 *
 * Performance optimizations:
 * - Early exit using bounding sphere checks
 * - Spatial partitioning not needed for < 1000 parts
 * - Reuses vector calculations where possible
 */

import type {
  Part,
  SnapSettings,
  SnapResult,
  SnapCandidate,
  SnapPoint,
  BoundingEdge,
  BoundingFace,
  SnapAxisConstraint,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

/** Threshold for considering vectors parallel (dot product) */
const PARALLEL_THRESHOLD = 0.95;

/** Threshold for considering faces opposite (dot product) */
const OPPOSITE_THRESHOLD = -0.95;

/** Maximum candidates to consider for performance */
const MAX_CANDIDATES = 20;

/** Maximum snap points to return for visualization */
const MAX_SNAP_POINTS = 5;

// ============================================================================
// Vector Math Utilities (inline for performance)
// ============================================================================

type Vec3 = [number, number, number];

const vec3Add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vec3Sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vec3Scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
const vec3Dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vec3Length = (v: Vec3): number => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const vec3Normalize = (v: Vec3): Vec3 => {
  const len = vec3Length(v);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
};
const vec3Distance = (a: Vec3, b: Vec3): number => vec3Length(vec3Sub(a, b));

/**
 * Apply axis constraint to a vector offset
 * Only keeps components for axes included in the constraint
 */
function applyAxisConstraint(offset: Vec3, axis: SnapAxisConstraint): Vec3 {
  if (!axis || axis === 'XYZ') return offset;

  const hasX = axis.includes('X');
  const hasY = axis.includes('Y');
  const hasZ = axis.includes('Z');

  return [
    hasX ? offset[0] : 0,
    hasY ? offset[1] : 0,
    hasZ ? offset[2] : 0,
  ];
}

/**
 * Check if a snap offset is primarily aligned with the given axis constraint
 * Returns true if the dominant component of the offset matches the constraint
 */
function isOffsetAlignedWithAxis(offset: Vec3, axis: SnapAxisConstraint): boolean {
  if (!axis || axis === 'XYZ') return true;

  const absX = Math.abs(offset[0]);
  const absY = Math.abs(offset[1]);
  const absZ = Math.abs(offset[2]);
  const maxComponent = Math.max(absX, absY, absZ);

  // Threshold: dominant axis should be at least 70% of the offset
  const threshold = maxComponent * 0.7;

  const hasX = axis.includes('X');
  const hasY = axis.includes('Y');
  const hasZ = axis.includes('Z');

  // Check if dominant axis matches constraint
  if (absX >= threshold && hasX) return true;
  if (absY >= threshold && hasY) return true;
  if (absZ >= threshold && hasZ) return true;

  return false;
}

/**
 * Apply Euler rotation (XYZ order) to a point
 */
function rotatePoint(point: Vec3, rotation: Vec3): Vec3 {
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

// ============================================================================
// Geometry Calculations
// ============================================================================

/**
 * Get 8 corners of a part's bounding box in world space
 */
function getPartCorners(part: Part): Vec3[] {
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

/**
 * Calculate 12 edges of a part's bounding box in world space
 */
export function getPartEdges(part: Part): BoundingEdge[] {
  const corners = getPartCorners(part);

  // Edge indices (pairs of corner indices)
  const edgeIndices: [number, number][] = [
    // Bottom face edges
    [0, 1], [1, 2], [2, 3], [3, 0],
    // Top face edges
    [4, 5], [5, 6], [6, 7], [7, 4],
    // Vertical edges
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  return edgeIndices.map(([i, j]) => {
    const start = corners[i];
    const end = corners[j];
    const direction = vec3Normalize(vec3Sub(end, start));
    const midpoint: Vec3 = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ];
    return { start, end, direction, midpoint };
  });
}

/**
 * Calculate 6 faces of a part's bounding box in world space
 */
export function getPartFaces(part: Part): BoundingFace[] {
  const halfW = part.width / 2;
  const halfH = part.height / 2;
  const halfD = part.depth / 2;

  // Define faces in local space (center, normal, corner offsets)
  const localFaces: {
    center: Vec3;
    normal: Vec3;
    halfSize: [number, number];
    cornerOffsets: Vec3[];
  }[] = [
    // Right (+X)
    {
      center: [halfW, 0, 0],
      normal: [1, 0, 0],
      halfSize: [halfD, halfH],
      cornerOffsets: [
        [0, -halfH, -halfD],
        [0, halfH, -halfD],
        [0, halfH, halfD],
        [0, -halfH, halfD],
      ],
    },
    // Left (-X)
    {
      center: [-halfW, 0, 0],
      normal: [-1, 0, 0],
      halfSize: [halfD, halfH],
      cornerOffsets: [
        [0, -halfH, halfD],
        [0, halfH, halfD],
        [0, halfH, -halfD],
        [0, -halfH, -halfD],
      ],
    },
    // Top (+Y)
    {
      center: [0, halfH, 0],
      normal: [0, 1, 0],
      halfSize: [halfW, halfD],
      cornerOffsets: [
        [-halfW, 0, -halfD],
        [halfW, 0, -halfD],
        [halfW, 0, halfD],
        [-halfW, 0, halfD],
      ],
    },
    // Bottom (-Y)
    {
      center: [0, -halfH, 0],
      normal: [0, -1, 0],
      halfSize: [halfW, halfD],
      cornerOffsets: [
        [-halfW, 0, halfD],
        [halfW, 0, halfD],
        [halfW, 0, -halfD],
        [-halfW, 0, -halfD],
      ],
    },
    // Front (+Z)
    {
      center: [0, 0, halfD],
      normal: [0, 0, 1],
      halfSize: [halfW, halfH],
      cornerOffsets: [
        [-halfW, -halfH, 0],
        [halfW, -halfH, 0],
        [halfW, halfH, 0],
        [-halfW, halfH, 0],
      ],
    },
    // Back (-Z)
    {
      center: [0, 0, -halfD],
      normal: [0, 0, -1],
      halfSize: [halfW, halfH],
      cornerOffsets: [
        [halfW, -halfH, 0],
        [-halfW, -halfH, 0],
        [-halfW, halfH, 0],
        [halfW, halfH, 0],
      ],
    },
  ];

  return localFaces.map((face) => {
    const rotatedCenter = rotatePoint(face.center, part.rotation);
    const rotatedNormal = vec3Normalize(rotatePoint(face.normal, part.rotation));
    const corners = face.cornerOffsets.map((offset) => {
      const rotated = rotatePoint(vec3Add(face.center, offset), part.rotation);
      return vec3Add(rotated, part.position);
    });

    return {
      center: vec3Add(rotatedCenter, part.position),
      normal: rotatedNormal,
      corners,
      halfSize: face.halfSize,
    };
  });
}

/**
 * Calculate bounding sphere radius for early exit checks
 */
function getBoundingSphereRadius(part: Part): number {
  const halfW = part.width / 2;
  const halfH = part.height / 2;
  const halfD = part.depth / 2;
  return Math.sqrt(halfW * halfW + halfH * halfH + halfD * halfD);
}

// ============================================================================
// Snap Candidate Detection
// ============================================================================

/**
 * Get edge-to-edge snap candidates
 */
function getEdgeSnapCandidates(
  partA: Part,
  positionA: Vec3,
  partB: Part,
  snapDistance: number
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  // Create temporary part with new position for calculations
  const tempPartA: Part = { ...partA, position: positionA };
  const edgesA = getPartEdges(tempPartA);
  const edgesB = getPartEdges(partB);

  for (const edgeA of edgesA) {
    for (const edgeB of edgesB) {
      // Check if edges are parallel
      const dotProduct = Math.abs(vec3Dot(edgeA.direction, edgeB.direction));
      if (dotProduct < PARALLEL_THRESHOLD) continue;

      // Check distance between midpoints
      const distance = vec3Distance(edgeA.midpoint, edgeB.midpoint);
      if (distance > snapDistance * 3) continue; // Allow some slack for edge alignment

      // Calculate snap offset to align edge midpoints
      const snapOffset = vec3Sub(edgeB.midpoint, edgeA.midpoint);

      candidates.push({
        type: 'edge',
        targetPartId: partB.id,
        snapOffset,
        distance,
        alignment: dotProduct,
        visualGuide: {
          pointA: edgeA.midpoint,
          pointB: edgeB.midpoint,
        },
      });
    }
  }

  return candidates;
}

/**
 * Get face-to-face snap candidates
 * @param collisionOffset - Small offset to prevent collision detection (default 0)
 */
function getFaceSnapCandidates(
  partA: Part,
  positionA: Vec3,
  partB: Part,
  snapDistance: number,
  collisionOffset: number = 0
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  // Create temporary part with new position for calculations
  const tempPartA: Part = { ...partA, position: positionA };
  const facesA = getPartFaces(tempPartA);
  const facesB = getPartFaces(partB);

  for (const faceA of facesA) {
    for (const faceB of facesB) {
      // Check if faces are opposite (facing each other)
      const dotProduct = vec3Dot(faceA.normal, faceB.normal);
      if (dotProduct > OPPOSITE_THRESHOLD) continue;

      // Calculate distance between face centers along normal direction
      const centerDiff = vec3Sub(faceB.center, faceA.center);
      const signedDistance = vec3Dot(centerDiff, faceA.normal);
      const normalDistance = Math.abs(signedDistance);

      if (normalDistance > snapDistance) continue;

      // Calculate snap offset to bring faces into contact (with collision offset)
      // Move partA along its face normal direction toward partB's face
      // Use signed distance to ensure correct direction (toward target, not away)
      // Subtract collision offset to leave a tiny gap that prevents collision detection
      const adjustedDistance = signedDistance > 0
        ? signedDistance - collisionOffset
        : signedDistance + collisionOffset;
      const snapOffset = vec3Scale(faceA.normal, adjustedDistance);

      candidates.push({
        type: 'face',
        targetPartId: partB.id,
        snapOffset,
        distance: normalDistance,
        alignment: Math.abs(dotProduct),
        visualGuide: {
          pointA: faceA.center,
          pointB: faceB.center,
        },
      });
    }
  }

  return candidates;
}

// ============================================================================
// Snap Scoring and Selection
// ============================================================================

/**
 * Score a snap candidate based on distance and alignment
 */
function scoreSnapCandidate(candidate: SnapCandidate, settings: SnapSettings): number {
  const maxDistance = settings.distance;

  // Distance component (closer = higher score)
  const normalizedDistance = Math.min(candidate.distance / maxDistance, 1);
  const distanceScore =
    settings.strengthCurve === 'quadratic'
      ? Math.pow(1 - normalizedDistance, 2)
      : 1 - normalizedDistance;

  // Alignment component (better aligned = higher score)
  const alignmentScore = candidate.alignment;

  // Type priority: face-to-face gets bonus when very close
  const typeBonus = candidate.type === 'face' && candidate.distance < settings.distance / 2 ? 1.2 : 1.0;

  return distanceScore * alignmentScore * typeBonus;
}

/**
 * Convert snap candidate to snap point for visualization
 */
function candidateToSnapPoint(candidate: SnapCandidate, score: number): SnapPoint {
  return {
    id: `${candidate.type}-${candidate.targetPartId}-${candidate.visualGuide.pointA.join(',')}`,
    type: candidate.type,
    position: candidate.visualGuide.pointB,
    normal: [0, 0, 0], // Not needed for visualization
    partId: candidate.targetPartId,
    strength: Math.min(score, 1),
  };
}

// ============================================================================
// Main Snap Calculation
// ============================================================================

/**
 * Calculate snap for a part being transformed
 *
 * @param part - The part being moved
 * @param newPosition - The new position to snap from
 * @param allParts - All parts in the scene (will filter out same cabinet)
 * @param settings - Snap settings
 * @param axisConstraint - Optional axis constraint to limit snap to specific axes
 * @returns Snap result with snapped position and visual guides
 */
export function calculateSnap(
  part: Part,
  newPosition: Vec3,
  allParts: Part[],
  settings: SnapSettings,
  axisConstraint: SnapAxisConstraint = null
): SnapResult {
  // Early exit if snap is disabled
  if (!settings.edgeSnap && !settings.faceSnap) {
    return { snapped: false, position: newPosition, snapPoints: [] };
  }

  const candidates: Array<SnapCandidate & { score: number }> = [];
  const partRadius = getBoundingSphereRadius(part);
  const collisionOffset = settings.collisionOffset ?? 0.5;

  // Get potential snap targets
  const targets = allParts.filter((p) => {
    // Exclude self
    if (p.id === part.id) return false;

    // Exclude parts in same cabinet
    if (
      part.cabinetMetadata?.cabinetId &&
      p.cabinetMetadata?.cabinetId === part.cabinetMetadata.cabinetId
    ) {
      return false;
    }

    // Early exit: bounding sphere check
    const targetRadius = getBoundingSphereRadius(p);
    const centerDistance = vec3Distance(newPosition, p.position);
    const maxPossibleDistance = partRadius + targetRadius + settings.distance;

    return centerDistance <= maxPossibleDistance;
  });

  // Collect candidates from each target
  for (const target of targets) {
    if (settings.edgeSnap) {
      const edgeCandidates = getEdgeSnapCandidates(part, newPosition, target, settings.distance);
      for (const candidate of edgeCandidates) {
        // Skip candidates not aligned with drag axis
        if (axisConstraint && !isOffsetAlignedWithAxis(candidate.snapOffset, axisConstraint)) {
          continue;
        }
        const score = scoreSnapCandidate(candidate, settings);
        if (score > 0.1) {
          candidates.push({ ...candidate, score });
        }
      }
    }

    if (settings.faceSnap) {
      const faceCandidates = getFaceSnapCandidates(
        part,
        newPosition,
        target,
        settings.distance,
        collisionOffset
      );
      for (const candidate of faceCandidates) {
        // Skip candidates not aligned with drag axis
        if (axisConstraint && !isOffsetAlignedWithAxis(candidate.snapOffset, axisConstraint)) {
          continue;
        }
        const score = scoreSnapCandidate(candidate, settings);
        if (score > 0.1) {
          candidates.push({ ...candidate, score });
        }
      }
    }

    // Limit candidates for performance
    if (candidates.length > MAX_CANDIDATES * 2) {
      break;
    }
  }

  // No candidates found
  if (candidates.length === 0) {
    return { snapped: false, position: newPosition, snapPoints: [] };
  }

  // Sort by score and take best candidates
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, MAX_CANDIDATES);

  // Select best candidate
  const bestCandidate = topCandidates[0];

  // Get the snap offset (apply axis constraint to only move on allowed axes)
  let finalOffset = axisConstraint
    ? applyAxisConstraint(bestCandidate.snapOffset, axisConstraint)
    : bestCandidate.snapOffset;

  // Apply magnetic pull if enabled (gradually pull toward snap point)
  if (settings.magneticPull && bestCandidate.score < 1) {
    const pullStrength = bestCandidate.score;
    finalOffset = vec3Scale(finalOffset, pullStrength);
  }

  // Calculate snapped position
  const snappedPosition = vec3Add(newPosition, finalOffset);

  // Generate snap points for visualization (limit to MAX_SNAP_POINTS)
  const snapPoints = topCandidates
    .slice(0, MAX_SNAP_POINTS)
    .map((c) => candidateToSnapPoint(c, c.score));

  return {
    snapped: true,
    position: snappedPosition,
    snapPoints,
  };
}

/**
 * Get world-space bounding box extents for a rotated part on a specific axis
 * Returns [min, max] on the given axis, accounting for rotation
 */
function getRotatedBoundsOnAxis(
  position: Vec3,
  halfW: number,
  halfH: number,
  halfD: number,
  rotation: Vec3,
  axisIndex: number
): { min: number; max: number; halfExtent: number } {
  // For axis-aligned (no rotation), use simple calculation
  const isAxisAligned =
    Math.abs(rotation[0]) < 0.01 &&
    Math.abs(rotation[1]) < 0.01 &&
    Math.abs(rotation[2]) < 0.01;

  if (isAxisAligned) {
    const halfSizes = [halfW, halfH, halfD];
    const halfExtent = halfSizes[axisIndex];
    return {
      min: position[axisIndex] - halfExtent,
      max: position[axisIndex] + halfExtent,
      halfExtent,
    };
  }

  // For rotated parts, calculate all 8 corners and find min/max
  const corners: Vec3[] = [
    [-halfW, -halfH, -halfD],
    [halfW, -halfH, -halfD],
    [halfW, halfH, -halfD],
    [-halfW, halfH, -halfD],
    [-halfW, -halfH, halfD],
    [halfW, -halfH, halfD],
    [halfW, halfH, halfD],
    [-halfW, halfH, halfD],
  ];

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const corner of corners) {
    const rotated = rotatePoint(corner, rotation);
    const worldPos = rotated[axisIndex] + position[axisIndex];
    minVal = Math.min(minVal, worldPos);
    maxVal = Math.max(maxVal, worldPos);
  }

  return {
    min: minVal,
    max: maxVal,
    halfExtent: (maxVal - minVal) / 2,
  };
}

/**
 * Simple snap calculation for a single axis only
 * Supports rotated parts by calculating world-space bounding boxes
 *
 * @param part - The part being moved
 * @param newPosition - Current position during drag
 * @param allParts - Other parts to snap to
 * @param settings - Snap settings
 * @param axis - The axis being dragged ('X', 'Y', or 'Z')
 */
export function calculateSnapSimple(
  part: Part,
  newPosition: Vec3,
  allParts: Part[],
  settings: SnapSettings,
  axis: 'X' | 'Y' | 'Z'
): SnapResult {
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
  const collisionOffset = settings.collisionOffset ?? 1.0;

  // Get part bounds on the drag axis (accounting for rotation)
  const partBounds = getRotatedBoundsOnAxis(
    newPosition,
    part.width / 2,
    part.height / 2,
    part.depth / 2,
    part.rotation,
    axisIndex
  );

  let bestSnap: { position: number; distance: number; targetId: string; snapEdgePos: number } | null = null;

  for (const target of allParts) {
    // Skip self and same cabinet
    if (target.id === part.id) continue;
    if (
      part.cabinetMetadata?.cabinetId &&
      target.cabinetMetadata?.cabinetId === part.cabinetMetadata.cabinetId
    ) {
      continue;
    }

    // Get target bounds on the drag axis (accounting for rotation)
    const targetBounds = getRotatedBoundsOnAxis(
      target.position,
      target.width / 2,
      target.height / 2,
      target.depth / 2,
      target.rotation,
      axisIndex
    );

    // Check all 4 possible snap points (part edges to target edges)
    const snapCandidates = [
      // Part max edge to target min edge (face-to-face, with offset)
      {
        partEdge: partBounds.max,
        targetEdge: targetBounds.min,
        newCenter: targetBounds.min - partBounds.halfExtent - collisionOffset,
        snapEdgePos: targetBounds.min - collisionOffset / 2, // Position between the two edges
      },
      // Part min edge to target max edge (face-to-face, with offset)
      {
        partEdge: partBounds.min,
        targetEdge: targetBounds.max,
        newCenter: targetBounds.max + partBounds.halfExtent + collisionOffset,
        snapEdgePos: targetBounds.max + collisionOffset / 2, // Position between the two edges
      },
      // Part min edge to target min edge (align edges)
      {
        partEdge: partBounds.min,
        targetEdge: targetBounds.min,
        newCenter: targetBounds.min + partBounds.halfExtent,
        snapEdgePos: targetBounds.min, // Aligned edge position
      },
      // Part max edge to target max edge (align edges)
      {
        partEdge: partBounds.max,
        targetEdge: targetBounds.max,
        newCenter: targetBounds.max - partBounds.halfExtent,
        snapEdgePos: targetBounds.max, // Aligned edge position
      },
    ];

    for (const candidate of snapCandidates) {
      const distance = Math.abs(candidate.partEdge - candidate.targetEdge);

      if (distance <= settings.distance) {
        if (!bestSnap || distance < bestSnap.distance) {
          bestSnap = {
            position: candidate.newCenter,
            distance,
            targetId: target.id,
            snapEdgePos: candidate.snapEdgePos,
          };
        }
      }
    }
  }

  if (!bestSnap) {
    return { snapped: false, position: newPosition, snapPoints: [] };
  }

  // Create snapped position (only modify the drag axis)
  const snappedPosition: Vec3 = [...newPosition];
  snappedPosition[axisIndex] = bestSnap.position;

  // Create snap point for visualization at the actual snap edge location
  const snapEdgePosition: Vec3 = [...snappedPosition];
  snapEdgePosition[axisIndex] = bestSnap.snapEdgePos;

  // Create snap point for visualization
  const snapPoint: SnapPoint = {
    id: `simple-${axis}-${bestSnap.targetId}`,
    type: 'face',
    position: snapEdgePosition, // Position at the snap edge, not part center
    normal: [0, 0, 0],
    partId: bestSnap.targetId,
    strength: 1 - bestSnap.distance / settings.distance,
    axis, // The axis being snapped
  };

  return {
    snapped: true,
    position: snappedPosition,
    snapPoints: [snapPoint],
  };
}

/**
 * Calculate cabinet bounding box as a virtual part
 * Used for snapping entire cabinets as rigid units
 */
export function calculateCabinetBounds(parts: Part[]): Part | null {
  if (parts.length === 0) return null;

  // Calculate min/max in world space
  const bounds = {
    min: [Infinity, Infinity, Infinity] as Vec3,
    max: [-Infinity, -Infinity, -Infinity] as Vec3,
  };

  for (const part of parts) {
    const corners = getPartCorners(part);
    for (const corner of corners) {
      bounds.min[0] = Math.min(bounds.min[0], corner[0]);
      bounds.min[1] = Math.min(bounds.min[1], corner[1]);
      bounds.min[2] = Math.min(bounds.min[2], corner[2]);
      bounds.max[0] = Math.max(bounds.max[0], corner[0]);
      bounds.max[1] = Math.max(bounds.max[1], corner[1]);
      bounds.max[2] = Math.max(bounds.max[2], corner[2]);
    }
  }

  // Create virtual part representing cabinet bounding box
  const center: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];

  // Create a minimal Part-like object for snap calculations
  return {
    id: 'cabinet-bounds',
    name: 'Cabinet Bounds',
    furnitureId: parts[0].furnitureId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: 0, y: 0 },
    width: bounds.max[0] - bounds.min[0],
    height: bounds.max[1] - bounds.min[1],
    depth: bounds.max[2] - bounds.min[2],
    position: center,
    rotation: [0, 0, 0], // AABB - axis-aligned
    materialId: '',
    edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
