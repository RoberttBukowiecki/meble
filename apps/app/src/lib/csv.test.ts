import { generateCSV, validateParts } from './csv';
import type { Part, Material, Furniture } from '@/types';

const baseMaterial: Material = {
  id: 'm1',
  name: 'Płyta 12',
  color: '#fff',
  thickness: 12,
};

const baseFurniture: Furniture = {
  id: 'f1',
  name: 'Szafka',
};

const createPart = (overrides: Partial<Part> = {}): Part => ({
  id: 'p1',
  name: 'Dno',
  furnitureId: baseFurniture.id,
  group: 'A',
  shapeType: 'RECT',
  shapeParams: { type: 'RECT', x: 600, y: 400 },
  width: 600,
  height: 400,
  depth: baseMaterial.thickness,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  materialId: baseMaterial.id,
  edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
  notes: '',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('generateCSV', () => {
  it('creates CSV with the reduced header and expected row values', () => {
    const csv = generateCSV([createPart()], [baseMaterial], [baseFurniture]);
    const [header, row] = csv.split('\n');

    expect(header).toBe(
      'furniture;group;part_id;part_name;material;thickness_mm;length_x_mm;width_y_mm'
    );
    expect(row).toBe('Szafka;A;p1;Dno;Płyta 12;12;600;400');
  });
});

describe('validateParts', () => {
  it('returns no errors for a valid part', () => {
    const errors = validateParts([createPart()], [baseMaterial]);
    expect(errors).toHaveLength(0);
  });

  it('reports mismatch when part thickness differs from material', () => {
    const errors = validateParts(
      [createPart({ depth: 18 })],
      [baseMaterial]
    );
    expect(errors).toContain('Część "Dno": grubość (18mm) nie pasuje do materiału (12mm)');
  });
});
