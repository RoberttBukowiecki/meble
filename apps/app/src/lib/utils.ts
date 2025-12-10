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
