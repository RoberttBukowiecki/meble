/**
 * Utility functions for CountertopLayoutDiagram
 */

import type { CountertopGroup, CountertopSegment } from "@/types/countertop";
import type {
  DiagramLayout,
  SegmentLayout,
  EdgePosition,
  CornerMarkerPosition,
  CncMarkerPosition,
  GapIndicatorPosition,
  Point,
} from "./types";

/** Padding around the diagram in SVG units */
const DIAGRAM_PADDING = 60;

/** Minimum dimension label spacing */
const LABEL_OFFSET = 25;

/**
 * Calculate the layout for all elements in the diagram
 */
export function calculateDiagramLayout(
  group: CountertopGroup,
  containerWidth: number,
  containerHeight: number
): DiagramLayout {
  const { segments, layoutType, joints, corners, gaps } = group;

  if (segments.length === 0) {
    return {
      viewBox: { minX: 0, minY: 0, width: 100, height: 100 },
      segments: [],
      edges: [],
      corners: [],
      cncOperations: [],
      gaps: [],
      joints: [],
      scale: 1,
    };
  }

  // Calculate total bounds for all segments
  const segmentLayouts = calculateSegmentLayouts(segments, layoutType);

  // Calculate bounds
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const layout of segmentLayouts) {
    minX = Math.min(minX, layout.position.x);
    maxX = Math.max(maxX, layout.position.x + layout.width);
    minY = Math.min(minY, layout.position.y);
    maxY = Math.max(maxY, layout.position.y + layout.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Calculate scale to fit in container with padding
  const availableWidth = containerWidth - DIAGRAM_PADDING * 2;
  const availableHeight = containerHeight - DIAGRAM_PADDING * 2;
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 0.5);

  // Calculate viewBox with padding
  const viewBox = {
    minX: minX - DIAGRAM_PADDING / scale,
    minY: minY - DIAGRAM_PADDING / scale,
    width: contentWidth + (DIAGRAM_PADDING * 2) / scale,
    height: contentHeight + (DIAGRAM_PADDING * 2) / scale,
  };

  // Calculate edge positions
  const edgePositions = calculateEdgePositions(segmentLayouts, segments);

  // Calculate corner positions
  const cornerPositions = calculateCornerPositions(segmentLayouts, segments, layoutType);

  // Calculate CNC operation positions
  const cncPositions = calculateCncPositions(segmentLayouts, segments);

  // Calculate gap positions
  const gapPositions = calculateGapPositions(gaps, segmentLayouts, segments);

  // Calculate joint positions
  const jointPositions = joints.map((joint) => {
    const segmentA = segmentLayouts.find((s) => s.segmentId === joint.segmentAId);
    const segmentB = segmentLayouts.find((s) => s.segmentId === joint.segmentBId);

    if (!segmentA || !segmentB) {
      return {
        joint,
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 0, y: 0 },
        midPoint: { x: 0, y: 0 },
      };
    }

    // Find the meeting point between segments
    const jointLine = calculateJointLine(segmentA, segmentB);
    return {
      joint,
      ...jointLine,
    };
  });

  return {
    viewBox,
    segments: segmentLayouts,
    edges: edgePositions,
    corners: cornerPositions,
    cncOperations: cncPositions,
    gaps: gapPositions,
    joints: jointPositions,
    scale,
  };
}

/**
 * Calculate segment layouts based on layout type
 */
