/**
 * Drawer system type definitions
 */

import type { HandleConfig } from './handle';
import type { ShelfDepthPreset } from './cabinetInterior';

/**
 * Type of drawer slide mechanism
 */
export type DrawerSlideType = 'SIDE_MOUNT' | 'UNDERMOUNT' | 'BOTTOM_MOUNT' | 'CENTER_MOUNT';

/**
 * Configuration for drawer slide including clearances
 */
export interface DrawerSlideConfig {
  type: DrawerSlideType;
  sideOffset: number; // mm - clearance per side for drawer box
  depthOffset: number; // mm - how much shorter drawer is than cabinet depth
}

/**
 * Front configuration for a drawer zone
 */
export interface DrawerZoneFront {
  /** Handle configuration for this front */
  handleConfig?: HandleConfig;
}

/**
 * A drawer box within a zone
 */
export interface DrawerZoneBox {
  /** Height ratio within the zone (for multiple boxes) */
  heightRatio: number;
}

/**
 * Configuration for a single shelf above the drawer box
 */
export interface AboveBoxShelfConfig {
  id: string;
  /** Shelf depth preset */
  depthPreset: ShelfDepthPreset;
  /** Custom depth in mm (when depthPreset is CUSTOM) */
  customDepth?: number;
}

/**
 * Content configuration for the space above the drawer box
 * Supports multiple shelves with different depths
 */
export interface DrawerZoneAboveBoxContent {
  /** Array of shelves above the drawer box */
  shelves: AboveBoxShelfConfig[];
}

/**
 * Generate unique ID for above-box shelf
 */
export function generateAboveBoxShelfId(): string {
  return `abs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * A drawer zone represents a vertical section of the cabinet
 * that can have one decorative front covering multiple internal boxes
 */
export interface DrawerZone {
  id: string;
  /** Height ratio relative to other zones (default: 1) */
  heightRatio: number;
  /** Decorative front configuration (null = internal zone, no visible front) */
  front: DrawerZoneFront | null;
  /** Drawer boxes within this zone (can be multiple for drawer-in-drawer) */
  boxes: DrawerZoneBox[];
  /**
   * Ratio of actual drawer box height to front height (0.0-1.0, default 1.0)
   * E.g., 0.5 means the drawer box is half the front height, positioned at bottom
   * Useful for tall fronts with smaller actual drawers inside
   */
  boxToFrontRatio?: number;
  /**
   * Content above the drawer box (shelves)
   * Only relevant when boxToFrontRatio < 1.0
   */
  aboveBoxContent?: DrawerZoneAboveBoxContent;
}

/**
 * Complete drawer configuration using zone-based system
 */
export interface DrawerConfiguration {
  zones: DrawerZone[];
  slideType: DrawerSlideType;
  /** Default handle config (can be overridden per zone) */
  defaultHandleConfig?: HandleConfig;
  /** Material ID for drawer box (sides, back, front panel) - defaults to bodyMaterialId */
  boxMaterialId?: string;
  /** Material ID for drawer bottom - defaults to HDF or bodyMaterialId */
  bottomMaterialId?: string;
}
