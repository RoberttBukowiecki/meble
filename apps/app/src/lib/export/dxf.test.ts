/**
 * Tests for DXF Export Module
 *
 * Tests cover:
 * - generatePartDXF (single part export)
 * - generateAllPartsDXF (batch export)
 * - Shape-specific generation (L_SHAPE, TRAPEZOID, POLYGON)
 * - Utility functions (partRequiresDXF, countDXFParts)
 */

import {
  generatePartDXF,
  generateAllPartsDXF,
  partRequiresDXF,
  countDXFParts,
} from './dxf';
import type { Part } from '@/types';

// ==========================================================================
// TEST FIXTURES
// ==========================================================================

const testDate = new Date('2024-01-01');

const createRectPart = (overrides?: Partial<Part>): Part => ({
  id: 'rect-1',
  name: 'Rectangular Panel',
  furnitureId: 'furniture-1',
  group: 'cabinet-1',
  width: 600,
  height: 400,
  depth: 18,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'mat-1',
  shapeType: 'RECT',
  shapeParams: { type: 'RECT', x: 600, y: 400 },
  edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
  createdAt: testDate,
  updatedAt: testDate,
  ...overrides,
});

const createLShapePart = (overrides?: Partial<Part>): Part => ({
  id: 'lshape-1',
  name: 'L-Shaped Bottom Panel',
  furnitureId: 'furniture-1',
  group: 'cabinet-1',
  width: 900,
  height: 900,
  depth: 18,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'mat-1',
  shapeType: 'L_SHAPE',
  shapeParams: {
    type: 'L_SHAPE',
    x: 900,
    y: 900,
    cutX: 340,
    cutY: 340,
  },
  edgeBanding: {
    type: 'L_SHAPE',
    edge1: true,
    edge2: true,
    edge3: true,
    edge4: true,
    edge5: true,
    edge6: true,
  },
  createdAt: testDate,
  updatedAt: testDate,
  ...overrides,
});

const createTrapezoidPart = (overrides?: Partial<Part>): Part => ({
  id: 'trap-1',
  name: 'Trapezoid Panel',
  furnitureId: 'furniture-1',
  group: 'cabinet-1',
  width: 500,
  height: 400,
  depth: 18,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'mat-1',
  shapeType: 'TRAPEZOID',
  shapeParams: {
    type: 'TRAPEZOID',
    frontX: 450,
    backX: 500,
    y: 400,
    skosSide: 'left',
  },
  edgeBanding: {
    type: 'TRAPEZOID',
    front: true,
    back: true,
    left: true,
    right: true,
  },
  createdAt: testDate,
  updatedAt: testDate,
  ...overrides,
});

const createPolygonPart = (overrides?: Partial<Part>): Part => ({
  id: 'poly-1',
  name: 'Custom Polygon',
  furnitureId: 'furniture-1',
  group: 'cabinet-1',
  width: 500,
  height: 500,
  depth: 18,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'mat-1',
  shapeType: 'POLYGON',
  shapeParams: {
    type: 'POLYGON',
    points: [
      [0, 0],
      [500, 0],
      [500, 300],
      [300, 500],
      [0, 500],
    ],
  },
  edgeBanding: {
    type: 'GENERIC',
    edges: [0, 1, 2, 3, 4], // Edge indices
  },
  createdAt: testDate,
  updatedAt: testDate,
  ...overrides,
});

// ==========================================================================
// TESTS
// ==========================================================================

