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
} from '@/types';
import {
  getPartBoundingBox,
  getCabinetBoundingBox,
  getMultiselectBoundingBox,
  calculateCountertopBoundingBox,
} from './bounding-box-utils';

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
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
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
// Dimension Calculation
// ============================================================================

/**
 * Calculate dimension lines for a single object
 * Positions dimensions on the side closest to camera for visibility
 */
export function calculateObjectDimensions(
  objectId: string,
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect',
  boundingBox: BoundingBox,
  cameraX: number,
  cameraY: number,
  cameraZ: number
): ObjectDimensionSet {
  const { min, max } = boundingBox;

  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const depth = max[2] - min[2];

  const centerX = (min[0] + max[0]) * 0.5;
  const centerY = (min[1] + max[1]) * 0.5;
  const centerZ = (min[2] + max[2]) * 0.5;

  // Determine which side of box is closer to camera
  const useMaxX = cameraX > centerX;
  const useMaxY = cameraY > centerY;
  const useMaxZ = cameraZ > centerZ;

  const offset = CONFIG.EDGE_OFFSET;
  const stackOffset = CONFIG.STACKING_OFFSET;
  const dimensions: ObjectDimension[] = [];

  // WIDTH dimension (X-axis)
  if (width >= CONFIG.MIN_DIMENSION_SIZE) {
    const widthY = useMaxY ? max[1] + offset : min[1] - offset;
    const widthZ = useMaxZ ? max[2] + offset : min[2] - offset;
    dimensions.push({
      id: `${objectId}-W`,
      objectId,
      objectType,
      axis: 'X',
      label: 'W',
      startPoint: [min[0], widthY, widthZ],
      endPoint: [max[0], widthY, widthZ],
      length: width,
      labelPosition: [centerX, widthY, widthZ],
    });
  }

  // HEIGHT dimension (Y-axis)
  if (height >= CONFIG.MIN_DIMENSION_SIZE) {
    const heightX = useMaxX ? max[0] + offset : min[0] - offset;
    const heightZ = useMaxZ ? max[2] + offset + stackOffset : min[2] - offset - stackOffset;
    dimensions.push({
      id: `${objectId}-H`,
      objectId,
      objectType,
      axis: 'Y',
      label: 'H',
      startPoint: [heightX, min[1], heightZ],
      endPoint: [heightX, max[1], heightZ],
      length: height,
      labelPosition: [heightX, centerY, heightZ],
    });
  }

  // DEPTH dimension (Z-axis)
  if (depth >= CONFIG.MIN_DIMENSION_SIZE) {
    const depthX = useMaxX ? max[0] + offset + stackOffset : min[0] - offset - stackOffset;
    const depthY = useMaxY ? max[1] + offset : min[1] - offset;
    dimensions.push({
      id: `${objectId}-D`,
      objectId,
      objectType,
      axis: 'Z',
      label: 'D',
      startPoint: [depthX, depthY, min[2]],
      endPoint: [depthX, depthY, max[2]],
      length: depth,
      labelPosition: [depthX, depthY, centerZ],
    });
  }

  return {
    objectId,
    objectType,
    boundingBox: {
      min,
      max,
      center: [centerX, centerY, centerZ],
      size: [width, height, depth],
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
  const furnitureCabinets = cabinets.filter(
    (c) => c.furnitureId === selectedFurnitureId
  );
  const furnitureCountertops = countertopGroups.filter(
    (ct) => ct.furnitureId === selectedFurnitureId
  );

  if (mode === 'selection') {
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
  if (granularity === 'group') {
    // Cabinet selection
    if (selectedCabinetId) {
      const bbox = getCabinetBoundingBox(selectedCabinetId, parts);
      if (bbox) {
        results.push({
          objectId: selectedCabinetId,
          objectType: 'cabinet',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
      }
      return;
    }

    // Multiselect
    if (selectedPartIds.size > 1) {
      const bbox = getMultiselectBoundingBox(selectedPartIds, parts);
      if (bbox) {
        results.push({
          objectId: 'multiselect',
          objectType: 'multiselect',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
      }
      return;
    }

    // Countertop selection
    if (selectedCountertopGroupId) {
      const group = countertopGroups.find((g) => g.id === selectedCountertopGroupId);
      if (group) {
        const bbox = calculateCountertopBoundingBox(group, cabinets, allParts);
        if (bbox) {
          results.push({
            objectId: selectedCountertopGroupId,
            objectType: 'countertop',
            boundingBox: bbox,
          });
        }
      }
      return;
    }

    // Single part - show cabinet if part belongs to one
    if (selectedPartId) {
      const part = parts.find((p) => p.id === selectedPartId);
      if (part?.cabinetMetadata?.cabinetId) {
        const bbox = getCabinetBoundingBox(part.cabinetMetadata.cabinetId, parts);
        if (bbox) {
          results.push({
            objectId: part.cabinetMetadata.cabinetId,
            objectType: 'cabinet',
            boundingBox: { min: bbox.min, max: bbox.max },
          });
        }
      } else if (part) {
        const bbox = getPartBoundingBox(part);
        results.push({
          objectId: selectedPartId,
          objectType: 'part',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
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
            const bbox = getPartBoundingBox(part);
            results.push({
              objectId: partId,
              objectType: 'part',
              boundingBox: { min: bbox.min, max: bbox.max },
            });
          }
        }
      }
      return;
    }

    if (selectedPartIds.size > 0) {
      for (const partId of Array.from(selectedPartIds)) {
        const part = parts.find((p) => p.id === partId);
        if (part) {
          const bbox = getPartBoundingBox(part);
          results.push({
            objectId: partId,
            objectType: 'part',
            boundingBox: { min: bbox.min, max: bbox.max },
          });
        }
      }
      return;
    }

    if (selectedPartId) {
      const part = parts.find((p) => p.id === selectedPartId);
      if (part) {
        const bbox = getPartBoundingBox(part);
        results.push({
          objectId: selectedPartId,
          objectType: 'part',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
      }
    }

    // Countertop in part mode - treat as single object
    if (selectedCountertopGroupId) {
      const group = countertopGroups.find((g) => g.id === selectedCountertopGroupId);
      if (group) {
        const bbox = calculateCountertopBoundingBox(group, cabinets, allParts);
        if (bbox) {
          results.push({
            objectId: selectedCountertopGroupId,
            objectType: 'countertop',
            boundingBox: bbox,
          });
        }
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
  if (granularity === 'group') {
    // All cabinets
    for (const cabinet of furnitureCabinets) {
      const bbox = getCabinetBoundingBox(cabinet.id, allParts);
      if (bbox) {
        results.push({
          objectId: cabinet.id,
          objectType: 'cabinet',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
      }
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
        const bbox = getPartBoundingBox(part);
        results.push({
          objectId: part.id,
          objectType: 'part',
          boundingBox: { min: bbox.min, max: bbox.max },
        });
      }
    }

    // All countertops
    for (const group of furnitureCountertops) {
      const bbox = calculateCountertopBoundingBox(group, furnitureCabinets, allParts);
      if (bbox) {
        results.push({
          objectId: group.id,
          objectType: 'countertop',
          boundingBox: bbox,
        });
      }
    }
  } else {
    // All individual parts
    for (const part of furnitureParts) {
      const bbox = getPartBoundingBox(part);
      results.push({
        objectId: part.id,
        objectType: 'part',
        boundingBox: { min: bbox.min, max: bbox.max },
      });
    }

    // All countertops
    for (const group of furnitureCountertops) {
      const bbox = calculateCountertopBoundingBox(group, furnitureCabinets, allParts);
      if (bbox) {
        results.push({
          objectId: group.id,
          objectType: 'countertop',
          boundingBox: bbox,
        });
      }
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
    calculateObjectDimensions(
      obj.objectId,
      obj.objectType,
      obj.boundingBox,
      cameraX,
      cameraY,
      cameraZ
    )
  );
}
