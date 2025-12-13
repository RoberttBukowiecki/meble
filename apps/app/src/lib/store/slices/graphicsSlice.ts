import { StateCreator } from 'zustand';
import { StoreState, GraphicsSlice } from '../types';
import { DEFAULT_GRAPHICS_SETTINGS } from '@/lib/config';

export const createGraphicsSlice: StateCreator<StoreState, [['zustand/persist', unknown]], [], GraphicsSlice> = (set) => ({
  graphicsSettings: { ...DEFAULT_GRAPHICS_SETTINGS },
  updateGraphicsSettings: (settings) =>
    set((state) => ({
      graphicsSettings: { ...state.graphicsSettings, ...settings },
    })),
});
