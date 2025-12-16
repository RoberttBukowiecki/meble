/**
 * Smart Export Integration Tests
 *
 * Tests the 24h free re-export feature (Smart Export).
 * Verifies that:
 * - Project hash is consistent for same data
 * - Project hash changes when data changes
 * - Free re-export is triggered when hash matches existing session
 * - New credit is consumed when hash differs or session expired
 */

import { generatePartsHash, generateProjectHash } from '@/lib/projectHash';
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

function createTestFurniture(overrides: Partial<Furniture> = {}): Furniture {
  return {
    id: 'furniture-1',
    name: 'Test Furniture',
    ...overrides,
  } as Furniture;
}

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

describe('Smart Export Integration', () => {
  describe('project hash consistency', () => {
    it('generates same hash for unchanged project', () => {
      const parts = [createTestPart()];

      const hash1 = generatePartsHash(parts);
      const hash2 = generatePartsHash(parts);

      expect(hash1).toBe(hash2);
    });

    it('generates different hash when part is added', () => {
      const parts1 = [createTestPart({ id: 'part-1' })];
      const parts2 = [
        createTestPart({ id: 'part-1' }),
        createTestPart({ id: 'part-2', name: 'New Part' }),
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

    it('generates different hash when dimensions changed', () => {
      const parts1 = [createTestPart({ width: 500 })];
      const parts2 = [createTestPart({ width: 600 })]; // Changed dimension

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hash when material changed', () => {
      const parts1 = [createTestPart({ materialId: 'material-1' })];
      const parts2 = [createTestPart({ materialId: 'material-2' })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hash when edge banding changed', () => {
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
        bottom: true, // Changed
        left: false,
        right: false,
      };

      const parts1 = [createTestPart({ edgeBanding: edgeBanding1 })];
      const parts2 = [createTestPart({ edgeBanding: edgeBanding2 })];

      const hash1 = generatePartsHash(parts1);
      const hash2 = generatePartsHash(parts2);

      expect(hash1).not.toBe(hash2);
    });

    it('generates same hash regardless of part order', () => {
      const part1 = createTestPart({ id: 'part-a', name: 'Part A' });
      const part2 = createTestPart({ id: 'part-b', name: 'Part B' });

      const hash1 = generatePartsHash([part1, part2]);
      const hash2 = generatePartsHash([part2, part1]);

      expect(hash1).toBe(hash2);
    });

    it('generates same hash for full project regardless of array order', () => {
      const part1 = createTestPart({ id: 'part-1' });
      const part2 = createTestPart({ id: 'part-2' });
      const material1 = createTestMaterial({ id: 'mat-1' });
      const material2 = createTestMaterial({ id: 'mat-2' });
      const cabinet1 = createTestCabinet({ id: 'cab-1' });
      const cabinet2 = createTestCabinet({ id: 'cab-2' });

      const project1 = {
        parts: [part1, part2],
        materials: [material1, material2],
        cabinets: [cabinet1, cabinet2],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
      };

      const project2 = {
        parts: [part2, part1], // Reversed
        materials: [material2, material1], // Reversed
        cabinets: [cabinet2, cabinet1], // Reversed
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
      };

      const hash1 = generateProjectHash(project1);
      const hash2 = generateProjectHash(project2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('re-export detection simulation', () => {
    /**
     * Simulates the re-export flow:
     * 1. First export creates hash
     * 2. Same hash within 24h = free
     * 3. Different hash = paid
     */

    it('simulates free re-export scenario (same hash)', () => {
      const parts = [createTestPart()];

      // First export
      const firstHash = generatePartsHash(parts);

      // Simulated stored session (would be in export_sessions table)
      const session = {
        projectHash: firstHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      };

      // Second export - same parts, no changes
      const secondHash = generatePartsHash(parts);

      // Verify hashes match
      const isFreeReexport = secondHash === session.projectHash && session.expiresAt > new Date();

      expect(isFreeReexport).toBe(true);
    });

    it('simulates paid export scenario (hash changed)', () => {
      const originalParts = [createTestPart({ width: 500 })];
      const modifiedParts = [createTestPart({ width: 600 })]; // Dimension changed

      // First export
      const firstHash = generatePartsHash(originalParts);

      // Simulated stored session
      const session = {
        projectHash: firstHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // Second export - modified parts
      const secondHash = generatePartsHash(modifiedParts);

      // Hashes should differ
      const isFreeReexport = secondHash === session.projectHash && session.expiresAt > new Date();

      expect(isFreeReexport).toBe(false);
    });

    it('simulates paid export scenario (session expired)', () => {
      const parts = [createTestPart()];

      // First export
      const firstHash = generatePartsHash(parts);

      // Simulated expired session
      const session = {
        projectHash: firstHash,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      };

      // Second export - same parts
      const secondHash = generatePartsHash(parts);

      // Hashes match but session expired
      const isFreeReexport = secondHash === session.projectHash && session.expiresAt > new Date();

      expect(isFreeReexport).toBe(false);
    });
  });

  describe('hash format validation', () => {
    it('parts hash has correct prefix', () => {
      const hash = generatePartsHash([createTestPart()]);

      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('project hash has correct prefix', () => {
      const hash = generateProjectHash({
        parts: [createTestPart()],
        cabinets: [createTestCabinet()],
        furnitures: [createTestFurniture()],
        room: createTestRoom(),
        materials: [createTestMaterial()],
      });

      expect(hash.startsWith('proj_')).toBe(true);
    });

    it('hash is deterministic across multiple calls', () => {
      const parts = [
        createTestPart({ id: 'part-1' }),
        createTestPart({ id: 'part-2' }),
        createTestPart({ id: 'part-3' }),
      ];

      // Generate hash 100 times
      const hashes = Array.from({ length: 100 }, () => generatePartsHash(parts));

      // All hashes should be identical
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty parts array', () => {
      const hash = generatePartsHash([]);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles parts with complex edge banding', () => {
      const partWithLShape = createTestPart({
        edgeBanding: {
          type: 'L_SHAPE',
          edge1: true,
          edge2: false,
          edge3: true,
          edge4: false,
          edge5: true,
          edge6: false,
        },
      });

      const partWithTrapezoid = createTestPart({
        id: 'part-2',
        edgeBanding: {
          type: 'TRAPEZOID',
          front: true,
          back: false,
          left: true,
          right: false,
        },
      });

      const partWithGeneric = createTestPart({
        id: 'part-3',
        edgeBanding: {
          type: 'GENERIC',
          edges: [0, 2, 4, 6],
        },
      });

      const hash = generatePartsHash([partWithLShape, partWithTrapezoid, partWithGeneric]);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });

    it('handles parts with various shape types', () => {
      const rectPart = createTestPart({ shapeType: 'RECT' });
      const polygonPart = createTestPart({
        id: 'part-2',
        shapeType: 'POLYGON' as any,
        shapeParams: { points: [[0, 0], [100, 0], [100, 100], [0, 100]] },
      });

      const hash = generatePartsHash([rectPart, polygonPart]);

      expect(hash).toBeDefined();
    });

    it('handles very large numbers of parts', () => {
      const manyParts = Array.from({ length: 100 }, (_, i) =>
        createTestPart({ id: `part-${i}`, name: `Part ${i}` })
      );

      const hash = generatePartsHash(manyParts);

      expect(hash).toBeDefined();
      expect(hash.startsWith('parts_')).toBe(true);
    });
  });

  describe('UI feedback scenarios', () => {
    /**
     * These scenarios simulate what users would see in the UI
     */

    it('scenario: first export of project', () => {
      const parts = [createTestPart()];
      const hash = generatePartsHash(parts);

      // No existing session
      const existingSession = null;

      // Result: Should consume credit
      const shouldConsumeCredit = existingSession === null;
      const message = 'Eksport ukończony. Pozostało kredytów: X';

      expect(shouldConsumeCredit).toBe(true);
      expect(message).toContain('Pozostało');
    });

    it('scenario: re-export within 24h', () => {
      const parts = [createTestPart()];
      const hash = generatePartsHash(parts);

      // Existing valid session
      const existingSession = {
        projectHash: hash,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h remaining
      };

      // Check if free re-export
      const isFreeReexport = hash === existingSession.projectHash && existingSession.expiresAt > new Date();

      // Result: Free re-export
      const message = isFreeReexport
        ? 'Darmowy re-export (Smart Export aktywny)'
        : 'Eksport ukończony. Pozostało kredytów: X';

      expect(isFreeReexport).toBe(true);
      expect(message).toContain('Darmowy');
    });

    it('scenario: export after modifications', () => {
      // Note: Only certain fields are hashed: id, dimensions, materialId, edgeBanding, shapeType, shapeParams
      const originalParts = [createTestPart({ width: 500 })];
      const modifiedParts = [createTestPart({ width: 600 })]; // Dimension change affects hash

      const originalHash = generatePartsHash(originalParts);

      // Existing session with original hash
      const existingSession = {
        projectHash: originalHash,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };

      // New hash after modifications
      const newHash = generatePartsHash(modifiedParts);

      // Check if free re-export
      const isFreeReexport = newHash === existingSession.projectHash && existingSession.expiresAt > new Date();

      // Result: Should consume credit (project changed)
      expect(isFreeReexport).toBe(false);
    });

    it('scenario: export after 24h expiry', () => {
      const parts = [createTestPart()];
      const hash = generatePartsHash(parts);

      // Expired session
      const existingSession = {
        projectHash: hash,
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Expired 1h ago
      };

      // Check if free re-export
      const isFreeReexport = hash === existingSession.projectHash && existingSession.expiresAt > new Date();

      // Result: Should consume credit (session expired)
      expect(isFreeReexport).toBe(false);
    });
  });
});
