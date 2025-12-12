/**
 * CSV export functionality for furniture parts
 */

import type { Part, Material, Furniture } from '@/types';

export interface CSVColumn {
  id: string;
  label: string; // Internal key for translation
  accessor: (
    part: Part,
    materials: Material[],
    furnitures: Furniture[]
  ) => string;
}

export const AVAILABLE_COLUMNS: CSVColumn[] = [
  {
    id: 'furniture',
    label: 'furniture',
    accessor: (part, _, furnitures) =>
      furnitures.find((f) => f.id === part.furnitureId)?.name || 'Unknown',
  },
  {
    id: 'group',
    label: 'group',
    accessor: (part) => part.group || '',
  },
  {
    id: 'part_id',
    label: 'partId',
    accessor: (part) => part.id,
  },
  {
    id: 'part_name',
    label: 'partName',
    accessor: (part) => part.name,
  },
  {
    id: 'friendly_part_id',
    label: 'friendlyPartId',
    accessor: (part, _, furnitures) => {
      const furnitureName =
        furnitures.find((f) => f.id === part.furnitureId)?.name || 'unknown';
      // simple slugify
      const slugify = (str: string) =>
        str
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      return `${slugify(furnitureName)}-${slugify(part.name)}`;
    },
  },
  {
    id: 'material',
    label: 'material',
    accessor: (part, materials) =>
      materials.find((m) => m.id === part.materialId)?.name || 'Unknown',
  },
  {
    id: 'thickness_mm',
    label: 'thickness',
    accessor: (part) => part.depth.toString(),
  },
  {
    id: 'length_x_mm',
    label: 'length',
    accessor: (part) => part.width.toString(),
  },
  {
    id: 'width_y_mm',
    label: 'width',
    accessor: (part) => part.height.toString(),
  },
  {
    id: 'notes',
    label: 'notes',
    accessor: (part) => part.notes || '',
  },
  {
    id: 'cabinet',
    label: 'cabinet',
    accessor: (part) =>
      part.cabinetMetadata ? part.cabinetMetadata.cabinetId : '',
  },
];

export const DEFAULT_COLUMNS = AVAILABLE_COLUMNS.filter((col) =>
  [
    'furniture',
    'friendly_part_id',
    'part_name',
    'material',
    'thickness_mm',
    'length_x_mm',
    'width_y_mm',
  ].includes(col.id)
);

/**
 * Generate CSV file content from parts data
 * Uses semicolon (;) as separator
 */
export function generateCSV(
  parts: Part[],
  materials: Material[],
  furnitures: Furniture[],
  columns: CSVColumn[] = DEFAULT_COLUMNS
): string {
  // CSV Header
  const header = columns.map((col) => col.id).join(';');

  // Generate rows
  const rows = parts.map((part) => {
    return columns
      .map((col) => col.accessor(part, materials, furnitures))
      .join(';');
  });

  // Combine header and rows
  return [header, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string = 'meblarz_export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Validate parts before export
 * Returns array of error messages
 */
export function validateParts(parts: Part[], materials: Material[]): string[] {
  const errors: string[] = [];

  parts.forEach((part, index) => {
    // Check if material exists
    const material = materials.find((m) => m.id === part.materialId);
    if (!material) {
      errors.push(`Część "${part.name}": brak materiału`);
    }

    // Check positive dimensions
    if (part.width <= 0) {
      errors.push(`Część "${part.name}": szerokość musi być > 0`);
    }
    if (part.height <= 0) {
      errors.push(`Część "${part.name}": wysokość musi być > 0`);
    }
    if (part.depth <= 0) {
      errors.push(`Część "${part.name}": grubość musi być > 0`);
    }

    // Check depth matches material thickness
    if (material && part.depth !== material.thickness) {
      errors.push(
        `Część "${part.name}": grubość (${part.depth}mm) nie pasuje do materiału (${material.thickness}mm)`
      );
    }
  });

  return errors;
}
