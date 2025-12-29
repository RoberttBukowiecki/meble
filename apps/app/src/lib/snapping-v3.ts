/**
 * Snap V3 - Face-to-Face Furniture Assembly Snapping
 *
 * The primary snapping system for furniture assembly. Handles:
 * - Face-to-face connection (opposite normals)
 * - Parallel face alignment (same normals)
 * - T-joint snapping (perpendicular normals)
 * - Cross-axis snapping for rotated parts
 *
 * Core principles:
 * 1. User Intent First: Snap selection based on movement direction
 * 2. All Faces Equal: No bias toward large or small faces
 * 3. Collision Prevention: Reject any snap causing penetration
 * 4. Stability: Hysteresis to prevent snap jumping
 */

import type { Part, Cabinet } from "@/types";
import type {
  SnapSettings,
  SnapPoint,
  SnapResult,
  DragAxes,
  MultiAxisSnapResult,
  AxisSnapDetail,
} from "@/types/transform";
import { parseAxes } from "@/lib/transform-utils";
import {
  type Vec3,
  type OBBFace,
  type OrientedBoundingBox,
  createOBBFromPart,
  getOBBFaces,
  vec3Add,
  vec3Dot,
  getPartCorners,
} from "./obb";

// ============================================================================
// SECTION 1: TYPES & INTERFACES
// ============================================================================

/**
 * Internal settings for V3 algorithm
 */
export interface SnapV3Settings {
  /** Maximum distance to snap (mm) */
  snapDistance: number;
  /** Gap between snapped faces (mm) - used for snap offset calculation */
  snapGap: number;
  /** Margin for collision detection (mm) - used to prevent overlaps */
  collisionMargin: number;
  /** Distance to maintain current snap (mm) */
  hysteresisMargin: number;
  /** Enable face-to-face connection snaps (opposite normals) */
  enableConnectionSnap: boolean;
  /** Enable parallel face alignment snaps (same normals) */
  enableAlignmentSnap: boolean;
  /** Enable T-joint snaps (perpendicular normals) */
  enableTJointSnap: boolean;
}

/**
 * Input for snap calculation
 */
export interface SnapV3Input {
  movingPart: Part;
  targetParts: Part[];
  dragAxis: "X" | "Y" | "Z";
  movementDirection: 1 | -1;
  currentOffset: Vec3;
  previousSnap?: {
    sourceFaceId: string;
    targetFaceId: string;
    offset: number;
  };
}

/**
 * Result from core snap calculation
 */
export interface SnapV3Result {
  snapped: boolean;
  offset: number;
  axis: "X" | "Y" | "Z";
  sourceFaceId?: string;
  targetFaceId?: string;
  snapType?: "connection" | "alignment" | "tjoint";
  snapPlanePosition?: Vec3;
}

/**
 * Snap candidate during calculation
 */
export interface SnapV3Candidate {
  movingFace: OBBFace;
  targetFace: OBBFace;
  sourceFaceId: string;
  targetFaceId: string;
  snapOffset: number;
  distance: number;
  type: "connection" | "alignment" | "tjoint";
  targetPartId: string;
  snapPlanePosition: Vec3;
}

/**
 * Cross-axis snap result
 */
export interface CrossAxisSnapResult {
  snapped: boolean;
  position: Vec3;
  snapPoints: SnapPoint[];
  snappedAxes: Array<"X" | "Y" | "Z">;
}

/**
 * AABB for collision detection
 */
interface AABB {
  min: Vec3;
  max: Vec3;
}

/**
 * Cross-axis target with overlap info
 */
interface CrossAxisTarget {
  part: Part;
  overlapsOnAxis: { X: boolean; Y: boolean; Z: boolean };
}

// ============================================================================
// SECTION 2: CONSTANTS
// ============================================================================

/** Threshold for considering normals opposite (dot product) */
const OPPOSITE_THRESHOLD = -0.95;

/** Threshold for considering normals aligned/parallel (dot product) */
const ALIGNMENT_THRESHOLD = 0.95;

/** Threshold for considering normals perpendicular (dot product close to 0) */
const PERPENDICULAR_THRESHOLD = 0.1;

/** Threshold for face alignment with axis */
const AXIS_ALIGNMENT_THRESHOLD = 0.9;

