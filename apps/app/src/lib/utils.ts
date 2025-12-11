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
 * Round rotation tuple to 2 decimal places (only values with more than 2 decimals)
 */
export function roundRotation(rot: [number, number, number]): [number, number, number] {
  return [
    roundToDecimals(rot[0]),
    roundToDecimals(rot[1]),
    roundToDecimals(rot[2]),
  ];
}

/**
 * Round dimension value to 2 decimal places (only if it has more than 2 decimals)
 */
export function roundDimension(value: number): number {
  return roundToDecimals(value);
}
