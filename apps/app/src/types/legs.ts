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
