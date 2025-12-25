/**
 * Bounding Box Utilities
 *
 * Provides efficient AABB (Axis-Aligned Bounding Box) calculations
 * for parts, cabinets, and multiselect groups.
 * Used for dimension display during transform operations.
 */

import type { Part, Cabinet, DimensionBoundingBox, CountertopGroup } from '@/types';

// ============================================================================
// Vector Math (inline for performance)
// ============================================================================

type Vec3 = [number, number, number];

/**
 * Apply Euler rotation (XYZ order) to a point
 *
 * Three.js Euler 'XYZ' means rotation matrix is Rx * Ry * Rz
 * For a point transform: v' = Rx * Ry * Rz * v
 * Reading right to left: apply Z first, then Y, then X
 */
function rotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;

  // Pre-compute sin/cos
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  let [x, y, z] = point;

  // Apply rotations in reverse order to match Three.js Euler 'XYZ'
  // Three.js: Rx * Ry * Rz means apply Z first, then Y, then X

  // Rotate Z first
  const x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  x = x1;
  y = y1;

  // Rotate Y second
  const x2 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  x = x2;
  z = z1;

  // Rotate X last
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;

  return [x, y2, z2];
}

// ============================================================================
// Part Bounding Box
// ============================================================================

/**
 * Get 8 corners of a part's bounding box in world space
 */
function getPartCorners(part: Part): Vec3[] {
  const halfW = part.width / 2;
  const halfH = part.height / 2;
  const halfD = part.depth / 2;

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

  return localCorners.map((corner) => {
    const rotated = rotatePoint(corner, part.rotation);
    return [
      rotated[0] + part.position[0],
      rotated[1] + part.position[1],
      rotated[2] + part.position[2],
    ] as Vec3;
  });
}

/**
 * Calculate AABB for a single part
 */
export function getPartBoundingBox(part: Part): DimensionBoundingBox {
  const corners = getPartCorners(part);

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const corner of corners) {
    min[0] = Math.min(min[0], corner[0]);
    min[1] = Math.min(min[1], corner[1]);
    min[2] = Math.min(min[2], corner[2]);
    max[0] = Math.max(max[0], corner[0]);
    max[1] = Math.max(max[1], corner[1]);
    max[2] = Math.max(max[2], corner[2]);
  }

  return {
    min,
    max,
    center: [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ],
    groupId: part.cabinetMetadata?.cabinetId || part.group || part.id,
    groupType: part.cabinetMetadata?.cabinetId ? 'cabinet' : part.group ? 'group' : 'part',
  };
}

/**
 * Calculate AABB for a part with a custom position (during transform)
 */
export function getPartBoundingBoxAtPosition(
  part: Part,
  position: Vec3
): DimensionBoundingBox {
  const tempPart = { ...part, position };
  return getPartBoundingBox(tempPart);
}

// ============================================================================
// Cabinet Bounding Box
// ============================================================================

/**
 * Calculate combined AABB for all parts in a cabinet
 */
export function getCabinetBoundingBox(
  cabinetId: string,
  parts: Part[]
): DimensionBoundingBox | null {
  const cabinetParts = parts.filter(
    (p) => p.cabinetMetadata?.cabinetId === cabinetId
  );

  if (cabinetParts.length === 0) return null;

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const part of cabinetParts) {
    const corners = getPartCorners(part);
    for (const corner of corners) {
      min[0] = Math.min(min[0], corner[0]);
      min[1] = Math.min(min[1], corner[1]);
      min[2] = Math.min(min[2], corner[2]);
      max[0] = Math.max(max[0], corner[0]);
      max[1] = Math.max(max[1], corner[1]);
      max[2] = Math.max(max[2], corner[2]);
    }
  }

  return {
    min,
    max,
    center: [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ],
    groupId: cabinetId,
    groupType: 'cabinet',
  };
}

/**
 * Calculate cabinet bounding box with offset (during transform)
 */
export function getCabinetBoundingBoxWithOffset(
  cabinetId: string,
  parts: Part[],
  offset: Vec3
): DimensionBoundingBox | null {
  const baseBounds = getCabinetBoundingBox(cabinetId, parts);
  if (!baseBounds) return null;

  return {
    min: [
      baseBounds.min[0] + offset[0],
      baseBounds.min[1] + offset[1],
      baseBounds.min[2] + offset[2],
    ],
    max: [
      baseBounds.max[0] + offset[0],
      baseBounds.max[1] + offset[1],
      baseBounds.max[2] + offset[2],
    ],
    center: [
      baseBounds.center[0] + offset[0],
      baseBounds.center[1] + offset[1],
      baseBounds.center[2] + offset[2],
    ],
    groupId: cabinetId,
    groupType: 'cabinet',
  };
}

// ============================================================================
// Multiselect Bounding Box
// ============================================================================

/**
 * Calculate combined AABB for multiselect parts
 */