/** Multiplier for cross-axis snap distance (based on overlap) */
const CROSS_AXIS_DISTANCE_MULTIPLIER = 3;

// ============================================================================
// SECTION 3: DEBUG STATE
// ============================================================================

/**
 * Debug information for visualization
 */
export interface SnapV3DebugInfo {
  // Moving part info
  movingPartId: string;
  movingOBB: OrientedBoundingBox;
  movingFaces: OBBFace[];

  // Filtered faces
  relevantFaces: OBBFace[];
  leadingFaces: OBBFace[];

  // Target parts
  targetParts: Array<{
    partId: string;
    obb: OrientedBoundingBox;
    faces: OBBFace[];
  }>;

  // Candidates by type
  allCandidates: SnapV3Candidate[];
  connectionCandidates: SnapV3Candidate[];
  alignmentCandidates: SnapV3Candidate[];
  tjointCandidates: SnapV3Candidate[];
  selectedCandidate: SnapV3Candidate | null;

  // Context
  dragAxis: "X" | "Y" | "Z";
  movementDirection: 1 | -1;
  currentOffset: Vec3;

  // V3-specific state
  hysteresisActive: boolean;
  crossAxisEnabled: boolean;
  crossAxisTargets: CrossAxisTarget[];
}

/** Global debug state for visualization component */
export let lastSnapV3Debug: SnapV3DebugInfo | null = null;

/** Clear debug state */
export function clearSnapV3Debug(): void {
  lastSnapV3Debug = null;
}

// ============================================================================
// SECTION 4: MAIN ALGORITHM
// ============================================================================

/**
 * Calculate snap for V3 system (core algorithm)
 */
export function calculateSnapV3(input: SnapV3Input, settings: SnapV3Settings): SnapV3Result {
  const { movingPart, targetParts, dragAxis, movementDirection, currentOffset, previousSnap } =
    input;
  const axisIndex = dragAxis === "X" ? 0 : dragAxis === "Y" ? 1 : 2;

  // No targets - no snap
  if (targetParts.length === 0) {
    return { snapped: false, offset: 0, axis: dragAxis };
  }

  // Get all candidates
  const candidates = generateCandidates(
    movingPart,
    targetParts,
    dragAxis,
    movementDirection,
    currentOffset,
    settings
  );

  // No candidates found
  if (candidates.length === 0) {
    return { snapped: false, offset: 0, axis: dragAxis };
  }

  // Apply hysteresis if we have a previous snap
  if (previousSnap) {
    const previousCandidate = candidates.find(
      (c) =>
        c.sourceFaceId === previousSnap.sourceFaceId && c.targetFaceId === previousSnap.targetFaceId
    );

    if (previousCandidate) {
      const offsetDiff = Math.abs(previousCandidate.snapOffset - previousSnap.offset);
      if (offsetDiff <= settings.hysteresisMargin) {
        return {
          snapped: true,
          offset: previousSnap.offset,
          axis: dragAxis,
          sourceFaceId: previousSnap.sourceFaceId,
          targetFaceId: previousSnap.targetFaceId,
          snapType: previousCandidate.type,
        };
      }
    }
  }

  // Sort by: 1) snap type priority (connection > alignment > tjoint), 2) distance
  const typePriority = { connection: 0, alignment: 1, tjoint: 2 };
  candidates.sort((a, b) => {
    // First sort by type priority
    const priorityDiff = typePriority[a.type] - typePriority[b.type];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by distance from current position
    const distA = Math.abs(a.snapOffset - currentOffset[axisIndex]);
    const distB = Math.abs(b.snapOffset - currentOffset[axisIndex]);
    return distA - distB;
  });

  const best = candidates[0];

  return {
    snapped: true,
    offset: best.snapOffset,
    axis: dragAxis,
    sourceFaceId: best.sourceFaceId,
    targetFaceId: best.targetFaceId,
    snapType: best.type,
    snapPlanePosition: best.snapPlanePosition,
  };
}

// ============================================================================
// SECTION 5: CANDIDATE GENERATION
// ============================================================================

/**
 * Generate all valid snap candidates
 */
