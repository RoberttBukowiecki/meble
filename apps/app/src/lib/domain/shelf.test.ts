/**
 * Shelf Domain Module Tests
 *
 * Tests for shelf.ts based on interior-config-test-plan.md
 * Covers shelf configuration creation, management, and calculation.
 */

import { Shelf } from './shelf';
import type { ShelvesConfiguration, ShelfConfig } from '@/types';
import { INTERIOR_CONFIG, SHELF_CONFIG } from '@/lib/config';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a default shelves config for testing
 */
function createTestShelvesConfig(
  count: number = 3,
  mode: 'UNIFORM' | 'MANUAL' = 'UNIFORM'
): ShelvesConfiguration {
  return Shelf.createConfig(count, mode, 'FULL');
}

// ============================================================================
// A.2 Shelf Domain Module Tests
// ============================================================================

describe('Shelf Domain Module', () => {
  // ==========================================================================
  // S-001: Shelf.createConfig(5, 'UNIFORM')
  // ==========================================================================
  describe('S-001: Shelf.createConfig', () => {
    it('creates config with correct count and mode UNIFORM', () => {
      const config = Shelf.createConfig(5, 'UNIFORM');

      expect(config.count).toBe(5);
      expect(config.mode).toBe('UNIFORM');
      expect(config.depthPreset).toBe('FULL');
      expect(config.shelves).toEqual([]);
    });

    it('creates config with MANUAL mode and individual shelves', () => {
      const config = Shelf.createConfig(3, 'MANUAL');

      expect(config.count).toBe(3);
      expect(config.mode).toBe('MANUAL');
      expect(config.shelves.length).toBe(3);
      expect(config.shelves.every((s) => s.depthPreset === 'FULL')).toBe(true);
    });

    it('clamps count to valid range', () => {
      const configNegative = Shelf.createConfig(-5, 'UNIFORM');
      expect(configNegative.count).toBe(0);

      const configExcessive = Shelf.createConfig(100, 'UNIFORM');
      expect(configExcessive.count).toBe(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    });
  });

  // ==========================================================================
  // S-002: Shelf.setCount beyond MAX_SHELVES_PER_ZONE
  // ==========================================================================
  describe('S-002: Shelf.setCount beyond max', () => {
    it('clamps to max value', () => {
      const config = createTestShelvesConfig(3);
      const updated = Shelf.setCount(config, 100);

      expect(updated.count).toBe(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    });

    it('clamps to 0 for negative values', () => {
      const config = createTestShelvesConfig(3);
      const updated = Shelf.setCount(config, -5);

      expect(updated.count).toBe(0);
    });

    it('adjusts shelves array in MANUAL mode when increasing count', () => {
      const config = Shelf.createConfig(2, 'MANUAL');
      const updated = Shelf.setCount(config, 4);

      expect(updated.count).toBe(4);
      expect(updated.shelves.length).toBe(4);
    });

    it('adjusts shelves array in MANUAL mode when decreasing count', () => {
      const config = Shelf.createConfig(4, 'MANUAL');
      const updated = Shelf.setCount(config, 2);

      expect(updated.count).toBe(2);
      expect(updated.shelves.length).toBe(2);
    });
  });

  // ==========================================================================
  // S-003: Shelf.calculatePositions
  // ==========================================================================
  describe('S-003: Shelf.calculatePositions', () => {
    it('distributes shelves from bottom proportionally', () => {
      const config = Shelf.createConfig(3, 'UNIFORM');
      const sectionStartY = 0;
      const sectionHeight = 600;

      const positions = Shelf.calculatePositions(config, sectionStartY, sectionHeight);

      expect(positions.length).toBe(3);

      // Shelves should be distributed with bottom offset
      // First shelf near bottom (using POSITION_BOTTOM_OFFSET = 0.05)
      // Following shelf positioning formula
      const bottomOffset = SHELF_CONFIG.POSITION_BOTTOM_OFFSET;
      expect(positions[0]).toBeCloseTo(sectionStartY + bottomOffset * sectionHeight, 1);

      // Positions should increase (bottom to top)
      expect(positions[1]).toBeGreaterThan(positions[0]);
      expect(positions[2]).toBeGreaterThan(positions[1]);
    });

    it('handles single shelf at middle position', () => {
      const config = Shelf.createConfig(1, 'UNIFORM');
      const sectionStartY = 0;
      const sectionHeight = 600;

      const positions = Shelf.calculatePositions(config, sectionStartY, sectionHeight);

      expect(positions.length).toBe(1);
      // Single shelf at SINGLE_SHELF_POSITION (0.5 = middle)
      expect(positions[0]).toBeCloseTo(
        sectionStartY + SHELF_CONFIG.SINGLE_SHELF_POSITION * sectionHeight,
        1
      );
    });

    it('returns empty array for zero shelves', () => {
      const config = Shelf.createConfig(0, 'UNIFORM');
      const positions = Shelf.calculatePositions(config, 0, 600);

      expect(positions).toEqual([]);
    });

    it('uses custom positionY in MANUAL mode when set', () => {
      const config: ShelvesConfiguration = {
        mode: 'MANUAL',
        count: 2,
        depthPreset: 'FULL',
        shelves: [
          { id: 's1', depthPreset: 'FULL', positionY: 100 },
          { id: 's2', depthPreset: 'FULL', positionY: 300 },
        ],
      };

      const positions = Shelf.calculatePositions(config, 50, 500);

      expect(positions[0]).toBe(150); // 50 + 100
      expect(positions[1]).toBe(350); // 50 + 300
    });
  });

  // ==========================================================================
  // S-004: Shelf.setMode('MANUAL')
  // ==========================================================================
  describe('S-004: Shelf.setMode MANUAL', () => {
    it('creates individual shelf configs when switching to MANUAL', () => {
      const config = Shelf.createConfig(3, 'UNIFORM');
      const updated = Shelf.setMode(config, 'MANUAL');

      expect(updated.mode).toBe('MANUAL');
      expect(updated.shelves.length).toBe(3);
      expect(updated.shelves.every((s) => s.id)).toBe(true);
      expect(updated.shelves.every((s) => s.depthPreset === config.depthPreset)).toBe(true);
    });

    it('does not reinitialize shelves if already in MANUAL mode', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const originalShelfIds = config.shelves.map((s) => s.id);

      const updated = Shelf.setMode(config, 'MANUAL');

      expect(updated).toBe(config); // Same reference - no change
    });

    it('preserves shelves array when switching to UNIFORM', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const updated = Shelf.setMode(config, 'UNIFORM');

      expect(updated.mode).toBe('UNIFORM');
      expect(updated.shelves.length).toBe(3); // Preserved
    });
  });

  // ==========================================================================
  // S-005: Shelf.updateShelf in MANUAL mode
  // ==========================================================================
  describe('S-005: Shelf.updateShelf in MANUAL mode', () => {
    it('updates correct shelf by ID', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const shelfId = config.shelves[1].id;

      const updated = Shelf.updateShelf(config, shelfId, { depthPreset: 'HALF' });

      expect(updated.shelves[1].depthPreset).toBe('HALF');
      expect(updated.shelves[0].depthPreset).toBe('FULL'); // Others unchanged
      expect(updated.shelves[2].depthPreset).toBe('FULL');
    });

    it('sets custom depth correctly', () => {
      const config = Shelf.createConfig(2, 'MANUAL');
      const shelfId = config.shelves[0].id;

      const updated = Shelf.setShelfCustomDepth(config, shelfId, 250);

      expect(updated.shelves[0].depthPreset).toBe('CUSTOM');
      expect(updated.shelves[0].customDepth).toBe(250);
    });

    it('clamps custom depth to valid range', () => {
      const config = Shelf.createConfig(2, 'MANUAL');
      const shelfId = config.shelves[0].id;

      const tooSmall = Shelf.setShelfCustomDepth(config, shelfId, 10);
      expect(tooSmall.shelves[0].customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN);

      const tooLarge = Shelf.setShelfCustomDepth(config, shelfId, 1000);
      expect(tooLarge.shelves[0].customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX);
    });
  });

  // ==========================================================================
  // Additional Shelf Tests
  // ==========================================================================
  describe('Shelf.create', () => {
    it('creates a single shelf config', () => {
      const shelf = Shelf.create('HALF');

      expect(shelf.id).toBeTruthy();
      expect(shelf.depthPreset).toBe('HALF');
      expect(shelf.customDepth).toBeUndefined();
    });
  });

  describe('Shelf.createCustom', () => {
    it('creates shelf with custom depth', () => {
      const shelf = Shelf.createCustom(200);

      expect(shelf.depthPreset).toBe('CUSTOM');
      expect(shelf.customDepth).toBe(200);
    });

    it('clamps custom depth to valid range', () => {
      const shelfSmall = Shelf.createCustom(10);
      expect(shelfSmall.customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN);

      const shelfLarge = Shelf.createCustom(1000);
      expect(shelfLarge.customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX);
    });
  });

  describe('Shelf.cloneConfig', () => {
    it('creates deep copy with new shelf IDs', () => {
      const original = Shelf.createConfig(3, 'MANUAL');
      const cloned = Shelf.cloneConfig(original);

      expect(cloned.count).toBe(original.count);
      expect(cloned.mode).toBe(original.mode);
      expect(cloned.shelves.length).toBe(original.shelves.length);

      // Shelf IDs should be different
      original.shelves.forEach((shelf, i) => {
        expect(cloned.shelves[i].id).not.toBe(shelf.id);
        expect(cloned.shelves[i].depthPreset).toBe(shelf.depthPreset);
      });
    });
  });

  describe('Shelf.setDepthPreset', () => {
    it('sets global depth preset', () => {
      const config = createTestShelvesConfig(3);
      const updated = Shelf.setDepthPreset(config, 'HALF');

      expect(updated.depthPreset).toBe('HALF');
    });
  });

  describe('Shelf.setCustomDepth', () => {
    it('sets global custom depth', () => {
      const config = createTestShelvesConfig(3);
      const updated = Shelf.setCustomDepth(config, 200);

      expect(updated.customDepth).toBe(200);
    });

    it('clamps to valid range', () => {
      const config = createTestShelvesConfig(3);

      const tooSmall = Shelf.setCustomDepth(config, 10);
      expect(tooSmall.customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN);

      const tooLarge = Shelf.setCustomDepth(config, 1000);
      expect(tooLarge.customDepth).toBe(INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX);
    });
  });

  describe('Shelf.setMaterialId', () => {
    it('sets material ID', () => {
      const config = createTestShelvesConfig(3);
      const updated = Shelf.setMaterialId(config, 'mat-123');

      expect(updated.materialId).toBe('mat-123');
    });

    it('clears material ID with undefined', () => {
      const config = { ...createTestShelvesConfig(3), materialId: 'mat-123' };
      const updated = Shelf.setMaterialId(config, undefined);

      expect(updated.materialId).toBeUndefined();
    });
  });

  describe('Shelf.addShelf', () => {
    it('adds shelf to config in MANUAL mode', () => {
      const config = Shelf.createConfig(2, 'MANUAL');
      expect(config.shelves.length).toBe(2);

      const updated = Shelf.addShelf(config);

      expect(updated.count).toBe(3);
      expect(updated.shelves.length).toBe(3);
    });

    it('adds shelf to shelves array in UNIFORM mode', () => {
      const config = createTestShelvesConfig(2); // UNIFORM mode - shelves array is empty
      expect(config.shelves.length).toBe(0);

      const updated = Shelf.addShelf(config);

      expect(updated.count).toBe(3);
      expect(updated.shelves.length).toBe(1); // One shelf added to empty array
    });

    it('does not exceed max shelves', () => {
      let config = Shelf.createConfig(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE, 'MANUAL');
      const updated = Shelf.addShelf(config);

      expect(updated.count).toBe(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    });
  });

  describe('Shelf.removeShelf', () => {
    it('removes shelf by ID', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const shelfToRemove = config.shelves[1].id;

      const updated = Shelf.removeShelf(config, shelfToRemove);

      expect(updated.count).toBe(2);
      expect(updated.shelves.length).toBe(2);
      expect(updated.shelves.find((s) => s.id === shelfToRemove)).toBeUndefined();
    });

    it('does not remove if count is 0', () => {
      const config = Shelf.createConfig(0, 'MANUAL');
      const updated = Shelf.removeShelf(config, 'any-id');

      expect(updated.count).toBe(0);
    });
  });

  describe('Shelf.calculateWidth', () => {
    it('calculates interior width correctly', () => {
      const width = Shelf.calculateWidth(600, 18);

      // 600 - 2 * 18 = 564
      expect(width).toBe(564);
    });

    it('returns 0 for very small cabinets', () => {
      const width = Shelf.calculateWidth(30, 18);

      expect(width).toBe(0);
    });
  });

  describe('Shelf.calculateDepth', () => {
    it('calculates FULL depth correctly', () => {
      const depth = Shelf.calculateDepth('FULL', undefined, 560);

      // 560 - SETBACK (10) = 550
      expect(depth).toBe(560 - SHELF_CONFIG.SETBACK);
    });

    it('calculates HALF depth correctly', () => {
      const depth = Shelf.calculateDepth('HALF', undefined, 560);

      // (560 - 10) / 2 = 275
      expect(depth).toBe(Math.round((560 - SHELF_CONFIG.SETBACK) / 2));
    });

    it('uses custom depth when specified', () => {
      const depth = Shelf.calculateDepth('CUSTOM', 300, 560);

      expect(depth).toBe(300);
    });

    it('falls back to half depth for CUSTOM without value', () => {
      const depth = Shelf.calculateDepth('CUSTOM', undefined, 560);

      expect(depth).toBe(Math.round((560 - SHELF_CONFIG.SETBACK) / 2));
    });
  });

  describe('Shelf.calculateEffectiveDepth', () => {
    it('uses individual shelf settings when available', () => {
      const shelf: ShelfConfig = { id: 's1', depthPreset: 'HALF' };
      const config = Shelf.createConfig(1, 'MANUAL');
      config.depthPreset = 'FULL';

      const depth = Shelf.calculateEffectiveDepth(shelf, config, 560);

      // Should use shelf's HALF, not config's FULL
      expect(depth).toBe(Math.round((560 - SHELF_CONFIG.SETBACK) / 2));
    });

    it('falls back to config settings', () => {
      const config = Shelf.createConfig(1, 'UNIFORM');
      config.depthPreset = 'FULL';

      const depth = Shelf.calculateEffectiveDepth(undefined, config, 560);

      expect(depth).toBe(560 - SHELF_CONFIG.SETBACK);
    });
  });

  describe('Shelf.calculateZOffset', () => {
    it('calculates correct offset for centered shelf', () => {
      const offset = Shelf.calculateZOffset(300, 560);

      // (560 - 300) / 2 = 130
      expect(offset).toBe(130);
    });

    it('returns 0 for full depth shelf', () => {
      const offset = Shelf.calculateZOffset(560, 560);

      expect(offset).toBe(0);
    });
  });

  describe('Shelf.calculateMaxCustomDepth', () => {
    it('calculates maximum custom depth', () => {
      const maxDepth = Shelf.calculateMaxCustomDepth(560);

      expect(maxDepth).toBe(560 - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET);
    });
  });

  describe('Shelf.validate', () => {
    it('returns valid for correct configuration', () => {
      const config = Shelf.createConfig(3, 'UNIFORM');
      const result = Shelf.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('returns error for negative count', () => {
      const config = { ...Shelf.createConfig(3), count: -1 };
      const result = Shelf.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('negative'))).toBe(true);
    });

    it('returns error for exceeding max count', () => {
      const config = { ...Shelf.createConfig(3), count: 100 };
      const result = Shelf.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceed'))).toBe(true);
    });

    it('returns error for MANUAL mode with mismatched array length', () => {
      const config: ShelvesConfiguration = {
        mode: 'MANUAL',
        count: 3,
        depthPreset: 'FULL',
        shelves: [{ id: 's1', depthPreset: 'FULL' }], // Only 1 shelf, but count is 3
      };

      const result = Shelf.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('MANUAL'))).toBe(true);
    });

    it('returns error for CUSTOM preset without customDepth', () => {
      const config: ShelvesConfiguration = {
        mode: 'UNIFORM',
        count: 3,
        depthPreset: 'CUSTOM',
        shelves: [],
        // customDepth is undefined
      };

      const result = Shelf.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Custom depth'))).toBe(true);
    });

    it('returns error for customDepth out of range', () => {
      const config: ShelvesConfiguration = {
        mode: 'UNIFORM',
        count: 3,
        depthPreset: 'CUSTOM',
        customDepth: 10, // Below minimum
        shelves: [],
      };

      const result = Shelf.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Custom depth'))).toBe(true);
    });
  });

  describe('Shelf.validateShelf', () => {
    it('returns valid for correct shelf', () => {
      const shelf = Shelf.create('FULL');
      const result = Shelf.validateShelf(shelf);

      expect(result.valid).toBe(true);
    });

    it('returns error for CUSTOM shelf with invalid customDepth', () => {
      const shelf: ShelfConfig = {
        id: 's1',
        depthPreset: 'CUSTOM',
        customDepth: 10, // Below minimum
      };

      const result = Shelf.validateShelf(shelf);

      expect(result.valid).toBe(false);
    });

    it('allows CUSTOM shelf without customDepth (falls back to global)', () => {
      const shelf: ShelfConfig = {
        id: 's1',
        depthPreset: 'CUSTOM',
        // No customDepth - will use global
      };

      const result = Shelf.validateShelf(shelf);

      expect(result.valid).toBe(true);
    });
  });

  describe('Shelf.hasContent', () => {
    it('returns true when count > 0', () => {
      const config = Shelf.createConfig(3);
      expect(Shelf.hasContent(config)).toBe(true);
    });

    it('returns false when count is 0', () => {
      const config = Shelf.createConfig(0);
      expect(Shelf.hasContent(config)).toBe(false);
    });
  });

  describe('Shelf.getShelfById', () => {
    it('finds shelf by ID', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const targetId = config.shelves[1].id;

      const shelf = Shelf.getShelfById(config, targetId);

      expect(shelf).toBeDefined();
      expect(shelf?.id).toBe(targetId);
    });

    it('returns undefined for non-existent ID', () => {
      const config = Shelf.createConfig(3, 'MANUAL');

      const shelf = Shelf.getShelfById(config, 'non-existent');

      expect(shelf).toBeUndefined();
    });
  });

  describe('Shelf.getShelfIndex', () => {
    it('returns correct index', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const targetId = config.shelves[2].id;

      const index = Shelf.getShelfIndex(config, targetId);

      expect(index).toBe(2);
    });

    it('returns -1 for non-existent ID', () => {
      const config = Shelf.createConfig(3, 'MANUAL');

      const index = Shelf.getShelfIndex(config, 'non-existent');

      expect(index).toBe(-1);
    });
  });

  describe('Shelf.getSummary', () => {
    it('returns Polish summary for shelf count', () => {
      expect(Shelf.getSummary(Shelf.createConfig(0))).toBe('Brak półek');
      expect(Shelf.getSummary(Shelf.createConfig(1))).toBe('1 półka');
      expect(Shelf.getSummary(Shelf.createConfig(3))).toBe('3 półek');
    });
  });

  describe('Shelf.getDepthPresetLabel', () => {
    it('returns Polish labels', () => {
      expect(Shelf.getDepthPresetLabel('FULL')).toBe('Pełna');
      expect(Shelf.getDepthPresetLabel('HALF')).toBe('Połowa');
      expect(Shelf.getDepthPresetLabel('CUSTOM')).toBe('Własna');
    });
  });

  describe('Shelf.getModeLabel', () => {
    it('returns Polish labels', () => {
      expect(Shelf.getModeLabel('UNIFORM')).toBe('Równomierne');
      expect(Shelf.getModeLabel('MANUAL')).toBe('Ręczne');
    });
  });

  describe('Shelf.setShelfDepthPreset', () => {
    it('sets individual shelf depth preset', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const shelfId = config.shelves[0].id;

      const updated = Shelf.setShelfDepthPreset(config, shelfId, 'HALF');

      expect(updated.shelves[0].depthPreset).toBe('HALF');
      expect(updated.shelves[1].depthPreset).toBe('FULL'); // Unchanged
    });
  });

  describe('Shelf.setShelfMaterial', () => {
    it('sets individual shelf material', () => {
      const config = Shelf.createConfig(3, 'MANUAL');
      const shelfId = config.shelves[0].id;

      const updated = Shelf.setShelfMaterial(config, shelfId, 'mat-456');

      expect(updated.shelves[0].materialId).toBe('mat-456');
      expect(updated.shelves[1].materialId).toBeUndefined();
    });
  });
});
