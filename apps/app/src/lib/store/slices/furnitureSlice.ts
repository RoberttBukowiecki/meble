import { INITIAL_FURNITURES, DEFAULT_FURNITURE_ID } from '../constants';
import type { FurnitureSlice, StoreSlice } from '../types';
import type { Furniture } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const createFurnitureSlice: StoreSlice<FurnitureSlice> = (set) => ({
  furnitures: INITIAL_FURNITURES,

  addFurniture: (name: string) => {
    const newFurniture: Furniture = {
      id: uuidv4(),
      name,
    };
    set((state) => ({
      furnitures: [...state.furnitures, newFurniture],
    }));
  },

  removeFurniture: (id: string) => {
    set((state) => ({
      furnitures: state.furnitures.filter((f) => f.id !== id),
      parts: state.parts.filter((p) => p.furnitureId !== id),
      selectedFurnitureId:
        state.selectedFurnitureId === id
          ? state.furnitures[0]?.id || DEFAULT_FURNITURE_ID
          : state.selectedFurnitureId,
      selectedPartId:
        state.parts.find((p) => p.id === state.selectedPartId)?.furnitureId === id
          ? null
          : state.selectedPartId,
    }));
  },
});
