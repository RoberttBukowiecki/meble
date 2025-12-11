import type { CollisionSlice, StoreSlice } from '../types';
import { detectCollisions as detectCollisionsFn } from '../../collisionDetection';

export const createCollisionSlice: StoreSlice<CollisionSlice> = (set, get) => ({
  collisions: [],

  detectCollisions: () => {
    const state = get();
    const selectedFurnitureParts = state.parts.filter(
      (p) => p.furnitureId === state.selectedFurnitureId
    );

    const collisions = detectCollisionsFn(selectedFurnitureParts);

    set({ collisions });
  },
});
