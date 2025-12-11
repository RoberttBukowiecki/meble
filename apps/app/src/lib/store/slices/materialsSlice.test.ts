jest.mock('uuid', () => {
  let counter = 0;
  return { v4: jest.fn(() => `uuid-${++counter}`) };
});

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { createMaterialsSlice } from './materialsSlice';
import type { MaterialsSlice } from '../types';

const createMaterialsStore = () =>
  create<MaterialsSlice>()(
    createMaterialsSlice as unknown as StateCreator<
      MaterialsSlice,
      [],
      [],
      MaterialsSlice
    >
  );

describe('materialsSlice', () => {
  it('initializes with default materials', () => {
    const store = createMaterialsStore();
    const { materials } = store.getState();

    expect(materials).toHaveLength(3);
    expect(materials[0]).toMatchObject({ name: 'Biały', isDefault: true });
  });

  it('adds a new material with generated id', () => {
    const store = createMaterialsStore();

    store.getState().addMaterial({
      name: 'Nowy',
      color: '#123456',
      thickness: 18,
    });

    const added = store.getState().materials.at(-1);
    expect(added).toMatchObject({
      name: 'Nowy',
      color: '#123456',
      thickness: 18,
    });
    expect(added?.id).toMatch(/^uuid-/);
  });

  it('updates an existing material', () => {
    const store = createMaterialsStore();
    const targetId = store.getState().materials[0].id;

    store.getState().updateMaterial(targetId, { name: 'Zmieniony' });

    const updated = store.getState().materials.find((m) => m.id === targetId);
    expect(updated?.name).toBe('Zmieniony');
  });

  it('removes a material by id', () => {
    const store = createMaterialsStore();
    const targetId = store.getState().materials[1].id;

    store.getState().removeMaterial(targetId);

    expect(store.getState().materials.some((m) => m.id === targetId)).toBe(false);
  });
});
