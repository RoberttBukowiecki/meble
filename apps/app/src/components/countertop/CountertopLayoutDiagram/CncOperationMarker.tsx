"use client";

/**
 * CncOperationMarker - Visual marker for CNC operations (cutouts, holes)
 */

import * as React from "react";
import type { CncMarkerPosition } from "./types";
import { cn } from "@/lib/utils";
import { getCncOperationColor } from "./utils";

interface CncOperationMarkerProps {
  marker: CncMarkerPosition;
  isSelected: boolean;
  onClick?: () => void;
}

export function CncOperationMarker({ marker, isSelected, onClick }: CncOperationMarkerProps) {
  const { operation, center, width, height, diameter } = marker;
  const isCircular = operation.type === "CIRCULAR_HOLE" && diameter;
  const strokeColor = getCncOperationColor(operation.type);

  if (isCircular) {
    // Circular hole
    const r = diameter! / 2;
    return (
      <g
        className="cnc-operation-marker"
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <circle
          cx={center.x}
          cy={center.y}
          r={r}
          className={cn(
            "transition-colors duration-150",
            isSelected ? "fill-primary/30 stroke-primary stroke-2" : "fill-none stroke-2"
          )}
          style={{ stroke: isSelected ? undefined : strokeColor }}
          strokeDasharray="4 2"
        />

        {/* Center crosshair */}
        <line
          x1={center.x - 5}
          y1={center.y}
          x2={center.x + 5}
          y2={center.y}
          className="stroke-muted-foreground stroke-1"
        />
        <line
          x1={center.x}
          y1={center.y - 5}
          x2={center.x}
          y2={center.y + 5}
          className="stroke-muted-foreground stroke-1"
        />

        {/* Diameter label */}
        <text
          x={center.x}
          y={center.y + r + 12}
          textAnchor="middle"
          className="text-[8px] fill-muted-foreground pointer-events-none select-none"
        >
          Ø{diameter}
        </text>
      </g>
    );
  }

  // Rectangular cutout
  const w = width ?? 100;
  const h = height ?? 100;
  const x = center.x - w / 2;
  const y = center.y - h / 2;
  const cornerRadius = operation.dimensions.radius ?? 10;

  return (
    <g
      className="cnc-operation-marker"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={cornerRadius}
        ry={cornerRadius}
        className={cn(
          "transition-colors duration-150",
          isSelected ? "fill-primary/30 stroke-primary stroke-2" : "fill-muted/20 stroke-2"
        )}
        style={{ stroke: isSelected ? undefined : strokeColor }}
        strokeDasharray="6 3"
      />

      {/* Diagonal lines to indicate cutout */}
      <line
        x1={x + cornerRadius}
        y1={y + cornerRadius}
        x2={x + w - cornerRadius}
        y2={y + h - cornerRadius}
        className="stroke-muted-foreground/50 stroke-1"
        strokeDasharray="4 4"
      />
      <line
        x1={x + w - cornerRadius}
        y1={y + cornerRadius}
        x2={x + cornerRadius}
        y2={y + h - cornerRadius}
        className="stroke-muted-foreground/50 stroke-1"
        strokeDasharray="4 4"
      />

      {/* Label with preset or dimensions */}
      <text
        x={center.x}
        y={center.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[9px] fill-muted-foreground pointer-events-none select-none font-medium"
      >
        {operation.preset && operation.preset !== "CUSTOM" && operation.preset !== "NONE"
          ? getPresetLabel(operation.preset)
          : `${w}×${h}`}
      </text>
    </g>
  );
}

/**
 * Get display label for cutout preset
 */
function getPresetLabel(preset: string): string {
  const labels: Record<string, string> = {
    SINK_STANDARD: "ZLEW",
    SINK_SMALL: "ZLEW",
    SINK_ROUND: "ZLEW",
    COOKTOP_60: "PŁYTA",
    COOKTOP_80: "PŁYTA",
    FAUCET_HOLE: "BATERIA",
    SOAP_DISPENSER: "DOZOWNIK",
  };
  return labels[preset] ?? preset;
}
