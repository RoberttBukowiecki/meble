/**
 * Zone Domain Module Tests
 *
 * Tests for zone.ts based on interior-config-test-plan.md
 * Covers zone creation, manipulation, validation, and bounds calculation.
 */

import { Zone } from './zone';
import type { InteriorZone } from '@/types';
import { INTERIOR_CONFIG } from '@/lib/config';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a simple shelves zone for testing
 */
function createShelvesZone(depth: number = 1): InteriorZone {
  return {
    id: 'test-shelves-1',
    contentType: 'SHELVES',
    heightConfig: { mode: 'RATIO', ratio: 1 },
    depth,
    shelvesConfig: { mode: 'UNIFORM', count: 3, depthPreset: 'FULL', shelves: [] },
  };
}

/**
 * Create a simple drawers zone for testing
 */
function createDrawersZone(depth: number = 1): InteriorZone {
  return {
    id: 'test-drawers-1',
    contentType: 'DRAWERS',
    heightConfig: { mode: 'RATIO', ratio: 1 },
    depth,
    drawerConfig: {
      slideType: 'SIDE_MOUNT',
      zones: [
        { id: 'dz1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'dz2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    },
  };
}

/**
 * Create a 2-column nested zone for testing
 */
function createNestedVerticalZone(depth: number = 1): InteriorZone {
  return {
    id: 'test-nested-v',
    contentType: 'NESTED',
    divisionDirection: 'VERTICAL',
    heightConfig: { mode: 'RATIO', ratio: 1 },
    depth,
    children: [
      { ...createShelvesZone(depth + 1), id: 'col-1' },
      { ...createDrawersZone(depth + 1), id: 'col-2' },
    ],
  };
}

/**
 * Create a 3-level nested tree for testing
 */
function createThreeLevelTree(): InteriorZone {
  return {
    id: 'root',
    contentType: 'NESTED',
    divisionDirection: 'HORIZONTAL',
    heightConfig: { mode: 'RATIO', ratio: 1 },
    depth: 0,
    children: [
      {
        id: 'level-1-a',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 1,
        children: [
          { ...createShelvesZone(2), id: 'level-2-a' },
          {
            id: 'level-2-b',
            contentType: 'NESTED',
            divisionDirection: 'HORIZONTAL',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 2,
            children: [
              { ...createShelvesZone(3), id: 'level-3-a' },
              { ...createDrawersZone(3), id: 'level-3-b' },
            ],
          },
        ],
      },
      { ...createDrawersZone(1), id: 'level-1-b' },
    ],
  };
}

// ============================================================================
// A.1 Zone Domain Module Tests
// ============================================================================

describe('Zone Domain Module', () => {
  // ==========================================================================
  // Z-001: Zone.create('SHELVES', 1)
  // ==========================================================================
  describe('Z-001: Zone.create SHELVES', () => {
    it('creates zone with shelvesConfig and correct depth', () => {
      const zone = Zone.create('SHELVES', 1);

      expect(zone.contentType).toBe('SHELVES');
      expect(zone.depth).toBe(1);
      expect(zone.shelvesConfig).toBeDefined();
      expect(zone.shelvesConfig?.mode).toBe('UNIFORM');
      expect(zone.shelvesConfig?.count).toBe(2); // Default count
      expect(zone.heightConfig.mode).toBe('RATIO');
      expect(zone.heightConfig.ratio).toBe(1);
      expect(zone.id).toBeTruthy();
    });
  });

  // ==========================================================================
  // Z-002: Zone.create('DRAWERS', 1)
  // ==========================================================================
  describe('Z-002: Zone.create DRAWERS', () => {
    it('creates zone with drawerConfig and correct depth', () => {
      const zone = Zone.create('DRAWERS', 1);

      expect(zone.contentType).toBe('DRAWERS');
      expect(zone.depth).toBe(1);
      expect(zone.drawerConfig).toBeDefined();
      expect(zone.drawerConfig?.slideType).toBe('SIDE_MOUNT');
      expect(zone.drawerConfig?.zones.length).toBeGreaterThan(0);
      expect(zone.heightConfig.mode).toBe('RATIO');
    });
  });

  // ==========================================================================
  // Z-003: Zone.create('NESTED', 1)
  // ==========================================================================
  describe('Z-003: Zone.create NESTED', () => {
    it('creates zone with divisionDirection HORIZONTAL and children array', () => {
      const zone = Zone.create('NESTED', 1);

      expect(zone.contentType).toBe('NESTED');
      expect(zone.depth).toBe(1);
      expect(zone.divisionDirection).toBe('HORIZONTAL');
      expect(zone.children).toBeDefined();
      expect(zone.children!.length).toBe(1);
      expect(zone.children![0].contentType).toBe('EMPTY');
      expect(zone.children![0].depth).toBe(2);
    });
  });

  // ==========================================================================
  // Z-004: Zone.createNested at MAX_ZONE_DEPTH-1 returns EMPTY
  // ==========================================================================
  describe('Z-004: Zone.createNested at max depth returns EMPTY', () => {
    it('returns EMPTY zone when cannot nest further', () => {
      const maxDepthMinusOne = INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1; // 3
      const zone = Zone.createNested('VERTICAL', maxDepthMinusOne, 2);

      // At depth 3 (MAX_ZONE_DEPTH - 1), cannot create nested
      expect(zone.contentType).toBe('EMPTY');
      expect(zone.depth).toBe(maxDepthMinusOne);
      expect(zone.children).toBeUndefined();
      expect(zone.divisionDirection).toBeUndefined();
    });

    it('allows nested at depth less than MAX_ZONE_DEPTH-1', () => {
      const zone = Zone.createNested('VERTICAL', 1, 2);

      expect(zone.contentType).toBe('NESTED');
      expect(zone.divisionDirection).toBe('VERTICAL');
      expect(zone.children).toBeDefined();
      expect(zone.children!.length).toBe(2);
    });
  });

  // ==========================================================================
  // Z-005: Zone.calculateBounds with simple tree
  // ==========================================================================
  describe('Z-005: Zone.calculateBounds with simple tree', () => {
    it('returns correct leafZoneBounds and partitionBounds', () => {
      const rootZone = createNestedVerticalZone(0);

      const parentBounds = {
        startX: 0,
        startY: 0,
        width: 600,
        height: 720,
      };

      const result = Zone.calculateBounds(rootZone, parentBounds, 18, 560);

      // Should have 2 leaf zones (shelves + drawers)
      expect(result.leafZoneBounds.length).toBe(2);

      // First zone should be left column (shelves)
      const firstLeaf = result.leafZoneBounds[0];
      expect(firstLeaf.zone.id).toBe('col-1');
      expect(firstLeaf.startX).toBe(0);

      // Second zone should be right column (drawers)
      const secondLeaf = result.leafZoneBounds[1];
      expect(secondLeaf.zone.id).toBe('col-2');

      // Should have 1 partition between 2 columns
      expect(result.partitionBounds.length).toBe(1);
    });

    it('calculates correct widths for vertical divisions', () => {
      const rootZone = createNestedVerticalZone(0);

      const parentBounds = {
        startX: 0,
        startY: 0,
        width: 600,
        height: 720,
      };

      const result = Zone.calculateBounds(rootZone, parentBounds, 18, 560);

      // With 2 children of equal ratio and 18mm partition
      // Available width = 600 - 18 = 582
      // Each child = 582 / 2 = 291
      const firstLeaf = result.leafZoneBounds[0];
      const secondLeaf = result.leafZoneBounds[1];

      expect(firstLeaf.width).toBeCloseTo(291, 0);
      expect(secondLeaf.width).toBeCloseTo(291, 0);
    });
  });

  // ==========================================================================
  // Z-006: Zone.distributeWidths with FIXED + PROPORTIONAL mix
  // ==========================================================================
  describe('Z-006: Zone.distributeWidths with FIXED + PROPORTIONAL mix', () => {
    it('correctly calculates fixed first, then distributes remainder', () => {
      const children: InteriorZone[] = [
        {
          id: 'fixed-child',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          widthConfig: { mode: 'FIXED', fixedMm: 200 },
          depth: 1,
        },
        {
          id: 'prop-child-1',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
          depth: 1,
        },
        {
          id: 'prop-child-2',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 2 },
          widthConfig: { mode: 'PROPORTIONAL', ratio: 2 },
          depth: 1,
        },
      ];

      const totalWidth = 600;
      const partitionThickness = 18;

      // Available = 600 - 2*18 = 564
      // Fixed = 200
      // Remaining = 564 - 200 = 364
      // Proportional ratios = 1 + 2 = 3
      // Child 1 (ratio 1) = 364 * 1/3 ≈ 121.33
      // Child 2 (ratio 2) = 364 * 2/3 ≈ 242.67

      const widths = Zone.distributeWidths(children, totalWidth, partitionThickness);

      expect(widths[0]).toBe(200); // Fixed
      expect(widths[1]).toBeCloseTo(364 / 3, 1); // Proportional ratio 1
      expect(widths[2]).toBeCloseTo((364 * 2) / 3, 1); // Proportional ratio 2
    });
  });

  // ==========================================================================
  // Z-007: Zone.distributeHeights with all RATIO
  // ==========================================================================
  describe('Z-007: Zone.distributeHeights with all RATIO', () => {
    it('proportionally distributes by ratio values', () => {
      const children: InteriorZone[] = [
        {
          id: 'child-1',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: 1,
        },
        {
          id: 'child-2',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 2 },
          depth: 1,
        },
        {
          id: 'child-3',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: 1,
        },
      ];

      const totalHeight = 800;
      // Total ratio = 1 + 2 + 1 = 4
      // Child 1 = 800 * 1/4 = 200
      // Child 2 = 800 * 2/4 = 400
      // Child 3 = 800 * 1/4 = 200

      const heights = Zone.distributeHeights(children, totalHeight);

      expect(heights[0]).toBe(200);
      expect(heights[1]).toBe(400);
      expect(heights[2]).toBe(200);
    });

    it('handles mixed RATIO and EXACT modes', () => {
      const children: InteriorZone[] = [
        {
          id: 'exact-child',
          contentType: 'EMPTY',
          heightConfig: { mode: 'EXACT', exactMm: 150 },
          depth: 1,
        },
        {
          id: 'ratio-child',
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: 1,
        },
      ];

      const totalHeight = 500;
      // Exact = 150
      // Remaining = 500 - 150 = 350
      // Ratio child gets all remaining

      const heights = Zone.distributeHeights(children, totalHeight);

      expect(heights[0]).toBe(150);
      expect(heights[1]).toBe(350);
    });
  });

  // ==========================================================================
  // Z-008: Zone.validate with zone below MIN_ZONE_HEIGHT_MM
  // ==========================================================================
  describe('Z-008: Zone.validate with invalid height', () => {
    it('returns error when exact height is below minimum', () => {
      const zone: InteriorZone = {
        id: 'test',
        contentType: 'EMPTY',
        heightConfig: { mode: 'EXACT', exactMm: 30 }, // Below MIN_ZONE_HEIGHT_MM (50)
        depth: 1,
      };

      const result = Zone.validate(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('height'))).toBe(true);
    });
  });

  // ==========================================================================
  // Z-009: Zone.validate with zone below MIN_ZONE_WIDTH_MM
  // ==========================================================================
  describe('Z-009: Zone.validate with invalid width', () => {
    it('returns error when fixed width is below minimum', () => {
      const zone: InteriorZone = {
        id: 'test',
        contentType: 'EMPTY',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        widthConfig: { mode: 'FIXED', fixedMm: 50 }, // Below MIN_ZONE_WIDTH_MM (100)
        depth: 1,
      };

      const result = Zone.validate(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('width'))).toBe(true);
    });
  });

  // ==========================================================================
  // Z-010: Zone.findById on nested tree
  // ==========================================================================
  describe('Z-010: Zone.findZoneById on nested tree', () => {
    it('finds zone at any depth', () => {
      const tree = createThreeLevelTree();

      // Find root
      const root = Zone.findZoneById(tree, 'root');
      expect(root).toBeDefined();
      expect(root?.id).toBe('root');

      // Find level 1
      const level1 = Zone.findZoneById(tree, 'level-1-a');
      expect(level1).toBeDefined();
      expect(level1?.id).toBe('level-1-a');

      // Find level 2
      const level2 = Zone.findZoneById(tree, 'level-2-b');
      expect(level2).toBeDefined();
      expect(level2?.id).toBe('level-2-b');

      // Find level 3
      const level3 = Zone.findZoneById(tree, 'level-3-a');
      expect(level3).toBeDefined();
      expect(level3?.id).toBe('level-3-a');

      // Non-existent
      const notFound = Zone.findZoneById(tree, 'non-existent');
      expect(notFound).toBeNull();
    });
  });

  // ==========================================================================
  // Z-011: Zone.findPath from root to leaf
  // ==========================================================================
  describe('Z-011: Zone.findZonePath from root to leaf', () => {
    it('returns correct path array', () => {
      const tree = createThreeLevelTree();

      // Path to level 3 zone
      const path = Zone.findZonePath(tree, 'level-3-a');

      expect(path).not.toBeNull();
      expect(path).toEqual(['level-1-a', 'level-2-b', 'level-3-a']);
    });

    it('returns empty array for root', () => {
      const tree = createThreeLevelTree();
      const path = Zone.findZonePath(tree, 'root');

      expect(path).toEqual([]);
    });

    it('returns null for non-existent zone', () => {
      const tree = createThreeLevelTree();
      const path = Zone.findZonePath(tree, 'non-existent');

      expect(path).toBeNull();
    });
  });

  // ==========================================================================
  // Z-012: Zone.updateAtPath on nested zone
  // ==========================================================================
  describe('Z-012: Zone.updateAtPath on nested zone', () => {
    it('updates correctly and returns new tree', () => {
      const tree = createThreeLevelTree();

      // Update level-3-a to DRAWERS
      const path = ['level-1-a', 'level-2-b', 'level-3-a'];
      const updatedTree = Zone.updateAtPath(tree, path, (zone) =>
        Zone.updateContentType(zone, 'DRAWERS')
      );

      // Original tree should be unchanged
      const originalZone = Zone.findZoneById(tree, 'level-3-a');
      expect(originalZone?.contentType).toBe('SHELVES');

      // Updated tree should have changed zone
      const updatedZone = Zone.findZoneById(updatedTree, 'level-3-a');
      expect(updatedZone?.contentType).toBe('DRAWERS');
      expect(updatedZone?.drawerConfig).toBeDefined();
    });
  });

  // ==========================================================================
  // Z-013: Zone.removeChild removes zone and adjusts partitions
  // ==========================================================================
  describe('Z-013: Zone.removeChild removes zone and adjusts partitions', () => {
    it('removes child and adjusts partition count', () => {
      const nestedZone: InteriorZone = {
        id: 'parent',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          { id: 'child-1', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'child-2', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'child-3', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
        ],
        partitions: [
          { id: 'p1', enabled: true, depthPreset: 'FULL' },
          { id: 'p2', enabled: true, depthPreset: 'FULL' },
        ],
      };

      const updated = Zone.removeChild(nestedZone, 'child-2');

      expect(updated.children?.length).toBe(2);
      expect(updated.children?.find((c) => c.id === 'child-2')).toBeUndefined();
      // Partitions should be reduced (children - 1 = 2 - 1 = 1)
      expect(updated.partitions?.length).toBe(1);
    });

    it('does not remove last child', () => {
      const nestedZone: InteriorZone = {
        id: 'parent',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          { id: 'only-child', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
        ],
      };

      const updated = Zone.removeChild(nestedZone, 'only-child');

      expect(updated.children?.length).toBe(1);
      expect(updated.children![0].id).toBe('only-child');
    });
  });

  // ==========================================================================
  // Z-014: Zone.getAllZones on 3-level tree
  // ==========================================================================
  describe('Z-014: Zone.getAllZones on 3-level tree', () => {
    it('returns flat list of all zones', () => {
      const tree = createThreeLevelTree();

      const allZones = Zone.getAllZones(tree);

      // root + level-1-a + level-1-b + level-2-a + level-2-b + level-3-a + level-3-b
      expect(allZones.length).toBe(7);

      const ids = allZones.map((z) => z.id);
      expect(ids).toContain('root');
      expect(ids).toContain('level-1-a');
      expect(ids).toContain('level-1-b');
      expect(ids).toContain('level-2-a');
      expect(ids).toContain('level-2-b');
      expect(ids).toContain('level-3-a');
      expect(ids).toContain('level-3-b');
    });
  });

  // ==========================================================================
  // Z-015: Zone.canNest at depth=MAX_ZONE_DEPTH-1
  // ==========================================================================
  describe('Z-015: Zone.canNest at depth=MAX_ZONE_DEPTH-1', () => {
    it('returns false at max nesting depth', () => {
      const zone: InteriorZone = {
        id: 'test',
        contentType: 'EMPTY',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1, // 3
      };

      expect(Zone.canNest(zone)).toBe(false);
    });

    it('returns true at lower depths', () => {
      const zone: InteriorZone = {
        id: 'test',
        contentType: 'EMPTY',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 1,
      };

      expect(Zone.canNest(zone)).toBe(true);
    });
  });

  // ==========================================================================
  // Additional Zone Tests (edge cases and helpers)
  // ==========================================================================
  describe('Zone.createEmpty', () => {
    it('creates an empty zone with correct depth', () => {
      const zone = Zone.createEmpty(2);

      expect(zone.contentType).toBe('EMPTY');
      expect(zone.depth).toBe(2);
      expect(zone.shelvesConfig).toBeUndefined();
      expect(zone.drawerConfig).toBeUndefined();
    });
  });

  describe('Zone.createWithShelves', () => {
    it('creates zone with specified shelf count', () => {
      const zone = Zone.createWithShelves(5, 1);

      expect(zone.contentType).toBe('SHELVES');
      expect(zone.shelvesConfig?.count).toBe(5);
    });

    it('clamps count to max shelves', () => {
      const zone = Zone.createWithShelves(20, 1);

      expect(zone.shelvesConfig?.count).toBe(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    });
  });

  describe('Zone.createWithDrawers', () => {
    it('creates zone with specified drawer zone count', () => {
      const zone = Zone.createWithDrawers(4, 1);

      expect(zone.contentType).toBe('DRAWERS');
      expect(zone.drawerConfig?.zones.length).toBe(4);
    });

    it('clamps count to max drawer zones', () => {
      const zone = Zone.createWithDrawers(20, 1);

      expect(zone.drawerConfig?.zones.length).toBe(INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE);
    });
  });

  describe('Zone.updateContentType', () => {
    it('converts SHELVES to DRAWERS', () => {
      const shelvesZone = Zone.create('SHELVES', 1);
      const drawersZone = Zone.updateContentType(shelvesZone, 'DRAWERS');

      expect(drawersZone.contentType).toBe('DRAWERS');
      expect(drawersZone.drawerConfig).toBeDefined();
      expect(drawersZone.shelvesConfig).toBeUndefined();
    });

    it('does not change if same content type', () => {
      const zone = Zone.create('SHELVES', 1);
      const updated = Zone.updateContentType(zone, 'SHELVES');

      expect(updated).toBe(zone); // Same reference
    });

    it('does not allow nested at max depth', () => {
      const zone: InteriorZone = {
        id: 'test',
        contentType: 'EMPTY',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1, // 3
      };

      const updated = Zone.updateContentType(zone, 'NESTED');

      expect(updated).toBe(zone); // No change - cannot nest
    });
  });

  describe('Zone.addChild', () => {
    it('adds child to nested zone', () => {
      const zone = Zone.create('NESTED', 0);
      const updated = Zone.addChild(zone);

      expect(updated.children?.length).toBe(2);
    });

    it('does not add beyond max children', () => {
      let zone = Zone.create('NESTED', 0);
      for (let i = 0; i < INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE; i++) {
        zone = Zone.addChild(zone);
      }

      const updated = Zone.addChild(zone);
      expect(updated.children?.length).toBe(INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE);
    });

    it('does nothing for non-nested zones', () => {
      const zone = Zone.create('SHELVES', 1);
      const updated = Zone.addChild(zone);

      expect(updated).toBe(zone);
    });
  });

  describe('Zone.moveChild', () => {
    it('moves child in HORIZONTAL direction', () => {
      const zone: InteriorZone = {
        id: 'parent',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          { id: 'c1', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'c2', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'c3', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
        ],
      };

      // Move c1 up (in HORIZONTAL = toward top = higher index)
      const updated = Zone.moveChild(zone, 'c1', 'up');
      expect(updated.children![0].id).toBe('c2');
      expect(updated.children![1].id).toBe('c1');
    });

    it('moves child in VERTICAL direction', () => {
      const zone: InteriorZone = {
        id: 'parent',
        contentType: 'NESTED',
        divisionDirection: 'VERTICAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          { id: 'c1', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'c2', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
          { id: 'c3', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, depth: 1 },
        ],
      };

      // Move c2 up (in VERTICAL = toward left = lower index)
      const updated = Zone.moveChild(zone, 'c2', 'up');
      expect(updated.children![0].id).toBe('c2');
      expect(updated.children![1].id).toBe('c1');
    });
  });

  describe('Zone.validateTree', () => {
    it('validates entire tree recursively', () => {
      const tree = createThreeLevelTree();
      const result = Zone.validateTree(tree);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('catches errors in nested zones', () => {
      const tree: InteriorZone = {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          {
            id: 'invalid',
            contentType: 'NESTED',
            divisionDirection: 'VERTICAL',
            heightConfig: { mode: 'RATIO', ratio: -1 }, // Invalid negative ratio
            depth: 1,
            children: [], // Invalid - nested must have children
          },
        ],
      };

      const result = Zone.validateTree(tree);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Zone.findParentZone', () => {
    it('finds parent of nested child', () => {
      const tree = createThreeLevelTree();

      const parent = Zone.findParentZone(tree, 'level-2-a');

      expect(parent).toBeDefined();
      expect(parent?.id).toBe('level-1-a');
    });

    it('returns null for root', () => {
      const tree = createThreeLevelTree();

      const parent = Zone.findParentZone(tree, 'root');

      expect(parent).toBeNull();
    });
  });

  describe('Zone.countZones', () => {
    it('counts all zones in tree', () => {
      const tree = createThreeLevelTree();

      const count = Zone.countZones(tree);

      expect(count).toBe(7);
    });

    it('returns 1 for leaf zone', () => {
      const zone = Zone.create('SHELVES', 1);

      const count = Zone.countZones(zone);

      expect(count).toBe(1);
    });
  });

  describe('Zone.getMaxDepth', () => {
    it('returns maximum depth in tree', () => {
      const tree = createThreeLevelTree();

      const maxDepth = Zone.getMaxDepth(tree);

      expect(maxDepth).toBe(3);
    });
  });

  describe('Zone.clone', () => {
    it('creates deep copy with new IDs', () => {
      const original = Zone.createNested('VERTICAL', 0, 2);

      const cloned = Zone.clone(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.children![0].id).not.toBe(original.children![0].id);
      expect(cloned.contentType).toBe(original.contentType);
      expect(cloned.divisionDirection).toBe(original.divisionDirection);
    });
  });

  describe('Zone.getSummary', () => {
    it('returns Polish summary for different zone types', () => {
      expect(Zone.getSummary(Zone.create('EMPTY', 1))).toBe('Pusta');
      expect(Zone.getSummary(Zone.createWithShelves(3, 1))).toContain('Półki');
      expect(Zone.getSummary(Zone.createWithDrawers(2, 1))).toContain('Szuflady');
      expect(Zone.getSummary(Zone.createNested('VERTICAL', 0, 2))).toContain('kolumny');
      expect(Zone.getSummary(Zone.createNested('HORIZONTAL', 0, 2))).toContain('sekcje');
    });
  });
});
