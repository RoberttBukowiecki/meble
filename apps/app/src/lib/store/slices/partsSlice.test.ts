jest.mock('uuid', () => {
  let counter = 0;
  return { v4: jest.fn(() => `uuid-${++counter}`) };
});

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { createPartsSlice } from './partsSlice';
import type { PartsSlice } from '../types';
import type { Material, Part } from '@/types';

type PartsTestState = PartsSlice & {
  materials: Material[];
  parts: Part[];
  pushEntry: jest.Mock;
  detectCollisions: jest.Mock;
  selectedPartId: string | null;
  selectedFurnitureId: string;
  cabinets: any[];
};

const baseMaterials: Material[] = [
  { id: 'm1', name: 'Mat 1', color: '#fff', thickness: 16, isDefault: true },
  { id: 'm2', name: 'Mat 2', color: '#000', thickness: 18, isDefault: false },
];

const createBasePart = (overrides: Partial<Part> = {}): Part => ({
  id: 'part-1',
  name: 'Part 1',
  furnitureId: 'f1',
  group: undefined,
  shapeType: 'RECT',
  shapeParams: { type: 'RECT', x: 600, y: 400 },
  width: 600,
  height: 400,
  depth: 16,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'm1',
  edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
  notes: undefined,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createPartsStore = (initial: Partial<PartsTestState> = {}) =>
  create<PartsTestState>()((set, get) => ({
    materials: baseMaterials,
    pushEntry: jest.fn(),
    detectCollisions: jest.fn(),
    selectedPartId: null,
    selectedFurnitureId: 'f1',
    cabinets: [],
    ...createPartsSlice(set as unknown as any, get as unknown as any),
    ...initial,
  }));

describe('partsSlice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('adds a part with defaults and selects it', () => {
    const store = createPartsStore();

    store.getState().addPart('f1', true);
    jest.runOnlyPendingTimers();

    const part = store.getState().parts[0];
    expect(part).toBeDefined();
    expect(part?.furnitureId).toBe('f1');
    expect(part?.materialId).toBe('m1');
    expect(part?.depth).toBe(16);
    expect(part?.shapeParams).toEqual({ type: 'RECT', x: 600, y: 400 });
    expect(part?.position[1]).toBeCloseTo(8); // thickness / 2
    expect(store.getState().selectedPartId).toBe(part?.id);
    expect(store.getState().detectCollisions).toHaveBeenCalledTimes(1);
  });

  it('updates dimensions when shape params change', () => {
    const part = createBasePart();
    const store = createPartsStore({ parts: [part] });
    const beforeUpdatedAt = part.updatedAt;

    store.getState().updatePart(part.id, { shapeParams: { type: 'RECT', x: 120, y: 80 } }, true);
    jest.runOnlyPendingTimers();

    const updated = store.getState().parts[0];
    expect(updated.width).toBe(120);
    expect(updated.height).toBe(80);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(beforeUpdatedAt.getTime());
    expect(store.getState().detectCollisions).toHaveBeenCalledTimes(1);
  });

  it('updates depth when material changes', () => {
    const part = createBasePart({ materialId: 'm1', depth: 16 });
    const store = createPartsStore({ parts: [part] });

    store.getState().updatePart(part.id, { materialId: 'm2' }, true);
    jest.runOnlyPendingTimers();

    const updated = store.getState().parts[0];
    expect(updated.materialId).toBe('m2');
    expect(updated.depth).toBe(18);
  });

  it('removes part, updates cabinets, and clears selection', () => {
    const part = createBasePart({ id: 'part-remove', cabinetMetadata: { cabinetId: 'cab-1', role: 'BOTTOM' } as any });
    const store = createPartsStore({
      parts: [part, createBasePart({ id: 'part-keep' })],
      cabinets: [{ id: 'cab-1', partIds: ['part-remove'], updatedAt: new Date() }],
      selectedPartId: 'part-remove',
    });

    store.getState().removePart('part-remove', true);
    jest.runOnlyPendingTimers();

    const state = store.getState();
    expect(state.parts.map((p) => p.id)).toEqual(['part-keep']);
    expect(state.cabinets[0].partIds).toEqual([]);
    expect(state.selectedPartId).toBeNull();
  });

  it('duplicates part with offset and clears cabinet metadata', () => {
    const part = createBasePart({
      id: 'original',
      position: [10, 5, 0],
      cabinetMetadata: { cabinetId: 'cab-1', role: 'BOTTOM' } as any,
    });
    const store = createPartsStore({ parts: [part] });

    store.getState().duplicatePart('original', true);
    jest.runOnlyPendingTimers();

    const duplicated = store.getState().parts.find((p) => p.id !== 'original');
    expect(store.getState().parts).toHaveLength(2);
    expect(duplicated?.name).toContain('(kopia)');
    expect(duplicated?.position).toEqual([60, 5, 0]);
    expect(duplicated?.cabinetMetadata).toBeUndefined();
    expect(store.getState().selectedPartId).toBe(duplicated?.id);
    expect(store.getState().detectCollisions).toHaveBeenCalledTimes(1);
  });
});
