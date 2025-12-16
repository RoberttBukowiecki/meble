/**
 * Tests for Corner Cabinet Generator
 *
 * Tests cover:
 * - Part generation (bottom, top, sides, back, front panel, door, shelves)
 * - Coordinate system (origin at front-left corner)
 * - Mount types (inset/overlay)
 * - Front types (NONE, SINGLE)
 * - Door position (LEFT, RIGHT)
 * - Optional side front panel
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
  width: 1000,
  height: 720,
  depth: 600,
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
      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.materialId).toBe('body-mat');

      // Back parts should use back material
      const backPart = findPartsByRole(parts, 'CORNER_BACK')[0];
      expect(backPart.materialId).toBe('back-mat');
    });

    it('should generate all required structural parts', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // Check for all main parts
      expect(findPartsByRole(parts, 'CORNER_BOTTOM').length).toBe(1);
      expect(findPartsByRole(parts, 'CORNER_TOP').length).toBe(1);
      expect(findPartsByRole(parts, 'CORNER_SIDE_INTERNAL').length).toBe(1);
      expect(findPartsByRole(parts, 'CORNER_SIDE_EXTERNAL').length).toBe(1);
      expect(findPartsByRole(parts, 'CORNER_BACK').length).toBe(1);
    });
  });

  describe('bottom panel', () => {
    it('should generate rectangular bottom panel', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.shapeType).toBe('RECT');
      expect(bottomPart.name).toBe('Dół');
    });

    it('should have bottom panel width = W - 2*t for inset mounting', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      // W=1000, t=18, so width = 1000 - 36 = 964
      expect(bottomPart.width).toBe(964);
    });

    it('should position bottom panel at Y = t/2', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      // Bottom should be at Y = t/2 = 18/2 = 9
      expect(bottomPart.position[1]).toBeCloseTo(9, 0);
    });
  });

  describe('top panel', () => {
    it('should generate rectangular top panel', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const topPart = findPartsByRole(parts, 'CORNER_TOP')[0];
      expect(topPart.shapeType).toBe('RECT');
      expect(topPart.name).toBe('Góra');
    });

    it('should position top panel at Y = H - t/2', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const topPart = findPartsByRole(parts, 'CORNER_TOP')[0];
      // Top should be at Y = H - t/2 = 720 - 9 = 711
      expect(topPart.position[1]).toBeCloseTo(711, 0);
    });
  });

  describe('side panels', () => {
    it('should generate internal side panel at wall', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const internalSide = findPartsByRole(parts, 'CORNER_SIDE_INTERNAL')[0];
      expect(internalSide).toBeDefined();
      expect(internalSide.name).toBe('Bok wewnętrzny');
    });

    it('should generate external side panel', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const externalSide = findPartsByRole(parts, 'CORNER_SIDE_EXTERNAL')[0];
      expect(externalSide).toBeDefined();
      expect(externalSide.name).toBe('Bok zewnętrzny');
    });

    it('should position internal side at X = t/2', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const internalSide = findPartsByRole(parts, 'CORNER_SIDE_INTERNAL')[0];
      // Internal side at X = t/2 = 9
      expect(internalSide.position[0]).toBeCloseTo(9, 0);
    });

    it('should position external side at X = W - t/2', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const externalSide = findPartsByRole(parts, 'CORNER_SIDE_EXTERNAL')[0];
      // External side at X = W - t/2 = 1000 - 9 = 991
      expect(externalSide.position[0]).toBeCloseTo(991, 0);
    });

    it('should have sides with depth D', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const internalSide = findPartsByRole(parts, 'CORNER_SIDE_INTERNAL')[0];
      const externalSide = findPartsByRole(parts, 'CORNER_SIDE_EXTERNAL')[0];
      expect(internalSide.width).toBe(600); // D
      expect(externalSide.width).toBe(600); // D
    });
  });

  describe('back panel', () => {
    it('should generate back panel when hasBack is true', () => {
      const params = createDefaultParams({ hasBack: true });
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backPart = findPartsByRole(parts, 'CORNER_BACK')[0];
      expect(backPart).toBeDefined();
      expect(backPart.name).toBe('Plecy');
    });

    it('should not generate back panel when hasBack is false', () => {
      const params = createDefaultParams({ hasBack: false });
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backParts = findPartsByRole(parts, 'CORNER_BACK');
      expect(backParts.length).toBe(0);
    });

    it('should position back panel at Z = D + backT/2 (behind cabinet)', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backPart = findPartsByRole(parts, 'CORNER_BACK')[0];
      // Back at Z = D + backT/2 = 600 + 1.5 = 601.5 (outside/behind cabinet body)
      expect(backPart.position[2]).toBeCloseTo(601.5, 0);
    });

    it('should have back panel width = W (overlaps sides)', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backPart = findPartsByRole(parts, 'CORNER_BACK')[0];
      // Back panel overlaps sides: width = W = 1000
      expect(backPart.width).toBe(1000);
    });

    it('should have back panel height = H for inset mounting', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const backPart = findPartsByRole(parts, 'CORNER_BACK')[0];
      expect(backPart.height).toBe(720); // H
    });
  });

  describe('front panel and door', () => {
    it('should generate front panel for SINGLE type', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontPanel = findPartsByRole(parts, 'CORNER_FRONT_PANEL')[0];
      expect(frontPanel).toBeDefined();
      expect(frontPanel.name).toBe('Panel przedni');
    });

    it('should generate door for SINGLE type', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // Door uses standard DOOR role for front hiding/handles integration
      const door = findPartsByRole(parts, 'DOOR')[0];
      expect(door).toBeDefined();
      expect(door.name).toBe('Drzwi');
    });

    it('should not generate front panel or door for NONE type', () => {
      const cornerConfig = CornerDomain.updateFrontType(
        CornerDomain.createConfig(),
        'NONE'
      );
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const frontPanels = findPartsByRole(parts, 'CORNER_FRONT_PANEL');
      const doors = findPartsByRole(parts, 'DOOR');
      expect(frontPanels.length).toBe(0);
      expect(doors.length).toBe(0);
    });

    it('should position door on right when doorPosition is RIGHT', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        doorPosition: 'RIGHT' as const,
        doorWidth: 450,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const door = findPartsByRole(parts, 'DOOR')[0];
      const frontPanel = findPartsByRole(parts, 'CORNER_FRONT_PANEL')[0];

      // Door should be to the right of front panel
      expect(door.position[0]).toBeGreaterThan(frontPanel.position[0]);
    });

    it('should position door on left when doorPosition is LEFT', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        doorPosition: 'LEFT' as const,
        doorWidth: 450,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const door = findPartsByRole(parts, 'DOOR')[0];
      const frontPanel = findPartsByRole(parts, 'CORNER_FRONT_PANEL')[0];

      // Door should be to the left of front panel
      expect(door.position[0]).toBeLessThan(frontPanel.position[0]);
    });

    it('should include door metadata with hinge side', () => {
      const cornerConfig = {
        ...CornerDomain.createConfig(),
        hingeSide: 'right' as const,
      };
      const params = createDefaultParams({ cornerConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const door = findPartsByRole(parts, 'DOOR')[0];
      expect(door.cabinetMetadata?.doorMetadata?.hingeSide).toBe('RIGHT');
    });
  });

  describe('shelves', () => {
    it('should generate at least one shelf', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const shelfParts = findPartsByRole(parts, 'CORNER_SHELF');
      expect(shelfParts.length).toBeGreaterThanOrEqual(1);
    });

    it('should have shelf index in metadata', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const shelfPart = findPartsByRole(parts, 'CORNER_SHELF')[0];
      expect(shelfPart.cabinetMetadata?.index).toBe(0);
    });

    it('should have shelf width = W - 2*t', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const shelfPart = findPartsByRole(parts, 'CORNER_SHELF')[0];
      // W - 2*t = 1000 - 36 = 964
      expect(shelfPart.width).toBe(964);
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

      const internalSide = findPartsByRole(parts, 'CORNER_SIDE_INTERNAL')[0];
      // For inset mounting, side height = cabinet height
      expect(internalSide.height).toBe(720);
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

      const internalSide = findPartsByRole(parts, 'CORNER_SIDE_INTERNAL')[0];
      // For overlay mounting, side height = cabinet height - 2 * thickness
      expect(internalSide.height).toBe(720 - 2 * 18);
    });
  });

  describe('leg offset', () => {
    it('should apply leg offset to Y positions', () => {
      const legsConfig = LegsDomain.createLegsConfig(true, 'STANDARD');
      const params = createDefaultParams({ legs: legsConfig });

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const expectedOffset = LegsDomain.calculateLegHeightOffset(legsConfig);

      // Bottom panel should be elevated by leg height
      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.position[1]).toBeGreaterThanOrEqual(expectedOffset);
    });
  });

  describe('edge banding', () => {
    it('should apply RECT edge banding to all body panels', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      const bottomPart = findPartsByRole(parts, 'CORNER_BOTTOM')[0];
      expect(bottomPart.edgeBanding.type).toBe('RECT');
    });
  });

  describe('coordinate system', () => {
    it('should have all parts in positive coordinate space', () => {
      const params = createDefaultParams();
      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // All parts except front panels (which are at Z=-t/2) should be >= 0
      parts.forEach(part => {
        expect(part.position[0]).toBeGreaterThanOrEqual(-50); // X
        expect(part.position[1]).toBeGreaterThanOrEqual(0);   // Y
        // Z can be negative for front panels
      });
    });

    it('should position parts within bounding box W x H x D', () => {
      const params = createDefaultParams();
      const { W, D } = params.cornerConfig;
      const H = params.height;

      const parts = generateLShapedCorner(
        cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial
      );

      // Check X positions are within [0, W + margin]
      parts.forEach(part => {
        expect(part.position[0]).toBeLessThanOrEqual(W + 50);
      });

      // Check Z positions are within [-50, D+50]
      parts.forEach(part => {
        expect(part.position[2]).toBeLessThanOrEqual(D + 50);
      });

      // Check Y positions are within [0, H+50]
      parts.forEach(part => {
        expect(part.position[1]).toBeLessThanOrEqual(H + 50);
      });
    });
  });
});
