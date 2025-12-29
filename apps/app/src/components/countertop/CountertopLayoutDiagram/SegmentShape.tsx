"use client";

/**
 * SegmentShape - SVG polygon for a countertop segment
 */

import * as React from "react";
import type { CountertopSegment } from "@/types/countertop";
import type { SegmentLayout } from "./types";
import { cn } from "@/lib/utils";

interface SegmentShapeProps {
  segment: CountertopSegment;
  layout: SegmentLayout;
  isSelected: boolean;
  onClick?: () => void;
}

/**
 * Generate SVG path for segment with optional miter cuts
 */
function generateSegmentPath(layout: SegmentLayout): string {
  const { position, width, height, miterCorners } = layout;
  const x = position.x;
  const y = position.y;

  // Default corner positions
  const corners = {
    topLeft: { x, y },
    topRight: { x: x + width, y },
    bottomRight: { x: x + width, y: y + height },
    bottomLeft: { x, y: y + height },
  };

  // Miter cut size (proportional to segment size)
  const miterSize = Math.min(width, height) * 0.15;

  // Apply miter cuts
  const miterSet = new Set(miterCorners?.map((m) => m.corner) ?? []);

  // Build path
  const points: string[] = [];

  // Top-left corner
  if (miterSet.has("topLeft")) {
    points.push(`M ${x + miterSize} ${y}`);
  } else {
    points.push(`M ${x} ${y}`);
  }

  // Top-right corner
  if (miterSet.has("topRight")) {
    points.push(`L ${x + width - miterSize} ${y}`);
    points.push(`L ${x + width} ${y + miterSize}`);
  } else {
    points.push(`L ${x + width} ${y}`);
  }

  // Bottom-right corner
  if (miterSet.has("bottomRight")) {
    points.push(`L ${x + width} ${y + height - miterSize}`);
    points.push(`L ${x + width - miterSize} ${y + height}`);
  } else {
    points.push(`L ${x + width} ${y + height}`);
  }

  // Bottom-left corner
  if (miterSet.has("bottomLeft")) {
    points.push(`L ${x + miterSize} ${y + height}`);
    points.push(`L ${x} ${y + height - miterSize}`);
  } else {
    points.push(`L ${x} ${y + height}`);
  }

  // Close path back to top-left
  if (miterSet.has("topLeft")) {
    points.push(`L ${x} ${y + miterSize}`);
    points.push(`L ${x + miterSize} ${y}`);
  } else {
    points.push(`L ${x} ${y}`);
  }

  points.push("Z");

  return points.join(" ");
}

export function SegmentShape({ segment, layout, isSelected, onClick }: SegmentShapeProps) {
  const pathD = generateSegmentPath(layout);

  return (
    <g className="segment-shape" onClick={onClick}>
      {/* Main segment fill */}
      <path
        d={pathD}
        className={cn(
          "transition-colors duration-150",
          isSelected
            ? "fill-primary/20 stroke-primary stroke-2"
            : "fill-muted/30 stroke-border stroke-1 hover:fill-muted/50"
        )}
        style={{ cursor: onClick ? "pointer" : "default" }}
      />

      {/* Segment name label */}
      <text
        x={layout.position.x + layout.width / 2}
        y={layout.position.y + layout.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          "text-[14px] font-medium pointer-events-none select-none",
          isSelected ? "fill-primary" : "fill-foreground"
        )}
      >
        {segment.name}
      </text>

      {/* Dimension labels */}
      <text
        x={layout.position.x + layout.width / 2}
        y={layout.position.y + layout.height / 2 + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px] fill-muted-foreground pointer-events-none select-none"
      >
        {segment.length} × {segment.width} mm
      </text>
    </g>
  );
}
