/**
 * Cabinet Resize Utilities
 *
 * Provides calculation functions for cabinet resize operations.
 * Uses proportional scaling for live preview.
 */

import * as THREE from 'three';
import type {
  Part,
  CabinetResizeHandle,
  CabinetBoundingBox,
  CabinetPartPreview,
  CabinetPartInitialTransform,
  CabinetResizeResult,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

/** Oriented Bounding Box - includes rotation */
export interface CabinetOBB {
  center: [number, number, number];
  size: [number, number, number];
  rotation: THREE.Quaternion;
}

// ============================================================================
// Oriented Bounding Box Calculations
// ============================================================================

/** Default part rotations by cabinet role */
const DEFAULT_PART_ROTATIONS: Record<string, [number, number, number]> = {
  BOTTOM: [-Math.PI / 2, 0, 0],
  TOP: [-Math.PI / 2, 0, 0],
  LEFT: [0, 0, Math.PI / 2],
  RIGHT: [0, 0, -Math.PI / 2],
  BACK: [0, 0, 0],
  SHELF: [-Math.PI / 2, 0, 0],
  FRONT: [0, 0, 0],
};

/**
 * Get cabinet rotation from reference part
 */
function getCabinetRotation(parts: Part[]): THREE.Quaternion {
  const referencePart = parts.find((p) => p.cabinetMetadata?.role === 'BOTTOM') ?? parts[0];

  if (!referencePart?.rotation) {
    return new THREE.Quaternion();
  }

  const currentRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(referencePart.rotation)
  );

  const role = referencePart.cabinetMetadata?.role ?? 'BOTTOM';
  const defaultRotationArray = DEFAULT_PART_ROTATIONS[role] ?? [0, 0, 0];
  const defaultRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(defaultRotationArray)
  );

  // Cabinet rotation = currentRotation * inverse(defaultRotation)
  return currentRotation.clone().multiply(defaultRotation.clone().invert());
}

/**
 * Calculate Oriented Bounding Box for cabinet parts
 * Returns center, size in local space, and cabinet rotation
 */
export function calculateCabinetOBB(parts: Part[]): CabinetOBB {
  if (parts.length === 0) {
    return {
      center: [0, 0, 0],
      size: [0, 0, 0],
      rotation: new THREE.Quaternion(),
    };
  }

  const cabinetRotation = getCabinetRotation(parts);
  const inverseRotation = cabinetRotation.clone().invert();

  // Transform all corners to cabinet-local space
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  parts.forEach((part) => {
    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    const localCorners: [number, number, number][] = [
      [-halfW, -halfH, -halfD],
      [+halfW, -halfH, -halfD],
      [-halfW, +halfH, -halfD],
      [+halfW, +halfH, -halfD],
      [-halfW, -halfH, +halfD],
      [+halfW, -halfH, +halfD],
      [-halfW, +halfH, +halfD],
      [+halfW, +halfH, +halfD],
    ];

    // Part's world transform
    const partEuler = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ');
    const partMatrix = new THREE.Matrix4();
    partMatrix.makeRotationFromEuler(partEuler);
    partMatrix.setPosition(part.position[0], part.position[1], part.position[2]);

    localCorners.forEach((corner) => {
      // Transform to world space
      const worldCorner = new THREE.Vector3(corner[0], corner[1], corner[2]).applyMatrix4(partMatrix);
      // Then to cabinet-local space (inverse cabinet rotation)
      worldCorner.applyQuaternion(inverseRotation);

      minX = Math.min(minX, worldCorner.x);
      minY = Math.min(minY, worldCorner.y);
      minZ = Math.min(minZ, worldCorner.z);
      maxX = Math.max(maxX, worldCorner.x);
      maxY = Math.max(maxY, worldCorner.y);
      maxZ = Math.max(maxZ, worldCorner.z);
    });
  });

  // Center in cabinet-local space, then transform back to world
  const localCenter = new THREE.Vector3(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  );
  const worldCenter = localCenter.clone().applyQuaternion(cabinetRotation);

  return {
    center: [worldCenter.x, worldCenter.y, worldCenter.z],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
    rotation: cabinetRotation,
  };
}

