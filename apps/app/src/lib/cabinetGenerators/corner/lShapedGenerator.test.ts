/**
 * Tests for L-Shaped Corner Cabinet Generator
 *
 * Tests cover:
 * - Part generation (bottom, top, sides, rails, backs, fronts, shelves)
 * - Coordinate system (origin at front corner)
 * - Panel geometry (TWO_RECT vs L_SHAPE)
 * - Mount types (inset/overlay)
 * - Wall sharing modes
 * - Front types (NONE, SINGLE, ANGLED)
 */

import { generateLShapedCorner } from './lShapedGenerator';
import { CornerDomain } from '@/lib/domain/corner';
import { LegsDomain } from '@/lib/domain/legs';
import type {
  CornerInternalCabinetParams,
  CabinetMaterials,
  Material,
} from '@/types';
import type { GeneratedPart } from '../types';

// ==========================================================================
// TEST FIXTURES
// ==========================================================================

const createBodyMaterial = (thickness = 18): Material => ({
  id: 'body-mat',
  name: 'Body Material',
  category: 'board',
  color: '#FFFFFF',
  thickness,
});

const createBackMaterial = (thickness = 3): Material => ({
  id: 'back-mat',
  name: 'Back Material',
  category: 'hdf',
  color: '#FFFFFF',
  thickness,
});

const createMaterials = (): CabinetMaterials => ({
  bodyMaterialId: 'body-mat',
  backMaterialId: 'back-mat',
  frontMaterialId: 'front-mat',
});

const createDefaultParams = (overrides?: Partial<CornerInternalCabinetParams>): CornerInternalCabinetParams => ({
  type: 'CORNER_INTERNAL',
  width: 900,
  height: 720,
  depth: 560,
  topBottomPlacement: 'inset',
  hasBack: true,
  backOverlapRatio: 0.667,
  backMountType: 'overlap',
  cornerConfig: CornerDomain.createConfig(),
  ...overrides,
});

// Helper to find parts by role
const findPartsByRole = (parts: GeneratedPart[], role: string): GeneratedPart[] =>
  parts.filter(p => p.cabinetMetadata?.role === role);

const findPartByName = (parts: GeneratedPart[], nameSubstring: string): GeneratedPart | undefined =>
  parts.find(p => p.name.includes(nameSubstring));

// ==========================================================================
// TESTS
// ==========================================================================