function generateCandidates(
  movingPart: Part,
  targetParts: Part[],
  dragAxis: "X" | "Y" | "Z",
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate[] {
  const candidates: SnapV3Candidate[] = [];
  const axisIndex = dragAxis === "X" ? 0 : dragAxis === "Y" ? 1 : 2;

  const movingOBB = createOBBFromPart(movingPart);
  const movingFaces = getOBBFaces(movingOBB);

  for (const targetPart of targetParts) {
    const targetOBB = createOBBFromPart(targetPart);
    const targetFaces = getOBBFaces(targetOBB);

    for (const movingFace of movingFaces) {
      for (const targetFace of targetFaces) {
        // Connection snap (opposite normals)
        if (settings.enableConnectionSnap) {
          const candidate = checkConnectionSnap(
            movingFace,
            targetFace,
            movingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );
          if (candidate) candidates.push(candidate);
        }

        // Alignment snap (parallel normals)
        if (settings.enableAlignmentSnap) {
          const candidate = checkAlignmentSnap(
            movingFace,
            targetFace,
            movingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );
          if (candidate) candidates.push(candidate);
        }

        // T-joint snap (perpendicular normals)
        if (settings.enableTJointSnap) {
          const candidate = checkTJointSnap(
            movingFace,
            targetFace,
            movingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );
          if (candidate) candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

// ============================================================================
// SECTION 5.1: Connection Snap (opposite normals)
// ============================================================================

/**
 * Check if two faces can form a connection snap (face-to-face)
 *
 * For rotated objects: The face normal determines which world axis this face
 * can snap on. A face with normal [0,1,0] can only snap when dragging on Y axis.
 */
function checkConnectionSnap(
  movingFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are opposite (faces looking at each other)
  const dot = vec3Dot(movingFace.normal, targetFace.normal);
  if (dot > OPPOSITE_THRESHOLD) return null;

  // 2. Check face normal is aligned with drag axis
  // For rotated objects, their faces have rotated normals - we check if
  // the normal has significant component on the drag axis
  const normalOnAxis = movingFace.normal[axisIndex];
  if (Math.abs(normalOnAxis) < AXIS_ALIGNMENT_THRESHOLD) return null;

  // 3. Face must point in movement direction (or opposite for the target to receive)
  const facesMovementDir = normalOnAxis > 0 === movementDirection > 0;
  if (!facesMovementDir) return null;

  // 4. Calculate snap offset on drag axis (using snapGap for face separation)
  const snapOffset = calculateConnectionOffset(movingFace, targetFace, axisIndex, settings.snapGap);

  // 5. Check direction validity - snap should be in direction of movement
  // Allow small margin (hysteresisMargin) for snaps slightly in opposite direction
  // This prevents accepting snaps that would move the part opposite to user intent
  if (movementDirection > 0 && snapOffset < -settings.hysteresisMargin) return null;
  if (movementDirection < 0 && snapOffset > settings.hysteresisMargin) return null;

  // 6. Check distance threshold
  const distance = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distance > settings.snapDistance) return null;

  // 7. Check collision (using collisionMargin for overlap detection)
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;
  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionMargin, axisIndex)) {
    return null;
  }

  return {
    movingFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, movingFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance,
    type: "connection",
    targetPartId: targetPart.id,
    snapPlanePosition: [...targetFace.center],
  };
}

/**
 * Calculate offset to bring faces together with a gap
 */
function calculateConnectionOffset(
  movingFace: OBBFace,
  targetFace: OBBFace,
  axisIndex: number,
  snapGap: number
): number {
  const sourcePos = movingFace.center[axisIndex];
  const targetPos = targetFace.center[axisIndex];
  const diff = targetPos - sourcePos;
  const normalSign = movingFace.normal[axisIndex] > 0 ? 1 : -1;
  return diff - snapGap * normalSign;
}

// ============================================================================
// SECTION 5.2: Alignment Snap (parallel normals)
// ============================================================================

/**
 * Check if two faces can form an alignment snap (coplanar)
 */
function checkAlignmentSnap(
  movingFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are parallel (same direction)
  const dot = vec3Dot(movingFace.normal, targetFace.normal);
  if (dot < ALIGNMENT_THRESHOLD) return null;

  // 2. Check face is aligned with drag axis
  const normalOnAxis = Math.abs(movingFace.normal[axisIndex]);
  if (normalOnAxis < AXIS_ALIGNMENT_THRESHOLD) return null;

  // 3. Calculate alignment offset
  const snapOffset = calculateAlignmentOffset(movingFace, targetFace, axisIndex);

  // 4. Check direction validity - snap should be in direction of movement
  // Allow small margin (hysteresisMargin) for snaps slightly in opposite direction
  if (movementDirection > 0 && snapOffset < -settings.hysteresisMargin) return null;
  if (movementDirection < 0 && snapOffset > settings.hysteresisMargin) return null;

  // 5. Check distance threshold
  const distance = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distance > settings.snapDistance) return null;

  // 6. Check collision (using collisionMargin for overlap detection)
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;
  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionMargin, axisIndex)) {
    return null;
  }

  return {
    movingFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, movingFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance,
    type: "alignment",
    targetPartId: targetPart.id,
    snapPlanePosition: [...targetFace.center],
  };
}

