import type { StoreSlice } from '../types';
import type { CabinetType, CabinetParams } from '@/types';
import type {
  CabinetTypePreferences,
  CabinetPreferencesByType,
} from '@/lib/cabinetDefaults';
import { extractPreferences } from '@/lib/cabinetDefaults';

/**
 * Slice for tracking user's last-used cabinet configuration preferences.
 *
 * When creating a new cabinet, these preferences are merged with type defaults
 * to provide a consistent experience. This means if a user configures legs
 * a certain way for kitchen cabinets, the next kitchen cabinet will use
 * the same leg configuration by default.
 *
 * Inheritable settings per cabinet type:
 * - Legs configuration (enabled, height, finish, etc.)
 * - Countertop configuration (enabled, material, overhangs)
 * - Door configuration (layout, opening direction)
 * - Handle configuration (type, finish, position)
 */
export interface CabinetPreferencesSlice {
  /** Last-used preferences per cabinet type */
  cabinetPreferences: CabinetPreferencesByType;

  /**
   * Get preferences for a specific cabinet type.
   * Returns undefined if no preferences have been saved for that type.
   */
  getCabinetPreferences: (type: CabinetType) => CabinetTypePreferences | undefined;

  /**
   * Save preferences for a cabinet type.
   * Called after creating a cabinet to remember the user's configuration.
   */
  setCabinetPreferences: (type: CabinetType, preferences: CabinetTypePreferences) => void;

  /**
   * Save preferences extracted from cabinet params.
   * Convenience method that extracts inheritable fields from params.
   */
  saveCabinetPreferencesFromParams: (type: CabinetType, params: CabinetParams) => void;

  /**
   * Clear preferences for a specific cabinet type.
   */
  clearCabinetPreferences: (type: CabinetType) => void;

  /**
   * Reset all cabinet preferences to empty (use system defaults).
   */
  resetAllCabinetPreferences: () => void;
}

const DEFAULT_PREFERENCES: CabinetPreferencesByType = {};

export const createCabinetPreferencesSlice: StoreSlice<CabinetPreferencesSlice> = (set, get) => ({
  cabinetPreferences: DEFAULT_PREFERENCES,

  getCabinetPreferences: (type: CabinetType) => {
    return get().cabinetPreferences[type];
  },

  setCabinetPreferences: (type: CabinetType, preferences: CabinetTypePreferences) => {
    set((state) => ({
      cabinetPreferences: {
        ...state.cabinetPreferences,
        [type]: preferences,
      },
    }));
  },

  saveCabinetPreferencesFromParams: (type: CabinetType, params: CabinetParams) => {
    const preferences = extractPreferences(params);
    set((state) => ({
      cabinetPreferences: {
        ...state.cabinetPreferences,
        [type]: preferences,
      },
    }));
  },

  clearCabinetPreferences: (type: CabinetType) => {
    set((state) => {
      const { [type]: _, ...rest } = state.cabinetPreferences;
      return { cabinetPreferences: rest };
    });
  },

  resetAllCabinetPreferences: () => {
    set(() => ({
      cabinetPreferences: DEFAULT_PREFERENCES,
    }));
  },
});
