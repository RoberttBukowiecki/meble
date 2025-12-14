/**
 * Cabinet Domain Module
 *
 * Handles cabinet-level operations including:
 * - Creating cabinet configurations
 * - Updating cabinet parameters
 * - Calculating cabinet dimensions and interior space
 * - Validating cabinet configurations
 */

import type {
  Cabinet,
  CabinetType,
  CabinetParams,
  CabinetMaterials,
  CabinetInteriorConfig,
  KitchenCabinetParams,
  WardrobeCabinetParams,
  BookshelfCabinetParams,
  DrawerCabinetParams,
  TopBottomPlacement,
  DoorConfig,
  DrawerConfiguration,
} from '@/types';
import {
  CABINET_PRESETS,
  DEFAULT_BACK_OVERLAP_RATIO,
  DEFAULT_BODY_THICKNESS,
} from '@/lib/config';
import type { ValidationResult, Dimensions, InteriorSpace } from './types';
import { validResult, invalidResult } from './types';
import { clamp } from './utils';
import { Zone } from './zone';

// ============================================================================
// Types
// ============================================================================

export interface CabinetDimensions extends Dimensions {
  bodyThickness: number;
}

// ============================================================================
// Cabinet Domain Module
// ============================================================================

export const CabinetDomain = {
  // ==========================================================================
  // CREATORS - Functions that create new cabinet configurations
  // ==========================================================================

  /**
   * Create cabinet parameters from preset
   */
  createParams: (type: CabinetType): CabinetParams => {
    const preset = CABINET_PRESETS[type];
    return { ...preset } as CabinetParams;
  },

  /**
   * Create kitchen cabinet parameters
   */
  createKitchenParams: (
    width: number,
    height: number,
    depth: number,
    options?: Partial<Omit<KitchenCabinetParams, 'type' | 'width' | 'height' | 'depth'>>
  ): KitchenCabinetParams => ({
    type: 'KITCHEN',
    width: clamp(width, 100, 3000),
    height: clamp(height, 100, 3000),
    depth: clamp(depth, 100, 1000),
    shelfCount: options?.shelfCount ?? 1,
    hasDoors: options?.hasDoors ?? true,
    topBottomPlacement: options?.topBottomPlacement ?? 'inset',
    hasBack: options?.hasBack ?? true,
    backOverlapRatio: options?.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: options?.backMountType ?? 'overlap',
    doorConfig: options?.doorConfig,
    handleConfig: options?.handleConfig,
    drawerConfig: options?.drawerConfig,
    interiorConfig: options?.interiorConfig,
    sideFronts: options?.sideFronts,
    decorativePanels: options?.decorativePanels,
  }),

  /**
   * Create wardrobe cabinet parameters
   */
  createWardrobeParams: (
    width: number,
    height: number,
    depth: number,
    options?: Partial<Omit<WardrobeCabinetParams, 'type' | 'width' | 'height' | 'depth'>>
  ): WardrobeCabinetParams => ({
    type: 'WARDROBE',
    width: clamp(width, 100, 4000),
    height: clamp(height, 100, 3000),
    depth: clamp(depth, 100, 1000),
    shelfCount: options?.shelfCount ?? 1,
    doorCount: options?.doorCount ?? 2,
    topBottomPlacement: options?.topBottomPlacement ?? 'inset',
    hasBack: options?.hasBack ?? true,
    backOverlapRatio: options?.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: options?.backMountType ?? 'overlap',
  }),

  /**
   * Create bookshelf cabinet parameters
   */
  createBookshelfParams: (
    width: number,
    height: number,
    depth: number,
    options?: Partial<Omit<BookshelfCabinetParams, 'type' | 'width' | 'height' | 'depth'>>
  ): BookshelfCabinetParams => ({
    type: 'BOOKSHELF',
    width: clamp(width, 100, 3000),
    height: clamp(height, 100, 3000),
    depth: clamp(depth, 100, 800),
    shelfCount: options?.shelfCount ?? 4,
    topBottomPlacement: options?.topBottomPlacement ?? 'inset',
    hasBack: options?.hasBack ?? true,
    backOverlapRatio: options?.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: options?.backMountType ?? 'overlap',
  }),

  /**
   * Create drawer cabinet parameters
   */
  createDrawerParams: (
    width: number,
    height: number,
    depth: number,
    options?: Partial<Omit<DrawerCabinetParams, 'type' | 'width' | 'height' | 'depth'>>
  ): DrawerCabinetParams => ({
    type: 'DRAWER',
    width: clamp(width, 100, 1500),
    height: clamp(height, 100, 2000),
    depth: clamp(depth, 100, 800),
    drawerCount: options?.drawerCount ?? 4,
    drawerSlideType: options?.drawerSlideType ?? 'SIDE_MOUNT',
    hasInternalDrawers: options?.hasInternalDrawers ?? false,
    topBottomPlacement: options?.topBottomPlacement ?? 'inset',
    hasBack: options?.hasBack ?? true,
    backOverlapRatio: options?.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: options?.backMountType ?? 'overlap',
    drawerHeights: options?.drawerHeights,
    bottomMaterialId: options?.bottomMaterialId,
    handleConfig: options?.handleConfig,
  }),

  /**
   * Create cabinet materials configuration
   */
  createMaterials: (
    bodyMaterialId: string,
    frontMaterialId: string,
    backMaterialId?: string
  ): CabinetMaterials => ({
    bodyMaterialId,
    frontMaterialId,
    backMaterialId,
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies
  // ==========================================================================

  /**
   * Update cabinet dimensions
   */
  updateDimensions: (
    params: CabinetParams,
    dimensions: Partial<Dimensions>
  ): CabinetParams => ({
    ...params,
    width: dimensions.width !== undefined ? clamp(dimensions.width, 100, 4000) : params.width,
    height: dimensions.height !== undefined ? clamp(dimensions.height, 100, 3000) : params.height,
    depth: dimensions.depth !== undefined ? clamp(dimensions.depth, 100, 1000) : params.depth,
  }),

  /**
   * Update top/bottom placement
   */
  updateTopBottomPlacement: (
    params: CabinetParams,
    placement: TopBottomPlacement
  ): CabinetParams => ({
    ...params,
    topBottomPlacement: placement,
  }),

  /**
   * Update back panel settings
   */
  updateBackSettings: (
    params: CabinetParams,
    hasBack: boolean,
    backOverlapRatio?: number
  ): CabinetParams => ({
    ...params,
    hasBack,
    backOverlapRatio: backOverlapRatio ?? params.backOverlapRatio,
  }),

  /**
   * Update interior configuration
   */
  updateInteriorConfig: (
    params: CabinetParams,
    interiorConfig: CabinetInteriorConfig | undefined
  ): CabinetParams => ({
    ...params,
    interiorConfig,
  }),

  /**
   * Update door configuration (for kitchen cabinets)
   */
  updateDoorConfig: (
    params: KitchenCabinetParams,
    doorConfig: DoorConfig | undefined
  ): KitchenCabinetParams => ({
    ...params,
    doorConfig,
  }),

  /**
   * Update drawer configuration
   */
  updateDrawerConfig: (
    params: CabinetParams,
    drawerConfig: DrawerConfiguration | undefined
  ): CabinetParams => ({
    ...params,
    drawerConfig,
  }),

  /**
   * Update shelf count (for cabinets with shelves)
   */
  updateShelfCount: (
    params: KitchenCabinetParams | WardrobeCabinetParams | BookshelfCabinetParams,
    count: number
  ): CabinetParams => ({
    ...params,
    shelfCount: clamp(count, 0, 10),
  }),

  /**
   * Toggle doors (for kitchen cabinets)
   */
  toggleDoors: (params: KitchenCabinetParams): KitchenCabinetParams => ({
    ...params,
    hasDoors: !params.hasDoors,
  }),

  /**
   * Toggle back panel
   */
  toggleBack: (params: CabinetParams): CabinetParams => ({
    ...params,
    hasBack: !params.hasBack,
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Get cabinet dimensions with body thickness
   */
  getDimensions: (params: CabinetParams, bodyThickness?: number): CabinetDimensions => ({
    width: params.width,
    height: params.height,
    depth: params.depth,
    bodyThickness: bodyThickness ?? DEFAULT_BODY_THICKNESS,
  }),

  /**
   * Calculate interior space dimensions
   */
  calculateInteriorSpace: (
    params: CabinetParams,
    bodyThickness: number = DEFAULT_BODY_THICKNESS
  ): InteriorSpace => {
    const isInset = params.topBottomPlacement === 'inset';

    return {
      width: params.width - 2 * bodyThickness,
      height: isInset
        ? params.height - 2 * bodyThickness
        : params.height, // In overlay mode, full height is available
      depth: params.depth - bodyThickness, // Typically back panel takes some space
      startY: isInset ? bodyThickness : 0,
    };
  },

  /**
   * Calculate back panel dimensions
   */
  calculateBackDimensions: (
    params: CabinetParams,
    bodyThickness: number = DEFAULT_BODY_THICKNESS
  ): Dimensions => {
    const overlapAmount = bodyThickness * (params.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO);
    const isInset = params.topBottomPlacement === 'inset';

    return {
      width: params.width - 2 * (bodyThickness - overlapAmount),
      height: isInset
        ? params.height - 2 * (bodyThickness - overlapAmount)
        : params.height - 2 * overlapAmount,
      depth: 3, // HDF thickness, typically from material
    };
  },

  /**
   * Get effective shelf count (from interior config or legacy shelfCount)
   */
  getEffectiveShelfCount: (params: CabinetParams): number => {
    if (params.interiorConfig?.rootZone) {
      // Count shelves from zone tree
      const zones = Zone.getAllZones(params.interiorConfig.rootZone);
      return zones.reduce((total, zone) => {
        if (zone.contentType === 'SHELVES' && zone.shelvesConfig) {
          return total + zone.shelvesConfig.count;
        }
        return total;
      }, 0);
    }

    // Fall back to legacy shelfCount
    if ('shelfCount' in params) {
      return params.shelfCount;
    }

    return 0;
  },

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate cabinet parameters
   */
  validate: (params: CabinetParams): ValidationResult => {
    const errors: string[] = [];

    // Dimension validation
    if (params.width < 100 || params.width > 4000) {
      errors.push('Width must be between 100mm and 4000mm');
    }

    if (params.height < 100 || params.height > 3000) {
      errors.push('Height must be between 100mm and 3000mm');
    }

    if (params.depth < 100 || params.depth > 1000) {
      errors.push('Depth must be between 100mm and 1000mm');
    }

    // Type-specific validation
    if (params.type === 'KITCHEN') {
      if (params.shelfCount < 0 || params.shelfCount > 5) {
        errors.push('Kitchen cabinet can have 0-5 shelves');
      }
    }

    if (params.type === 'WARDROBE') {
      if (params.doorCount < 1 || params.doorCount > 4) {
        errors.push('Wardrobe must have 1-4 doors');
      }
    }

    if (params.type === 'BOOKSHELF') {
      if (params.shelfCount < 1 || params.shelfCount > 10) {
        errors.push('Bookshelf must have 1-10 shelves');
      }
    }

    if (params.type === 'DRAWER') {
      if (params.drawerCount < 1 || params.drawerCount > 8) {
        errors.push('Drawer cabinet must have 1-8 drawers');
      }
    }

    // Back panel validation
    if (params.hasBack && params.backOverlapRatio !== undefined) {
      if (params.backOverlapRatio < 0 || params.backOverlapRatio > 1) {
        errors.push('Back overlap ratio must be between 0 and 1');
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate cabinet materials
   */
  validateMaterials: (materials: CabinetMaterials): ValidationResult => {
    const errors: string[] = [];

    if (!materials.bodyMaterialId) {
      errors.push('Body material is required');
    }

    if (!materials.frontMaterialId) {
      errors.push('Front material is required');
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if cabinet has doors
   */
  hasDoors: (params: CabinetParams): boolean => {
    if (params.type === 'KITCHEN') {
      return params.hasDoors;
    }
    if (params.type === 'WARDROBE') {
      return params.doorCount > 0;
    }
    return false;
  },

  /**
   * Check if cabinet has drawers
   */
  hasDrawers: (params: CabinetParams): boolean => {
    if (params.drawerConfig && params.drawerConfig.zones.length > 0) {
      return true;
    }
    if (params.type === 'DRAWER') {
      return params.drawerCount > 0;
    }
    return false;
  },

  /**
   * Check if cabinet has back panel
   */
  hasBackPanel: (params: CabinetParams): boolean => params.hasBack,

  /**
   * Check if cabinet uses interior config
   */
  hasInteriorConfig: (params: CabinetParams): boolean =>
    params.interiorConfig !== undefined && params.interiorConfig.rootZone !== undefined,

  /**
   * Get cabinet type label in Polish
   */
  getTypeLabel: (type: CabinetType): string => {
    switch (type) {
      case 'KITCHEN':
        return 'Szafka kuchenna';
      case 'WARDROBE':
        return 'Szafa';
      case 'BOOKSHELF':
        return 'Regał';
      case 'DRAWER':
        return 'Komoda';
      default:
        return 'Nieznany typ';
    }
  },

  /**
   * Get top/bottom placement label in Polish
   */
  getPlacementLabel: (placement: TopBottomPlacement): string => {
    switch (placement) {
      case 'inset':
        return 'Wkładane';
      case 'overlay':
        return 'Nakładane';
      default:
        return 'Nieznane';
    }
  },

  /**
   * Get human-readable summary
   */
  getSummary: (params: CabinetParams): string => {
    const parts: string[] = [];

    parts.push(`${params.width}×${params.height}×${params.depth}mm`);

    if (CabinetDomain.hasDoors(params)) {
      if (params.type === 'KITCHEN') {
        parts.push('z drzwiami');
      } else if (params.type === 'WARDROBE') {
        parts.push(`${params.doorCount} drzwi`);
      }
    }

    const shelfCount = CabinetDomain.getEffectiveShelfCount(params);
    if (shelfCount > 0) {
      parts.push(`${shelfCount} półek`);
    }

    if (CabinetDomain.hasDrawers(params)) {
      if (params.type === 'DRAWER') {
        parts.push(`${params.drawerCount} szuflad`);
      } else {
        parts.push('z szufladami');
      }
    }

    return parts.join(', ');
  },
} as const;
