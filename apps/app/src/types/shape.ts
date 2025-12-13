/**
 * Shape type definitions for furniture parts
 */

/**
 * Available shape types for furniture parts
 */
export type ShapeType = 'RECT' | 'TRAPEZOID' | 'L_SHAPE' | 'POLYGON';

/**
 * Shape parameters for rectangular parts
 * @property x - Length along X axis (mm)
 * @property y - Width along Y axis (mm)
 */
export interface ShapeParamsRect {
  type: 'RECT';
  x: number;
  y: number;
}

/**
 * Shape parameters for trapezoid parts
 * @property frontX - Front edge length (mm)
 * @property backX - Back edge length (mm)
 * @property y - Width along Y axis (mm)
 * @property skosSide - Which side has the angle ('left' | 'right')
 */
export interface ShapeParamsTrapezoid {
  type: 'TRAPEZOID';
  frontX: number;
  backX: number;
  y: number;
  skosSide: 'left' | 'right';
}

/**
 * Shape parameters for L-shaped parts
 * @property x - Total length along X axis (mm)
 * @property y - Total width along Y axis (mm)
 * @property cutX - Cut-out length from corner (mm)
 * @property cutY - Cut-out width from corner (mm)
 */
export interface ShapeParamsLShape {
  type: 'L_SHAPE';
  x: number;
  y: number;
  cutX: number;
  cutY: number;
}

/**
 * Shape parameters for custom polygon parts
 * @property points - Array of [x, y] coordinates defining the polygon
 */
export interface ShapeParamsPolygon {
  type: 'POLYGON';
  points: [number, number][];
}

/**
 * Discriminated union of all shape parameter types
 */
export type ShapeParams =
  | ShapeParamsRect
  | ShapeParamsTrapezoid
  | ShapeParamsLShape
  | ShapeParamsPolygon;
