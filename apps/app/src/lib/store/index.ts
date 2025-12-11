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
import { HISTORY_MAX_LENGTH, HISTORY_MAX_MILESTONES } from './history/constants';
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
    }),
    {
      name: 'meblarz-storage',
      version: 3,
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
          return {
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
          addMaterial,
          updateMaterial,
          removeMaterial,
          addCabinet,
          updateCabinet,
          renameCabinet,
          updateCabinetParams,
          removeCabinet,
          duplicateCabinet,
          selectCabinet,
          detectCollisions,
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
