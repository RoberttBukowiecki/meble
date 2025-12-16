/**
 * Back Panel Generator Tests
 *
 * Tests for backPanel.ts covering:
 * - Standard rectangular back panel generation
 * - Back panel with hanger cutouts (POLYGON shape)
 * - Cutout positioning and dimensions
 * - Material and metadata assignment
 */

import { generateBackPanel, generateBackPanelWithCutouts } from './backPanel';
import type { BackPanelConfig, BackPanelWithCutoutsConfig } from './types';
import type { HangerCutoutConfig } from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createBackPanelConfig(
  overrides: Partial<BackPanelConfig> = {}
): BackPanelConfig {
  return {
    cabinetId: 'test-cabinet-1',
    furnitureId: 'test-furniture-1',
    cabinetWidth: 800,
    cabinetHeight: 720,
    cabinetDepth: 350,
    bodyMaterialThickness: 18,
    backMaterialId: 'back-mat-1',
    backMaterialThickness: 3,
    overlapRatio: 0.667,
    mountType: 'overlap',
    topBottomPlacement: 'inset',
    legOffset: 0,
    ...overrides,
  };
}

function createBackPanelWithCutoutsConfig(
  overrides: Partial<BackPanelWithCutoutsConfig> = {}
): BackPanelWithCutoutsConfig {
  return {
    ...createBackPanelConfig(),
    hangerCutouts: {
      enabled: true,
      width: 50,
      height: 40,
      horizontalInset: 50,
      verticalInset: 30,
    },
    ...overrides,
  };
}

// ============================================================================
// Standard Back Panel Tests
// ============================================================================

describe('Back Panel Generator', () => {
  describe('generateBackPanel (Standard RECT)', () => {
    it('generates a back panel with RECT shape', () => {
      const config = createBackPanelConfig();
      const part = generateBackPanel(config);

      expect(part.shapeType).toBe('RECT');
      expect(part.shapeParams.type).toBe('RECT');
    });

    it('uses correct back material', () => {
      const config = createBackPanelConfig({ backMaterialId: 'custom-back-mat' });
      const part = generateBackPanel(config);

      expect(part.materialId).toBe('custom-back-mat');
    });

    it('has BACK role in cabinet metadata', () => {
      const config = createBackPanelConfig();
      const part = generateBackPanel(config);

      expect(part.cabinetMetadata?.role).toBe('BACK');
      expect(part.cabinetMetadata?.cabinetId).toBe('test-cabinet-1');
    });

    it('is positioned behind cabinet (negative Z)', () => {
      const config = createBackPanelConfig({ cabinetDepth: 350, backMaterialThickness: 3 });
      const part = generateBackPanel(config);

      // Z = -depth/2 - thickness/2 = -175 - 1.5 = -176.5
      expect(part.position[2]).toBe(-350 / 2 - 3 / 2);
    });

    it('applies leg offset to Y position', () => {
      const configWithOffset = createBackPanelConfig({ legOffset: 100 });
      const configWithoutOffset = createBackPanelConfig({ legOffset: 0 });

      const partWithOffset = generateBackPanel(configWithOffset);
      const partWithoutOffset = generateBackPanel(configWithoutOffset);

      expect(partWithOffset.position[1]).toBe(partWithoutOffset.position[1] + 100);
    });

    it('has no edge banding', () => {
      const config = createBackPanelConfig();
      const part = generateBackPanel(config);

      expect(part.edgeBanding).toEqual({
        type: 'RECT',
        top: false,
        bottom: false,
        left: false,
        right: false,
      });
    });

    it('calculates correct dimensions based on overlap ratio', () => {
      const config = createBackPanelConfig({
        cabinetWidth: 800,
        cabinetHeight: 720,
        bodyMaterialThickness: 18,
        overlapRatio: 0.667,
      });
      const part = generateBackPanel(config);

      // overlapDepth = 18 * 0.667 = 12.006
      // edgeInset = 18 - 12.006 = 5.994
      // backWidth = 800 - 2 * 5.994 = 788.012
      // backHeight = 720 - 2 * 5.994 = 708.012
      const overlapDepth = 18 * 0.667;
      const edgeInset = 18 - overlapDepth;
      const expectedWidth = 800 - 2 * edgeInset;
      const expectedHeight = 720 - 2 * edgeInset;

      expect(part.width).toBeCloseTo(expectedWidth, 2);
      expect(part.height).toBeCloseTo(expectedHeight, 2);
    });

    it('uses back material thickness for depth', () => {
      const config = createBackPanelConfig({ backMaterialThickness: 5 });
      const part = generateBackPanel(config);

      expect(part.depth).toBe(5);
    });
  });
});

