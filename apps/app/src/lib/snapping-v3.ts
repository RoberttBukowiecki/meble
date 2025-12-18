/**
 * Snap V3 - Face-to-Face Furniture Assembly Snapping
 *
 * Core principles:
 * 1. User Intent First: Snap selection based on movement direction
 * 2. All Faces Equal: No bias toward large or small faces
 * 3. Collision Prevention: Reject any snap causing penetration
 * 4. Stability: Hysteresis to prevent snap jumping
 */

import type { Part } from '@/types';
import {
  type Vec3,
  type OBBFace,
  createOBBFromPart,
  getOBBFaces,
  vec3Add,
  vec3Sub,
  vec3Dot,
  vec3Scale,
  getPartCorners,
} from './obb';

// ============================================================================
// Types
// ============================================================================

export interface SnapV3Settings {
  /** Maximum distance to snap (mm) */
  snapDistance: number;
  /** Gap between touching faces (mm) */
  collisionOffset: number;
  /** Distance to maintain current snap (mm) */
  hysteresisMargin: number;
  /** Enable face-to-face connection snaps (opposite normals) */
  enableConnectionSnap: boolean;
  /** Enable parallel face alignment snaps (same normals) */
  enableAlignmentSnap: boolean;
  /** Enable T-joint snaps (perpendicular normals) */
  enableTJointSnap: boolean;
}

export interface SnapV3Input {
  movingPart: Part;
  targetParts: Part[];
  dragAxis: 'X' | 'Y' | 'Z';
  movementDirection: 1 | -1;
  currentOffset: Vec3;
  previousSnap?: {
    sourceFaceId: string;
    targetFaceId: string;
    offset: number;
  };
}

export interface SnapV3Result {
  snapped: boolean;
  offset: number;
  axis: 'X' | 'Y' | 'Z';
  sourceFaceId?: string;
  targetFaceId?: string;
  snapType?: 'connection' | 'alignment' | 'tjoint';
}