/**
 * Calculate offset to align faces on same plane
 */
function calculateAlignmentOffset(
  movingFace: OBBFace,
  targetFace: OBBFace,
  axisIndex: number
): number {
  return targetFace.center[axisIndex] - movingFace.center[axisIndex];
}

// ============================================================================
// SECTION 5.3: T-Joint Snap (perpendicular normals)
// ============================================================================

/**
 * Check if two faces can form a T-joint snap
 */
function checkTJointSnap(
  movingFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are perpendicular
  const dot = vec3Dot(movingFace.normal, targetFace.normal);
  if (Math.abs(dot) > PERPENDICULAR_THRESHOLD) return null;

  // 2. Target face must be perpendicular to drag axis
  const targetNormalOnAxis = Math.abs(targetFace.normal[axisIndex]);
  if (targetNormalOnAxis < AXIS_ALIGNMENT_THRESHOLD) return null;

  // 3. Calculate T-joint offset (using snapGap for edge separation)
  const snapOffset = calculateTJointOffset(
    movingFace,
    targetFace,
    axisIndex,
    movementDirection,
    settings.snapGap
  );

  // 4. Check direction validity - snap should be in direction of movement
  // Allow small margin (hysteresisMargin) for snaps slightly in opposite direction
  if (movementDirection > 0 && snapOffset < -settings.hysteresisMargin) return null;
  if (movementDirection < 0 && snapOffset > settings.hysteresisMargin) return null;

  // 5. Check distance threshold
  const distance = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distance > settings.snapDistance) return null;

  // 6. Check collision (using collisionMargin for overlap detection)
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;
  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionMargin, axisIndex)) {
    return null;
  }

  return {
    movingFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, movingFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance,
    type: "tjoint",
    targetPartId: targetPart.id,
    snapPlanePosition: [...targetFace.center],
  };
}

/**
 * Calculate offset for T-joint snap (edge to face)
 */
function calculateTJointOffset(
  movingFace: OBBFace,
  targetFace: OBBFace,
  axisIndex: number,
  movementDirection: 1 | -1,
  snapGap: number
): number {
  const targetPos = targetFace.center[axisIndex];
  const targetNormalSign = targetFace.normal[axisIndex] > 0 ? 1 : -1;

  // Get moving face extent on drag axis
  let sourceMin = Infinity;
  let sourceMax = -Infinity;
  for (const corner of movingFace.corners) {
    sourceMin = Math.min(sourceMin, corner[axisIndex]);
    sourceMax = Math.max(sourceMax, corner[axisIndex]);
  }

  // Use edge based on movement direction
  const sourceEdge = movementDirection > 0 ? sourceMax : sourceMin;
  const targetWithGap = targetPos - snapGap * targetNormalSign;

  return targetWithGap - sourceEdge;
}

// ============================================================================
// SECTION 6: COLLISION DETECTION
// ============================================================================

/**
 * Check if snap would cause collision (overlap)
 * Uses collisionMargin to allow small gaps between parts
 */
function wouldCauseCollision(
  movingPart: Part,
  targetPart: Part,
  offset: Vec3,
  collisionMargin: number,
  snapAxisIndex?: number
): boolean {
  const movingAABB = getPartAABB(movingPart, offset);
  const targetAABB = getPartAABB(targetPart, [0, 0, 0]);

  // Apply tolerance only on snap axis
  const tolerance: Vec3 = [0, 0, 0];
  if (snapAxisIndex !== undefined) {
    tolerance[snapAxisIndex] = collisionMargin;
  } else {
    tolerance[0] = tolerance[1] = tolerance[2] = collisionMargin;
  }

  const shrunkMoving: AABB = {
    min: [
      movingAABB.min[0] + tolerance[0],
      movingAABB.min[1] + tolerance[1],
      movingAABB.min[2] + tolerance[2],
    ],
    max: [
      movingAABB.max[0] - tolerance[0],
      movingAABB.max[1] - tolerance[1],
      movingAABB.max[2] - tolerance[2],
    ],
  };

  return doAABBsOverlap(shrunkMoving, targetAABB);
}

