import type { DimensionSettings, ObjectDimensionSettings } from '@/types';
import type { StoreSlice } from '../types';

/**
 * Default dimension settings (distance dimensions during drag)
 */
const DEFAULT_DIMENSION_SETTINGS: DimensionSettings = {
  enabled: true,
  maxVisiblePerAxis: 3,
  maxDistanceThreshold: 1000, // 1000mm
  showAxisColors: false,
};

/**
 * Default object dimension settings (W/H/D of objects)
 */
const DEFAULT_OBJECT_DIMENSION_SETTINGS: ObjectDimensionSettings = {
  enabled: false,
  mode: 'selection',
  granularity: 'group',
  showLabels: true,
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
  // Distance dimension settings (during drag) - persisted
  dimensionSettings: DimensionSettings;

  // Object dimension settings (W/H/D) - persisted
  objectDimensionSettings: ObjectDimensionSettings;

  // Actions - distance dimensions
  setDimensionEnabled: (enabled: boolean) => void;
  updateDimensionSettings: (settings: Partial<DimensionSettings>) => void;

  // Actions - object dimensions
  toggleObjectDimensions: () => void;
  updateObjectDimensionSettings: (settings: Partial<ObjectDimensionSettings>) => void;
}

/**
 * Creates the dimension slice for the Zustand store
 * Handles dimension settings only - active dimension state is in DimensionContext
 */
export const createDimensionSlice: StoreSlice<DimensionSlice> = (set) => ({
  // Initial state
  dimensionSettings: DEFAULT_DIMENSION_SETTINGS,
  objectDimensionSettings: DEFAULT_OBJECT_DIMENSION_SETTINGS,

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

  // Toggle object dimensions on/off
  toggleObjectDimensions: () => {
    set((state) => ({
      objectDimensionSettings: {
        ...state.objectDimensionSettings,
        enabled: !state.objectDimensionSettings.enabled,
      },
    }));
  },

  // Update object dimension settings (partial update)
  updateObjectDimensionSettings: (settings: Partial<ObjectDimensionSettings>) => {
    set((state) => ({
      objectDimensionSettings: { ...state.objectDimensionSettings, ...settings },
    }));
  },
});