interface SnapV3Candidate {
  sourceFace: OBBFace;
  targetFace: OBBFace;
  sourceFaceId: string;
  targetFaceId: string;
  snapOffset: number;
  distance: number;
  type: 'connection' | 'alignment' | 'tjoint';
  targetPartId: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Threshold for considering normals opposite (dot product) */
const OPPOSITE_THRESHOLD = -0.95;

/** Threshold for considering normals aligned (dot product) */
const ALIGNMENT_THRESHOLD = 0.95;

/** Threshold for considering normals perpendicular (dot product close to 0) */
const PERPENDICULAR_THRESHOLD = 0.1;

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Calculate snap for V3 system
 */
export function calculateSnapV3(
  input: SnapV3Input,
  settings: SnapV3Settings
): SnapV3Result {
  const {
    movingPart,
    targetParts,
    dragAxis,
    movementDirection,
    currentOffset,
    previousSnap,
  } = input;

  const axisIndex = dragAxis === 'X' ? 0 : dragAxis === 'Y' ? 1 : 2;

  // No targets - no snap
  if (targetParts.length === 0) {
    return { snapped: false, offset: 0, axis: dragAxis };
  }

  // Get all candidates (using ORIGINAL position, not offset position)
  const candidates = generateCandidates(
    movingPart, // Original position for calculations
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
        c.sourceFaceId === previousSnap.sourceFaceId &&
        c.targetFaceId === previousSnap.targetFaceId
    );

    if (previousCandidate) {
      const offsetDiff = Math.abs(
        previousCandidate.snapOffset - previousSnap.offset
      );
      if (offsetDiff <= settings.hysteresisMargin) {
        // Maintain previous snap
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

  // Sort candidates by distance (how far from current dragged position)
  // Distance is |snapOffset - currentOffset[axis]|
  candidates.sort((a, b) => {
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
  };
}

// ============================================================================
// Candidate Generation
// ============================================================================

/**
 * Generate all valid snap candidates
 * Returns candidates with TOTAL offset from original position
 */
function generateCandidates(
  movingPart: Part,
  originalMovingPart: Part,
  targetParts: Part[],
  dragAxis: 'X' | 'Y' | 'Z',
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate[] {
  const candidates: SnapV3Candidate[] = [];
  const axisIndex = dragAxis === 'X' ? 0 : dragAxis === 'Y' ? 1 : 2;

  // Get moving part faces (from ORIGINAL position)
  const movingOBB = createOBBFromPart(movingPart);
  const movingFaces = getOBBFaces(movingOBB);

  for (const targetPart of targetParts) {
    const targetOBB = createOBBFromPart(targetPart);
    const targetFaces = getOBBFaces(targetOBB);

    // Check all face pairs
    for (const sourceFace of movingFaces) {
      for (const targetFace of targetFaces) {
        // Connection snap (opposite normals)
        if (settings.enableConnectionSnap) {
          const connectionCandidate = checkConnectionSnap(
            sourceFace,
            targetFace,
            originalMovingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );

          if (connectionCandidate) {
            candidates.push(connectionCandidate);
          }
        }

        // Alignment snap (parallel normals)
        if (settings.enableAlignmentSnap) {
          const alignmentCandidate = checkAlignmentSnap(
            sourceFace,
            targetFace,
            originalMovingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );

          if (alignmentCandidate) {
            candidates.push(alignmentCandidate);
          }
        }

        // T-joint snap (perpendicular normals)
        if (settings.enableTJointSnap) {
          const tjointCandidate = checkTJointSnap(
            sourceFace,
            targetFace,
            originalMovingPart,
            targetPart,
            axisIndex,
            movementDirection,
            currentOffset,
            settings
          );

          if (tjointCandidate) {
            candidates.push(tjointCandidate);
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Check if two faces can form a connection snap
 * Returns candidate with TOTAL offset from original position
 */
function checkConnectionSnap(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are opposite
  const dot = vec3Dot(sourceFace.normal, targetFace.normal);
  if (dot > OPPOSITE_THRESHOLD) {
    return null; // Not opposite
  }

  // 2. Check source face normal is aligned with drag axis
  const sourceNormalOnAxis = sourceFace.normal[axisIndex];
  if (Math.abs(sourceNormalOnAxis) < 0.9) {
    return null; // Face not perpendicular to drag axis
  }

  // 3. Source face must face in the movement direction
  // If moving +X, we should use the +X face (normal pointing right)
  // If moving -X, we should use the -X face (normal pointing left)
  const sourceFacesMovementDirection = (sourceNormalOnAxis > 0) === (movementDirection > 0);
  if (!sourceFacesMovementDirection) {
    return null; // Source face points opposite to movement - ignore targets behind us
  }

  // 4. Calculate TOTAL snap offset from original position
  const snapOffset = calculateConnectionOffset(
    sourceFace,
    targetFace,
    axisIndex,
    settings.collisionOffset
  );

  // 5. Check snap is in the right direction relative to movement
  // Snap offset should be in same direction as movement (or near zero)
  if (movementDirection > 0 && snapOffset < -settings.snapDistance) {
    return null; // Moving positive, but snap is far negative
  }
  if (movementDirection < 0 && snapOffset > settings.snapDistance) {
    return null; // Moving negative, but snap is far positive
  }

  // 6. Check distance from current position is within threshold
  const distanceFromCurrent = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distanceFromCurrent > settings.snapDistance) {
    return null; // Too far from current position to snap
  }

  // 7. Check collision after snap
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;

  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionOffset)) {
    return null; // Would cause collision
  }

  return {
    sourceFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, sourceFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance: distanceFromCurrent,
    type: 'connection',
    targetPartId: targetPart.id,
  };
}

/**
 * Check if two faces can form an alignment snap
 * Returns candidate with TOTAL offset from original position
 */
function checkAlignmentSnap(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are aligned (same direction)
  const dot = vec3Dot(sourceFace.normal, targetFace.normal);
  if (dot < ALIGNMENT_THRESHOLD) {
    return null; // Not aligned
  }

  // 2. Check source face normal is aligned with drag axis
  const sourceNormalOnAxis = Math.abs(sourceFace.normal[axisIndex]);
  if (sourceNormalOnAxis < 0.9) {
    return null; // Face not perpendicular to drag axis
  }

  // 3. Calculate TOTAL alignment offset from original position
  const snapOffset = calculateAlignmentOffset(
    sourceFace,
    targetFace,
    axisIndex
  );

  // 4. Check snap is in the right direction relative to movement
  if (movementDirection > 0 && snapOffset < -settings.snapDistance) {
    return null; // Moving positive, but snap is far negative
  }
  if (movementDirection < 0 && snapOffset > settings.snapDistance) {
    return null; // Moving negative, but snap is far positive
  }

  // 5. Check distance from current position is within threshold
  const distanceFromCurrent = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distanceFromCurrent > settings.snapDistance) {
    return null; // Too far from current position to snap
  }

  // 6. Check collision after snap
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;

  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionOffset)) {
    return null; // Would cause collision
  }

  return {
    sourceFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, sourceFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance: distanceFromCurrent,
    type: 'alignment',
    targetPartId: targetPart.id,
  };
}

/**
 * Check if two faces can form a T-joint snap (perpendicular normals)
 *
 * T-joint snap allows connecting faces where:
 * - The source face normal is perpendicular to the target face normal
 * - This creates an edge-to-face connection (like T-joint in woodworking)
 *
 * For example:
 * - Part A's side face (normal pointing +Z)
 * - Part B's side face (normal pointing +X)
 * - These can T-joint if Part A's edge touches Part B's face surface
 *
 * Returns candidate with TOTAL offset from original position
 */
function checkTJointSnap(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  movingPart: Part,
  targetPart: Part,
  axisIndex: number,
  movementDirection: 1 | -1,
  currentOffset: Vec3,
  settings: SnapV3Settings
): SnapV3Candidate | null {
  // 1. Check normals are perpendicular (dot product close to 0)
  const dot = vec3Dot(sourceFace.normal, targetFace.normal);
  if (Math.abs(dot) > PERPENDICULAR_THRESHOLD) {
    return null; // Not perpendicular
  }

  // 2. Target face must be perpendicular to drag axis
  const targetNormalOnAxis = Math.abs(targetFace.normal[axisIndex]);
  if (targetNormalOnAxis < 0.9) {
    return null; // Target face not perpendicular to drag axis
  }

  // 3. Calculate T-joint snap offset
  // We want to bring the moving part's edge/body to touch the target face
  const snapOffset = calculateTJointOffset(
    movingPart,
    targetFace,
    axisIndex,
    movementDirection,
    settings.collisionOffset
  );

  // 4. Check snap is in the right direction relative to movement
  if (movementDirection > 0 && snapOffset < -settings.snapDistance) {
    return null; // Moving positive, but snap is far negative
  }
  if (movementDirection < 0 && snapOffset > settings.snapDistance) {
    return null; // Moving negative, but snap is far positive
  }

  // 5. Check distance from current position is within threshold
  const distanceFromCurrent = Math.abs(snapOffset - currentOffset[axisIndex]);
  if (distanceFromCurrent > settings.snapDistance) {
    return null; // Too far from current position to snap
  }

  // 6. Check collision after snap
  const offsetVec: Vec3 = [0, 0, 0];
  offsetVec[axisIndex] = snapOffset;

  if (wouldCauseCollision(movingPart, targetPart, offsetVec, settings.collisionOffset)) {
    return null; // Would cause collision
  }

  return {
    sourceFace,
    targetFace,
    sourceFaceId: getFaceId(movingPart.id, sourceFace),
    targetFaceId: getFaceId(targetPart.id, targetFace),
    snapOffset,
    distance: distanceFromCurrent,
    type: 'tjoint',
    targetPartId: targetPart.id,
  };
}

// ============================================================================
// Offset Calculations
// ============================================================================

/**
 * Calculate offset to bring faces together (connection)
 */
function calculateConnectionOffset(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  axisIndex: number,
  collisionOffset: number
): number {
  // Project face centers onto axis
  const sourcePos = sourceFace.center[axisIndex];
  const targetPos = targetFace.center[axisIndex];

  // Direction from source to target
  const diff = targetPos - sourcePos;

  // If source normal points in +axis direction, source is the "right" face
  // and needs to move toward target's "left" face
  const sourceNormalSign = sourceFace.normal[axisIndex] > 0 ? 1 : -1;

  // Adjust for collision offset - leave gap
  const adjustment = collisionOffset * sourceNormalSign;

  return diff - adjustment;
}

/**
 * Calculate offset to align faces (same plane)
 */
function calculateAlignmentOffset(
  sourceFace: OBBFace,
  targetFace: OBBFace,
  axisIndex: number
): number {
  // For alignment, we want faces to be on the same plane
  const sourcePos = sourceFace.center[axisIndex];
  const targetPos = targetFace.center[axisIndex];

  return targetPos - sourcePos;
}

/**
 * Calculate offset for T-joint snap (edge-to-face connection)
 *
 * For T-joint, we bring the moving part's edge (min or max on drag axis)
 * to touch the target face. The edge used depends on movement direction.
 */
function calculateTJointOffset(
  movingPart: Part,
  targetFace: OBBFace,
  axisIndex: number,
  movementDirection: 1 | -1,
  collisionOffset: number
): number {
  // Get the moving part's AABB
  const movingAABB = getPartAABB(movingPart, [0, 0, 0]);

  // Target face position on drag axis
  const targetPos = targetFace.center[axisIndex];
  const targetNormalSign = targetFace.normal[axisIndex] > 0 ? 1 : -1;

  // Determine which edge of moving part to use based on movement direction
  // If moving positive (+X), use the max edge (right side)
  // If moving negative (-X), use the min edge (left side)
  let movingEdge: number;
  if (movementDirection > 0) {
    movingEdge = movingAABB.max[axisIndex];
  } else {
    movingEdge = movingAABB.min[axisIndex];
  }

  // Calculate offset to bring edge to target face
  // Add collision offset based on target face normal direction
  const targetWithGap = targetPos - (collisionOffset * targetNormalSign);
  const offset = targetWithGap - movingEdge;

  return offset;
}

// ============================================================================
// Collision Detection
// ============================================================================

interface AABB {
  min: Vec3;
  max: Vec3;
}

/**
 * Check if snap would cause collision
 */
function wouldCauseCollision(
  movingPart: Part,
  targetPart: Part,
  offset: Vec3,
  collisionOffset: number
): boolean {
  // Get AABBs
  const movingAABB = getPartAABB(movingPart, offset);
  const targetAABB = getPartAABB(targetPart, [0, 0, 0]);

  // Shrink moving AABB by collision offset (allow touching)
  const shrunkMoving: AABB = {
    min: [
      movingAABB.min[0] + collisionOffset,
      movingAABB.min[1] + collisionOffset,
      movingAABB.min[2] + collisionOffset,
    ],
    max: [
      movingAABB.max[0] - collisionOffset,
      movingAABB.max[1] - collisionOffset,
      movingAABB.max[2] - collisionOffset,
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
    a.min[0] < b.max[0] && a.max[0] > b.min[0] &&
    a.min[1] < b.max[1] && a.max[1] > b.min[1] &&
    a.min[2] < b.max[2] && a.max[2] > b.min[2]
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique face ID
 */
function getFaceId(partId: string, face: OBBFace): string {
  return `${partId}-axis${face.axisIndex}-sign${face.sign}`;
}

/**
 * Check if offset is in the movement direction
 */
function isOffsetInDirection(offset: number, direction: 1 | -1): boolean {
  if (direction > 0) {
    return offset >= -0.5; // Allow tiny backwards movement
  } else {
    return offset <= 0.5; // Allow tiny forwards movement
  }
}

// ============================================================================
// Integration Helper for PartTransformControls
// ============================================================================

import type { Cabinet, SnapSettings, SnapPoint } from '@/types';

/**
 * Calculate V3 snap for a single part being dragged (single axis)
 * This is the integration point for PartTransformControls
 *
 * @param movingPart The part being dragged
 * @param currentPosition Current world position of the part (after drag)
 * @param allParts All parts in the scene
 * @param cabinets All cabinets (unused in V3 for now, but kept for API compatibility)
 * @param settings Snap settings
 * @param dragAxis The axis being dragged on
 * @returns Snap result compatible with V1/V2 interface
 */
export function calculatePartSnapV3(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxis: 'X' | 'Y' | 'Z'
): {
  snapped: boolean;
  position: Vec3;
  snapPoints: SnapPoint[];
} {
  const axisIndex = dragAxis === 'X' ? 0 : dragAxis === 'Y' ? 1 : 2;

  // Calculate current offset from original position
  const currentOffset: Vec3 = [
    currentPosition[0] - movingPart.position[0],
    currentPosition[1] - movingPart.position[1],
    currentPosition[2] - movingPart.position[2],
  ];

  // Determine movement direction from offset
  const offsetOnAxis = currentOffset[axisIndex];
  const movementDirection: 1 | -1 = offsetOnAxis >= 0 ? 1 : -1;

  // Get target parts (exclude moving part and same cabinet parts)
  const targetParts = allParts.filter(
    (p) =>
      p.id !== movingPart.id &&
      (!movingPart.cabinetMetadata?.cabinetId ||
        p.cabinetMetadata?.cabinetId !== movingPart.cabinetMetadata.cabinetId)
  );

  // Convert SnapSettings to SnapV3Settings
  const v3Settings: SnapV3Settings = {
    snapDistance: settings.distance,
    collisionOffset: settings.collisionOffset,
    hysteresisMargin: 2,
    enableConnectionSnap: settings.faceSnap,
    enableAlignmentSnap: settings.edgeSnap, // Use edge snap setting for alignment
    enableTJointSnap: settings.tJointSnap ?? true, // Enable T-joint snap for perpendicular faces
  };

  const input: SnapV3Input = {
    movingPart,
    targetParts,
    dragAxis,
    movementDirection,
    currentOffset,
  };

  const result = calculateSnapV3(input, v3Settings);

  if (!result.snapped) {
    return {
      snapped: false,
      position: currentPosition,
      snapPoints: [],
    };
  }

  // Calculate snapped position
  const snappedPosition: Vec3 = [...currentPosition];
  snappedPosition[axisIndex] = movingPart.position[axisIndex] + result.offset;

  // Create snap point for visualization
  const snapPoints: SnapPoint[] = result.sourceFaceId && result.targetFaceId
    ? [
        {
          id: `v3-snap-${result.sourceFaceId}-${result.targetFaceId}`,
          type: result.snapType === 'connection' ? 'face' : 'edge',
          position: snappedPosition,
          normal: dragAxis === 'X' ? [1, 0, 0] : dragAxis === 'Y' ? [0, 1, 0] : [0, 0, 1],
          partId: movingPart.id,
          strength: 1,
          axis: dragAxis,
        },
      ]
    : [];

  return {
    snapped: true,
    position: snappedPosition,
    snapPoints,
  };
}

// ============================================================================
// Cross-Axis Snapping (for rotated parts)
// ============================================================================

/**
 * Cross-axis snap result with snaps on multiple axes
 */
export interface CrossAxisSnapResult {
  snapped: boolean;
  position: Vec3;
  snapPoints: SnapPoint[];
  /** Which axes had snaps applied */
  snappedAxes: Array<'X' | 'Y' | 'Z'>;
}

/**
 * Calculate V3 snap with cross-axis support
 *
 * When dragging on one axis, this function also checks for snap opportunities
 * on other axes. This is especially useful for rotated parts where the "side"
 * faces may be perpendicular to a different world axis than expected.
 *
 * For example: A part rotated 90° around Y has its "side faces" (width)
 * perpendicular to Z instead of X. With cross-axis snapping, dragging on X
 * will also check for Z snaps and apply them.
 *
 * Cross-axis snapping activates when:
 * - The moving part OVERLAPS with a target part on the perpendicular axes
 * - This means the parts are "in range" for a face-to-face connection
 *
 * @param movingPart The part being dragged
 * @param currentPosition Current world position of the part (after drag)
 * @param allParts All parts in the scene
 * @param cabinets All cabinets
 * @param settings Snap settings
 * @param dragAxis The primary axis being dragged on
 * @returns Snap result with potential snaps on multiple axes
 */
export function calculatePartSnapV3CrossAxis(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxis: 'X' | 'Y' | 'Z'
): CrossAxisSnapResult {
  // Get target parts (exclude moving part and same cabinet parts)
  const targetParts = allParts.filter(
    (p) =>
      p.id !== movingPart.id &&
      (!movingPart.cabinetMetadata?.cabinetId ||
        p.cabinetMetadata?.cabinetId !== movingPart.cabinetMetadata.cabinetId)
  );

  if (targetParts.length === 0) {
    return {
      snapped: false,
      position: currentPosition,
      snapPoints: [],
      snappedAxes: [],
    };
  }

  // Calculate current offset from original position
  const currentOffset: Vec3 = [
    currentPosition[0] - movingPart.position[0],
    currentPosition[1] - movingPart.position[1],
    currentPosition[2] - movingPart.position[2],
  ];

  // Convert SnapSettings to SnapV3Settings
  const v3Settings: SnapV3Settings = {
    snapDistance: settings.distance,
    collisionOffset: settings.collisionOffset,
    hysteresisMargin: 2,
    enableConnectionSnap: settings.faceSnap,
    enableAlignmentSnap: settings.edgeSnap,
    enableTJointSnap: settings.tJointSnap ?? true, // Enable T-joint snap for perpendicular faces
  };

  // Get moving part AABB at current position
  const movingAABB = getPartAABB(movingPart, currentOffset);

  // Find target parts that overlap with moving part on perpendicular axes
  // Use a large snap distance for overlap check to handle rotated parts with thin AABBs
  const crossAxisTargets = findCrossAxisTargets(
    movingAABB,
    targetParts,
    dragAxis,
    settings.distance * 50 // Large overlap tolerance for rotated parts
  );

  // Check for snaps on all axes
  const axes: Array<'X' | 'Y' | 'Z'> = ['X', 'Y', 'Z'];
  const snappedPosition: Vec3 = [...currentPosition];
  const snapPoints: SnapPoint[] = [];
  const snappedAxes: Array<'X' | 'Y' | 'Z'> = [];

  for (const axis of axes) {
    const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
    const offsetOnAxis = currentOffset[axisIndex];
    const isCrossAxis = axis !== dragAxis;

    // For cross axes, only check targets that overlap on perpendicular dimensions
    // Extract parts for the snap calculation
    let effectiveTargetParts: Part[];
    if (isCrossAxis) {
      const overlappingTargets = crossAxisTargets.filter(t => t.overlapsOnAxis[axis]);
      if (overlappingTargets.length === 0) {
        continue; // No overlapping targets for this cross axis
      }
      effectiveTargetParts = overlappingTargets.map(t => t.part);
    } else {
      effectiveTargetParts = targetParts;
    }

    // For non-drag axes, we need to check if there are nearby faces
    // We use a bidirectional search (both +1 and -1 directions) for cross axes
    const directions: Array<1 | -1> = isCrossAxis
      ? [1, -1] // Cross axes: check both directions
      : [offsetOnAxis >= 0 ? 1 : -1]; // Drag axis: use actual movement direction

    let bestResult: SnapV3Result | null = null;
    let bestDistance = Infinity;

    // For cross-axis, use a larger distance threshold
    // When parts overlap on perpendicular axes, we allow snapping across larger distances
    const effectiveSnapDistance = isCrossAxis
      ? settings.distance * 50 // Much larger for cross-axis (1000mm for 20mm base)
      : settings.distance;

    // Create settings with adjusted snap distance for cross-axis
    const effectiveSettings: SnapV3Settings = {
      ...v3Settings,
      snapDistance: effectiveSnapDistance,
    };

    for (const direction of directions) {
      const input: SnapV3Input = {
        movingPart,
        targetParts: effectiveTargetParts,
        dragAxis: axis,
        movementDirection: direction,
        currentOffset,
      };

      const result = calculateSnapV3(input, effectiveSettings);

      if (result.snapped) {
        // Calculate distance to snap position from current dragged position
        const snapPos = movingPart.position[axisIndex] + result.offset;
        const distance = Math.abs(snapPos - currentPosition[axisIndex]);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestResult = result;
        }
      }
    }

    // Apply best snap for this axis if found
    // For cross-axis, we already filtered by overlap, so apply if any result found
    const distanceThreshold = isCrossAxis ? effectiveSnapDistance : settings.distance;
    if (bestResult && bestDistance <= distanceThreshold) {
      snappedPosition[axisIndex] = movingPart.position[axisIndex] + bestResult.offset;
      snappedAxes.push(axis);

      if (bestResult.sourceFaceId && bestResult.targetFaceId) {
        snapPoints.push({
          id: `v3-snap-${axis}-${bestResult.sourceFaceId}-${bestResult.targetFaceId}`,
          type: bestResult.snapType === 'connection' ? 'face' : 'edge',
          position: [...snappedPosition],
          normal: axis === 'X' ? [1, 0, 0] : axis === 'Y' ? [0, 1, 0] : [0, 0, 1],
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

/**
 * Find target parts that overlap with moving part on axes perpendicular to the given axis
 */
interface CrossAxisTarget {
  part: Part;
  overlapsOnAxis: { X: boolean; Y: boolean; Z: boolean };
}

function findCrossAxisTargets(
  movingAABB: AABB,
  targetParts: Part[],
  dragAxis: 'X' | 'Y' | 'Z',
  snapDistance: number
): CrossAxisTarget[] {
  const results: CrossAxisTarget[] = [];

  // Extend AABB by snap distance for more lenient overlap detection
  // This helps with rotated parts that have thin AABBs on some axes
  const extendedMovingAABB: AABB = {
    min: [
      movingAABB.min[0] - snapDistance,
      movingAABB.min[1] - snapDistance,
      movingAABB.min[2] - snapDistance,
    ],
    max: [
      movingAABB.max[0] + snapDistance,
      movingAABB.max[1] + snapDistance,
      movingAABB.max[2] + snapDistance,
    ],
  };

  for (const targetPart of targetParts) {
    const targetAABB = getPartAABB(targetPart, [0, 0, 0]);

    // Also extend target AABB
    const extendedTargetAABB: AABB = {
      min: [
        targetAABB.min[0] - snapDistance,
        targetAABB.min[1] - snapDistance,
        targetAABB.min[2] - snapDistance,
      ],
      max: [
        targetAABB.max[0] + snapDistance,
        targetAABB.max[1] + snapDistance,
        targetAABB.max[2] + snapDistance,
      ],
    };

    // Check overlap on each axis with extended AABBs
    // For cross-axis snapping to be valid, parts must overlap on the OTHER two axes
    // (the axes perpendicular to the potential snap axis)

    const overlapX = extendedMovingAABB.max[0] > extendedTargetAABB.min[0] &&
                     extendedMovingAABB.min[0] < extendedTargetAABB.max[0];
    const overlapY = extendedMovingAABB.max[1] > extendedTargetAABB.min[1] &&
                     extendedMovingAABB.min[1] < extendedTargetAABB.max[1];
    const overlapZ = extendedMovingAABB.max[2] > extendedTargetAABB.min[2] &&
                     extendedMovingAABB.min[2] < extendedTargetAABB.max[2];

    // For a cross-axis snap on axis A, we need overlap on the OTHER two axes
    // Example: For X-axis snap (cross when dragging Y or Z), need Y and Z overlap
    results.push({
      part: targetPart,
      overlapsOnAxis: {
        X: overlapY && overlapZ, // X snap valid if Y and Z overlap
        Y: overlapX && overlapZ, // Y snap valid if X and Z overlap
        Z: overlapX && overlapY, // Z snap valid if X and Y overlap
      },
    });
  }

  return results;
}

// ============================================================================
// Exports for Testing
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
  isOffsetInDirection,
};
