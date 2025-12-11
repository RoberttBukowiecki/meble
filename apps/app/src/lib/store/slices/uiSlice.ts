import type { StoreSlice } from '../types';

export interface UISlice {
  isShiftPressed: boolean;
  setShiftPressed: (pressed: boolean) => void;
}

export const createUISlice: StoreSlice<UISlice> = (set) => ({
  isShiftPressed: false,
  setShiftPressed: (pressed: boolean) => set({ isShiftPressed: pressed }),
});
