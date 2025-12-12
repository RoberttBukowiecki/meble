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
 * Round rotation tuple to 4 decimal places to preserve precision for standard angles.
 * Radians require higher precision than positions because values like PI/2 (90°)
 * are ~1.5708, and 2 decimal places would cause visible drift (e.g., -89.95° instead of -90°).
 */
export function roundRotation(rot: [number, number, number]): [number, number, number] {
  return [
    roundToDecimals(rot[0], 4),
    roundToDecimals(rot[1], 4),
    roundToDecimals(rot[2], 4),
  ];
}

/**
 * Round dimension value to 2 decimal places (only if it has more than 2 decimals)
 */
export function roundDimension(value: number): number {
  return roundToDecimals(value);
}
