/**
 * Types for CountertopLayoutDiagram component
 */

import type {
  CountertopGroup,
  CountertopSegment,
  CountertopJoint,
  CncOperation,
  CabinetGap,
  CornerPosition,
} from "@/types/countertop";

/**
 * SVG coordinate point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Segment position and dimensions in SVG space
 */
export interface SegmentLayout {
  segmentId: string;
  /** Top-left corner in SVG coordinates */
  position: Point;
  /** Width in SVG units (scaled from mm) */
  width: number;
  /** Height in SVG units (scaled from mm) */
  height: number;
  /** Rotation in degrees */
  rotation: number;
  /** Miter cut corners (for L-shape joints) */
  miterCorners?: {
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
    angle: number;
  }[];
}

/**
 * Edge position for labels
 */
export interface EdgePosition {
  edge: "a" | "b" | "c" | "d";
  /** Center point of the edge */
  center: Point;
  /** Normal direction (for label offset) */
  normal: Point;
}

/**
 * Corner marker position
 */
export interface CornerMarkerPosition {
  position: CornerPosition;
  point: Point;
  segmentId: string;
}

/**
 * CNC operation marker position
 */
export interface CncMarkerPosition {
  operation: CncOperation;
  /** Center point in SVG coordinates */
  center: Point;
  /** Scaled dimensions */
  width?: number;
  height?: number;
  diameter?: number;
  segmentId: string;
}

/**
 * Gap indicator position
 */
export interface GapIndicatorPosition {
  gap: CabinetGap;
  /** Position for the indicator */
  position: Point;
  /** Width of the gap indicator */
  width: number;
  /** Height of the gap indicator */
  height: number;
}

/**
 * Layout calculation result
 */
export interface DiagramLayout {
  /** ViewBox dimensions */
  viewBox: { minX: number; minY: number; width: number; height: number };
  /** Segment layouts */
  segments: SegmentLayout[];
  /** Edge label positions */
  edges: EdgePosition[];
  /** Corner marker positions */
  corners: CornerMarkerPosition[];
  /** CNC operation marker positions */
  cncOperations: CncMarkerPosition[];
  /** Gap indicator positions */
  gaps: GapIndicatorPosition[];
  /** Joint line positions */
  joints: {
    joint: CountertopJoint;
    startPoint: Point;
    endPoint: Point;
    midPoint: Point;
  }[];
  /** Scale factor (SVG units per mm) */
  scale: number;
}

/**
 * Selection state
 */
export interface DiagramSelection {
  type: "segment" | "corner" | "cnc" | "gap" | "joint" | null;
  id: string | null;
}

/**
 * Diagram props
 */
export interface CountertopLayoutDiagramProps {
  group: CountertopGroup;
  /** Width of the container in pixels */
  width?: number;
  /** Height of the container in pixels */
  height?: number;
  /** Currently selected element */
  selection?: DiagramSelection;
  /** Callback when element is selected */
  onSelect?: (selection: DiagramSelection) => void;
  /** Show dimension annotations */
  showDimensions?: boolean;
  /** Show edge labels */
  showEdgeLabels?: boolean;
  /** Show corner markers */
  showCornerMarkers?: boolean;
  /** Interactive mode (clickable elements) */
  interactive?: boolean;
}
