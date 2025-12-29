/**
 * Three.js State Slice
 *
 * Stores references to WebGLRenderer and Scene for thumbnail generation
 * This state is NOT persisted - it's set when Scene component mounts
 */

import type * as THREE from "three";
import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../types";

export interface ThreeSlice {
  // State
  threeRenderer: THREE.WebGLRenderer | null;
  threeScene: THREE.Scene | null;

  // Actions
  setThreeState: (renderer: THREE.WebGLRenderer | null, scene: THREE.Scene | null) => void;
  clearThreeState: () => void;
}

export const createThreeSlice: StateCreator<StoreState, StoreMutators, [], ThreeSlice> = (set) => ({
  // Initial state
  threeRenderer: null,
  threeScene: null,

  // Set Three.js references (called from Scene component)
  setThreeState: (renderer, scene) => {
    set({ threeRenderer: renderer, threeScene: scene });
  },

  // Clear references (called on unmount)
  clearThreeState: () => {
    set({ threeRenderer: null, threeScene: null });
  },
});
