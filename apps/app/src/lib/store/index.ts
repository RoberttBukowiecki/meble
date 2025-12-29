import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isDev } from "@/lib/env";
import { createSelectionSlice } from "./slices/selectionSlice";
import { createMaterialsSlice } from "./slices/materialsSlice";
import { createFurnitureSlice } from "./slices/furnitureSlice";
import { createPartsSlice } from "./slices/partsSlice";
import { createCabinetSlice } from "./slices/cabinetSlice";
import { createCollisionSlice } from "./slices/collisionSlice";
import { createRoomSlice } from "./slices/roomSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createUISlice } from "./slices/uiSlice";
import { createSnapSlice } from "./slices/snapSlice";
import { createDimensionSlice } from "./slices/dimensionSlice";
import { createGraphicsSlice } from "./slices/graphicsSlice";
import { createMaterialPreferencesSlice } from "./slices/materialPreferencesSlice";
import { createCountertopSlice } from "./slices/countertopSlice";
import { createCabinetPreferencesSlice } from "./slices/cabinetPreferencesSlice";
import { createViewSlice } from "./slices/viewSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createWallOcclusionSlice } from "./slices/wallOcclusionSlice";
import { createThreeSlice } from "./slices/threeSlice";
import { HISTORY_MAX_LENGTH, HISTORY_MAX_MILESTONES } from "./history/constants";
import type { StoreState } from "./types";

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createSelectionSlice(...args),
      ...createMaterialsSlice(...args),
      ...createFurnitureSlice(...args),
      ...createPartsSlice(...args),
      ...createCabinetSlice(...args),
      ...createCollisionSlice(...args),
      ...createRoomSlice(...args),
      ...createHistorySlice(...args),
      ...createUISlice(...args),
      ...createSnapSlice(...args),
      ...createDimensionSlice(...args),
      ...createGraphicsSlice(...args),
      ...createMaterialPreferencesSlice(...args),
      ...createCountertopSlice(...args),
      ...createCabinetPreferencesSlice(...args),
      ...createViewSlice(...args),
      ...createProjectSlice(...args),
      ...createWallOcclusionSlice(...args),
      ...createThreeSlice(...args),
    }),
    {
      name: "e-meble-storage",
      version: 1,
      // No migrations needed - app is not in production yet
      // If localStorage has old data, just clear it and start fresh
      partialize: (state) => {
        // Remove functions but keep history stacks
        const {
          // Functions to exclude from persistence
          addFurniture,
          removeFurniture,
          setSelectedFurniture,
          addPart,
          updatePart,
          updatePartsBatch,
          renamePart,
          renameManualGroup,
          removePart,
          selectPart,
          duplicatePart,
          setIsTransforming,
          setTransformMode,
          setTransformingPartId,
          setTransformingCabinetId,
          addMaterial,
          updateMaterial,
          removeMaterial,
          // Materials - don't persist, always use INITIAL_MATERIALS from constants
          // This ensures materials are never empty after hydration
          materials,
          addCabinet,
          updateCabinet,
          renameCabinet,
          updateCabinetParams,
          updateCabinetTransform,
          removeCabinet,
          duplicateCabinet,
          selectCabinet,
          detectCollisions,
          // Multiselect functions
          togglePartSelection,
          addToSelection,
          removeFromSelection,
          selectRange,
          selectAll,
          clearSelection,
          setTransformingPartIds,
          deleteSelectedParts,
          duplicateSelectedParts,
          // Multiselect state (transient - don't persist)
          selectedPartIds,
          multiSelectAnchorId,
          transformingPartIds,
          // History functions
          canUndo,
          canRedo,
          beginBatch,
          commitBatch,
          cancelBatch,
          undo,
          redo,
          pushEntry,
          clearHistory,
          jumpTo,
          setTimelineCursor,
          runWithHistory,
          // UI functions
          setShiftPressed,
          togglePartsHidden,
          hideParts,
          showParts,
          showAllParts,
          toggleFeatureFlag,
          // UI state (don't persist transient state)
          isShiftPressed,
          hiddenPartIds,
          // Snap functions (snapEnabled and snapSettings ARE persisted)
          toggleSnap,
          setSnapEnabled,
          updateSnapSettings,
          // Dimension functions (dimensionSettings IS persisted)
          setDimensionEnabled,
          updateDimensionSettings,
          // Graphics functions (graphicsSettings IS persisted)
          updateGraphicsSettings,
          // Material preferences functions (interiorMaterialPreferences IS persisted)
          setLastUsedShelfMaterial,
          setLastUsedDrawerBoxMaterial,
          setLastUsedDrawerBottomMaterial,
          resetMaterialPreferences,
          // Countertop functions (countertopGroups IS persisted)
          selectCountertopGroup,
          addCountertopGroup,
          updateCountertopGroup,
          removeCountertopGroup,
          generateCountertopsForFurniture,
          regenerateCountertopGroup,
          updateSegment,
          updateSegmentDimensions,
          updateSegmentOverhang,
          updateSegmentEdgeBanding,
          updateSegmentGrain,
          addCncOperation,
          addCncOperationFromPreset,
          updateCncOperation,
          removeCncOperation,
          updateCornerTreatment,
          updateJointType,
          exportCountertopGroupCsv,
          getCountertopProductionData,
          getCountertopGroupsForFurniture,
          getCountertopGroupForCabinet,
          // Countertop transient state (don't persist)
          selectedCountertopGroupId,
          // Cabinet preferences functions (cabinetPreferences IS persisted)
          getCabinetPreferences,
          setCabinetPreferences,
          saveCabinetPreferencesFromParams,
          clearCabinetPreferences,
          resetAllCabinetPreferences,
          // View functions (view state IS persisted)
          setCameraMode,
          setOrthographicView,
          setOrthographicZoom,
          setOrthographicTarget,
          toggleCameraMode,
          switchToOrthographicView,
          switchToPerspective,
          // Project functions (don't persist)
          setCurrentProject,
          markAsDirty,
          markAsSaved,
          setSyncStatus,
          setProjectName,
          loadProject,
          saveProject,
          saveProjectAs,
          createNewProject,
          updateProjectName,
          resolveConflict,
          clearConflict,
          getProjectData,
          setProjectData,
          resetProjectState,
          // Project transient state (don't persist - sync state is ephemeral)
          // Note: currentProjectId, currentProjectName and currentProjectRevision ARE persisted
          // so we can restore the project after page reload
          syncState,
          isProjectLoading,
          // Wall occlusion functions and transient state
          // Note: wallOcclusionEnabled IS persisted (user preference)
          toggleWallOcclusion,
          setWallOcclusionEnabled,
          occludingWallIds, // Transient - recalculated on each render
          setOccludingWallIds,
          // Three.js state (transient - set when Scene mounts)
          threeRenderer,
          threeScene,
          setThreeState,
          clearThreeState,
          ...rest
        } = state as any;
        return rest;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<StoreState>;

        // Deep merge snapSettings to ensure new defaults are applied
        const mergedSnapSettings = {
          ...currentState.snapSettings,
          ...persisted.snapSettings,
          // Ensure new fields have defaults if not in persisted state
          snapGap: persisted.snapSettings?.snapGap ?? currentState.snapSettings.snapGap,
          collisionMargin:
            persisted.snapSettings?.collisionMargin ?? currentState.snapSettings.collisionMargin,
        };

        return {
          ...currentState,
          ...persisted,
          snapSettings: mergedSnapSettings,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (isDev()) {
          if (state) {
            console.log("[Store] Hydrated from localStorage:", {
              currentProjectId: state.currentProjectId,
              currentProjectName: state.currentProjectName,
              currentProjectRevision: state.currentProjectRevision,
            });
          } else {
            console.log("[Store] Hydration failed or no persisted state");
          }
        }
      },
    }
  )
);

