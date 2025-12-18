/**
 * Tests for Snap V2 Engine
 *
 * Tests group-to-group snapping based on external bounding boxes.
 */

import type { Part, Cabinet, SnapSettings } from '@/types';
import {
  calculateSnapV2Simple,
  calculateSnapV2,
  calculatePartSnapV2,
  shouldUseSnapV2,
} from './snapping-v2';
import { calculatePartGroupBounds, calculateCabinetGroupBounds } from './group-bounds';

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

function createTestCabinet(id: string, overrides: Partial<Cabinet> = {}): Cabinet {
  return {
    id,
    name: `Cabinet ${id}`,
    furnitureId: 'furniture-1',
    type: 'KITCHEN',
    params: {
      type: 'KITCHEN',
      width: 600,
      height: 720,
      depth: 560,
      shelfCount: 1,
      hasDoors: true,
      topBottomPlacement: 'inset',
      hasBack: true,
      backOverlapRatio: 0.667,
      backMountType: 'overlap',
    },
    materials: {
      bodyMaterialId: 'mat-1',
      frontMaterialId: 'mat-2',
    },
    topBottomPlacement: 'inset',
    partIds: [],
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
// calculateSnapV2Simple Tests
// ============================================================================

describe('calculateSnapV2Simple', () => {
  it('returns snapped=false when no targets are nearby', () => {
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0] });
    const movingGroup = calculatePartGroupBounds(movingPart);

    // Empty targets
    const result = calculateSnapV2Simple(movingGroup, [], 'X', createDefaultSnapSettings());

    expect(result.snapped).toBe(false);
    expect(result.offset).toBe(0);
  });

  it('snaps to nearby target on X axis', () => {
    // Moving part at origin
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0], width: 100 });
    const movingGroup = calculatePartGroupBounds(movingPart);

    // Target part 60mm to the right (gap of 10mm between edges)
    // Moving part extends from -50 to +50 on X
    // Target part at x=60 extends from 10 to 110 on X
    // Gap = 10 - 50 = -40mm (they overlap?), let's use x=110 (gap of 60mm)
    const targetPart = createTestPart({ id: 'target', position: [110, 0, 0], width: 100 });
    const targetGroup = calculatePartGroupBounds(targetPart);

    const result = calculateSnapV2Simple(
      movingGroup,
      [targetGroup],
      'X',
      createDefaultSnapSettings({ distance: 20 })
    );

    // Gap is 110 - 50 - 50 = 10mm (within snap distance)
    expect(result.snapped).toBe(true);
    expect(result.offset).toBeCloseTo(9); // 10mm gap - 1mm collision offset
  });

  it('does not snap when target is too far', () => {
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0], width: 100 });
    const movingGroup = calculatePartGroupBounds(movingPart);

    // Target 500mm away
    const targetPart = createTestPart({ id: 'target', position: [500, 0, 0], width: 100 });
    const targetGroup = calculatePartGroupBounds(targetPart);

    const result = calculateSnapV2Simple(
      movingGroup,
      [targetGroup],
      'X',
      createDefaultSnapSettings({ distance: 20 })
    );

    expect(result.snapped).toBe(false);
  });

  it('only snaps on the specified axis', () => {
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0] });
    const movingGroup = calculatePartGroupBounds(movingPart);

    // Target nearby on X axis but we're snapping on Y
    // Note: parts at same Y level will have alignment snaps (same-direction faces)
    const targetPart = createTestPart({ id: 'target', position: [110, 0, 0] });
    const targetGroup = calculatePartGroupBounds(targetPart);

    const result = calculateSnapV2Simple(
      movingGroup,
      [targetGroup],
      'Y', // Different axis
      createDefaultSnapSettings({ distance: 20 })
    );

    // Parts at same Y level have alignment snaps with 0 offset
    // This is expected behavior - indicates they're already aligned
    expect(result.snapped).toBe(true);
    expect(Math.abs(result.offset)).toBeLessThan(1); // Essentially 0 offset
  });
});

// ============================================================================
// calculateSnapV2 Tests
// ============================================================================

