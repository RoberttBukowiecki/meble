/**
 * Corner Cabinet Type Definitions
 *
 * Types for corner cabinets - specialized cabinets designed for corner spaces
 * where two walls meet. Supports internal corners (Phase 1) and external corners (Phase 2).
 */

// ============================================================================
// Corner Cabinet Sub-Types
// ============================================================================

/**
 * Corner cabinet sub-types for internal corners (walls meeting at angle)
 */
export type InternalCornerType = 'L_SHAPED' | 'BLIND_CORNER' | 'LAZY_SUSAN';

/**
 * Corner cabinet sub-types for external corners (Phase 2)
 */
export type ExternalCornerType = 'EXTERNAL_L_SHAPED' | 'EXTERNAL_DIAGONAL';

/**
 * Corner orientation - which direction the corner opens
 */
export type CornerOrientation = 'LEFT' | 'RIGHT';

// ============================================================================
// Corner Configuration Options
// ============================================================================

/**
 * Door configuration for corner cabinets
 */
export type CornerDoorType =
  | 'BI_FOLD'         // Folding doors (2-part)
  | 'SINGLE_DIAGONAL' // Single door on diagonal front
  | 'DOUBLE_L'        // Two door sets (L-configuration)
  | 'NONE';           // No doors (open shelving)

/**
 * Dead zone handling presets
 * Controls the inaccessible area in the corner
 */
export type DeadZonePreset =
  | 'MINIMAL'     // Smallest dead zone, maximum usable space
  | 'STANDARD'    // Balanced approach (default)
  | 'ACCESSIBLE'  // Larger opening for better access
  | 'CUSTOM';     // User-defined dimensions

/**
 * Wall sharing mode for adjacent cabinets
 * Controls which side panels are generated
 */
export type WallSharingMode =
  | 'FULL_ISOLATION' // All walls present
  | 'SHARED_LEFT'    // Left wall shared with adjacent cabinet
  | 'SHARED_RIGHT'   // Right wall shared with adjacent cabinet
  | 'SHARED_BOTH';   // Both sides shared (rare)

/**
 * Dimension mode for corner arms
 */
export type CornerDimensionMode = 'SYMMETRIC' | 'ASYMMETRIC';

/**
 * Internal mechanism types (extensible for future)
 */
export type CornerMechanismType =
  | 'FIXED_SHELVES'  // Standard fixed shelves
  | 'LAZY_SUSAN'     // Rotating carousel (future)
  | 'PULL_OUT'       // Pull-out shelves/baskets (future)
  | 'MAGIC_CORNER';  // Magic corner system (future)

// ============================================================================
// Corner Configuration Interface
// ============================================================================

/**
 * Corner-specific configuration (embedded in CornerInternalCabinetParams)
 */
export interface CornerConfig {
  /** Type of corner cabinet */
  cornerType: InternalCornerType;
  /** Left or right corner orientation */
  cornerOrientation: CornerOrientation;

  // Dimensions
  /** Symmetric or asymmetric arm dimensions */
  dimensionMode: CornerDimensionMode;
  /** Length of first arm (mm) */
  armA: number;
  /** Length of second arm (mm) - equals armA if SYMMETRIC */
  armB: number;
  /** Angle in degrees (default: 90) */
  cornerAngle: number;

  // Dead zone handling
  /** Preset for dead zone dimensions */
  deadZonePreset: DeadZonePreset;
  /** Custom depth when preset is CUSTOM (mm) */
  deadZoneDepth?: number;
  /** Custom width when preset is CUSTOM (mm) */
  deadZoneWidth?: number;

  // Wall sharing
  /** How side walls are shared with adjacent cabinets */
  wallSharingMode: WallSharingMode;

  // Doors
  /** Type of doors for corner cabinet */
  cornerDoorType: CornerDoorType;

  // Internal mechanism
  /** Type of internal storage mechanism */
  mechanismType: CornerMechanismType;

  // L-Shaped specific
  /** Width of diagonal front panel (auto-calculated if not provided) */
  diagonalWidth?: number;
}

// ============================================================================
// Corner Part Roles
// ============================================================================

/**
 * Part roles specific to corner cabinets
 * These extend the base CabinetPartRole union
 */
export type CornerPartRole =
  | 'CORNER_LEFT_SIDE'      // Left arm side panel
  | 'CORNER_RIGHT_SIDE'     // Right arm side panel
  | 'CORNER_BACK_LEFT'      // Left arm back panel
  | 'CORNER_BACK_RIGHT'     // Right arm back panel
  | 'CORNER_DIAGONAL_FRONT' // Diagonal front panel (L-shaped)
  | 'CORNER_BOTTOM'         // L-shaped or trapezoid bottom
  | 'CORNER_TOP'            // L-shaped or trapezoid top
  | 'CORNER_SHELF'          // Corner shelf (L-shaped or trapezoid)
  | 'CORNER_DOOR_LEFT'      // Bi-fold left part
  | 'CORNER_DOOR_RIGHT'     // Bi-fold right part
  | 'CORNER_FILLER';        // Filler panel for dead zone
