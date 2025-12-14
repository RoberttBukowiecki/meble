/**
 * Cabinet interior configuration type definitions
 *
 * Uses recursive zone-based configuration with max 3 levels of nesting.
 * Zones can be divided horizontally or vertically, with configurable
 * widths (fixed mm or proportional) and heights.
 */

import type { DrawerConfiguration } from './drawer';

// ============================================================================
// Zone-Based Interior Configuration
// ============================================================================

/**
 * Direction of zone division
 * - HORIZONTAL: Children are stacked vertically (bottom to top)
 * - VERTICAL: Children are placed side by side (left to right)
 */
export type ZoneDivisionDirection = 'HORIZONTAL' | 'VERTICAL';

/**
 * Type of content in a zone
 * - EMPTY: No content
 * - SHELVES: Contains shelves
 * - DRAWERS: Contains drawers
 * - NESTED: Contains child zones (recursive)
 */
export type ZoneContentType = 'EMPTY' | 'SHELVES' | 'DRAWERS' | 'NESTED';

/**
 * Size mode for zone width calculation
 * - FIXED: Exact width in mm
 * - PROPORTIONAL: Ratio-based width distribution
 */
export type ZoneSizeMode = 'FIXED' | 'PROPORTIONAL';

/**
 * Partition (vertical divider) depth preset
 */
export type PartitionDepthPreset = 'FULL' | 'HALF' | 'CUSTOM';

/**
 * Configuration for a partition (vertical divider between columns)
 */
export interface PartitionConfig {
  /** Unique partition ID */
  id: string;

  /** Depth preset */
  depthPreset: PartitionDepthPreset;

  /** Custom depth in mm (when depthPreset is CUSTOM) */
  customDepth?: number;

  /** Material ID (defaults to bodyMaterialId) */
  materialId?: string;
}

/**
 * Zone height configuration
 */
export interface ZoneHeightConfig {
  /** Height mode */
  mode: 'RATIO' | 'EXACT';

  /** Height ratio for RATIO mode (relative to siblings) */
  ratio?: number;

  /** Exact height in mm for EXACT mode */
  exactMm?: number;
}

/**
 * Zone width configuration (for children of VERTICAL parent)
 */
export interface ZoneWidthConfig {
  /** Width mode */
  mode: ZoneSizeMode;

  /** Fixed width in mm for FIXED mode */
  fixedMm?: number;

  /** Width ratio for PROPORTIONAL mode (default: 1) */
  ratio?: number;
}

/**
 * Recursive zone structure for cabinet interior
 * Maximum nesting depth is 3 levels (depth 0, 1, 2)
 */
export interface InteriorZone {
  /** Unique zone ID */
  id: string;

  /** Type of content in this zone */
  contentType: ZoneContentType;

  /** Shelf configuration (when contentType is SHELVES) */
  shelvesConfig?: ShelvesConfiguration;

  /** Drawer configuration (when contentType is DRAWERS) */
  drawerConfig?: DrawerConfiguration;

  /** Division direction (when contentType is NESTED) */
  divisionDirection?: ZoneDivisionDirection;

  /** Child zones (when contentType is NESTED) */
  children?: InteriorZone[];

  /** Partitions between children (for VERTICAL division) */
  partitions?: PartitionConfig[];

  /** Height configuration */
  heightConfig: ZoneHeightConfig;

  /** Width configuration (only for zones in VERTICAL parent) */
  widthConfig?: ZoneWidthConfig;

  /** Depth in tree (0 = root, max 2 for deepest children) */
  depth: number;
}

/**
 * Cabinet interior configuration (tree-based zones)
 */
export interface CabinetInteriorConfig {
  /** Root zone containing all interior configuration */
  rootZone: InteriorZone;
}

// ============================================================================
// Shelf Types
// ============================================================================

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
 * Shelf configuration for a zone
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

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default zone height configuration
 */
export const DEFAULT_ZONE_HEIGHT_CONFIG: ZoneHeightConfig = {
  mode: 'RATIO',
  ratio: 1,
};

/**
 * Default zone width configuration
 */
export const DEFAULT_ZONE_WIDTH_CONFIG: ZoneWidthConfig = {
  mode: 'PROPORTIONAL',
  ratio: 1,
};

/**
 * Default partition configuration
 */
export const DEFAULT_PARTITION_CONFIG: Omit<PartitionConfig, 'id'> = {
  depthPreset: 'FULL',
};

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

// ============================================================================
// ID Generators
// ============================================================================

/**
 * Generate unique zone ID
 */
export function generateZoneId(): string {
  return `zone_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Generate unique partition ID
 */
export function generatePartitionId(): string {
  return `part_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Generate unique shelf ID
 */
export function generateShelfId(): string {
  return `shelf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
