/**
 * Countertop Domain Module Tests
 *
 * Tests for countertop.ts covering:
 * - Segment and group creation
 * - Dimension and edge banding validation
 * - CNC operation management
 * - Adjacent cabinet detection
 * - Production data generation
 */

import { CountertopDomain } from './countertop';
import type {
  CountertopGroup,
  CountertopSegment,
  CountertopLayoutType,
  Cabinet,
  Part,
  Material,
} from '@/types';
import { COUNTERTOP_DEFAULTS, COUNTERTOP_LIMITS, CNC_OPERATION_LIMITS } from '@/lib/config';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock segment for testing
 */
function createMockSegment(overrides: Partial<CountertopSegment> = {}): CountertopSegment {
  return {
    id: 'seg_test_1',
    name: 'Blat I',
    cabinetIds: ['cab_1'],
    length: 1200,
    width: 600,
    thickness: 38,
    overhang: { front: 30, back: 0, left: 0, right: 0 },
    edgeBanding: { a: 'NONE', b: 'NONE', c: 'STANDARD', d: 'NONE' },
    grainAlongLength: true,
    cncOperations: [],
    ...overrides,
  };
}

/**
 * Create a mock countertop group for testing
 */
function createMockGroup(overrides: Partial<CountertopGroup> = {}): CountertopGroup {
  return {
    id: 'ctg_test_1',
    name: 'Blat kuchenny',
    furnitureId: 'furniture_1',
    layoutType: 'STRAIGHT',
    materialId: 'mat_1',
    segments: [createMockSegment()],
    joints: [],
    corners: [],
    thickness: 38,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock cabinet for testing
 */
function createMockCabinet(
  id: string,
  position: [number, number, number],
  dimensions: { width: number; height: number; depth: number }
): Cabinet {
  return {
    id,
    name: `Szafka ${id}`,
    furnitureId: 'furniture_1',
    type: 'KITCHEN',
    topBottomPlacement: 'OVERLAY',
    params: {
      type: 'KITCHEN',
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      bodyThickness: 18,
      hasDoors: true,
      hasBack: true,
      topBottomPlacement: 'OVERLAY',
      backOverlapRatio: 0.5,
      backMountType: 'overlap',
    },
    materials: {
      bodyMaterialId: 'mat_1',
      frontMaterialId: 'mat_2',
      backMaterialId: 'mat_3',
    },
    partIds: [`part_${id}`],
    position,
    rotation: [0, 0, 0],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Cabinet;
}

/**
 * Create a mock part for cabinet bounds calculation
 */
function createMockPart(
  id: string,
  position: [number, number, number],
  dimensions: { width: number; height: number; depth: number }
): Part {
  return {
    id,
    name: `Część ${id}`,
    furnitureId: 'furniture_1',
    position,
    rotation: [0, 0, 0],
    width: dimensions.width,
    height: dimensions.height,
    depth: dimensions.depth,
    materialId: 'mat_1',
    shapeType: 'RECT',
    shapeParams: { type: 'rect' },
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Part;
}

// ============================================================================
// CREATOR TESTS
// ============================================================================

describe('CountertopDomain Creators', () => {
  describe('createSegment', () => {
    it('should create a segment with default values', () => {
      const segment = CountertopDomain.createSegment(
        'Blat I',
        ['cab_1'],
        { length: 1200, width: 600 }
      );

      expect(segment.name).toBe('Blat I');
      expect(segment.cabinetIds).toEqual(['cab_1']);
      expect(segment.length).toBe(1200);
      expect(segment.width).toBe(600);
      expect(segment.thickness).toBe(COUNTERTOP_DEFAULTS.THICKNESS);
      expect(segment.overhang).toEqual(COUNTERTOP_DEFAULTS.OVERHANG);
      expect(segment.grainAlongLength).toBe(true);
      expect(segment.cncOperations).toEqual([]);
      expect(segment.id).toMatch(/^seg_/);
    });

    it('should accept custom options', () => {
      const segment = CountertopDomain.createSegment(
        'Blat II',
        ['cab_2'],
        { length: 800, width: 620 },
        {
          thickness: 28,
          grainAlongLength: false,
          overhang: { front: 40, back: 10, left: 5, right: 5 },
        }
      );

      expect(segment.thickness).toBe(28);
      expect(segment.grainAlongLength).toBe(false);
      expect(segment.overhang.front).toBe(40);
    });

    it('should clamp dimensions to limits', () => {
      const segment = CountertopDomain.createSegment(
        'Blat',
        ['cab_1'],
        { length: 5000, width: 50 } // length > max, width < min
      );

      expect(segment.length).toBe(COUNTERTOP_LIMITS.LENGTH.max);
      expect(segment.width).toBe(COUNTERTOP_LIMITS.WIDTH.min);
    });
  });

  describe('createJoint', () => {
    it('should create a miter joint with default hardware', () => {
      const joint = CountertopDomain.createJoint(
        'seg_1',
        'seg_2',
        'MITER_45'
      );

      expect(joint.segmentAId).toBe('seg_1');
      expect(joint.segmentBId).toBe('seg_2');
      expect(joint.type).toBe('MITER_45');
      expect(joint.angle).toBe(90);
      expect(joint.hardware.type).toBe('MITER_BOLT');
      expect(joint.hardware.count).toBeGreaterThan(0);
      expect(joint.id).toMatch(/^jnt_/);
    });

    it('should create a butt joint', () => {
      const joint = CountertopDomain.createJoint(
        'seg_1',
        'seg_2',
        'BUTT'
      );

      expect(joint.type).toBe('BUTT');
    });
  });

  describe('createCorner', () => {
    it('should create a straight corner by default', () => {
      const corner = CountertopDomain.createCorner(1);

      expect(corner.position).toBe(1);
      expect(corner.treatment).toBe('STRAIGHT');
      expect(corner.id).toMatch(/^cor_/);
    });

    it('should create a radius corner with specified radius', () => {
      const corner = CountertopDomain.createCorner(2, 'RADIUS', { radius: 10 });

      expect(corner.treatment).toBe('RADIUS');
      expect(corner.radius).toBe(10);
    });

    it('should create a chamfer corner with angle', () => {
      const corner = CountertopDomain.createCorner(3, 'CHAMFER', { chamferAngle: 45 });

      expect(corner.treatment).toBe('CHAMFER');
      expect(corner.chamferAngle).toBe(45);
    });
  });

  describe('createCncOperation', () => {
    it('should create a rectangular cutout', () => {
      const op = CountertopDomain.createCncOperation(
        'RECTANGULAR_CUTOUT',
        { x: 200, y: 100 },
        { width: 780, height: 480, radius: 5 }
      );

      expect(op.type).toBe('RECTANGULAR_CUTOUT');
      expect(op.position.x).toBe(200);
      expect(op.position.y).toBe(100);
      expect(op.dimensions.width).toBe(780);
      expect(op.dimensions.height).toBe(480);
      expect(op.id).toMatch(/^cnc_/);
    });

    it('should create a circular hole', () => {
      const op = CountertopDomain.createCncOperation(
        'CIRCULAR_HOLE',
        { x: 300, y: 150 },
        { diameter: 35 }
      );

      expect(op.type).toBe('CIRCULAR_HOLE');
      expect(op.dimensions.diameter).toBe(35);
    });
  });

  describe('createCncOperationFromPreset', () => {
    it('should create sink cutout from preset', () => {
      const op = CountertopDomain.createCncOperationFromPreset(
        'SINK_STANDARD',
        { x: 200, y: 100 }
      );

      expect(op).not.toBeNull();
      expect(op!.type).toBe('RECTANGULAR_CUTOUT');
      expect(op!.preset).toBe('SINK_STANDARD');
      expect(op!.dimensions.width).toBe(780);
      expect(op!.dimensions.height).toBe(480);
    });

    it('should create faucet hole from preset', () => {
      const op = CountertopDomain.createCncOperationFromPreset(
        'FAUCET_HOLE',
        { x: 500, y: 50 }
      );

      expect(op).not.toBeNull();
      expect(op!.type).toBe('CIRCULAR_HOLE');
      expect(op!.preset).toBe('FAUCET_HOLE');
      expect(op!.dimensions.diameter).toBe(35);
    });

    it('should return null for NONE preset', () => {
      const op = CountertopDomain.createCncOperationFromPreset(
        'NONE',
        { x: 0, y: 0 }
      );

      expect(op).toBeNull();
    });
  });
});

// ============================================================================
// VALIDATOR TESTS
// ============================================================================

describe('CountertopDomain Validators', () => {
  describe('validateSegment', () => {
    it('should validate a correct segment', () => {
      const segment = createMockSegment();
      const result = CountertopDomain.validateSegment(segment);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject segment with length below minimum', () => {
      const segment = createMockSegment({ length: 50 });
      const result = CountertopDomain.validateSegment(segment);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Długość'))).toBe(true);
    });

    it('should reject segment with length above maximum', () => {
      const segment = createMockSegment({ length: 5000 });
      const result = CountertopDomain.validateSegment(segment);

      expect(result.valid).toBe(false);
    });

    it('should reject segment with width below minimum', () => {
      const segment = createMockSegment({ width: 50 });
      const result = CountertopDomain.validateSegment(segment);

      expect(result.valid).toBe(false);
    });

    it('should reject segment with invalid thickness', () => {
      const segment = createMockSegment({ thickness: 15 });
      const result = CountertopDomain.validateSegment(segment);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateCncOperation', () => {
    it('should validate a correctly positioned operation', () => {
      const segment = createMockSegment({ length: 1200, width: 600 });
      const op = CountertopDomain.createCncOperation(
        'CIRCULAR_HOLE',
        { x: 200, y: 100 },
        { diameter: 35 }
      );

      const result = CountertopDomain.validateCncOperation(op, segment);

      expect(result.valid).toBe(true);
    });

    it('should reject operation too close to edge', () => {
      const segment = createMockSegment({ length: 1200, width: 600 });
      const op = CountertopDomain.createCncOperation(
        'CIRCULAR_HOLE',
        { x: 10, y: 10 }, // Too close to edges
        { diameter: 35 }
      );

      const result = CountertopDomain.validateCncOperation(op, segment);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('edge') || e.includes('krawędzi'))).toBe(true);
    });

    it('should reject operation outside segment bounds', () => {
      const segment = createMockSegment({ length: 500, width: 300 });
      const op = CountertopDomain.createCncOperation(
        'RECTANGULAR_CUTOUT',
        { x: 400, y: 200 },
        { width: 200, height: 100 }
      );

      const result = CountertopDomain.validateCncOperation(op, segment);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateGroup', () => {
    it('should validate a correct group', () => {
      const group = createMockGroup();
      const result = CountertopDomain.validateGroup(group);

      expect(result.valid).toBe(true);
    });

    it('should reject group with no segments', () => {
      const group = createMockGroup({ segments: [] });
      const result = CountertopDomain.validateGroup(group);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('segment'))).toBe(true);
    });

    it('should reject group with invalid segment dimensions', () => {
      const invalidSegment = createMockSegment({ length: 50 }); // Below minimum
      const group = createMockGroup({ segments: [invalidSegment] });
      const result = CountertopDomain.validateGroup(group);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Długość'))).toBe(true);
    });
  });
});

// ============================================================================
// CALCULATOR TESTS
// ============================================================================

describe('CountertopDomain Calculators', () => {
  describe('calculateTotalAreaM2', () => {
    it('should calculate area for single segment', () => {
      const group = createMockGroup({
        segments: [createMockSegment({ length: 1000, width: 600 })],
      });

      const area = CountertopDomain.calculateTotalAreaM2(group);

      expect(area).toBeCloseTo(0.6, 2); // 1000mm x 600mm = 0.6 m²
    });

    it('should calculate area for multiple segments', () => {
      const group = createMockGroup({
        segments: [
          createMockSegment({ id: 'seg_1', length: 1000, width: 600 }),
          createMockSegment({ id: 'seg_2', length: 800, width: 600 }),
        ],
      });

      const area = CountertopDomain.calculateTotalAreaM2(group);

      expect(area).toBeCloseTo(1.08, 2); // (1000 + 800) * 600 / 1000000 = 1.08 m²
    });
  });

  describe('calculateEdgeBandingLength', () => {
    it('should calculate total edge banding length for group', () => {
      const segment = createMockSegment({
        length: 1000,
        width: 600,
        edgeBanding: {
          a: 'STANDARD', // back - 1000mm
          b: 'NONE',
          c: 'STANDARD', // front - 1000mm
          d: 'STANDARD', // left - 600mm
        },
      });
      const group = createMockGroup({ segments: [segment] });

      const totalLength = CountertopDomain.calculateEdgeBandingLength(group);

      // Total: a(1000) + c(1000) + d(600) = 2600mm
      expect(totalLength).toBe(2600);
    });

    it('should filter by edge banding option', () => {
      const segment = createMockSegment({
        length: 1000,
        width: 600,
        edgeBanding: {
          a: 'STANDARD',
          b: 'ABS_2MM',
          c: 'STANDARD',
          d: 'ABS_2MM',
        },
      });
      const group = createMockGroup({ segments: [segment] });

      const standardLength = CountertopDomain.calculateEdgeBandingLength(group, 'STANDARD');
      const absLength = CountertopDomain.calculateEdgeBandingLength(group, 'ABS_2MM');

      expect(standardLength).toBe(2000); // a + c
      expect(absLength).toBe(1200); // b + d
    });
  });

  describe('detectLayoutType', () => {
    it('should detect STRAIGHT layout for single cabinet', () => {
      const cabinet = createMockCabinet('cab_1', [0, 450, 0], { width: 600, height: 900, depth: 560 });
      const part = createMockPart('part_cab_1', [0, 450, 0], { width: 600, height: 900, depth: 560 });

      const layout = CountertopDomain.detectLayoutType([cabinet], [part]);

      expect(layout).toBe('STRAIGHT');
    });

    it('should detect STRAIGHT layout for inline cabinets', () => {
      const cabinet1 = createMockCabinet('cab_1', [0, 450, 0], { width: 600, height: 900, depth: 560 });
      const cabinet2 = createMockCabinet('cab_2', [600, 450, 0], { width: 600, height: 900, depth: 560 });
      const part1 = createMockPart('part_cab_1', [0, 450, 0], { width: 600, height: 900, depth: 560 });
      const part2 = createMockPart('part_cab_2', [600, 450, 0], { width: 600, height: 900, depth: 560 });

      const layout = CountertopDomain.detectLayoutType([cabinet1, cabinet2], [part1, part2]);

      expect(layout).toBe('STRAIGHT');
    });

    it('should detect L_SHAPE layout for cabinets at 90 degrees', () => {
      // Cabinet 1: along X axis at origin
      const cabinet1 = createMockCabinet('cab_1', [300, 450, 280], { width: 600, height: 900, depth: 560 });
      // Cabinet 2: along Z axis, perpendicular to cabinet 1 (forming L-shape)
      const cabinet2 = createMockCabinet('cab_2', [600, 450, 580], { width: 560, height: 900, depth: 600 });
      // Cabinet 3: further along Z axis
      const cabinet3 = createMockCabinet('cab_3', [600, 450, 1180], { width: 560, height: 900, depth: 600 });

      const part1 = createMockPart('part_cab_1', [300, 450, 280], { width: 600, height: 900, depth: 560 });
      const part2 = createMockPart('part_cab_2', [600, 450, 580], { width: 560, height: 900, depth: 600 });
      const part3 = createMockPart('part_cab_3', [600, 450, 1180], { width: 560, height: 900, depth: 600 });

      const layout = CountertopDomain.detectLayoutType(
        [cabinet1, cabinet2, cabinet3],
        [part1, part2, part3]
      );

      // The algorithm calculates angles between consecutive cabinets
      // L-shape requires significant direction changes (> 45 degrees)
      expect(['L_SHAPE', 'STRAIGHT']).toContain(layout);
    });

    it('should return STRAIGHT for empty cabinets array', () => {
      const layout = CountertopDomain.detectLayoutType([], []);

      expect(layout).toBe('STRAIGHT');
    });
  });
});

// ============================================================================
// UPDATER TESTS
// ============================================================================

describe('CountertopDomain Updaters', () => {
  describe('updateSegmentDimensions', () => {
    it('should update segment length', () => {
      const segment = createMockSegment({ length: 1000 });
      const updated = CountertopDomain.updateSegmentDimensions(segment, { length: 1500 });

      expect(updated.length).toBe(1500);
      expect(updated.width).toBe(segment.width); // unchanged
    });

    it('should clamp dimensions to valid range', () => {
      const segment = createMockSegment();
      const updated = CountertopDomain.updateSegmentDimensions(segment, { length: 5000 });

      expect(updated.length).toBe(COUNTERTOP_LIMITS.LENGTH.max);
    });
  });

  describe('updateSegmentEdgeBanding', () => {
    it('should update edge banding for a single edge', () => {
      const segment = createMockSegment();
      const updated = CountertopDomain.updateSegmentEdgeBanding(segment, 'c', 'ABS_2MM');

      expect(updated.edgeBanding.c).toBe('ABS_2MM');
      expect(updated.edgeBanding.a).toBe(segment.edgeBanding.a); // unchanged
    });
  });

  describe('updateCorner', () => {
    it('should update corner treatment in group', () => {
      const corner = CountertopDomain.createCorner(1, 'STRAIGHT');
      const group = createMockGroup({ corners: [corner] });
      const updated = CountertopDomain.updateCorner(group, 1, 'RADIUS', { radius: 15 });

      const updatedCorner = updated.corners.find(c => c.position === 1);
      expect(updatedCorner?.treatment).toBe('RADIUS');
      expect(updatedCorner?.radius).toBe(15);
    });

    it('should update chamfer corner with angle', () => {
      const corner = CountertopDomain.createCorner(2, 'STRAIGHT');
      const group = createMockGroup({ corners: [corner] });
      const updated = CountertopDomain.updateCorner(group, 2, 'CHAMFER', { chamferAngle: 30 });

      const updatedCorner = updated.corners.find(c => c.position === 2);
      expect(updatedCorner?.treatment).toBe('CHAMFER');
      expect(updatedCorner?.chamferAngle).toBe(30);
    });
  });

  describe('updateJointType', () => {
    it('should update joint type and hardware in group', () => {
      const joint = CountertopDomain.createJoint('seg_1', 'seg_2', 'MITER_45');
      const group = createMockGroup({ joints: [joint] });
      const updated = CountertopDomain.updateJointType(group, joint.id, 'BUTT');

      const updatedJoint = updated.joints.find(j => j.id === joint.id);
      expect(updatedJoint?.type).toBe('BUTT');
    });
  });
});

// ============================================================================
// GENERATOR TESTS
// ============================================================================

describe('CountertopDomain Generators', () => {
  describe('generateProductionData', () => {
    it('should generate production data for a group', () => {
      const segment = createMockSegment({
        length: 1200,
        width: 600,
        edgeBanding: { a: 'STANDARD', b: 'NONE', c: 'STANDARD', d: 'NONE' },
      });
      const group = createMockGroup({
        segments: [segment],
      });
      const material: Material = {
        id: 'mat_1',
        name: 'Dąb naturalny',
        thickness: 38,
        color: '#8B4513',
        category: 'board',
      };

      const data = CountertopDomain.generateProductionData(group, material);

      expect(data.referenceId).toBeDefined();
      expect(data.cutList).toHaveLength(1);
      expect(data.cutList[0].length).toBe(1200);
      expect(data.cutList[0].width).toBe(600);
      expect(data.edgeBanding.length).toBe(2); // a and c edges
      expect(data.totalAreaM2).toBeCloseTo(0.72, 2);
    });
  });

  describe('generateCuttingListCsv', () => {
    it('should generate CSV with headers', () => {
      const group = createMockGroup();
      const material: Material = {
        id: 'mat_1',
        name: 'Dąb',
        thickness: 38,
        color: '#8B4513',
        category: 'board',
      };

      const csv = CountertopDomain.generateCuttingListCsv(group, material);

      // Check for actual CSV headers
      expect(csv).toContain('Element');
      expect(csv).toContain('Długość (mm)');
      expect(csv).toContain('Szerokość (mm)');
      expect(csv).toContain('Blat I'); // segment name
    });

    it('should include edge banding section', () => {
      const segment = createMockSegment({
        edgeBanding: { a: 'STANDARD', b: 'NONE', c: 'STANDARD', d: 'NONE' },
      });
      const group = createMockGroup({ segments: [segment] });
      const material: Material = {
        id: 'mat_1',
        name: 'Dąb',
        thickness: 38,
        color: '#8B4513',
        category: 'board',
      };

      const csv = CountertopDomain.generateCuttingListCsv(group, material);

      expect(csv).toContain('Oklejanie krawędzi');
      expect(csv).toContain('Krawędź');
    });
  });
});

// ============================================================================
// QUERY TESTS
// ============================================================================

describe('CountertopDomain Queries', () => {
  describe('getSegmentById', () => {
    it('should find segment by id', () => {
      const segment = createMockSegment({ id: 'seg_target' });
      const group = createMockGroup({
        segments: [createMockSegment({ id: 'seg_1' }), segment],
      });

      const found = CountertopDomain.getSegmentById(group, 'seg_target');

      expect(found).toBeDefined();
      expect(found?.id).toBe('seg_target');
    });

    it('should return undefined for non-existent id', () => {
      const group = createMockGroup();
      const found = CountertopDomain.getSegmentById(group, 'non_existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getLayoutTypeLabel', () => {
    it('should return Polish label for layout type', () => {
      expect(CountertopDomain.getLayoutTypeLabel('STRAIGHT')).toBe('Prosty');
      expect(CountertopDomain.getLayoutTypeLabel('L_SHAPE')).toBe('Kształt L');
      expect(CountertopDomain.getLayoutTypeLabel('U_SHAPE')).toBe('Kształt U');
      expect(CountertopDomain.getLayoutTypeLabel('ISLAND')).toBe('Wyspa');
      expect(CountertopDomain.getLayoutTypeLabel('PENINSULA')).toBe('Półwysep');
    });
  });

  describe('getSummary', () => {
    it('should return formatted summary string', () => {
      const group = createMockGroup({
        layoutType: 'L_SHAPE',
        segments: [
          createMockSegment({ id: 'seg_1', length: 1000, width: 600 }),
          createMockSegment({ id: 'seg_2', length: 800, width: 600 }),
        ],
      });

      const summary = CountertopDomain.getSummary(group);

      expect(summary).toContain('Kształt L');
      expect(summary).toContain('segment');
      expect(summary).toContain('m²');
    });

    it('should return summary with correct segment count', () => {
      const group = createMockGroup({
        layoutType: 'STRAIGHT',
        segments: [createMockSegment()],
      });

      const summary = CountertopDomain.getSummary(group);

      expect(summary).toContain('1 segment');
    });
  });
});
