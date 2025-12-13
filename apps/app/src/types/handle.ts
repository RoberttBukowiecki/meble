/**
 * Handle type definitions
 */

/**
 * Handle category - broad classification
 */
export type HandleCategory = 'TRADITIONAL' | 'MODERN' | 'HANDLELESS';

/**
 * Traditional handle types
 */
export type TraditionalHandleType =
  | 'BAR'        // Rękojeść / reling (bar/rail handle)
  | 'STRIP'      // Listwa (strip/profile handle)
  | 'KNOB';      // Gałka (round knob)

/**
 * Modern handle types
 */
export type ModernHandleType =
  | 'MILLED'           // Uchwyt frezowany (routed into top edge of front)
  | 'GOLA'             // System GOLA (integrated groove/channel)
  | 'EDGE_MOUNTED';    // Uchwyt krawędziowy nakładany (edge-mounted profile)

/**
 * Handleless solutions
 */
export type HandlelessType =
  | 'TIP_ON'           // TIP-ON / push-to-open (Blum system)
  | 'PUSH_LATCH';      // Push latch mechanism

/**
 * Union of all handle types
 */
export type HandleType = TraditionalHandleType | ModernHandleType | HandlelessType;

/**
 * Handle orientation on the door
 */
export type HandleOrientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Handle position preset for easy selection
 */
export type HandlePositionPreset =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'TOP_CENTER'
  | 'MIDDLE_LEFT'
  | 'MIDDLE_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_CENTER'
  | 'CUSTOM';

/**
 * Handle dimensions (for visualization and reports)
 */
export interface HandleDimensions {
  length: number;       // mm - for bars/strips
  width?: number;       // mm - for strips
  height?: number;      // mm - handle projection from surface
  diameter?: number;    // mm - for knobs
  holeSpacing?: number; // mm - distance between mounting holes (CC - center to center)
}

/**
 * Handle position on the door
 */
export interface HandlePosition {
  preset: HandlePositionPreset;
  x?: number; // mm from door center (for CUSTOM)
  y?: number; // mm from door center (for CUSTOM)
  offsetFromEdge?: number; // mm from nearest edge
}

/**
 * Complete handle configuration
 */
export interface HandleConfig {
  type: HandleType;
  category: HandleCategory;
  dimensions?: HandleDimensions;
  position: HandlePosition;
  orientation: HandleOrientation;
  // Visual properties
  finish?: string; // e.g., 'chrome', 'brushed_nickel', 'black_matte', 'gold'
  // For milled handles
  milledDepth?: number; // mm - depth of routed groove
  milledWidth?: number; // mm - width of finger grip
}

/**
 * Handle metadata stored on door parts
 */
export interface HandleMetadata {
  config: HandleConfig;
  actualPosition: { x: number; y: number }; // Calculated position on door
}
