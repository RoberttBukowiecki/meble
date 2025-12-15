/**
 * Tests for OBB (Oriented Bounding Box) utilities
 */

import type { Part } from '@/types';
import {
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Dot,
  vec3Length,
  vec3Normalize,
  vec3Distance,
  rotatePoint,
  getRotationAxes,
  createOBBFromPart,
  createOBBFromParts,
  getPartCorners,
  getOBBFaces,
  getOBBEdges,
  calculateFaceToFaceDistance,
  canFacesSnap,
  calculateFaceSnapOffset,
  getOBBBoundingSphereRadius,
  areOBBsWithinSnapRange,
} from './obb';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestPart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'test-part',
    name: 'Test Part',
    furnitureId: 'furniture-1',
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: 0, y: 0 },
    width: 100,
    height: 200,
    depth: 50,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    materialId: 'mat-1',
    edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Vector Math Tests
// ============================================================================

describe('Vector Math Utilities', () => {
  describe('vec3Add', () => {
    it('adds two vectors correctly', () => {
      expect(vec3Add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    });

    it('handles negative numbers', () => {
      expect(vec3Add([1, 2, 3], [-1, -2, -3])).toEqual([0, 0, 0]);
    });
  });

  describe('vec3Sub', () => {
    it('subtracts two vectors correctly', () => {
      expect(vec3Sub([5, 7, 9], [1, 2, 3])).toEqual([4, 5, 6]);
    });
  });

  describe('vec3Scale', () => {
    it('scales vector by scalar', () => {
      expect(vec3Scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
    });

    it('handles zero scale', () => {
      expect(vec3Scale([1, 2, 3], 0)).toEqual([0, 0, 0]);
    });
  });

  describe('vec3Dot', () => {
    it('calculates dot product correctly', () => {
      expect(vec3Dot([1, 0, 0], [1, 0, 0])).toBe(1);
      expect(vec3Dot([1, 0, 0], [0, 1, 0])).toBe(0);
      expect(vec3Dot([1, 0, 0], [-1, 0, 0])).toBe(-1);
    });
  });

  describe('vec3Length', () => {
    it('calculates length correctly', () => {
      expect(vec3Length([3, 4, 0])).toBe(5);
      expect(vec3Length([0, 0, 0])).toBe(0);
    });
  });

  describe('vec3Normalize', () => {
    it('normalizes non-zero vectors', () => {
      const result = vec3Normalize([3, 0, 0]);
      expect(result).toEqual([1, 0, 0]);
    });

    it('handles zero vector', () => {
      expect(vec3Normalize([0, 0, 0])).toEqual([0, 0, 0]);
    });
  });

  describe('vec3Distance', () => {
    it('calculates distance correctly', () => {
      expect(vec3Distance([0, 0, 0], [3, 4, 0])).toBe(5);
    });
  });
});

// ============================================================================
// Rotation Tests
// ============================================================================

describe('Rotation Utilities', () => {
  describe('rotatePoint', () => {
    it('returns original point with no rotation', () => {
      const result = rotatePoint([1, 2, 3], [0, 0, 0]);
      expect(result[0]).toBeCloseTo(1);
      expect(result[1]).toBeCloseTo(2);
      expect(result[2]).toBeCloseTo(3);
    });

    it('rotates 90 degrees around Y axis', () => {
      const result = rotatePoint([1, 0, 0], [0, Math.PI / 2, 0]);
      expect(result[0]).toBeCloseTo(0);
      expect(result[1]).toBeCloseTo(0);
      expect(result[2]).toBeCloseTo(-1);
    });
  });

  describe('getRotationAxes', () => {
    it('returns identity axes with no rotation', () => {
      const axes = getRotationAxes([0, 0, 0]);
      expect(axes[0]).toEqual([1, 0, 0]);
      expect(axes[1]).toEqual([0, 1, 0]);
      expect(axes[2]).toEqual([0, 0, 1]);
    });
  });
});

// ============================================================================
// OBB Creation Tests
// ============================================================================

describe('OBB Creation', () => {
  describe('createOBBFromPart', () => {
    it('creates OBB from a simple part', () => {
      const part = createTestPart();
      const obb = createOBBFromPart(part);

      expect(obb.center).toEqual([0, 0, 0]);
      expect(obb.halfExtents).toEqual([50, 100, 25]);
      expect(obb.rotation).toEqual([0, 0, 0]);
    });

    it('preserves part position in OBB center', () => {
      const part = createTestPart({ position: [100, 200, 300] });
      const obb = createOBBFromPart(part);

      expect(obb.center).toEqual([100, 200, 300]);
    });

    it('preserves part rotation in OBB', () => {
      const rotation: [number, number, number] = [0, Math.PI / 2, 0];
      const part = createTestPart({ rotation });
      const obb = createOBBFromPart(part);

      expect(obb.rotation).toEqual(rotation);
    });
  });

  describe('createOBBFromParts', () => {
    it('creates OBB from single part', () => {
      const part = createTestPart();
      const obb = createOBBFromParts([part]);

      expect(obb.center).toEqual([0, 0, 0]);
    });

    it('creates OBB from multiple parts', () => {
      const part1 = createTestPart({ id: 'part-1', position: [-50, 0, 0] });
      const part2 = createTestPart({ id: 'part-2', position: [50, 0, 0] });
      const obb = createOBBFromParts([part1, part2]);

      // Center should be between the two parts
      expect(obb.center[0]).toBeCloseTo(0);
    });

    it('returns empty OBB for empty parts array', () => {
      const obb = createOBBFromParts([]);

      expect(obb.center).toEqual([0, 0, 0]);
      expect(obb.halfExtents).toEqual([0, 0, 0]);
    });
  });
});

// ============================================================================
// Part Corners Tests
// ============================================================================

describe('getPartCorners', () => {
  it('returns 8 corners for a part', () => {
    const part = createTestPart();
    const corners = getPartCorners(part);

    expect(corners).toHaveLength(8);
  });

  it('corners span the correct dimensions', () => {
    const part = createTestPart({
      width: 100,
      height: 200,
      depth: 50,
      position: [0, 0, 0],
    });
    const corners = getPartCorners(part);

    // Find min/max for each axis
    const minX = Math.min(...corners.map((c) => c[0]));
    const maxX = Math.max(...corners.map((c) => c[0]));
    const minY = Math.min(...corners.map((c) => c[1]));
    const maxY = Math.max(...corners.map((c) => c[1]));
    const minZ = Math.min(...corners.map((c) => c[2]));
    const maxZ = Math.max(...corners.map((c) => c[2]));

    expect(maxX - minX).toBeCloseTo(100); // width
    expect(maxY - minY).toBeCloseTo(200); // height
    expect(maxZ - minZ).toBeCloseTo(50); // depth
  });
});

// ============================================================================
// OBB Faces Tests
// ============================================================================

describe('getOBBFaces', () => {
  it('returns 6 faces for an OBB', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const faces = getOBBFaces(obb);

    expect(faces).toHaveLength(6);
  });

  it('faces have outward-pointing normals', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const faces = getOBBFaces(obb);

    // Check that normals are unit vectors
    for (const face of faces) {
      const length = vec3Length(face.normal);
      expect(length).toBeCloseTo(1);
    }
  });

  it('each face has 4 corners', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const faces = getOBBFaces(obb);

    for (const face of faces) {
      expect(face.corners).toHaveLength(4);
    }
  });
});