export function getMultiselectBoundingBox(
  partIds: Set<string>,
  parts: Part[]
): DimensionBoundingBox | null {
  const selectedParts = parts.filter((p) => partIds.has(p.id));

  if (selectedParts.length === 0) return null;

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const part of selectedParts) {
    const corners = getPartCorners(part);
    for (const corner of corners) {
      min[0] = Math.min(min[0], corner[0]);
      min[1] = Math.min(min[1], corner[1]);
      min[2] = Math.min(min[2], corner[2]);
      max[0] = Math.max(max[0], corner[0]);
      max[1] = Math.max(max[1], corner[1]);
      max[2] = Math.max(max[2], corner[2]);
    }
  }

  return {
    min,
    max,
    center: [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ],
    groupId: 'multiselect',
    groupType: 'group',
  };
}

/**
 * Calculate multiselect bounding box with offset (during transform)
 */
export function getMultiselectBoundingBoxWithOffset(
  partIds: Set<string>,
  parts: Part[],
  offset: Vec3
): DimensionBoundingBox | null {
  const baseBounds = getMultiselectBoundingBox(partIds, parts);
  if (!baseBounds) return null;

  return {
    min: [
      baseBounds.min[0] + offset[0],
      baseBounds.min[1] + offset[1],
      baseBounds.min[2] + offset[2],
    ],
    max: [
      baseBounds.max[0] + offset[0],
      baseBounds.max[1] + offset[1],
      baseBounds.max[2] + offset[2],
    ],
    center: [
      baseBounds.center[0] + offset[0],
      baseBounds.center[1] + offset[1],
      baseBounds.center[2] + offset[2],
    ],
    groupId: 'multiselect',
    groupType: 'group',
  };
}

// ============================================================================
// Get All Other Bounding Boxes
// ============================================================================

/**
 * Get bounding boxes for all objects except the excluded ones
 * Groups parts by cabinet/group for efficient dimension calculation
 */
