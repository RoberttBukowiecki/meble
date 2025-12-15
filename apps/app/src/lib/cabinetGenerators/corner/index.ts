/**
 * Corner Cabinet Generator
 *
 * Main entry point for corner cabinet part generation.
 * Dispatches to specific generators based on corner type.
 */

import type {
  CornerInternalCabinetParams,
  CabinetMaterials,
  Material,
} from '@/types';
import type { GeneratedPart } from '../types';
import { generateLShapedCorner } from './lShapedGenerator';

/**
 * Generate parts for an internal corner cabinet
 */
export function generateCornerInternalCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CornerInternalCabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  const { cornerConfig } = params;

  switch (cornerConfig.cornerType) {
    case 'L_SHAPED':
      return generateLShapedCorner(
        cabinetId,
        furnitureId,
        params,
        materials,
        bodyMaterial,
        backMaterial
      );
    case 'BLIND_CORNER':
      // Phase 1E - not yet implemented
      // For now, fall back to L-shaped
      return generateLShapedCorner(
        cabinetId,
        furnitureId,
        params,
        materials,
        bodyMaterial,
        backMaterial
      );
    case 'LAZY_SUSAN':
      // Phase 1E - not yet implemented
      // For now, fall back to L-shaped
      return generateLShapedCorner(
        cabinetId,
        furnitureId,
        params,
        materials,
        bodyMaterial,
        backMaterial
      );
    default:
      return generateLShapedCorner(
        cabinetId,
        furnitureId,
        params,
        materials,
        bodyMaterial,
        backMaterial
      );
  }
}

// Re-export for direct access
export { generateLShapedCorner } from './lShapedGenerator';
