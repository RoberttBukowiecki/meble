/**
 * Group Bounds Calculator
 *
 * Calculates bounding boxes for cabinets, parts, and selections.
 * Used by Snap V2 for group-to-group snapping based on external bounding boxes.
 */

import type { Part, Cabinet } from '@/types';
import {
  type Vec3,
  type OrientedBoundingBox,
  type OBBFace,
  createOBBFromPart,
  createOBBFromParts,
  getOBBFaces,
  getPartCorners,
} from './obb';

// ============================================================================
// Types
// ============================================================================

/**
 * Group type for bounding box calculations
 */
export type GroupType = 'cabinet' | 'part' | 'selection';

/**
 * Complete bounding box information for a group
 */
export interface GroupBoundingBoxes {
  groupId: string;
  groupType: GroupType;
  core: OrientedBoundingBox; // Main body bounding box
  extended: OrientedBoundingBox; // Including protruding parts (e.g., countertops)
  faces: {
    core: OBBFace[];
    extended: OBBFace[];
  };
  partIds: string[]; // Parts included in this group
}

// ============================================================================
// Core vs Extended Parts Detection
// ============================================================================

/**
 * Threshold in mm - parts exceeding cabinet dimensions by more than this are "extended"
 */
const PROTRUSION_THRESHOLD = 50;

/**
 * Determine if a part is "protruding" beyond the main cabinet body
 * Used to split core vs extended bounds
 *
 * @param part - The part to check
 * @param cabinet - The cabinet configuration (for expected dimensions)
 * @param allCabinetParts - All parts in the cabinet
 */
export function isProtrudingPart(
  part: Part,
  cabinet: Cabinet,
  allCabinetParts: Part[]
): boolean {
  // Get expected cabinet dimensions from params
  const expectedWidth = cabinet.params.width;
  const expectedDepth = cabinet.params.depth;

  // Calculate part's bounds in world space
  const corners = getPartCorners(part);

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const corner of corners) {
    minX = Math.min(minX, corner[0]);
    maxX = Math.max(maxX, corner[0]);
    minZ = Math.min(minZ, corner[2]);
    maxZ = Math.max(maxZ, corner[2]);
  }

  const partWidth = maxX - minX;
  const partDepth = maxZ - minZ;

  // Check if part exceeds expected dimensions by more than threshold
  const exceedsWidth = partWidth > expectedWidth + PROTRUSION_THRESHOLD;
  const exceedsDepth = partDepth > expectedDepth + PROTRUSION_THRESHOLD;

  return exceedsWidth || exceedsDepth;
}

/**
 * Separate cabinet parts into core and extended groups
 */
export function getCoreAndExtendedParts(
  cabinet: Cabinet,
  parts: Part[]
): { core: Part[]; extended: Part[] } {
  const cabinetParts = parts.filter(
    (p) => p.cabinetMetadata?.cabinetId === cabinet.id
  );

  const core: Part[] = [];
  const extended: Part[] = [];

  for (const part of cabinetParts) {
    if (isProtrudingPart(part, cabinet, cabinetParts)) {
      extended.push(part);
    } else {
      core.push(part);
    }
  }

  // If no extended parts, use all parts as core
  if (extended.length === 0 || core.length === 0) {
    return { core: cabinetParts, extended: cabinetParts };
  }

  return { core, extended: cabinetParts }; // Extended includes all parts
}

// ============================================================================
// Group Bounding Box Calculations
// ============================================================================

/**
 * Calculate the center position of a group of parts
 */
function calculatePartsCenter(parts: Part[]): Vec3 {
  if (parts.length === 0) return [0, 0, 0];

  let sumX = 0, sumY = 0, sumZ = 0;
  for (const part of parts) {
    sumX += part.position[0];
    sumY += part.position[1];
    sumZ += part.position[2];
  }

  return [
    sumX / parts.length,
    sumY / parts.length,
    sumZ / parts.length,
  ];
}

/**
 * Calculate core and extended bounding boxes for a cabinet
 */
export function calculateCabinetGroupBounds(
  cabinet: Cabinet,
  parts: Part[]
): GroupBoundingBoxes {
  const cabinetParts = parts.filter(
    (p) => p.cabinetMetadata?.cabinetId === cabinet.id
  );

  if (cabinetParts.length === 0) {
    // Return empty bounds if no parts
    const emptyOBB: OrientedBoundingBox = {
      center: [0, 0, 0],
      halfExtents: [0, 0, 0],
      rotation: [0, 0, 0],
      axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    };

    return {
      groupId: cabinet.id,
      groupType: 'cabinet',
      core: emptyOBB,
      extended: emptyOBB,
      faces: { core: [], extended: [] },
      partIds: [],
    };
  }

  const { core: coreParts, extended: extendedParts } = getCoreAndExtendedParts(
    cabinet,
    parts
  );

  // Use zero rotation (axis-aligned) for cabinet OBB
  // Cabinets generally stay axis-aligned in room layouts
  const groupRotation: Vec3 = [0, 0, 0];

  const coreOBB = createOBBFromParts(coreParts, groupRotation);
  const extendedOBB = createOBBFromParts(extendedParts, groupRotation);

  return {
    groupId: cabinet.id,
    groupType: 'cabinet',
    core: coreOBB,
    extended: extendedOBB,
    faces: {
      core: getOBBFaces(coreOBB),
      extended: getOBBFaces(extendedOBB),
    },
    partIds: cabinetParts.map((p) => p.id),
  };
}

