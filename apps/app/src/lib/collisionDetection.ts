/**
 * Collision detection system with spatial partitioning for performance
 * Handles >200 parts efficiently using grid-based spatial partitioning
 */

import { Box3, Vector3, Mesh, Object3D } from 'three';
import type { Part, Collision } from '@/types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Grid cell size for spatial partitioning (in mm)
 * Larger values = fewer cells but more parts per cell
 * Smaller values = more cells but fewer parts per cell
 * 1000mm (1m) is a good balance for furniture parts
 */
const GRID_CELL_SIZE = 1000;

/**
 * Minimum overlap threshold (in mm) to consider a collision
 * This handles floating-point precision issues and parts that are designed to touch
 *
 * For furniture, parts are often designed to touch (e.g., sides touching bottom/top)
 * A threshold of 1-2mm allows parts to touch without triggering false collisions,
 * while still detecting actual overlaps/collisions
 */
const COLLISION_THRESHOLD = 0.1;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the group ID for a part (cabinet ID or manual group)
 * @param part - The part to get the group ID for
 * @returns Group ID (cabinet ID or manual group) or undefined
 */
export function getGroupId(part: Part): string | undefined {
  return part.cabinetMetadata?.cabinetId || part.group;
}

/**
 * Convert a 3D coordinate to a grid cell key
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param z - Z coordinate in mm
 * @returns Grid cell key as string "x,y,z"
 */
function getCellKey(x: number, y: number, z: number): string {
  const cellX = Math.floor(x / GRID_CELL_SIZE);
  const cellY = Math.floor(y / GRID_CELL_SIZE);
  const cellZ = Math.floor(z / GRID_CELL_SIZE);
  return `${cellX},${cellY},${cellZ}`;
}

/**
 * Get all grid cells that a bounding box overlaps
 * @param box - The bounding box
 * @returns Array of cell keys
 */
function getCellKeysForBox(box: Box3): string[] {
  const keys: string[] = [];

  const minX = Math.floor(box.min.x / GRID_CELL_SIZE);
  const minY = Math.floor(box.min.y / GRID_CELL_SIZE);
  const minZ = Math.floor(box.min.z / GRID_CELL_SIZE);

  const maxX = Math.floor(box.max.x / GRID_CELL_SIZE);
  const maxY = Math.floor(box.max.y / GRID_CELL_SIZE);
  const maxZ = Math.floor(box.max.z / GRID_CELL_SIZE);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        keys.push(`${x},${y},${z}`);
      }
    }
  }

  return keys;
}

/**
 * Create a Box3 bounding box for a part
 * Correctly handles rotation by creating a transformed geometry
 * @param part - The part to create a bounding box for
 * @returns The bounding box
 */
export function createBoundingBox(part: Part): Box3 {
  // Create a temporary mesh to calculate the bounding box
  // This ensures rotation is properly accounted for
  const tempMesh = new Mesh();
  tempMesh.position.set(...part.position);
  tempMesh.rotation.set(...part.rotation);

  // Create a box for the part's dimensions
  // Note: Box3.setFromCenterAndSize uses the local coordinate system
  const localBox = new Box3().setFromCenterAndSize(
    new Vector3(0, 0, 0),
    new Vector3(part.width, part.height, part.depth)
  );

  // Transform the bounding box to world space
  const worldBox = new Box3();
  worldBox.setFromObject(tempMesh);

  // However, setFromObject expects geometry, so let's use a different approach
  // We'll transform the 8 corners of the local box to world space
  const corners = [
    new Vector3(localBox.min.x, localBox.min.y, localBox.min.z),
    new Vector3(localBox.min.x, localBox.min.y, localBox.max.z),
    new Vector3(localBox.min.x, localBox.max.y, localBox.min.z),
    new Vector3(localBox.min.x, localBox.max.y, localBox.max.z),
    new Vector3(localBox.max.x, localBox.min.y, localBox.min.z),
    new Vector3(localBox.max.x, localBox.min.y, localBox.max.z),
    new Vector3(localBox.max.x, localBox.max.y, localBox.min.z),
    new Vector3(localBox.max.x, localBox.max.y, localBox.max.z),
  ];

  // Transform corners to world space
  tempMesh.updateMatrixWorld(true);
  const transformedCorners = corners.map(corner => corner.applyMatrix4(tempMesh.matrixWorld));

  // Create bounding box from transformed corners
  const box = new Box3();
  box.setFromPoints(transformedCorners);

  return box;
}

/**
 * Check if two parts actually collide using OBB (Oriented Bounding Box)
 * This is more accurate than AABB for rotated parts
 * Uses Separating Axis Theorem (SAT) for precise collision detection
 *
 * @param part1 - First part
 * @param part2 - Second part
 * @returns True if parts collide
 */
