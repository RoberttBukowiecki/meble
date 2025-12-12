import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { createDimensionSlice, type DimensionSlice } from './dimensionSlice';

const createDimensionStore = () =>
  create<DimensionSlice>()(
    createDimensionSlice as unknown as StateCreator<DimensionSlice, [], [], DimensionSlice>
  );

describe('dimensionSlice', () => {
  it('initializes with default settings', () => {
    const store = createDimensionStore();

    expect(store.getState().dimensionSettings).toEqual({
      enabled: true,
      maxVisiblePerAxis: 3,
      maxDistanceThreshold: 1000,
      showAxisColors: false,
    });
  });

  it('sets dimension enabled flag without touching other settings', () => {
    const store = createDimensionStore();

    store.getState().setDimensionEnabled(false);

    expect(store.getState().dimensionSettings).toEqual({
      enabled: false,
      maxVisiblePerAxis: 3,
      maxDistanceThreshold: 1000,
      showAxisColors: false,
    });
  });

  it('merges partial dimension settings updates', () => {
    const store = createDimensionStore();

    store.getState().setDimensionEnabled(false);
    store.getState().updateDimensionSettings({ maxVisiblePerAxis: 5, showAxisColors: true });

    expect(store.getState().dimensionSettings).toEqual({
      enabled: false,
      maxVisiblePerAxis: 5,
      maxDistanceThreshold: 1000,
      showAxisColors: true,
    });
  });
});
