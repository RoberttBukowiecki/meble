/**
 * Object Dimensions Calculator
 *
 * Calculates W/H/D dimension lines for objects in the scene.
 * Optimized for performance with:
 * - Minimal allocations (reuses arrays where possible)
 * - Early exits for empty selections
 * - Efficient bounding box calculations
 */

import type {
  Part,
  Cabinet,
  CountertopGroup,
  ObjectDimension,
  ObjectDimensionSet,
  ObjectDimensionMode,
  ObjectDimensionGranularity,
} from "@/types";
import {
  getPartBoundingBox,
  getCabinetBoundingBox,
  getMultiselectBoundingBox,
  calculateCountertopBoundingBox,
} from "./bounding-box-utils";

// ============================================================================
// Types
// ============================================================================

type Vec3 = [number, number, number];

interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

interface ObjectInfo {
  objectId: string;
  objectType: "part" | "cabinet" | "countertop" | "multiselect";
  /** Local dimensions (W, H, D) - not rotated */
  localSize: Vec3;
  /** World position of object center */
  worldCenter: Vec3;
  /** Object rotation in radians */
  rotation: Vec3;
  /** AABB for compatibility (used for boundingBox field) */
  boundingBox: BoundingBox;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  /** Offset from object edge for dimension lines (mm) */
  EDGE_OFFSET: 30,
  /** Additional offset to prevent overlap between dimension lines */
  STACKING_OFFSET: 25,
  /** Minimum dimension size to display (mm) */
  MIN_DIMENSION_SIZE: 10,
} as const;

// ============================================================================
// Helper functions for ObjectInfo creation
// ============================================================================

/**
 * Create ObjectInfo for a Part
 * Uses part's local dimensions and rotation directly
 */
function getPartObjectInfo(part: Part): ObjectInfo {
  const bbox = getPartBoundingBox(part);
  return {
    objectId: part.id,
    objectType: "part",
    localSize: [part.width, part.height, part.depth],
    worldCenter: part.position,
    rotation: part.rotation,
    boundingBox: { min: bbox.min, max: bbox.max },
  };
}

/**
 * Create ObjectInfo for a Cabinet
 * Uses cabinet's params for local size and worldTransform for rotation
 */
function getCabinetObjectInfo(cabinet: Cabinet, parts: Part[]): ObjectInfo | null {
  const bbox = getCabinetBoundingBox(cabinet.id, parts);
  if (!bbox) return null;

  // Cabinet local size from params
  const localSize: Vec3 = [cabinet.params.width, cabinet.params.height, cabinet.params.depth];

  // World center and rotation from worldTransform or calculated from bbox
  const worldCenter: Vec3 = cabinet.worldTransform?.position ?? bbox.center;
  const rotation: Vec3 = cabinet.worldTransform?.rotation ?? [0, 0, 0];

  return {
    objectId: cabinet.id,
    objectType: "cabinet",
    localSize,
    worldCenter,
    rotation,
    boundingBox: { min: bbox.min, max: bbox.max },
  };
}

/**
 * Create ObjectInfo for a Countertop group
 * Countertops don't have rotation - use bbox size
 */
function getCountertopObjectInfo(
  group: CountertopGroup,
  cabinets: Cabinet[],
  parts: Part[]
): ObjectInfo | null {
  const bbox = calculateCountertopBoundingBox(group, cabinets, parts);
  if (!bbox) return null;

  const size: Vec3 = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];
  const center: Vec3 = [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2,
  ];

  return {
    objectId: group.id,
    objectType: "countertop",
    localSize: size,
    worldCenter: center,
    rotation: [0, 0, 0], // Countertops don't rotate independently
    boundingBox: bbox,
  };
}

/**
 * Create ObjectInfo for a multiselect group
 * Multiselect doesn't have unified rotation - use AABB
 */