/**
 * Calculate bounding box for a single part (not in a cabinet)
 */
export function calculatePartGroupBounds(part: Part): GroupBoundingBoxes {
  const obb = createOBBFromPart(part);
  const faces = getOBBFaces(obb);

  return {
    groupId: part.id,
    groupType: 'part',
    core: obb,
    extended: obb, // Single parts have same core and extended
    faces: {
      core: faces,
      extended: faces,
    },
    partIds: [part.id],
  };
}

/**
 * Calculate bounding box for multi-selection
 */
export function calculateSelectionGroupBounds(
  parts: Part[],
  selectionRotation: Vec3 = [0, 0, 0]
): GroupBoundingBoxes {
  if (parts.length === 0) {
    const emptyOBB: OrientedBoundingBox = {
      center: [0, 0, 0],
      halfExtents: [0, 0, 0],
      rotation: selectionRotation,
      axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    };

    return {
      groupId: 'selection',
      groupType: 'selection',
      core: emptyOBB,
      extended: emptyOBB,
      faces: { core: [], extended: [] },
      partIds: [],
    };
  }

  const obb = createOBBFromParts(parts, selectionRotation);
  const faces = getOBBFaces(obb);

  return {
    groupId: 'selection',
    groupType: 'selection',
    core: obb,
    extended: obb,
    faces: {
      core: faces,
      extended: faces,
    },
    partIds: parts.map((p) => p.id),
  };
}

/**
 * Calculate bounding box for a moving cabinet with position offset
 * Used during transform operations
 */
export function calculateCabinetGroupBoundsWithOffset(
  cabinet: Cabinet,
  parts: Part[],
  positionOffset: Vec3
): GroupBoundingBoxes {
  const cabinetParts = parts.filter(
    (p) => p.cabinetMetadata?.cabinetId === cabinet.id
  );

  if (cabinetParts.length === 0) {
    const emptyOBB: OrientedBoundingBox = {
      center: positionOffset,
      halfExtents: [0, 0, 0],
      rotation: [0, 0, 0],
      axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    };

    return {
      groupId: cabinet.id,
      groupType: 'cabinet',
      core: emptyOBB,
      extended: emptyOBB,
      faces: { core: [], extended: [] },
      partIds: [],
    };
  }

  // Create offset parts for calculation
  const offsetParts: Part[] = cabinetParts.map((p) => ({
    ...p,
    position: [
      p.position[0] + positionOffset[0],
      p.position[1] + positionOffset[1],
      p.position[2] + positionOffset[2],
    ] as [number, number, number],
  }));

  const { core: coreParts, extended: extendedParts } = getCoreAndExtendedParts(
    cabinet,
    offsetParts
  );

  // Use zero rotation (axis-aligned) for cabinet OBB
  const groupRotation: Vec3 = [0, 0, 0];

  const coreOBB = createOBBFromParts(coreParts, groupRotation);
  const extendedOBB = createOBBFromParts(extendedParts, groupRotation);

  return {
    groupId: cabinet.id,
    groupType: 'cabinet',
    core: coreOBB,
    extended: extendedOBB,
    faces: {
      core: getOBBFaces(coreOBB),
      extended: getOBBFaces(extendedOBB),
    },
    partIds: cabinetParts.map((p) => p.id),
  };
}

/**
 * Calculate bounding box for a moving part with position offset
 * Used during transform operations
 */
export function calculatePartGroupBoundsWithOffset(
  part: Part,
  positionOffset: Vec3
): GroupBoundingBoxes {
  const offsetPart: Part = {
    ...part,
    position: [
      part.position[0] + positionOffset[0],
      part.position[1] + positionOffset[1],
      part.position[2] + positionOffset[2],
    ] as [number, number, number],
  };

  return calculatePartGroupBounds(offsetPart);
}

// ============================================================================
// Get All Group Bounds in Scene
// ============================================================================

/**
 * Get all group bounding boxes in scene
 * Groups parts by cabinetId, creates individual bounds for loose parts
 */
export function getAllGroupBounds(
  parts: Part[],
  cabinets: Cabinet[]
): Map<string, GroupBoundingBoxes> {
  const result = new Map<string, GroupBoundingBoxes>();

  // Process cabinets first
  for (const cabinet of cabinets) {
    const bounds = calculateCabinetGroupBounds(cabinet, parts);
    if (bounds.partIds.length > 0) {
      result.set(cabinet.id, bounds);
    }
  }

  // Find loose parts (not in any cabinet)
  const partsInCabinets = new Set(
    cabinets.flatMap((c) =>
      parts
        .filter((p) => p.cabinetMetadata?.cabinetId === c.id)
        .map((p) => p.id)
    )
  );

  for (const part of parts) {
    if (!partsInCabinets.has(part.id)) {
      const bounds = calculatePartGroupBounds(part);
      result.set(part.id, bounds);
    }
  }

  return result;
}

/**
 * Get group bounds for targets (excluding specific groups)
 * Useful for snap calculations where we need to exclude the moving group
 */
export function getTargetGroupBounds(
  parts: Part[],
  cabinets: Cabinet[],
  excludeGroupIds: Set<string>
): GroupBoundingBoxes[] {
  const allBounds = getAllGroupBounds(parts, cabinets);
  const result: GroupBoundingBoxes[] = [];

  allBounds.forEach((bounds, groupId) => {
    if (!excludeGroupIds.has(groupId)) {
      result.push(bounds);
    }
  });

  return result;
}
