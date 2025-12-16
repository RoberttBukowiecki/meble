/**
 * Wall Cabinet Generator Tests
 *
 * Tests for wallCabinet.ts covering:
 * - Basic part generation (body, shelves)
 * - Door generation (standard and folding)
 * - Back panel with hanger cutouts
 * - No legs generation (wall-mounted)
 */

import { generateWallCabinet } from './wallCabinet';
import type {
  CabinetMaterials,
  WallCabinetParams,
  Material,
  HangerCutoutConfig,
  FoldingDoorConfig,
} from '@/types';
import { DEFAULT_HANGER_CUTOUT_CONFIG, DEFAULT_FOLDING_DOOR_CONFIG } from '../config';

// ============================================================================
// Test Fixtures
// ============================================================================

const testBodyMaterial: Material = {
  id: 'body-mat-1',
  name: 'Korpus 18mm',
  color: '#ffffff',
  thickness: 18,
  isDefault: true,
  category: 'board',
};

const testFrontMaterial: Material = {
  id: 'front-mat-1',
  name: 'Front 18mm',
  color: '#333333',
  thickness: 18,
  isDefault: false,
  category: 'board',
};

const testBackMaterial: Material = {
  id: 'back-mat-1',
  name: 'HDF 3mm',
  color: '#cccccc',
  thickness: 3,
  isDefault: true,
  category: 'hdf',
};

const testMaterials: CabinetMaterials = {
  bodyMaterialId: testBodyMaterial.id,
  frontMaterialId: testFrontMaterial.id,
  backMaterialId: testBackMaterial.id,
};

function createWallCabinetParams(overrides: Partial<WallCabinetParams> = {}): WallCabinetParams {
  return {
    type: 'WALL',
    width: 800,
    height: 720,
    depth: 350,
    shelfCount: 1,
    hasDoors: true,
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: 0.667,
    backMountType: 'overlap',
    doorConfig: {
      layout: 'DOUBLE',
      openingDirection: 'LIFT_UP',
    },
    hangerCutouts: DEFAULT_HANGER_CUTOUT_CONFIG,
    ...overrides,
  };
}

// ============================================================================
// Wall Cabinet Generator Tests
// ============================================================================

