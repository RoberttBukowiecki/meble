/**
 * Project serialization slice
 *
 * Handles getting and setting project data (parts, cabinets, rooms, etc.).
 */

import type { StateCreator } from "zustand";
import type { StoreState, StoreMutators } from "../../types";
import type { ProjectData } from "@/types";
import type { ProjectSerializationSlice } from "./types";
import { SCENE_CONFIG } from "@/lib/config";

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectSerializationSlice: StateCreator<
  StoreState,
  StoreMutators,
  [],
  ProjectSerializationSlice
> = (set, get) => ({
  getProjectData: (): ProjectData => {
    const state = get();
    return {
      parts: state.parts,
      materials: state.materials,
      furnitures: state.furnitures,
      cabinets: state.cabinets,
      rooms: state.rooms,
      walls: state.walls,
      openings: state.openings,
      lights: state.lights ?? [],
      countertopGroups: state.countertopGroups,
      // Save camera position with project
      cameraPosition: state.perspectiveCameraPosition,
      cameraTarget: state.perspectiveCameraTarget,
    };
  },

  setProjectData: (data: ProjectData) => {
    // NOTE: We intentionally DO NOT load materials from project data.
    // Materials are hardcoded in INITIAL_MATERIALS (constants.ts) for now.
    // This will change when we implement material management feature.
    set({
      parts: data.parts ?? [],
      // materials: data.materials ?? [], // Keep using INITIAL_MATERIALS
      furnitures: data.furnitures ?? [],
      cabinets: data.cabinets ?? [],
      rooms: data.rooms ?? [],
      walls: data.walls ?? [],
      openings: data.openings ?? [],
      lights: data.lights ?? [],
      countertopGroups: data.countertopGroups ?? [],
      // Reset selection when loading new project
      selectedPartId: null,
      selectedCabinetId: null,
      selectedPartIds: new Set(),
      // Restore camera position from project (use defaults if not saved)
      perspectiveCameraPosition: data.cameraPosition ?? SCENE_CONFIG.CAMERA_INITIAL_POSITION,
      perspectiveCameraTarget: data.cameraTarget ?? [0, 0, 0],
    });

    // Clear history when loading new project
    get().clearHistory();
  },
});
