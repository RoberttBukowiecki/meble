/**
 * Cabinet type definitions
 */

import type { DoorConfig, DoorMetadata, HingeSide, FoldingDoorConfig } from './door';
import type { HandleConfig, HandleMetadata } from './handle';
import type { DrawerSlideType, DrawerConfiguration } from './drawer';
import type { CabinetInteriorConfig } from './cabinetInterior';
import type { SideFrontsConfig, DecorativePanelsConfig } from './decorative';
import type { LegsConfig, LegData } from './legs';
import type { CornerConfig, CornerPartRole } from './corner';
import type { CabinetCountertopConfig } from './countertop';

/**
 * Defines how the top and bottom panels are placed relative to the side panels.
 * 'inset': Placed between the side panels.
 * 'overlay': Placed on top of (overlaying) the side panels.
 */
export type TopBottomPlacement = 'inset' | 'overlay';

/**
 * Defines how the back panel is mounted to the cabinet body.
 * 'overlap': Back panel overlaps onto edges (sits in rabbet/dado)
 * 'dado': Back panel sits in a groove/dado (future implementation)
 */
export type BackMountType = 'overlap' | 'dado';

/**
 * Available cabinet template types
 */
export type CabinetType =
  | 'KITCHEN'
  | 'WARDROBE'
  | 'BOOKSHELF'
  | 'DRAWER'
  | 'WALL'              // Wall-mounted cabinet
  | 'CORNER_INTERNAL'   // Internal corner cabinet (Phase 1)
  | 'CORNER_EXTERNAL';  // External corner cabinet (Phase 2)

/**
 * Mounting hanger cutout configuration
 * Cutouts on the back panel for furniture hangers (zawieszki meblowe)
 */
export interface HangerCutoutConfig {
  enabled: boolean;
  /** Width of the cutout (mm) - typically 40-60mm */
  width: number;
  /** Height of the cutout (mm) - typically 30-50mm */
  height: number;
  /** Horizontal inset from cabinet edge (mm) */
  horizontalInset: number;
  /** Vertical inset from top edge (mm) */
  verticalInset: number;
}

/**
 * Cabinet material configuration
 * Cabinets use three materials: body (structure), front (visible surfaces), and back (rear panel)
 */
export interface CabinetMaterials {
  bodyMaterialId: string;   // For sides, bottom, top, shelves
  frontMaterialId: string;  // For doors, drawer fronts
  backMaterialId?: string;  // For back panel (optional, defaults to HDF)
}

/**
 * Base parameters shared by all cabinets
 */
export interface CabinetBaseParams {
  width: number;   // Overall width (mm)
  height: number;  // Overall height (mm)
  depth: number;   // Overall depth (mm)
  topBottomPlacement: TopBottomPlacement; // How top/bottom panels are attached
  hasBack: boolean;           // Whether to add back panel
  backOverlapRatio: number;   // How much back panel overlaps onto body edges (0-1, default 2/3)
  backMountType: BackMountType; // How back panel is mounted (default 'overlap')
  // Zone-based drawer configuration (new system)
  drawerConfig?: DrawerConfiguration;
  // Legacy drawer configuration (for backward compatibility)
  drawerCount?: number; // Number of drawers (0 = no drawers)
  drawerSlideType?: DrawerSlideType; // Type of drawer slides
  hasInternalDrawers?: boolean; // If true, no drawer fronts (for use behind doors)
  drawerHandleConfig?: HandleConfig; // Handle configuration for drawer fronts
  // Side front panels (decorative end panels)
  sideFronts?: SideFrontsConfig; // Optional side fronts configuration
  // Top/bottom decorative panels (blenda, plinth, trim strips)
  decorativePanels?: DecorativePanelsConfig; // Optional decorative panels
  // Unified interior configuration (shelves + drawers in sections)
  interiorConfig?: CabinetInteriorConfig; // Optional unified interior
  // Cabinet legs configuration
  legs?: LegsConfig; // Optional leg configuration
  // Countertop configuration (for kitchen cabinets)
  countertopConfig?: CabinetCountertopConfig;
}

/**
 * Kitchen cabinet specific parameters
 */
export interface KitchenCabinetParams extends CabinetBaseParams {
  type: 'KITCHEN';
  shelfCount: number;  // Number of internal shelves (0-5)
  hasDoors: boolean;   // Whether to add doors
  // Door configuration
  doorConfig?: DoorConfig; // Optional for backward compatibility
  handleConfig?: HandleConfig; // Handle configuration for doors
}

/**
 * Wardrobe cabinet specific parameters
 */
export interface WardrobeCabinetParams extends CabinetBaseParams {
  type: 'WARDROBE';
  shelfCount: number;  // Number of internal shelves (0-10)
  doorCount: number;   // Number of doors (1-4)
}

/**
 * Bookshelf cabinet specific parameters
 */
export interface BookshelfCabinetParams extends CabinetBaseParams {
  type: 'BOOKSHELF';
  shelfCount: number;  // Number of shelves (1-10)
  // hasBack is inherited from CabinetBaseParams
}

/**
 * Drawer cabinet specific parameters
 */
export interface DrawerCabinetParams extends CabinetBaseParams {
  type: 'DRAWER';
  drawerCount: number; // Number of drawers (1-8) - legacy, use drawerConfig instead
  drawerSlideType: DrawerSlideType; // Type of drawer slides - legacy
  hasInternalDrawers: boolean; // If true, no drawer fronts - legacy
  drawerHeights?: number[]; // Optional custom heights per drawer (mm) - legacy
  bottomMaterialId?: string; // Optional separate material for drawer bottoms (thinner)
  handleConfig?: HandleConfig; // Handle configuration for drawer fronts - legacy
}

