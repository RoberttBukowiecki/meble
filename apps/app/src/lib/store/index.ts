import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSelectionSlice } from './slices/selectionSlice';
import { createMaterialsSlice } from './slices/materialsSlice';
import { createFurnitureSlice } from './slices/furnitureSlice';
import { createPartsSlice } from './slices/partsSlice';
import { createCabinetSlice } from './slices/cabinetSlice';
import { createCollisionSlice } from './slices/collisionSlice';
import { createHistorySlice } from './slices/historySlice';
import { createUISlice } from './slices/uiSlice';
import { createSnapSlice } from './slices/snapSlice';
import { HISTORY_MAX_LENGTH, HISTORY_MAX_MILESTONES } from './history/constants';
import { MATERIAL_IDS, INITIAL_MATERIALS } from './constants';
import { DEFAULT_BACK_OVERLAP_RATIO, DEFAULT_DOOR_CONFIG } from '../config';
import type { StoreState } from './types';

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createSelectionSlice(...args),
      ...createMaterialsSlice(...args),
      ...createFurnitureSlice(...args),
      ...createPartsSlice(...args),
      ...createCabinetSlice(...args),
      ...createCollisionSlice(...args),
      ...createHistorySlice(...args),
      ...createUISlice(...args),
      ...createSnapSlice(...args),
    }),
    {
      name: 'meblarz-storage',
      version: 5,
      migrate: (persistedState: any, version: number) => {
        // Migrate from version 1 to 2
        if (version === 1) {
          persistedState = {
            ...persistedState,
            cabinets: [],
            selectedCabinetId: null,
            collisions: [],
          };
        }

        // Migrate from version 2 to 3 (add history)
        if (version < 3) {
          persistedState = {
            ...persistedState,
            collisions: persistedState.collisions || [],
            // Initialize history fields
            undoStack: [],
            redoStack: [],
            milestoneStack: [],
            inFlightBatch: null,
            limit: HISTORY_MAX_LENGTH,
            milestoneLimit: HISTORY_MAX_MILESTONES,
            approxByteSize: 0,
            timelineCursor: null,
          };
        }

        // Migrate from version 3 to 4 (add HDF material and back panel params)
        if (version < 4) {
          // Add HDF material if it doesn't exist
          const materials = persistedState.materials || [];
          const hasHdf = materials.some((m: any) => m.category === 'hdf' || m.id === MATERIAL_IDS.HDF_BIALY);

          if (!hasHdf) {
            const hdfMaterial = INITIAL_MATERIALS.find((m) => m.id === MATERIAL_IDS.HDF_BIALY);
            if (hdfMaterial) {
              materials.push({ ...hdfMaterial });
            }
          }

          // Add category to existing materials if not present
          persistedState.materials = materials.map((m: any) => ({
            ...m,
            category: m.category || 'board',
          }));

          // Update existing cabinets with back panel params
          if (persistedState.cabinets) {
            persistedState.cabinets = persistedState.cabinets.map((cabinet: any) => ({
              ...cabinet,
              params: {
                ...cabinet.params,
                hasBack: cabinet.params.hasBack ?? true,
                backOverlapRatio: cabinet.params.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO,
                backMountType: cabinet.params.backMountType ?? 'overlap',
              },
              materials: {
                ...cabinet.materials,
                backMaterialId: cabinet.materials.backMaterialId ?? MATERIAL_IDS.HDF_BIALY,
              },
            }));
          }
        }

        // Migrate from version 4 to 5 (add door configuration)
        if (version < 5) {
          // Add default doorConfig to existing kitchen cabinets with doors
          if (persistedState.cabinets) {
            persistedState.cabinets = persistedState.cabinets.map((cabinet: any) => {
              if (cabinet.params?.type === 'KITCHEN' && cabinet.params?.hasDoors && !cabinet.params.doorConfig) {
                return {
                  ...cabinet,
                  params: {
                    ...cabinet.params,
                    doorConfig: DEFAULT_DOOR_CONFIG,
                  },
                };
              }
              return cabinet;
            });
          }
        }

        return persistedState;
      },
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
          // UI state (don't persist keyboard state)
          isShiftPressed,
          // Snap functions (snapEnabled and snapSettings ARE persisted)
          toggleSnap,
          setSnapEnabled,
          updateSnapSettings,
          ...rest
        } = state as any;
        return rest;
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
  return useStore((state) =>
    state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId)
  );
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
