import type { StoreSlice } from '../types';
import { FeatureFlags } from '@/types';
import { UI_FEATURES } from '@/lib/config';

export interface UISlice {
  isShiftPressed: boolean;
  setShiftPressed: (pressed: boolean) => void;

  // Grid visibility
  showGrid: boolean;
  toggleGrid: () => void;

  // Feature Flags
  featureFlags: FeatureFlags;
  toggleFeatureFlag: (key: keyof FeatureFlags) => void;

  // Hidden parts (transient state - not persisted)
  hiddenPartIds: Set<string>;
  /** Toggle visibility of parts by IDs - if all are hidden, show them; otherwise hide all */
  togglePartsHidden: (partIds: string[]) => void;
  /** Hide specific parts */
  hideParts: (partIds: string[]) => void;
  /** Show specific parts */
  showParts: (partIds: string[]) => void;
  /** Show all hidden parts */
  showAllParts: () => void;
}

export const createUISlice: StoreSlice<UISlice> = (set, get) => ({
  isShiftPressed: false,
  setShiftPressed: (pressed: boolean) => set({ isShiftPressed: pressed }),

  // Grid visibility
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  // Feature Flags
  featureFlags: { ...UI_FEATURES },
  toggleFeatureFlag: (key) =>
    set((state) => ({
      featureFlags: {
        ...state.featureFlags,
        [key]: !state.featureFlags[key],
      },
    })),

  // Hidden parts
  hiddenPartIds: new Set<string>(),

  togglePartsHidden: (partIds: string[]) => {
    if (partIds.length === 0) return;

    const currentHidden = get().hiddenPartIds;
    // Check if ALL parts are already hidden
    const allHidden = partIds.every((id) => currentHidden.has(id));

    if (allHidden) {
      // Show all these parts
      const newHidden = new Set(currentHidden);
      for (const id of partIds) {
        newHidden.delete(id);
      }
      set({ hiddenPartIds: newHidden });
    } else {
      // Hide all these parts
      const newHidden = new Set(currentHidden);
      for (const id of partIds) {
        newHidden.add(id);
      }
      set({ hiddenPartIds: newHidden });
    }
  },

  hideParts: (partIds: string[]) => {
    if (partIds.length === 0) return;
    const currentHidden = get().hiddenPartIds;
    const newHidden = new Set(currentHidden);
    for (const id of partIds) {
      newHidden.add(id);
    }
    set({ hiddenPartIds: newHidden });
  },

  showParts: (partIds: string[]) => {
    if (partIds.length === 0) return;
    const currentHidden = get().hiddenPartIds;
    const newHidden = new Set(currentHidden);
    for (const id of partIds) {
      newHidden.delete(id);
    }
    set({ hiddenPartIds: newHidden });
  },

  showAllParts: () => {
    set({ hiddenPartIds: new Set<string>() });
  },
});
