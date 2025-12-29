"use client";

/**
 * CountertopLayoutDiagram - Interactive 2D SVG diagram of countertop layout
 *
 * Features:
 * - Schematic top-down view of all segments
 * - Edge labels (A, B, C, D)
 * - Corner markers (1-8)
 * - CNC operation visualization
 * - Gap indicators (BRIDGE/SPLIT)
 * - Joint visualization for L/U shapes
 */

import * as React from "react";
import { useMemo, useState, useCallback } from "react";
import type { CountertopLayoutDiagramProps, DiagramSelection } from "./types";
import { calculateDiagramLayout } from "./utils";
import { SegmentShape } from "./SegmentShape";
import { EdgeLabel } from "./EdgeLabel";
import { CornerMarker } from "./CornerMarker";
import { CncOperationMarker } from "./CncOperationMarker";
import { GapIndicator } from "./GapIndicator";
import { cn } from "@/lib/utils";

export function CountertopLayoutDiagram({
  group,
  width = 400,
  height = 300,
  selection: externalSelection,
  onSelect,
  showDimensions = true,
  showEdgeLabels = true,
  showCornerMarkers = true,
  interactive = true,
}: CountertopLayoutDiagramProps) {
  // Internal selection state if not controlled externally
  const [internalSelection, setInternalSelection] = useState<DiagramSelection>({
    type: null,
    id: null,
  });

  const selection = externalSelection ?? internalSelection;
  const setSelection = onSelect ?? setInternalSelection;

  // Calculate layout
  const layout = useMemo(
    () => calculateDiagramLayout(group, width, height),
    [group, width, height]
  );

  // Handle segment selection
  const handleSegmentClick = useCallback(
    (segmentId: string) => {
      if (!interactive) return;
      setSelection({
        type: "segment",
        id: selection.type === "segment" && selection.id === segmentId ? null : segmentId,
      });
    },
    [interactive, selection, setSelection]
  );

  // Handle corner selection
  const handleCornerClick = useCallback(
    (cornerId: string) => {
      if (!interactive) return;
      setSelection({
        type: "corner",
        id: selection.type === "corner" && selection.id === cornerId ? null : cornerId,
      });
    },
    [interactive, selection, setSelection]
  );

  // Handle CNC operation selection
  const handleCncClick = useCallback(
    (operationId: string) => {
      if (!interactive) return;
      setSelection({
        type: "cnc",
        id: selection.type === "cnc" && selection.id === operationId ? null : operationId,
      });
    },
    [interactive, selection, setSelection]
  );

  // Handle gap selection
  const handleGapClick = useCallback(
    (gapId: string) => {
      if (!interactive) return;
      setSelection({
        type: "gap",
        id: selection.type === "gap" && selection.id === gapId ? null : gapId,
      });
    },
    [interactive, selection, setSelection]
  );

  // Clear selection on background click
  const handleBackgroundClick = useCallback(() => {
    if (!interactive) return;
    setSelection({ type: null, id: null });
  }, [interactive, setSelection]);

  const { viewBox, segments, edges, corners, cncOperations, gaps, joints } = layout;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-background overflow-hidden",
        interactive && "cursor-default"
      )}
      style={{ width, height }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleBackgroundClick}
      >
        {/* Background grid (optional) */}
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect
          x={viewBox.minX}
          y={viewBox.minY}
          width={viewBox.width}
          height={viewBox.height}
          fill="url(#grid)"
        />

        {/* Segments */}
        <g className="segments">
          {segments.map((segmentLayout) => {
            const segment = group.segments.find((s) => s.id === segmentLayout.segmentId);
            if (!segment) return null;
            return (
              <SegmentShape
                key={segment.id}
                segment={segment}
                layout={segmentLayout}
                isSelected={selection.type === "segment" && selection.id === segment.id}
                onClick={interactive ? () => handleSegmentClick(segment.id) : undefined}
              />
            );
          })}
        </g>

        {/* Joint lines */}
        <g className="joints">
          {joints.map((joint, i) => (
            <g key={joint.joint.id}>
              {/* Joint line */}
              <line
                x1={joint.startPoint.x}
                y1={joint.startPoint.y}
                x2={joint.endPoint.x}
                y2={joint.endPoint.y}
                className="stroke-orange-500 stroke-2"
                strokeDasharray="8 4"
              />
              {/* Joint type label */}
              <text
                x={joint.midPoint.x}
                y={joint.midPoint.y - 10}
                textAnchor="middle"
                className="text-[8px] fill-orange-600 font-medium pointer-events-none select-none"
              >
                {getJointTypeLabel(joint.joint.type)}
              </text>
            </g>
          ))}
        </g>

        {/* CNC operations */}
        <g className="cnc-operations">
          {cncOperations.map((marker) => (
            <CncOperationMarker
              key={marker.operation.id}
              marker={marker}
              isSelected={selection.type === "cnc" && selection.id === marker.operation.id}
              onClick={interactive ? () => handleCncClick(marker.operation.id) : undefined}
            />
          ))}
        </g>

        {/* Edge labels */}
        {showEdgeLabels && (
          <g className="edge-labels">
            {/* Only show edges for the first segment in simple view */}
            {segments.length === 1 &&
              edges
                .slice(0, 4)
                .map((edge, i) => <EdgeLabel key={`${edge.edge}-${i}`} edge={edge} />)}
            {segments.length > 1 &&
              edges.map((edge, i) => (
                <EdgeLabel key={`${edge.edge}-${i}`} edge={edge} offset={15} />
              ))}
          </g>
        )}

        {/* Corner markers */}
        {showCornerMarkers && (
          <g className="corner-markers">
            {corners.map((corner) => (
              <CornerMarker
                key={`corner-${corner.position}`}
                corner={corner}
                isSelected={selection.type === "corner" && selection.id === String(corner.position)}
                onClick={interactive ? () => handleCornerClick(String(corner.position)) : undefined}
              />
            ))}
          </g>
        )}

        {/* Gap indicators */}
        <g className="gap-indicators">
          {gaps.map((gap) => (
            <GapIndicator
              key={gap.gap.id}
              gap={gap}
              isSelected={selection.type === "gap" && selection.id === gap.gap.id}
              onClick={interactive ? () => handleGapClick(gap.gap.id) : undefined}
            />
          ))}
        </g>
      </svg>

      {/* Layout type badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-muted/80 text-[10px] font-medium text-muted-foreground">
        {getLayoutTypeLabel(group.layoutType)}
      </div>

      {/* Segment count badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-muted/80 text-[10px] font-medium text-muted-foreground">
        {group.segments.length} {group.segments.length === 1 ? "segment" : "segmenty"}
      </div>
    </div>
  );
}

/**
 * Get display label for layout type
 */
function getLayoutTypeLabel(layoutType: string): string {
  const labels: Record<string, string> = {
    STRAIGHT: "Prosty",
    L_SHAPE: "Kształt L",
    U_SHAPE: "Kształt U",
    ISLAND: "Wyspa",
    PENINSULA: "Półwysep",
  };
  return labels[layoutType] ?? layoutType;
}

/**
 * Get display label for joint type
 */
function getJointTypeLabel(jointType: string): string {
  const labels: Record<string, string> = {
    MITER_45: "45°",
    BUTT: "Czołowe",
    EUROPEAN_MITER: "Europejskie",
    PUZZLE: "Puzzle",
  };
  return labels[jointType] ?? jointType;
}

export default CountertopLayoutDiagram;
