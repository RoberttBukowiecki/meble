/**
 * Countertop History Tests
 *
 * Tests for undo/redo functionality of countertop operations.
 */

import { applyHistoryEntry } from './apply';
import type {
  HistoryEntry,
  CountertopGroup,
  CountertopSegment,
  CncOperation,
  CountertopJoint,
  CountertopCornerConfig,
} from '@/types';
import type { StoreState } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockGroup = (id: string, overrides?: Partial<CountertopGroup>): CountertopGroup => ({
  id,
  furnitureId: 'furniture_1',
  name: 'Test Group',
  layoutType: 'SIMPLE',
  materialId: 'mat_1',
  thickness: 38,
  segments: [],
  joints: [],
  corners: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockSegment = (id: string, overrides?: Partial<CountertopSegment>): CountertopSegment => ({
  id,
  cabinetIds: ['cab_1'],
  length: 600,
  width: 600,
  grainAlongLength: true,
  edgeBanding: { a: 'NONE', b: 'NONE', c: 'NONE', d: 'NONE' },
  overhang: { front: 30, back: 0, left: 0, right: 0 },
  cncOperations: [],
  notes: '',
  ...overrides,
});

const createMockCncOperation = (id: string, overrides?: Partial<CncOperation>): CncOperation => ({
  id,
  type: 'SINK_CUTOUT',
  position: { x: 100, y: 100 },
  dimensions: { width: 400, depth: 350, radius: 20 },
  notes: '',
  ...overrides,
});

const createMockJoint = (id: string, overrides?: Partial<CountertopJoint>): CountertopJoint => ({
  id,
  segmentAId: 'seg_1',
  segmentBId: 'seg_2',
  jointType: 'MITER_45',
  position: { x: 0, y: 0 },
  ...overrides,
});

const createMockCorner = (position: string, treatment = 'SQUARE' as const): CountertopCornerConfig => ({
  position: position as CountertopCornerConfig['position'],
  treatment,
});

const createMockState = (overrides?: Partial<StoreState>): StoreState => ({
  countertopGroups: [],
  selectedCountertopGroupId: null,
  cabinets: [],
  parts: [],
  materials: [],
  furnitures: [],
  room: {} as any,
  ...overrides,
} as any as StoreState);

// ============================================================================
// Tests
// ============================================================================

describe('Countertop History Apply', () => {
  describe('ADD_COUNTERTOP_GROUP', () => {
    it('should remove group on undo', () => {
      const group = createMockGroup('group_1');
      const state = createMockState({ countertopGroups: [group] });

      const entry: HistoryEntry = {
        type: 'ADD_COUNTERTOP_GROUP',
        targetId: 'group_1',
        furnitureId: 'furniture_1',
        before: null,
        after: { group },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups).toHaveLength(0);
    });

    it('should restore group on redo', () => {
      const group = createMockGroup('group_1');
      const state = createMockState({ countertopGroups: [] });

      const entry: HistoryEntry = {
        type: 'ADD_COUNTERTOP_GROUP',
        targetId: 'group_1',
        furnitureId: 'furniture_1',
        before: null,
        after: { group },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'redo', get, set);

      expect(state.countertopGroups).toHaveLength(1);
      expect(state.countertopGroups[0].id).toBe('group_1');
    });
  });

  describe('REMOVE_COUNTERTOP_GROUP', () => {
    it('should restore group on undo', () => {
      const group = createMockGroup('group_1');
      const state = createMockState({ countertopGroups: [] });

      const entry: HistoryEntry = {
        type: 'REMOVE_COUNTERTOP_GROUP',
        targetId: 'group_1',
        furnitureId: 'furniture_1',
        before: { group },
        after: null,
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups).toHaveLength(1);
      expect(state.countertopGroups[0].id).toBe('group_1');
    });

    it('should remove group on redo', () => {
      const group = createMockGroup('group_1');
      const state = createMockState({ countertopGroups: [group] });

      const entry: HistoryEntry = {
        type: 'REMOVE_COUNTERTOP_GROUP',
        targetId: 'group_1',
        furnitureId: 'furniture_1',
        before: { group },
        after: null,
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'redo', get, set);

      expect(state.countertopGroups).toHaveLength(0);
    });
  });

  describe('UPDATE_COUNTERTOP_SEGMENT', () => {
    it('should restore previous segment state on undo', () => {
      const segment = createMockSegment('seg_1', { length: 800 });
      const group = createMockGroup('group_1', { segments: [segment] });
      const state = createMockState({ countertopGroups: [group] });

      const beforeSegment = createMockSegment('seg_1', { length: 600 });

      const entry: HistoryEntry = {
        type: 'UPDATE_COUNTERTOP_SEGMENT',
        targetId: 'seg_1',
        furnitureId: 'furniture_1',
        before: { groupId: 'group_1', segment: beforeSegment },
        after: { groupId: 'group_1', segment },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups[0].segments[0].length).toBe(600);
    });

    it('should restore updated segment state on redo', () => {
      const segment = createMockSegment('seg_1', { length: 600 });
      const group = createMockGroup('group_1', { segments: [segment] });
      const state = createMockState({ countertopGroups: [group] });

      const afterSegment = createMockSegment('seg_1', { length: 800 });

      const entry: HistoryEntry = {
        type: 'UPDATE_COUNTERTOP_SEGMENT',
        targetId: 'seg_1',
        furnitureId: 'furniture_1',
        before: { groupId: 'group_1', segment },
        after: { groupId: 'group_1', segment: afterSegment },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'redo', get, set);

      expect(state.countertopGroups[0].segments[0].length).toBe(800);
    });
  });

  describe('ADD_CNC_OPERATION', () => {
    it('should remove CNC operation on undo', () => {
      const cncOp = createMockCncOperation('cnc_1');
      const segment = createMockSegment('seg_1', { cncOperations: [cncOp] });
      const group = createMockGroup('group_1', { segments: [segment] });
      const state = createMockState({ countertopGroups: [group] });

      const entry: HistoryEntry = {
        type: 'ADD_CNC_OPERATION',
        targetId: 'cnc_1',
        furnitureId: 'furniture_1',
        before: null,
        after: { groupId: 'group_1', segmentId: 'seg_1', operation: cncOp },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups[0].segments[0].cncOperations).toHaveLength(0);
    });

    it('should restore CNC operation on redo', () => {
      const segment = createMockSegment('seg_1', { cncOperations: [] });
      const group = createMockGroup('group_1', { segments: [segment] });
      const state = createMockState({ countertopGroups: [group] });

      const cncOp = createMockCncOperation('cnc_1');

      const entry: HistoryEntry = {
        type: 'ADD_CNC_OPERATION',
        targetId: 'cnc_1',
        furnitureId: 'furniture_1',
        before: null,
        after: { groupId: 'group_1', segmentId: 'seg_1', operation: cncOp },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'redo', get, set);

      expect(state.countertopGroups[0].segments[0].cncOperations).toHaveLength(1);
      expect(state.countertopGroups[0].segments[0].cncOperations[0].id).toBe('cnc_1');
    });
  });

  describe('REMOVE_CNC_OPERATION', () => {
    it('should restore CNC operation on undo', () => {
      const segment = createMockSegment('seg_1', { cncOperations: [] });
      const group = createMockGroup('group_1', { segments: [segment] });
      const state = createMockState({ countertopGroups: [group] });

      const cncOp = createMockCncOperation('cnc_1');

      const entry: HistoryEntry = {
        type: 'REMOVE_CNC_OPERATION',
        targetId: 'cnc_1',
        furnitureId: 'furniture_1',
        before: { groupId: 'group_1', segmentId: 'seg_1', operation: cncOp },
        after: null,
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups[0].segments[0].cncOperations).toHaveLength(1);
    });
  });

  describe('UPDATE_COUNTERTOP_CORNER', () => {
    it('should restore previous corner state on undo', () => {
      const corner = createMockCorner('OUTER_LEFT', 'ROUNDED');
      const group = createMockGroup('group_1', { corners: [corner] });
      const state = createMockState({ countertopGroups: [group] });

      const beforeCorner = createMockCorner('OUTER_LEFT', 'SQUARE');

      const entry: HistoryEntry = {
        type: 'UPDATE_COUNTERTOP_CORNER',
        targetId: 'OUTER_LEFT',
        furnitureId: 'furniture_1',
        before: { groupId: 'group_1', corner: beforeCorner },
        after: { groupId: 'group_1', corner },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups[0].corners[0].treatment).toBe('SQUARE');
    });
  });

  describe('UPDATE_COUNTERTOP_JOINT', () => {
    it('should restore previous joint state on undo', () => {
      const joint = createMockJoint('joint_1', { jointType: 'MITER_45' });
      const group = createMockGroup('group_1', { joints: [joint] });
      const state = createMockState({ countertopGroups: [group] });

      const beforeJoint = createMockJoint('joint_1', { jointType: 'BUTT' });

      const entry: HistoryEntry = {
        type: 'UPDATE_COUNTERTOP_JOINT',
        targetId: 'joint_1',
        furnitureId: 'furniture_1',
        before: { groupId: 'group_1', joint: beforeJoint },
        after: { groupId: 'group_1', joint },
        meta: { id: 'entry_1', timestamp: Date.now(), label: 'test', kind: 'countertop' },
      };

      const get = () => state;
      const set = jest.fn((updater: any) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        Object.assign(state, partial);
      });

      applyHistoryEntry(entry, 'undo', get, set);

      expect(state.countertopGroups[0].joints[0].jointType).toBe('BUTT');
    });
  });
});
