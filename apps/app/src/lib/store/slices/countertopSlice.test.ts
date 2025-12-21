/**
 * CountertopSlice Tests
 *
 * Tests for the countertop store slice covering:
 * - Group CRUD operations
 * - Segment updates
 * - CNC operations management
 * - Corner and joint updates
 * - CSV export
 */

import { create } from 'zustand';
import { createCountertopSlice, type CountertopSlice } from './countertopSlice';
import type {
  CountertopGroup,
  CountertopSegment,
  CountertopCornerConfig,
  Cabinet,
  Part,
  Material,
} from '@/types';

// ============================================================================
// Test Setup
// ============================================================================

type CountertopTestState = CountertopSlice & {
  materials: Material[];
  parts: Part[];
  cabinets: Cabinet[];
  selectedFurnitureId: string;
};

const baseMaterials: Material[] = [
  { id: 'mat_1', name: 'Dąb naturalny', color: '#8B4513', thickness: 38, category: 'board' },
  { id: 'mat_2', name: 'Biały mat', color: '#FFFFFF', thickness: 18, category: 'board' },
];

const createMockCabinet = (id: string): Cabinet => ({
  id,
  name: `Szafka ${id}`,
  furnitureId: 'furniture_1',
  type: 'KITCHEN',
  topBottomPlacement: 'OVERLAY',
  params: {
    type: 'KITCHEN',
    width: 600,
    height: 900,
    depth: 560,
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
    backMaterialId: 'mat_2',
  },
  partIds: [`part_${id}`],
  position: [0, 450, 0],
  rotation: [0, 0, 0],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Cabinet);

const createMockPart = (id: string): Part => ({
  id,
  name: `Część ${id}`,
  furnitureId: 'furniture_1',
  position: [0, 450, 0],
  rotation: [0, 0, 0],
  width: 600,
  height: 900,
  depth: 560,
  materialId: 'mat_1',
  shapeType: 'RECT',
  shapeParams: { type: 'rect' },
  edgeBanding: { top: false, bottom: false, left: false, right: false },
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Part);

const createCountertopStore = (initial: Partial<CountertopTestState> = {}) =>
  create<CountertopTestState>()((set, get, api) => ({
    ...createCountertopSlice(set as any, get as any, api as any),
    materials: baseMaterials,
    parts: [createMockPart('part_cab_1')],
    cabinets: [createMockCabinet('cab_1')],
    selectedFurnitureId: 'furniture_1',
    // Mock history slice methods
    pushEntry: jest.fn(),
    ...initial,
  }));

// ============================================================================
// Tests
// ============================================================================

describe('countertopSlice', () => {
  describe('selectCountertopGroup', () => {
    it('should select a countertop group', () => {
      const store = createCountertopStore();

      store.getState().selectCountertopGroup('group_1');

      expect(store.getState().selectedCountertopGroupId).toBe('group_1');
    });

    it('should deselect when null is passed', () => {
      const store = createCountertopStore();
      store.getState().selectCountertopGroup('group_1');

      store.getState().selectCountertopGroup(null);

      expect(store.getState().selectedCountertopGroupId).toBeNull();
    });
  });

  describe('addCountertopGroup', () => {
    it('should add a new countertop group', () => {
      const store = createCountertopStore();

      store.getState().addCountertopGroup(
        'furniture_1',
        ['cab_1'],
        'mat_1',
        { name: 'Test Group' }
      );

      const groups = store.getState().countertopGroups;
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Test Group');
      expect(groups[0].materialId).toBe('mat_1');
      expect(groups[0].furnitureId).toBe('furniture_1');
    });

    it('should auto-generate segments from cabinets', () => {
      const store = createCountertopStore();

      store.getState().addCountertopGroup(
        'furniture_1',
        ['cab_1'],
        'mat_1'
      );

      const group = store.getState().countertopGroups[0];
      expect(group.segments.length).toBeGreaterThan(0);
    });
  });

  describe('updateCountertopGroup', () => {
    it('should update group properties', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const groupId = store.getState().countertopGroups[0].id;

      store.getState().updateCountertopGroup(groupId, {
        name: 'Updated Name',
        thickness: 28,
      });

      const group = store.getState().countertopGroups[0];
      expect(group.name).toBe('Updated Name');
      expect(group.thickness).toBe(28);
    });
  });

  describe('removeCountertopGroup', () => {
    it('should remove a countertop group', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const groupId = store.getState().countertopGroups[0].id;

      store.getState().removeCountertopGroup(groupId);

      expect(store.getState().countertopGroups).toHaveLength(0);
    });

    it('should deselect if removed group was selected', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const groupId = store.getState().countertopGroups[0].id;
      store.getState().selectCountertopGroup(groupId);

      store.getState().removeCountertopGroup(groupId);

      expect(store.getState().selectedCountertopGroupId).toBeNull();
    });
  });

  describe('updateSegmentDimensions', () => {
    it('should update segment dimensions', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;

      store.getState().updateSegmentDimensions(group.id, segmentId, {
        length: 1500,
        width: 650,
      });

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.length).toBe(1500);
      expect(segment?.width).toBe(650);
    });
  });

  describe('updateSegmentEdgeBanding', () => {
    it('should update edge banding for a specific edge', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;

      store.getState().updateSegmentEdgeBanding(group.id, segmentId, 'c', 'ABS_2MM');

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.edgeBanding.c).toBe('ABS_2MM');
    });
  });

  describe('updateSegmentGrain', () => {
    it('should update grain direction', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;
      const originalGrain = group.segments[0].grainAlongLength;

      store.getState().updateSegmentGrain(group.id, segmentId, !originalGrain);

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.grainAlongLength).toBe(!originalGrain);
    });
  });

  describe('addCncOperation', () => {
    it('should add a CNC operation to a segment', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;

      store.getState().addCncOperation(
        group.id,
        segmentId,
        'CIRCULAR_HOLE',
        { x: 200, y: 100 },
        { diameter: 35 }
      );

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.cncOperations).toHaveLength(1);
      expect(segment?.cncOperations[0].type).toBe('CIRCULAR_HOLE');
    });
  });

  describe('addCncOperationFromPreset', () => {
    it('should add a CNC operation from preset', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;

      store.getState().addCncOperationFromPreset(
        group.id,
        segmentId,
        'FAUCET_HOLE',
        { x: 300, y: 50 }
      );

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.cncOperations).toHaveLength(1);
      expect(segment?.cncOperations[0].preset).toBe('FAUCET_HOLE');
    });
  });

  describe('removeCncOperation', () => {
    it('should remove a CNC operation from a segment', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const group = store.getState().countertopGroups[0];
      const segmentId = group.segments[0].id;

      // Add an operation first
      store.getState().addCncOperation(
        group.id,
        segmentId,
        'CIRCULAR_HOLE',
        { x: 200, y: 100 },
        { diameter: 35 }
      );
      const operationId = store.getState().countertopGroups[0].segments[0].cncOperations[0].id;

      // Remove it
      store.getState().removeCncOperation(group.id, segmentId, operationId);

      const updatedGroup = store.getState().countertopGroups[0];
      const segment = updatedGroup.segments.find((s: CountertopSegment) => s.id === segmentId);
      expect(segment?.cncOperations).toHaveLength(0);
    });
  });

  describe('updateCornerTreatment', () => {
    it('should update corner treatment', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const groupId = store.getState().countertopGroups[0].id;

      store.getState().updateCornerTreatment(groupId, 1, 'RADIUS', { radius: 15 });

      const group = store.getState().countertopGroups[0];
      const corner = group.corners.find((c: CountertopCornerConfig) => c.position === 1);
      expect(corner?.treatment).toBe('RADIUS');
      expect(corner?.radius).toBe(15);
    });
  });

  describe('exportCountertopGroupCsv', () => {
    it('should export CSV for a group', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');
      const groupId = store.getState().countertopGroups[0].id;

      const csv = store.getState().exportCountertopGroupCsv(groupId);

      expect(csv).toBeDefined();
      expect(csv).toContain('Element');
      expect(csv).toContain('Długość');
    });

    it('should return null for non-existent group', () => {
      const store = createCountertopStore();

      const csv = store.getState().exportCountertopGroupCsv('non_existent');

      expect(csv).toBeNull();
    });
  });

  describe('getCountertopGroupsForFurniture', () => {
    it('should return groups for specific furniture', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');

      const groups = store.getState().getCountertopGroupsForFurniture('furniture_1');

      expect(groups).toHaveLength(1);
    });

    it('should return empty array for furniture without groups', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');

      const groups = store.getState().getCountertopGroupsForFurniture('furniture_2');

      expect(groups).toHaveLength(0);
    });
  });

  describe('getCountertopGroupForCabinet', () => {
    it('should find group containing a specific cabinet', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');

      const group = store.getState().getCountertopGroupForCabinet('cab_1');

      expect(group).toBeDefined();
    });

    it('should return undefined for cabinet not in any group', () => {
      const store = createCountertopStore();
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'mat_1');

      const group = store.getState().getCountertopGroupForCabinet('cab_99');

      expect(group).toBeUndefined();
    });
  });

  describe('applyCountertopConfigToAllKitchenCabinets', () => {
    it('should apply countertop config to all kitchen cabinets in furniture', () => {
      const store = createCountertopStore({
        cabinets: [
          createMockCabinet('cab_1'),
          createMockCabinet('cab_2'),
          createMockCabinet('cab_3'),
        ],
      });

      const config = {
        hasCountertop: true,
        thicknessOverride: 28,
        excludeFromGroup: false,
      };

      store.getState().applyCountertopConfigToAllKitchenCabinets('furniture_1', config);

      const cabinets = store.getState().cabinets;
      expect(cabinets).toHaveLength(3);
      cabinets.forEach(cabinet => {
        expect(cabinet.params.countertopConfig).toEqual(config);
      });
    });

    it('should not affect cabinets from other furniture', () => {
      const cab2 = createMockCabinet('cab_2');
      (cab2 as any).furnitureId = 'furniture_2';

      const store = createCountertopStore({
        cabinets: [
          createMockCabinet('cab_1'),
          cab2,
        ],
      });

      const config = { hasCountertop: false };

      store.getState().applyCountertopConfigToAllKitchenCabinets('furniture_1', config);

      const cabinets = store.getState().cabinets;
      const cab1 = cabinets.find(c => c.id === 'cab_1');
      const cab2Updated = cabinets.find(c => c.id === 'cab_2');

      expect(cab1?.params.countertopConfig).toEqual(config);
      expect(cab2Updated?.params.countertopConfig).toBeUndefined();
    });
  });

  describe('getOtherKitchenCabinetsCount', () => {
    it('should return count of all kitchen cabinets in furniture', () => {
      const store = createCountertopStore({
        cabinets: [
          createMockCabinet('cab_1'),
          createMockCabinet('cab_2'),
          createMockCabinet('cab_3'),
        ],
      });

      const count = store.getState().getOtherKitchenCabinetsCount('furniture_1');

      expect(count).toBe(3);
    });

    it('should exclude specified cabinet from count', () => {
      const store = createCountertopStore({
        cabinets: [
          createMockCabinet('cab_1'),
          createMockCabinet('cab_2'),
          createMockCabinet('cab_3'),
        ],
      });

      const count = store.getState().getOtherKitchenCabinetsCount('furniture_1', 'cab_1');

      expect(count).toBe(2);
    });

    it('should return 0 for furniture with no kitchen cabinets', () => {
      const store = createCountertopStore({
        cabinets: [],
      });

      const count = store.getState().getOtherKitchenCabinetsCount('furniture_1');

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // Material Sync Tests
  // ==========================================================================

  describe('updateCountertopGroupMaterial', () => {
    it('should update countertop group material', () => {
      const store = createCountertopStore({
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
          { id: 'countertop_2', name: 'Blat biały', color: '#FAFAFA', thickness: 38, category: 'countertop' },
        ],
      });

      // Create a group with initial material
      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'countertop_1');
      const groupId = store.getState().countertopGroups[0].id;

      // Update the group material
      store.getState().updateCountertopGroupMaterial(groupId, 'countertop_2');

      const updatedGroup = store.getState().countertopGroups[0];
      expect(updatedGroup.materialId).toBe('countertop_2');
    });

    it('should sync material to all cabinets in the group', () => {
      const cab1 = createMockCabinet('cab_1');
      const cab2 = createMockCabinet('cab_2');
      cab1.params = { ...cab1.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };
      cab2.params = { ...cab2.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };

      const store = createCountertopStore({
        cabinets: [cab1, cab2],
        parts: [createMockPart('part_cab_1'), createMockPart('part_cab_2')],
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
          { id: 'countertop_2', name: 'Blat biały', color: '#FAFAFA', thickness: 38, category: 'countertop' },
        ],
      });

      // Create a group with both cabinets
      store.getState().addCountertopGroup('furniture_1', ['cab_1', 'cab_2'], 'countertop_1');
      const groupId = store.getState().countertopGroups[0].id;

      // Update the group material
      store.getState().updateCountertopGroupMaterial(groupId, 'countertop_2');

      // Verify all cabinets have updated material
      const cabinets = store.getState().cabinets;
      expect(cabinets[0].params.countertopConfig?.materialId).toBe('countertop_2');
      expect(cabinets[1].params.countertopConfig?.materialId).toBe('countertop_2');
    });

    it('should not update cabinets not in the group', () => {
      const cab1 = createMockCabinet('cab_1');
      const cab2 = createMockCabinet('cab_2');
      const cab3 = createMockCabinet('cab_3');
      cab1.params = { ...cab1.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };
      cab2.params = { ...cab2.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };
      cab3.params = { ...cab3.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };

      const store = createCountertopStore({
        cabinets: [cab1, cab2, cab3],
        parts: [createMockPart('part_cab_1'), createMockPart('part_cab_2'), createMockPart('part_cab_3')],
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
          { id: 'countertop_2', name: 'Blat biały', color: '#FAFAFA', thickness: 38, category: 'countertop' },
        ],
      });

      // Create a group with only cab_1 and cab_2
      store.getState().addCountertopGroup('furniture_1', ['cab_1', 'cab_2'], 'countertop_1');
      const groupId = store.getState().countertopGroups[0].id;

      // Update the group material
      store.getState().updateCountertopGroupMaterial(groupId, 'countertop_2');

      // cab_3 should NOT be updated
      const cabinets = store.getState().cabinets;
      const cab3Updated = cabinets.find(c => c.id === 'cab_3');
      expect(cab3Updated?.params.countertopConfig?.materialId).toBe('countertop_1');
    });

    it('should do nothing for non-existent group', () => {
      const store = createCountertopStore();

      // Should not throw
      expect(() => {
        store.getState().updateCountertopGroupMaterial('non_existent', 'mat_1');
      }).not.toThrow();
    });
  });

  describe('separateCabinetFromGroup', () => {
    it('should set excludeFromGroup on the cabinet', () => {
      const cab1 = createMockCabinet('cab_1');
      cab1.params = { ...cab1.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };

      const store = createCountertopStore({
        cabinets: [cab1],
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
        ],
      });

      store.getState().separateCabinetFromGroup('cab_1');

      const cabinet = store.getState().cabinets[0];
      expect(cabinet.params.countertopConfig?.excludeFromGroup).toBe(true);
    });

    it('should do nothing for non-KITCHEN cabinet', () => {
      const cab1 = createMockCabinet('cab_1');
      (cab1 as any).type = 'WARDROBE';

      const store = createCountertopStore({
        cabinets: [cab1],
      });

      // Should not throw
      expect(() => {
        store.getState().separateCabinetFromGroup('cab_1');
      }).not.toThrow();
    });

    it('should do nothing for non-existent cabinet', () => {
      const store = createCountertopStore();

      // Should not throw
      expect(() => {
        store.getState().separateCabinetFromGroup('non_existent');
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Integration Tests - Material Sync Between Cabinet and Group
  // ==========================================================================

  describe('material sync integration', () => {
    it('should keep cabinet config and group material in sync after updateCountertopGroupMaterial', () => {
      const cab1 = createMockCabinet('cab_1');
      const cab2 = createMockCabinet('cab_2');
      cab1.params = { ...cab1.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };
      cab2.params = { ...cab2.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };

      const store = createCountertopStore({
        cabinets: [cab1, cab2],
        parts: [createMockPart('part_cab_1'), createMockPart('part_cab_2')],
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
          { id: 'countertop_2', name: 'Blat biały', color: '#FAFAFA', thickness: 38, category: 'countertop' },
        ],
      });

      // Create group and update material
      store.getState().addCountertopGroup('furniture_1', ['cab_1', 'cab_2'], 'countertop_1');
      const groupId = store.getState().countertopGroups[0].id;
      store.getState().updateCountertopGroupMaterial(groupId, 'countertop_2');

      // Verify sync
      const group = store.getState().countertopGroups[0];
      const cabinets = store.getState().cabinets;

      expect(group.materialId).toBe('countertop_2');
      expect(cabinets[0].params.countertopConfig?.materialId).toBe('countertop_2');
      expect(cabinets[1].params.countertopConfig?.materialId).toBe('countertop_2');
    });

    it('getCountertopGroupForCabinet should return correct group after material change', () => {
      const cab1 = createMockCabinet('cab_1');
      cab1.params = { ...cab1.params, countertopConfig: { hasCountertop: true, materialId: 'countertop_1' } };

      const store = createCountertopStore({
        cabinets: [cab1],
        materials: [
          ...baseMaterials,
          { id: 'countertop_1', name: 'Blat dębowy', color: '#C9A66B', thickness: 38, category: 'countertop' },
          { id: 'countertop_2', name: 'Blat biały', color: '#FAFAFA', thickness: 38, category: 'countertop' },
        ],
      });

      store.getState().addCountertopGroup('furniture_1', ['cab_1'], 'countertop_1');
      const groupId = store.getState().countertopGroups[0].id;

      // Update material
      store.getState().updateCountertopGroupMaterial(groupId, 'countertop_2');

      // Query should still work
      const group = store.getState().getCountertopGroupForCabinet('cab_1');
      expect(group).toBeDefined();
      expect(group?.materialId).toBe('countertop_2');
    });
  });
});
