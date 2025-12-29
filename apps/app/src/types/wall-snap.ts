/**
 * Wall snapping type definitions
 *
 * Types for snapping parts and cabinets to room walls and interior corners.
 */

/**
 * Representation of a wall's inner surface as a snap target.
 * Uses 2D coordinates [x, z] with height for 3D calculations.
 *
 * The inner surface is the wall line offset by +thickness/2 toward the room interior.
 */
export interface WallInnerSurface {
  /** Wall segment ID */
  wallId: string;

  /** Room ID this wall belongs to */
  roomId: string;

  /** Start point of inner surface [x, z] in mm */
  start: [number, number];

  /** End point of inner surface [x, z] in mm */
  end: [number, number];

  /** Normalized normal vector pointing into the room [nx, nz] */
  normal: [number, number];

  /** Wall height in mm */
  heightMm: number;

  /** Wall segment length in mm (pre-computed) */
  length: number;

  /** Wall angle in radians (pre-computed for performance) */
  angle: number;
}

/**
 * Interior corner where two walls meet.
 * Used for snapping objects flush against both walls simultaneously.
 */
export interface WallCorner {
  /** Unique corner ID */
  id: string;

  /** Room ID this corner belongs to */
  roomId: string;

  /** Corner point in 2D (inner surface intersection) [x, z] in mm */
  point: [number, number];

  /** First wall ID forming this corner */
  wall1Id: string;

  /** Second wall ID forming this corner */
  wall2Id: string;

  /** Inward normal for first wall at corner */
  wall1Normal: [number, number];

  /** Inward normal for second wall at corner */
  wall2Normal: [number, number];

  /** Interior angle of the corner in radians */
  angle: number;

  /** Height in mm (minimum of both walls) */
  heightMm: number;
}

/**
 * Snap candidate during wall snap calculation
 */
export interface WallSnapCandidate {
  /** Type of snap target */
  type: "wall" | "corner";

  /** Wall ID (for wall snaps) */
  wallId?: string;

  /** Corner ID (for corner snaps) */
  cornerId?: string;

  /** Snap offset to apply [x, y, z] in mm */
  snapOffset: [number, number, number];

  /** Distance from object to wall/corner in mm */
  distance: number;

  /** Visual guide line for rendering */
  visualGuide: {
    start: [number, number, number];
    end: [number, number, number];
  };
}

/**
 * Result of wall snap calculation
 */
export interface WallSnapResult {
  /** Whether a snap was found */
  snapped: boolean;

  /** The snap offset to apply [x, y, z] */
  snapOffset: [number, number, number];

  /** Axis that was snapped */
  axis?: "X" | "Z";

  /** Wall ID if snapped to wall */
  snappedToWall?: string;

  /** Corner ID if snapped to corner */
  snappedToCorner?: string;

  /** Visual guides for rendering snap indicators */
  visualGuides: Array<{
    type: "wall" | "corner";
    start: [number, number, number];
    end: [number, number, number];
  }>;
}

/**
 * Cached wall snap geometry for a room.
 * Pre-computed when room/walls change to avoid recalculation during drag.
 */
export interface WallSnapCache {
  /** Room ID this cache is for (null if no room) */
  roomId: string | null;

  /** Pre-computed inner surfaces for all walls */
  surfaces: WallInnerSurface[];

  /** Pre-computed interior corners */
  corners: WallCorner[];

  /** Cache version (increment when room/walls change) */
  version: number;
}

/**
 * Input bounds for wall snap calculation
 */
export interface WallSnapBounds {
  /** Minimum point [x, y, z] in mm */
  min: [number, number, number];

  /** Maximum point [x, y, z] in mm */
  max: [number, number, number];

  /** Center point [x, y, z] in mm */
  center: [number, number, number];
}
