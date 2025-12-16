/**
 * Project Hash Tests
 *
 * Tests for deterministic hash generation used in Smart Export feature.
 * The hash must be consistent for same data and different for different data.
 */

import { generateProjectHash, generatePartsHash } from './projectHash';
import type { Part, Material, Cabinet, Furniture, EdgeBanding } from '@/types';

// Helper to create test part
function createTestPart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'part-1',
    name: 'Test Part',
    furnitureId: 'furniture-1',
    shapeType: 'RECT',
    shapeParams: { width: 500, height: 300 },
    width: 500,
    height: 300,
    depth: 18,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    materialId: 'material-1',
    edgeBanding: {
      type: 'RECT',
      top: true,
      bottom: false,
      left: false,
      right: true,
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// Helper to create test material
function createTestMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'material-1',
    name: 'Test Material',
    color: '#FFFFFF',
    thickness: 18,
    category: 'board',
    ...overrides,
  } as Material;
}

// Helper to create test cabinet
function createTestCabinet(overrides: Partial<Cabinet> = {}): Cabinet {
  return {
    id: 'cabinet-1',
    name: 'Test Cabinet',
    furnitureId: 'furniture-1',
    type: 'KITCHEN',
    params: { width: 600, height: 720, depth: 560 },
    materials: { body: 'material-1' },
    topBottomPlacement: 'inset',
    partIds: ['part-1'],
    position: [0, 0, 0],
    ...overrides,
  } as Cabinet;
}

// Helper to create test furniture
function createTestFurniture(overrides: Partial<Furniture> = {}): Furniture {
  return {
    id: 'furniture-1',
    name: 'Test Furniture',
    ...overrides,
  } as Furniture;
}

// Helper to create test room
function createTestRoom() {
  return {
    id: 'room-1',
    name: 'Test Room',
    heightMm: 2500,
    wallThicknessMm: 100,
    floorThicknessMm: 50,
    defaultCeiling: true,
    wallMaterialId: 'wall-mat',
    floorMaterialId: 'floor-mat',
    ceilingMaterialId: 'ceiling-mat',
    origin: [0, 0, 0] as [number, number, number],
  };
}