describe('generateLShapedCorner', () => {
  const cabinetId = 'test-cabinet';
  const furnitureId = 'test-furniture';
  let materials: CabinetMaterials;
  let bodyMaterial: Material;
  let backMaterial: Material;

  beforeEach(() => {
    materials = createMaterials();
    bodyMaterial = createBodyMaterial();
    backMaterial = createBackMaterial();
  });

  describe('basic generation', () => {
    it('should generate parts for default configuration', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      expect(parts.length).toBeGreaterThan(0);
      expect(parts.every(p => p.furnitureId === furnitureId)).toBe(true);
      expect(parts.every(p => p.group === cabinetId)).toBe(true);
    });

    it('should assign correct material IDs to parts', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // Body parts should use body material
      const bottomParts = findPartsByRole(parts, 'CORNER_BOTTOM');
      expect(bottomParts.every(p => p.materialId === 'body-mat')).toBe(true);

      // Back parts should use back material
      const backParts = parts.filter(p => p.name.includes('Plecy'));
      expect(backParts.every(p => p.materialId === 'back-mat')).toBe(true);
    });
  });

  describe('bottom panels (TWO_RECT mode)', () => {
    it('should generate two bottom panels in TWO_RECT mode', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomParts = findPartsByRole(parts, 'CORNER_BOTTOM');
      expect(bottomParts.length).toBe(2);
      expect(bottomParts.some(p => p.name.includes('ramię A'))).toBe(true);
      expect(bottomParts.some(p => p.name.includes('ramię B'))).toBe(true);
    });

    it('should use RECT shape type in TWO_RECT mode', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomParts = findPartsByRole(parts, 'CORNER_BOTTOM');
      expect(bottomParts.every(p => p.shapeType === 'RECT')).toBe(true);
    });
  });

  describe('bottom panels (L_SHAPE mode)', () => {
    it('should generate single L-shaped bottom panel in L_SHAPE mode', () => {
      const cornerConfig = CornerDomain.updatePanelGeometry(
        CornerDomain.createConfig(),
        'L_SHAPE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomParts = findPartsByRole(parts, 'CORNER_BOTTOM');
      expect(bottomParts.length).toBe(1);
      expect(bottomParts[0].shapeType).toBe('L_SHAPE');
      expect(bottomParts[0].name).toBe('Dno');
    });

    it('should have correct L-shape params', () => {
      const cornerConfig = CornerDomain.updatePanelGeometry(
        CornerDomain.createConfig(),
        'L_SHAPE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.shapeParams.type).toBe('L_SHAPE');

      const shapeParams = bottomPart.shapeParams as { type: 'L_SHAPE'; x: number; y: number; cutX: number; cutY: number };
      expect(shapeParams.cutX).toBeGreaterThan(0);
      expect(shapeParams.cutY).toBeGreaterThan(0);
    });
  });

  describe('side panels', () => {
    it('should generate both sides in FULL_ISOLATION mode', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSides = findPartsByRole(parts, 'CORNER_LEFT_SIDE');
      const rightSides = findPartsByRole(parts, 'CORNER_RIGHT_SIDE');

      expect(leftSides.length).toBe(1);
      expect(rightSides.length).toBe(1);
    });

    it('should not generate left side in SHARED_LEFT mode', () => {
      const cornerConfig = CornerDomain.updateWallSharingMode(
        CornerDomain.createConfig(),
        'SHARED_LEFT'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSides = findPartsByRole(parts, 'CORNER_LEFT_SIDE');
      const rightSides = findPartsByRole(parts, 'CORNER_RIGHT_SIDE');

      expect(leftSides.length).toBe(0);
      expect(rightSides.length).toBe(1);
    });

    it('should not generate right side in SHARED_RIGHT mode', () => {
      const cornerConfig = CornerDomain.updateWallSharingMode(
        CornerDomain.createConfig(),
        'SHARED_RIGHT'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSides = findPartsByRole(parts, 'CORNER_LEFT_SIDE');
      const rightSides = findPartsByRole(parts, 'CORNER_RIGHT_SIDE');

      expect(leftSides.length).toBe(1);
      expect(rightSides.length).toBe(0);
    });

    it('should not generate any sides in SHARED_BOTH mode', () => {
      const cornerConfig = CornerDomain.updateWallSharingMode(
        CornerDomain.createConfig(),
        'SHARED_BOTH'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSides = findPartsByRole(parts, 'CORNER_LEFT_SIDE');
      const rightSides = findPartsByRole(parts, 'CORNER_RIGHT_SIDE');

      expect(leftSides.length).toBe(0);
      expect(rightSides.length).toBe(0);
    });

    it('should have sides with bodyDepth dimension (not full D)', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSide = findPartsByRole(parts, 'CORNER_LEFT_SIDE')[0];

      // Side width should be bodyDepth (560), not D (900)
      expect(leftSide.width).toBe(560);
    });
  });

  describe('front rail (wieniec przedni)', () => {
    it('should generate front rail when enabled', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontRail = findPartByName(parts, 'Wieniec przedni');
      expect(frontRail).toBeDefined();
    });

    it('should not generate front rail when disabled', () => {
      const cornerConfig = CornerDomain.updateFrontRail(
        CornerDomain.createConfig(),
        false
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontRail = findPartByName(parts, 'Wieniec przedni');
      expect(frontRail).toBeUndefined();
    });

    it('should have correct front rail dimensions', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        frontRailWidth: 100,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontRail = findPartByName(parts, 'Wieniec przedni');
      expect(frontRail?.height).toBe(100); // frontRailWidth
    });
  });

  describe('back panels', () => {
    it('should generate back panels when hasBack is true', () => {
      const params = createDefaultParams({ hasBack: true });
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backParts = parts.filter(p => p.name.includes('Plecy'));
      expect(backParts.length).toBeGreaterThan(0);
    });

    it('should not generate back panels when hasBack is false', () => {
      const params = createDefaultParams({ hasBack: false });
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backParts = parts.filter(p => p.name.includes('Plecy'));
      expect(backParts.length).toBe(0);
    });

    it('should generate two back panels (arm A and arm B)', () => {
      const params = createDefaultParams({ hasBack: true });
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backA = findPartByName(parts, 'Plecy (ramię A)');
      const backB = findPartByName(parts, 'Plecy (ramię B)');

      expect(backA).toBeDefined();
      expect(backB).toBeDefined();
    });
  });

  describe('front panels (doors)', () => {
    it('should not generate front for NONE type', () => {
      const cornerConfig = CornerDomain.updateFrontType(
        CornerDomain.createConfig(),
        'NONE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontPart = findPartsByRole(parts, 'CORNER_DIAGONAL_FRONT');
      expect(frontPart.length).toBe(0);
    });

    it('should generate straight front for SINGLE type', () => {
      const cornerConfig = CornerDomain.updateFrontType(
        CornerDomain.createConfig(),
        'SINGLE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontPart = findPartsByRole(parts, 'CORNER_DIAGONAL_FRONT')[0];
      expect(frontPart).toBeDefined();
      expect(frontPart.name).toBe('Front');
      // SINGLE front should not be rotated (parallel to XY plane)
      expect(frontPart.rotation[1]).toBe(0);
    });

    it('should generate angled front for ANGLED type', () => {
      const params = createDefaultParams(); // Default is ANGLED
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontPart = findPartsByRole(parts, 'CORNER_DIAGONAL_FRONT')[0];
      expect(frontPart).toBeDefined();
      expect(frontPart.name).toBe('Front skośny');
      // ANGLED front should be rotated (45° = π/4)
      expect(Math.abs(frontPart.rotation[1])).toBeCloseTo(Math.PI / 4, 2);
    });

    it('should respect LEFT/RIGHT orientation for angled front rotation', () => {
      const leftConfig = CornerDomain.createConfig(); // Default LEFT
      const rightConfig = CornerDomain.updateOrientation(leftConfig, 'RIGHT');

      const paramsLeft = createDefaultParams({ cornerConfig: leftConfig });
      const paramsRight = createDefaultParams({ cornerConfig: rightConfig });

      const partsLeft = generateLShapedCorner(
        cabinetId, furnitureId, paramsLeft, materials, bodyMaterial, backMaterial
      );
      const partsRight = generateLShapedCorner(
        cabinetId, furnitureId, paramsRight, materials, bodyMaterial, backMaterial
      );

      const frontLeft = findPartsByRole(partsLeft, 'CORNER_DIAGONAL_FRONT')[0];
      const frontRight = findPartsByRole(partsRight, 'CORNER_DIAGONAL_FRONT')[0];

      // LEFT orientation should have negative rotation, RIGHT should have positive
      expect(frontLeft.rotation[1]).toBeLessThan(0);
      expect(frontRight.rotation[1]).toBeGreaterThan(0);
    });
  });

  describe('shelves', () => {
    it('should generate shelves', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const shelfParts = findPartsByRole(parts, 'CORNER_SHELF');
      expect(shelfParts.length).toBeGreaterThan(0);
    });

    it('should have shelf index in metadata', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const shelfParts = findPartsByRole(parts, 'CORNER_SHELF');
      expect(shelfParts[0].cabinetMetadata?.index).toBe(0);
    });
  });

  describe('coordinate system (origin at front corner)', () => {
    it('should have all parts in positive Z region (into corner)', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // All Z positions should be >= 0 (or close to 0 for front parts)
      const minZ = Math.min(...parts.map(p => p.position[2]));
      expect(minZ).toBeGreaterThanOrEqual(-50); // Allow small margin for fronts
    });

    it('should have parts positioned starting from X=0', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // Left side should be near X=0
      const leftSide = findPartsByRole(parts, 'CORNER_LEFT_SIDE')[0];
      expect(leftSide.position[0]).toBeLessThan(50); // Near X=0
    });

    it('should position parts within bounding box W x D', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const { W, D } = params.cornerConfig;

      // Check X positions are within [0, W]
      parts.forEach(part => {
        expect(part.position[0]).toBeGreaterThanOrEqual(-50);
        expect(part.position[0]).toBeLessThanOrEqual(W + 50);
      });

      // Check Z positions are within [0, D] (with margin for front)
      parts.forEach(part => {
        expect(part.position[2]).toBeGreaterThanOrEqual(-50);
        expect(part.position[2]).toBeLessThanOrEqual(D + 50);
      });
    });
  });

  describe('mount types', () => {
    it('should adjust side height for inset mounting', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        bottomMount: 'inset' as const,
        topMount: 'inset' as const,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSide = findPartsByRole(parts, 'CORNER_LEFT_SIDE')[0];
      // For inset mounting, side height = cabinet height
      expect(leftSide.height).toBe(720);
    });

    it('should adjust side height for overlay mounting', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        bottomMount: 'overlay' as const,
        topMount: 'overlay' as const,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const leftSide = findPartsByRole(parts, 'CORNER_LEFT_SIDE')[0];
      // For overlay mounting, side height = cabinet height - 2 * thickness
      expect(leftSide.height).toBe(720 - 2 * 18);
    });
  });

  describe('leg offset', () => {
    it('should apply leg offset to Y positions', () => {
      // Create proper legs config using LegsDomain
      const legsConfig = LegsDomain.createLegsConfig(true, 'STANDARD');
      const params = createDefaultParams({ legs: legsConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const expectedOffset = LegsDomain.calculateLegHeightOffset(legsConfig);

      // All Y positions should be elevated by leg height
      const bottomParts = findPartsByRole(parts, 'CORNER_BOTTOM');
      bottomParts.forEach(part => {
        expect(part.position[1]).toBeGreaterThanOrEqual(expectedOffset);
      });
    });
  });

  describe('edge banding', () => {
    it('should apply L_SHAPE edge banding for L-shaped panels', () => {
      const cornerConfig = CornerDomain.updatePanelGeometry(
        CornerDomain.createConfig(),
        'L_SHAPE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.edgeBanding.type).toBe('L_SHAPE');
    });

    it('should apply RECT edge banding for rectangular panels', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.edgeBanding.type).toBe('RECT');
    });
  });
});