export const useSelectedFurnitureParts = () => {
  const parts = useStore((state) => state.parts);
  const selectedFurnitureId = useStore((state) => state.selectedFurnitureId);
  return parts.filter((p) => p.furnitureId === selectedFurnitureId);
};

export const useSelectedPart = () => {
  const parts = useStore((state) => state.parts);
  const selectedPartId = useStore((state) => state.selectedPartId);
  return parts.find((p) => p.id === selectedPartId);
};

export const useMaterial = (id: string | undefined) => {
  return useStore((state) => state.materials.find((m) => m.id === id));
};

export const useCabinetParts = (cabinetId: string) => {
  return useStore((state) => state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId));
};

export const useSelectedCabinet = () => {
  const cabinets = useStore((state) => state.cabinets);
  const selectedCabinetId = useStore((state) => state.selectedCabinetId);
  return cabinets.find((c) => c.id === selectedCabinetId);
};

export const useCabinet = (id: string | undefined) => {
  return useStore((state) => state.cabinets.find((c) => c.id === id));
};

/**
 * Get all selected parts (for multiselect)
 */
export const useSelectedParts = () => {
  const parts = useStore((state) => state.parts);
  const selectedPartIds = useStore((state) => state.selectedPartIds);
  return parts.filter((p) => selectedPartIds.has(p.id));
};