/**
 * Get axis-aligned bounding box for a part
 */
function getPartAABB(part: Part, offset: Vec3): AABB {
  const corners = getPartCorners(part);
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const corner of corners) {
    const offsetCorner = vec3Add(corner, offset);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], offsetCorner[i]);
      max[i] = Math.max(max[i], offsetCorner[i]);
    }
  }

  return { min, max };
}

/**
 * Check if two AABBs overlap
 */
function doAABBsOverlap(a: AABB, b: AABB): boolean {
  return (
    a.min[0] < b.max[0] &&
    a.max[0] > b.min[0] &&
    a.min[1] < b.max[1] &&
    a.max[1] > b.min[1] &&
    a.min[2] < b.max[2] &&
    a.max[2] > b.min[2]
  );
}

// ============================================================================
// SECTION 7: CROSS-AXIS SNAPPING
// ============================================================================

/**
 * Calculate cross-axis snap distance based on overlap
 */
function getCrossAxisSnapDistance(
  movingAABB: AABB,
  targetAABB: AABB,
  baseDistance: number,
  axis: "X" | "Y" | "Z"
): number {
  const perpAxes = axis === "X" ? [1, 2] : axis === "Y" ? [0, 2] : [0, 1];

  let overlapCount = 0;
  for (const perpAxis of perpAxes) {
    const overlap =
      movingAABB.max[perpAxis] > targetAABB.min[perpAxis] &&
      movingAABB.min[perpAxis] < targetAABB.max[perpAxis];
    if (overlap) overlapCount++;
  }

  // Scale: full overlap = 3x, partial = 2x, none = 1x
  return baseDistance * (1 + overlapCount);
}

/**
 * Find target parts that overlap on perpendicular axes
 */
function findCrossAxisTargets(
  movingAABB: AABB,
  targetParts: Part[],
  baseSnapDistance: number
): CrossAxisTarget[] {
  const results: CrossAxisTarget[] = [];

  for (const targetPart of targetParts) {
    const targetAABB = getPartAABB(targetPart, [0, 0, 0]);

    // Check overlap on each perpendicular axis pair
    const overlapX =
      movingAABB.max[1] > targetAABB.min[1] - baseSnapDistance &&
      movingAABB.min[1] < targetAABB.max[1] + baseSnapDistance &&
      movingAABB.max[2] > targetAABB.min[2] - baseSnapDistance &&
      movingAABB.min[2] < targetAABB.max[2] + baseSnapDistance;

    const overlapY =
      movingAABB.max[0] > targetAABB.min[0] - baseSnapDistance &&
      movingAABB.min[0] < targetAABB.max[0] + baseSnapDistance &&
      movingAABB.max[2] > targetAABB.min[2] - baseSnapDistance &&
      movingAABB.min[2] < targetAABB.max[2] + baseSnapDistance;

    const overlapZ =
      movingAABB.max[0] > targetAABB.min[0] - baseSnapDistance &&
      movingAABB.min[0] < targetAABB.max[0] + baseSnapDistance &&
      movingAABB.max[1] > targetAABB.min[1] - baseSnapDistance &&
      movingAABB.min[1] < targetAABB.max[1] + baseSnapDistance;

    results.push({
      part: targetPart,
      overlapsOnAxis: { X: overlapX, Y: overlapY, Z: overlapZ },
    });
  }

  return results;
}

/**
 * Calculate snap with cross-axis support for rotated parts
 */