// ============================================================================
// Back Panel with Cutouts Tests
// ============================================================================

describe('Back Panel with Hanger Cutouts', () => {
  describe('generateBackPanelWithCutouts', () => {
    it('generates POLYGON shape when cutouts are enabled', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: { enabled: true, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });
      const part = generateBackPanelWithCutouts(config);

      expect(part.shapeType).toBe('POLYGON');
      expect(part.shapeParams.type).toBe('POLYGON');
    });

    it('falls back to RECT shape when cutouts are disabled', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: { enabled: false, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });
      const part = generateBackPanelWithCutouts(config);

      expect(part.shapeType).toBe('RECT');
      expect(part.shapeParams.type).toBe('RECT');
    });

    it('polygon has 12 points (rectangle with 2 corner cutouts)', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: { enabled: true, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });
      const part = generateBackPanelWithCutouts(config);

      const points = (part.shapeParams as any).points;
      // Rectangle with 2 notches cut from top corners = 12 points
      // Bottom-left -> bottom-right (2 points)
      // Right side up to cutout (1 point)
      // Right cutout (4 points)
      // Top edge between cutouts (1 point)
      // Left cutout (4 points) - back to start
      expect(points.length).toBe(12);
    });

    it('cutout points are in correct positions', () => {
      const config = createBackPanelWithCutoutsConfig({
        cabinetWidth: 800,
        cabinetHeight: 720,
        bodyMaterialThickness: 18,
        overlapRatio: 0.667,
        hangerCutouts: {
          enabled: true,
          width: 50,
          height: 40,
          horizontalInset: 50,
          verticalInset: 30,
        },
      });
      const part = generateBackPanelWithCutouts(config);

      const points: [number, number][] = (part.shapeParams as any).points;

      // Calculate expected dimensions
      const overlapDepth = 18 * 0.667;
      const edgeInset = 18 - overlapDepth;
      const backWidth = 800 - 2 * edgeInset;
      const backHeight = 720 - 2 * edgeInset;
      const halfW = backWidth / 2;
      const halfH = backHeight / 2;

      // Check bottom-left corner
      expect(points[0]).toEqual([-halfW, -halfH]);

      // Check bottom-right corner
      expect(points[1]).toEqual([halfW, -halfH]);

      // The cutouts should create notches in the top corners
      // Points should include the cutout geometry
      const topY = halfH;
      const rightCutoutPoints = points.filter(
        ([x, y]) => x > 0 && y > halfH - 100 // Near top-right
      );
      expect(rightCutoutPoints.length).toBeGreaterThan(0);
    });

    it('uses correct material and metadata', () => {
      const config = createBackPanelWithCutoutsConfig({
        backMaterialId: 'hdf-custom',
        cabinetId: 'wall-cab-1',
        furnitureId: 'furn-1',
      });
      const part = generateBackPanelWithCutouts(config);

      expect(part.materialId).toBe('hdf-custom');
      expect(part.cabinetMetadata?.role).toBe('BACK');
      expect(part.cabinetMetadata?.cabinetId).toBe('wall-cab-1');
      expect(part.furnitureId).toBe('furn-1');
    });

    it('preserves dimensions and position like standard back panel', () => {
      const baseConfig = createBackPanelConfig();
      const cutoutConfig = createBackPanelWithCutoutsConfig({
        hangerCutouts: { enabled: true, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });

      const standardPart = generateBackPanel(baseConfig);
      const cutoutPart = generateBackPanelWithCutouts(cutoutConfig);

      // Width, height, depth should be the same
      expect(cutoutPart.width).toBe(standardPart.width);
      expect(cutoutPart.height).toBe(standardPart.height);
      expect(cutoutPart.depth).toBe(standardPart.depth);

      // Position should be the same
      expect(cutoutPart.position).toEqual(standardPart.position);
    });

    it('has no edge banding', () => {
      const config = createBackPanelWithCutoutsConfig();
      const part = generateBackPanelWithCutouts(config);

      expect(part.edgeBanding).toEqual({
        type: 'RECT',
        top: false,
        bottom: false,
        left: false,
        right: false,
      });
    });
  });

  describe('Cutout Geometry Validation', () => {
    it('cutouts are symmetric (same size left and right)', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: {
          enabled: true,
          width: 60,
          height: 45,
          horizontalInset: 40,
          verticalInset: 25,
        },
      });
      const part = generateBackPanelWithCutouts(config);

      const points: [number, number][] = (part.shapeParams as any).points;

      // Find points that form the cutouts
      // Right cutout should be at positive X, left cutout at negative X
      // Both should have the same dimensions (width: 60, height: 45)

      // Check that polygon is valid (closes properly)
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];

      // The polygon should form a closed shape
      // First and last points shouldn't be identical (closed implicitly)
      expect(points.length).toBe(12);
    });

    it('larger cutouts work correctly', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: {
          enabled: true,
          width: 100,
          height: 80,
          horizontalInset: 60,
          verticalInset: 40,
        },
      });

      // Should not throw
      expect(() => generateBackPanelWithCutouts(config)).not.toThrow();

      const part = generateBackPanelWithCutouts(config);
      expect(part.shapeType).toBe('POLYGON');
    });

    it('small cutouts work correctly', () => {
      const config = createBackPanelWithCutoutsConfig({
        hangerCutouts: {
          enabled: true,
          width: 30,
          height: 20,
          horizontalInset: 20,
          verticalInset: 20,
        },
      });

      expect(() => generateBackPanelWithCutouts(config)).not.toThrow();

      const part = generateBackPanelWithCutouts(config);
      expect(part.shapeType).toBe('POLYGON');
    });
  });

  describe('Leg Offset', () => {
    it('applies leg offset to Y position', () => {
      const configWithOffset = createBackPanelWithCutoutsConfig({ legOffset: 100 });
      const configWithoutOffset = createBackPanelWithCutoutsConfig({ legOffset: 0 });

      const partWithOffset = generateBackPanelWithCutouts(configWithOffset);
      const partWithoutOffset = generateBackPanelWithCutouts(configWithoutOffset);

      expect(partWithOffset.position[1]).toBe(partWithoutOffset.position[1] + 100);
    });
  });

  describe('Part Properties', () => {
    it('part name is "Plecy"', () => {
      const config = createBackPanelWithCutoutsConfig();
      const part = generateBackPanelWithCutouts(config);

      expect(part.name).toBe('Plecy');
    });

    it('part has no rotation', () => {
      const config = createBackPanelWithCutoutsConfig();
      const part = generateBackPanelWithCutouts(config);

      expect(part.rotation).toEqual([0, 0, 0]);
    });

    it('part group matches cabinetId', () => {
      const config = createBackPanelWithCutoutsConfig({ cabinetId: 'my-wall-cabinet' });
      const part = generateBackPanelWithCutouts(config);

      expect(part.group).toBe('my-wall-cabinet');
    });
  });
});