// ============================================================================
// OBB Edges Tests
// ============================================================================

describe('getOBBEdges', () => {
  it('returns 12 edges for an OBB', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const edges = getOBBEdges(obb);

    expect(edges).toHaveLength(12);
  });

  it('edges have normalized direction vectors', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const edges = getOBBEdges(obb);

    for (const edge of edges) {
      const length = vec3Length(edge.direction);
      expect(length).toBeCloseTo(1);
    }
  });
});

// ============================================================================
// Face Distance Tests
// ============================================================================

describe('calculateFaceToFaceDistance', () => {
  it('returns distance for opposite-facing faces', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [200, 0, 0] }); // 200mm apart

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    const faces1 = getOBBFaces(obb1);
    const faces2 = getOBBFaces(obb2);

    // Find +X face of part1 and -X face of part2
    const face1PlusX = faces1.find((f) => f.axisIndex === 0 && f.sign === 1)!;
    const face2MinusX = faces2.find((f) => f.axisIndex === 0 && f.sign === -1)!;

    const distance = calculateFaceToFaceDistance(face1PlusX, face2MinusX);

    // Distance should be 200 - 50 - 50 = 100 (parts are 100mm wide each, half-extent 50)
    expect(distance).toBeCloseTo(100);
  });

  it('returns null for non-opposite-facing faces', () => {
    const part = createTestPart();
    const obb = createOBBFromPart(part);
    const faces = getOBBFaces(obb);

    // Same-direction faces can't snap
    const face1 = faces.find((f) => f.axisIndex === 0 && f.sign === 1)!;
    const face2 = faces.find((f) => f.axisIndex === 1 && f.sign === 1)!;

    const distance = calculateFaceToFaceDistance(face1, face2);
    expect(distance).toBeNull();
  });
});

