"use client";

/**
 * CornerMarker - Numbered circle marker for countertop corner
 */

import * as React from "react";
import type { CornerMarkerPosition } from "./types";
import { cn } from "@/lib/utils";

interface CornerMarkerProps {
  corner: CornerMarkerPosition;
  isSelected: boolean;
  onClick?: () => void;
  /** Radius of the marker circle */
  radius?: number;
}

export function CornerMarker({ corner, isSelected, onClick, radius = 12 }: CornerMarkerProps) {
  return (
    <g
      className="corner-marker"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Circle background */}
      <circle
        cx={corner.point.x}
        cy={corner.point.y}
        r={radius}
        className={cn(
          "transition-colors duration-150",
          isSelected
            ? "fill-primary stroke-primary-foreground stroke-2"
            : "fill-background stroke-border stroke-1 hover:fill-muted"
        )}
      />

      {/* Corner number */}
      <text
        x={corner.point.x}
        y={corner.point.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn(
          "text-[10px] font-bold pointer-events-none select-none",
          isSelected ? "fill-primary-foreground" : "fill-foreground"
        )}
      >
        {corner.position}
      </text>
    </g>
  );
}
