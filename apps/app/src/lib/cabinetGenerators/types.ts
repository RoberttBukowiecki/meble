/**
 * Internal types for cabinet generators
 * These are implementation details, not exported from the main types module
 */

import type {
  CabinetParams,
  CabinetMaterials,
  Material,
  Part,
  BackMountType,
  TopBottomPlacement,
  DoorConfig,
  HandleConfig,
  SideFrontsConfig,
  HangerCutoutConfig,
} from '@/types';

// Re-export Material type for use in generators
export type { Material };

// Part without generated fields (id, timestamps)
export type GeneratedPart = Omit<Part, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Generator function type
 * Returns array of parts WITHOUT id, createdAt, updatedAt (store adds these)
 */
export type CabinetGenerator = (
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
) => GeneratedPart[];

// ============================================================================
// Back Panel Types
// ============================================================================

export interface BackPanelConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  backMaterialId: string;
  backMaterialThickness: number;
  overlapRatio: number;
  mountType: BackMountType;
  topBottomPlacement: TopBottomPlacement;
  /** Y offset added by legs (0 if no legs) */
  legOffset?: number;
}

/**
 * Back panel config with hanger cutouts for wall-mounted cabinets
 */
export interface BackPanelWithCutoutsConfig extends BackPanelConfig {
  /** Hanger cutout configuration */
  hangerCutouts: HangerCutoutConfig;
}

// ============================================================================
// Door Types
// ============================================================================

export interface DoorGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  thickness: number;
  frontMaterialId: string;
  doorConfig: DoorConfig;
  handleConfig?: HandleConfig;
  /** Y offset added by legs (0 if no legs) */
  legOffset?: number;
}

// ============================================================================
// Side Front Types
// ============================================================================

export interface SideFrontGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  frontMaterialThickness: number;
  sideFrontsConfig: SideFrontsConfig;
  defaultFrontMaterialId: string;
  /** Map of all materials for looking up custom material thickness */
  materialsMap?: Map<string, Material>;
  /** Y offset added by legs (0 if no legs) */
  legOffset?: number;
}
