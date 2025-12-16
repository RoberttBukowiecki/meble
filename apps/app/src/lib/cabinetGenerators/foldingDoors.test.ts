/**
 * Folding Doors Generator Tests
 *
 * Tests for foldingDoors.ts covering:
 * - Single folding door generation
 * - Double folding door generation
 * - Split ratio calculations
 * - Section gap handling
 * - Handle metadata placement
 */

import { generateFoldingDoors, FoldingDoorGenerationConfig } from './foldingDoors';
import type { DoorConfig, HandleConfig, FoldingDoorConfig } from '@/types';
import { FRONT_MARGIN, DOOR_GAP } from './constants';

// ============================================================================
// Test Fixtures
// ============================================================================

function createFoldingDoorConfig(
  overrides: Partial<FoldingDoorGenerationConfig> = {}
): FoldingDoorGenerationConfig {
  return {
    cabinetId: 'test-cabinet-1',
    furnitureId: 'test-furniture-1',
    cabinetWidth: 800,
    cabinetHeight: 720,
    cabinetDepth: 350,
    thickness: 18,
    frontMaterialId: 'front-mat-1',
    doorConfig: {
      layout: 'SINGLE',
      openingDirection: 'LIFT_UP',
    },
    handleConfig: undefined,
    foldingDoorConfig: {
      enabled: true,
      splitRatio: 0.5,
      sectionGap: 3,
    },
    legOffset: 0,
    ...overrides,
  };
}

// ============================================================================
// Folding Doors Generator Tests
// ============================================================================

