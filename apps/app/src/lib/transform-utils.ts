/**
 * Transform Utilities
 *
 * Shared utilities for transform operations (translate, rotate, resize).
 * Used by PartTransformControls and CabinetGroupTransform.
 */

import type { DragAxes } from "@/types/transform";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";

/**
 * Get active drag axes from TransformControls.
 *
 * TransformControls reports the axis being dragged:
 * - Single axis: "X", "Y", "Z"
 * - Planar drag: "XY", "XZ", "YZ"
 * - Free drag: "XYZ"
 * - Rotation: "E", "XYZE" (not handled here)
 *
 * @param controls - TransformControls ref
 * @returns Active drag axes or null if not dragging on a valid axis
 */
export function getDragAxesFromControls(controls: TransformControlsImpl | null): DragAxes | null {
  if (!controls) return null;

  // Access internal axis property (not in public types)
  const axis = (controls as unknown as { axis: string | null }).axis;

  if (
    axis === "X" ||
    axis === "Y" ||
    axis === "Z" ||
    axis === "XY" ||
    axis === "XZ" ||
    axis === "YZ" ||
    axis === "XYZ"
  ) {
    return axis as DragAxes;
  }

  return null;
}

/**
 * Check if drag is on multiple axes (planar or free drag).
 *
 * @param axes - Drag axes from getDragAxesFromControls
 * @returns true if dragging on 2+ axes simultaneously
 */
export function isPlanarDrag(axes: DragAxes | null): boolean {
  return axes !== null && axes.length > 1;
}

/**
 * Parse DragAxes string into individual axis array.
 *
 * @example
 * parseAxes("XZ") // ["X", "Z"]
 * parseAxes("Y")  // ["Y"]
 * parseAxes("XYZ") // ["X", "Y", "Z"]
 */
export function parseAxes(dragAxes: DragAxes): Array<"X" | "Y" | "Z"> {
  const axes: Array<"X" | "Y" | "Z"> = [];
  if (dragAxes.includes("X")) axes.push("X");
  if (dragAxes.includes("Y")) axes.push("Y");
  if (dragAxes.includes("Z")) axes.push("Z");
  return axes;
}

/**
 * Detect which axis has the most movement.
 * Fallback when TransformControls axis is not available.
 *
 * @param originalPos - Starting position
 * @param currentPos - Current position
 * @returns Dominant axis or null if movement is too small
 */
export function detectMovementAxis(
  originalPos: [number, number, number],
  currentPos: [number, number, number]
): "X" | "Y" | "Z" | null {
  const dx = Math.abs(currentPos[0] - originalPos[0]);
  const dy = Math.abs(currentPos[1] - originalPos[1]);
  const dz = Math.abs(currentPos[2] - originalPos[2]);

  const maxDelta = Math.max(dx, dy, dz);

  // Only detect if there's meaningful movement (> 1mm)
  if (maxDelta < 1) return null;

  if (dx === maxDelta) return "X";
  if (dy === maxDelta) return "Y";
  return "Z";
}

/**
 * Transform local axis to world axis based on object rotation.
 * TransformControls returns axis in local space when space="local",
 * but snapping needs world space coordinates.
 *
 * @param localAxis - Axis in local space
 * @param rotation - Object rotation in radians [rx, ry, rz]
 * @returns Dominant world axis after rotation
 */
export function localAxisToWorldAxis(
  localAxis: "X" | "Y" | "Z",
  rotation: [number, number, number]
): "X" | "Y" | "Z" {
  // Get the local axis direction
  const localDir: [number, number, number] =
    localAxis === "X" ? [1, 0, 0] : localAxis === "Y" ? [0, 1, 0] : [0, 0, 1];

  // Apply rotation to get world direction (Euler XYZ order)
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(ry),
    sy = Math.sin(ry);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);

  let [x, y, z] = localDir;

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
  y = y2;
  z = z2;

  // Find dominant world axis
  const ax = Math.abs(x),
    ay = Math.abs(y),
    az = Math.abs(z);
  if (ax >= ay && ax >= az) return "X";
  if (ay >= ax && ay >= az) return "Y";
  return "Z";
}
