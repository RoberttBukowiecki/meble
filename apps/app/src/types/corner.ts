/**
 * Corner Cabinet Type Definitions (Simplified Model)
 *
 * Full rectangular cabinet (W × H × D) positioned in a corner.
 * Two vertical sides: internal (at wall) and external (where other cabinet joins).
 * Front opening divided into: closed panel + door.
 *
 * Coordinate system:
 * - Origin (0,0,0) at front-left corner at floor level
 * - X axis: Points RIGHT (0 to W)
 * - Y axis: Points UP (0 to H)
 * - Z axis: Points BACK (0 to D, into the corner)
 *
 * Structure (top view, door on RIGHT):
 *
 *              W (full width)
 *     ┌────────────────────────────┐
 *     │                            │
 *     │       Cabinet interior     │ D (depth)
 *     │                            │
 *     └────────────────────────────┘
 *     ↑  [Front Panel]   [Door]    ↑
 *   Left                        Right
 *   side                        side
 *  (wall)                 (other cabinet)
 */

// ============================================================================
// Corner Cabinet Types
// ============================================================================

/**
 * Which side of the cabinet is at the wall (internal side)
 * - LEFT: Left side at wall, right side exposed (where other cabinet joins)
 * - RIGHT: Right side at wall, left side exposed
 */
export type CornerWallSide = 'LEFT' | 'RIGHT';

/**
 * Which side of the front opening has the door
 * - LEFT: Door on left, closed panel on right
 * - RIGHT: Door on right, closed panel on left
 */
export type CornerDoorPosition = 'LEFT' | 'RIGHT';

/**
 * Front type for corner cabinets
 */
export type CornerFrontType =
  | 'NONE'     // No front (open shelving)
  | 'SINGLE';  // Single door with front closing panel

/**
 * Mount type for panels (inset between sides or overlay on sides)
 */
export type CornerMountType = 'overlay' | 'inset';

// ============================================================================
// Corner Configuration Interface (Simplified)
// ============================================================================

/**
 * Corner cabinet configuration
 *
 * Dimension terminology:
 * - W: Full cabinet width (mm)
 * - D: Cabinet depth (mm)
 * - doorWidth: Width of the door opening (mm)
 * - frontPanelWidth: W - doorWidth - gaps (calculated)
 *
 * Example: W=1000, D=600, doorWidth=450
 * Creates 1000x600 cabinet with 450mm door and ~550mm front closing panel
 */
export interface CornerConfig {
  /** Which side of the cabinet is at the wall */
  wallSide: CornerWallSide;

  /** Full cabinet width (mm) */
  W: number;
  /** Cabinet depth (mm) */
  D: number;

  /** Bottom panel mounting (inset = fits between sides, overlay = sides sit on top) */
  bottomMount: CornerMountType;
  /** Top panel mounting (inset = fits between sides, overlay = sides hang below) */
  topMount: CornerMountType;

  /** Type of front (NONE = open, SINGLE = door + front closing panel) */
  frontType: CornerFrontType;
  /** Which side of the front has the door (opposite side has closing panel) */
  doorPosition?: CornerDoorPosition;
  /** Width of the door (mm). Front closing panel width = W - doorWidth - gaps */
  doorWidth?: number;
  /** Hinge side for the door ('left' = hinges on left edge, 'right' = hinges on right edge) */
  hingeSide?: 'left' | 'right';
  /** Gap between door/panels and frame (mm, default 2) */
  doorGap?: number;
}

// ============================================================================
// Corner Part Roles
// ============================================================================

/**
 * Part roles specific to corner cabinets
 * Note: Door uses standard 'DOOR' role for front hiding/handles integration
 */
export type CornerPartRole =
  | 'CORNER_SIDE_INTERNAL'  // Internal side panel (at wall)
  | 'CORNER_SIDE_EXTERNAL'  // External side panel (where other cabinet joins)
  | 'CORNER_BACK'           // Back panel
  | 'CORNER_BOTTOM'         // Bottom panel
  | 'CORNER_TOP'            // Top panel
  | 'CORNER_SHELF'          // Shelf
  | 'CORNER_FRONT_PANEL';   // Front closing panel (structural, inset)
