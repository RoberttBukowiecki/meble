import type { DimensionSettings } from '@/types';
import type { StoreSlice } from '../types';

/**
 * Default dimension settings
 */
const DEFAULT_DIMENSION_SETTINGS: DimensionSettings = {
  enabled: true,
  maxVisiblePerAxis: 3,
  maxDistanceThreshold: 1000, // 1000mm
  showAxisColors: false,
};

/**
 * Dimension slice state interface
 *
 * NOTE: Active dimension lines are NOT stored here for performance reasons.
 * They are managed via DimensionContext (ref-based) to avoid store updates
 * during drag operations which would cause performance issues.
 * See: src/lib/dimension-context.tsx
 */
export interface DimensionSlice {
  // Dimension settings (persisted)
  dimensionSettings: DimensionSettings;

  // Actions
  setDimensionEnabled: (enabled: boolean) => void;
  updateDimensionSettings: (settings: Partial<DimensionSettings>) => void;
}

/**
 * Creates the dimension slice for the Zustand store
 * Handles dimension settings only - active dimension state is in DimensionContext
 */
export const createDimensionSlice: StoreSlice<DimensionSlice> = (set) => ({
  // Initial state
  dimensionSettings: DEFAULT_DIMENSION_SETTINGS,

  // Set dimension enabled state
  setDimensionEnabled: (enabled: boolean) => {
    set((state) => ({
      dimensionSettings: { ...state.dimensionSettings, enabled },
    }));
  },

  // Update dimension settings (partial update)
  updateDimensionSettings: (settings: Partial<DimensionSettings>) => {
    set((state) => ({
      dimensionSettings: { ...state.dimensionSettings, ...settings },
    }));
  },
});
