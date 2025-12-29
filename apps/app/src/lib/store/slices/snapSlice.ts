import type { SnapSettings, SnapVersion } from "@/types";
import type { StoreSlice } from "../types";

/**
 * Default snap settings
 * V3 is the primary snap system - face-to-face with direction awareness
 */
const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  // Core settings
  distance: 20, // 20mm snap threshold
  snapGap: 0.1, // 0.1mm gap between snapped faces
  collisionMargin: 0.01, // 0.01mm margin for collision detection (can be negative)

  // Snap types (all enabled by default)
  faceSnap: true, // Face-to-face connection (opposite normals)
  edgeSnap: true, // Parallel face alignment
  tJointSnap: true, // T-joint (perpendicular normals)

  // Visualization
  showGuides: true, // Show snap guide lines
  debug: false, // Debug visualization off by default

  // Version
  version: "v3", // V3 is the primary snap system

  // Wall snapping
  wallSnap: true, // Snap to wall inner surfaces
  cornerSnap: true, // Snap to interior corners (two walls)
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
export const createSnapSlice: StoreSlice<SnapSlice> = (set, get) => ({
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

    // If collisionMargin changed, recalculate collisions
    if (settings.collisionMargin !== undefined) {
      // Use setTimeout to ensure state is updated before detecting collisions
      setTimeout(() => {
        const state = get();
        if (state.detectCollisions) {
          state.detectCollisions();
        }
      }, 0);
    }
  },

  // Set snap version (v1, v2, v3, v4, or v5)
  setSnapVersion: (version: SnapVersion) => {
    set((state) => ({
      snapSettings: { ...state.snapSettings, version },
    }));
  },
});
