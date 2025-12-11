import { DEFAULT_FURNITURE_ID } from '../constants';
import type { SelectionSlice, StoreSlice } from '../types';

export const createSelectionSlice: StoreSlice<SelectionSlice> = (set) => ({
  selectedPartId: null,
  selectedCabinetId: null,
  selectedFurnitureId: DEFAULT_FURNITURE_ID,
  isTransforming: false,
  transformMode: 'translate',

  setSelectedFurniture: (id: string) => {
    set({ selectedFurnitureId: id, selectedPartId: null });
  },

  selectPart: (id: string | null) => {
    set({ selectedPartId: id, selectedCabinetId: null });
  },

  selectCabinet: (id: string | null) => {
    set({ selectedCabinetId: id, selectedPartId: null });
  },

  setIsTransforming: (isTransforming: boolean) => {
    set({ isTransforming });
  },

  setTransformMode: (mode: 'translate' | 'rotate') => {
    set({ transformMode: mode });
  },
});