describe('Wall Cabinet Generator', () => {
  const cabinetId = 'test-cabinet-1';
  const furnitureId = 'test-furniture-1';

  describe('Basic Structure', () => {
    it('generates body parts (bottom, top, left side, right side)', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const partNames = parts.map((p) => p.name);
      expect(partNames).toContain('Dno');
      expect(partNames).toContain('Góra');
      expect(partNames).toContain('Bok lewy');
      expect(partNames).toContain('Bok prawy');
    });

    it('all body parts use body material', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false, shelfCount: 0 });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const bodyParts = parts.filter((p) =>
        ['Dno', 'Góra', 'Bok lewy', 'Bok prawy'].includes(p.name)
      );
      expect(bodyParts.every((p) => p.materialId === testBodyMaterial.id)).toBe(true);
    });

    it('generates correct number of shelves', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false, shelfCount: 3 });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const shelves = parts.filter((p) => p.name.startsWith('Półka'));
      expect(shelves.length).toBe(3);
    });

    it('generates no shelves when shelfCount is 0', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false, shelfCount: 0 });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const shelves = parts.filter((p) => p.name.startsWith('Półka'));
      expect(shelves.length).toBe(0);
    });

    it('assigns correct cabinet metadata to all parts', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      expect(parts.every((p) => p.cabinetMetadata?.cabinetId === cabinetId)).toBe(true);
      expect(parts.every((p) => p.furnitureId === furnitureId)).toBe(true);
      expect(parts.every((p) => p.group === cabinetId)).toBe(true);
    });
  });

  describe('Door Generation', () => {
    it('generates doors when hasDoors is true', () => {
      const params = createWallCabinetParams({ hasDoors: true, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBeGreaterThan(0);
    });

    it('does not generate doors when hasDoors is false', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(0);
    });

    it('doors use front material', () => {
      const params = createWallCabinetParams({ hasDoors: true, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.every((p) => p.materialId === testFrontMaterial.id)).toBe(true);
    });

    it('generates 2 doors for DOUBLE layout', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(2);
    });

    it('generates 1 door for SINGLE layout', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(1);
    });
  });

  describe('Folding Door Generation', () => {
    it('generates 2 door sections for SINGLE folding door', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: 3 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(2); // Upper and lower sections

      const upperSection = doors.find((p) => p.name === 'Front górny');
      const lowerSection = doors.find((p) => p.name === 'Front dolny');
      expect(upperSection).toBeDefined();
      expect(lowerSection).toBeDefined();
    });

    it('generates 4 door sections for DOUBLE folding doors', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: 3 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(4); // 2 columns × 2 sections

      const leftLower = doors.find((p) => p.name === 'Front lewy dolny');
      const leftUpper = doors.find((p) => p.name === 'Front lewy górny');
      const rightLower = doors.find((p) => p.name === 'Front prawy dolny');
      const rightUpper = doors.find((p) => p.name === 'Front prawy górny');

      expect(leftLower).toBeDefined();
      expect(leftUpper).toBeDefined();
      expect(rightLower).toBeDefined();
      expect(rightUpper).toBeDefined();
    });

    it('folding door sections have correct foldingSection metadata', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: 3 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      const upperSection = doors.find((p) => p.cabinetMetadata?.doorMetadata?.foldingSection === 'UPPER');
      const lowerSection = doors.find((p) => p.cabinetMetadata?.doorMetadata?.foldingSection === 'LOWER');

      expect(upperSection).toBeDefined();
      expect(lowerSection).toBeDefined();
    });

    it('does not generate folding doors when foldingDoorConfig.enabled is false', () => {
      const params = createWallCabinetParams({
        hasDoors: true,
        hasBack: false,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
        foldingDoorConfig: { enabled: false, splitRatio: 0.5, sectionGap: 3 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const doors = parts.filter((p) => p.cabinetMetadata?.role === 'DOOR');
      expect(doors.length).toBe(1); // Single standard door

      // Should not have folding section metadata
      const foldingSections = doors.filter((p) => p.cabinetMetadata?.doorMetadata?.foldingSection);
      expect(foldingSections.length).toBe(0);
    });
  });

  describe('Back Panel with Hanger Cutouts', () => {
    it('generates back panel when hasBack is true', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: true });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial,
        testBackMaterial
      );

      const backPanel = parts.find((p) => p.cabinetMetadata?.role === 'BACK');
      expect(backPanel).toBeDefined();
    });

    it('does not generate back panel when hasBack is false', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial,
        testBackMaterial
      );

      const backPanel = parts.find((p) => p.cabinetMetadata?.role === 'BACK');
      expect(backPanel).toBeUndefined();
    });

    it('back panel uses POLYGON shape when cutouts are enabled', () => {
      const params = createWallCabinetParams({
        hasDoors: false,
        hasBack: true,
        hangerCutouts: { enabled: true, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial,
        testBackMaterial
      );

      const backPanel = parts.find((p) => p.cabinetMetadata?.role === 'BACK');
      expect(backPanel?.shapeType).toBe('POLYGON');
      expect(backPanel?.shapeParams.type).toBe('POLYGON');
    });

    it('back panel uses RECT shape when cutouts are disabled', () => {
      const params = createWallCabinetParams({
        hasDoors: false,
        hasBack: true,
        hangerCutouts: { enabled: false, width: 50, height: 40, horizontalInset: 50, verticalInset: 30 },
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial,
        testBackMaterial
      );

      const backPanel = parts.find((p) => p.cabinetMetadata?.role === 'BACK');
      expect(backPanel?.shapeType).toBe('RECT');
    });

    it('back panel uses back material', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: true });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial,
        testBackMaterial
      );

      const backPanel = parts.find((p) => p.cabinetMetadata?.role === 'BACK');
      expect(backPanel?.materialId).toBe(testBackMaterial.id);
    });
  });

  describe('No Legs (Wall Mounted)', () => {
    it('does not generate any leg-related parts', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      // Check that no parts have leg-related roles
      const legParts = parts.filter((p) =>
        p.cabinetMetadata?.role?.toString().includes('LEG')
      );
      expect(legParts.length).toBe(0);
    });

    it('body parts start at Y=0 (no leg offset)', () => {
      const params = createWallCabinetParams({ hasDoors: false, hasBack: false, shelfCount: 0 });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const bottomPanel = parts.find((p) => p.name === 'Dno');
      // Bottom panel center should be at thickness/2 (9mm for 18mm material)
      expect(bottomPanel?.position[1]).toBe(testBodyMaterial.thickness / 2);
    });
  });

  describe('Error Handling', () => {
    it('throws error for non-WALL cabinet type', () => {
      const params = {
        ...createWallCabinetParams(),
        type: 'KITCHEN' as const,
      };

      expect(() =>
        generateWallCabinet(
          cabinetId,
          furnitureId,
          params as any,
          testMaterials,
          testBodyMaterial
        )
      ).toThrow('Invalid params type');
    });
  });

  describe('Dimensions', () => {
    it('generates correct dimensions for inset top/bottom placement', () => {
      const params = createWallCabinetParams({
        hasDoors: false,
        hasBack: false,
        shelfCount: 0,
        topBottomPlacement: 'inset',
        width: 800,
        height: 720,
        depth: 350,
      });
      const parts = generateWallCabinet(
        cabinetId,
        furnitureId,
        params,
        testMaterials,
        testBodyMaterial
      );

      const bottomPanel = parts.find((p) => p.name === 'Dno');
      const leftSide = parts.find((p) => p.name === 'Bok lewy');

      // For inset placement: top/bottom width = cabinet width - 2 * thickness
      expect(bottomPanel?.width).toBe(800 - 2 * 18); // 764mm
      // Side height equals cabinet height for inset
      expect(leftSide?.height).toBe(720);
    });
  });
});
