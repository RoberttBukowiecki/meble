import { detectCollisions, isGroupColliding, isPartColliding } from '@/lib/collisionDetection';
import type { Part } from '@/types';

const timestamp = new Date('2024-01-01T00:00:00Z');

const basePart: Part = {
  id: 'base',
  name: 'Base Part',
  furnitureId: 'furniture-1',
  shapeType: 'RECT',
  shapeParams: { type: 'RECT', x: 100, y: 50 },
  width: 100,
  height: 50,
  depth: 18,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: 'mat-1',
  edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
  createdAt: timestamp,
  updatedAt: timestamp,
};

const makePart = (overrides: Partial<Part>): Part => ({
  ...basePart,
  ...overrides,
  createdAt: overrides.createdAt ?? timestamp,
  updatedAt: overrides.updatedAt ?? timestamp,
});

describe('collision detection', () => {
  it('detects a single collision and preserves cabinet/group identifiers', () => {
    const cabinetShelf = makePart({
      id: 'part-a',
      name: 'Cabinet Shelf',
      position: [0, 0, 0],
      cabinetMetadata: { cabinetId: 'cab-1', role: 'SHELF', index: 0 },
    });

    const groupedPanel = makePart({
      id: 'part-b',
      name: 'Grouped Panel',
      position: [50, 0, 0], // overlaps with part-a on X axis
      group: 'custom-group',
    });

    const distantBack = makePart({
      id: 'part-c',
      name: 'Back Panel',
      position: [1000, 1000, 0], // well outside collision range
    });

    const collisions = detectCollisions([cabinetShelf, groupedPanel, distantBack]);

    expect(collisions).toHaveLength(1);

    const [collision] = collisions;
    expect(new Set([collision.partId1, collision.partId2])).toEqual(new Set(['part-a', 'part-b']));
    expect(new Set([collision.groupId1, collision.groupId2])).toEqual(new Set(['cab-1', 'custom-group']));

    expect(isPartColliding('part-a', collisions)).toBe(true);
    expect(isGroupColliding('cab-1', collisions)).toBe(true);
    expect(isPartColliding('part-c', collisions)).toBe(false);
  });
});