function getMultiselectObjectInfo(partIds: Set<string>, parts: Part[]): ObjectInfo | null {
  const bbox = getMultiselectBoundingBox(partIds, parts);
  if (!bbox) return null;

  const size: Vec3 = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];

  return {
    objectId: "multiselect",
    objectType: "multiselect",
    localSize: size,
    worldCenter: bbox.center,
    rotation: [0, 0, 0], // Multiselect uses world-aligned bbox
    boundingBox: { min: bbox.min, max: bbox.max },
  };
}

// ============================================================================
// Vector Math (for inverse rotation)
// ============================================================================

/**
 * Apply inverse Euler rotation (XYZ order) to a vector
 * Used to transform camera direction to object's local space
 */
function applyInverseRotation(vec: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;

  // Inverse of XYZ Euler is applied in reverse order: -X, -Y, -Z
  const cx = Math.cos(-rx),
    sx = Math.sin(-rx);
  const cy = Math.cos(-ry),
    sy = Math.sin(-ry);
  const cz = Math.cos(-rz),
    sz = Math.sin(-rz);

  let [x, y, z] = vec;

  // Apply inverse X first (reverse of original order)
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  y = y1;
  z = z1;

  // Apply inverse Y
  const x2 = x * cy + z * sy;
  const z2 = -x * sy + z * cy;
  x = x2;
  z = z2;

  // Apply inverse Z last
  const x3 = x * cz - y * sz;
  const y3 = x * sz + y * cz;

  return [x3, y3, z];
}

// ============================================================================
// Dimension Calculation
// ============================================================================

/**
 * Calculate dimension lines for a single object in LOCAL space
 * Dimensions are positioned relative to object center (0,0,0)
 * They will be transformed by object rotation when rendered
 */
export function calculateObjectDimensions(
  objectId: string,
  objectType: "part" | "cabinet" | "countertop" | "multiselect",
  objectInfo: ObjectInfo,
  cameraX: number,
  cameraY: number,
  cameraZ: number
): ObjectDimensionSet {
  const { localSize, worldCenter, rotation, boundingBox } = objectInfo;
  const [width, height, depth] = localSize;
  const [centerX, centerY, centerZ] = worldCenter;

  // Half dimensions for local space calculations
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  // Transform camera direction to object's local space
  // This tells us which side of the object the camera is viewing
  const camDirWorld: Vec3 = [cameraX - centerX, cameraY - centerY, cameraZ - centerZ];
  const camDirLocal = applyInverseRotation(camDirWorld, rotation);

  // Determine which side of object is closer to camera (in local space)
  const useMaxX = camDirLocal[0] > 0;
  const useMaxY = camDirLocal[1] > 0;
  const useMaxZ = camDirLocal[2] > 0;

  const offset = CONFIG.EDGE_OFFSET;
  const stackOffset = CONFIG.STACKING_OFFSET;
  const dimensions: ObjectDimension[] = [];

  // All positions are in LOCAL space (relative to object center at 0,0,0)

  // WIDTH dimension (local X-axis)
  if (width >= CONFIG.MIN_DIMENSION_SIZE) {
    const widthY = useMaxY ? halfH + offset : -halfH - offset;
    const widthZ = useMaxZ ? halfD + offset : -halfD - offset;
    dimensions.push({
      id: `${objectId}-W`,
      objectId,
      objectType,
      axis: "X",
      label: "W",
      startPoint: [-halfW, widthY, widthZ],
      endPoint: [halfW, widthY, widthZ],
      length: width,
      labelPosition: [0, widthY, widthZ],
    });
  }

  // HEIGHT dimension (local Y-axis)
  if (height >= CONFIG.MIN_DIMENSION_SIZE) {
    const heightX = useMaxX ? halfW + offset : -halfW - offset;
    const heightZ = useMaxZ ? halfD + offset + stackOffset : -halfD - offset - stackOffset;
    dimensions.push({
      id: `${objectId}-H`,
      objectId,
      objectType,
      axis: "Y",
      label: "H",
      startPoint: [heightX, -halfH, heightZ],
      endPoint: [heightX, halfH, heightZ],
      length: height,
      labelPosition: [heightX, 0, heightZ],
    });
  }

  // DEPTH dimension (local Z-axis)
  if (depth >= CONFIG.MIN_DIMENSION_SIZE) {
    const depthX = useMaxX ? halfW + offset + stackOffset : -halfW - offset - stackOffset;
    const depthY = useMaxY ? halfH + offset : -halfH - offset;
    dimensions.push({
      id: `${objectId}-D`,
      objectId,
      objectType,
      axis: "Z",
      label: "D",
      startPoint: [depthX, depthY, -halfD],
      endPoint: [depthX, depthY, halfD],
      length: depth,
      labelPosition: [depthX, depthY, 0],
    });
  }

  return {
    objectId,
    objectType,
    worldCenter,
    rotation,
    localSize,
    boundingBox: {
      min: boundingBox.min,
      max: boundingBox.max,
      center: worldCenter,
      size: localSize,
    },
    dimensions,
  };
}

