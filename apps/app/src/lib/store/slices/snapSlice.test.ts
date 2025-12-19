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
      debug: false,
      edgeSnap: true,
      faceSnap: true,
      tJointSnap: true,
      collisionOffset: 1,
      version: 'v3', // V3 is default - movement-aware face-to-face snapping
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

    store.getState().updateSnapSettings({ distance: 35, debug: true });

    expect(store.getState().snapSettings).toEqual({
      distance: 35,
      showGuides: true,
      debug: true,
      edgeSnap: true,
      faceSnap: true,
      tJointSnap: true,
      collisionOffset: 1,
      version: 'v3',
    });
  });

  it('sets snap version to v2', () => {
    const store = createSnapStore();

    store.getState().setSnapVersion('v2');
    expect(store.getState().snapSettings.version).toBe('v2');
  });

  it('sets snap version to v3', () => {
    const store = createSnapStore();

    store.getState().setSnapVersion('v2');
    store.getState().setSnapVersion('v3');
    expect(store.getState().snapSettings.version).toBe('v3');
  });

  it('updates snap version via updateSnapSettings', () => {
    const store = createSnapStore();

    store.getState().updateSnapSettings({ version: 'v2' });
    expect(store.getState().snapSettings.version).toBe('v2');
  });
});
