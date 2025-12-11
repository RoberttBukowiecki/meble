jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-default-furniture-id') }));

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { DEFAULT_FURNITURE_ID } from '../constants';
import { createSelectionSlice } from './selectionSlice';
import type { SelectionSlice } from '../types';

const createSelectionStore = () =>
  create<SelectionSlice>()(
    createSelectionSlice as unknown as StateCreator<
      SelectionSlice,
      [],
      [],
      SelectionSlice
    >
  );

describe('selectionSlice', () => {
  it('initializes with default selection values', () => {
    const store = createSelectionStore();
    const state = store.getState();

    expect(state.selectedPartId).toBeNull();
    expect(state.selectedCabinetId).toBeNull();
    expect(state.selectedFurnitureId).toBe(DEFAULT_FURNITURE_ID);
    expect(state.isTransforming).toBe(false);
    expect(state.transformMode).toBe('translate');
  });

  it('sets selected furniture and clears part selection', () => {
    const store = createSelectionStore();

    store.getState().selectPart('part-1');
    store.getState().setSelectedFurniture('furniture-2');

    const state = store.getState();
    expect(state.selectedFurnitureId).toBe('furniture-2');
    expect(state.selectedPartId).toBeNull();
  });

  it('selects part and clears cabinet selection', () => {
    const store = createSelectionStore();

    store.getState().selectCabinet('cabinet-1');
    store.getState().selectPart('part-2');

    const state = store.getState();
    expect(state.selectedPartId).toBe('part-2');
    expect(state.selectedCabinetId).toBeNull();
  });

  it('selects cabinet and clears part selection', () => {
    const store = createSelectionStore();

    store.getState().selectPart('part-3');
    store.getState().selectCabinet('cabinet-2');

    const state = store.getState();
    expect(state.selectedCabinetId).toBe('cabinet-2');
    expect(state.selectedPartId).toBeNull();
  });

  it('updates transform flags and mode', () => {
    const store = createSelectionStore();

    store.getState().setIsTransforming(true);
    store.getState().setTransformMode('rotate');

    const state = store.getState();
    expect(state.isTransforming).toBe(true);
    expect(state.transformMode).toBe('rotate');
  });
});
