/**
 * Cabinet interior configuration type definitions
 */

import type { DrawerConfiguration } from './drawer';

/**
 * Type of content in a cabinet section
 */
export type SectionContentType = 'EMPTY' | 'SHELVES' | 'DRAWERS';

/**
 * Shelf depth preset
 */
export type ShelfDepthPreset = 'FULL' | 'HALF' | 'CUSTOM';

/**
 * Configuration for a single shelf
 */
export interface ShelfConfig {
  /** Shelf ID */
  id: string;

  /** Position from section bottom (mm) - for manual mode */
  positionY?: number;

  /** Depth preset */
  depthPreset: ShelfDepthPreset;

  /** Custom depth in mm (when depthPreset is CUSTOM) */
  customDepth?: number;

  /** Material ID (defaults to bodyMaterialId) */
  materialId?: string;
}

/**
 * Shelf configuration for a section
 */
export interface ShelvesConfiguration {
  /** Distribution mode */
  mode: 'UNIFORM' | 'MANUAL';

  /** Number of shelves (for UNIFORM mode) */
  count: number;

  /** Depth preset for all shelves (UNIFORM mode) or default for new shelves (MANUAL mode) */
  depthPreset: ShelfDepthPreset;

  /** Custom depth in mm (when depthPreset is CUSTOM) */
  customDepth?: number;

  /** Individual shelf configs (for MANUAL mode) */
  shelves: ShelfConfig[];

  /** Material ID for all shelves in UNIFORM mode (defaults to bodyMaterialId) */
  materialId?: string;
}

/**
 * A horizontal section of the cabinet interior
 */
export interface CabinetSection {
  id: string;

  /** Height ratio relative to other sections */
  heightRatio: number;

  /** What this section contains */
  contentType: SectionContentType;

  /** Shelf configuration (when contentType is SHELVES) */
  shelvesConfig?: ShelvesConfiguration;

  /** Drawer configuration (when contentType is DRAWERS) */
  drawerConfig?: DrawerConfiguration;
}

/**
 * Complete cabinet interior configuration
 */
export interface CabinetInteriorConfig {
  /** Horizontal sections from bottom to top */
  sections: CabinetSection[];
}

/**
 * Default shelf configuration
 */
export const DEFAULT_SHELF_CONFIG: Omit<ShelfConfig, 'id'> = {
  depthPreset: 'FULL',
};

/**
 * Default shelves configuration
 */
export const DEFAULT_SHELVES_CONFIG: ShelvesConfiguration = {
  mode: 'UNIFORM',
  count: 2,
  depthPreset: 'FULL',
  shelves: [],
};

/**
 * Generate unique section ID
 */
export function generateSectionId(): string {
  return `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Generate unique shelf ID
 */
export function generateShelfId(): string {
  return `shelf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
