/**
 * Dimension Calculator
 *
 * Calculates dimension lines to display during transform operations.
 * Shows distances to nearest cabinets/groups on the active transform axis.
 */

import type { DimensionBoundingBox, DimensionLine, DimensionSettings } from '@/types';
import {
  boxesOverlapOnOtherAxes,
  getAxisDistance,
  quickDistanceCheck,
} from './bounding-box-utils';

// ============================================================================
// Types
// ============================================================================

type Vec3 = [number, number, number];

interface DimensionCandidate {
  targetId: string;
  distance: number;
  direction: 1 | -1;
  startPoint: Vec3;
  endPoint: Vec3;
}

// ============================================================================
// Constants
// ============================================================================

/** Default settings for dimension display */
export const DEFAULT_DIMENSION_SETTINGS: DimensionSettings = {
  enabled: true,
  maxVisiblePerAxis: 3,
  maxDistanceThreshold: 1000,
  showAxisColors: false,
};

/** Maximum distance to consider for early exit */
const MAX_CONSIDERATION_DISTANCE = 2000;

// ============================================================================
// Main Calculation
// ============================================================================

/**
 * Calculate dimension lines for the active transform axis
 *
 * @param movingBounds - Bounding box of the object being moved
 * @param allBounds - All other bounding boxes in the scene
 * @param activeAxis - The axis being transformed ('X', 'Y', or 'Z')
 * @param settings - Dimension display settings
 * @returns Array of dimension lines to render
 */
export function calculateDimensions(
  movingBounds: DimensionBoundingBox,
  allBounds: DimensionBoundingBox[],
  activeAxis: 'X' | 'Y' | 'Z',
  settings: DimensionSettings
): DimensionLine[] {
  if (!settings.enabled) return [];

  const candidates: DimensionCandidate[] = [];
  const axisIndex = activeAxis === 'X' ? 0 : activeAxis === 'Y' ? 1 : 2;

  for (const targetBounds of allBounds) {
    // Skip self
    if (targetBounds.groupId === movingBounds.groupId) continue;

    // Early exit: quick distance check
    if (!quickDistanceCheck(movingBounds, targetBounds, MAX_CONSIDERATION_DISTANCE)) {
      continue;
    }

    // Check if boxes have overlapping projection on other axes
    // This ensures we only show dimensions to objects that are "in line" with the movement
    if (!boxesOverlapOnOtherAxes(movingBounds, targetBounds, activeAxis)) {
      continue;
    }

    // Calculate distance on the active axis
    const { distance, direction } = getAxisDistance(movingBounds, targetBounds, activeAxis);

    // Skip if overlapping or beyond threshold
    if (distance < 0) continue;
    if (distance > settings.maxDistanceThreshold) continue;

    // Calculate dimension line endpoints (always straight line)
    const { startPoint, endPoint } = calculateDimensionEndpoints(
      movingBounds,
      targetBounds,
      activeAxis,
      direction
    );

    candidates.push({
      targetId: targetBounds.groupId,
      distance,
      direction,
      startPoint,
      endPoint,
    });
  }

  // Sort by distance and take top N
  candidates.sort((a, b) => a.distance - b.distance);
  const topCandidates = candidates.slice(0, settings.maxVisiblePerAxis);

  // Convert to dimension lines
  return topCandidates.map((candidate, index) => ({
    id: `dim-${activeAxis}-${candidate.targetId}-${index}`,
    axis: activeAxis,
    startPoint: candidate.startPoint,
    endPoint: candidate.endPoint,
    distance: Math.round(candidate.distance * 10) / 10, // Round to 0.1mm
    targetId: candidate.targetId,
  }));
}

/**
 * Calculate dimension line endpoints ensuring the line is always straight
 * Both points share the same coordinates on non-measurement axes
 */
function calculateDimensionEndpoints(
  movingBounds: DimensionBoundingBox,
  targetBounds: DimensionBoundingBox,
  axis: 'X' | 'Y' | 'Z',
  direction: 1 | -1
): { startPoint: Vec3; endPoint: Vec3 } {
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;

  // Use the moving object's center for non-measurement axes
  // This ensures the dimension line is always straight
  const baseY = axis !== 'Y' ? movingBounds.center[1] : 0;
  const baseZ = axis !== 'Z' ? movingBounds.center[2] : 0;
  const baseX = axis !== 'X' ? movingBounds.center[0] : 0;

  // Calculate start point (on moving object's face)
  const startPoint: Vec3 = [baseX, baseY, baseZ];
  startPoint[axisIndex] = direction === 1 ? movingBounds.max[axisIndex] : movingBounds.min[axisIndex];

  // Calculate end point (on target object's face)
  // Use SAME non-measurement coordinates as start point for straight line
  const endPoint: Vec3 = [baseX, baseY, baseZ];
  endPoint[axisIndex] = direction === 1 ? targetBounds.min[axisIndex] : targetBounds.max[axisIndex];

  return { startPoint, endPoint };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate dimensions for multiple axes (useful for showing all dimensions at once)
 * Currently not used but available for future enhancement
 */
export function calculateDimensionsAllAxes(
  movingBounds: DimensionBoundingBox,
  allBounds: DimensionBoundingBox[],
  settings: DimensionSettings
): DimensionLine[] {
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];
  const allDimensions: DimensionLine[] = [];

  for (const axis of axes) {
    const dimensions = calculateDimensions(movingBounds, allBounds, axis, settings);
    allDimensions.push(...dimensions);
  }

  return allDimensions;
}

/**
 * Get the nearest distance on a specific axis
 * Useful for snapping or display purposes
 */
export function getNearestDistance(
  movingBounds: DimensionBoundingBox,
  allBounds: DimensionBoundingBox[],
  axis: 'X' | 'Y' | 'Z'
): number | null {
  let nearestDistance: number | null = null;

  for (const targetBounds of allBounds) {
    if (targetBounds.groupId === movingBounds.groupId) continue;

    if (!boxesOverlapOnOtherAxes(movingBounds, targetBounds, axis)) {
      continue;
    }

    const { distance } = getAxisDistance(movingBounds, targetBounds, axis);

    if (distance >= 0 && (nearestDistance === null || distance < nearestDistance)) {
      nearestDistance = distance;
    }
  }

  return nearestDistance;
}