/**
 * Get world position of resize handle for OBB
 */
export function getOBBHandlePosition(
  obb: CabinetOBB,
  handle: CabinetResizeHandle
): [number, number, number] {
  // Local position on cabinet face
  let localPos: [number, number, number];

  switch (handle) {
    case 'width+':
      localPos = [obb.size[0] / 2, 0, 0];
      break;
    case 'width-':
      localPos = [-obb.size[0] / 2, 0, 0];
      break;
    case 'height+':
      localPos = [0, obb.size[1] / 2, 0];
      break;
    case 'height-':
      localPos = [0, -obb.size[1] / 2, 0];
      break;
    case 'depth+':
      localPos = [0, 0, obb.size[2] / 2];
      break;
    case 'depth-':
      localPos = [0, 0, -obb.size[2] / 2];
      break;
  }

  // Transform to world space
  const worldPos = new THREE.Vector3(...localPos).applyQuaternion(obb.rotation);
  worldPos.add(new THREE.Vector3(...obb.center));

  return [worldPos.x, worldPos.y, worldPos.z];
}

/**
 * Get handle normal in world space for OBB
 */
export function getOBBHandleNormal(
  obb: CabinetOBB,
  handle: CabinetResizeHandle
): [number, number, number] {
  let localNormal: [number, number, number];

  switch (handle) {
    case 'width+':
      localNormal = [1, 0, 0];
      break;
    case 'width-':
      localNormal = [-1, 0, 0];
      break;
    case 'height+':
      localNormal = [0, 1, 0];
      break;
    case 'height-':
      localNormal = [0, -1, 0];
      break;
    case 'depth+':
      localNormal = [0, 0, 1];
      break;
    case 'depth-':
      localNormal = [0, 0, -1];
      break;
  }

  // Transform to world space
  const worldNormal = new THREE.Vector3(...localNormal).applyQuaternion(obb.rotation);
  return [worldNormal.x, worldNormal.y, worldNormal.z];
}

// ============================================================================
// Axis-Aligned Bounding Box Calculations (legacy)
// ============================================================================

/**
 * Calculate accurate bounding box for cabinet parts
 * Accounts for part rotations by transforming corners to world space
 */
