/**
 * Decorative panel type definitions (side fronts, blenda, plinth, etc.)
 */

/**
 * Configuration for a single side front panel (decorative end panel)
 */
export interface SideFrontConfig {
  enabled: boolean;

  /** Material ID for this side front (defaults to cabinet.materials.frontMaterialId) */
  materialId?: string;

  /** How far the side front extends beyond the cabinet front face (mm) */
  forwardProtrusion: number;

  /** Distance from cabinet bottom to start of side front (mm) */
  bottomOffset: number;

  /** Distance from cabinet top to end of side front (mm) */
  topOffset: number;
}

/**
 * Configuration for both side fronts
 */
export interface SideFrontsConfig {
  left: SideFrontConfig | null;  // null = disabled
  right: SideFrontConfig | null; // null = disabled
}

/**
 * Default side front configuration
 */
export const DEFAULT_SIDE_FRONT_CONFIG: SideFrontConfig = {
  enabled: true,
  materialId: undefined, // Uses frontMaterialId
  forwardProtrusion: 0,  // 0 means use front material thickness as default
  bottomOffset: 0,
  topOffset: 0,
};

/**
 * Type of top/bottom decorative panel
 */
export type DecorativePanelType =
  | 'BLENDA'      // Top panel covering space above doors
  | 'PLINTH'      // Bottom plinth (cokół) - base of cabinet
  | 'TRIM_STRIP'  // Thin decorative trim strip
  | 'FULL_PANEL'; // Full decorative panel like side fronts

/**
 * Position of decorative panel
 */
export type DecorativePanelPosition = 'TOP' | 'BOTTOM';

/**
 * Configuration for a single decorative panel
 */
export interface DecorativePanelConfig {
  enabled: boolean;
  type: DecorativePanelType;
  position: DecorativePanelPosition;

  /** Material ID (defaults to frontMaterialId) */
  materialId?: string;

  /** Height of the panel in mm */
  height: number;

  /** Depth of panel (for PLINTH - how far it's recessed from front) */
  recess?: number;

  /** For TRIM_STRIP: thickness of the trim */
  thickness?: number;
}

/**
 * Full decorative panels configuration
 */
export interface DecorativePanelsConfig {
  top: DecorativePanelConfig | null;
  bottom: DecorativePanelConfig | null;
}

/**
 * Default configurations for each panel type
 */
export const DECORATIVE_PANEL_DEFAULTS: Record<DecorativePanelType, Partial<DecorativePanelConfig>> = {
  BLENDA: {
    height: 50,
    recess: 0,
  },
  PLINTH: {
    height: 100,
    recess: 50, // How far plinth is recessed from front
  },
  TRIM_STRIP: {
    height: 20,
    thickness: 10,
  },
  FULL_PANEL: {
    height: 100,
    recess: 0,
  },
};

/**
 * Default decorative panel configuration
 */
export const DEFAULT_DECORATIVE_PANEL_CONFIG: Omit<DecorativePanelConfig, 'position'> = {
  enabled: true,
  type: 'BLENDA',
  height: 50,
  recess: 0,
};
