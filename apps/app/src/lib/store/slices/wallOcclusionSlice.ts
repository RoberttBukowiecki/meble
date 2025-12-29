import type { StoreSlice } from "../types";

export interface WallOcclusionSlice {
  // Feature toggle (ON by default)
  wallOcclusionEnabled: boolean;
  toggleWallOcclusion: () => void;
  setWallOcclusionEnabled: (enabled: boolean) => void;

  // Set of wall IDs that should be transparent (transient - not persisted)
  occludingWallIds: Set<string>;
  setOccludingWallIds: (ids: Set<string>) => void;
}

export const createWallOcclusionSlice: StoreSlice<WallOcclusionSlice> = (set) => ({
  wallOcclusionEnabled: true, // ON by default
  toggleWallOcclusion: () =>
    set((state) => ({
      wallOcclusionEnabled: !state.wallOcclusionEnabled,
      // Clear occluding walls when disabling to reset transparency
      occludingWallIds: state.wallOcclusionEnabled ? new Set<string>() : state.occludingWallIds,
    })),
  setWallOcclusionEnabled: (enabled) =>
    set({
      wallOcclusionEnabled: enabled,
      // Always clear occluding walls - controller will recalculate if enabled
      occludingWallIds: new Set<string>(),
    }),

  occludingWallIds: new Set<string>(),
  setOccludingWallIds: (ids) => set({ occludingWallIds: ids }),
});
