/**
 * Door configuration type definitions
 */

/**
 * Door layout type - single or double doors
 */
export type DoorLayout = 'SINGLE' | 'DOUBLE';

/**
 * Hinge side for horizontally opening doors
 */
export type HingeSide = 'LEFT' | 'RIGHT';

/**
 * Door opening direction
 * - HORIZONTAL: Standard side-hinged doors (left or right)
 * - LIFT_UP: Top-hinged doors that open upward (lift mechanisms)
 * - FOLD_DOWN: Bottom-hinged doors that fold down (rarely used)
 */
export type DoorOpeningDirection = 'HORIZONTAL' | 'LIFT_UP' | 'FOLD_DOWN';

/**
 * Door configuration for cabinet parameters
 */
export interface DoorConfig {
  layout: DoorLayout;
  openingDirection: DoorOpeningDirection;
  hingeSide?: HingeSide; // Only for HORIZONTAL + SINGLE
}

/**
 * Extended metadata for door parts
 */
export interface DoorMetadata {
  hingeSide?: HingeSide;
  openingDirection: DoorOpeningDirection;
  openingAngle?: number; // Future: for animation (0-120 degrees)
  /** For folding doors - identifies which section */
  foldingSection?: 'UPPER' | 'LOWER';
}

/**
 * Folding door (front łamany) configuration
 * A door split into 2 horizontal sections that fold together when opening upward
 */
export interface FoldingDoorConfig {
  enabled: boolean;
  /** Split ratio - fraction of height for bottom section (0.3-0.7, default 0.5) */
  splitRatio: number;
  /** Gap between sections (mm) */
  sectionGap: number;
}
