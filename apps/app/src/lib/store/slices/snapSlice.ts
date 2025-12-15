import type { SnapSettings, SnapVersion } from '@/types';
import type { StoreSlice } from '../types';

/**
 * Default snap settings
 * V2 is default for new users - uses external bounding boxes for group-to-group snapping
 */
const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  distance: 20, // 20mm snap threshold
  showGuides: true,
  magneticPull: false, // Disabled - causes position overwrites during drag
  strengthCurve: 'linear',
  edgeSnap: true,
  faceSnap: true,
  collisionOffset: 1.0, // 1mm offset to prevent collision detection (must be > 0.5mm threshold)
  version: 'v2', // V2 is default - bounding box snapping for better UX
};

/**
 * Snap slice state interface
 *
 * NOTE: Active snap points are NOT stored here for performance reasons.
 * They are managed via SnapContext (ref-based) to avoid store updates
 * during drag operations which would cause performance issues.
 * See: src/lib/snap-context.tsx
 */
export interface SnapSlice {
  // Snap settings (persisted)
  snapEnabled: boolean;
  snapSettings: SnapSettings;

  // Actions
  toggleSnap: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  updateSnapSettings: (settings: Partial<SnapSettings>) => void;
  setSnapVersion: (version: SnapVersion) => void;
}

/**
 * Creates the snap slice for the Zustand store
 * Handles snap settings only - active snap state is in SnapContext
 */
export const createSnapSlice: StoreSlice<SnapSlice> = (set) => ({
  // Initial state
  snapEnabled: true,
  snapSettings: DEFAULT_SNAP_SETTINGS,

  // Toggle snap on/off
  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  // Set snap enabled state
  setSnapEnabled: (enabled: boolean) => {
    set({ snapEnabled: enabled });
  },

  // Update snap settings (partial update)
  updateSnapSettings: (settings: Partial<SnapSettings>) => {
    set((state) => ({
      snapSettings: { ...state.snapSettings, ...settings },
    }));
  },

  // Set snap version (v1 or v2)
  setSnapVersion: (version: SnapVersion) => {
    set((state) => ({
      snapSettings: { ...state.snapSettings, version },
    }));
  },
});
