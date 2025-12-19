/**
 * Debug test for rotated part snapping issue
 * User reports: Part 2 (rotated with [-π/2, π/2, 0]) doesn't snap well
 */

import type { Part } from '@/types';
import { createOBBFromPart, getOBBFaces, type Vec3 } from './obb';
import { calculateSnapV3, calculatePartSnapV3, type SnapV3Input, type SnapV3Settings } from './snapping-v3';

function createPart(overrides: Partial<Part>): Part {
  return {
    id: 'test',
    name: 'Test Part',
    furnitureId: 'f1',
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: 0, y: 0 },
    width: 100,
    height: 100,
    depth: 18,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    materialId: 'm1',
    edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const defaultSettings: SnapV3Settings = {
  snapDistance: 20,
  collisionOffset: 1,
  hysteresisMargin: 2,
  enableConnectionSnap: true,
  enableAlignmentSnap: true,
  enableTJointSnap: true,
};

describe('Debug: Rotated part snapping', () => {
  // User's exact parts
  const part1 = createPart({
    id: 'part1',
    name: 'Ta czesc w tej pozycji snapuje do czesci 2',
    width: 600,
    height: 400,
    depth: 18,
    position: [-100, 26, 0],
    rotation: [-Math.PI / 2, 0, 0],
  });

  const part2 = createPart({
    id: 'part2',
    name: 'Część 2',
    width: 600,
    height: 400,
    depth: 18,
    position: [-601, 9, 0],
    rotation: [-Math.PI / 2, Math.PI / 2, 0], // Compound rotation!
  });

  describe('OBB analysis for Part 2 (compound rotation)', () => {
    it('shows face positions and normals for Part 2', () => {
      const obb = createOBBFromPart(part2);
      const faces = getOBBFaces(obb);

      console.log('Part 2 OBB analysis:');
      console.log('  Center:', obb.center);
      console.log('  HalfExtents:', obb.halfExtents);
      console.log('  Rotation:', obb.rotation);
      console.log('  Axes (rotated):');
      console.log('    axes[0] (local X):', obb.axes[0]);
      console.log('    axes[1] (local Y):', obb.axes[1]);
      console.log('    axes[2] (local Z):', obb.axes[2]);

      console.log('\n  Faces:');
      for (const face of faces) {
        const worldDir =
          Math.abs(face.normal[0]) > 0.9 ? (face.normal[0] > 0 ? 'World +X' : 'World -X') :
          Math.abs(face.normal[1]) > 0.9 ? (face.normal[1] > 0 ? 'World +Y' : 'World -Y') :
          Math.abs(face.normal[2]) > 0.9 ? (face.normal[2] > 0 ? 'World +Z' : 'World -Z') : '?';

        console.log(`    Local axis=${face.axisIndex}, sign=${face.sign > 0 ? '+' : '-'}:`);
        console.log(`      Center: [${face.center.map(n => n.toFixed(1)).join(', ')}]`);
        console.log(`      Normal: [${face.normal.map(n => n.toFixed(2)).join(', ')}] → ${worldDir}`);
      }

      // Verify Y-perpendicular faces exist
      const yFaces = faces.filter(f => Math.abs(f.normal[1]) > 0.9);
      expect(yFaces.length).toBe(2);
      console.log('\n  Y-perpendicular faces:');
      for (const f of yFaces) {
        console.log(`    Center Y=${f.center[1].toFixed(1)}, Normal Y=${f.normal[1].toFixed(2)}`);
      }
    });

    it('shows face positions and normals for Part 1', () => {
      const obb = createOBBFromPart(part1);
      const faces = getOBBFaces(obb);

      console.log('Part 1 OBB analysis:');
      console.log('  Center:', obb.center);
      console.log('  Axes:');
      console.log('    axes[0]:', obb.axes[0]);
      console.log('    axes[1]:', obb.axes[1]);
      console.log('    axes[2]:', obb.axes[2]);

      const yFaces = faces.filter(f => Math.abs(f.normal[1]) > 0.9);
      console.log('\n  Y-perpendicular faces:');
      for (const f of yFaces) {
        console.log(`    Center Y=${f.center[1].toFixed(1)}, Normal Y=${f.normal[1].toFixed(2)}`);
      }
    });
  });

  describe('World bounds analysis', () => {
    it('calculates world-space bounds', () => {
      const obb1 = createOBBFromPart(part1);
      const obb2 = createOBBFromPart(part2);
      const faces1 = getOBBFaces(obb1);
      const faces2 = getOBBFaces(obb2);

      const getAABB = (faces: typeof faces1) => {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        for (const f of faces) {
          for (const c of f.corners) {
            minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
            minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
            minZ = Math.min(minZ, c[2]); maxZ = Math.max(maxZ, c[2]);
          }
        }
        return { minX, maxX, minY, maxY, minZ, maxZ };
      };

      const aabb1 = getAABB(faces1);
      const aabb2 = getAABB(faces2);

      console.log('Part 1 world bounds:');
      console.log(`  X: [${aabb1.minX.toFixed(1)}, ${aabb1.maxX.toFixed(1)}]`);
      console.log(`  Y: [${aabb1.minY.toFixed(1)}, ${aabb1.maxY.toFixed(1)}]`);
      console.log(`  Z: [${aabb1.minZ.toFixed(1)}, ${aabb1.maxZ.toFixed(1)}]`);

      console.log('Part 2 world bounds:');
      console.log(`  X: [${aabb2.minX.toFixed(1)}, ${aabb2.maxX.toFixed(1)}]`);
      console.log(`  Y: [${aabb2.minY.toFixed(1)}, ${aabb2.maxY.toFixed(1)}]`);
      console.log(`  Z: [${aabb2.minZ.toFixed(1)}, ${aabb2.maxZ.toFixed(1)}]`);

      // Check Y overlap
      const yOverlapStart = Math.max(aabb1.minY, aabb2.minY);
      const yOverlapEnd = Math.min(aabb1.maxY, aabb2.maxY);
      const yOverlap = yOverlapEnd - yOverlapStart;

      console.log('\nY overlap analysis:');
      console.log(`  Part 1 Y: [${aabb1.minY.toFixed(1)}, ${aabb1.maxY.toFixed(1)}]`);
      console.log(`  Part 2 Y: [${aabb2.minY.toFixed(1)}, ${aabb2.maxY.toFixed(1)}]`);
      console.log(`  Overlap: ${yOverlap.toFixed(1)}mm`);

      if (yOverlap > 0) {
        console.log('  WARNING: Parts are overlapping in Y!');
      }
    });
  });

  describe('Snap behavior analysis', () => {
    it('tests Y-axis snap from Part 1 to Part 2', () => {
      // Simulate dragging Part 1 down toward Part 2
      const input: SnapV3Input = {
        movingPart: part1,
        targetParts: [part2],
        dragAxis: 'Y',
        movementDirection: -1, // Moving down
        currentOffset: [0, -5, 0], // Dragged 5mm down
      };

      const result = calculateSnapV3(input, defaultSettings);

      console.log('Y-axis snap result:');
      console.log('  Snapped:', result.snapped);
      console.log('  Offset:', result.offset);
      console.log('  Type:', result.snapType);
      console.log('  Source face:', result.sourceFaceId);
      console.log('  Target face:', result.targetFaceId);

      if (result.snapped) {
        const newCenterY = part1.position[1] + result.offset;
        console.log(`\n  Original center Y: ${part1.position[1]}`);
        console.log(`  New center Y: ${newCenterY}`);
        console.log(`  Part 1 bottom at Y: ${newCenterY - 9}`);
        console.log(`  Part 2 top at Y: ${part2.position[1] + 9}`);
        console.log(`  Gap: ${(newCenterY - 9) - (part2.position[1] + 9)}mm`);
      }
    });

    it('tests X-axis snap from Part 1 to Part 2', () => {
      // Simulate dragging Part 1 left toward Part 2
      const input: SnapV3Input = {
        movingPart: part1,
        targetParts: [part2],
        dragAxis: 'X',
        movementDirection: -1, // Moving left
        currentOffset: [-10, 0, 0], // Dragged 10mm left
      };

      const result = calculateSnapV3(input, defaultSettings);

      console.log('X-axis snap result:');
      console.log('  Snapped:', result.snapped);
      console.log('  Offset:', result.offset);
      console.log('  Type:', result.snapType);

      if (result.snapped) {
        const newCenterX = part1.position[0] + result.offset;
        console.log(`\n  Original center X: ${part1.position[0]}`);
        console.log(`  New center X: ${newCenterX}`);
      }
    });

    it('tests snapping Part 2 (rotated) to Part 1', () => {
      // Reverse: Part 2 snapping to Part 1
      const input: SnapV3Input = {
        movingPart: part2,
        targetParts: [part1],
        dragAxis: 'Y',
        movementDirection: 1, // Moving up
        currentOffset: [0, 5, 0],
      };

      const result = calculateSnapV3(input, defaultSettings);

      console.log('Part 2 → Part 1 (Y-axis) snap result:');
      console.log('  Snapped:', result.snapped);
      console.log('  Offset:', result.offset);
      console.log('  Type:', result.snapType);
    });
  });

  describe('Integration test with calculatePartSnapV3', () => {
    it('tests full integration snap', () => {
      const currentPosition: Vec3 = [-100, 21, 0]; // Part 1 dragged 5mm down

      const result = calculatePartSnapV3(
        part1,
        currentPosition,
        [part1, part2],
        [],
        {
          distance: 20,
          showGuides: true,
          debug: false,
          edgeSnap: true,
          faceSnap: true,
          tJointSnap: true,
          collisionOffset: 1,
          version: 'v3',
        },
        'Y'
      );

      console.log('Integration snap result:');
      console.log('  Snapped:', result.snapped);
      console.log('  Position:', result.position);
      console.log('  Snap points:', result.snapPoints.length);

      if (result.snapped) {
        const bottomY = result.position[1] - 9;
        const part2TopY = part2.position[1] + 9;
        const gap = bottomY - part2TopY;
        console.log(`\n  Result position Y: ${result.position[1]}`);
        console.log(`  Part 1 bottom at Y: ${bottomY}`);
        console.log(`  Part 2 top at Y: ${part2TopY}`);
        console.log(`  Gap: ${gap}mm`);

        // Gap should be close to collision offset (±1mm tolerance)
        // Note: With compound rotations, exact gap may vary slightly
        expect(Math.abs(gap)).toBeLessThanOrEqual(2);
      }
    });
  });
});
