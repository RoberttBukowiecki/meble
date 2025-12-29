"use client";

/**
 * GapIndicator - Visual indicator for gaps between cabinets (BRIDGE/SPLIT)
 */

import * as React from "react";
import type { GapIndicatorPosition } from "./types";
import { cn } from "@/lib/utils";

interface GapIndicatorProps {
  gap: GapIndicatorPosition;
  isSelected: boolean;
  onClick?: () => void;
}

export function GapIndicator({ gap, isSelected, onClick }: GapIndicatorProps) {
  const { position, width, height } = gap;
  const isBridge = gap.gap.mode === "BRIDGE";

  // Colors based on mode
  const fillColor = isBridge ? "hsl(45 93% 47% / 0.2)" : "hsl(0 84% 60% / 0.2)";
  const strokeColor = isBridge ? "hsl(45 93% 47%)" : "hsl(0 84% 60%)";

  return (
    <g
      className="gap-indicator"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Gap area */}
      <rect
        x={position.x}
        y={position.y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="4 4"
        className={cn("transition-colors duration-150", isSelected && "stroke-2")}
      />

      {/* Gap distance label */}
      <text
        x={position.x + width / 2}
        y={position.y + height / 2 - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[9px] font-medium pointer-events-none select-none"
        fill={strokeColor}
      >
        {gap.gap.distance} mm
      </text>

      {/* Mode label */}
      <text
        x={position.x + width / 2}
        y={position.y + height / 2 + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[8px] pointer-events-none select-none"
        fill={strokeColor}
      >
        {isBridge ? "MOSTEK" : "PODZIAŁ"}
      </text>

      {/* Mode icon */}
      {isBridge ? (
        // Bridge icon (horizontal line connecting)
        <g transform={`translate(${position.x + width / 2}, ${position.y + height / 2 + 22})`}>
          <line x1={-8} y1={0} x2={8} y2={0} stroke={strokeColor} strokeWidth={2} />
          <circle cx={-8} cy={0} r={2} fill={strokeColor} />
          <circle cx={8} cy={0} r={2} fill={strokeColor} />
        </g>
      ) : (
        // Split icon (vertical line separating)
        <g transform={`translate(${position.x + width / 2}, ${position.y + height / 2 + 22})`}>
          <line x1={0} y1={-6} x2={0} y2={6} stroke={strokeColor} strokeWidth={2} />
          <line x1={-6} y1={-3} x2={-2} y2={0} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={-6} y1={3} x2={-2} y2={0} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={6} y1={-3} x2={2} y2={0} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={6} y1={3} x2={2} y2={0} stroke={strokeColor} strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}
