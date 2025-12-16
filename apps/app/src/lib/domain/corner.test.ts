/**
 * Tests for CornerDomain
 *
 * Tests cover:
 * - Creators (createConfig, createParams)
 * - Updaters (immutable updates)
 * - Calculators (L-shape cut, dead zone, diagonal width, positions)
 * - Validators
 * - Queries
 */

import { CornerDomain, CORNER_DEFAULTS, CORNER_LIMITS } from './corner';
import type { CornerConfig } from '@/types';

describe('CornerDomain', () => {
  // ==========================================================================
  // CREATORS
  // ==========================================================================
  describe('createConfig', () => {
    it('should create default corner config with correct fields', () => {
      const config = CornerDomain.createConfig();

      expect(config.cornerType).toBe('L_SHAPED');
      expect(config.cornerOrientation).toBe('LEFT');
      expect(config.W).toBe(CORNER_DEFAULTS.W);
      expect(config.D).toBe(CORNER_DEFAULTS.D);
      expect(config.bodyDepth).toBe(CORNER_DEFAULTS.bodyDepth);
      expect(config.bottomMount).toBe('inset');
      expect(config.topMount).toBe('inset');
      expect(config.panelGeometry).toBe('TWO_RECT');
      expect(config.frontRail).toBe(true);
      expect(config.frontType).toBe('ANGLED');
      expect(config.wallSharingMode).toBe('FULL_ISOLATION');
    });

    it('should create config with specified type and orientation', () => {
      const config = CornerDomain.createConfig('BLIND_CORNER', 'RIGHT');

      expect(config.cornerType).toBe('BLIND_CORNER');
      expect(config.cornerOrientation).toBe('RIGHT');
    });
  });

  describe('createParams', () => {
    it('should create corner cabinet params with defaults', () => {
      const params = CornerDomain.createParams(900, 720, 560);

      expect(params.type).toBe('CORNER_INTERNAL');
      expect(params.width).toBe(900);
      expect(params.height).toBe(720);
      expect(params.depth).toBe(560);
      expect(params.cornerConfig).toBeDefined();
      expect(params.hasBack).toBe(true);
    });

    it('should merge custom corner config', () => {
      const params = CornerDomain.createParams(900, 720, 560, {
        frontType: 'SINGLE',
        panelGeometry: 'L_SHAPE',
      });

      expect(params.cornerConfig.frontType).toBe('SINGLE');
      expect(params.cornerConfig.panelGeometry).toBe('L_SHAPE');
    });
  });

  // ==========================================================================
  // UPDATERS
  // ==========================================================================
  describe('updaters (immutability)', () => {
    let baseConfig: CornerConfig;

    beforeEach(() => {
      baseConfig = CornerDomain.createConfig();
    });

    it('updateDimensions should return new config with updated W and D', () => {
      const updated = CornerDomain.updateDimensions(baseConfig, 1000, 800);

      expect(updated).not.toBe(baseConfig);
      expect(updated.W).toBe(1000);
      expect(updated.D).toBe(800);
      expect(baseConfig.W).toBe(CORNER_DEFAULTS.W); // Original unchanged
    });

    it('updateDimensions should clamp values to limits', () => {
      const tooSmall = CornerDomain.updateDimensions(baseConfig, 100, 100);
      expect(tooSmall.W).toBe(CORNER_LIMITS.MIN_W);
      expect(tooSmall.D).toBe(CORNER_LIMITS.MIN_D);

      const tooLarge = CornerDomain.updateDimensions(baseConfig, 5000, 5000);
      expect(tooLarge.W).toBe(CORNER_LIMITS.MAX_W);
      expect(tooLarge.D).toBe(CORNER_LIMITS.MAX_D);
    });

    it('updateBodyDepth should return new config with updated bodyDepth', () => {
      const updated = CornerDomain.updateBodyDepth(baseConfig, 400);

      expect(updated.bodyDepth).toBe(400);
      expect(baseConfig.bodyDepth).toBe(CORNER_DEFAULTS.bodyDepth);
    });

    it('updateBodyDepth should clamp to limits', () => {
      const tooSmall = CornerDomain.updateBodyDepth(baseConfig, 100);
      expect(tooSmall.bodyDepth).toBe(CORNER_LIMITS.MIN_BODY_DEPTH);

      const tooLarge = CornerDomain.updateBodyDepth(baseConfig, 2000);
      expect(tooLarge.bodyDepth).toBe(CORNER_LIMITS.MAX_BODY_DEPTH);
    });

    it('updateOrientation should change corner orientation', () => {
      const updated = CornerDomain.updateOrientation(baseConfig, 'RIGHT');

      expect(updated.cornerOrientation).toBe('RIGHT');
      expect(baseConfig.cornerOrientation).toBe('LEFT');
    });

    it('updatePanelGeometry should change panel type', () => {
      const updated = CornerDomain.updatePanelGeometry(baseConfig, 'L_SHAPE');

      expect(updated.panelGeometry).toBe('L_SHAPE');
      expect(baseConfig.panelGeometry).toBe('TWO_RECT');
    });

    it('updateFrontRail should toggle and configure front rail', () => {
      const disabled = CornerDomain.updateFrontRail(baseConfig, false);
      expect(disabled.frontRail).toBe(false);

      const customWidth = CornerDomain.updateFrontRail(baseConfig, true, 'overlay', 150);
      expect(customWidth.frontRail).toBe(true);
      expect(customWidth.frontRailMount).toBe('overlay');
      expect(customWidth.frontRailWidth).toBe(150);
    });

    it('updateFrontType should change front type', () => {
      const updated = CornerDomain.updateFrontType(baseConfig, 'SINGLE');

      expect(updated.frontType).toBe('SINGLE');
      expect(baseConfig.frontType).toBe('ANGLED');
    });

    it('updateFrontAngle should clamp angle between 30-60', () => {
      const tooSmall = CornerDomain.updateFrontAngle(baseConfig, 10);
      expect(tooSmall.frontAngle).toBe(30);

      const tooLarge = CornerDomain.updateFrontAngle(baseConfig, 90);
      expect(tooLarge.frontAngle).toBe(60);

      const valid = CornerDomain.updateFrontAngle(baseConfig, 45);
      expect(valid.frontAngle).toBe(45);
    });

    it('updateWallSharingMode should change wall sharing', () => {
      const updated = CornerDomain.updateWallSharingMode(baseConfig, 'SHARED_LEFT');

      expect(updated.wallSharingMode).toBe('SHARED_LEFT');
      expect(baseConfig.wallSharingMode).toBe('FULL_ISOLATION');
    });
  });

  // ==========================================================================
  // CALCULATORS
  // ==========================================================================
  describe('calculators', () => {
    describe('calculateLShapeCut', () => {
      it('should calculate cut dimensions for overlay mounting', () => {
        const cut = CornerDomain.calculateLShapeCut(900, 900, 560, false, 18);

        // Cut = external - bodyDepth
        expect(cut.cutX).toBe(340); // 900 - 560
        expect(cut.cutY).toBe(340); // 900 - 560
      });

      it('should add thickness for inset mounting', () => {
        const cut = CornerDomain.calculateLShapeCut(900, 900, 560, true, 18);

        // Cut = (external - bodyDepth) + thickness
        expect(cut.cutX).toBe(358); // 340 + 18
        expect(cut.cutY).toBe(358); // 340 + 18
      });

      it('should handle asymmetric dimensions', () => {
        const cut = CornerDomain.calculateLShapeCut(1000, 800, 500, false, 18);

        expect(cut.cutX).toBe(500); // 1000 - 500
        expect(cut.cutY).toBe(300); // 800 - 500
      });
    });

    describe('shouldUseLShape', () => {
      it('should return true for L_SHAPE geometry with FULL_ISOLATION', () => {
        const config = CornerDomain.createConfig();
        const withLShape = CornerDomain.updatePanelGeometry(config, 'L_SHAPE');

        expect(CornerDomain.shouldUseLShape(withLShape)).toBe(true);
      });

      it('should return false for TWO_RECT geometry', () => {
        const config = CornerDomain.createConfig();

        expect(CornerDomain.shouldUseLShape(config)).toBe(false);
      });

      it('should return false for L_SHAPE with SHARED_BOTH (edge banding issue)', () => {
        const config = CornerDomain.createConfig();
        let updated = CornerDomain.updatePanelGeometry(config, 'L_SHAPE');
        updated = CornerDomain.updateWallSharingMode(updated, 'SHARED_BOTH');

        expect(CornerDomain.shouldUseLShape(updated)).toBe(false);
      });
    });

    describe('getEdgeBandingForLShape', () => {
      it('should return all edges banded for FULL_ISOLATION', () => {
        const config = CornerDomain.createConfig();
        const banding = CornerDomain.getEdgeBandingForLShape(config);

        expect(banding.type).toBe('L_SHAPE');
        expect(banding.edge1).toBe(true); // Front
        expect(banding.edge2).toBe(true); // Front-right
        expect(banding.edge3).toBe(true); // Inner horizontal
        expect(banding.edge4).toBe(true); // Inner vertical
        expect(banding.edge5).toBe(true); // Back-left
        expect(banding.edge6).toBe(true); // Outer-left
      });

      it('should hide back-left edge for SHARED_LEFT', () => {
        const config = CornerDomain.createConfig();
        const sharedLeft = CornerDomain.updateWallSharingMode(config, 'SHARED_LEFT');
        const banding = CornerDomain.getEdgeBandingForLShape(sharedLeft);

        expect(banding.edge5).toBe(false); // Back-left hidden
        expect(banding.edge6).toBe(true);  // Outer-left visible
      });

      it('should hide outer-left edge for SHARED_RIGHT', () => {
        const config = CornerDomain.createConfig();
        const sharedRight = CornerDomain.updateWallSharingMode(config, 'SHARED_RIGHT');
        const banding = CornerDomain.getEdgeBandingForLShape(sharedRight);

        expect(banding.edge5).toBe(true);  // Back-left visible
        expect(banding.edge6).toBe(false); // Outer-left hidden
      });
    });

    describe('calculateDeadZone', () => {
      it('should calculate dead zone from W, D, and bodyDepth', () => {
        const config = CornerDomain.createConfig();
        const deadZone = CornerDomain.calculateDeadZone(config);

        // Dead zone = W - bodyDepth and D - bodyDepth
        expect(deadZone.width).toBe(340);  // 900 - 560
        expect(deadZone.depth).toBe(340);  // 900 - 560
      });

      it('should handle asymmetric dimensions', () => {
        let config = CornerDomain.createConfig();
        config = CornerDomain.updateDimensions(config, 1000, 800);
        config = CornerDomain.updateBodyDepth(config, 500);

        const deadZone = CornerDomain.calculateDeadZone(config);

        expect(deadZone.width).toBe(500);  // 1000 - 500
        expect(deadZone.depth).toBe(300);  // 800 - 500
      });
    });

    describe('calculateDiagonalWidth', () => {
      it('should calculate hypotenuse of dead zone for 45° angle', () => {
        const config = CornerDomain.createConfig();
        const diagonalWidth = CornerDomain.calculateDiagonalWidth(config);

        // For 340x340 dead zone, hypotenuse = sqrt(340² + 340²) ≈ 480.8
        // Minus 2 * doorGap (2 * 2 = 4)
        expect(diagonalWidth).toBeCloseTo(477, 0);
      });

      it('should account for door gap', () => {
        let config = CornerDomain.createConfig();
        config = { ...config, doorGap: 5 };

        const diagonalWidth = CornerDomain.calculateDiagonalWidth(config);

        // 480.8 - (2 * 5) = 470.8
        expect(diagonalWidth).toBeCloseTo(471, 0);
      });
    });

    describe('calculateSideHeight', () => {
      it('should return full height for inset mounting', () => {
        const height = CornerDomain.calculateSideHeight(720, 'inset', 'inset', 18);

        expect(height).toBe(720);
      });

      it('should subtract thickness for overlay mounting', () => {
        const bothOverlay = CornerDomain.calculateSideHeight(720, 'overlay', 'overlay', 18);
        expect(bothOverlay).toBe(684); // 720 - 18 - 18

        const bottomOnly = CornerDomain.calculateSideHeight(720, 'overlay', 'inset', 18);
        expect(bottomOnly).toBe(702); // 720 - 18

        const topOnly = CornerDomain.calculateSideHeight(720, 'inset', 'overlay', 18);
        expect(topOnly).toBe(702); // 720 - 18
      });
    });

    describe('calculateShelfPositions', () => {
      it('should return empty array for 0 shelves', () => {
        const positions = CornerDomain.calculateShelfPositions(720, 18, 0);
        expect(positions).toEqual([]);
      });

      it('should return evenly spaced positions for 1 shelf', () => {
        const positions = CornerDomain.calculateShelfPositions(720, 18, 1);

        // Usable height = 720 - 36 = 684
        // 1 shelf divides into 2 spaces: 684/2 = 342
        // Shelf at: 18 + 342 = 360
        expect(positions).toHaveLength(1);
        expect(positions[0]).toBe(360);
      });

      it('should return evenly spaced positions for multiple shelves', () => {
        const positions = CornerDomain.calculateShelfPositions(720, 18, 3);

        // Usable height = 684, 3 shelves = 4 spaces
        // Spacing = 684/4 = 171
        // Shelves at: 18 + 171 = 189, 18 + 342 = 360, 18 + 513 = 531
        expect(positions).toHaveLength(3);
        expect(positions[0]).toBe(189);
        expect(positions[1]).toBe(360);
        expect(positions[2]).toBe(531);
      });
    });

    describe('calculateBoundingBox', () => {
      it('should return correct bounding box dimensions', () => {
        const config = CornerDomain.createConfig();
        const box = CornerDomain.calculateBoundingBox(config, 720);

        expect(box.width).toBe(900);
        expect(box.height).toBe(720);
        expect(box.depth).toBe(900);
      });
    });
  });

  // ==========================================================================
  // VALIDATORS
  // ==========================================================================
  describe('validators', () => {
    describe('validate', () => {
      it('should return valid for default config', () => {
        const config = CornerDomain.createConfig();
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return errors for W out of range', () => {
        const config = { ...CornerDomain.createConfig(), W: 100 };
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Szerokość W musi być między ${CORNER_LIMITS.MIN_W}-${CORNER_LIMITS.MAX_W}mm`
        );
      });

      it('should return errors for D out of range', () => {
        const config = { ...CornerDomain.createConfig(), D: 5000 };
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Głębokość D musi być między ${CORNER_LIMITS.MIN_D}-${CORNER_LIMITS.MAX_D}mm`
        );
      });

      it('should return errors for bodyDepth >= W', () => {
        const config = { ...CornerDomain.createConfig(), bodyDepth: 1000 };
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Głębokość korpusu musi być mniejsza niż szerokość W');
      });

      it('should return errors for bodyDepth >= D', () => {
        const config = { ...CornerDomain.createConfig(), W: 1200, D: 500, bodyDepth: 560 };
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Głębokość korpusu musi być mniejsza niż głębokość D');
      });

      it('should return errors for frontRailWidth out of range', () => {
        const config = { ...CornerDomain.createConfig(), frontRailWidth: 10 };
        const result = CornerDomain.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('wieńca'))).toBe(true);
      });
    });

    describe('validateParams', () => {
      it('should return valid for valid params', () => {
        const params = CornerDomain.createParams(900, 720, 560);
        const result = CornerDomain.validateParams(params);

        expect(result.valid).toBe(true);
      });

      it('should return errors for height out of range', () => {
        const params = CornerDomain.createParams(900, 50, 560);
        const result = CornerDomain.validateParams(params);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Wysokość'))).toBe(true);
      });
    });
  });

  // ==========================================================================
  // QUERIES
  // ==========================================================================
  describe('queries', () => {
    it('hasDiagonalFront should return true for ANGLED front type', () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasDiagonalFront(config)).toBe(true);

      const single = CornerDomain.updateFrontType(config, 'SINGLE');
      expect(CornerDomain.hasDiagonalFront(single)).toBe(false);
    });

    it('hasSharedWalls should detect wall sharing', () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasSharedWalls(config)).toBe(false);

      const sharedLeft = CornerDomain.updateWallSharingMode(config, 'SHARED_LEFT');
      expect(CornerDomain.hasSharedWalls(sharedLeft)).toBe(true);
    });

    it('hasFront should return true for non-NONE front types', () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasFront(config)).toBe(true);

      const noFront = CornerDomain.updateFrontType(config, 'NONE');
      expect(CornerDomain.hasFront(noFront)).toBe(false);
    });

    it('hasLeftSide should return based on wall sharing', () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasLeftSide(config)).toBe(true);

      const sharedLeft = CornerDomain.updateWallSharingMode(config, 'SHARED_LEFT');
      expect(CornerDomain.hasLeftSide(sharedLeft)).toBe(false);

      const sharedBoth = CornerDomain.updateWallSharingMode(config, 'SHARED_BOTH');
      expect(CornerDomain.hasLeftSide(sharedBoth)).toBe(false);
    });

    it('hasRightSide should return based on wall sharing', () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasRightSide(config)).toBe(true);

      const sharedRight = CornerDomain.updateWallSharingMode(config, 'SHARED_RIGHT');
      expect(CornerDomain.hasRightSide(sharedRight)).toBe(false);
    });

    it('getTypeLabel should return Polish labels', () => {
      expect(CornerDomain.getTypeLabel('L_SHAPED')).toBe('L-kształtna (diagonalna)');
      expect(CornerDomain.getTypeLabel('BLIND_CORNER')).toBe('Ślepa narożna');
    });

    it('getFrontTypeLabel should return Polish labels', () => {
      expect(CornerDomain.getFrontTypeLabel('ANGLED')).toBe('Pojedyncze (skośne)');
      expect(CornerDomain.getFrontTypeLabel('SINGLE')).toBe('Pojedyncze (proste)');
      expect(CornerDomain.getFrontTypeLabel('NONE')).toBe('Brak');
    });

    it('getSummary should return formatted summary', () => {
      const config = CornerDomain.createConfig();
      const summary = CornerDomain.getSummary(config);

      expect(summary).toContain('L-kształtna');
      expect(summary).toContain('900×900mm');
      expect(summary).toContain('(L)');
    });
  });
});