// ============================================================================
// Object Collection for Dimensioning
// ============================================================================

/**
 * Collect objects to dimension based on mode and granularity
 * Returns array of object infos with bounding boxes
 */
export function getObjectsForDimensioning(
  mode: ObjectDimensionMode,
  granularity: ObjectDimensionGranularity,
  parts: Part[],
  cabinets: Cabinet[],
  countertopGroups: CountertopGroup[],
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  selectedFurnitureId: string,
  hiddenPartIds: Set<string>
): ObjectInfo[] {
  const results: ObjectInfo[] = [];

  // Filter to current furniture (performance: do this once)
  const furnitureParts = parts.filter(
    (p) => p.furnitureId === selectedFurnitureId && !hiddenPartIds.has(p.id)
  );
  const furnitureCabinets = cabinets.filter((c) => c.furnitureId === selectedFurnitureId);
  const furnitureCountertops = countertopGroups.filter(
    (ct) => ct.furnitureId === selectedFurnitureId
  );

  if (mode === "selection") {
    collectSelectionObjects(
      results,
      granularity,
      furnitureParts,
      furnitureCabinets,
      furnitureCountertops,
      selectedPartId,
      selectedCabinetId,
      selectedPartIds,
      selectedCountertopGroupId,
      parts
    );
  } else {
    collectAllObjects(
      results,
      granularity,
      furnitureParts,
      furnitureCabinets,
      furnitureCountertops,
      parts
    );
  }

  return results;
}

/**
 * Collect objects for selection mode
 */