export function calculateCabinetBoundingBox(parts: Part[]): CabinetBoundingBox {
  if (parts.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  parts.forEach(part => {
    // Get local corners of part (half-extents)
    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    // 8 corners of the part's local bounding box
    const localCorners: [number, number, number][] = [
      [-halfW, -halfH, -halfD],
      [+halfW, -halfH, -halfD],
      [-halfW, +halfH, -halfD],
      [+halfW, +halfH, -halfD],
      [-halfW, -halfH, +halfD],
      [+halfW, -halfH, +halfD],
      [-halfW, +halfH, +halfD],
      [+halfW, +halfH, +halfD],
    ];

    // Build transformation matrix for this part
    const matrix = new THREE.Matrix4();
    const euler = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ');
    matrix.makeRotationFromEuler(euler);
    matrix.setPosition(part.position[0], part.position[1], part.position[2]);

    // Transform each corner to world space and update min/max
    localCorners.forEach(corner => {
      const worldCorner = new THREE.Vector3(corner[0], corner[1], corner[2]).applyMatrix4(matrix);
      minX = Math.min(minX, worldCorner.x);
      minY = Math.min(minY, worldCorner.y);
      minZ = Math.min(minZ, worldCorner.z);
      maxX = Math.max(maxX, worldCorner.x);
      maxY = Math.max(maxY, worldCorner.y);
      maxZ = Math.max(maxZ, worldCorner.z);
    });
  });

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

// ============================================================================
// Handle Position & Normal
// ============================================================================

/**
 * Get world position of resize handle (center of bounding box face)
 */
export function getCabinetHandlePosition(
  boundingBox: CabinetBoundingBox,
  handle: CabinetResizeHandle
): [number, number, number] {
  const { min, max, center } = boundingBox;

  switch (handle) {
    case 'width+':  return [max[0], center[1], center[2]]; // Right face
    case 'width-':  return [min[0], center[1], center[2]]; // Left face
    case 'height+': return [center[0], max[1], center[2]]; // Top face
    case 'height-': return [center[0], min[1], center[2]]; // Bottom face
    case 'depth+':  return [center[0], center[1], max[2]]; // Front face
    case 'depth-':  return [center[0], center[1], min[2]]; // Back face
  }
}

/**
 * Get normal direction for resize handle
 */
export function getCabinetHandleNormal(
  handle: CabinetResizeHandle
): [number, number, number] {
  switch (handle) {
    case 'width+':  return [1, 0, 0];
    case 'width-':  return [-1, 0, 0];
    case 'height+': return [0, 1, 0];
    case 'height-': return [0, -1, 0];
    case 'depth+':  return [0, 0, 1];
    case 'depth-':  return [0, 0, -1];
  }
}

/**
 * Get pivot point - the point on opposite face that stays fixed during resize
 */
export function getPivotPoint(
  handle: CabinetResizeHandle,
  boundingBox: CabinetBoundingBox
): [number, number, number] {
  const { min, max, center } = boundingBox;

  // Pivot is on the opposite face
  switch (handle) {
    case 'width+':  return [min[0], center[1], center[2]]; // Left face
    case 'width-':  return [max[0], center[1], center[2]]; // Right face
    case 'height+': return [center[0], min[1], center[2]]; // Bottom face
    case 'height-': return [center[0], max[1], center[2]]; // Top face
    case 'depth+':  return [center[0], center[1], min[2]]; // Back face
    case 'depth-':  return [center[0], center[1], max[2]]; // Front face
  }
}

/**
 * Get axis index for a handle (0=X, 1=Y, 2=Z)
 */
export function getHandleAxisIndex(handle: CabinetResizeHandle): number {
  if (handle.startsWith('width')) return 0;
  if (handle.startsWith('height')) return 1;
  return 2; // depth
}

/**
 * Get axis name for a handle
 */
export function getHandleAxisName(handle: CabinetResizeHandle): 'width' | 'height' | 'depth' {
  if (handle.startsWith('width')) return 'width';
  if (handle.startsWith('height')) return 'height';
  return 'depth';
}

/**
 * Check if handle is positive direction (+X, +Y, +Z)
 */
export function isPositiveHandle(handle: CabinetResizeHandle): boolean {
  return handle.endsWith('+');
}

// ============================================================================
// Proportional Resize Calculation
// ============================================================================

/**
 * Capture initial transforms for all parts
 */
export function captureInitialTransforms(
  parts: Part[]
): Map<string, CabinetPartInitialTransform> {
  const result = new Map<string, CabinetPartInitialTransform>();

  parts.forEach(part => {
    result.set(part.id, {
      position: [...part.position],
      rotation: [...part.rotation],
      dimensions: [part.width, part.height, part.depth],
    });
  });

  return result;
}

/**
 * Calculate proportional resize preview for all parts
 *
 * @param parts - Cabinet parts to resize
 * @param handle - Which handle is being dragged
 * @param dragOffset - Drag offset in world coordinates
 * @param initialBoundingBox - Bounding box at drag start
 * @param initialTransforms - Part transforms at drag start
 * @returns Resize result with new size and part previews
 */
export function calculateProportionalResize(
  parts: Part[],
  handle: CabinetResizeHandle,
  dragOffset: [number, number, number],
  initialBoundingBox: CabinetBoundingBox,
  initialTransforms: Map<string, CabinetPartInitialTransform>
): CabinetResizeResult {
  const axisIndex = getHandleAxisIndex(handle);
  const isPositive = isPositiveHandle(handle);

  // Calculate how much the size changes along the drag axis
  // Only the component along the handle's axis matters
  const normal = getCabinetHandleNormal(handle);
  const dragAlongAxis = dragOffset[0] * normal[0] + dragOffset[1] * normal[1] + dragOffset[2] * normal[2];

  // New size along the axis (can't go below minimum)
  const MIN_SIZE = 50; // Minimum 50mm
  const oldSize = initialBoundingBox.size[axisIndex];
  const newAxisSize = Math.max(MIN_SIZE, oldSize + dragAlongAxis);

  // Calculate scale factor for the dragged axis
  const scaleFactor = newAxisSize / oldSize;

  // New total size (only one axis changes)
  const newSize: [number, number, number] = [...initialBoundingBox.size];
  newSize[axisIndex] = newAxisSize;

  // Scale factors for each axis (only dragged axis scales)
  const scaleFactors: [number, number, number] = [1, 1, 1];
  scaleFactors[axisIndex] = scaleFactor;

  // Pivot point (stays fixed)
  const pivot = getPivotPoint(handle, initialBoundingBox);

  // Calculate preview transforms for each part
  const partPreviews = new Map<string, CabinetPartPreview>();

  parts.forEach(part => {
    const initial = initialTransforms.get(part.id);
    if (!initial) return;

    // Calculate new position (scale relative to pivot)
    const relX = initial.position[0] - pivot[0];
    const relY = initial.position[1] - pivot[1];
    const relZ = initial.position[2] - pivot[2];

    const newPosition: [number, number, number] = [
      pivot[0] + relX * scaleFactors[0],
      pivot[1] + relY * scaleFactors[1],
      pivot[2] + relZ * scaleFactors[2],
    ];

    // Calculate new dimensions (proportional scaling)
    const newDimensions: [number, number, number] = [
      initial.dimensions[0] * scaleFactors[0],
      initial.dimensions[1] * scaleFactors[1],
      initial.dimensions[2] * scaleFactors[2],
    ];

    partPreviews.set(part.id, {
      position: newPosition,
      rotation: [...initial.rotation], // Rotation unchanged
      width: newDimensions[0],
      height: newDimensions[1],
      depth: newDimensions[2],
    });
  });

  // Calculate new bounding box
  const newBoundingBox = calculateNewBoundingBox(
    initialBoundingBox,
    handle,
    newAxisSize
  );

  return {
    newSize,
    partPreviews,
    boundingBox: newBoundingBox,
  };
}

/**
 * Calculate new bounding box after resize
 */
function calculateNewBoundingBox(
  initialBox: CabinetBoundingBox,
  handle: CabinetResizeHandle,
  newAxisSize: number
): CabinetBoundingBox {
  const axisIndex = getHandleAxisIndex(handle);
  const isPositive = isPositiveHandle(handle);

  const newMin: [number, number, number] = [...initialBox.min];
  const newMax: [number, number, number] = [...initialBox.max];

  // Adjust min or max based on which handle was dragged
  if (isPositive) {
    // Dragging positive handle: max changes, min stays
    newMax[axisIndex] = newMin[axisIndex] + newAxisSize;
  } else {
    // Dragging negative handle: min changes, max stays
    newMin[axisIndex] = newMax[axisIndex] - newAxisSize;
  }

  const newSize: [number, number, number] = [
    newMax[0] - newMin[0],
    newMax[1] - newMin[1],
    newMax[2] - newMin[2],
  ];

  const newCenter: [number, number, number] = [
    (newMin[0] + newMax[0]) / 2,
    (newMin[1] + newMax[1]) / 2,
    (newMin[2] + newMax[2]) / 2,
  ];

  return {
    min: newMin,
    max: newMax,
    center: newCenter,
    size: newSize,
  };
}

// ============================================================================
// Edge-Based Resize Calculation (maintains part shapes)
// ============================================================================

/** Tolerance for detecting if a part is at the edge (in mm) */
const EDGE_TOLERANCE = 5.0;

/** Minimum part dimension (in mm) */
const MIN_PART_DIMENSION = 10;

/** Threshold for considering a part as "spanning" the cabinet (ratio of part size to cabinet size) */
const SPANNING_THRESHOLD = 0.3;

/**
 * Get part's world-space extents on a given axis (accounting for rotation)
 * Transforms all 8 corners to world space and finds min/max on the axis
 */
function getPartWorldExtents(
  initial: CabinetPartInitialTransform,
  axisIndex: number
): { min: number; max: number; size: number } {
  const halfW = initial.dimensions[0] / 2;
  const halfH = initial.dimensions[1] / 2;
  const halfD = initial.dimensions[2] / 2;

  // 8 corners of part's local bounding box
  const localCorners: [number, number, number][] = [
    [-halfW, -halfH, -halfD],
    [+halfW, -halfH, -halfD],
    [-halfW, +halfH, -halfD],
    [+halfW, +halfH, -halfD],
    [-halfW, -halfH, +halfD],
    [+halfW, -halfH, +halfD],
    [-halfW, +halfH, +halfD],
    [+halfW, +halfH, +halfD],
  ];

  // Build transformation matrix
  const matrix = new THREE.Matrix4();
  const euler = new THREE.Euler(initial.rotation[0], initial.rotation[1], initial.rotation[2], 'XYZ');
  matrix.makeRotationFromEuler(euler);
  matrix.setPosition(initial.position[0], initial.position[1], initial.position[2]);

  let min = Infinity;
  let max = -Infinity;

  // Transform each corner and find min/max on the target axis
  localCorners.forEach(corner => {
    const worldCorner = new THREE.Vector3(corner[0], corner[1], corner[2]).applyMatrix4(matrix);
    const value = [worldCorner.x, worldCorner.y, worldCorner.z][axisIndex];
    min = Math.min(min, value);
    max = Math.max(max, value);
  });

  return { min, max, size: max - min };
}

/**
 * Calculate edge-based resize preview for all parts
 *
 * Logic:
 * - "Spanning" parts (size > 30% of cabinet on resize axis): resize their dimension, keep fixed edge in place
 * - Small parts at the moving edge: move by full delta, don't resize
 * - Small parts at the fixed edge or in the middle: stay in place, don't resize
 *
 * This ensures:
 * - Bottom, top, shelves (spanning parts) grow in width
 * - Side panels (small parts at edges) move or stay put
 * - Drawer sides stay at same distance from cabinet sides
 *
 * @param parts - Parts to resize
 * @param handle - Which handle is being dragged
 * @param dragOffset - Drag offset in world coordinates
 * @param initialBoundingBox - Bounding box at drag start
 * @param initialTransforms - Part transforms at drag start
 * @returns Resize result with new size and part previews
 */
export function calculateEdgeBasedResize(
  parts: Part[],
  handle: CabinetResizeHandle,
  dragOffset: [number, number, number],
  initialBoundingBox: CabinetBoundingBox,
  initialTransforms: Map<string, CabinetPartInitialTransform>
): CabinetResizeResult {
  const axisIndex = getHandleAxisIndex(handle);
  const isPositive = isPositiveHandle(handle);

  // Calculate how much the size changes along the drag axis
  const normal = getCabinetHandleNormal(handle);
  const dragAlongAxis = dragOffset[0] * normal[0] + dragOffset[1] * normal[1] + dragOffset[2] * normal[2];

  // New size along the axis (can't go below minimum)
  const MIN_SIZE = 50;
  const oldSize = initialBoundingBox.size[axisIndex];
  const newAxisSize = Math.max(MIN_SIZE, oldSize + dragAlongAxis);
  const sizeDelta = newAxisSize - oldSize;

  // New total size (only one axis changes)
  const newSize: [number, number, number] = [...initialBoundingBox.size];
  newSize[axisIndex] = newAxisSize;

  // Calculate new bounding box
  const newBoundingBox = calculateNewBoundingBox(
    initialBoundingBox,
    handle,
    newAxisSize
  );

  // Fixed edge position (the edge that doesn't move)
  const fixedEdgePos = isPositive
    ? initialBoundingBox.min[axisIndex]
    : initialBoundingBox.max[axisIndex];

  // Moving edge position
  const movingEdgePos = isPositive
    ? initialBoundingBox.max[axisIndex]
    : initialBoundingBox.min[axisIndex];

  // Calculate preview transforms for each part
  const partPreviews = new Map<string, CabinetPartPreview>();

  parts.forEach(part => {
    const initial = initialTransforms.get(part.id);
    if (!initial) return;

    // Get part's world-space extents on the resize axis (accounting for rotation)
    const worldExtents = getPartWorldExtents(initial, axisIndex);

    // Check if this part "spans" the cabinet (should resize)
    const isSpanning = worldExtents.size > oldSize * SPANNING_THRESHOLD;

    // Check if part is at the moving edge
    const partMovingEdge = isPositive ? worldExtents.max : worldExtents.min;
    const atMovingEdge = Math.abs(partMovingEdge - movingEdgePos) < EDGE_TOLERANCE;

    // Check if part is at the fixed edge
    const partFixedEdge = isPositive ? worldExtents.min : worldExtents.max;
    const atFixedEdge = Math.abs(partFixedEdge - fixedEdgePos) < EDGE_TOLERANCE;

    // Start with initial values (no change)
    let newWidth = initial.dimensions[0];
    let newHeight = initial.dimensions[1];
    let newDepth = initial.dimensions[2];
    const newPosition: [number, number, number] = [...initial.position];

    if (isSpanning) {
      // SPANNING PART: resize it, keep its fixed edge at original position
      // The part's fixed edge (the one closest to the cabinet's fixed edge) stays put
      // The part's moving edge moves with the resize

      // Calculate new world-space size for this part
      const newWorldSize = Math.max(MIN_PART_DIMENSION, worldExtents.size + sizeDelta);

      // The fixed edge of the part stays at its original position
      // Calculate new center position
      if (isPositive) {
        // Fixed edge is at partFixedEdge (worldExtents.min)
        // New center = fixedEdge + newSize/2
        newPosition[axisIndex] = worldExtents.min + newWorldSize / 2;
      } else {
        // Fixed edge is at partFixedEdge (worldExtents.max)
        // New center = fixedEdge - newSize/2
        newPosition[axisIndex] = worldExtents.max - newWorldSize / 2;
      }

      // Now we need to update the LOCAL dimension that corresponds to the world axis
      // For this, we need to figure out which local dimension maps to the world axis
      // We'll use the ratio of size change to update the appropriate dimension
      const sizeRatio = newWorldSize / worldExtents.size;

      // Find which local dimension contributes most to the world axis extent
      // by checking which dimension, when scaled, would change the world extent
      const testScales = [
        { dim: 0, contrib: Math.abs(getAxisContribution(initial, 0, axisIndex)) },
        { dim: 1, contrib: Math.abs(getAxisContribution(initial, 1, axisIndex)) },
        { dim: 2, contrib: Math.abs(getAxisContribution(initial, 2, axisIndex)) },
      ];
      testScales.sort((a, b) => b.contrib - a.contrib);
      const primaryDim = testScales[0].dim;

      // Scale the primary dimension
      const newDimValue = Math.max(MIN_PART_DIMENSION, initial.dimensions[primaryDim] * sizeRatio);
      if (primaryDim === 0) newWidth = newDimValue;
      else if (primaryDim === 1) newHeight = newDimValue;
      else newDepth = newDimValue;

    } else if (atMovingEdge && !atFixedEdge) {
      // SMALL PART AT MOVING EDGE: move by full delta, don't resize
      if (isPositive) {
        newPosition[axisIndex] = initial.position[axisIndex] + sizeDelta;
      } else {
        newPosition[axisIndex] = initial.position[axisIndex] - sizeDelta;
      }
    }
    // else: SMALL PART AT FIXED EDGE OR IN THE MIDDLE: stay at original position, no resize

    partPreviews.set(part.id, {
      position: newPosition,
      rotation: [...initial.rotation],
      width: newWidth,
      height: newHeight,
      depth: newDepth,
    });
  });

  return {
    newSize,
    partPreviews,
    boundingBox: newBoundingBox,
  };
}

/**
 * Calculate how much a local dimension contributes to a world axis extent
 * This helps determine which local dimension to scale when resizing on a world axis
 */
function getAxisContribution(
  initial: CabinetPartInitialTransform,
  localDimIndex: number,
  worldAxisIndex: number
): number {
  // Create a unit vector along the local dimension
  const localVec = new THREE.Vector3(
    localDimIndex === 0 ? 1 : 0,
    localDimIndex === 1 ? 1 : 0,
    localDimIndex === 2 ? 1 : 0
  );

  // Rotate it by the part's rotation
  const euler = new THREE.Euler(initial.rotation[0], initial.rotation[1], initial.rotation[2], 'XYZ');
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  localVec.applyQuaternion(quaternion);

  // Return the component along the world axis
  return [localVec.x, localVec.y, localVec.z][worldAxisIndex] * initial.dimensions[localDimIndex];
}