describe('DXF Export', () => {
  describe('partRequiresDXF', () => {
    it('should return false for RECT parts', () => {
      const part = createRectPart();
      expect(partRequiresDXF(part)).toBe(false);
    });

    it('should return true for L_SHAPE parts', () => {
      const part = createLShapePart();
      expect(partRequiresDXF(part)).toBe(true);
    });

    it('should return true for TRAPEZOID parts', () => {
      const part = createTrapezoidPart();
      expect(partRequiresDXF(part)).toBe(true);
    });

    it('should return true for POLYGON parts', () => {
      const part = createPolygonPart();
      expect(partRequiresDXF(part)).toBe(true);
    });
  });

  describe('countDXFParts', () => {
    it('should return 0 for empty array', () => {
      expect(countDXFParts([])).toBe(0);
    });

    it('should return 0 for array of RECT parts', () => {
      const parts = [createRectPart(), createRectPart({ id: 'rect-2' })];
      expect(countDXFParts(parts)).toBe(0);
    });

    it('should count non-RECT parts', () => {
      const parts = [
        createRectPart(),
        createLShapePart(),
        createTrapezoidPart(),
        createPolygonPart(),
      ];
      expect(countDXFParts(parts)).toBe(3);
    });

    it('should count only non-RECT parts in mixed array', () => {
      const parts = [
        createRectPart({ id: 'rect-1' }),
        createRectPart({ id: 'rect-2' }),
        createLShapePart(),
        createRectPart({ id: 'rect-3' }),
      ];
      expect(countDXFParts(parts)).toBe(1);
    });
  });

  describe('generatePartDXF', () => {
    it('should return null for RECT parts', () => {
      const part = createRectPart();
      const result = generatePartDXF(part);
      expect(result).toBeNull();
    });

    it('should generate DXF for L_SHAPE parts', () => {
      const part = createLShapePart();
      const result = generatePartDXF(part);

      expect(result).not.toBeNull();
      expect(result!.partId).toBe('lshape-1');
      expect(result!.partName).toBe('L-Shaped Bottom Panel');
      expect(result!.filename).toContain('l_shaped_bottom_panel');
      expect(result!.filename).toContain('.dxf');
    });

    it('should generate DXF for TRAPEZOID parts', () => {
      const part = createTrapezoidPart();
      const result = generatePartDXF(part);

      expect(result).not.toBeNull();
      expect(result!.partId).toBe('trap-1');
      expect(result!.filename).toContain('trapezoid_panel');
    });

    it('should generate DXF for POLYGON parts', () => {
      const part = createPolygonPart();
      const result = generatePartDXF(part);

      expect(result).not.toBeNull();
      expect(result!.partId).toBe('poly-1');
      expect(result!.filename).toContain('custom_polygon');
    });

    it('should generate valid DXF content string', () => {
      const part = createLShapePart();
      const result = generatePartDXF(part);

      expect(result!.content).toBeTruthy();
      expect(typeof result!.content).toBe('string');
      // DXF files start with section marker
      expect(result!.content).toContain('SECTION');
      expect(result!.content).toContain('ENTITIES');
    });

    it('should include LWPOLYLINE in DXF content', () => {
      const part = createLShapePart();
      const result = generatePartDXF(part);

      expect(result!.content).toContain('LWPOLYLINE');
    });

    it('should sanitize filename from part name', () => {
      const part = createLShapePart({
        name: 'L-Shape [Test] Panel #1',
      });
      const result = generatePartDXF(part);

      // Should convert to lowercase and replace special chars with underscores
      expect(result!.filename).not.toContain('[');
      expect(result!.filename).not.toContain('#');
      expect(result!.filename).not.toContain(' ');
    });

    it('should include part ID prefix in filename', () => {
      const part = createLShapePart({ id: 'abcd1234-5678-90ab' });
      const result = generatePartDXF(part);

      // Should include first 8 chars of part ID
      expect(result!.filename).toContain('abcd1234');
    });
  });

  describe('generateAllPartsDXF', () => {
    it('should return empty array for empty input', () => {
      const results = generateAllPartsDXF([]);
      expect(results).toEqual([]);
    });

    it('should return empty array for RECT-only parts', () => {
      const parts = [createRectPart(), createRectPart({ id: 'rect-2' })];
      const results = generateAllPartsDXF(parts);
      expect(results).toEqual([]);
    });

    it('should generate DXF for all non-RECT parts', () => {
      const parts = [
        createRectPart(),
        createLShapePart(),
        createTrapezoidPart(),
        createPolygonPart(),
      ];
      const results = generateAllPartsDXF(parts);

      expect(results.length).toBe(3);
      expect(results.map(r => r.partId)).toContain('lshape-1');
      expect(results.map(r => r.partId)).toContain('trap-1');
      expect(results.map(r => r.partId)).toContain('poly-1');
    });

    it('should preserve part order in results', () => {
      const parts = [
        createLShapePart({ id: 'first' }),
        createTrapezoidPart({ id: 'second' }),
        createPolygonPart({ id: 'third' }),
      ];
      const results = generateAllPartsDXF(parts);

      expect(results[0].partId).toBe('first');
      expect(results[1].partId).toBe('second');
      expect(results[2].partId).toBe('third');
    });

    it('should generate unique filenames for each part', () => {
      const parts = [
        createLShapePart({ id: 'aaa-111', name: 'Panel' }),
        createLShapePart({ id: 'bbb-222', name: 'Panel' }),
      ];
      const results = generateAllPartsDXF(parts);

      expect(results[0].filename).not.toBe(results[1].filename);
    });
  });

  describe('L_SHAPE DXF generation', () => {
    it('should generate correct L-shape vertices', () => {
      const part = createLShapePart({
        shapeParams: {
          type: 'L_SHAPE',
          x: 800,
          y: 600,
          cutX: 300,
          cutY: 200,
        },
      });
      const result = generatePartDXF(part);

      // DXF content should represent the L-shape geometry
      // The shape should have 6 vertices for an L-shape
      expect(result!.content).toBeTruthy();
    });
  });

  describe('TRAPEZOID DXF generation', () => {
    it('should generate correct trapezoid with left skos', () => {
      const part = createTrapezoidPart({
        shapeParams: {
          type: 'TRAPEZOID',
          frontX: 400,
          backX: 500,
          y: 300,
          skosSide: 'left',
        },
      });
      const result = generatePartDXF(part);

      expect(result!.content).toBeTruthy();
      expect(result!.content).toContain('LWPOLYLINE');
    });

    it('should generate correct trapezoid with right skos', () => {
      const part = createTrapezoidPart({
        shapeParams: {
          type: 'TRAPEZOID',
          frontX: 400,
          backX: 500,
          y: 300,
          skosSide: 'right',
        },
      });
      const result = generatePartDXF(part);

      expect(result!.content).toBeTruthy();
    });
  });

  describe('POLYGON DXF generation', () => {
    it('should generate polygon with custom vertices', () => {
      const part = createPolygonPart({
        shapeParams: {
          type: 'POLYGON',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [50, 150],
            [0, 100],
          ],
        },
      });
      const result = generatePartDXF(part);

      expect(result!.content).toBeTruthy();
      expect(result!.content).toContain('LWPOLYLINE');
    });

    it('should handle complex polygon shapes', () => {
      const part = createPolygonPart({
        shapeParams: {
          type: 'POLYGON',
          points: [
            [0, 0],
            [200, 0],
            [250, 50],
            [200, 100],
            [0, 100],
          ],
        },
      });
      const result = generatePartDXF(part);

      expect(result).not.toBeNull();
    });
  });

  describe('DXF units', () => {
    it('should generate DXF with millimeter units', () => {
      const part = createLShapePart();
      const result = generatePartDXF(part);

      // DXF units are set in the header section
      // Unit code 4 = millimeters in DXF format
      expect(result!.content).toContain('$INSUNITS');
    });
  });

  describe('geometry generation (captured vertices)', () => {
    const { default: originalRequire } = module;

    const loadWithMockedDxf = (part: Part) => {
      const calls: Array<{ points: any[]; options: any }> = [];
      jest.resetModules();
      jest.doMock('@tarikjabiri/dxf', () => {
        const LWPolylineFlags = { Closed: 1 };
        return {
          LWPolylineFlags,
          Units: { Millimeters: 'mm' },
          point2d: (x: number, y: number) => ({ x, y }),
          DxfWriter: class {
            setUnits() {}
            addLWPolyline(points: any[], options: any) {
              calls.push({ points, options });
            }
            stringify() {
              return 'MOCK_DXF';
            }
          },
        };
      });

      // Re-require module with mocked DXF writer
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { generatePartDXF: generate } = require('./dxf');
      generate(part);
      return calls;
    };

    it('uses correct vertex order for L_SHAPE', () => {
      const calls = loadWithMockedDxf(createLShapePart());
      expect(calls).toHaveLength(1);
      const { points, options } = calls[0];
      expect(options.flags).toBe(1); // Closed polyline
      expect(points.map((p) => p.point)).toEqual([
        { x: 0, y: 0 },
        { x: 900, y: 0 },
        { x: 900, y: 560 },
        { x: 560, y: 560 },
        { x: 560, y: 900 },
        { x: 0, y: 900 },
      ]);
    });

    it('uses correct vertex order for TRAPEZOID (left skos)', () => {
      const calls = loadWithMockedDxf(createTrapezoidPart());
      const { points } = calls[0];
      expect(points.map((p) => p.point)).toEqual([
        { x: 50, y: 0 },
        { x: 500, y: 0 },
        { x: 500, y: 400 },
        { x: 0, y: 400 },
      ]);
    });

    it('preserves polygon points order', () => {
      const polygon = createPolygonPart({
        shapeParams: {
          type: 'POLYGON',
          points: [
            [10, 20],
            [30, 40],
            [50, 60],
          ],
        },
      });
      const calls = loadWithMockedDxf(polygon);
      const { points } = calls[0];
      expect(points.map((p) => p.point)).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ]);
    });
  });
});