export function calculatePartSnapV3CrossAxis(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxis: "X" | "Y" | "Z"
): CrossAxisSnapResult {
  // Filter target parts
  const targetParts = allParts.filter(
    (p) =>
      p.id !== movingPart.id &&
      (!movingPart.cabinetMetadata?.cabinetId ||
        p.cabinetMetadata?.cabinetId !== movingPart.cabinetMetadata.cabinetId)
  );

  if (targetParts.length === 0) {
    return { snapped: false, position: currentPosition, snapPoints: [], snappedAxes: [] };
  }

  const currentOffset: Vec3 = [
    currentPosition[0] - movingPart.position[0],
    currentPosition[1] - movingPart.position[1],
    currentPosition[2] - movingPart.position[2],
  ];

  const v3Settings: SnapV3Settings = {
    snapDistance: settings.distance,
    snapGap: settings.snapGap ?? settings.collisionOffset ?? 0.1,
    collisionMargin: settings.collisionMargin ?? 0.3,
    hysteresisMargin: 2,
    enableConnectionSnap: settings.faceSnap,
    enableAlignmentSnap: settings.edgeSnap,
    enableTJointSnap: settings.tJointSnap ?? true,
  };

  const movingAABB = getPartAABB(movingPart, currentOffset);
  const crossAxisTargets = findCrossAxisTargets(
    movingAABB,
    targetParts,
    settings.distance * CROSS_AXIS_DISTANCE_MULTIPLIER
  );

  const axes: Array<"X" | "Y" | "Z"> = ["X", "Y", "Z"];
  const snappedPosition: Vec3 = [...currentPosition];
  const snapPoints: SnapPoint[] = [];
  const snappedAxes: Array<"X" | "Y" | "Z"> = [];

  for (const axis of axes) {
    const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;
    const isCrossAxis = axis !== dragAxis;

    // For cross axes, filter by overlap
    let effectiveTargetParts: Part[];
    if (isCrossAxis) {
      const overlapping = crossAxisTargets.filter((t) => t.overlapsOnAxis[axis]);
      if (overlapping.length === 0) continue;
      effectiveTargetParts = overlapping.map((t) => t.part);
    } else {
      effectiveTargetParts = targetParts;
    }

    // Calculate effective snap distance
    const effectiveSnapDistance = isCrossAxis
      ? settings.distance * CROSS_AXIS_DISTANCE_MULTIPLIER
      : settings.distance;

    const effectiveSettings: SnapV3Settings = {
      ...v3Settings,
      snapDistance: effectiveSnapDistance,
    };

    // Check both directions for cross-axis
    const directions: Array<1 | -1> = isCrossAxis
      ? [1, -1]
      : [currentOffset[axisIndex] >= 0 ? 1 : -1];

    let bestResult: SnapV3Result | null = null;
    let bestDistance = Infinity;

    for (const direction of directions) {
      const result = calculateSnapV3(
        {
          movingPart,
          targetParts: effectiveTargetParts,
          dragAxis: axis,
          movementDirection: direction,
          currentOffset,
        },
        effectiveSettings
      );

      if (result.snapped) {
        const snapPos = movingPart.position[axisIndex] + result.offset;
        const distance = Math.abs(snapPos - currentPosition[axisIndex]);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestResult = result;
        }
      }
    }

    if (bestResult && bestDistance <= effectiveSnapDistance) {
      snappedPosition[axisIndex] = movingPart.position[axisIndex] + bestResult.offset;
      snappedAxes.push(axis);

      if (bestResult.sourceFaceId && bestResult.targetFaceId) {
        snapPoints.push({
          id: `v3-${axis}-${bestResult.sourceFaceId}`,
          type: bestResult.snapType === "connection" ? "face" : "edge",
          position: bestResult.snapPlanePosition || [...snappedPosition],
          normal: axis === "X" ? [1, 0, 0] : axis === "Y" ? [0, 1, 0] : [0, 0, 1],
          partId: movingPart.id,
          strength: 1,
          axis,
        });
      }
    }
  }

  return {
    snapped: snappedAxes.length > 0,
    position: snappedPosition,
    snapPoints,
    snappedAxes,
  };
}

// ============================================================================
// SECTION 8: INTEGRATION API
// ============================================================================

/**
 * Calculate snap for single axis (main entry point for PartTransformControls)
 */
