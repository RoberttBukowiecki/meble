/**
 * Wall Snapping Calculator
 *
 * Calculates snap positions for parts and cabinets relative to room walls and corners.
 * Integrates with the existing V3 snap system.
 */

import type {
  WallInnerSurface,
  WallCorner,
  WallSnapResult,
  WallSnapBounds,
  WallSnapCandidate,
} from "@/types/wall-snap";
import type { SnapSettings } from "@/types/transform";
import { SNAP_CONFIG } from "@/lib/config";

// ============================================================================
// Types
// ============================================================================

type DragAxis = "X" | "Y" | "Z";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Project a 2D point onto a line segment and return the closest point.
 */
function projectPointOntoSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): { point: [number, number]; t: number; distance: number } {
  const dx = segmentEnd[0] - segmentStart[0];
  const dz = segmentEnd[1] - segmentStart[1];
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) {
    // Segment is a point
    const dist = Math.sqrt(
      Math.pow(point[0] - segmentStart[0], 2) + Math.pow(point[1] - segmentStart[1], 2)
    );
    return { point: segmentStart, t: 0, distance: dist };
  }

  // Calculate projection parameter t
  const t = Math.max(
    0,
    Math.min(1, ((point[0] - segmentStart[0]) * dx + (point[1] - segmentStart[1]) * dz) / lengthSq)
  );

  // Closest point on segment
  const closestPoint: [number, number] = [segmentStart[0] + t * dx, segmentStart[1] + t * dz];

  // Distance from point to closest point
  const distance = Math.sqrt(
    Math.pow(point[0] - closestPoint[0], 2) + Math.pow(point[1] - closestPoint[1], 2)
  );

  return { point: closestPoint, t, distance };
}

/**
 * Check if the drag axis is relevant for a wall with the given normal.
 * Only snap when dragging perpendicular to the wall.
 */
function isDragAxisRelevantForWall(dragAxis: DragAxis, wallNormal: [number, number]): boolean {
  // Y axis never relevant for walls (walls don't constrain vertical movement)
  if (dragAxis === "Y") return false;

  // Wall normal X component determines relevance for X axis
  // Wall normal Z component determines relevance for Z axis
  const normalX = Math.abs(wallNormal[0]);
  const normalZ = Math.abs(wallNormal[1]);

  // If dragging X, wall must have significant X normal component
  if (dragAxis === "X" && normalX < SNAP_CONFIG.WALL_NORMAL_RELEVANCE_THRESHOLD) return false;

  // If dragging Z, wall must have significant Z normal component
  if (dragAxis === "Z" && normalZ < SNAP_CONFIG.WALL_NORMAL_RELEVANCE_THRESHOLD) return false;

  return true;
}

/**
 * Get the object edge position that would touch the wall.
 */
function getObjectEdgeForWall(
  bounds: WallSnapBounds,
  dragAxis: DragAxis,
  wallNormal: [number, number]
): number {
  if (dragAxis === "X") {
    // If wall normal points in +X, object's min X edge would touch
    // If wall normal points in -X, object's max X edge would touch
    return wallNormal[0] > 0 ? bounds.min[0] : bounds.max[0];
  } else {
    // dragAxis === 'Z'
    return wallNormal[1] > 0 ? bounds.min[2] : bounds.max[2];
  }
}

// ============================================================================
// Wall Surface Snap
// ============================================================================

/**
 * Check if object can snap to a wall surface.
 */
