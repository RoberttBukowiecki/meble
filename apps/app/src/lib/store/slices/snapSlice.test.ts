import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { createSnapSlice, type SnapSlice } from './snapSlice';

const createSnapStore = () =>
  create<SnapSlice>()(
    createSnapSlice as unknown as StateCreator<SnapSlice, [], [], SnapSlice>
  );

describe('snapSlice', () => {
  it('initializes with default snap settings', () => {
    const store = createSnapStore();
    const state = store.getState();

    expect(state.snapEnabled).toBe(true);
    expect(state.snapSettings).toEqual({
      distance: 20,
      showGuides: true,
      magneticPull: false,
      strengthCurve: 'linear',
      edgeSnap: true,
      faceSnap: true,
      collisionOffset: 1,
    });
  });

  it('toggles snap flag', () => {
    const store = createSnapStore();

    store.getState().toggleSnap();
    expect(store.getState().snapEnabled).toBe(false);

    store.getState().toggleSnap();
    expect(store.getState().snapEnabled).toBe(true);
  });

  it('sets snap enabled explicitly', () => {
    const store = createSnapStore();

    store.getState().setSnapEnabled(false);
    expect(store.getState().snapEnabled).toBe(false);

    store.getState().setSnapEnabled(true);
    expect(store.getState().snapEnabled).toBe(true);
  });

  it('merges partial snap settings updates', () => {
    const store = createSnapStore();

    store.getState().updateSnapSettings({ distance: 35, magneticPull: true });

    expect(store.getState().snapSettings).toEqual({
      distance: 35,
      showGuides: true,
      magneticPull: true,
      strengthCurve: 'linear',
      edgeSnap: true,
      faceSnap: true,
      collisionOffset: 1,
    });
  });
});
