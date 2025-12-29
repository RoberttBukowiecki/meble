/**
 * Countertop Geometry Utilities
 *
 * Helper functions for creating 3D geometry for countertops with cutouts
 */

import * as THREE from "three";
import type { CncOperation } from "@/types/countertop";

/**
 * Creates a rounded rectangle path for a cutout
 */
export function createRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): THREE.Path {
  const path = new THREE.Path();
  const r = Math.min(radius, width / 2, height / 2);

  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);

  return path;
}

/**
 * Creates a countertop shape with cutouts for extrusion
 *
 * @param width - Countertop width (X axis)
 * @param depth - Countertop depth (Z axis)
 * @param cutouts - CNC operations defining cutouts and holes
 * @returns THREE.Shape ready for ExtrudeGeometry
 */
export function createCountertopShape(
  width: number,
  depth: number,
  cutouts: CncOperation[]
): THREE.Shape {
  // Main countertop shape (centered at origin)
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfD = depth / 2;

  shape.moveTo(-halfW, -halfD);
  shape.lineTo(halfW, -halfD);
  shape.lineTo(halfW, halfD);
  shape.lineTo(-halfW, halfD);
  shape.closePath();

  // Add cutout holes
  // NOTE: The ExtrudeGeometry is rotated -90° around X axis, which inverts Y axis.
  // In Shape coords: Y+ = "up" in 2D
  // After rotation: original Y+ becomes Z- (towards camera = front)
  // Therefore, cutout.position.y (distance from front edge) must be inverted
  // to get correct Shape Y coordinate.
  for (const cutout of cutouts) {
    if (
      cutout.type === "RECTANGULAR_CUTOUT" &&
      cutout.dimensions.width &&
      cutout.dimensions.height
    ) {
      const cutW = cutout.dimensions.width;
      const cutH = cutout.dimensions.height;
      const radius = cutout.dimensions.radius ?? 10;

      // Cutout position is from left-front corner, convert to centered coordinates
      // X axis: position.x from left edge -> shapeX = position.x - halfW (correct)
      // Y axis: position.y from front edge -> after rotation, front = shapeY+, so:
      //         shapeY = halfD - position.y (inverted!)
      // Bottom-left corner of cutout rectangle:
      const cutX = cutout.position.x - halfW - cutW / 2;
      const cutY = halfD - cutout.position.y - cutH / 2;

      const holePath = createRoundedRectPath(cutX, cutY, cutW, cutH, radius);
      shape.holes.push(holePath);
    } else if (cutout.type === "CIRCULAR_HOLE" && cutout.dimensions.diameter) {
      const r = cutout.dimensions.diameter / 2;
      // Same logic: X is correct, Y must be inverted
      const cx = cutout.position.x - halfW;
      const cy = halfD - cutout.position.y;

      const holePath = new THREE.Path();
      holePath.absarc(cx, cy, r, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
    }
  }

  return shape;
}

/**
 * Creates a countertop geometry with optional cutouts
 *
 * @param dimensions - Width, height (thickness), and depth of the countertop
 * @param cncOperations - CNC operations for cutouts
 * @returns THREE.BufferGeometry for the countertop mesh
 */
export function createCountertopGeometry(
  dimensions: { width: number; height: number; depth: number },
  cncOperations: CncOperation[]
): THREE.BufferGeometry {
  const hasCutouts = cncOperations.length > 0;

  if (!hasCutouts) {
    // No cutouts - use simple box geometry
    return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
  }

  // Create extruded shape with cutouts
  const shape = createCountertopShape(dimensions.width, dimensions.depth, cncOperations);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: dimensions.height,
    bevelEnabled: false,
  };

  const extrudeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Rotate geometry so extrusion is along Y axis (up) instead of Z
  // After rotation, extrusion goes from Y=0 upward to Y=height
  extrudeGeom.rotateX(-Math.PI / 2);
  // Center vertically to match BoxGeometry (which is centered at origin: -height/2 to +height/2)
  // Must translate DOWN by height/2 so geometry goes from -height/2 to +height/2
  extrudeGeom.translate(0, -dimensions.height / 2, 0);

  return extrudeGeom;
}