function checkWallSurfaceSnap(
  bounds: WallSnapBounds,
  surface: WallInnerSurface,
  dragAxis: DragAxis,
  settings: SnapSettings
): WallSnapCandidate | null {
  // Check if this wall is relevant for the drag axis
  if (!isDragAxisRelevantForWall(dragAxis, surface.normal)) {
    return null;
  }

  // Object center in 2D (x, z)
  const objectCenter2D: [number, number] = [bounds.center[0], bounds.center[2]];

  // Project object center onto wall inner surface
  const projection = projectPointOntoSegment(objectCenter2D, surface.start, surface.end);

  // Skip if object is outside wall bounds (with some margin)
  if (projection.t < -0.1 || projection.t > 1.1) {
    return null;
  }

  // Get the object edge that would touch the wall
  const objectEdge = getObjectEdgeForWall(bounds, dragAxis, surface.normal);

  // Wall position on the relevant axis
  const wallPosition = dragAxis === "X" ? projection.point[0] : projection.point[1];

  // Distance from object edge to wall
  const distance = Math.abs(objectEdge - wallPosition);

  // Check if within snap threshold
  if (distance > settings.distance) {
    return null;
  }

  // Calculate snap offset (move object so edge aligns with wall)
  const snapOffset: [number, number, number] = [0, 0, 0];
  const axisIndex = dragAxis === "X" ? 0 : 2;

  // Offset = wall position - object edge + snap gap
  // Direction depends on which side of wall we're on
  const direction = surface.normal[dragAxis === "X" ? 0 : 1] > 0 ? 1 : -1;
  const snapGap = settings.snapGap ?? settings.collisionOffset ?? 0.1;
  snapOffset[axisIndex] = wallPosition - objectEdge + direction * snapGap;

  // Visual guide (vertical line at snap point)
  const guideX = dragAxis === "X" ? wallPosition : bounds.center[0];
  const guideZ = dragAxis === "Z" ? wallPosition : bounds.center[2];

  return {
    type: "wall",
    wallId: surface.wallId,
    snapOffset,
    distance,
    visualGuide: {
      start: [guideX, bounds.min[1], guideZ],
      end: [guideX, Math.min(bounds.max[1], surface.heightMm), guideZ],
    },
  };
}

// ============================================================================
// Corner Snap
// ============================================================================

/**
 * Check if object can snap to a corner (two walls simultaneously).
 */
function checkCornerSnap(
  bounds: WallSnapBounds,
  corner: WallCorner,
  settings: SnapSettings
): WallSnapCandidate | null {
  // Object center in 2D
  const objectCenter2D: [number, number] = [bounds.center[0], bounds.center[2]];

  // Calculate distances to both walls at the corner
  // Using corner point as reference and normals to calculate perpendicular distances

  // Distance to wall 1 (along normal 1)
  const toCornerX = corner.point[0] - objectCenter2D[0];
  const toCornerZ = corner.point[1] - objectCenter2D[1];

  // How far is object from each wall plane passing through corner
  const distToWall1 = Math.abs(
    toCornerX * corner.wall1Normal[0] + toCornerZ * corner.wall1Normal[1]
  );
  const distToWall2 = Math.abs(
    toCornerX * corner.wall2Normal[0] + toCornerZ * corner.wall2Normal[1]
  );

  // Account for object size
  const halfWidth = (bounds.max[0] - bounds.min[0]) / 2;
  const halfDepth = (bounds.max[2] - bounds.min[2]) / 2;

  // Effective distance considering object size
  const effectiveDistToWall1 =
    distToWall1 -
    Math.abs(halfWidth * corner.wall1Normal[0]) -
    Math.abs(halfDepth * corner.wall1Normal[1]);
  const effectiveDistToWall2 =
    distToWall2 -
    Math.abs(halfWidth * corner.wall2Normal[0]) -
    Math.abs(halfDepth * corner.wall2Normal[1]);

  // Corner snap threshold is slightly larger
  const cornerThreshold = settings.distance * SNAP_CONFIG.CORNER_SNAP_THRESHOLD_MULTIPLIER;

  // Must be close to BOTH walls
  if (effectiveDistToWall1 > cornerThreshold || effectiveDistToWall2 > cornerThreshold) {
    return null;
  }

  // Calculate combined snap offset to align with both walls
  // Find target position where object edge touches both walls

  // Target position for object center
  // Wall 1: object edge should be at corner point + offset along normal
  // Wall 2: object edge should be at corner point + offset along normal

  // Object half-size projected onto each normal
  const halfSizeAlongN1 =
    Math.abs(halfWidth * corner.wall1Normal[0]) + Math.abs(halfDepth * corner.wall1Normal[1]);
  const halfSizeAlongN2 =
    Math.abs(halfWidth * corner.wall2Normal[0]) + Math.abs(halfDepth * corner.wall2Normal[1]);

  // Target center position
  const snapGap = settings.snapGap ?? settings.collisionOffset ?? 0.1;
  const targetCenterX =
    corner.point[0] +
    corner.wall1Normal[0] * (halfSizeAlongN1 + snapGap) +
    corner.wall2Normal[0] * (halfSizeAlongN2 + snapGap);
  const targetCenterZ =
    corner.point[1] +
    corner.wall1Normal[1] * (halfSizeAlongN1 + snapGap) +
    corner.wall2Normal[1] * (halfSizeAlongN2 + snapGap);

  const snapOffset: [number, number, number] = [
    targetCenterX - bounds.center[0],
    0,
    targetCenterZ - bounds.center[2],
  ];

  // Combined distance for sorting
  const combinedDistance = Math.sqrt(
    effectiveDistToWall1 * effectiveDistToWall1 + effectiveDistToWall2 * effectiveDistToWall2
  );

  return {
    type: "corner",
    cornerId: corner.id,
    snapOffset,
    distance: combinedDistance,
    visualGuide: {
      start: [corner.point[0], bounds.min[1], corner.point[1]],
      end: [corner.point[0], Math.min(bounds.max[1], corner.heightMm), corner.point[1]],
    },
  };
}

