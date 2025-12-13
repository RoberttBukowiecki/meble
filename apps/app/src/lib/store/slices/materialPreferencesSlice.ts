import type { StoreSlice } from '../types';
import type { InteriorMaterialPreferences } from '@/types';
import { DEFAULT_INTERIOR_MATERIALS } from '../constants';

/**
 * Slice for tracking user's last used materials for interior components.
 * These preferences are persisted and used as defaults when configuring
 * new cabinet sections with shelves or drawers.
 */
export interface MaterialPreferencesSlice {
  /** Last used material preferences for interior components */
  interiorMaterialPreferences: InteriorMaterialPreferences;

  /** Update the last used shelf material */
  setLastUsedShelfMaterial: (materialId: string) => void;

  /** Update the last used drawer box material */
  setLastUsedDrawerBoxMaterial: (materialId: string) => void;

  /** Update the last used drawer bottom material */
  setLastUsedDrawerBottomMaterial: (materialId: string) => void;

  /** Reset all material preferences to defaults */
  resetMaterialPreferences: () => void;
}

const DEFAULT_PREFERENCES: InteriorMaterialPreferences = {
  shelfMaterialId: DEFAULT_INTERIOR_MATERIALS.shelf,
  drawerBoxMaterialId: DEFAULT_INTERIOR_MATERIALS.drawerBox,
  drawerBottomMaterialId: DEFAULT_INTERIOR_MATERIALS.drawerBottom,
};

export const createMaterialPreferencesSlice: StoreSlice<MaterialPreferencesSlice> = (set) => ({
  interiorMaterialPreferences: DEFAULT_PREFERENCES,

  setLastUsedShelfMaterial: (materialId: string) => {
    set((state) => ({
      interiorMaterialPreferences: {
        ...state.interiorMaterialPreferences,
        shelfMaterialId: materialId,
      },
    }));
  },

  setLastUsedDrawerBoxMaterial: (materialId: string) => {
    set((state) => ({
      interiorMaterialPreferences: {
        ...state.interiorMaterialPreferences,
        drawerBoxMaterialId: materialId,
      },
    }));
  },

  setLastUsedDrawerBottomMaterial: (materialId: string) => {
    set((state) => ({
      interiorMaterialPreferences: {
        ...state.interiorMaterialPreferences,
        drawerBottomMaterialId: materialId,
      },
    }));
  },

  resetMaterialPreferences: () => {
    set(() => ({
      interiorMaterialPreferences: DEFAULT_PREFERENCES,
    }));
  },
});