describe('canFacesSnap', () => {
  it('returns true when faces are within snap range', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [110, 0, 0] }); // 10mm gap

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    const faces1 = getOBBFaces(obb1);
    const faces2 = getOBBFaces(obb2);

    const face1PlusX = faces1.find((f) => f.axisIndex === 0 && f.sign === 1)!;
    const face2MinusX = faces2.find((f) => f.axisIndex === 0 && f.sign === -1)!;

    expect(canFacesSnap(face1PlusX, face2MinusX, 20)).toBe(true);
  });

  it('returns false when faces are too far apart', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [200, 0, 0] }); // 100mm gap

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    const faces1 = getOBBFaces(obb1);
    const faces2 = getOBBFaces(obb2);

    const face1PlusX = faces1.find((f) => f.axisIndex === 0 && f.sign === 1)!;
    const face2MinusX = faces2.find((f) => f.axisIndex === 0 && f.sign === -1)!;

    expect(canFacesSnap(face1PlusX, face2MinusX, 20)).toBe(false);
  });
});

// ============================================================================
// Snap Offset Tests
// ============================================================================

describe('calculateFaceSnapOffset', () => {
  it('calculates offset to close gap between faces', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [110, 0, 0] }); // 10mm gap

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    const faces1 = getOBBFaces(obb1);
    const faces2 = getOBBFaces(obb2);

    const face1PlusX = faces1.find((f) => f.axisIndex === 0 && f.sign === 1)!;
    const face2MinusX = faces2.find((f) => f.axisIndex === 0 && f.sign === -1)!;

    const offset = calculateFaceSnapOffset(face1PlusX, face2MinusX, 1);

    // Offset should move part1 toward part2 (positive X direction)
    // Gap is 10mm, collision offset is 1mm, so move 9mm
    expect(offset[0]).toBeCloseTo(9);
    expect(offset[1]).toBeCloseTo(0);
    expect(offset[2]).toBeCloseTo(0);
  });
});

// ============================================================================
// Bounding Sphere Tests
// ============================================================================

describe('getOBBBoundingSphereRadius', () => {
  it('calculates correct bounding sphere radius', () => {
    const part = createTestPart({
      width: 100,
      height: 200,
      depth: 50,
    });
    const obb = createOBBFromPart(part);
    const radius = getOBBBoundingSphereRadius(obb);

    // Half extents are [50, 100, 25]
    // Radius = sqrt(50^2 + 100^2 + 25^2) = sqrt(2500 + 10000 + 625) = sqrt(13125) ≈ 114.56
    expect(radius).toBeCloseTo(Math.sqrt(50 * 50 + 100 * 100 + 25 * 25));
  });
});

describe('areOBBsWithinSnapRange', () => {
  it('returns true for nearby OBBs', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [150, 0, 0] });

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    expect(areOBBsWithinSnapRange(obb1, obb2, 100)).toBe(true);
  });

  it('returns false for distant OBBs', () => {
    const part1 = createTestPart({ position: [0, 0, 0] });
    const part2 = createTestPart({ position: [1000, 0, 0] });

    const obb1 = createOBBFromPart(part1);
    const obb2 = createOBBFromPart(part2);

    expect(areOBBsWithinSnapRange(obb1, obb2, 20)).toBe(false);
  });
});
