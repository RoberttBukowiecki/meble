/**
 * Edge banding type definitions
 */

/**
 * Edge banding configuration for rectangular parts
 * Each edge can be banded or not (true/false)
 */
export interface EdgeBandingRect {
  type: 'RECT';
  top: boolean;    // Y+ edge
  bottom: boolean; // Y- edge
  left: boolean;   // X- edge
  right: boolean;  // X+ edge
}

/**
 * Edge banding configuration for L-shaped parts (6 edges)
 *
 * Edge numbering (TOP VIEW, counterclockwise from front-left):
 *
 *       edge5 (back-left)
 *    ┌──────────────────────┐
 *    │                      │
 * e6 │                      │ edge4 (inner-vertical)
 *    │          ┌───────────┤
 *    │          │           │ edge3 (inner-horizontal)
 *    │          │           │
 *    └──────────┴───────────┘
 *       edge1        edge2
 *    (front-left)  (front-right)
 */
export interface EdgeBandingLShape {
  type: 'L_SHAPE';
  /** Front-left (outer front of arm A) */
  edge1: boolean;
  /** Front-right (outer side of arm A, facing front) */
  edge2: boolean;
  /** Inner-horizontal (step going inward) */
  edge3: boolean;
  /** Inner-vertical (step going back) */
  edge4: boolean;
  /** Back-left (back of arm B) */
  edge5: boolean;
  /** Outer-left (outer side of arm B) */
  edge6: boolean;
}

/**
 * Edge banding configuration for trapezoid parts
 */
export interface EdgeBandingTrapezoid {
  type: 'TRAPEZOID';
  front: boolean;  // Front edge (shorter or longer)
  back: boolean;   // Back edge
  left: boolean;   // Left (angled) edge
  right: boolean;  // Right (angled) edge
}

/**
 * Edge banding configuration for complex shapes
 * Array of edge indices that should be banded
 */
export interface EdgeBandingGeneric {
  type: 'GENERIC';
  edges: number[]; // Indices of edges to band
}

/**
 * Discriminated union of edge banding types
 */
export type EdgeBanding =
  | EdgeBandingRect
  | EdgeBandingLShape
  | EdgeBandingTrapezoid
  | EdgeBandingGeneric;
