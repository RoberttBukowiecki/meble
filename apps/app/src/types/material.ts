/**
 * Material type definitions
 */

/**
 * Material category for filtering in UI
 */
export type MaterialCategory = 'board' | 'hdf' | 'mdf' | 'glass' | 'countertop' | 'laminate';

/**
 * Texture configuration for materials
 * Supports loading textures from remote URLs
 */
export interface MaterialTexture {
  /** URL to the diffuse/color texture image */
  url: string;
  /** URL to the normal map (for surface detail) */
  normalMapUrl?: string;
  /** Texture repeat factor (default: 1) - higher = smaller pattern */
  repeatX?: number;
  repeatY?: number;
  /** Texture rotation in radians */
  rotation?: number;
}

/**
 * PBR (Physically Based Rendering) properties for realistic materials
 */
export interface MaterialPBR {
  /** Roughness: 0 = mirror-like, 1 = completely rough (default: 0.7) */
  roughness?: number;
  /** Metalness: 0 = non-metallic, 1 = fully metallic (default: 0) */
  metalness?: number;
}

/**
 * Material definition for furniture parts
 */
export interface Material {
  id: string;
  name: string;
  color: string;           // Hex color (e.g., "#FFFFFF") - used as fallback when no texture
  thickness: number;       // Material thickness in mm
  isDefault?: boolean;     // Marks material as a default choice for presets
  category?: MaterialCategory; // Material type for filtering
  /** Optional texture for realistic rendering */
  texture?: MaterialTexture;
  /** PBR material properties */
  pbr?: MaterialPBR;
  /** Manufacturer/brand code (e.g., "Egger H3700") */
  code?: string;
  /** Is this a grain/wood-pattern material */
  hasGrain?: boolean;
}
