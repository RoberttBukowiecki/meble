"use client";

/**
 * EdgeLabel - Label for countertop edge (A, B, C, D)
 */

import * as React from "react";
import type { EdgePosition } from "./types";
import { getEdgeLabel } from "./utils";

interface EdgeLabelProps {
  edge: EdgePosition;
  /** Offset from edge in SVG units */
  offset?: number;
}

export function EdgeLabel({ edge, offset = 20 }: EdgeLabelProps) {
  const x = edge.center.x + edge.normal.x * offset;
  const y = edge.center.y + edge.normal.y * offset;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="text-[12px] font-semibold fill-muted-foreground pointer-events-none select-none"
    >
      {getEdgeLabel(edge.edge)}
    </text>
  );
}