function collectSelectionObjects(
  results: ObjectInfo[],
  granularity: ObjectDimensionGranularity,
  parts: Part[],
  cabinets: Cabinet[],
  countertopGroups: CountertopGroup[],
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  allParts: Part[]
): void {
  if (granularity === "group") {
    // Cabinet selection
    if (selectedCabinetId) {
      const cabinet = cabinets.find((c) => c.id === selectedCabinetId);
      if (cabinet) {
        const info = getCabinetObjectInfo(cabinet, allParts);
        if (info) results.push(info);
      }
      return;
    }

    // Multiselect
    if (selectedPartIds.size > 1) {
      const info = getMultiselectObjectInfo(selectedPartIds, parts);
      if (info) results.push(info);
      return;
    }

    // Countertop selection
    if (selectedCountertopGroupId) {
      const group = countertopGroups.find((g) => g.id === selectedCountertopGroupId);
      if (group) {
        const info = getCountertopObjectInfo(group, cabinets, allParts);
        if (info) results.push(info);
      }
      return;
    }

    // Single part - show cabinet if part belongs to one
    if (selectedPartId) {
      const part = parts.find((p) => p.id === selectedPartId);
      if (part?.cabinetMetadata?.cabinetId) {
        const cabinet = cabinets.find((c) => c.id === part.cabinetMetadata!.cabinetId);
        if (cabinet) {
          const info = getCabinetObjectInfo(cabinet, allParts);
          if (info) results.push(info);
        }
      } else if (part) {
        results.push(getPartObjectInfo(part));
      }
    }
  } else {
    // Granularity: part - show individual parts
    if (selectedCabinetId) {
      const cabinet = cabinets.find((c) => c.id === selectedCabinetId);
      if (cabinet) {
        for (const partId of cabinet.partIds) {
          const part = parts.find((p) => p.id === partId);
          if (part) {
            results.push(getPartObjectInfo(part));
          }
        }
      }
      return;
    }

    if (selectedPartIds.size > 0) {
      for (const partId of Array.from(selectedPartIds)) {
        const part = parts.find((p) => p.id === partId);
        if (part) {
          results.push(getPartObjectInfo(part));
        }
      }
      return;
    }

    if (selectedPartId) {
      const part = parts.find((p) => p.id === selectedPartId);
      if (part) {
        results.push(getPartObjectInfo(part));
      }
    }

    // Countertop in part mode - treat as single object
    if (selectedCountertopGroupId) {
      const group = countertopGroups.find((g) => g.id === selectedCountertopGroupId);
      if (group) {
        const info = getCountertopObjectInfo(group, cabinets, allParts);
        if (info) results.push(info);
      }
    }
  }
}

/**
 * Collect all objects for 'all' mode
 */
function collectAllObjects(
  results: ObjectInfo[],
  granularity: ObjectDimensionGranularity,
  furnitureParts: Part[],
  furnitureCabinets: Cabinet[],
  furnitureCountertops: CountertopGroup[],
  allParts: Part[]
): void {
  if (granularity === "group") {
    // All cabinets
    for (const cabinet of furnitureCabinets) {
      const info = getCabinetObjectInfo(cabinet, allParts);
      if (info) results.push(info);
    }

    // Parts without cabinet
    const cabinetPartIds = new Set<string>();
    for (const cabinet of furnitureCabinets) {
      for (const partId of cabinet.partIds) {
        cabinetPartIds.add(partId);
      }
    }

    for (const part of furnitureParts) {
      if (!cabinetPartIds.has(part.id)) {
        results.push(getPartObjectInfo(part));
      }
    }

    // All countertops
    for (const group of furnitureCountertops) {
      const info = getCountertopObjectInfo(group, furnitureCabinets, allParts);
      if (info) results.push(info);
    }
  } else {
    // All individual parts
    for (const part of furnitureParts) {
      results.push(getPartObjectInfo(part));
    }

    // All countertops
    for (const group of furnitureCountertops) {
      const info = getCountertopObjectInfo(group, furnitureCabinets, allParts);
      if (info) results.push(info);
    }
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Calculate all object dimensions for display
 * Main entry point - optimized for performance
 */
export function calculateAllObjectDimensions(
  mode: ObjectDimensionMode,
  granularity: ObjectDimensionGranularity,
  parts: Part[],
  cabinets: Cabinet[],
  countertopGroups: CountertopGroup[],
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  selectedFurnitureId: string,
  hiddenPartIds: Set<string>,
  cameraX: number,
  cameraY: number,
  cameraZ: number
): ObjectDimensionSet[] {
  const objects = getObjectsForDimensioning(
    mode,
    granularity,
    parts,
    cabinets,
    countertopGroups,
    selectedPartId,
    selectedCabinetId,
    selectedPartIds,
    selectedCountertopGroupId,
    selectedFurnitureId,
    hiddenPartIds
  );

  // Early exit if no objects
  if (objects.length === 0) return [];

  // Calculate dimensions for each object
  return objects.map((obj) =>
    calculateObjectDimensions(obj.objectId, obj.objectType, obj, cameraX, cameraY, cameraZ)
  );
}