export function getOtherBoundingBoxes(
  excludePartIds: Set<string>,
  excludeCabinetIds: Set<string>,
  parts: Part[],
  cabinets: Cabinet[]
): DimensionBoundingBox[] {
  const result: DimensionBoundingBox[] = [];
  const processedCabinetIds = new Set<string>();
  const processedGroupIds = new Set<string>();

  for (const part of parts) {
    // Skip excluded parts
    if (excludePartIds.has(part.id)) continue;

    // Handle cabinet parts
    if (part.cabinetMetadata?.cabinetId) {
      const cabinetId = part.cabinetMetadata.cabinetId;

      // Skip excluded cabinets
      if (excludeCabinetIds.has(cabinetId)) continue;

      // Only process each cabinet once
      if (processedCabinetIds.has(cabinetId)) continue;
      processedCabinetIds.add(cabinetId);

      const bounds = getCabinetBoundingBox(cabinetId, parts);
      if (bounds) {
        result.push(bounds);
      }
      continue;
    }

    // Handle manual groups
    if (part.group) {
      // Only process each group once
      if (processedGroupIds.has(part.group)) continue;
      processedGroupIds.add(part.group);

      // Get all parts in this group (excluding excluded parts)
      const groupParts = parts.filter(
        (p) => p.group === part.group && !excludePartIds.has(p.id)
      );

      if (groupParts.length === 0) continue;

      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];

      for (const gp of groupParts) {
        const corners = getPartCorners(gp);
        for (const corner of corners) {
          min[0] = Math.min(min[0], corner[0]);
          min[1] = Math.min(min[1], corner[1]);
          min[2] = Math.min(min[2], corner[2]);
          max[0] = Math.max(max[0], corner[0]);
          max[1] = Math.max(max[1], corner[1]);
          max[2] = Math.max(max[2], corner[2]);
        }
      }

      result.push({
        min,
        max,
        center: [
          (min[0] + max[0]) / 2,
          (min[1] + max[1]) / 2,
          (min[2] + max[2]) / 2,
        ],
        groupId: part.group,
        groupType: 'group',
      });
      continue;
    }

    // Standalone part
    result.push(getPartBoundingBox(part));
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick distance check for early exit optimization
 * Returns true if boxes could be within maxDistance on any axis
 */
export function quickDistanceCheck(
  a: DimensionBoundingBox,
  b: DimensionBoundingBox,
  maxDistance: number
): boolean {
  // Check if boxes are within range on each axis
  const dx = Math.max(0, Math.max(a.min[0] - b.max[0], b.min[0] - a.max[0]));
  const dy = Math.max(0, Math.max(a.min[1] - b.max[1], b.min[1] - a.max[1]));
  const dz = Math.max(0, Math.max(a.min[2] - b.max[2], b.min[2] - a.max[2]));

  return dx <= maxDistance || dy <= maxDistance || dz <= maxDistance;
}

/**
 * Check if two boxes overlap on a specific axis plane
 * Used to filter which boxes are relevant for dimension on a given axis
 */
export function boxesOverlapOnOtherAxes(
  a: DimensionBoundingBox,
  b: DimensionBoundingBox,
  axis: 'X' | 'Y' | 'Z'
): boolean {
  // For dimension on axis X, check overlap on Y and Z
  // For dimension on axis Y, check overlap on X and Z
  // For dimension on axis Z, check overlap on X and Y

  switch (axis) {
    case 'X':
      // Check Y and Z overlap
      return (
        a.max[1] > b.min[1] && a.min[1] < b.max[1] && // Y overlap
        a.max[2] > b.min[2] && a.min[2] < b.max[2]    // Z overlap
      );
    case 'Y':
      // Check X and Z overlap
      return (
        a.max[0] > b.min[0] && a.min[0] < b.max[0] && // X overlap
        a.max[2] > b.min[2] && a.min[2] < b.max[2]    // Z overlap
      );
    case 'Z':
      // Check X and Y overlap
      return (
        a.max[0] > b.min[0] && a.min[0] < b.max[0] && // X overlap
        a.max[1] > b.min[1] && a.min[1] < b.max[1]    // Y overlap
      );
  }
}

/**
 * Calculate distance between two boxes on a specific axis
 * Returns positive value if there's a gap, negative if overlapping
 */
export function getAxisDistance(
  a: DimensionBoundingBox,
  b: DimensionBoundingBox,
  axis: 'X' | 'Y' | 'Z'
): { distance: number; direction: 1 | -1 } {
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;

  // Check if b is in positive direction from a
  if (b.min[axisIndex] >= a.max[axisIndex]) {
    return {
      distance: b.min[axisIndex] - a.max[axisIndex],
      direction: 1,
    };
  }

  // Check if b is in negative direction from a
  if (b.max[axisIndex] <= a.min[axisIndex]) {
    return {
      distance: a.min[axisIndex] - b.max[axisIndex],
      direction: -1,
    };
  }

  // Overlapping
  return {
    distance: -Math.min(a.max[axisIndex] - b.min[axisIndex], b.max[axisIndex] - a.min[axisIndex]),
    direction: a.center[axisIndex] < b.center[axisIndex] ? 1 : -1,
  };
}

// ============================================================================
// Countertop Bounding Box
// ============================================================================

/**
 * Calculate AABB for a countertop group
 * Countertop position is derived from cabinet positions + overhangs
 * Returns null if the group has no segments or no valid cabinets
 */
export function calculateCountertopBoundingBox(
  group: CountertopGroup,
  cabinets: Cabinet[],
  parts: Part[]
): { min: Vec3; max: Vec3 } | null {
  if (!group.segments || group.segments.length === 0) return null;

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const segment of group.segments) {
    // Get cabinets for this segment
    const segmentCabinets = cabinets.filter(c => segment.cabinetIds.includes(c.id));
    if (segmentCabinets.length === 0) continue;

    // Calculate cabinet bounds using parts
    let cabMinX = Infinity, cabMinY = Infinity, cabMinZ = Infinity;
    let cabMaxX = -Infinity, cabMaxY = -Infinity, cabMaxZ = -Infinity;

    for (const cabinet of segmentCabinets) {
      const cabinetParts = parts.filter(p => cabinet.partIds.includes(p.id));
      for (const part of cabinetParts) {
        const corners = getPartCorners(part);
        for (const corner of corners) {
          cabMinX = Math.min(cabMinX, corner[0]);
          cabMaxX = Math.max(cabMaxX, corner[0]);
          cabMinY = Math.min(cabMinY, corner[1]);
          cabMaxY = Math.max(cabMaxY, corner[1]);
          cabMinZ = Math.min(cabMinZ, corner[2]);
          cabMaxZ = Math.max(cabMaxZ, corner[2]);
        }
      }
    }

    if (cabMinX === Infinity) continue;

    // Countertop sits on top of cabinets with overhangs
    const thickness = segment.thickness;
    const overhang = segment.overhang;

    // Calculate countertop bounds including overhangs
    const ctMinX = cabMinX - overhang.left;
    const ctMaxX = cabMaxX + overhang.right;
    const ctMinY = cabMaxY; // Bottom of countertop is top of cabinet
    const ctMaxY = cabMaxY + thickness;
    const ctMinZ = cabMinZ - overhang.back;
    const ctMaxZ = cabMaxZ + overhang.front;

    min[0] = Math.min(min[0], ctMinX);
    min[1] = Math.min(min[1], ctMinY);
    min[2] = Math.min(min[2], ctMinZ);
    max[0] = Math.max(max[0], ctMaxX);
    max[1] = Math.max(max[1], ctMaxY);
    max[2] = Math.max(max[2], ctMaxZ);
  }

  if (min[0] === Infinity) return null;

  return { min, max };
}