describe('Folding Doors Generator', () => {
  describe('Single Folding Door', () => {
    it('generates 2 door sections (upper and lower)', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      expect(parts.length).toBe(2);

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      expect(lowerSection).toBeDefined();
      expect(upperSection).toBeDefined();
    });

    it('both sections have full width (minus margins)', () => {
      const config = createFoldingDoorConfig({
        cabinetWidth: 800,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const expectedWidth = 800 - FRONT_MARGIN * 2; // 796mm

      expect(parts[0].width).toBe(expectedWidth);
      expect(parts[1].width).toBe(expectedWidth);
    });

    it('sections have correct heights based on split ratio', () => {
      const config = createFoldingDoorConfig({
        cabinetHeight: 720,
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: 4 },
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const totalDoorHeight = 720 - FRONT_MARGIN * 2; // 716mm
      const availableHeight = totalDoorHeight - 4; // 712mm (minus gap)
      const expectedLowerHeight = availableHeight * 0.5; // 356mm
      const expectedUpperHeight = availableHeight * 0.5; // 356mm

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      expect(lowerSection?.height).toBe(expectedLowerHeight);
      expect(upperSection?.height).toBe(expectedUpperHeight);
    });

    it('asymmetric split ratio works correctly (60/40)', () => {
      const config = createFoldingDoorConfig({
        cabinetHeight: 720,
        foldingDoorConfig: { enabled: true, splitRatio: 0.6, sectionGap: 0 },
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const totalDoorHeight = 720 - FRONT_MARGIN * 2;
      const expectedLowerHeight = totalDoorHeight * 0.6;
      const expectedUpperHeight = totalDoorHeight * 0.4;

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      expect(lowerSection?.height).toBeCloseTo(expectedLowerHeight, 5);
      expect(upperSection?.height).toBeCloseTo(expectedUpperHeight, 5);
    });

    it('lower section is positioned below upper section', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      // Lower section Y center should be less than upper section Y center
      expect(lowerSection!.position[1]).toBeLessThan(upperSection!.position[1]);
    });

    it('sections have LIFT_UP opening direction', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.cabinetMetadata?.doorMetadata?.openingDirection).toBe('LIFT_UP');
      });
    });

    it('sections have correct foldingSection metadata', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      expect(lowerSection?.cabinetMetadata?.doorMetadata?.foldingSection).toBe('LOWER');
      expect(upperSection?.cabinetMetadata?.doorMetadata?.foldingSection).toBe('UPPER');
    });
  });

  describe('Double Folding Doors', () => {
    it('generates 4 door sections (2 per side)', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      expect(parts.length).toBe(4);

      expect(parts.find((p) => p.name === 'Front lewy dolny')).toBeDefined();
      expect(parts.find((p) => p.name === 'Front lewy górny')).toBeDefined();
      expect(parts.find((p) => p.name === 'Front prawy dolny')).toBeDefined();
      expect(parts.find((p) => p.name === 'Front prawy górny')).toBeDefined();
    });

    it('each door has half width (minus margins and gap)', () => {
      const config = createFoldingDoorConfig({
        cabinetWidth: 800,
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const availableWidth = 800 - FRONT_MARGIN * 2; // 796mm
      const expectedDoorWidth = (availableWidth - DOOR_GAP) / 2; // (796 - 3) / 2 = 396.5mm

      parts.forEach((part) => {
        expect(part.width).toBe(expectedDoorWidth);
      });
    });

    it('left doors are positioned on the left, right doors on the right', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const leftLower = parts.find((p) => p.name === 'Front lewy dolny');
      const rightLower = parts.find((p) => p.name === 'Front prawy dolny');

      // Left door X position should be negative (left of center)
      expect(leftLower!.position[0]).toBeLessThan(0);
      // Right door X position should be positive (right of center)
      expect(rightLower!.position[0]).toBeGreaterThan(0);
    });

    it('left doors have LEFT hinge side, right doors have RIGHT hinge side', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const leftLower = parts.find((p) => p.name === 'Front lewy dolny');
      const leftUpper = parts.find((p) => p.name === 'Front lewy górny');
      const rightLower = parts.find((p) => p.name === 'Front prawy dolny');
      const rightUpper = parts.find((p) => p.name === 'Front prawy górny');

      expect(leftLower?.cabinetMetadata?.doorMetadata?.hingeSide).toBe('LEFT');
      expect(leftUpper?.cabinetMetadata?.doorMetadata?.hingeSide).toBe('LEFT');
      expect(rightLower?.cabinetMetadata?.doorMetadata?.hingeSide).toBe('RIGHT');
      expect(rightUpper?.cabinetMetadata?.doorMetadata?.hingeSide).toBe('RIGHT');
    });
  });

  describe('Section Gap', () => {
    it('accounts for section gap in height calculations', () => {
      const gapSize = 5;
      const config = createFoldingDoorConfig({
        cabinetHeight: 720,
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: gapSize },
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const totalDoorHeight = 720 - FRONT_MARGIN * 2;
      const combinedSectionHeight =
        parts[0].height + parts[1].height;

      // Combined height + gap should equal total door height
      expect(combinedSectionHeight + gapSize).toBeCloseTo(totalDoorHeight, 5);
    });

    it('sections do not overlap with gap', () => {
      const config = createFoldingDoorConfig({
        foldingDoorConfig: { enabled: true, splitRatio: 0.5, sectionGap: 10 },
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      // Calculate actual positions
      const lowerTop = lowerSection!.position[1] + lowerSection!.height / 2;
      const upperBottom = upperSection!.position[1] - upperSection!.height / 2;

      // There should be a gap between them
      expect(upperBottom).toBeGreaterThan(lowerTop);
    });
  });

  describe('Handle Metadata', () => {
    it('handle metadata is only on lower sections', () => {
      const handleConfig: HandleConfig = {
        type: 'BAR',
        category: 'TRADITIONAL',
        dimensions: { length: 128, holeSpacing: 128, height: 35 },
        position: { preset: 'BOTTOM_CENTER', offsetFromEdge: 30 },
        orientation: 'HORIZONTAL',
        finish: 'chrome',
      };

      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
        handleConfig,
      });
      const parts = generateFoldingDoors(config);

      const lowerSection = parts.find((p) => p.name === 'Front dolny');
      const upperSection = parts.find((p) => p.name === 'Front górny');

      // Lower section should have handle metadata
      expect(lowerSection?.cabinetMetadata?.handleMetadata).toBeDefined();
      // Upper section should NOT have handle metadata
      expect(upperSection?.cabinetMetadata?.handleMetadata).toBeUndefined();
    });

    it('no handle metadata when handleConfig is undefined', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
        handleConfig: undefined,
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.cabinetMetadata?.handleMetadata).toBeUndefined();
      });
    });
  });

  describe('Material and Metadata', () => {
    it('all sections use front material', () => {
      const config = createFoldingDoorConfig({
        frontMaterialId: 'custom-front-mat',
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.materialId).toBe('custom-front-mat');
      });
    });

    it('all sections have DOOR role', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.cabinetMetadata?.role).toBe('DOOR');
      });
    });

    it('all sections have correct cabinet and furniture IDs', () => {
      const config = createFoldingDoorConfig({
        cabinetId: 'my-cabinet',
        furnitureId: 'my-furniture',
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.cabinetMetadata?.cabinetId).toBe('my-cabinet');
        expect(part.furnitureId).toBe('my-furniture');
        expect(part.group).toBe('my-cabinet');
      });
    });

    it('all sections have RECT shape', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'DOUBLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.shapeType).toBe('RECT');
        expect(part.shapeParams.type).toBe('RECT');
      });
    });

    it('all sections have full edge banding', () => {
      const config = createFoldingDoorConfig({
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      parts.forEach((part) => {
        expect(part.edgeBanding).toEqual({
          type: 'RECT',
          top: true,
          bottom: true,
          left: true,
          right: true,
        });
      });
    });
  });

  describe('Leg Offset', () => {
    it('applies leg offset to Y positions', () => {
      const legOffset = 100;
      const configWithOffset = createFoldingDoorConfig({
        legOffset,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const configWithoutOffset = createFoldingDoorConfig({
        legOffset: 0,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });

      const partsWithOffset = generateFoldingDoors(configWithOffset);
      const partsWithoutOffset = generateFoldingDoors(configWithoutOffset);

      // Each part should be offset by legOffset
      for (let i = 0; i < partsWithOffset.length; i++) {
        expect(partsWithOffset[i].position[1]).toBe(
          partsWithoutOffset[i].position[1] + legOffset
        );
      }
    });
  });

  describe('Z Position (Door Depth)', () => {
    it('doors are positioned in front of cabinet (Z = depth/2 + thickness/2)', () => {
      const config = createFoldingDoorConfig({
        cabinetDepth: 350,
        thickness: 18,
        doorConfig: { layout: 'SINGLE', openingDirection: 'LIFT_UP' },
      });
      const parts = generateFoldingDoors(config);

      const expectedZ = 350 / 2 + 18 / 2; // 175 + 9 = 184

      parts.forEach((part) => {
        expect(part.position[2]).toBe(expectedZ);
      });
    });
  });
});
