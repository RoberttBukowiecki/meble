import { INITIAL_MATERIALS } from '../constants';
import type { MaterialsSlice, StoreSlice } from '../types';
import type { Material } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const createMaterialsSlice: StoreSlice<MaterialsSlice> = (set) => ({
  materials: INITIAL_MATERIALS,

  addMaterial: (material: Omit<Material, 'id'>) => {
    const newMaterial: Material = {
      ...material,
      id: uuidv4(),
    };
    set((state) => ({
      materials: [...state.materials, newMaterial],
    }));
  },

  updateMaterial: (id: string, patch: Partial<Material>) => {
    set((state) => ({
      materials: state.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  },

  removeMaterial: (id: string) => {
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
  },
});