/**
 * Check if multiselect is active (more than 1 part selected)
 */
export const useIsMultiSelectActive = () => {
  return useStore((state) => state.selectedPartIds.size > 1);
};

/**
 * PERFORMANCE: Check if a specific part is hidden
 * This selector returns a primitive boolean, so Part3D only re-renders
 * when THIS part's hidden status changes, not when ANY hidden part changes.
 */
export const useIsPartHidden = (partId: string) => {
  return useStore((state) => state.hiddenPartIds.has(partId));
};

/**
 * Get total count of hidden parts (for UI indicators)
 */
export const useHiddenPartsCount = () => {
  return useStore((state) => state.hiddenPartIds.size);
};

/**
 * Get interior material preferences for last used materials
 */
export const useInteriorMaterialPreferences = () => {
  return useStore((state) => state.interiorMaterialPreferences);
};

/**
 * Get countertop groups for the current furniture
 */
export const useCountertopGroups = () => {
  const countertopGroups = useStore((state) => state.countertopGroups);
  const selectedFurnitureId = useStore((state) => state.selectedFurnitureId);
  return countertopGroups.filter((g) => g.furnitureId === selectedFurnitureId);
};

/**
 * Get selected countertop group
 */
export const useSelectedCountertopGroup = () => {
  const countertopGroups = useStore((state) => state.countertopGroups);
  const selectedCountertopGroupId = useStore((state) => state.selectedCountertopGroupId);
  return countertopGroups.find((g) => g.id === selectedCountertopGroupId);
};

/**
 * Get countertop group for a specific cabinet
 */
export const useCountertopGroupForCabinet = (cabinetId: string | undefined) => {
  const countertopGroups = useStore((state) => state.countertopGroups);
  if (!cabinetId) return undefined;
  return countertopGroups.find((g) => g.segments.some((s) => s.cabinetIds.includes(cabinetId)));
};

/**
 * Get cabinet preferences for all types
 */
export const useCabinetPreferences = () => {
  return useStore((state) => state.cabinetPreferences);
};

// =============================================================================
// Project Selectors (optimized to minimize re-renders)
// =============================================================================

/**
 * PERFORMANCE: Get only sync status (primitive value)
 * Components that only need status won't re-render when other syncState fields change.
 */
export const useSyncStatus = () => {
  return useStore((state) => state.syncState.status);
};

/**
 * PERFORMANCE: Check if there are unsaved changes
 * Returns a primitive boolean instead of the full syncState object.
 */
export const useHasUnsavedChanges = () => {
  return useStore(
    (state) =>
      state.currentProjectId !== null &&
      !state.isProjectLoading &&
      (state.syncState.status === "local_only" || state.syncState.status === "error")
  );
};

/**
 * PERFORMANCE: Check if project is in conflict state
 */
export const useHasConflict = () => {
  return useStore((state) => state.syncState.status === "conflict");
};

/**
 * PERFORMANCE: Check if project is currently syncing
 */
export const useIsSyncing = () => {
  return useStore((state) => state.syncState.status === "syncing");
};

/**
 * Get current project ID only
 */
export const useCurrentProjectId = () => {
  return useStore((state) => state.currentProjectId);
};

/**
 * Get current project name only
 */
export const useCurrentProjectName = () => {
  return useStore((state) => state.currentProjectName);
};

/**
 * Check if a project is loaded
 */
export const useHasProject = () => {
  return useStore((state) => state.currentProjectId !== null);
};

/**
 * Check if project is loading
 */
export const useIsProjectLoading = () => {
  return useStore((state) => state.isProjectLoading);
};
