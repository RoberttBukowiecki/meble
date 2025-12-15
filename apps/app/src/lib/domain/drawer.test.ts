/**
 * Drawer Domain Module Tests
 *
 * Tests for drawer.ts based on interior-config-test-plan.md
 * Covers drawer configuration creation, zone management, and calculations.
 */

import { Drawer } from './drawer';
import type { DrawerConfiguration, DrawerZone } from '@/types';
import {
  INTERIOR_CONFIG,
  DRAWER_CONFIG,
  DRAWER_SLIDE_PRESETS,
} from '@/lib/config';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a default drawer config for testing
 */
function createTestDrawerConfig(
  zoneCount: number = 3,
  hasExternalFronts: boolean = true
): DrawerConfiguration {
  return Drawer.createConfig(zoneCount, 'SIDE_MOUNT', hasExternalFronts);
}

/**
 * Create a drawer zone for testing
 */
function createTestDrawerZone(hasExternalFront: boolean = true): DrawerZone {
  return Drawer.createZone(hasExternalFront);
}

// ============================================================================
// A.3 Drawer Domain Module Tests
// ============================================================================

describe('Drawer Domain Module', () => {
  // ==========================================================================
  // D-001: Drawer.createConfig(3, 'SIDE_MOUNT')
  // ==========================================================================
  describe('D-001: Drawer.createConfig', () => {
    it('creates config with 3 zones and SIDE_MOUNT slide type', () => {
      const config = Drawer.createConfig(3, 'SIDE_MOUNT', true);

      expect(config.zones.length).toBe(3);
      expect(config.slideType).toBe('SIDE_MOUNT');
      expect(config.zones.every((z) => z.front !== null)).toBe(true); // All have external fronts
      expect(config.zones.every((z) => z.boxes.length === 1)).toBe(true); // Each has 1 box
      expect(config.zones.every((z) => z.heightRatio === 1)).toBe(true);
    });

    it('creates internal zones when hasExternalFronts is false', () => {
      const config = Drawer.createConfig(3, 'SIDE_MOUNT', false);

      expect(config.zones.every((z) => z.front === null)).toBe(true);
    });

    it('clamps zone count to valid range', () => {
      const tooFew = Drawer.createConfig(0, 'SIDE_MOUNT', true);
      expect(tooFew.zones.length).toBe(1);

      const tooMany = Drawer.createConfig(20, 'SIDE_MOUNT', true);
      expect(tooMany.zones.length).toBe(INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE);
    });

    it('supports different slide types', () => {
      const sideMount = Drawer.createConfig(2, 'SIDE_MOUNT', true);
      expect(sideMount.slideType).toBe('SIDE_MOUNT');

      const undermount = Drawer.createConfig(2, 'UNDERMOUNT', true);
      expect(undermount.slideType).toBe('UNDERMOUNT');

      const bottomMount = Drawer.createConfig(2, 'BOTTOM_MOUNT', true);
      expect(bottomMount.slideType).toBe('BOTTOM_MOUNT');

      const centerMount = Drawer.createConfig(2, 'CENTER_MOUNT', true);
      expect(centerMount.slideType).toBe('CENTER_MOUNT');
    });
  });

  // ==========================================================================
  // D-002: Drawer.addZone at MAX_DRAWER_ZONES_PER_ZONE
  // ==========================================================================
  describe('D-002: Drawer.addZone at max zones', () => {
    it('does not add zone when at maximum', () => {
      const config = Drawer.createConfig(INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE, 'SIDE_MOUNT', true);
      const updated = Drawer.addZone(config);

      expect(updated.zones.length).toBe(INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE);
      expect(updated).toBe(config); // Same reference - no change
    });

    it('adds zone when below maximum', () => {
      const config = createTestDrawerConfig(2);
      const updated = Drawer.addZone(config);

      expect(updated.zones.length).toBe(3);
    });

    it('adds custom zone when provided', () => {
      const config = createTestDrawerConfig(2);
      const customZone: DrawerZone = {
        id: 'custom-zone',
        heightRatio: 2,
        front: null,
        boxes: [{ heightRatio: 1 }, { heightRatio: 1 }],
      };

      const updated = Drawer.addZone(config, customZone);

      expect(updated.zones.length).toBe(3);
      expect(updated.zones[2].id).toBe('custom-zone');
      expect(updated.zones[2].heightRatio).toBe(2);
    });
  });

  // ==========================================================================
  // D-003: Drawer.removeZone with 1 zone left
  // ==========================================================================
  describe('D-003: Drawer.removeZone with 1 zone left', () => {
    it('does not remove last zone (min 1 zone)', () => {
      const config = Drawer.createConfig(1, 'SIDE_MOUNT', true);
      const zoneId = config.zones[0].id;

      const updated = Drawer.removeZone(config, zoneId);

      expect(updated.zones.length).toBe(1);
      expect(updated).toBe(config); // Same reference - no change
    });

    it('removes zone when more than 1 exists', () => {
      const config = createTestDrawerConfig(3);
      const zoneIdToRemove = config.zones[1].id;

      const updated = Drawer.removeZone(config, zoneIdToRemove);

      expect(updated.zones.length).toBe(2);
      expect(updated.zones.find((z) => z.id === zoneIdToRemove)).toBeUndefined();
    });
  });

  // ==========================================================================
  // D-004: Drawer.addBox to zone
  // ==========================================================================
  describe('D-004: Drawer.addBox to zone', () => {
    it('adds box with heightRatio=1', () => {
      const config = createTestDrawerConfig(2);
      const zoneId = config.zones[0].id;

      const updated = Drawer.addBox(config, zoneId);

      expect(updated.zones[0].boxes.length).toBe(2);
      expect(updated.zones[0].boxes[1].heightRatio).toBe(1);
    });

    it('does not add box beyond maximum', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      // Add boxes up to maximum
      for (let i = 1; i < INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE; i++) {
        config = Drawer.addBox(config, zoneId);
      }

      expect(config.zones[0].boxes.length).toBe(INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE);

      // Try to add one more
      const updated = Drawer.addBox(config, zoneId);
      expect(updated.zones[0].boxes.length).toBe(INTERIOR_CONFIG.MAX_BOXES_PER_DRAWER_ZONE);
    });
  });

  // ==========================================================================
  // D-005: Drawer.addAboveBoxShelf
  // ==========================================================================
  describe('D-005: Drawer.addAboveBoxShelf', () => {
    it('adds shelf to aboveBoxContent', () => {
      const config = createTestDrawerConfig(2);
      const zoneId = config.zones[0].id;

      const updated = Drawer.addAboveBoxShelf(config, zoneId, 'FULL');

      expect(updated.zones[0].aboveBoxContent).toBeDefined();
      expect(updated.zones[0].aboveBoxContent?.shelves.length).toBe(1);
      expect(updated.zones[0].aboveBoxContent?.shelves[0].depthPreset).toBe('FULL');
    });

    it('does not add beyond maximum shelves', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      // Add shelves up to maximum
      for (let i = 0; i < INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER; i++) {
        config = Drawer.addAboveBoxShelf(config, zoneId, 'FULL');
      }

      expect(config.zones[0].aboveBoxContent?.shelves.length).toBe(
        INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER
      );

      // Try to add one more
      const updated = Drawer.addAboveBoxShelf(config, zoneId, 'FULL');
      expect(updated.zones[0].aboveBoxContent?.shelves.length).toBe(
        INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER
      );
    });

    it('supports different depth presets', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const withHalf = Drawer.addAboveBoxShelf(config, zoneId, 'HALF');
      expect(withHalf.zones[0].aboveBoxContent?.shelves[0].depthPreset).toBe('HALF');
    });
  });

  // ==========================================================================
  // D-006: Drawer.calculateZoneBounds
  // ==========================================================================
  describe('D-006: Drawer.calculateZoneBounds', () => {
    it('returns correct front/box height distribution', () => {
      const zones: DrawerZone[] = [
        { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: 'z2', heightRatio: 2, front: {}, boxes: [{ heightRatio: 1 }] },
      ];

      const totalHeight = 720;
      const bodyThickness = 18;
      const interiorHeight = totalHeight - 2 * bodyThickness; // 684

      const bounds = Drawer.calculateZoneBounds(zones, totalHeight, bodyThickness);

      expect(bounds.length).toBe(2);

      // Zone 1: ratio 1, Zone 2: ratio 2, total = 3
      // Zone 1 height = 684 * 1/3 = 228
      // Zone 2 height = 684 * 2/3 = 456
      expect(bounds[0].height).toBeCloseTo(228, 0);
      expect(bounds[1].height).toBeCloseTo(456, 0);

      // Front height = zone height when boxToFrontRatio is 1 (default)
      expect(bounds[0].frontHeight).toBeCloseTo(228, 0);
      expect(bounds[1].frontHeight).toBeCloseTo(456, 0);
    });

    it('calculates correct boxTotalHeight with boxToFrontRatio', () => {
      const zones: DrawerZone[] = [
        { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }], boxToFrontRatio: 0.5 },
      ];

      const bounds = Drawer.calculateZoneBounds(zones, 400, 18);

      // Interior = 400 - 36 = 364
      // Zone height = 364
      // boxTotalHeight = 364 * 0.5 = 182
      expect(bounds[0].boxTotalHeight).toBeCloseTo(182, 0);
    });

    it('handles internal fronts (front === null)', () => {
      const zones: DrawerZone[] = [
        { id: 'z1', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }], boxToFrontRatio: 0.5 },
      ];

      const bounds = Drawer.calculateZoneBounds(zones, 400, 18);

      // When front is null, boxToFrontRatio is treated as 1.0
      const interiorHeight = 400 - 36;
      expect(bounds[0].boxTotalHeight).toBeCloseTo(interiorHeight, 0);
    });
  });

  // ==========================================================================
  // D-007: Drawer.getFrontCount
  // ==========================================================================
  describe('D-007: Drawer.getFrontCount', () => {
    it('returns count of zones with front !== null', () => {
      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [
          { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
          { id: 'z2', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
          { id: 'z3', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        ],
      };

      expect(Drawer.getFrontCount(config)).toBe(2);
    });

    it('returns 0 when all zones are internal', () => {
      const config = Drawer.createConfig(3, 'SIDE_MOUNT', false);

      expect(Drawer.getFrontCount(config)).toBe(0);
    });

    it('returns zone count when all have external fronts', () => {
      const config = Drawer.createConfig(4, 'SIDE_MOUNT', true);

      expect(Drawer.getFrontCount(config)).toBe(4);
    });
  });

  // ==========================================================================
  // D-008: Drawer.getTotalBoxCount
  // ==========================================================================
  describe('D-008: Drawer.getTotalBoxCount', () => {
    it('returns sum of all boxes across zones', () => {
      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [
          { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
          { id: 'z2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }, { heightRatio: 1 }] },
          { id: 'z3', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }, { heightRatio: 1 }, { heightRatio: 1 }] },
        ],
      };

      expect(Drawer.getTotalBoxCount(config)).toBe(6); // 1 + 2 + 3
    });

    it('returns correct count for single zone', () => {
      const config = Drawer.createConfig(1, 'SIDE_MOUNT', true);

      expect(Drawer.getTotalBoxCount(config)).toBe(1);
    });
  });

  // ==========================================================================
  // Additional Drawer Tests
  // ==========================================================================
  describe('Drawer.createZone', () => {
    it('creates zone with external front', () => {
      const zone = Drawer.createZone(true);

      expect(zone.id).toBeTruthy();
      expect(zone.heightRatio).toBe(1);
      expect(zone.front).toEqual({});
      expect(zone.boxes.length).toBe(1);
    });

    it('creates zone without external front', () => {
      const zone = Drawer.createZone(false);

      expect(zone.front).toBeNull();
    });
  });

  describe('Drawer.createBox', () => {
    it('creates box with default height ratio', () => {
      const box = Drawer.createBox();

      expect(box.heightRatio).toBe(1);
    });

    it('creates box with custom height ratio', () => {
      const box = Drawer.createBox(2);

      expect(box.heightRatio).toBe(2);
    });

    it('clamps height ratio to minimum', () => {
      const box = Drawer.createBox(-5);

      expect(box.heightRatio).toBe(0.1); // Min is 0.1
    });
  });

  describe('Drawer.createAboveBoxShelf', () => {
    it('creates shelf with depth preset', () => {
      const shelf = Drawer.createAboveBoxShelf('HALF');

      expect(shelf.id).toBeTruthy();
      expect(shelf.depthPreset).toBe('HALF');
    });
  });

  describe('Drawer.cloneConfig', () => {
    it('creates deep copy with new zone IDs', () => {
      const original = createTestDrawerConfig(3);
      original.zones[0].aboveBoxContent = {
        shelves: [{ id: 'shelf-1', depthPreset: 'FULL' }],
      };

      const cloned = Drawer.cloneConfig(original);

      expect(cloned.slideType).toBe(original.slideType);
      expect(cloned.zones.length).toBe(original.zones.length);

      // Zone IDs should be different
      expect(cloned.zones[0].id).not.toBe(original.zones[0].id);
      expect(cloned.zones[1].id).not.toBe(original.zones[1].id);

      // aboveBoxContent should be cloned
      expect(cloned.zones[0].aboveBoxContent).toBeDefined();
      expect(cloned.zones[0].aboveBoxContent?.shelves.length).toBe(1);
    });
  });

  describe('Drawer.updateZone', () => {
    it('updates zone properties', () => {
      const config = createTestDrawerConfig(2);
      const zoneId = config.zones[0].id;

      const updated = Drawer.updateZone(config, zoneId, { heightRatio: 3 });

      expect(updated.zones[0].heightRatio).toBe(3);
      expect(updated.zones[1].heightRatio).toBe(1); // Unchanged
    });
  });

  describe('Drawer.moveZone', () => {
    it('moves zone up', () => {
      const config = createTestDrawerConfig(3);
      const zoneId = config.zones[0].id;

      const updated = Drawer.moveZone(config, zoneId, 'up');

      expect(updated.zones[1].id).toBe(zoneId);
    });

    it('moves zone down', () => {
      const config = createTestDrawerConfig(3);
      const zoneId = config.zones[2].id;

      const updated = Drawer.moveZone(config, zoneId, 'down');

      expect(updated.zones[1].id).toBe(zoneId);
    });

    it('does not move beyond bounds', () => {
      const config = createTestDrawerConfig(3);
      const lastZoneId = config.zones[2].id;

      const updated = Drawer.moveZone(config, lastZoneId, 'up');

      expect(updated).toBe(config); // No change
    });
  });

  describe('Drawer.setZoneHeightRatio', () => {
    it('sets height ratio with clamping', () => {
      const config = createTestDrawerConfig(2);
      const zoneId = config.zones[0].id;

      const updated = Drawer.setZoneHeightRatio(config, zoneId, 5);

      expect(updated.zones[0].heightRatio).toBe(5);
    });

    it('clamps to valid range', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const tooSmall = Drawer.setZoneHeightRatio(config, zoneId, 0);
      expect(tooSmall.zones[0].heightRatio).toBe(0.1);

      const tooLarge = Drawer.setZoneHeightRatio(config, zoneId, 100);
      expect(tooLarge.zones[0].heightRatio).toBe(10);
    });
  });

  describe('Drawer.toggleZoneFront', () => {
    it('toggles from external to internal', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;
      expect(config.zones[0].front).toEqual({});

      const updated = Drawer.toggleZoneFront(config, zoneId);

      expect(updated.zones[0].front).toBeNull();
    });

    it('toggles from internal to external', () => {
      const config = Drawer.createConfig(1, 'SIDE_MOUNT', false);
      const zoneId = config.zones[0].id;
      expect(config.zones[0].front).toBeNull();

      const updated = Drawer.toggleZoneFront(config, zoneId);

      expect(updated.zones[0].front).toEqual({});
    });
  });

  describe('Drawer.setBoxToFrontRatio', () => {
    it('sets ratio with clamping', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const updated = Drawer.setBoxToFrontRatio(config, zoneId, 0.5);

      expect(updated.zones[0].boxToFrontRatio).toBe(0.5);
    });

    it('clamps to valid range', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const tooSmall = Drawer.setBoxToFrontRatio(config, zoneId, 0);
      expect(tooSmall.zones[0].boxToFrontRatio).toBe(DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MIN / 100);

      const tooLarge = Drawer.setBoxToFrontRatio(config, zoneId, 2);
      expect(tooLarge.zones[0].boxToFrontRatio).toBe(DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MAX / 100);
    });
  });

  describe('Drawer.removeBox', () => {
    it('removes box by index', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      // Add 2 more boxes
      config = Drawer.addBox(config, zoneId);
      config = Drawer.addBox(config, zoneId);
      expect(config.zones[0].boxes.length).toBe(3);

      const updated = Drawer.removeBox(config, zoneId, 1);

      expect(updated.zones[0].boxes.length).toBe(2);
    });

    it('does not remove last box', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const updated = Drawer.removeBox(config, zoneId, 0);

      expect(updated.zones[0].boxes.length).toBe(1);
      expect(updated).toBe(config); // Same reference
    });

    it('does nothing for invalid index', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const updated = Drawer.removeBox(config, zoneId, 10);

      expect(updated).toBe(config);
    });
  });

  describe('Drawer.setBoxHeightRatio', () => {
    it('sets box height ratio', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;
      config = Drawer.addBox(config, zoneId);

      const updated = Drawer.setBoxHeightRatio(config, zoneId, 1, 2);

      expect(updated.zones[0].boxes[1].heightRatio).toBe(2);
    });

    it('clamps to minimum', () => {
      const config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      const updated = Drawer.setBoxHeightRatio(config, zoneId, 0, -5);

      expect(updated.zones[0].boxes[0].heightRatio).toBe(0.1);
    });
  });

  describe('Drawer.removeAboveBoxShelf', () => {
    it('removes shelf by ID', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      config = Drawer.addAboveBoxShelf(config, zoneId, 'FULL');
      config = Drawer.addAboveBoxShelf(config, zoneId, 'HALF');
      const shelfIdToRemove = config.zones[0].aboveBoxContent!.shelves[0].id;

      const updated = Drawer.removeAboveBoxShelf(config, zoneId, shelfIdToRemove);

      expect(updated.zones[0].aboveBoxContent?.shelves.length).toBe(1);
      expect(updated.zones[0].aboveBoxContent?.shelves[0].depthPreset).toBe('HALF');
    });

    it('removes aboveBoxContent when last shelf is removed', () => {
      let config = createTestDrawerConfig(1);
      const zoneId = config.zones[0].id;

      config = Drawer.addAboveBoxShelf(config, zoneId, 'FULL');
      const shelfId = config.zones[0].aboveBoxContent!.shelves[0].id;

      const updated = Drawer.removeAboveBoxShelf(config, zoneId, shelfId);

      expect(updated.zones[0].aboveBoxContent).toBeUndefined();
    });
  });

  describe('Drawer.setSlideType', () => {
    it('changes slide type', () => {
      const config = createTestDrawerConfig(2);
      expect(config.slideType).toBe('SIDE_MOUNT');

      const updated = Drawer.setSlideType(config, 'UNDERMOUNT');

      expect(updated.slideType).toBe('UNDERMOUNT');
    });
  });

  describe('Drawer.convertToInternal', () => {
    it('removes all external fronts', () => {
      const config = createTestDrawerConfig(3);
      expect(config.zones.every((z) => z.front !== null)).toBe(true);

      const updated = Drawer.convertToInternal(config);

      expect(updated.zones.every((z) => z.front === null)).toBe(true);
    });
  });

  describe('Drawer.convertToExternal', () => {
    it('adds external fronts to all zones', () => {
      const config = Drawer.createConfig(3, 'SIDE_MOUNT', false);
      expect(config.zones.every((z) => z.front === null)).toBe(true);

      const updated = Drawer.convertToExternal(config);

      expect(updated.zones.every((z) => z.front !== null)).toBe(true);
    });

    it('preserves existing fronts', () => {
      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [
          {
            id: 'z1',
            heightRatio: 1,
            front: {
              handleConfig: {
                type: 'BAR',
                category: 'TRADITIONAL',
                position: { preset: 'TOP_LEFT' },
                orientation: 'HORIZONTAL',
              },
            },
            boxes: [{ heightRatio: 1 }],
          },
          { id: 'z2', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        ],
      };

      const updated = Drawer.convertToExternal(config);

      expect(updated.zones[0].front).toEqual({
        handleConfig: {
          type: 'BAR',
          category: 'TRADITIONAL',
          position: { preset: 'TOP_LEFT' },
          orientation: 'HORIZONTAL',
        },
      });
      expect(updated.zones[1].front).toEqual({});
    });
  });

  describe('Drawer.calculateBoxBounds', () => {
    it('calculates individual box bounds', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }, { heightRatio: 2 }],
      };

      const bounds = Drawer.calculateBoxBounds(zone, 100, 300);

      expect(bounds.length).toBe(2);

      // Total ratio = 3, total height = 300
      // Box 0: ratio 1 = 100
      // Box 1: ratio 2 = 200
      expect(bounds[0].startY).toBe(100);
      expect(bounds[0].height).toBeCloseTo(100, 0);
      expect(bounds[1].startY).toBeCloseTo(200, 0);
      expect(bounds[1].height).toBeCloseTo(200, 0);
    });
  });

  describe('Drawer.calculateBoxDimensions', () => {
    it('calculates correct drawer box dimensions', () => {
      const cabinetWidth = 600;
      const cabinetDepth = 560;
      const boxSpaceHeight = 200;
      const bodyThickness = 18;
      const slideConfig = DRAWER_SLIDE_PRESETS.SIDE_MOUNT;

      const dims = Drawer.calculateBoxDimensions(
        cabinetWidth,
        cabinetDepth,
        boxSpaceHeight,
        bodyThickness,
        slideConfig
      );

      // boxWidth = 600 - 2*18 - 2*13 = 538
      expect(dims.boxWidth).toBe(600 - 2 * 18 - 2 * slideConfig.sideOffset);

      // boxDepth = 560 - 50 = 510
      expect(dims.boxDepth).toBe(560 - slideConfig.depthOffset);

      // boxSideHeight = max(200 - 30, 50) = 170
      expect(dims.boxSideHeight).toBe(200 - DRAWER_CONFIG.BOX_HEIGHT_REDUCTION);
    });

    it('clamps box side height to minimum', () => {
      const dims = Drawer.calculateBoxDimensions(600, 560, 60, 18, DRAWER_SLIDE_PRESETS.SIDE_MOUNT);

      // boxSideHeight = max(60 - 30, 50) = 50
      expect(dims.boxSideHeight).toBe(50);
    });
  });

  describe('Drawer.calculateDrawerWidth', () => {
    it('calculates drawer width for display', () => {
      const width = Drawer.calculateDrawerWidth(600, 18, 'SIDE_MOUNT');

      // 600 - 2*18 - 2*13 = 538
      expect(width).toBe(600 - 2 * 18 - 2 * DRAWER_SLIDE_PRESETS.SIDE_MOUNT.sideOffset);
    });

    it('handles different slide types', () => {
      const undermount = Drawer.calculateDrawerWidth(600, 18, 'UNDERMOUNT');
      const centerMount = Drawer.calculateDrawerWidth(600, 18, 'CENTER_MOUNT');

      // UNDERMOUNT has larger sideOffset
      expect(undermount).toBeLessThan(600 - 36);

      // CENTER_MOUNT has 0 sideOffset
      expect(centerMount).toBe(600 - 36);
    });
  });

  describe('Drawer.getSlideConfig', () => {
    it('returns correct slide configuration', () => {
      const sideMount = Drawer.getSlideConfig('SIDE_MOUNT');
      expect(sideMount).toEqual(DRAWER_SLIDE_PRESETS.SIDE_MOUNT);

      const undermount = Drawer.getSlideConfig('UNDERMOUNT');
      expect(undermount).toEqual(DRAWER_SLIDE_PRESETS.UNDERMOUNT);
    });
  });

  describe('Drawer.validate', () => {
    it('returns valid for correct configuration', () => {
      const config = createTestDrawerConfig(3);
      const result = Drawer.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('returns error for empty zones', () => {
      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [],
      };

      const result = Drawer.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least one zone'))).toBe(true);
    });

    it('returns error for too many zones', () => {
      const zones: DrawerZone[] = Array.from({ length: 20 }, () => ({
        id: `z${Math.random()}`,
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
      }));

      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones,
      };

      const result = Drawer.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('more than'))).toBe(true);
    });

    it('validates individual zones', () => {
      const config: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [
          { id: 'z1', heightRatio: -1, front: {}, boxes: [] }, // Invalid
        ],
      };

      const result = Drawer.validate(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('Drawer.validateZone', () => {
    it('returns valid for correct zone', () => {
      const zone = createTestDrawerZone();
      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(true);
    });

    it('returns error for negative height ratio', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: -1,
        front: {},
        boxes: [{ heightRatio: 1 }],
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Height ratio'))).toBe(true);
    });

    it('returns error for empty boxes', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [],
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least one box'))).toBe(true);
    });

    it('returns error for too many boxes', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: Array.from({ length: 10 }, () => ({ heightRatio: 1 })),
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('more than'))).toBe(true);
    });

    it('returns error for invalid box ratio', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: -5 }],
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Box height ratio'))).toBe(true);
    });

    it('returns error for invalid boxToFrontRatio', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        boxToFrontRatio: 2.0, // Invalid - should be 0.1-1.0
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Box-to-front ratio'))).toBe(true);
    });

    it('returns error for too many above-box shelves', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        aboveBoxContent: {
          shelves: Array.from({ length: 10 }, () => ({ id: `s${Math.random()}`, depthPreset: 'FULL' as const })),
        },
      };

      const result = Drawer.validateZone(zone);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('shelves above drawer'))).toBe(true);
    });
  });

  describe('Drawer.hasExternalFronts', () => {
    it('returns true when any zone has external front', () => {
      const config = createTestDrawerConfig(3);

      expect(Drawer.hasExternalFronts(config)).toBe(true);
    });

    it('returns false when all zones are internal', () => {
      const config = Drawer.createConfig(3, 'SIDE_MOUNT', false);

      expect(Drawer.hasExternalFronts(config)).toBe(false);
    });
  });

  describe('Drawer.zoneHasExternalFront', () => {
    it('returns true for external front', () => {
      const zone = createTestDrawerZone(true);

      expect(Drawer.zoneHasExternalFront(zone)).toBe(true);
    });

    it('returns false for internal front', () => {
      const zone = createTestDrawerZone(false);

      expect(Drawer.zoneHasExternalFront(zone)).toBe(false);
    });
  });

  describe('Drawer.zoneHasReducedBox', () => {
    it('returns true when boxToFrontRatio < 1 with external front', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        boxToFrontRatio: 0.5,
      };

      expect(Drawer.zoneHasReducedBox(zone)).toBe(true);
    });

    it('returns false when boxToFrontRatio is 1', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        boxToFrontRatio: 1,
      };

      expect(Drawer.zoneHasReducedBox(zone)).toBe(false);
    });

    it('returns false for internal front', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: null,
        boxes: [{ heightRatio: 1 }],
        boxToFrontRatio: 0.5,
      };

      expect(Drawer.zoneHasReducedBox(zone)).toBe(false);
    });
  });

  describe('Drawer.getAboveBoxShelfCount', () => {
    it('returns shelf count', () => {
      const zone: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        aboveBoxContent: {
          shelves: [
            { id: 's1', depthPreset: 'FULL' },
            { id: 's2', depthPreset: 'HALF' },
          ],
        },
      };

      expect(Drawer.getAboveBoxShelfCount(zone)).toBe(2);
    });

    it('returns 0 when no aboveBoxContent', () => {
      const zone = createTestDrawerZone();

      expect(Drawer.getAboveBoxShelfCount(zone)).toBe(0);
    });
  });

  describe('Drawer.getZoneById', () => {
    it('finds zone by ID', () => {
      const config = createTestDrawerConfig(3);
      const targetId = config.zones[1].id;

      const zone = Drawer.getZoneById(config, targetId);

      expect(zone).toBeDefined();
      expect(zone?.id).toBe(targetId);
    });

    it('returns undefined for non-existent ID', () => {
      const config = createTestDrawerConfig(3);

      const zone = Drawer.getZoneById(config, 'non-existent');

      expect(zone).toBeUndefined();
    });
  });

  describe('Drawer.getZoneIndex', () => {
    it('returns correct index', () => {
      const config = createTestDrawerConfig(3);
      const targetId = config.zones[2].id;

      const index = Drawer.getZoneIndex(config, targetId);

      expect(index).toBe(2);
    });

    it('returns -1 for non-existent ID', () => {
      const config = createTestDrawerConfig(3);

      const index = Drawer.getZoneIndex(config, 'non-existent');

      expect(index).toBe(-1);
    });
  });

  describe('Drawer.getSummary', () => {
    it('returns Polish summary', () => {
      const externalOnly = createTestDrawerConfig(3);
      expect(Drawer.getSummary(externalOnly)).toBe('3 szuflad');

      const internalOnly = Drawer.createConfig(2, 'SIDE_MOUNT', false);
      expect(Drawer.getSummary(internalOnly)).toBe('2 szuflad wewn.');

      const mixed: DrawerConfiguration = {
        slideType: 'SIDE_MOUNT',
        zones: [
          { id: 'z1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
          { id: 'z2', heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] },
        ],
      };
      expect(Drawer.getSummary(mixed)).toBe('1 frontów, 2 szuflad');
    });
  });

  describe('Drawer.getZoneSummary', () => {
    it('returns Polish zone summary', () => {
      const external = createTestDrawerZone(true);
      expect(Drawer.getZoneSummary(external)).toBe('Front');

      const internal = createTestDrawerZone(false);
      expect(Drawer.getZoneSummary(internal)).toBe('Wewnętrzna');

      const withMultipleBoxes: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }, { heightRatio: 1 }],
      };
      expect(Drawer.getZoneSummary(withMultipleBoxes)).toContain('2 szuflady');

      const withReducedBox: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        boxToFrontRatio: 0.5,
      };
      expect(Drawer.getZoneSummary(withReducedBox)).toContain('50%');

      const withShelves: DrawerZone = {
        id: 'z1',
        heightRatio: 1,
        front: {},
        boxes: [{ heightRatio: 1 }],
        aboveBoxContent: {
          shelves: [{ id: 's1', depthPreset: 'FULL' }],
        },
      };
      expect(Drawer.getZoneSummary(withShelves)).toContain('+1 półek');
    });
  });
});