function calculateSegmentLayouts(
  segments: CountertopSegment[],
  layoutType: string
): SegmentLayout[] {
  if (segments.length === 0) return [];

  const layouts: SegmentLayout[] = [];

  if (layoutType === "STRAIGHT" || segments.length === 1) {
    // Single segment centered at origin
    const seg = segments[0];
    layouts.push({
      segmentId: seg.id,
      position: { x: 0, y: 0 },
      width: seg.length,
      height: seg.width,
      rotation: 0,
    });
  } else if (layoutType === "L_SHAPE" && segments.length >= 2) {
    // L-shape: first segment horizontal, second vertical
    const seg1 = segments[0];
    const seg2 = segments[1];

    // First segment (horizontal)
    layouts.push({
      segmentId: seg1.id,
      position: { x: 0, y: seg2.length - seg1.width },
      width: seg1.length,
      height: seg1.width,
      rotation: 0,
      miterCorners: [{ corner: "topRight", angle: 45 }],
    });

    // Second segment (vertical, rotated 90°)
    layouts.push({
      segmentId: seg2.id,
      position: { x: seg1.length - seg2.width, y: 0 },
      width: seg2.width,
      height: seg2.length,
      rotation: 0,
      miterCorners: [{ corner: "bottomLeft", angle: 45 }],
    });
  } else if (layoutType === "U_SHAPE" && segments.length >= 3) {
    // U-shape: three segments forming U
    const seg1 = segments[0]; // Left vertical
    const seg2 = segments[1]; // Bottom horizontal
    const seg3 = segments[2]; // Right vertical

    const totalWidth = seg2.length;
    const totalHeight = Math.max(seg1.length, seg3.length);

    // Left segment (vertical)
    layouts.push({
      segmentId: seg1.id,
      position: { x: 0, y: 0 },
      width: seg1.width,
      height: seg1.length,
      rotation: 0,
      miterCorners: [{ corner: "bottomRight", angle: 45 }],
    });

    // Bottom segment (horizontal)
    layouts.push({
      segmentId: seg2.id,
      position: { x: 0, y: totalHeight - seg2.width },
      width: seg2.length,
      height: seg2.width,
      rotation: 0,
      miterCorners: [
        { corner: "topLeft", angle: 45 },
        { corner: "topRight", angle: 45 },
      ],
    });

    // Right segment (vertical)
    layouts.push({
      segmentId: seg3.id,
      position: { x: totalWidth - seg3.width, y: 0 },
      width: seg3.width,
      height: seg3.length,
      rotation: 0,
      miterCorners: [{ corner: "bottomLeft", angle: 45 }],
    });
  } else {
    // Fallback: stack segments horizontally
    let currentX = 0;
    for (const seg of segments) {
      layouts.push({
        segmentId: seg.id,
        position: { x: currentX, y: 0 },
        width: seg.length,
        height: seg.width,
        rotation: 0,
      });
      currentX += seg.length + 50; // Gap between segments
    }
  }

  return layouts;
}

/**
 * Calculate edge label positions
 */
function calculateEdgePositions(
  layouts: SegmentLayout[],
  segments: CountertopSegment[]
): EdgePosition[] {
  const positions: EdgePosition[] = [];

  for (const layout of layouts) {
    const { position, width, height } = layout;

    // Edge A (back/top)
    positions.push({
      edge: "a",
      center: { x: position.x + width / 2, y: position.y },
      normal: { x: 0, y: -1 },
    });

    // Edge B (right)
    positions.push({
      edge: "b",
      center: { x: position.x + width, y: position.y + height / 2 },
      normal: { x: 1, y: 0 },
    });

    // Edge C (front/bottom)
    positions.push({
      edge: "c",
      center: { x: position.x + width / 2, y: position.y + height },
      normal: { x: 0, y: 1 },
    });

    // Edge D (left)
    positions.push({
      edge: "d",
      center: { x: position.x, y: position.y + height / 2 },
      normal: { x: -1, y: 0 },
    });
  }

  return positions;
}

/**
 * Calculate corner marker positions
 */
function calculateCornerPositions(
  layouts: SegmentLayout[],
  segments: CountertopSegment[],
  layoutType: string
): CornerMarkerPosition[] {
  const positions: CornerMarkerPosition[] = [];
  let cornerNum = 1;

  for (const layout of layouts) {
    const { position, width, height, segmentId } = layout;

    // Four corners per segment
    const corners: Point[] = [
      { x: position.x, y: position.y }, // Top-left (1)
      { x: position.x + width, y: position.y }, // Top-right (2)
      { x: position.x + width, y: position.y + height }, // Bottom-right (3)
      { x: position.x, y: position.y + height }, // Bottom-left (4)
    ];

    for (const point of corners) {
      positions.push({
        position: cornerNum as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        point,
        segmentId,
      });
      cornerNum++;
      if (cornerNum > 8) break;
    }
  }

  return positions.slice(0, layoutType === "STRAIGHT" ? 4 : layoutType === "L_SHAPE" ? 6 : 8);
}

/**
 * Calculate CNC operation marker positions
 */
function calculateCncPositions(
  layouts: SegmentLayout[],
  segments: CountertopSegment[]
): CncMarkerPosition[] {
  const positions: CncMarkerPosition[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const layout = layouts.find((l) => l.segmentId === segment.id);
    if (!layout) continue;

    for (const op of segment.cncOperations) {
      // Position is relative to segment's left-front corner
      // In SVG: left = position.x, front = position.y + height (bottom)
      const center: Point = {
        x: layout.position.x + op.position.x,
        y: layout.position.y + layout.height - op.position.y,
      };

      positions.push({
        operation: op,
        center,
        width: op.dimensions.width,
        height: op.dimensions.height,
        diameter: op.dimensions.diameter,
        segmentId: segment.id,
      });
    }
  }

  return positions;
}

