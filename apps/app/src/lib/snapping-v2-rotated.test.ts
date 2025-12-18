/**
 * Tests for Snap V2 Engine - Rotated Parts
 *
 * Tests snapping behavior for parts with non-trivial rotations.
 * This addresses the issue where snapping doesn't work as expected
 * for rotated parts due to face positions and distance thresholds.
 */

import type { Part, SnapSettings } from '@/types';
import {
  calculateSnapV2Simple,
  calculatePartSnapV2,
} from './snapping-v2';
import { calculatePartGroupBounds } from './group-bounds';
import { getOBBFaces, createOBBFromPart, type Vec3 } from './obb';

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

function createDefaultSnapSettings(overrides: Partial<SnapSettings> = {}): SnapSettings {
  return {
    distance: 20,
    showGuides: true,
    magneticPull: false,
    strengthCurve: 'linear',
    edgeSnap: true,
    faceSnap: true,
    tJointSnap: true,
    collisionOffset: 1,
    version: 'v2',
    ...overrides,
  };
}

// ============================================================================
// Rotated Parts Scenario Tests
// ============================================================================

describe('Snap V2 - Rotated Parts', () => {
  describe('User scenario: two rotated flat parts', () => {
    // Exact scenario from user's bug report:
    // Part1: 600x400x18, rotation [-π/2, 0, 0], position [-241.24, 9, 0]
    // Part2: 600x400x18, rotation [-π/2, π/2, 0], position [70.5, 9, 0]

    const part1 = createTestPart({
      id: 'part1-moving',
      name: 'To przesuwam X',
      width: 600,
      height: 400,
      depth: 18,
      position: [-241.24, 9, 0],
      rotation: [-Math.PI / 2, 0, 0],
    });

    const part2 = createTestPart({
      id: 'part2-target',
      name: 'Do tego przesuwam',
      width: 600,
      height: 400,
      depth: 18,
      position: [70.5, 9, 0],
      rotation: [-Math.PI / 2, Math.PI / 2, 0],
    });

    it('correctly calculates Part1 face positions with rotation [-π/2, 0, 0]', () => {
      const obb = createOBBFromPart(part1);
      const faces = getOBBFaces(obb);

      // +X face (right side) should be at center.x + 300 = 58.76
      const plusXFace = faces.find(f => f.axisIndex === 0 && f.sign === 1);
      expect(plusXFace).toBeDefined();
      expect(plusXFace!.center[0]).toBeCloseTo(58.76, 1);
      expect(plusXFace!.normal).toEqual([1, 0, 0]);
    });

    it('correctly calculates Part2 face positions with rotation [-π/2, π/2, 0]', () => {
      const obb = createOBBFromPart(part2);
      const faces = getOBBFaces(obb);

      // Local Y axis becomes world [-1, 0, 0] after rotation
      // +Y face (local "top") is at center + axis * halfExtent
      // = [70.5, 9, 0] + [-1, 0, 0] * 200 = [-129.5, 9, 0]
      const plusYFace = faces.find(f => f.axisIndex === 1 && f.sign === 1);
      expect(plusYFace).toBeDefined();
      expect(plusYFace!.center[0]).toBeCloseTo(-129.5, 1);
      // Normal should be [-1, 0, 0]
      expect(plusYFace!.normal[0]).toBeCloseTo(-1, 5);
      expect(plusYFace!.normal[1]).toBeCloseTo(0, 5);
      expect(plusYFace!.normal[2]).toBeCloseTo(0, 5);
    });

    it('identifies why X-axis snap fails: distance is 188mm, threshold is 20mm', () => {
      // Part1's +X face is at x=58.76
      // Part2's +Y face (with normal [-1,0,0]) is at x=-129.5
      // These are the faces that should snap (opposite normals)

      const part1Obb = createOBBFromPart(part1);
      const part2Obb = createOBBFromPart(part2);

      const part1Faces = getOBBFaces(part1Obb);
      const part2Faces = getOBBFaces(part2Obb);

      const part1RightFace = part1Faces.find(f => f.axisIndex === 0 && f.sign === 1);
      const part2LeftFace = part2Faces.find(f => f.axisIndex === 1 && f.sign === 1); // +Y has normal [-1,0,0]

      // Verify normals are opposite
      const dotProduct =
        part1RightFace!.normal[0] * part2LeftFace!.normal[0] +
        part1RightFace!.normal[1] * part2LeftFace!.normal[1] +
        part1RightFace!.normal[2] * part2LeftFace!.normal[2];

      expect(dotProduct).toBeCloseTo(-1, 5); // Opposite normals

      // Calculate distance between face centers along X
      const distance = Math.abs(part1RightFace!.center[0] - part2LeftFace!.center[0]);
      expect(distance).toBeCloseTo(188.26, 1);

      // This explains why snap doesn't work: 188mm >> 20mm threshold
      expect(distance).toBeGreaterThan(20);
    });

    it('does NOT snap when parts are at original positions (distance 188mm > threshold 20mm)', () => {
      const movingGroup = calculatePartGroupBounds(part1);
      const targetGroup = calculatePartGroupBounds(part2);

      const result = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'X',
        createDefaultSnapSettings({ distance: 20 })
      );

      // No snap because faces are 188mm apart, threshold is 20mm
      expect(result.snapped).toBe(false);
    });

    it('DOES snap when snap distance is increased to 200mm', () => {
      const movingGroup = calculatePartGroupBounds(part1);
      const targetGroup = calculatePartGroupBounds(part2);

      const result = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'X',
        createDefaultSnapSettings({ distance: 200 }) // Increased threshold
      );

      expect(result.snapped).toBe(true);
      // Snap offset should move Part1 leftward to close the 188mm gap
      expect(result.offset).toBeLessThan(0); // Negative = move left
      expect(result.offset).toBeCloseTo(-187.26, 0); // Gap minus collision offset
    });

    it('DOES snap when Part1 is moved closer (within 20mm of target face)', () => {
      // Move Part1 to x=-410 so its +X face is at x=-110
      // Then distance to Part2's +Y face (at -129.5) is 19.5mm < 20mm
      const movedPart1 = createTestPart({
        ...part1,
        position: [-410, 9, 0],
      });

      const movingGroup = calculatePartGroupBounds(movedPart1);
      const targetGroup = calculatePartGroupBounds(part2);

      const result = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'X',
        createDefaultSnapSettings({ distance: 20 })
      );

      expect(result.snapped).toBe(true);
    });

    it('has valid Y-axis snap candidates (18mm distance) that are filtered when dragging X', () => {
      // Part1 and Part2 have horizontal faces (after X rotation) at y=0 and y=18
      // These faces are only 18mm apart vertically, within snap range

      // But when dragging along X, Y-axis snaps should be filtered out
      const movingGroup = calculatePartGroupBounds(part1);
      const targetGroup = calculatePartGroupBounds(part2);

      // Try snapping on Y axis - should find the close vertical faces
      const yResult = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'Y',
        createDefaultSnapSettings({ distance: 20 })
      );

      // Y-axis snapping should work (faces are 18mm apart)
      expect(yResult.snapped).toBe(true);

      // X-axis snapping should NOT work (X-aligned faces are 188mm apart)
      const xResult = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'X',
        createDefaultSnapSettings({ distance: 20 })
      );

      expect(xResult.snapped).toBe(false);
    });
  });

  describe('rotation math verification', () => {
    it('correctly transforms axes for rotation [-π/2, 0, 0]', () => {
      const part = createTestPart({
        rotation: [-Math.PI / 2, 0, 0],
      });

      const obb = createOBBFromPart(part);

      // X axis stays [1, 0, 0]
      expect(obb.axes[0][0]).toBeCloseTo(1, 5);
      expect(obb.axes[0][1]).toBeCloseTo(0, 5);
      expect(obb.axes[0][2]).toBeCloseTo(0, 5);

      // Y axis becomes [0, 0, -1] (points toward -Z) with -π/2 rotation
      expect(obb.axes[1][0]).toBeCloseTo(0, 5);
      expect(obb.axes[1][1]).toBeCloseTo(0, 5);
      expect(obb.axes[1][2]).toBeCloseTo(-1, 5);

      // Z axis becomes [0, 1, 0] (points toward +Y) with -π/2 rotation
      expect(obb.axes[2][0]).toBeCloseTo(0, 5);
      expect(obb.axes[2][1]).toBeCloseTo(1, 5);
      expect(obb.axes[2][2]).toBeCloseTo(0, 5);
    });

    it('correctly transforms axes for rotation [-π/2, π/2, 0]', () => {
      const part = createTestPart({
        rotation: [-Math.PI / 2, Math.PI / 2, 0],
      });

      const obb = createOBBFromPart(part);

      // X axis becomes [0, 0, -1]
      expect(obb.axes[0][0]).toBeCloseTo(0, 5);
      expect(obb.axes[0][1]).toBeCloseTo(0, 5);
      expect(obb.axes[0][2]).toBeCloseTo(-1, 5);

      // Y axis becomes [-1, 0, 0]
      expect(obb.axes[1][0]).toBeCloseTo(-1, 5);
      expect(obb.axes[1][1]).toBeCloseTo(0, 5);
      expect(obb.axes[1][2]).toBeCloseTo(0, 5);

      // Z axis becomes [0, 1, 0]
      expect(obb.axes[2][0]).toBeCloseTo(0, 5);
      expect(obb.axes[2][1]).toBeCloseTo(1, 5);
      expect(obb.axes[2][2]).toBeCloseTo(0, 5);
    });
  });

  describe('axis-aligned parts for comparison', () => {
    it('snaps axis-aligned parts with same gap successfully', () => {
      // Two axis-aligned parts with ~10mm gap (within 20mm threshold)
      const part1 = createTestPart({
        id: 'part1',
        width: 600,
        height: 400,
        depth: 18,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      });

      const part2 = createTestPart({
        id: 'part2',
        width: 600,
        height: 400,
        depth: 18,
        position: [610, 0, 0], // 10mm gap (300 + 10 + 300)
        rotation: [0, 0, 0],
      });

      const movingGroup = calculatePartGroupBounds(part1);
      const targetGroup = calculatePartGroupBounds(part2);

      const result = calculateSnapV2Simple(
        movingGroup,
        [targetGroup],
        'X',
        createDefaultSnapSettings({ distance: 20 })
      );

      expect(result.snapped).toBe(true);
      expect(result.offset).toBeCloseTo(9, 0); // 10mm gap - 1mm collision offset
    });
  });
});