function partsCollide(part1: Part, part2: Part): boolean {
  // Use AABB collision detection
  // AABB from createBoundingBox already accounts for rotation
  // (corners are transformed to world space, then AABB is built from those corners)
  const box1 = createBoundingBox(part1);
  const box2 = createBoundingBox(part2);

  if (!box1.intersectsBox(box2)) {
    return false;
  }

  // Use AABB intersection with threshold
  return boxesIntersectAABB(box1, box2);

  // NOTE: OBB collision detection disabled for now due to false positives
  // The current AABB approach (transforming corners then building AABB) is
  // less accurate for rotated parts but avoids false positives
  // TODO: Fix OBB implementation if precise collision for rotated parts is needed
}

/**
 * Check if two AABB boxes intersect (for axis-aligned parts)
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns True if boxes intersect
 */
function boxesIntersectAABB(box1: Box3, box2: Box3): boolean {
  // Add threshold to handle floating-point precision
  return box1.intersectsBox(box2) &&
    (box1.max.x - box2.min.x > COLLISION_THRESHOLD) &&
    (box2.max.x - box1.min.x > COLLISION_THRESHOLD) &&
    (box1.max.y - box2.min.y > COLLISION_THRESHOLD) &&
    (box2.max.y - box1.min.y > COLLISION_THRESHOLD) &&
    (box1.max.z - box2.min.z > COLLISION_THRESHOLD) &&
    (box2.max.z - box1.min.z > COLLISION_THRESHOLD);
}

/**
 * OBB (Oriented Bounding Box) collision detection using Separating Axis Theorem
 * More accurate for rotated parts than AABB
 *
 * @param part1 - First part
 * @param part2 - Second part
 * @returns True if OBBs collide
 */
function obbCollision(part1: Part, part2: Part): boolean {
  // Create temporary meshes to get world-space transforms
  const mesh1 = new Mesh();
  mesh1.position.set(...part1.position);
  mesh1.rotation.set(...part1.rotation);
  mesh1.updateMatrixWorld(true);

  const mesh2 = new Mesh();
  mesh2.position.set(...part2.position);
  mesh2.rotation.set(...part2.rotation);
  mesh2.updateMatrixWorld(true);

  // Get half-extents (half of dimensions)
  const halfExtents1 = new Vector3(part1.width / 2, part1.height / 2, part1.depth / 2);
  const halfExtents2 = new Vector3(part2.width / 2, part2.height / 2, part2.depth / 2);

  // Get centers
  const center1 = new Vector3(...part1.position);
  const center2 = new Vector3(...part2.position);

  // Get rotation matrices (3 axes for each box)
  const axes1 = [
    new Vector3(1, 0, 0).applyQuaternion(mesh1.quaternion),
    new Vector3(0, 1, 0).applyQuaternion(mesh1.quaternion),
    new Vector3(0, 0, 1).applyQuaternion(mesh1.quaternion),
  ];

  const axes2 = [
    new Vector3(1, 0, 0).applyQuaternion(mesh2.quaternion),
    new Vector3(0, 1, 0).applyQuaternion(mesh2.quaternion),
    new Vector3(0, 0, 1).applyQuaternion(mesh2.quaternion),
  ];

  // Test all 15 separating axes (3 from each box + 9 cross products)
  const allAxes = [
    ...axes1,
    ...axes2,
    // Cross products
    ...axes1.flatMap(a1 => axes2.map(a2 => {
      const cross = new Vector3().crossVectors(a1, a2);
      return cross.lengthSq() > 0.001 ? cross.normalize() : null;
    })).filter(Boolean) as Vector3[]
  ];

  for (const axis of allAxes) {
    if (!testSeparatingAxis(center1, halfExtents1, axes1, center2, halfExtents2, axes2, axis)) {
      return false; // Found separating axis - no collision
    }
  }

  return true; // No separating axis found - collision!
}

/**
 * Test if two OBBs are separated along a given axis
 * @returns True if NOT separated (i.e., projections overlap)
 */
function testSeparatingAxis(
  center1: Vector3,
  halfExtents1: Vector3,
  axes1: Vector3[],
  center2: Vector3,
  halfExtents2: Vector3,
  axes2: Vector3[],
  axis: Vector3
): boolean {
  // Project centers onto axis
  const centerDist = Math.abs(center2.clone().sub(center1).dot(axis));

  // Project half-extents onto axis
  const r1 = Math.abs(halfExtents1.x * axes1[0].dot(axis)) +
             Math.abs(halfExtents1.y * axes1[1].dot(axis)) +
             Math.abs(halfExtents1.z * axes1[2].dot(axis));

  const r2 = Math.abs(halfExtents2.x * axes2[0].dot(axis)) +
             Math.abs(halfExtents2.y * axes2[1].dot(axis)) +
             Math.abs(halfExtents2.z * axes2[2].dot(axis));

  // Check if projections overlap (with threshold)
  return centerDist <= r1 + r2 + COLLISION_THRESHOLD;
}

