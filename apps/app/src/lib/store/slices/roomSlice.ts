import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { RoomSlice } from '../types'; // Wait, I need to add RoomSlice to types.ts first or define it here?
// Usually defined in types.ts if exported, but here I can define it if not circular.
// But StoreState imports it. 
// Let's define the interface in types.ts or just rely on ProjectState for now.
// ProjectState has the fields.
// Let's match the ProjectState signature.

export const createRoomSlice: StateCreator<StoreState, [['zustand/persist', unknown]], [], Pick<StoreState, 'rooms' | 'walls' | 'openings' | 'lights' | 'activeRoomId' | 'addRoom' | 'updateRoom' | 'removeRoom' | 'setActiveRoom' | 'addWall' | 'updateWall' | 'removeWall' | 'updateWalls' | 'setRoomWalls' | 'addOpening' | 'updateOpening' | 'removeOpening' | 'addLight' | 'updateLight' | 'removeLight'>> = (set) => ({
  rooms: [],
  walls: [],
  openings: [],
  lights: [],
  activeRoomId: null,

  addRoom: (room) =>
    set((state) => ({ rooms: [...state.rooms, room] })),

  updateRoom: (id, patch) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== id),
      walls: state.walls.filter((w) => w.roomId !== id),
      openings: state.openings.filter((o) => {
        const wall = state.walls.find((w) => w.id === o.wallId);
        return wall && wall.roomId !== id;
      }),
      activeRoomId: state.activeRoomId === id ? null : state.activeRoomId,
    })),

  setActiveRoom: (id) => set({ activeRoomId: id }),

  addWall: (wall) =>
    set((state) => ({ walls: [...state.walls, wall] })),

  updateWall: (id, patch) =>
    set((state) => ({
      walls: state.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    })),

  removeWall: (id) =>
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== id),
      openings: state.openings.filter((o) => o.wallId !== id),
    })),

  updateWalls: (newWalls) =>
    set((state) => {
      const newIds = new Set(newWalls.map((w) => w.id));
      const filteredOld = state.walls.filter((w) => !newIds.has(w.id));
      return { walls: [...filteredOld, ...newWalls] };
    }),

  setRoomWalls: (roomId, newWalls) =>
    set((state) => {
      // 1. Remove old walls for this room
      const wallsToKeep = state.walls.filter((w) => w.roomId !== roomId);
      
      // 2. Determine which openings to keep
      // We want to keep openings if their wallId still exists in the NEW walls list.
      // However, if the user deleted a wall in the editor, its openings should be removed.
      const newWallIds = new Set(newWalls.map(w => w.id));
      
      const openingsToKeep = state.openings.filter((o) => {
        // Keep if it belongs to another room (i.e. its wall is in wallsToKeep)
        const belongsToOtherRoom = wallsToKeep.some(w => w.id === o.wallId);
        if (belongsToOtherRoom) return true;
        
        // Keep if it belongs to this room AND the wall still exists
        return newWallIds.has(o.wallId);
      });

      return {
        walls: [...wallsToKeep, ...newWalls],
        openings: openingsToKeep
      };
    }),

  addOpening: (opening) =>
    set((state) => ({ openings: [...state.openings, opening] })),

  updateOpening: (id, patch) =>
    set((state) => ({
      openings: state.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  removeOpening: (id) =>
    set((state) => ({ openings: state.openings.filter((o) => o.id !== id) })),

  addLight: (light) =>
    set((state) => ({ lights: [...(state.lights || []), light] })),

  updateLight: (id, patch) =>
    set((state) => ({
      lights: (state.lights || []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  removeLight: (id) =>
    set((state) => ({ lights: (state.lights || []).filter((l) => l.id !== id) })),
});
