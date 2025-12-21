import {
  CABINET_TYPE_FEATURE_DEFAULTS,
  DEFAULT_LEGS_CONFIG,
  DEFAULT_COUNTERTOP_CONFIG,
  getInitialCabinetParams,
  mergeWithPreferences,
  extractPreferences,
  supportsCountertop,
  supportsDoors,
  type CabinetTypePreferences,
} from './cabinetDefaults';
import type { CabinetType, CabinetParams, KitchenCabinetParams } from '@/types';

describe('cabinetDefaults', () => {
  describe('CABINET_TYPE_FEATURE_DEFAULTS', () => {
    it('has defaults for all cabinet types', () => {
      const cabinetTypes: CabinetType[] = [
        'KITCHEN',
        'WARDROBE',
        'BOOKSHELF',
        'DRAWER',
        'WALL',
        'CORNER_INTERNAL',
        'CORNER_EXTERNAL',
      ];

      cabinetTypes.forEach((type) => {
        expect(CABINET_TYPE_FEATURE_DEFAULTS[type]).toBeDefined();
        expect(typeof CABINET_TYPE_FEATURE_DEFAULTS[type].legsEnabled).toBe('boolean');
        expect(typeof CABINET_TYPE_FEATURE_DEFAULTS[type].countertopEnabled).toBe('boolean');
      });
    });

    it('KITCHEN has legs and countertop enabled by default', () => {
      expect(CABINET_TYPE_FEATURE_DEFAULTS.KITCHEN).toEqual({
        legsEnabled: true,
        countertopEnabled: true,
        doorsEnabled: true,
      });
    });

    it('WALL has no legs (wall-mounted)', () => {
      expect(CABINET_TYPE_FEATURE_DEFAULTS.WALL.legsEnabled).toBe(false);
    });

    it('BOOKSHELF has no legs, countertop or doors by default', () => {
      expect(CABINET_TYPE_FEATURE_DEFAULTS.BOOKSHELF).toEqual({
        legsEnabled: false,
        countertopEnabled: false,
        doorsEnabled: false,
      });
    });
  });

  describe('DEFAULT_LEGS_CONFIG', () => {
    it('has enabled set to true', () => {
      expect(DEFAULT_LEGS_CONFIG.enabled).toBe(true);
    });

    it('has valid leg type configuration', () => {
      expect(DEFAULT_LEGS_CONFIG.legType).toBeDefined();
      expect(DEFAULT_LEGS_CONFIG.legType.preset).toBe('STANDARD');
      expect(DEFAULT_LEGS_CONFIG.legType.height).toBe(100);
      expect(DEFAULT_LEGS_CONFIG.legType.shape).toBe('ROUND');
      expect(DEFAULT_LEGS_CONFIG.legType.finish).toBe('BLACK_PLASTIC');
    });

    it('has AUTO count mode', () => {
      expect(DEFAULT_LEGS_CONFIG.countMode).toBe('AUTO');
    });
  });

  describe('DEFAULT_COUNTERTOP_CONFIG', () => {
    it('has countertop enabled', () => {
      expect(DEFAULT_COUNTERTOP_CONFIG.hasCountertop).toBe(true);
    });

    it('does not have materialId set (will be set from store)', () => {
      expect(DEFAULT_COUNTERTOP_CONFIG.materialId).toBeUndefined();
    });
  });

  describe('getInitialCabinetParams', () => {
    it('returns params with legs enabled for KITCHEN', () => {
      const params = getInitialCabinetParams('KITCHEN');

      expect(params.legs).toBeDefined();
      expect(params.legs?.enabled).toBe(true);
    });

    it('returns params with countertop config for KITCHEN', () => {
      const params = getInitialCabinetParams('KITCHEN') as Partial<KitchenCabinetParams>;

      expect(params.countertopConfig).toBeDefined();
      expect(params.countertopConfig?.hasCountertop).toBe(true);
    });

    it('returns params without legs for WALL', () => {
      const params = getInitialCabinetParams('WALL');

      expect(params.legs).toBeUndefined();
    });

    it('returns params without countertop for WARDROBE', () => {
      const params = getInitialCabinetParams('WARDROBE') as Partial<KitchenCabinetParams>;

      expect(params.countertopConfig).toBeUndefined();
    });

    it('returns params without legs for BOOKSHELF', () => {
      const params = getInitialCabinetParams('BOOKSHELF');

      expect(params.legs).toBeUndefined();
    });

    it('includes base preset dimensions', () => {
      const params = getInitialCabinetParams('KITCHEN');

      expect(params.width).toBe(800);
      expect(params.height).toBe(720);
      expect(params.depth).toBe(580);
    });

    it('returns params with legs for DRAWER', () => {
      const params = getInitialCabinetParams('DRAWER');

      expect(params.legs).toBeDefined();
      expect(params.legs?.enabled).toBe(true);
    });

    it('returns params with legs and countertop for CORNER_INTERNAL', () => {
      const params = getInitialCabinetParams('CORNER_INTERNAL') as Partial<KitchenCabinetParams>;

      expect(params.legs).toBeDefined();
      expect(params.legs?.enabled).toBe(true);
      expect(params.countertopConfig).toBeDefined();
      expect(params.countertopConfig?.hasCountertop).toBe(true);
    });
  });

  describe('mergeWithPreferences', () => {
    const baseParams: Partial<CabinetParams> = {
      type: 'KITCHEN',
      width: 800,
      height: 720,
      depth: 580,
      legs: { ...DEFAULT_LEGS_CONFIG },
    };

    it('returns base params when preferences is undefined', () => {
      const result = mergeWithPreferences(baseParams, undefined, 'KITCHEN');

      expect(result).toEqual(baseParams);
    });

    it('returns base params when preferences is empty', () => {
      const result = mergeWithPreferences(baseParams, {}, 'KITCHEN');

      expect(result).toEqual(baseParams);
    });

    it('merges legs configuration from preferences', () => {
      const preferences: CabinetTypePreferences = {
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
      };

      const result = mergeWithPreferences(baseParams, preferences, 'KITCHEN');

      expect(result.legs?.legType.preset).toBe('TALL');
      expect(result.legs?.legType.height).toBe(150);
      expect(result.legs?.legType.finish).toBe('CHROME');
      expect(result.legs?.countMode).toBe('MANUAL');
      expect(result.legs?.manualCount).toBe(6);
    });

    it('merges countertop configuration from preferences for KITCHEN', () => {
      const preferences: CabinetTypePreferences = {
        countertopConfig: {
          hasCountertop: true,
          materialId: 'custom-countertop-material',
          thicknessOverride: 40,
        },
      };

      const result = mergeWithPreferences(baseParams, preferences, 'KITCHEN');
      const kitchenResult = result as Partial<KitchenCabinetParams>;

      expect(kitchenResult.countertopConfig?.materialId).toBe('custom-countertop-material');
      expect(kitchenResult.countertopConfig?.thicknessOverride).toBe(40);
    });

    it('does not merge countertop for non-kitchen types', () => {
      const preferences: CabinetTypePreferences = {
        countertopConfig: {
          hasCountertop: true,
          materialId: 'custom-countertop-material',
        },
      };

      const wardrobeParams: Partial<CabinetParams> = {
        type: 'WARDROBE',
        width: 1000,
        height: 2200,
        depth: 600,
      };

      const result = mergeWithPreferences(wardrobeParams, preferences, 'WARDROBE');

      expect((result as any).countertopConfig).toBeUndefined();
    });

    it('does not merge legs if cabinet type does not support legs', () => {
      const preferences: CabinetTypePreferences = {
        legs: { ...DEFAULT_LEGS_CONFIG },
      };

      const wallParams: Partial<CabinetParams> = {
        type: 'WALL',
        width: 800,
        height: 720,
        depth: 350,
      };

      const result = mergeWithPreferences(wallParams, preferences, 'WALL');

      expect(result.legs).toBeUndefined();
    });

    it('merges door configuration', () => {
      const preferences: CabinetTypePreferences = {
        doorConfig: {
          layout: 'SINGLE',
          openingDirection: 'HORIZONTAL',
          hingeSide: 'RIGHT',
        },
      };

      const result = mergeWithPreferences(baseParams, preferences, 'KITCHEN');

      expect((result as any).doorConfig?.layout).toBe('SINGLE');
      expect((result as any).doorConfig?.hingeSide).toBe('RIGHT');
    });

    it('merges handle configuration', () => {
      const preferences: CabinetTypePreferences = {
        handleConfig: {
          type: 'BAR',
          category: 'TRADITIONAL',
          position: { preset: 'TOP_RIGHT' },
          orientation: 'VERTICAL',
          finish: 'chrome',
        },
      };

      const result = mergeWithPreferences(baseParams, preferences, 'KITCHEN');

      expect((result as any).handleConfig?.type).toBe('BAR');
      expect((result as any).handleConfig?.finish).toBe('chrome');
    });
  });

  describe('extractPreferences', () => {
    it('extracts legs configuration', () => {
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

      const preferences = extractPreferences(params);

      expect(preferences.legs).toBeDefined();
      expect(preferences.legs?.legType.preset).toBe('TALL');
      expect(preferences.legs?.legType.finish).toBe('CHROME');
    });

    it('extracts countertop configuration for kitchen cabinets', () => {
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
          materialId: 'blat-dab',
          thicknessOverride: 40,
        },
      };

      const preferences = extractPreferences(params);

      expect(preferences.countertopConfig).toBeDefined();
      expect(preferences.countertopConfig?.materialId).toBe('blat-dab');
      expect(preferences.countertopConfig?.thicknessOverride).toBe(40);
    });

    it('does NOT extract CNC cutout settings from countertop configuration', () => {
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
          materialId: 'blat-dab',
          cutoutPreset: 'SINK_RECTANGULAR',
          customCutout: { width: 600, height: 400, radius: 20 },
          thicknessOverride: 40,
        },
      };

      const preferences = extractPreferences(params);

      expect(preferences.countertopConfig).toBeDefined();
      expect(preferences.countertopConfig?.materialId).toBe('blat-dab');
      // CNC cutouts should NOT be saved
      expect(preferences.countertopConfig?.cutoutPreset).toBeUndefined();
      expect(preferences.countertopConfig?.customCutout).toBeUndefined();
    });

    it('extracts door configuration', () => {
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
          hingeSide: 'LEFT',
        },
      };

      const preferences = extractPreferences(params);

      expect(preferences.doorConfig).toBeDefined();
      expect(preferences.doorConfig?.layout).toBe('SINGLE');
      expect(preferences.doorConfig?.hingeSide).toBe('LEFT');
    });

    it('extracts handle configuration', () => {
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
        handleConfig: {
          type: 'STRIP',
          category: 'TRADITIONAL',
          position: { preset: 'TOP_CENTER' },
          orientation: 'HORIZONTAL',
          finish: 'black_matte',
        },
      };

      const preferences = extractPreferences(params);

      expect(preferences.handleConfig).toBeDefined();
      expect(preferences.handleConfig?.type).toBe('STRIP');
      expect(preferences.handleConfig?.finish).toBe('black_matte');
    });

    it('returns empty preferences if no inheritable fields are set', () => {
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

      const preferences = extractPreferences(params);

      expect(preferences.legs).toBeUndefined();
      expect(preferences.countertopConfig).toBeUndefined();
      expect(preferences.doorConfig).toBeUndefined();
      expect(preferences.handleConfig).toBeUndefined();
    });
  });

  describe('supportsCountertop', () => {
    it('returns true for KITCHEN', () => {
      expect(supportsCountertop('KITCHEN')).toBe(true);
    });

    it('returns true for CORNER_INTERNAL', () => {
      expect(supportsCountertop('CORNER_INTERNAL')).toBe(true);
    });

    it('returns true for CORNER_EXTERNAL', () => {
      expect(supportsCountertop('CORNER_EXTERNAL')).toBe(true);
    });

    it('returns false for WARDROBE', () => {
      expect(supportsCountertop('WARDROBE')).toBe(false);
    });

    it('returns false for BOOKSHELF', () => {
      expect(supportsCountertop('BOOKSHELF')).toBe(false);
    });

    it('returns false for DRAWER', () => {
      expect(supportsCountertop('DRAWER')).toBe(false);
    });

    it('returns false for WALL', () => {
      expect(supportsCountertop('WALL')).toBe(false);
    });
  });

  describe('supportsDoors', () => {
    it('returns true for KITCHEN', () => {
      expect(supportsDoors('KITCHEN')).toBe(true);
    });

    it('returns true for WALL', () => {
      expect(supportsDoors('WALL')).toBe(true);
    });

    it('returns true for WARDROBE', () => {
      expect(supportsDoors('WARDROBE')).toBe(true);
    });

    it('returns true for CORNER_INTERNAL', () => {
      expect(supportsDoors('CORNER_INTERNAL')).toBe(true);
    });

    it('returns false for BOOKSHELF', () => {
      expect(supportsDoors('BOOKSHELF')).toBe(false);
    });

    it('returns false for DRAWER', () => {
      expect(supportsDoors('DRAWER')).toBe(false);
    });
  });
});
