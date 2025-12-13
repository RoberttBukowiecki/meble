/**
 * Shared utilities for domain modules
 */

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate percentage from ratio
 */
export function ratioToPercent(ratio: number): number {
  return Math.round(ratio * 100);
}

/**
 * Calculate ratio from percentage
 */
export function percentToRatio(percent: number): number {
  return percent / 100;
}

/**
 * Distribute a total amount among items based on their ratios
 */
export function distributeByRatio(
  totalAmount: number,
  ratios: number[]
): number[] {
  if (ratios.length === 0) return [];

  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  if (totalRatio === 0) {
    // Equal distribution if all ratios are 0
    const equalShare = totalAmount / ratios.length;
    return ratios.map(() => equalShare);
  }

  return ratios.map((ratio) => (ratio / totalRatio) * totalAmount);
}

/**
 * Create an immutable update of an array item
 */
export function updateArrayItem<T>(
  array: T[],
  index: number,
  update: Partial<T>
): T[] {
  if (index < 0 || index >= array.length) return array;

  return array.map((item, i) =>
    i === index ? { ...item, ...update } : item
  );
}

/**
 * Create an immutable update of an array item by ID
 */
export function updateArrayItemById<T extends { id: string }>(
  array: T[],
  id: string,
  update: Partial<T>
): T[] {
  return array.map((item) =>
    item.id === id ? { ...item, ...update } : item
  );
}

/**
 * Remove an item from array by index
 */
export function removeArrayItem<T>(array: T[], index: number): T[] {
  if (index < 0 || index >= array.length) return array;
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

/**
 * Remove an item from array by ID
 */
export function removeArrayItemById<T extends { id: string }>(
  array: T[],
  id: string
): T[] {
  return array.filter((item) => item.id !== id);
}

/**
 * Move an array item from one index to another
 */
export function moveArrayItem<T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= array.length ||
    toIndex < 0 ||
    toIndex >= array.length ||
    fromIndex === toIndex
  ) {
    return array;
  }

  const result = [...array];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Find index of item by ID
 */
export function findIndexById<T extends { id: string }>(
  array: T[],
  id: string
): number {
  return array.findIndex((item) => item.id === id);
}

/**
 * Check if two arrays have the same items (shallow comparison)
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}
