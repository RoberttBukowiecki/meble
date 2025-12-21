import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import {
  createCabinetPreferencesSlice,
  type CabinetPreferencesSlice,
} from './cabinetPreferencesSlice';
import type { CabinetParams, KitchenCabinetParams } from '@/types';
import type { CabinetTypePreferences } from '@/lib/cabinetDefaults';

const createPreferencesStore = () =>
  create<CabinetPreferencesSlice>()(
    createCabinetPreferencesSlice as unknown as StateCreator<
      CabinetPreferencesSlice,
      [],
      [],
      CabinetPreferencesSlice
    >
  );

describe('cabinetPreferencesSlice', () => {
  describe('initialization', () => {
    it('initializes with empty preferences', () => {
      const store = createPreferencesStore();

      expect(store.getState().cabinetPreferences).toEqual({});
    });
  });

  describe('getCabinetPreferences', () => {
    it('returns undefined for unknown cabinet type', () => {
      const store = createPreferencesStore();

      const preferences = store.getState().getCabinetPreferences('KITCHEN');

      expect(preferences).toBeUndefined();
    });

    it('returns stored preferences for cabinet type', () => {
      const store = createPreferencesStore();
      const kitchenPrefs: CabinetTypePreferences = {
        legs: {
          enabled: true,
          legType: {
            preset: 'TALL',
            height: 150,
            adjustRange: 30,
            diameter: 35,
            shape: 'ROUND',
            finish: 'CHROME',
          },
          countMode: 'AUTO',
          currentHeight: 150,
          cornerInset: 30,
        },
      };

      store.getState().setCabinetPreferences('KITCHEN', kitchenPrefs);
      const preferences = store.getState().getCabinetPreferences('KITCHEN');

      expect(preferences).toEqual(kitchenPrefs);
    });
  });

  describe('setCabinetPreferences', () => {
    it('sets preferences for a cabinet type', () => {
      const store = createPreferencesStore();
      const preferences: CabinetTypePreferences = {
        legs: {
          enabled: true,
          legType: {
            preset: 'STANDARD',
            height: 100,
            adjustRange: 20,
            diameter: 30,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 100,
          cornerInset: 30,
        },
      };

      store.getState().setCabinetPreferences('KITCHEN', preferences);

      expect(store.getState().cabinetPreferences.KITCHEN).toEqual(preferences);
    });

    it('overwrites existing preferences for a cabinet type', () => {
      const store = createPreferencesStore();

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'SHORT',
            height: 50,
            adjustRange: 10,
            diameter: 25,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 50,
          cornerInset: 25,
        },
      });

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'TALL',
            height: 150,
            adjustRange: 30,
            diameter: 40,
            shape: 'SQUARE',
            finish: 'CHROME',
          },
          countMode: 'MANUAL',
          manualCount: 6,
          currentHeight: 150,
          cornerInset: 40,
        },
      });

      expect(store.getState().cabinetPreferences.KITCHEN?.legs?.legType.preset).toBe('TALL');
      expect(store.getState().cabinetPreferences.KITCHEN?.legs?.countMode).toBe('MANUAL');
    });

    it('preserves preferences for other cabinet types', () => {
      const store = createPreferencesStore();

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'STANDARD',
            height: 100,
            adjustRange: 20,
            diameter: 30,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 100,
          cornerInset: 30,
        },
      });

      store.getState().setCabinetPreferences('DRAWER', {
        legs: {
          enabled: true,
          legType: {
            preset: 'SHORT',
            height: 50,
            adjustRange: 10,
            diameter: 25,
            shape: 'ROUND',
            finish: 'WHITE_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 50,
          cornerInset: 25,
        },
      });

      expect(store.getState().cabinetPreferences.KITCHEN).toBeDefined();
      expect(store.getState().cabinetPreferences.DRAWER).toBeDefined();
      expect(store.getState().cabinetPreferences.KITCHEN?.legs?.legType.finish).toBe('BLACK_PLASTIC');
      expect(store.getState().cabinetPreferences.DRAWER?.legs?.legType.finish).toBe('WHITE_PLASTIC');
    });
  });

  describe('saveCabinetPreferencesFromParams', () => {
    it('extracts and saves legs preferences from params', () => {
      const store = createPreferencesStore();
      const params: CabinetParams = {
        type: 'KITCHEN',
        width: 800,
        height: 720,
        depth: 580,
        shelfCount: 1,
        hasDoors: true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
        legs: {
          enabled: true,
          legType: {
            preset: 'TALL',
            height: 150,
            adjustRange: 30,
            diameter: 35,
            shape: 'SQUARE',
            finish: 'CHROME',
          },
          countMode: 'AUTO',
          currentHeight: 150,
          cornerInset: 35,
        },
      };

      store.getState().saveCabinetPreferencesFromParams('KITCHEN', params);

      const saved = store.getState().cabinetPreferences.KITCHEN;
      expect(saved?.legs).toBeDefined();
      expect(saved?.legs?.legType.preset).toBe('TALL');
      expect(saved?.legs?.legType.finish).toBe('CHROME');
    });

    it('extracts and saves countertop preferences from params', () => {
      const store = createPreferencesStore();
      const params: KitchenCabinetParams = {
        type: 'KITCHEN',
        width: 800,
        height: 720,
        depth: 580,
        shelfCount: 1,
        hasDoors: true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
        countertopConfig: {
          hasCountertop: true,
          materialId: 'blat-orzech',
          thicknessOverride: 40,
        },
      };

      store.getState().saveCabinetPreferencesFromParams('KITCHEN', params);

      const saved = store.getState().cabinetPreferences.KITCHEN;
      expect(saved?.countertopConfig).toBeDefined();
      expect(saved?.countertopConfig?.materialId).toBe('blat-orzech');
      expect(saved?.countertopConfig?.thicknessOverride).toBe(40);
    });

    it('extracts and saves door and handle configuration', () => {
      const store = createPreferencesStore();
      const params: KitchenCabinetParams = {
        type: 'KITCHEN',
        width: 800,
        height: 720,
        depth: 580,
        shelfCount: 1,
        hasDoors: true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
        doorConfig: {
          layout: 'SINGLE',
          openingDirection: 'HORIZONTAL',
          hingeSide: 'RIGHT',
        },
        handleConfig: {
          type: 'BAR',
          category: 'TRADITIONAL',
          position: { preset: 'MIDDLE_RIGHT' },
          orientation: 'VERTICAL',
          finish: 'brushed_nickel',
        },
      };

      store.getState().saveCabinetPreferencesFromParams('KITCHEN', params);

      const saved = store.getState().cabinetPreferences.KITCHEN;
      expect(saved?.doorConfig).toBeDefined();
      expect(saved?.doorConfig?.layout).toBe('SINGLE');
      expect(saved?.doorConfig?.hingeSide).toBe('RIGHT');
      expect(saved?.handleConfig).toBeDefined();
      expect(saved?.handleConfig?.type).toBe('BAR');
      expect(saved?.handleConfig?.finish).toBe('brushed_nickel');
    });

    it('handles params with no inheritable fields', () => {
      const store = createPreferencesStore();
      const params: CabinetParams = {
        type: 'BOOKSHELF',
        width: 900,
        height: 1800,
        depth: 300,
        shelfCount: 4,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

      store.getState().saveCabinetPreferencesFromParams('BOOKSHELF', params);

      const saved = store.getState().cabinetPreferences.BOOKSHELF;
      expect(saved).toBeDefined();
      expect(saved?.legs).toBeUndefined();
      expect(saved?.countertopConfig).toBeUndefined();
    });
  });

  describe('clearCabinetPreferences', () => {
    it('clears preferences for a specific cabinet type', () => {
      const store = createPreferencesStore();

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'STANDARD',
            height: 100,
            adjustRange: 20,
            diameter: 30,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 100,
          cornerInset: 30,
        },
      });

      store.getState().clearCabinetPreferences('KITCHEN');

      expect(store.getState().cabinetPreferences.KITCHEN).toBeUndefined();
    });

    it('preserves preferences for other cabinet types when clearing one', () => {
      const store = createPreferencesStore();

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'STANDARD',
            height: 100,
            adjustRange: 20,
            diameter: 30,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 100,
          cornerInset: 30,
        },
      });

      store.getState().setCabinetPreferences('DRAWER', {
        legs: {
          enabled: true,
          legType: {
            preset: 'SHORT',
            height: 50,
            adjustRange: 10,
            diameter: 25,
            shape: 'ROUND',
            finish: 'WHITE_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 50,
          cornerInset: 25,
        },
      });

      store.getState().clearCabinetPreferences('KITCHEN');

      expect(store.getState().cabinetPreferences.KITCHEN).toBeUndefined();
      expect(store.getState().cabinetPreferences.DRAWER).toBeDefined();
    });
  });

  describe('resetAllCabinetPreferences', () => {
    it('clears all preferences', () => {
      const store = createPreferencesStore();

      store.getState().setCabinetPreferences('KITCHEN', {
        legs: {
          enabled: true,
          legType: {
            preset: 'STANDARD',
            height: 100,
            adjustRange: 20,
            diameter: 30,
            shape: 'ROUND',
            finish: 'BLACK_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 100,
          cornerInset: 30,
        },
      });

      store.getState().setCabinetPreferences('DRAWER', {
        legs: {
          enabled: true,
          legType: {
            preset: 'SHORT',
            height: 50,
            adjustRange: 10,
            diameter: 25,
            shape: 'ROUND',
            finish: 'WHITE_PLASTIC',
          },
          countMode: 'AUTO',
          currentHeight: 50,
          cornerInset: 25,
        },
      });

      store.getState().setCabinetPreferences('WARDROBE', {
        doorConfig: {
          layout: 'DOUBLE',
          openingDirection: 'HORIZONTAL',
        },
      });

      store.getState().resetAllCabinetPreferences();

      expect(store.getState().cabinetPreferences).toEqual({});
    });
  });

  describe('preference inheritance workflow', () => {
    it('simulates full workflow: save from one cabinet, apply to next', () => {
      const store = createPreferencesStore();

      // First cabinet creation - save preferences
      const firstCabinetParams: KitchenCabinetParams = {
        type: 'KITCHEN',
        width: 800,
        height: 720,
        depth: 580,
        shelfCount: 1,
        hasDoors: true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
        legs: {
          enabled: true,
          legType: {
            preset: 'TALL',
            height: 150,
            adjustRange: 30,
            diameter: 40,
            shape: 'SQUARE',
            finish: 'BRUSHED_STEEL',
          },
          countMode: 'MANUAL',
          manualCount: 6,
          currentHeight: 150,
          cornerInset: 40,
        },
        countertopConfig: {
          hasCountertop: true,
          materialId: 'blat-marmur',
          thicknessOverride: 40,
        },
        doorConfig: {
          layout: 'SINGLE',
          openingDirection: 'HORIZONTAL',
          hingeSide: 'LEFT',
        },
        handleConfig: {
          type: 'STRIP',
          category: 'TRADITIONAL',
          position: { preset: 'TOP_CENTER' },
          orientation: 'HORIZONTAL',
          finish: 'gold',
        },
      };

      store.getState().saveCabinetPreferencesFromParams('KITCHEN', firstCabinetParams);

      // Verify preferences were saved
      const savedPrefs = store.getState().getCabinetPreferences('KITCHEN');
      expect(savedPrefs).toBeDefined();
      expect(savedPrefs?.legs?.legType.preset).toBe('TALL');
      expect(savedPrefs?.legs?.legType.finish).toBe('BRUSHED_STEEL');
      expect(savedPrefs?.countertopConfig?.materialId).toBe('blat-marmur');
      expect(savedPrefs?.doorConfig?.layout).toBe('SINGLE');
      expect(savedPrefs?.handleConfig?.type).toBe('STRIP');
      expect(savedPrefs?.handleConfig?.finish).toBe('gold');
    });
  });
});
