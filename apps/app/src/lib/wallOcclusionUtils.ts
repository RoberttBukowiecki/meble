import * as THREE from "three";
import type { WallSegment } from "@/types";

/**
 * Calculate the outward normal of a wall segment (perpendicular to wall direction).
 * The normal points to the "left" side when looking from start to end.
 * For room walls defined counter-clockwise, this typically points inward.
 */
export function getWallNormal(wall: WallSegment): THREE.Vector3 {
  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[1] - wall.start[1];

  // Perpendicular vector (rotate 90 degrees counterclockwise in XZ plane)
  // This gives the "left" side of the wall when looking from start to end
  const normal = new THREE.Vector3(-dz, 0, dx).normalize();
  return normal;
}

/**
 * Get the center point of a wall segment in 3D world space.
 */
export function getWallCenter(
  wall: WallSegment,
  roomOrigin: [number, number],
  wallHeight: number
): THREE.Vector3 {
  return new THREE.Vector3(
    roomOrigin[0] + (wall.start[0] + wall.end[0]) / 2,
    wallHeight / 2, // Center height
    roomOrigin[1] + (wall.start[1] + wall.end[1]) / 2
  );
}

/**
 * Check if a wall is occluding (back-facing relative to camera).
 * Returns true if the wall normal points away from the camera,
 * meaning the wall is potentially blocking the view of objects behind it.
 *
 * @param wall - The wall segment to check
 * @param roomOrigin - The origin position of the room [x, z]
 * @param wallHeight - The height of the wall in mm
 * @param cameraPosition - The current camera position in world space
 * @param threshold - Dot product threshold (default 0.1). Lower values mean stricter detection.
 * @returns true if wall is occluding (should be transparent)
 */
export function isWallOccluding(
  wall: WallSegment,
  roomOrigin: [number, number],
  wallHeight: number,
  cameraPosition: THREE.Vector3,
  threshold: number = 0.1
): boolean {
  const wallCenter = getWallCenter(wall, roomOrigin, wallHeight);
  const wallNormal = getWallNormal(wall);

  // Vector from wall center to camera
  const toCamera = cameraPosition.clone().sub(wallCenter).normalize();

  // If dot product is negative or near zero, wall normal points away from camera
  // (wall is "back-facing" and potentially occluding)
  const dot = wallNormal.dot(toCamera);

  return dot < threshold;
}

/**
 * Compare two Sets of wall IDs to check if they're equal.
 * Used to avoid unnecessary store updates.
 */
export function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  let equal = true;
  a.forEach((id) => {
    if (!b.has(id)) equal = false;
  });
  return equal;
}
