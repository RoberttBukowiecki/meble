/**
 * Shared types for domain modules
 */

/**
 * Result of validation operations
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Generic bounds for sections, zones, etc.
 */
export interface Bounds {
  startY: number;
  height: number;
}

/**
 * Bounds with additional context
 */
export interface BoundsWithIndex extends Bounds {
  index: number;
}

/**
 * Dimension triplet (width, height, depth)
 */
export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

/**
 * Position triplet
 */
export type Position = [number, number, number];

/**
 * Rotation triplet (radians)
 */
export type Rotation = [number, number, number];

/**
 * 3D Bounding box
 */
export interface BoundingBox {
  min: Position;
  max: Position;
  center: Position;
  size: Dimensions;
}

/**
 * Interior space dimensions (inside cabinet walls)
 */
export interface InteriorSpace {
  width: number;
  height: number;
  depth: number;
  startY: number;
}

/**
 * Drawer box calculated dimensions
 */
export interface DrawerBoxDimensions {
  boxWidth: number;
  boxDepth: number;
  boxSideHeight: number;
  bottomThickness: number;
}

/**
 * Zone bounds with additional drawer-specific info
 */
export interface ZoneBounds extends Bounds {
  zoneId: string;
  frontHeight: number;
  boxHeight: number;
}

/**
 * Validation helper - creates a valid result
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Validation helper - creates an invalid result
 */
export function invalidResult(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Validation helper - merges multiple validation results
 */
export function mergeValidations(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    errors.push(...result.errors);
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
