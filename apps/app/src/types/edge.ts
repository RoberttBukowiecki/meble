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
export type EdgeBanding = EdgeBandingRect | EdgeBandingGeneric;
