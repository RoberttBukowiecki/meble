/**
 * Utility functions
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Used for combining conditional classes in components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Round a number to specified decimal places, but only if it has more decimals.
 * If the number already has <= decimals places, return as-is.
 *
 * Uses mathematical approach instead of string parsing for robustness.
 *
 * @example
 * roundToDecimals(1.23232323) // => 1.23
 * roundToDecimals(1) // => 1
 * roundToDecimals(1.2) // => 1.2
 * roundToDecimals(1.23) // => 1.23
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  const rounded = Math.round(value * multiplier) / multiplier;

  // Only return rounded if it's different (meaning there were excess decimals)
  // Use tolerance for floating point comparison
  if (Math.abs(value - rounded) < Number.EPSILON) {
    return value;
  }

  return rounded;
}

/**
 * Round position tuple to 2 decimal places (only values with more than 2 decimals)
 */
export function roundPosition(pos: [number, number, number]): [number, number, number] {
  return [
    roundToDecimals(pos[0]),
    roundToDecimals(pos[1]),
    roundToDecimals(pos[2]),
  ];
}

/**
 * Snap radians to common angles (0°, ±90°, ±180°) if within tolerance.
 * This fixes floating-point drift that causes values like -89.89° instead of -90°.
 *
 * @param radians - The angle in radians
 * @param toleranceDegrees - How close (in degrees) the value must be to snap (default: 0.5°)
 */
function snapToCommonAngle(radians: number, toleranceDegrees: number = 0.5): number {
  const toleranceRad = (toleranceDegrees * Math.PI) / 180;

  // Common angles in radians: 0°, ±90°, ±180°, 270° (-90°)
  const commonAngles = [
    0,
    Math.PI / 2,      // 90°
    Math.PI,          // 180°
    -Math.PI / 2,     // -90°
    -Math.PI,         // -180°
    (3 * Math.PI) / 2, // 270°
  ];

  for (const angle of commonAngles) {
    if (Math.abs(radians - angle) < toleranceRad) {
      return angle;
    }
  }

  return radians;
}

/**
 * Round rotation tuple to 4 decimal places to preserve precision for standard angles.
 * Also snaps to common angles (0°, ±90°, ±180°) if within 0.5° tolerance to fix
 * floating-point drift from Three.js TransformControls.
 */
export function roundRotation(rot: [number, number, number]): [number, number, number] {
  return [
    snapToCommonAngle(roundToDecimals(rot[0], 4)),
    snapToCommonAngle(roundToDecimals(rot[1], 4)),
    snapToCommonAngle(roundToDecimals(rot[2], 4)),
  ];
}

/**
 * Round dimension value to 2 decimal places (only if it has more than 2 decimals)
 */
export function roundDimension(value: number): number {
  return roundToDecimals(value);
}
