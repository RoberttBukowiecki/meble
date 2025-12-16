/**
 * Corner Cabinet Type Definitions
 *
 * Types for corner cabinets - specialized cabinets designed for corner spaces
 * where two walls meet. Supports internal corners (Phase 1) and external corners (Phase 2).
 *
 * Coordinate system:
 * - Origin (0,0,0) at external front corner
 * - X axis: Points RIGHT (along arm A width)
 * - Y axis: Points UP (height)
 * - Z axis: Points BACK (into the corner)
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
 * Front/door type for corner cabinets
 */
export type CornerFrontType =
  | 'NONE'     // No front (open shelving)
  | 'SINGLE'   // Single door parallel to X axis
  | 'BIFOLD'   // Bi-fold (2 panels with hinge between) - future
  | 'DOUBLE'   // Two separate doors (one per arm) - future
  | 'ANGLED';  // Single diagonal door at angle

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
 * Panel geometry type for top/bottom panels
 */
export type CornerPanelGeometry = 'TWO_RECT' | 'L_SHAPE';

/**
 * Mount type for panels (inset between sides or overlay on sides)
 */
export type CornerMountType = 'overlay' | 'inset';

// ============================================================================
// Corner Configuration Interface
// ============================================================================

/**
 * Corner-specific configuration
 *
 * Dimension terminology:
 * - W: External width of cabinet (left arm span)
 * - D: External depth of cabinet (right arm span)
 * - bodyDepth: Depth of cabinet body panels (how deep shelves/sides extend)
 *
 * Example: W=900, D=900, bodyDepth=560
 * This creates a corner cabinet where both arms are 900mm,
 * but the actual shelf/side depth is 560mm.
 */
export interface CornerConfig {
  /** Type of corner cabinet */
  cornerType: InternalCornerType;
  /** Left or right corner orientation */
  cornerOrientation: CornerOrientation;

  // External dimensions
  /** External width (mm) - full span of arm A */
  W: number;
  /** External depth (mm) - full span of arm B */
  D: number;
  /** Body panel depth (mm) - how deep panels/shelves extend */
  bodyDepth: number;

  // Mounting options
  /** Bottom panel mounting (overlay sits under sides, inset between sides) */
  bottomMount: CornerMountType;
  /** Top panel mounting */
  topMount: CornerMountType;

  // Panel geometry
  /** Panel geometry: two rectangles or single L-shape */
  panelGeometry: CornerPanelGeometry;

  // Front rail / wieniec przedni
  /** Enable front rail at top */
  frontRail: boolean;
  /** Front rail mounting type */
  frontRailMount?: CornerMountType;
  /** Front rail width (mm), default 100 */
  frontRailWidth?: number;

  // Door/front configuration
  /** Type of front (doors) */
  frontType: CornerFrontType;
  /** Hinge side for SINGLE/BIFOLD doors */
  hingeSide?: 'left' | 'right';
  /** Front angle for ANGLED type (degrees, default 45) */
  frontAngle?: number;
  /** Gap between door and frame (mm, default 2) */
  doorGap?: number;

  // Wall sharing
  /** How side walls are shared with adjacent cabinets */
  wallSharingMode: WallSharingMode;
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