describe('projectHash', () => {
  describe('generatePartsHash', () => {
    it('generates consistent hash for same parts', () => {
      const parts = [createTestPart()];

      const hash1 = generatePartsHash(parts);
      const hash2 = generatePartsHash(parts);

      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different parts', () => {
      const parts1 = [createTestPart({ id: 'part-1' })];
      const parts2 = [createTestPart({ id: 'part-2' })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for dimension changes', () => {
      const parts1 = [createTestPart({ width: 500 })];
      const parts2 = [createTestPart({ width: 600 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for height changes', () => {
      const parts1 = [createTestPart({ height: 300 })];
      const parts2 = [createTestPart({ height: 400 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for depth changes', () => {
      const parts1 = [createTestPart({ depth: 18 })];
      const parts2 = [createTestPart({ depth: 25 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for material changes', () => {
      const parts1 = [createTestPart({ materialId: 'material-1' })];
      const parts2 = [createTestPart({ materialId: 'material-2' })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for edge banding changes', () => {
      const edgeBanding1: EdgeBanding = {
        type: 'RECT',
        top: true,
        bottom: false,
        left: false,
        right: false,
      };
      const edgeBanding2: EdgeBanding = {
        type: 'RECT',
        top: true,
        bottom: true,
        left: false,
        right: false,
      };

      const parts1 = [createTestPart({ edgeBanding: edgeBanding1 })];
      const parts2 = [createTestPart({ edgeBanding: edgeBanding2 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('is insensitive to part array order', () => {
      const part1 = createTestPart({ id: 'part-1', name: 'Part A' });
      const part2 = createTestPart({ id: 'part-2', name: 'Part B' });

      const hash1 = generatePartsHash([part1, part2]);
      const hash2 = generatePartsHash([part2, part1]);

      expect(hash1).toBe(hash2);
    });

    it('handles empty parts array', () => {
      const hash = generatePartsHash([]);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('generates valid format: parts_{hash}', () => {
      const parts = [createTestPart()];
      const hash = generatePartsHash(parts);

      expect(hash.startsWith('parts_')).toBe(true);
      expect(hash.length).toBeGreaterThan(6); // 'parts_' + at least 1 char
    });

    it('generates different hashes for shape type changes', () => {
      const parts1 = [createTestPart({ shapeType: 'RECT' })];
      const parts2 = [createTestPart({ shapeType: 'POLYGON' as any })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for shape params changes', () => {
      const parts1 = [createTestPart({ shapeParams: { width: 500, height: 300 } })];
      const parts2 = [createTestPart({ shapeParams: { width: 500, height: 400 } })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('handles L_SHAPE edge banding', () => {
      const edgeBanding: EdgeBanding = {
        type: 'L_SHAPE',
        edge1: true,
        edge2: false,
        edge3: true,
        edge4: false,
        edge5: true,
        edge6: false,
      };

      const parts = [createTestPart({ edgeBanding })];
      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles TRAPEZOID edge banding', () => {
      const edgeBanding: EdgeBanding = {
        type: 'TRAPEZOID',
        front: true,
        back: false,
        left: true,
        right: false,
      };

      const parts = [createTestPart({ edgeBanding })];
      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles GENERIC edge banding', () => {
      const edgeBanding: EdgeBanding = {
        type: 'GENERIC',
        edges: [0, 2, 4],
      };

      const parts = [createTestPart({ edgeBanding })];
      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('generates consistent hash for GENERIC edge banding regardless of edge order', () => {
      const edgeBanding1: EdgeBanding = {
        type: 'GENERIC',
        edges: [0, 2, 4],
      };
      const edgeBanding2: EdgeBanding = {
        type: 'GENERIC',
        edges: [4, 0, 2],
      };

      const parts1 = [createTestPart({ edgeBanding: edgeBanding1 })];
      const parts2 = [createTestPart({ edgeBanding: edgeBanding2 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).toBe(hash2);
    });

    it('handles multiple parts correctly', () => {
      const parts = [
        createTestPart({ id: 'part-1', width: 500 }),
        createTestPart({ id: 'part-2', width: 600 }),
        createTestPart({ id: 'part-3', width: 700 }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('generates different hash when part is added', () => {
      const parts1 = [createTestPart({ id: 'part-1' })];
      const parts2 = [
        createTestPart({ id: 'part-1' }),
        createTestPart({ id: 'part-2' }),
      ];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hash when part is removed', () => {
      const parts1 = [
        createTestPart({ id: 'part-1' }),
        createTestPart({ id: 'part-2' }),
      ];
      const parts2 = [createTestPart({ id: 'part-1' })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateProjectHash', () => {
    it('generates consistent hash for same project', () => {
      const projectData = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(projectData);
      const hash2 = generateProjectHash(projectData);

      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for cabinet changes', () => {
      const baseData = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(baseData);

      const modifiedData = {
        ...baseData,
        cabinets: [createTestCabinet({ name: 'Modified Cabinet' })],
      };

      const hash2 = generateProjectHash(modifiedData);

      expect(hash1).not.toBe(hash2);
    });

    it('includes room data in hash', () => {
      const baseData = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(baseData);

      const modifiedData = {
        ...baseData,
        room: { ...createTestRoom(), heightMm: 3000 },
      };

      const hash2 = generateProjectHash(modifiedData);

      expect(hash1).not.toBe(hash2);
    });

    it('includes materials in hash', () => {
      const baseData = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(baseData);

      const modifiedData = {
        ...baseData,
        materials: [createTestMaterial({ name: 'Different Material' })],
      };

      const hash2 = generateProjectHash(modifiedData);

      expect(hash1).not.toBe(hash2);
    });

    it('generates valid format: proj_{hash}', () => {
      const projectData = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash = generateProjectHash(projectData);

      expect(hash.startsWith('proj_')).toBe(true);
      expect(hash.length).toBeGreaterThan(5); // 'proj_' + at least 1 char
    });

    it('is insensitive to parts array order', () => {
      const part1 = createTestPart({ id: 'part-1' });
      const part2 = createTestPart({ id: 'part-2' });

      const data1 = {
        parts: [part1, part2],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const data2 = {
        parts: [part2, part1],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(data1);
      const hash2 = generateProjectHash(data2);

      expect(hash1).toBe(hash2);
    });

    it('is insensitive to cabinets array order', () => {
      const cabinet1 = createTestCabinet({ id: 'cabinet-1' });
      const cabinet2 = createTestCabinet({ id: 'cabinet-2' });

      const data1 = {
        parts: [createTestPart()],
        cabinets: [cabinet1, cabinet2],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const data2 = {
        parts: [createTestPart()],
        cabinets: [cabinet2, cabinet1],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      };

      const hash1 = generateProjectHash(data1);
      const hash2 = generateProjectHash(data2);

      expect(hash1).toBe(hash2);
    });

    it('is insensitive to materials array order', () => {
      const material1 = createTestMaterial({ id: 'material-1' });
      const material2 = createTestMaterial({ id: 'material-2' });

      const data1 = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [material1, material2],
      };

      const data2 = {
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [material2, material1],
      };

      const hash1 = generateProjectHash(data1);
      const hash2 = generateProjectHash(data2);

      expect(hash1).toBe(hash2);
    });

    it('handles empty arrays', () => {
      const projectData = {
        parts: [],
        cabinets: [],
        furnitures: [],
        room: createTestRoom(),
        materials: [],
      };

      const hash = generateProjectHash(projectData);

      expect(hash).toBeDefined();
      expect(hash.startsWith('proj_')).toBe(true);
    });
  });

  describe('hash determinism across multiple calls', () => {
    it('produces identical hashes for complex nested structures', () => {
      const complexPart = createTestPart({
        shapeParams: {
          width: 500,
          height: 300,
          nested: {
            a: 1,
            b: { c: 2, d: [1, 2, 3] },
          },
        } as any,
      });

      const parts = [complexPart];

      // Generate multiple times
      const hashes = Array.from({ length: 10 }, () => generatePartsHash(parts));

      // All should be identical
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });

    it('handles Date objects in parts consistently', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      const parts = [createTestPart({ createdAt: date, updatedAt: date })];

      const hash1 = generatePartsHash(parts);
      const hash2 = generatePartsHash(parts);

      expect(hash1).toBe(hash2);
    });
  });

  describe('edge cases', () => {
    it('handles parts with undefined optional fields', () => {
      const part: Part = {
        id: 'part-1',
        name: 'Test Part',
        furnitureId: 'furniture-1',
        shapeType: 'RECT',
        shapeParams: { width: 500, height: 300 },
        width: 500,
        height: 300,
        depth: 18,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        materialId: 'material-1',
        edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        // group, notes, cabinetMetadata are undefined
      };

      const hash = generatePartsHash([part]);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles parts with null-ish values in shapeParams', () => {
      const parts = [
        createTestPart({
          shapeParams: { width: 500, height: 300, extra: null } as any,
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles very large numbers', () => {
      const parts = [
        createTestPart({
          width: 999999999,
          height: 999999999,
          depth: 999999999,
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles zero dimensions', () => {
      const parts = [
        createTestPart({
          width: 0,
          height: 0,
          depth: 0,
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles negative positions', () => {
      const parts = [
        createTestPart({
          position: [-100, -200, -300],
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles special characters in part names', () => {
      const parts = [
        createTestPart({
          name: 'Part with "quotes" and <brackets> & ampersand',
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles unicode in part names', () => {
      const parts = [
        createTestPart({
          name: 'Część z polskimi znakami: ąęółżźćń',
        }),
      ];

      const hash = generatePartsHash(parts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });
  });
});
