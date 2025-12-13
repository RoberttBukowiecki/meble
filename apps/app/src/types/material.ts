/**
 * Material type definitions
 */

/**
 * Material category for filtering in UI
 */
export type MaterialCategory = 'board' | 'hdf' | 'mdf' | 'glass';

/**
 * Material definition for furniture parts
 */
export interface Material {
  id: string;
  name: string;
  color: string;      // Hex color (e.g., "#FFFFFF")
  thickness: number;  // Material thickness in mm
  isDefault?: boolean; // Marks material as a default choice for presets
  category?: MaterialCategory; // Material type for filtering
}
