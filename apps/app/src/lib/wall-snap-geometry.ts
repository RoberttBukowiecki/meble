/**
 * Wall Snap Geometry Calculator
 *
 * Calculates wall inner surfaces and interior corners for snap operations.
 * This is computed once when room/walls change and cached for performance.
 */

import type { Room, WallSegment } from "@/types/room";
import type { WallInnerSurface, WallCorner } from "@/types/wall-snap";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate dot product of two 2D vectors
 */
function dot2D(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

/**
 * Calculate length of a 2D vector
 */
function length2D(v: [number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

/**
 * Normalize a 2D vector
 */
function normalize2D(v: [number, number]): [number, number] {
  const len = length2D(v);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

/**
 * Calculate distance between two 2D points
 */
function distance2D(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return Math.sqrt(dx * dx + dz * dz);
}

// ============================================================================
// Core Geometry Functions
// ============================================================================

/**
 * Calculate room centroid from wall vertices.
 * Used to determine which direction is "inside" the room.
 */
export function calculateRoomCentroid(walls: WallSegment[]): [number, number] {
  if (walls.length === 0) {
    return [0, 0];
  }

  // Collect unique vertices (use start points, assumes closed polygon)
  let sumX = 0;
  let sumZ = 0;

  for (const wall of walls) {
    sumX += wall.start[0];
    sumZ += wall.start[1];
  }

  return [sumX / walls.length, sumZ / walls.length];
}

/**
 * Determine the inward-pointing normal for a wall segment.
 * The normal points toward the room interior (centroid side).
 */
export function determineInwardNormal(
  wallStart: [number, number],
  wallEnd: [number, number],
  roomCentroid: [number, number]
): [number, number] {
  // Wall direction vector
  const dx = wallEnd[0] - wallStart[0];
  const dz = wallEnd[1] - wallStart[1];
  const len = Math.sqrt(dx * dx + dz * dz);

  if (len === 0) {
    return [0, 0];
  }

  // Two possible perpendicular normals (90° rotations)
  // CCW rotation: [-dz, dx]
  // CW rotation: [dz, -dx]
  const normal1: [number, number] = [-dz / len, dx / len];
  const normal2: [number, number] = [dz / len, -dx / len];

  // Wall midpoint
  const midX = (wallStart[0] + wallEnd[0]) / 2;
  const midZ = (wallStart[1] + wallEnd[1]) / 2;

  // Vector from midpoint to centroid
  const toCentroid: [number, number] = [roomCentroid[0] - midX, roomCentroid[1] - midZ];

  // Pick the normal that points toward centroid (positive dot product)
  const dot1 = dot2D(normal1, toCentroid);

  return dot1 > 0 ? normal1 : normal2;
}

/**
 * Calculate inner surface of a wall (offset by thickness/2 toward room interior).
 */
function offsetWallLine(
  start: [number, number],
  end: [number, number],
  normal: [number, number],
  thickness: number
): { start: [number, number]; end: [number, number] } {
  const offset = thickness / 2;
  return {
    start: [start[0] + normal[0] * offset, start[1] + normal[1] * offset],
    end: [end[0] + normal[0] * offset, end[1] + normal[1] * offset],
  };
}

/**
 * Calculate all wall inner surfaces for a room.
 */
export function calculateWallInnerSurfaces(walls: WallSegment[], room: Room): WallInnerSurface[] {
  if (walls.length === 0) {
    return [];
  }

  const centroid = calculateRoomCentroid(walls);
  const surfaces: WallInnerSurface[] = [];

  for (const wall of walls) {
    // Get wall thickness (use wall's own or room default)
    const thickness = wall.thicknessMm > 0 ? wall.thicknessMm : room.wallThicknessMm;
    const height = wall.heightMm > 0 ? wall.heightMm : room.heightMm;

    // Calculate inward normal
    const normal = determineInwardNormal(wall.start, wall.end, centroid);

    // Offset wall line to get inner surface
    const innerSurface = offsetWallLine(wall.start, wall.end, normal, thickness);

    // Calculate wall length and angle
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    surfaces.push({
      wallId: wall.id,
      roomId: wall.roomId,
      start: innerSurface.start,
      end: innerSurface.end,
      normal,
      heightMm: height,
      length,
      angle,
    });
  }

  return surfaces;
}

/**
 * Find intersection point of two lines defined by points and directions.
 * Returns null if lines are parallel or don't intersect in valid range.
 */
function lineLineIntersection(
  p1: [number, number],
  d1: [number, number],
  p2: [number, number],
  d2: [number, number]
): [number, number] | null {
  // Line 1: p1 + t * d1
  // Line 2: p2 + s * d2
  // Solve: p1 + t * d1 = p2 + s * d2

  const cross = d1[0] * d2[1] - d1[1] * d2[0];

  // Lines are parallel if cross product is near zero
  if (Math.abs(cross) < 0.0001) {
    return null;
  }

  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];

  const t = (dx * d2[1] - dz * d2[0]) / cross;

  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}

/**
 * Check if two walls are adjacent (share a vertex within tolerance).
 */
function areWallsAdjacent(
  wall1: WallSegment,
  wall2: WallSegment,
  tolerance: number = 1
): { sharedPoint: [number, number]; wall1End: "start" | "end"; wall2End: "start" | "end" } | null {
  // Check all combinations of endpoints
  const combinations: Array<{
    p1: [number, number];
    p2: [number, number];
    w1End: "start" | "end";
    w2End: "start" | "end";
  }> = [
    { p1: wall1.start, p2: wall2.start, w1End: "start", w2End: "start" },
    { p1: wall1.start, p2: wall2.end, w1End: "start", w2End: "end" },
    { p1: wall1.end, p2: wall2.start, w1End: "end", w2End: "start" },
    { p1: wall1.end, p2: wall2.end, w1End: "end", w2End: "end" },
  ];

  for (const { p1, p2, w1End, w2End } of combinations) {
    if (distance2D(p1, p2) <= tolerance) {
      return {
        sharedPoint: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
        wall1End: w1End,
        wall2End: w2End,
      };
    }
  }

  return null;
}

/**
 * Calculate interior corners from wall inner surfaces.
 * A corner is formed where two adjacent walls meet.
 */
export function calculateWallCorners(
  surfaces: WallInnerSurface[],
  walls: WallSegment[]
): WallCorner[] {
  if (surfaces.length < 2) {
    return [];
  }

  const corners: WallCorner[] = [];
  const processedPairs = new Set<string>();

  // Check each pair of walls for adjacency
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const wall1 = walls[i];
      const wall2 = walls[j];

      // Skip if same wall
      if (wall1.id === wall2.id) continue;

      // Create pair key to avoid duplicates
      const pairKey = [wall1.id, wall2.id].sort().join("-");
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      // Check if walls are adjacent
      const adjacency = areWallsAdjacent(wall1, wall2);
      if (!adjacency) continue;

      // Find corresponding surfaces
      const surface1 = surfaces.find((s) => s.wallId === wall1.id);
      const surface2 = surfaces.find((s) => s.wallId === wall2.id);

      if (!surface1 || !surface2) continue;

      // Calculate inner surface intersection
      // Direction vectors for inner surfaces
      const d1: [number, number] = [
        surface1.end[0] - surface1.start[0],
        surface1.end[1] - surface1.start[1],
      ];
      const d2: [number, number] = [
        surface2.end[0] - surface2.start[0],
        surface2.end[1] - surface2.start[1],
      ];

      // Find intersection of infinite lines
      const intersection = lineLineIntersection(surface1.start, d1, surface2.start, d2);

      if (!intersection) continue;

      // Calculate corner angle (interior angle)
      const n1Normalized = normalize2D(surface1.normal);
      const n2Normalized = normalize2D(surface2.normal);
      const dotNormals = dot2D(n1Normalized, n2Normalized);
      const cornerAngle = Math.acos(Math.max(-1, Math.min(1, dotNormals)));

      // Create corner
      corners.push({
        id: `corner-${wall1.id}-${wall2.id}`,
        roomId: wall1.roomId,
        point: intersection,
        wall1Id: wall1.id,
        wall2Id: wall2.id,
        wall1Normal: surface1.normal,
        wall2Normal: surface2.normal,
        angle: cornerAngle,
        heightMm: Math.min(surface1.heightMm, surface2.heightMm),
      });
    }
  }

  return corners;
}

/**
 * Build complete wall snap cache for a room.
 */
export function buildWallSnapCache(
  roomId: string | null,
  walls: WallSegment[],
  room: Room | null
): { surfaces: WallInnerSurface[]; corners: WallCorner[] } {
  if (!roomId || !room || walls.length === 0) {
    return { surfaces: [], corners: [] };
  }

  // Filter walls for this room
  const roomWalls = walls.filter((w) => w.roomId === roomId);

  if (roomWalls.length === 0) {
    return { surfaces: [], corners: [] };
  }

  // Calculate inner surfaces
  const surfaces = calculateWallInnerSurfaces(roomWalls, room);

  // Calculate corners
  const corners = calculateWallCorners(surfaces, roomWalls);

  return { surfaces, corners };
}
