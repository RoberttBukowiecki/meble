/**
 * DXF Export Module
 *
 * Generates DXF files for non-rectangular furniture parts.
 * Uses @tarikjabiri/dxf library for DXF generation.
 *
 * Supports:
 * - L_SHAPE: L-shaped panels (corner cabinets)
 * - TRAPEZOID: Trapezoidal panels
 * - POLYGON: Custom polygon shapes
 */

import { DxfWriter, Units, point2d, LWPolylineFlags, type LWPolylineVertex } from '@tarikjabiri/dxf';
import type {
  Part,
  ShapeParamsLShape,
  ShapeParamsPolygon,
  ShapeParamsTrapezoid,
} from '@/types';

/**
 * Helper to convert [x, y] to LWPolylineVertex
 */
function toVertex(x: number, y: number): LWPolylineVertex {
  return { point: point2d(x, y) };
}

// ============================================================================
// TYPES
// ============================================================================

export interface DXFExportResult {
  filename: string;
  content: string;
  partId: string;
  partName: string;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate DXF file for a non-rectangular part
 * Returns null for RECT parts (they don't need DXF)
 */
export function generatePartDXF(part: Part): DXFExportResult | null {
  if (part.shapeType === 'RECT') {
    return null; // Rectangles don't need DXF
  }

  const dxf = new DxfWriter();
  dxf.setUnits(Units.Millimeters);

  switch (part.shapeType) {
    case 'L_SHAPE':
      addLShapeToDoc(dxf, part.shapeParams as ShapeParamsLShape);
      break;
    case 'POLYGON':
      addPolygonToDoc(dxf, part.shapeParams as ShapeParamsPolygon);
      break;
    case 'TRAPEZOID':
      addTrapezoidToDoc(dxf, part.shapeParams as ShapeParamsTrapezoid);
      break;
    default:
      return null;
  }

  // Generate safe filename from part name
  const safeName = part.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    filename: `${safeName}_${part.id.slice(0, 8)}.dxf`,
    content: dxf.stringify(),
    partId: part.id,
    partName: part.name,
  };
}

/**
 * Generate DXF files for all non-rectangular parts
 */
export function generateAllPartsDXF(parts: Part[]): DXFExportResult[] {
  const results: DXFExportResult[] = [];

  for (const part of parts) {
    const result = generatePartDXF(part);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

// ============================================================================
// SHAPE-SPECIFIC DXF GENERATION
// ============================================================================

/**
 * Add L-shape outline to DXF document
 *
 * L-shape layout (origin at bottom-left):
 *
 *     (0, y) ─────────────── (x-cutX, y)
 *       │                         │
 *       │                         │
 *       │                   (x-cutX, y-cutY)
 *       │                         │
 *       │    ─────────────────────┤ (x, y-cutY)
 *       │                              │
 *     (0,0) ───────────────────── (x, 0)
 */
function addLShapeToDoc(dxf: DxfWriter, params: ShapeParamsLShape): void {
  const { x, y, cutX, cutY } = params;

  // L-shape vertices (counterclockwise from origin)
  const points: LWPolylineVertex[] = [
    toVertex(0, 0),           // Bottom-left (origin)
    toVertex(x, 0),           // Bottom-right
    toVertex(x, y - cutY),    // Right side before cut
    toVertex(x - cutX, y - cutY), // Inner corner (horizontal)
    toVertex(x - cutX, y),    // Inner corner (vertical)
    toVertex(0, y),           // Top-left
  ];

  // Add closed polyline
  dxf.addLWPolyline(points, { flags: LWPolylineFlags.Closed });
}

/**
 * Add polygon outline to DXF document
 */
function addPolygonToDoc(dxf: DxfWriter, params: ShapeParamsPolygon): void {
  const { points } = params;

  // Convert to DXF vertex format
  const dxfPoints: LWPolylineVertex[] = points.map(([px, py]) => toVertex(px, py));

  dxf.addLWPolyline(dxfPoints, { flags: LWPolylineFlags.Closed });
}

/**
 * Add trapezoid outline to DXF document
 *
 * Trapezoid layout depends on skosSide:
 *
 * skosSide === 'left':
 *     backX
 *   ┌─────────┐
 *   │          \
 *   │           \  frontX
 *   │            \
 *   └────────────┘
 *
 * skosSide === 'right':
 *          backX
 *     ┌─────────┐
 *    /          │
 *   /  frontX   │
 *  /            │
 * └─────────────┘
 */
function addTrapezoidToDoc(dxf: DxfWriter, params: ShapeParamsTrapezoid): void {
  const { frontX, backX, y, skosSide } = params;

  let points: LWPolylineVertex[];

  if (skosSide === 'left') {
    const offset = backX - frontX;
    points = [
      toVertex(offset, 0),
      toVertex(offset + frontX, 0),
      toVertex(backX, y),
      toVertex(0, y),
    ];
  } else {
    points = [
      toVertex(0, 0),
      toVertex(frontX, 0),
      toVertex(backX, y),
      toVertex(backX - frontX, y),
    ];
  }

  dxf.addLWPolyline(points, { flags: LWPolylineFlags.Closed });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a part requires DXF export
 */
export function partRequiresDXF(part: Part): boolean {
  return part.shapeType !== 'RECT';
}

/**
 * Count parts that require DXF export
 */
export function countDXFParts(parts: Part[]): number {
  return parts.filter(partRequiresDXF).length;
}
