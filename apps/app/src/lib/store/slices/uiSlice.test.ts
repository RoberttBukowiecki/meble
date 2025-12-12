import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { createUISlice, type UISlice } from './uiSlice';

const createUIStore = () =>
  create<UISlice>()(
    createUISlice as unknown as StateCreator<UISlice, [], [], UISlice>
  );

describe('uiSlice', () => {
  it('initializes with default UI state', () => {
    const store = createUIStore();
    const state = store.getState();

    expect(state.isShiftPressed).toBe(false);
    expect(state.showGrid).toBe(true);
    expect(state.hiddenPartIds.size).toBe(0);
  });

  it('updates shift flag and toggles grid visibility', () => {
    const store = createUIStore();

    store.getState().setShiftPressed(true);
    expect(store.getState().isShiftPressed).toBe(true);

    store.getState().toggleGrid();
    expect(store.getState().showGrid).toBe(false);

    store.getState().toggleGrid();
    expect(store.getState().showGrid).toBe(true);
  });

  it('toggles hidden state for provided parts', () => {
    const store = createUIStore();

    store.getState().togglePartsHidden(['p1', 'p2']);
    expect(store.getState().hiddenPartIds).toEqual(new Set(['p1', 'p2']));

    store.getState().togglePartsHidden(['p1', 'p2']);
    expect(store.getState().hiddenPartIds.size).toBe(0);
  });

  it('hides and shows parts incrementally', () => {
    const store = createUIStore();

    store.getState().hideParts(['p1', 'p2']);
    store.getState().hideParts(['p2', 'p3']);
    expect(store.getState().hiddenPartIds).toEqual(new Set(['p1', 'p2', 'p3']));

    store.getState().showParts(['p2']);
    expect(store.getState().hiddenPartIds).toEqual(new Set(['p1', 'p3']));

    store.getState().togglePartsHidden([]);
    expect(store.getState().hiddenPartIds).toEqual(new Set(['p1', 'p3']));
  });

  it('shows all parts when requested', () => {
    const store = createUIStore();

    store.getState().hideParts(['p1', 'p2']);
    store.getState().showAllParts();

    expect(store.getState().hiddenPartIds.size).toBe(0);
  });
});
