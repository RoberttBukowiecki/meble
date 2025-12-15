/**
 * Snap V2 Engine
 *
 * Provides group-to-group snapping based on external bounding boxes.
 * V2 snaps to OBB (Oriented Bounding Box) faces rather than individual part faces.
 *
 * Key differences from V1:
 * - Snaps to cabinet/group bounding boxes instead of individual part faces
 * - Better UX when arranging furniture pieces in room layouts
 * - Internal snap within same cabinet still uses V1 logic
 */

import type { Part, Cabinet, SnapSettings, SnapResult, SnapPoint } from '@/types';
import {
  type Vec3,
  type OBBFace,
  vec3Add,
  vec3Sub,
  vec3Dot,
  vec3Scale,
  vec3Distance,
  calculateFaceToFaceDistance,
  calculateFaceSnapOffset,
  areOBBsWithinSnapRange,
} from './obb';
import {
  type GroupBoundingBoxes,
  calculatePartGroupBounds,
  calculatePartGroupBoundsWithOffset,
  calculateCabinetGroupBoundsWithOffset,
  getTargetGroupBounds,
} from './group-bounds';

// ============================================================================
// Types
// ============================================================================

/**
 * Snap candidate for V2 snapping
 */
export interface SnapV2Candidate {
  type: 'face' | 'edge';
  sourceGroupId: string;
  targetGroupId: string;
  sourceFace: OBBFace;
  targetFace: OBBFace;
  snapOffset: Vec3;
  distance: number;
  alignment: number; // 0-1, how well faces align
  usedExtendedBox: boolean; // True if snapped to extended BB
}

// ============================================================================
// Constants
// ============================================================================

/** Threshold for considering faces opposite (dot product) */
const OPPOSITE_THRESHOLD = -0.95;

/** Maximum candidates to consider for performance */
const MAX_CANDIDATES = 20;

/** Maximum snap points to return for visualization */
const MAX_SNAP_POINTS = 5;

/** Penalty factor for extended box snaps (prefer core box) */
const EXTENDED_BOX_PENALTY = 0.8;

// ============================================================================
// Face-to-Face Snap Calculations
// ============================================================================

/**
 * Find face-to-face snap candidates between two groups
 */
function findFaceSnapCandidates(
  movingGroup: GroupBoundingBoxes,
  targetGroup: GroupBoundingBoxes,
  settings: SnapSettings
): SnapV2Candidate[] {
  const candidates: SnapV2Candidate[] = [];
  const collisionOffset = settings.collisionOffset ?? 1.0;

  // Try core-to-core first, then core-to-extended, then extended-to-extended
  const facePairs: Array<{
    source: OBBFace[];
    target: OBBFace[];
    usedExtended: boolean;
  }> = [
    { source: movingGroup.faces.core, target: targetGroup.faces.core, usedExtended: false },
    { source: movingGroup.faces.core, target: targetGroup.faces.extended, usedExtended: true },
    { source: movingGroup.faces.extended, target: targetGroup.faces.core, usedExtended: true },
  ];

  for (const { source: sourceFaces, target: targetFaces, usedExtended } of facePairs) {
    for (const sourceFace of sourceFaces) {
      for (const targetFace of targetFaces) {
        // Check if faces are opposite (facing each other)
        const dotProduct = vec3Dot(sourceFace.normal, targetFace.normal);
        if (dotProduct > OPPOSITE_THRESHOLD) continue;

        // Calculate distance
        const distance = calculateFaceToFaceDistance(sourceFace, targetFace);
        if (distance === null || distance > settings.distance) continue;

        // Calculate snap offset
        const snapOffset = calculateFaceSnapOffset(sourceFace, targetFace, collisionOffset);

        candidates.push({
          type: 'face',
          sourceGroupId: movingGroup.groupId,
          targetGroupId: targetGroup.groupId,
          sourceFace,
          targetFace,
          snapOffset,
          distance,
          alignment: Math.abs(dotProduct),
          usedExtendedBox: usedExtended,
        });
      }
    }
  }

  return candidates;
}

/**
 * Score a snap candidate based on distance and alignment
 */
function scoreSnapCandidate(
  candidate: SnapV2Candidate,
  settings: SnapSettings
): number {
  const maxDistance = settings.distance;

  // Distance component (closer = higher score)
  const normalizedDistance = Math.min(candidate.distance / maxDistance, 1);
  const distanceScore =
    settings.strengthCurve === 'quadratic'
      ? Math.pow(1 - normalizedDistance, 2)
      : 1 - normalizedDistance;

  // Alignment component (better aligned = higher score)
  const alignmentScore = candidate.alignment;

  // Prefer core BB over extended BB
  const extendedPenalty = candidate.usedExtendedBox ? EXTENDED_BOX_PENALTY : 1.0;

  return distanceScore * alignmentScore * extendedPenalty;
}

