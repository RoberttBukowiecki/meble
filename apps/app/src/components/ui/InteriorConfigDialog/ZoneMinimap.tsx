"use client";

/**
 * Zone Minimap Component
 *
 * Shows a miniature overview of the entire zone structure when
 * the user is navigating deep in the hierarchy (depth >= 2).
 * Highlights the currently selected zone.
 */

import { useMemo } from "react";
import { cn } from "@meble/ui";
import type { InteriorZone, ZoneContentType } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface ZoneMinimapProps {
  /** Root zone of the cabinet */
  rootZone: InteriorZone;
  /** Currently selected zone ID */
  selectedZoneId: string | null;
  /** Path to selected zone (for highlighting) */
  selectedPath: string[];
  /** Callback when clicking a zone in minimap */
  onSelectZone: (zoneId: string) => void;
  /** Whether to show the minimap */
  visible?: boolean;
  className?: string;
}

interface MiniZoneProps {
  zone: InteriorZone;
  selectedZoneId: string | null;
  selectedPath: string[];
  onSelectZone: (zoneId: string) => void;
  depth: number;
}

// ============================================================================
// Constants
// ============================================================================

const ZONE_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "bg-zone-empty/30",
  SHELVES: "bg-zone-shelves/40",
  DRAWERS: "bg-zone-drawers/40",
  NESTED: "bg-zone-nested/20",
};

const ZONE_SELECTED_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "bg-zone-empty",
  SHELVES: "bg-zone-shelves",
  DRAWERS: "bg-zone-drawers",
  NESTED: "bg-zone-nested",
};

// ============================================================================
// Mini Zone Block (Recursive)
// ============================================================================

function MiniZone({ zone, selectedZoneId, selectedPath, onSelectZone, depth }: MiniZoneProps) {
  const isSelected = zone.id === selectedZoneId;
  const isInPath = selectedPath.includes(zone.id);
  const hasChildren = zone.contentType === "NESTED" && zone.children && zone.children.length > 0;

  // Calculate flex direction based on division
  const flexDirection = zone.divisionDirection === "VERTICAL" ? "flex-row" : "flex-col-reverse";

  return (
    <div
      className={cn(
        "rounded-sm cursor-pointer transition-all duration-150",
        "border border-transparent",
        isSelected
          ? cn(ZONE_SELECTED_COLORS[zone.contentType], "ring-1 ring-primary ring-offset-1")
          : isInPath
            ? cn(ZONE_COLORS[zone.contentType], "border-primary/50")
            : cn(ZONE_COLORS[zone.contentType], "hover:border-primary/30"),
        depth === 0 ? "flex-1" : "flex-1 min-h-0 min-w-0"
      )}
      style={{
        flex: zone.heightConfig.mode === "RATIO" ? (zone.heightConfig.ratio ?? 1) : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      }}
      title={`${zone.contentType}${isSelected ? " (wybrana)" : ""}`}
    >
      {hasChildren ? (
        <div className={cn("flex gap-px p-0.5 h-full", flexDirection)}>
          {zone.children!.map((child) => (
            <MiniZone
              key={child.id}
              zone={child}
              selectedZoneId={selectedZoneId}
              selectedPath={selectedPath}
              onSelectZone={onSelectZone}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : (
        // Leaf zone indicator
        <div className="w-full h-full flex items-center justify-center">
          {zone.contentType === "SHELVES" && (
            <div className="w-2/3 space-y-px">
              <div className="h-px bg-current opacity-50" />
              <div className="h-px bg-current opacity-50" />
            </div>
          )}
          {zone.contentType === "DRAWERS" && (
            <div className="w-2/3 h-2/3 border border-current opacity-50 rounded-sm" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Minimap Component
// ============================================================================

export function ZoneMinimap({
  rootZone,
  selectedZoneId,
  selectedPath,
  onSelectZone,
  visible = true,
  className,
}: ZoneMinimapProps) {
  // Only show if path is deep enough (depth >= 2)
  const shouldShow = visible && selectedPath.length > 2;

  if (!shouldShow) return null;

  return (
    <div
      className={cn("border rounded-lg bg-muted/20 p-2 shadow-sm", "animate-zone-enter", className)}
    >
      {/* Header */}
      <div className="text-[9px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
        Minimapa
      </div>

      {/* Minimap container */}
      <div className="border rounded bg-background aspect-[4/3] min-h-[60px] max-h-[100px] flex flex-col-reverse gap-px p-1">
        {rootZone.children?.map((zone) => (
          <MiniZone
            key={zone.id}
            zone={zone}
            selectedZoneId={selectedZoneId}
            selectedPath={selectedPath}
            onSelectZone={onSelectZone}
            depth={0}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-zone-shelves/60" />
          <span className="text-[8px] text-muted-foreground">Półki</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-zone-drawers/60" />
          <span className="text-[8px] text-muted-foreground">Szuflady</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-zone-empty/40" />
          <span className="text-[8px] text-muted-foreground">Pusta</span>
        </div>
      </div>
    </div>
  );
}

export default ZoneMinimap;