export function calculatePartSnapV3(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxis: "X" | "Y" | "Z"
): SnapResult {
  const axisIndex = dragAxis === "X" ? 0 : dragAxis === "Y" ? 1 : 2;

  const currentOffset: Vec3 = [
    currentPosition[0] - movingPart.position[0],
    currentPosition[1] - movingPart.position[1],
    currentPosition[2] - movingPart.position[2],
  ];

  const movementDirection: 1 | -1 = currentOffset[axisIndex] >= 0 ? 1 : -1;

  const targetParts = allParts.filter(
    (p) =>
      p.id !== movingPart.id &&
      (!movingPart.cabinetMetadata?.cabinetId ||
        p.cabinetMetadata?.cabinetId !== movingPart.cabinetMetadata.cabinetId)
  );

  const v3Settings: SnapV3Settings = {
    snapDistance: settings.distance,
    snapGap: settings.snapGap ?? settings.collisionOffset ?? 0.1,
    collisionMargin: settings.collisionMargin ?? 0.3,
    hysteresisMargin: 2,
    enableConnectionSnap: settings.faceSnap,
    enableAlignmentSnap: settings.edgeSnap,
    enableTJointSnap: settings.tJointSnap ?? true,
  };

  // Build debug info
  const movingOBB = createOBBFromPart(movingPart);
  const movingFaces = getOBBFaces(movingOBB);

  const relevantFaces = movingFaces.filter(
    (f) => Math.abs(f.normal[axisIndex]) > AXIS_ALIGNMENT_THRESHOLD
  );

  const leadingFaces = relevantFaces.filter((f) => {
    const normalSign = f.normal[axisIndex] > 0 ? 1 : -1;
    return normalSign === movementDirection;
  });

  const targetPartsDebug = targetParts.map((p) => {
    const obb = createOBBFromPart(p);
    return { partId: p.id, obb, faces: getOBBFaces(obb) };
  });

  const input: SnapV3Input = {
    movingPart,
    targetParts,
    dragAxis,
    movementDirection,
    currentOffset,
  };

  const result = calculateSnapV3(input, v3Settings);

  // Get all candidates for debug
  const allCandidates = generateCandidates(
    movingPart,
    targetParts,
    dragAxis,
    movementDirection,
    currentOffset,
    v3Settings
  );

  // Update debug state
  lastSnapV3Debug = {
    movingPartId: movingPart.id,
    movingOBB,
    movingFaces,
    relevantFaces,
    leadingFaces,
    targetParts: targetPartsDebug,
    allCandidates,
    connectionCandidates: allCandidates.filter((c) => c.type === "connection"),
    alignmentCandidates: allCandidates.filter((c) => c.type === "alignment"),
    tjointCandidates: allCandidates.filter((c) => c.type === "tjoint"),
    selectedCandidate: result.snapped
      ? allCandidates.find(
          (c) => c.sourceFaceId === result.sourceFaceId && c.targetFaceId === result.targetFaceId
        ) || null
      : null,
    dragAxis,
    movementDirection,
    currentOffset,
    hysteresisActive: false,
    crossAxisEnabled: false,
    crossAxisTargets: [],
  };

  if (!result.snapped) {
    return { snapped: false, position: currentPosition, snapPoints: [] };
  }

  const snappedPosition: Vec3 = [...currentPosition];
  snappedPosition[axisIndex] = movingPart.position[axisIndex] + result.offset;

  const snapPoints: SnapPoint[] =
    result.sourceFaceId && result.targetFaceId
      ? [
          {
            id: `v3-${result.sourceFaceId}-${result.targetFaceId}`,
            type: result.snapType === "connection" ? "face" : "edge",
            position: result.snapPlanePosition || snappedPosition,
            normal: dragAxis === "X" ? [1, 0, 0] : dragAxis === "Y" ? [0, 1, 0] : [0, 0, 1],
            partId: movingPart.id,
            strength: 1,
            axis: dragAxis,
          },
        ]
      : [];

  return { snapped: true, position: snappedPosition, snapPoints };
}

// ============================================================================
// SECTION 8.1: MULTI-AXIS SNAP (PLANAR DRAG)
// ============================================================================

/**
 * Calculate snap for multiple axes simultaneously (planar drag).
 *
 * This function handles scenarios where the user drags on a plane (XY, XZ, YZ)
 * or all axes (XYZ). Each axis is snapped independently and results are combined.
 *
 * @param movingPart - The part being moved
 * @param currentPosition - Current position during drag
 * @param allParts - All parts in the scene
 * @param cabinets - All cabinets in the scene
 * @param settings - Snap settings
 * @param dragAxes - Active axes (e.g., "XZ" for floor plane drag)
 * @returns Combined snap result for all axes
 */