/**
 * Calculate gap indicator positions
 */
function calculateGapPositions(
  gaps: CountertopGroup["gaps"],
  layouts: SegmentLayout[],
  segments: CountertopSegment[]
): GapIndicatorPosition[] {
  if (!gaps || gaps.length === 0) return [];

  // For now, position gaps between segments
  // This is simplified - in reality would need cabinet positions
  const positions: GapIndicatorPosition[] = [];

  for (const gap of gaps) {
    // Find which segments contain these cabinets
    const segmentA = segments.find((s) => s.cabinetIds.includes(gap.cabinetAId));
    const segmentB = segments.find((s) => s.cabinetIds.includes(gap.cabinetBId));

    if (segmentA && segmentB && segmentA.id !== segmentB.id) {
      // Gap is between different segments - show between them
      const layoutA = layouts.find((l) => l.segmentId === segmentA.id);
      const layoutB = layouts.find((l) => l.segmentId === segmentB.id);

      if (layoutA && layoutB) {
        // Position in the middle between segments
        const midX = (layoutA.position.x + layoutA.width + layoutB.position.x) / 2;
        const midY = Math.min(layoutA.position.y, layoutB.position.y);

        positions.push({
          gap,
          position: { x: midX - 20, y: midY },
          width: 40,
          height: Math.max(layoutA.height, layoutB.height),
        });
      }
    }
  }

  return positions;
}

/**
 * Calculate joint line between two segments
 */
function calculateJointLine(
  segmentA: SegmentLayout,
  segmentB: SegmentLayout
): { startPoint: Point; endPoint: Point; midPoint: Point } {
  // Find the overlapping edge
  const aRight = segmentA.position.x + segmentA.width;
  const aBottom = segmentA.position.y + segmentA.height;
  const bRight = segmentB.position.x + segmentB.width;
  const bBottom = segmentB.position.y + segmentB.height;

  // Check if segments meet at corners (L-shape)
  // Simplified: assume miter joint at corner
  const overlapX = Math.max(
    0,
    Math.min(aRight, bRight) - Math.max(segmentA.position.x, segmentB.position.x)
  );
  const overlapY = Math.max(
    0,
    Math.min(aBottom, bBottom) - Math.max(segmentA.position.y, segmentB.position.y)
  );

  let startPoint: Point, endPoint: Point;

  if (overlapX > overlapY) {
    // Horizontal joint
    const x1 = Math.max(segmentA.position.x, segmentB.position.x);
    const x2 = Math.min(aRight, bRight);
    const y = segmentA.position.y > segmentB.position.y ? segmentA.position.y : aBottom;
    startPoint = { x: x1, y };
    endPoint = { x: x2, y };
  } else {
    // Vertical joint
    const y1 = Math.max(segmentA.position.y, segmentB.position.y);
    const y2 = Math.min(aBottom, bBottom);
    const x = segmentA.position.x > segmentB.position.x ? segmentA.position.x : aRight;
    startPoint = { x, y: y1 };
    endPoint = { x, y: y2 };
  }

  const midPoint = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  };

  return { startPoint, endPoint, midPoint };
}

/**
 * Format dimension for display
 */
export function formatDimension(mm: number): string {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)} m`;
  }
  return `${Math.round(mm)} mm`;
}

/**
 * Get edge label display name
 */
export function getEdgeLabel(edge: "a" | "b" | "c" | "d"): string {
  return edge.toUpperCase();
}

/**
 * Get color for gap mode
 */
export function getGapModeColor(mode: "BRIDGE" | "SPLIT"): string {
  return mode === "BRIDGE" ? "hsl(var(--warning))" : "hsl(var(--destructive))";
}

/**
 * Get color for CNC operation type
 */
export function getCncOperationColor(type: string): string {
  switch (type) {
    case "RECTANGULAR_CUTOUT":
      return "hsl(var(--primary))";
    case "CIRCULAR_HOLE":
      return "hsl(var(--accent))";
    case "EDGE_NOTCH":
      return "hsl(var(--secondary))";
    default:
      return "hsl(var(--muted))";
  }
}