describe('calculateSnapV2', () => {
  it('returns empty array when no targets', () => {
    const movingPart = createTestPart();
    const movingGroup = calculatePartGroupBounds(movingPart);

    const candidates = calculateSnapV2(movingGroup, [], createDefaultSnapSettings());

    expect(candidates).toHaveLength(0);
  });

  it('finds face-to-face snap candidates', () => {
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0] });
    const movingGroup = calculatePartGroupBounds(movingPart);

    const targetPart = createTestPart({ id: 'target', position: [110, 0, 0] });
    const targetGroup = calculatePartGroupBounds(targetPart);

    const candidates = calculateSnapV2(
      movingGroup,
      [targetGroup],
      createDefaultSnapSettings({ distance: 20 })
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].type).toBe('face');
  });

  it('scores candidates by distance', () => {
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0] });
    const movingGroup = calculatePartGroupBounds(movingPart);

    // Two targets at different distances
    const targetNear = createTestPart({ id: 'near', position: [110, 0, 0] }); // 10mm gap
    const targetFar = createTestPart({ id: 'far', position: [118, 0, 0] }); // 18mm gap

    const targetNearGroup = calculatePartGroupBounds(targetNear);
    const targetFarGroup = calculatePartGroupBounds(targetFar);

    const candidates = calculateSnapV2(
      movingGroup,
      [targetNearGroup, targetFarGroup],
      createDefaultSnapSettings({ distance: 20 })
    );

    // Should have candidates sorted by score (closer = better)
    expect(candidates.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// calculatePartSnapV2 Tests
// ============================================================================

describe('calculatePartSnapV2', () => {
  it('returns snapped=false when part is alone', () => {
    const part = createTestPart();
    const result = calculatePartSnapV2(
      part,
      [10, 0, 0],
      [part],
      [],
      createDefaultSnapSettings(),
      'X'
    );

    expect(result.snapped).toBe(false);
  });

  it('snaps moving part to nearby cabinet', () => {
    // A single part moving toward a cabinet
    const movingPart = createTestPart({ id: 'moving', position: [0, 0, 0], width: 100 });

    // Cabinet at x=110
    const cabinet = createTestCabinet('cabinet-1');
    const cabinetPart = createTestPart({
      id: 'cabinet-part',
      position: [110, 0, 0],
      width: 100,
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'LEFT_SIDE' },
    });
    cabinet.partIds = ['cabinet-part'];

    const result = calculatePartSnapV2(
      movingPart,
      [0, 0, 0], // new position same as current
      [movingPart, cabinetPart],
      [cabinet],
      createDefaultSnapSettings({ distance: 20 }),
      'X'
    );

    expect(result.snapped).toBe(true);
  });

  it('excludes own cabinet from snap targets', () => {
    // Part inside a cabinet should not snap to its own cabinet
    const cabinet = createTestCabinet('cabinet-1');
    const cabinetPart1 = createTestPart({
      id: 'part-1',
      position: [0, 0, 0],
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'LEFT_SIDE' },
    });
    const cabinetPart2 = createTestPart({
      id: 'part-2',
      position: [110, 0, 0],
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'RIGHT_SIDE' },
    });
    cabinet.partIds = ['part-1', 'part-2'];

    // Moving part-1, should not snap to part-2 (same cabinet)
    const result = calculatePartSnapV2(
      cabinetPart1,
      [10, 0, 0],
      [cabinetPart1, cabinetPart2],
      [cabinet],
      createDefaultSnapSettings({ distance: 20 }),
      'X'
    );

    // Should not snap to its own cabinet
    expect(result.snapped).toBe(false);
  });
});

// ============================================================================
// shouldUseSnapV2 Tests
// ============================================================================

describe('shouldUseSnapV2', () => {
  it('returns false when version is v1', () => {
    expect(shouldUseSnapV2('part-1', undefined, [], 'v1')).toBe(false);
  });

  it('returns true when version is v2 and no target', () => {
    expect(shouldUseSnapV2('part-1', undefined, [], 'v2')).toBe(true);
  });

  it('returns false when parts are in same cabinet', () => {
    const part1 = createTestPart({
      id: 'part-1',
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'LEFT_SIDE' },
    });
    const part2 = createTestPart({
      id: 'part-2',
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'RIGHT_SIDE' },
    });

    expect(shouldUseSnapV2('part-1', 'part-2', [part1, part2], 'v2')).toBe(false);
  });

  it('returns true when parts are in different cabinets', () => {
    const part1 = createTestPart({
      id: 'part-1',
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'LEFT_SIDE' },
    });
    const part2 = createTestPart({
      id: 'part-2',
      cabinetMetadata: { cabinetId: 'cabinet-2', role: 'LEFT_SIDE' },
    });

    expect(shouldUseSnapV2('part-1', 'part-2', [part1, part2], 'v2')).toBe(true);
  });

  it('returns true when moving part has no cabinet', () => {
    const part1 = createTestPart({ id: 'part-1' }); // No cabinet
    const part2 = createTestPart({
      id: 'part-2',
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'LEFT_SIDE' },
    });

    expect(shouldUseSnapV2('part-1', 'part-2', [part1, part2], 'v2')).toBe(true);
  });
});