/**
 * Convert snap candidate to snap point for visualization
 */
function candidateToSnapPoint(candidate: SnapV2Candidate, score: number): SnapPoint {
  // Calculate position between the two faces
  const snapPosition: Vec3 = [
    (candidate.sourceFace.center[0] + candidate.targetFace.center[0]) / 2,
    (candidate.sourceFace.center[1] + candidate.targetFace.center[1]) / 2,
    (candidate.sourceFace.center[2] + candidate.targetFace.center[2]) / 2,
  ];

  return {
    id: `v2-${candidate.type}-${candidate.targetGroupId}-${candidate.targetFace.axisIndex}`,
    type: candidate.type,
    position: snapPosition,
    normal: candidate.targetFace.normal,
    partId: candidate.targetGroupId,
    strength: Math.min(score, 1),
  };
}

// ============================================================================
// Single-Axis Snap (Simplified for Transform Controls)
// ============================================================================

/**
 * Simple axis-constrained snap for transform controls
 * Returns the best snap candidate for a single axis
 */
export function calculateSnapV2Simple(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  axis: 'X' | 'Y' | 'Z',
  settings: SnapSettings
): { snapped: boolean; offset: number; candidate: SnapV2Candidate | null; snapPoints: SnapPoint[] } {
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
  const collisionOffset = settings.collisionOffset ?? 1.0;

  let bestCandidate: SnapV2Candidate | null = null;
  let bestScore = 0;

  for (const targetGroup of targetGroups) {
    // Early exit: bounding sphere check
    if (!areOBBsWithinSnapRange(movingGroup.core, targetGroup.core, settings.distance)) {
      continue;
    }

    // Find face snap candidates
    const candidates = findFaceSnapCandidates(movingGroup, targetGroup, settings);

    // Filter candidates that primarily affect the drag axis
    for (const candidate of candidates) {
      // Check if this snap is on the drag axis
      const axisComponent = Math.abs(candidate.snapOffset[axisIndex]);
      const totalLength = Math.sqrt(
        candidate.snapOffset[0] ** 2 +
        candidate.snapOffset[1] ** 2 +
        candidate.snapOffset[2] ** 2
      );

      // Only consider snaps that are primarily on the drag axis
      if (totalLength > 0 && axisComponent / totalLength < 0.9) continue;

      const score = scoreSnapCandidate(candidate, settings);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
  }

  if (!bestCandidate) {
    return { snapped: false, offset: 0, candidate: null, snapPoints: [] };
  }

  // Extract the offset for the single axis
  const offset = bestCandidate.snapOffset[axisIndex];

  // Generate snap point for visualization
  const snapPoint = candidateToSnapPoint(bestCandidate, bestScore);
  snapPoint.axis = axis;

  return {
    snapped: true,
    offset,
    candidate: bestCandidate,
    snapPoints: [snapPoint],
  };
}

// ============================================================================
// Full Snap Calculation (Multi-Axis)
// ============================================================================

/**
 * Main V2 snap calculation
 * Returns best snap candidates for group-to-group snapping
 */
export function calculateSnapV2(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  settings: SnapSettings
): SnapV2Candidate[] {
  const allCandidates: Array<SnapV2Candidate & { score: number }> = [];

  for (const targetGroup of targetGroups) {
    // Early exit: bounding sphere check
    if (!areOBBsWithinSnapRange(movingGroup.core, targetGroup.core, settings.distance)) {
      continue;
    }

    // Find face snap candidates
    const candidates = findFaceSnapCandidates(movingGroup, targetGroup, settings);

    for (const candidate of candidates) {
      const score = scoreSnapCandidate(candidate, settings);
      if (score > 0.1) {
        allCandidates.push({ ...candidate, score });
      }
    }

    // Limit candidates for performance
    if (allCandidates.length > MAX_CANDIDATES * 2) {
      break;
    }
  }

  // Sort by score and take best
  allCandidates.sort((a, b) => b.score - a.score);
  return allCandidates.slice(0, MAX_CANDIDATES);
}

// ============================================================================
// Integrated Snap Function for Part Transform
// ============================================================================

/**
 * Calculate V2 snap for a moving part
 * Creates a group bounds for the part and snaps to other groups
 */
export function calculatePartSnapV2(
  part: Part,
  newPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  axis: 'X' | 'Y' | 'Z'
): SnapResult {
  // Calculate offset from original position
  const positionOffset: Vec3 = [
    newPosition[0] - part.position[0],
    newPosition[1] - part.position[1],
    newPosition[2] - part.position[2],
  ];

  // Create group bounds for the moving part
  const movingGroup = calculatePartGroupBoundsWithOffset(part, positionOffset);

  // Get target groups (excluding the moving part)
  const excludeGroupIds = new Set<string>([part.id]);

  // If part is in a cabinet, exclude that cabinet too
  if (part.cabinetMetadata?.cabinetId) {
    excludeGroupIds.add(part.cabinetMetadata.cabinetId);
  }

  const targetGroups = getTargetGroupBounds(allParts, cabinets, excludeGroupIds);

  // Calculate snap
  const result = calculateSnapV2Simple(movingGroup, targetGroups, axis, settings);

  if (!result.snapped) {
    return { snapped: false, position: newPosition, snapPoints: [] };
  }

  // Apply snap offset to position
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
  const snappedPosition: Vec3 = [...newPosition];
  snappedPosition[axisIndex] += result.offset;

  return {
    snapped: true,
    position: snappedPosition,
    snapPoints: result.snapPoints,
  };
}

/**
 * Calculate the center position of a cabinet from its parts
 */
function calculateCabinetCenter(cabinet: Cabinet, parts: Part[]): Vec3 {
  const cabinetParts = parts.filter(
    (p) => p.cabinetMetadata?.cabinetId === cabinet.id
  );

  if (cabinetParts.length === 0) return [0, 0, 0];

  let sumX = 0, sumY = 0, sumZ = 0;
  for (const part of cabinetParts) {
    sumX += part.position[0];
    sumY += part.position[1];
    sumZ += part.position[2];
  }

  return [
    sumX / cabinetParts.length,
    sumY / cabinetParts.length,
    sumZ / cabinetParts.length,
  ];
}

/**
 * Calculate V2 snap for a moving cabinet
 * Creates group bounds for the cabinet and snaps to other groups
 */
export function calculateCabinetSnapV2(
  cabinet: Cabinet,
  positionOffset: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  axis: 'X' | 'Y' | 'Z'
): SnapResult {
  // Calculate the original cabinet center from parts
  const originalCenter = calculateCabinetCenter(cabinet, allParts);

  // Create group bounds for the moving cabinet with offset
  const movingGroup = calculateCabinetGroupBoundsWithOffset(cabinet, allParts, positionOffset);

  // Get target groups (excluding this cabinet)
  const excludeGroupIds = new Set<string>([cabinet.id]);
  const targetGroups = getTargetGroupBounds(allParts, cabinets, excludeGroupIds);

  // Calculate snap
  const result = calculateSnapV2Simple(movingGroup, targetGroups, axis, settings);

  // Current position (original center + offset)
  const currentPosition: Vec3 = [
    originalCenter[0] + positionOffset[0],
    originalCenter[1] + positionOffset[1],
    originalCenter[2] + positionOffset[2],
  ];

  if (!result.snapped) {
    // Return the position with original offset
    return {
      snapped: false,
      position: currentPosition,
      snapPoints: [],
    };
  }

  // Apply snap offset to position
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
  const snappedPosition: Vec3 = [...currentPosition];
  snappedPosition[axisIndex] += result.offset;

  return {
    snapped: true,
    position: snappedPosition,
    snapPoints: result.snapPoints,
  };
}

// ============================================================================
// Determine Snap Version to Use
// ============================================================================

/**
 * Determine if V2 snap should be used
 * V2 is used for cross-group snapping, V1 for internal cabinet snapping
 */
export function shouldUseSnapV2(
  movingPartId: string,
  targetPartId: string | undefined,
  parts: Part[],
  snapVersion: 'v1' | 'v2'
): boolean {
  // If V1 is explicitly set, use V1
  if (snapVersion === 'v1') return false;

  // If no target, use V2 (general snapping)
  if (!targetPartId) return true;

  const movingPart = parts.find((p) => p.id === movingPartId);
  const targetPart = parts.find((p) => p.id === targetPartId);

  // If both parts are in the same cabinet, use V1 (internal snap)
  if (
    movingPart?.cabinetMetadata?.cabinetId &&
    movingPart.cabinetMetadata.cabinetId === targetPart?.cabinetMetadata?.cabinetId
  ) {
    return false;
  }

  // Otherwise use V2 (cross-group snap)
  return true;
}