export function calculateMultiAxisSnap(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxes: DragAxes
): MultiAxisSnapResult {
  const axes = parseAxes(dragAxes);

  // Filter target parts (exclude self and cabinet siblings)
  const targetParts = allParts.filter(
    (p) =>
      p.id !== movingPart.id &&
      (!movingPart.cabinetMetadata?.cabinetId ||
        p.cabinetMetadata?.cabinetId !== movingPart.cabinetMetadata.cabinetId)
  );

  // Initialize result
  const snappedPosition: Vec3 = [...currentPosition];
  const snapPoints: SnapPoint[] = [];
  const snappedAxes: Array<"X" | "Y" | "Z"> = [];
  const axisResults = new Map<"X" | "Y" | "Z", AxisSnapDetail>();

  // Current offset from original position
  const currentOffset: Vec3 = [
    currentPosition[0] - movingPart.position[0],
    currentPosition[1] - movingPart.position[1],
    currentPosition[2] - movingPart.position[2],
  ];

  // V3 settings
  const v3Settings: SnapV3Settings = {
    snapDistance: settings.distance,
    snapGap: settings.snapGap ?? settings.collisionOffset ?? 0.1,
    collisionMargin: settings.collisionMargin ?? 0.3,
    hysteresisMargin: 2,
    enableConnectionSnap: settings.faceSnap,
    enableAlignmentSnap: settings.edgeSnap,
    enableTJointSnap: settings.tJointSnap ?? true,
  };

  // Process each axis independently
  for (const axis of axes) {
    const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;

    // Determine movement direction on this axis
    const movementDirection: 1 | -1 = currentOffset[axisIndex] >= 0 ? 1 : -1;

    // For multi-axis drag, we need to check both directions
    // because user might be moving diagonally
    const directions: Array<1 | -1> = [1, -1];
    let bestResult: SnapV3Result | null = null;
    let bestDistance = Infinity;

    for (const direction of directions) {
      const result = calculateSnapV3(
        {
          movingPart,
          targetParts,
          dragAxis: axis,
          movementDirection: direction,
          currentOffset,
        },
        v3Settings
      );

      if (result.snapped) {
        const snapPos = movingPart.position[axisIndex] + result.offset;
        const distance = Math.abs(snapPos - currentPosition[axisIndex]);

        if (distance < bestDistance && distance <= settings.distance) {
          bestDistance = distance;
          bestResult = result;
        }
      }
    }

    // Store axis result
    if (bestResult && bestResult.snapped) {
      snappedPosition[axisIndex] = movingPart.position[axisIndex] + bestResult.offset;
      snappedAxes.push(axis);

      axisResults.set(axis, {
        snapped: true,
        offset: bestResult.offset,
        snapType: bestResult.snapType,
        targetId: bestResult.targetFaceId,
      });

      // Add snap point for visualization
      if (bestResult.sourceFaceId && bestResult.targetFaceId) {
        snapPoints.push({
          id: `v3-multi-${axis}-${bestResult.sourceFaceId}`,
          type: bestResult.snapType === "connection" ? "face" : "edge",
          position: bestResult.snapPlanePosition || [...snappedPosition],
          normal: axis === "X" ? [1, 0, 0] : axis === "Y" ? [0, 1, 0] : [0, 0, 1],
          partId: movingPart.id,
          strength: 1,
          axis,
        });
      }
    } else {
      axisResults.set(axis, {
        snapped: false,
        offset: 0,
      });
    }
  }

  return {
    snapped: snappedAxes.length > 0,
    position: snappedPosition,
    snapPoints,
    snappedAxes,
    axisResults,
  };
}

// ============================================================================
// SECTION 9: UTILITIES
// ============================================================================

/**
 * Generate unique face ID
 */
function getFaceId(partId: string, face: OBBFace): string {
  return `${partId}-axis${face.axisIndex}-sign${face.sign}`;
}

// ============================================================================
// SECTION 10: EXPORTS
// ============================================================================

export {
  generateCandidates,
  checkConnectionSnap,
  checkAlignmentSnap,
  checkTJointSnap,
  calculateConnectionOffset,
  calculateAlignmentOffset,
  calculateTJointOffset,
  wouldCauseCollision,
  getPartAABB,
  doAABBsOverlap,
  getFaceId,
  findCrossAxisTargets,
  getCrossAxisSnapDistance,
  parseAxes,
};
