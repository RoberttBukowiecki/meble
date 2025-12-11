/**
 * CSV export functionality for furniture parts
 */

import type { Part, Material, Furniture } from '@/types';

/**
 * Generate CSV file content from parts data
 * Uses semicolon (;) as separator
 */
export function generateCSV(
  parts: Part[],
  materials: Material[],
  furnitures: Furniture[]
): string {
  // CSV Header
  const header = [
    'furniture',
    'group',
    'part_id',
    'part_name',
    'material',
    'thickness_mm',
    'length_x_mm',
    'width_y_mm'
  ].join(';');

  // Helper functions
  const getMaterialName = (id: string) =>
    materials.find((m) => m.id === id)?.name || 'Unknown';

  const getFurnitureName = (id: string) =>
    furnitures.find((f) => f.id === id)?.name || 'Unknown';

  // Generate rows
  const rows = parts.map((part) => {
    return [
      getFurnitureName(part.furnitureId),
      part.group || '',
      part.id,
      part.name,
      getMaterialName(part.materialId),
      part.depth.toString(),
      part.width.toString(),
      part.height.toString()
    ].join(';');
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