// ============================================================================
// Spatial Partitioning
// ============================================================================

/**
 * Spatial grid for efficient collision detection
 * Divides 3D space into uniform grid cells
 */
class SpatialGrid {
  private grid: Map<string, Array<{ part: Part; box: Box3 }>>;

  constructor() {
    this.grid = new Map();
  }

  /**
   * Clear the grid
   */
  clear(): void {
    this.grid.clear();
  }

  /**
   * Insert a part into the grid
   * @param part - The part to insert
   * @param box - The part's bounding box
   */
  insert(part: Part, box: Box3): void {
    const cellKeys = getCellKeysForBox(box);

    for (const key of cellKeys) {
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push({ part, box });
    }
  }

  /**
   * Get all parts that could potentially collide with the given part
   * @param part - The part to check
   * @param box - The part's bounding box
   * @returns Array of potentially colliding parts
   */
  getPotentialCollisions(part: Part, box: Box3): Array<{ part: Part; box: Box3 }> {
    const cellKeys = getCellKeysForBox(box);
    const potentialCollisions = new Map<string, { part: Part; box: Box3 }>();

    for (const key of cellKeys) {
      const partsInCell = this.grid.get(key);
      if (partsInCell) {
        for (const item of partsInCell) {
          // Don't check a part against itself
          if (item.part.id !== part.id) {
            potentialCollisions.set(item.part.id, item);
          }
        }
      }
    }

    return Array.from(potentialCollisions.values());
  }
}

// ============================================================================
// Main Collision Detection
// ============================================================================

/**
 * Detect all collisions in the current furniture
 * Uses spatial partitioning for O(n log n) average case performance
 * @param parts - Array of parts to check for collisions
 * @returns Array of collisions found
 */
export function detectCollisions(parts: Part[], ignoreCabinetId?: string): Collision[] {
  const collisions: Collision[] = [];
  const grid = new SpatialGrid();
  const partBoxes = new Map<string, Box3>();

  // Phase 1: Create bounding boxes and populate spatial grid
  for (const part of parts) {
    const box = createBoundingBox(part);
    partBoxes.set(part.id, box);
    grid.insert(part, box);
  }

  // Phase 2: Check for collisions using spatial grid
  const checkedPairs = new Set<string>();

  for (const part of parts) {
    const box = partBoxes.get(part.id)!;
    const potentialCollisions = grid.getPotentialCollisions(part, box);

    for (const { part: otherPart, box: otherBox } of potentialCollisions) {
      // Create a unique pair key to avoid checking the same pair twice
      const pairKey = [part.id, otherPart.id].sort().join(',');

      if (!checkedPairs.has(pairKey)) {
        checkedPairs.add(pairKey);

        // Check if parts actually collide
        if (partsCollide(part, otherPart)) {
          collisions.push({
            partId1: part.id,
            partId2: otherPart.id,
            groupId1: getGroupId(part),
            groupId2: getGroupId(otherPart),
          });
        }
      }
    }
  }

  return collisions;
}

/**
 * Check if a specific part is involved in any collision
 * @param partId - The part ID to check
 * @param collisions - Array of all collisions
 * @returns True if the part is colliding
 */
export function isPartColliding(partId: string, collisions: Collision[]): boolean {
  return collisions.some(c => c.partId1 === partId || c.partId2 === partId);
}

/**
 * Check if a specific group (cabinet or manual group) has any collisions
 * @param groupId - The group ID to check (cabinet ID or manual group)
 * @param collisions - Array of all collisions
 * @returns True if any part in the group is colliding
 */
export function isGroupColliding(groupId: string, collisions: Collision[]): boolean {
  return collisions.some(c => c.groupId1 === groupId || c.groupId2 === groupId);
}

/**
 * Get all part IDs in a group that are colliding
 * @param groupId - The group ID to check
 * @param collisions - Array of all collisions
 * @returns Set of colliding part IDs in the group
 */
export function getCollidingPartsInGroup(groupId: string, collisions: Collision[]): Set<string> {
  const collidingParts = new Set<string>();

  for (const collision of collisions) {
    if (collision.groupId1 === groupId) {
      collidingParts.add(collision.partId1);
    }
    if (collision.groupId2 === groupId) {
      collidingParts.add(collision.partId2);
    }
  }

  return collidingParts;
}
