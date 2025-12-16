/**
 * Cabinet Leg Type Definitions
 */

// ============================================================================
// Leg Configuration Types
// ============================================================================

/**
 * Preset leg types with predefined dimensions
 */
export type LegPreset = 'SHORT' | 'STANDARD' | 'TALL' | 'CUSTOM';

/**
 * Leg material/finish type
 */
export type LegFinish =
  | 'BLACK_PLASTIC'
  | 'CHROME'
  | 'BRUSHED_STEEL'
  | 'WHITE_PLASTIC';

/**
 * Leg shape for 3D rendering
 */
export type LegShape = 'ROUND' | 'SQUARE';

/**
 * Leg count mode
 */
export type LegCountMode = 'AUTO' | 'MANUAL';

/**
 * Configuration for a single leg type
 */
export interface LegTypeConfig {
  preset: LegPreset;
  height: number; // mm - base height
  adjustRange: number; // mm - adjustment range (+/-)
  diameter: number; // mm - leg diameter/width
  shape: LegShape;
  finish: LegFinish;
}

/**
 * Complete leg configuration for a cabinet
 */
export interface LegsConfig {
  enabled: boolean;
  legType: LegTypeConfig;
  countMode: LegCountMode;
  manualCount?: number; // Only used when countMode === 'MANUAL'
  currentHeight: number; // mm - actual current height (within adjust range)
  cornerInset: number; // mm - inset from cabinet edges
}

// ============================================================================
// Leg Instance Types (for 3D rendering)
// ============================================================================

/**
 * Color mapping for leg finishes
 */
export const LEG_FINISH_COLORS: Record<LegFinish, string> = {
  BLACK_PLASTIC: '#1a1a1a',
  CHROME: '#c0c0c0',
  BRUSHED_STEEL: '#8a8a8a',
  WHITE_PLASTIC: '#f0f0f0',
};

/**
 * Position of a single leg in 3D space (relative to cabinet center)
 */
export interface LegPosition {
  x: number; // mm - X position relative to cabinet center
  z: number; // mm - Z position relative to cabinet center
}

/**
 * Complete data for a single leg instance (for rendering)
 * Analogous to HandleMetadata for handles
 */
export interface LegData {
  index: number; // Leg index (0-based)
  position: LegPosition; // Position relative to cabinet center
  shape: LegShape;
  finish: LegFinish;
  color: string; // Resolved color from finish
  height: number; // mm - actual height
  diameter: number; // mm - diameter/width
}

/**
 * Helper function to get leg color from finish
 */
export function getLegColor(finish: LegFinish): string {
  return LEG_FINISH_COLORS[finish] ?? LEG_FINISH_COLORS.BLACK_PLASTIC;
}