// ============================================================================
// Main Snap Calculator
// ============================================================================

/**
 * Calculate wall snap for an object.
 *
 * @param bounds - Object bounding box
 * @param surfaces - Pre-computed wall inner surfaces
 * @param corners - Pre-computed wall corners
 * @param dragAxis - Current drag axis
 * @param settings - Snap settings
 * @returns Snap result with offset and visual guides
 */
export function calculateWallSnap(
  bounds: WallSnapBounds,
  surfaces: WallInnerSurface[],
  corners: WallCorner[],
  dragAxis: DragAxis,
  settings: SnapSettings & { wallSnap?: boolean; cornerSnap?: boolean }
): WallSnapResult {
  // Default result (no snap)
  const noSnapResult: WallSnapResult = {
    snapped: false,
    snapOffset: [0, 0, 0],
    visualGuides: [],
  };

  // Early exit if wall snap disabled
  if (!settings.wallSnap) {
    return noSnapResult;
  }

  // Y axis doesn't snap to walls
  if (dragAxis === "Y") {
    return noSnapResult;
  }

  const candidates: WallSnapCandidate[] = [];

  // Check corner snaps first (they take priority)
  if (settings.cornerSnap !== false) {
    for (const corner of corners) {
      const candidate = checkCornerSnap(bounds, corner, settings);
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  // Check wall surface snaps
  for (const surface of surfaces) {
    const candidate = checkWallSurfaceSnap(bounds, surface, dragAxis, settings);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    return noSnapResult;
  }

  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distance - b.distance);

  // Take the best candidate
  // Corner snaps have priority if they're close enough
  let bestCandidate = candidates[0];

  // Prefer corner if it's within reasonable distance
  const cornerCandidate = candidates.find((c) => c.type === "corner");
  if (cornerCandidate && cornerCandidate.distance < settings.distance * 2) {
    bestCandidate = cornerCandidate;
  }

  return {
    snapped: true,
    snapOffset: bestCandidate.snapOffset,
    axis: dragAxis === "X" ? "X" : "Z",
    snappedToWall: bestCandidate.type === "wall" ? bestCandidate.wallId : undefined,
    snappedToCorner: bestCandidate.type === "corner" ? bestCandidate.cornerId : undefined,
    visualGuides: [
      {
        type: bestCandidate.type,
        start: bestCandidate.visualGuide.start,
        end: bestCandidate.visualGuide.end,
      },
    ],
  };
}

/**
 * Calculate wall snap for a cabinet (group of parts).
 * Uses the cabinet's bounding box for snap calculations.
 */
export function calculateCabinetWallSnap(
  cabinetBounds: WallSnapBounds,
  surfaces: WallInnerSurface[],
  corners: WallCorner[],
  dragAxis: DragAxis,
  settings: SnapSettings & { wallSnap?: boolean; cornerSnap?: boolean }
): WallSnapResult {
  // Cabinets use the same algorithm as parts
  return calculateWallSnap(cabinetBounds, surfaces, corners, dragAxis, settings);
}

/**
 * Create bounds object from min/max arrays.
 */
export function createWallSnapBounds(
  min: [number, number, number],
  max: [number, number, number]
): WallSnapBounds {
  return {
    min,
    max,
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
  };
}

// ============================================================================
// Multi-Axis Wall Snap (Planar Drag)
// ============================================================================

/**
 * Calculate wall snap for multi-axis drag (planar drag on XZ plane).
 * Prioritizes corner snaps which provide alignment to both walls simultaneously.
 *
 * @param bounds - Object bounding box
 * @param surfaces - Pre-computed wall inner surfaces
 * @param corners - Pre-computed wall corners
 * @param settings - Snap settings
 * @returns Snap result with combined X and Z offsets
 */
export function calculateMultiAxisWallSnap(
  bounds: WallSnapBounds,
  surfaces: WallInnerSurface[],
  corners: WallCorner[],
  settings: SnapSettings & { wallSnap?: boolean; cornerSnap?: boolean }
): WallSnapResult {
  // Default result (no snap)
  const noSnapResult: WallSnapResult = {
    snapped: false,
    snapOffset: [0, 0, 0],
    visualGuides: [],
  };

  // Early exit if wall snap disabled
  if (!settings.wallSnap) {
    return noSnapResult;
  }

  // Step 1: Try corner snap first (provides both X and Z)
  if (settings.cornerSnap !== false) {
    const cornerCandidates: WallSnapCandidate[] = [];

    for (const corner of corners) {
      const candidate = checkCornerSnap(bounds, corner, settings);
      if (candidate) {
        cornerCandidates.push(candidate);
      }
    }

    // Sort by distance and take the closest corner
    if (cornerCandidates.length > 0) {
      cornerCandidates.sort((a, b) => a.distance - b.distance);
      const bestCorner = cornerCandidates[0];

      // Corner snap within threshold - use it (snaps both X and Z)
      if (bestCorner.distance < settings.distance * SNAP_CONFIG.CORNER_SNAP_THRESHOLD_MULTIPLIER) {
        return {
          snapped: true,
          snapOffset: bestCorner.snapOffset,
          axis: "XZ",
          snappedAxes: ["X", "Z"],
          snappedToCorner: bestCorner.cornerId,
          visualGuides: [
            {
              type: "corner",
              start: bestCorner.visualGuide.start,
              end: bestCorner.visualGuide.end,
            },
          ],
        };
      }
    }
  }

  // Step 2: Try individual wall snaps on each axis independently
  const xResult = calculateWallSnap(bounds, surfaces, corners, "X", {
    ...settings,
    cornerSnap: false, // Already checked corners above
  });
  const zResult = calculateWallSnap(bounds, surfaces, corners, "Z", {
    ...settings,
    cornerSnap: false, // Already checked corners above
  });

  // Combine results from both axes
  const combinedOffset: [number, number, number] = [
    xResult.snapped ? xResult.snapOffset[0] : 0,
    0,
    zResult.snapped ? zResult.snapOffset[2] : 0,
  ];

  const snappedAxes: Array<"X" | "Z"> = [];
  if (xResult.snapped) snappedAxes.push("X");
  if (zResult.snapped) snappedAxes.push("Z");

  const visualGuides: WallSnapResult["visualGuides"] = [
    ...xResult.visualGuides,
    ...zResult.visualGuides,
  ];

  if (snappedAxes.length === 0) {
    return noSnapResult;
  }

  return {
    snapped: true,
    snapOffset: combinedOffset,
    axis: snappedAxes.length === 2 ? "XZ" : snappedAxes[0],
    snappedAxes,
    snappedToWall: xResult.snappedToWall || zResult.snappedToWall,
    visualGuides,
  };
}