/**
 * Wall-mounted cabinet parameters
 * Cabinet designed for wall mounting using furniture hangers (zawieszki meblowe)
 * No legs - mounted directly to wall
 */
export interface WallCabinetParams extends CabinetBaseParams {
  type: 'WALL';
  /** Number of internal shelves (0-5) */
  shelfCount: number;
  /** Whether to add doors */
  hasDoors: boolean;
  /** Door configuration */
  doorConfig?: DoorConfig;
  /** Handle configuration for doors */
  handleConfig?: HandleConfig;
  /** Folding door configuration (front łamany) */
  foldingDoorConfig?: FoldingDoorConfig;
  /** Mounting hanger cutouts on back panel */
  hangerCutouts?: HangerCutoutConfig;
}

/**
 * Internal corner cabinet parameters (Phase 1)
 * For cabinets that fit into internal corners where two walls meet
 */
export interface CornerInternalCabinetParams extends CabinetBaseParams {
  type: 'CORNER_INTERNAL';
  /** Corner-specific configuration */
  cornerConfig: CornerConfig;
  /** Optional interior configuration (zone-based) */
  interiorConfig?: CabinetInteriorConfig;
  /** Optional door configuration */
  doorConfig?: DoorConfig;
  /** Optional handle configuration */
  handleConfig?: HandleConfig;
}

/**
 * External corner cabinet parameters (Phase 2 - future)
 * For cabinets on external corners like islands or peninsulas
 */
export interface CornerExternalCabinetParams extends CabinetBaseParams {
  type: 'CORNER_EXTERNAL';
  /** Corner-specific configuration */
  cornerConfig: CornerConfig;
  /** Optional interior configuration */
  interiorConfig?: CabinetInteriorConfig;
  /** Optional door configuration */
  doorConfig?: DoorConfig;
  /** Optional handle configuration */
  handleConfig?: HandleConfig;
}

/**
 * Discriminated union of all cabinet parameter types
 */
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams
  | WallCabinetParams
  | CornerInternalCabinetParams
  | CornerExternalCabinetParams;

/**
 * Cabinet metadata - stored separately from parts
 * References parts via cabinetId field in Part.cabinetMetadata
 */
export interface Cabinet {
  id: string;
  name: string;
  furnitureId: string;
  type: CabinetType;
  params: CabinetParams;
  materials: CabinetMaterials;
  topBottomPlacement: TopBottomPlacement;
  partIds: string[];  // Array of part IDs that belong to this cabinet
  /** Cabinet legs data (for 3D rendering, not cut parts) */
  legs?: LegData[];
  createdAt: Date;
  updatedAt: Date;
  /** Visual-only: hide fronts (doors, drawer fronts) in 3D view */
  hideFronts?: boolean;
  /** Visual-only: hide countertop in 3D view */
  hideCountertops?: boolean;
  /**
   * World transform of the cabinet (source of truth for rotation)
   * Stored as Euler angles to avoid gimbal lock issues during editing
   */
  worldTransform?: {
    position: [number, number, number];
    rotation: [number, number, number]; // Euler angles in radians
  };
}

/**
 * Part role within a cabinet
 * Used to identify what each part represents for material assignment
 */
export type CabinetPartRole =
  | 'BOTTOM'
  | 'TOP'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE'
  | 'BACK'
  | 'SHELF'
  | 'DOOR'
  | 'DRAWER_FRONT'
  | 'DRAWER_BOX_FRONT' // Front wall of drawer box (body material) - for internal drawers
  | 'DRAWER_SIDE'
  | 'DRAWER_SIDE_LEFT'
  | 'DRAWER_SIDE_RIGHT'
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM'
  | 'SIDE_FRONT_LEFT'   // Decorative side panel on left
  | 'SIDE_FRONT_RIGHT'  // Decorative side panel on right
  | 'DECORATIVE_TOP'    // Top decorative panel (blenda, trim, full panel)
  | 'DECORATIVE_BOTTOM' // Bottom decorative panel (plinth, trim, full panel)
  | 'PARTITION'         // Vertical divider between columns in interior
  // Corner cabinet specific roles
  | CornerPartRole;

/**
 * Extended metadata for parts that belong to cabinets
 */
export interface CabinetPartMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number; // For shelves, doors, drawers (0-based)
  drawerIndex?: number; // Which drawer this part belongs to (0-based)
  // Door-specific metadata
  doorMetadata?: DoorMetadata;
  handleMetadata?: HandleMetadata;
}

// Re-export HingeSide for convenience
export type { HingeSide };

// ============================================================================
// Cabinet Body Part Roles
// ============================================================================

/**
 * Roles that belong to the cabinet body structure (not fronts/decorative).
 * Used for calculating cabinet center position without front panel offset.
 */
export const CABINET_BODY_ROLES: readonly CabinetPartRole[] = [
  'BOTTOM',
  'TOP',
  'LEFT_SIDE',
  'RIGHT_SIDE',
  'BACK',
  'SHELF',
  'PARTITION',
  'DRAWER_SIDE_LEFT',
  'DRAWER_SIDE_RIGHT',
  'DRAWER_BACK',
  'DRAWER_BOTTOM',
  'DRAWER_BOX_FRONT',
] as const;

/**
 * Check if a role is a cabinet body part (not front/decorative)
 */
export function isBodyPartRole(role: CabinetPartRole | undefined): boolean {
  if (!role) return false;
  return (CABINET_BODY_ROLES as readonly string[]).includes(role);
}
