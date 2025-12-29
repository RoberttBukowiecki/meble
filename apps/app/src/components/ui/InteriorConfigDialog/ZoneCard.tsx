"use client";

/**
 * Zone Card Component
 *
 * Compact card representation of a zone with:
 * - Color-coded left border by zone type
 * - Content summary (type, count, material)
 * - Expandable details
 * - Visual proportion indicator
 */

import { Button, cn } from "@meble/ui";
import type { InteriorZone, ZoneContentType } from "@/types";
import {
  Box,
  Layers,
  Package,
  Grid,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Trash2,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@meble/ui";

// ============================================================================
// Types & Constants
// ============================================================================

const ZONE_TYPE_CONFIG: Record<
  ZoneContentType,
  {
    icon: typeof Box;
    label: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  EMPTY: {
    icon: Box,
    label: "Pusta",
    borderClass: "border-l-zone-empty",
    bgClass: "bg-zone-empty/5",
    textClass: "text-zone-empty",
  },
  SHELVES: {
    icon: Layers,
    label: "Półki",
    borderClass: "border-l-zone-shelves",
    bgClass: "bg-zone-shelves/5",
    textClass: "text-zone-shelves",
  },
  DRAWERS: {
    icon: Package,
    label: "Szuflady",
    borderClass: "border-l-zone-drawers",
    bgClass: "bg-zone-drawers/5",
    textClass: "text-zone-drawers",
  },
  NESTED: {
    icon: Grid,
    label: "Podział",
    borderClass: "border-l-zone-nested",
    bgClass: "bg-zone-nested/5",
    textClass: "text-zone-nested",
  },
};

interface ZoneCardProps {
  zone: InteriorZone;
  /** Index in parent (for display) */
  index: number;
  /** Total sibling count */
  siblingCount: number;
  /** Whether this card is selected */
  isSelected: boolean;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback to enter nested zone (drill-down) */
  onEnter?: () => void;
  /** Callback to move zone up/down */
  onMove?: (direction: "up" | "down") => void;
  /** Callback to delete zone */
  onDelete?: () => void;
  /** Callback to duplicate zone */
  onDuplicate?: () => void;
  /** Whether delete is allowed */
  canDelete?: boolean;
  /** Whether to show move controls */
  showMoveControls?: boolean;
  /** Parent division direction (for labels) */
  parentDirection?: "HORIZONTAL" | "VERTICAL";
  /** Calculated zone height/width in mm */
  sizeMm?: number;
  /** Zone proportion (0-1) */
  proportion?: number;
  /** Compact mode (less details) */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getZoneSummary(zone: InteriorZone): string {
  switch (zone.contentType) {
    case "SHELVES":
      if (zone.shelvesConfig) {
        const count = zone.shelvesConfig.count;
        const depth =
          zone.shelvesConfig.depthPreset === "FULL"
            ? "pełna"
            : zone.shelvesConfig.depthPreset === "HALF"
              ? "połowa"
              : "własna";
        return `${count} szt • ${depth} gł.`;
      }
      return "Brak konfiguracji";
    case "DRAWERS":
      if (zone.drawerConfig) {
        const fronts = zone.drawerConfig.zones.filter((z) => z.front !== null).length;
        const boxes = zone.drawerConfig.zones.reduce((sum, z) => sum + z.boxes.length, 0);
        return `${fronts} frontów • ${boxes} szuflad`;
      }
      return "Brak konfiguracji";
    case "NESTED":
      if (zone.children) {
        const dir = zone.divisionDirection === "VERTICAL" ? "kolumn" : "sekcji";
        return `${zone.children.length} ${dir}`;
      }
      return "Brak sekcji";
    default:
      return "Wolna przestrzeń";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function ZoneCard({
  zone,
  index,
  siblingCount,
  isSelected,
  onClick,
  onEnter,
  onMove,
  onDelete,
  onDuplicate,
  canDelete = true,
  showMoveControls = true,
  parentDirection = "HORIZONTAL",
  sizeMm,
  proportion,
  compact = false,
}: ZoneCardProps) {
  const config = ZONE_TYPE_CONFIG[zone.contentType];
  const Icon = config.icon;
  const summary = getZoneSummary(zone);
  const label = parentDirection === "VERTICAL" ? `Kolumna ${index + 1}` : `Sekcja ${index + 1}`;

  const canMoveUp = index < siblingCount - 1;
  const canMoveDown = index > 0;

  return (
    <div
      className={cn(
        "group relative rounded-lg border-l-4 border cursor-pointer",
        "transition-all duration-200 ease-out",
        "animate-zone-enter", // Entry animation
        config.borderClass,
        isSelected
          ? "ring-2 ring-primary/30 border-primary bg-primary/5 animate-zone-select"
          : "border-border hover:border-primary/30 hover:bg-muted/30 hover:scale-[1.01]",
        compact ? "p-2" : "p-3"
      )}
      onClick={onClick}
    >
      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 rounded-md p-1.5",
            isSelected ? "bg-primary/10" : config.bgClass
          )}
        >
          <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : config.textClass)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{label}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                isSelected ? "bg-primary/20 text-primary" : config.bgClass + " " + config.textClass
              )}
            >
              {config.label}
            </span>
          </div>

          {!compact && <p className="text-xs text-muted-foreground mt-0.5 truncate">{summary}</p>}

          {/* Size indicator */}
          {sizeMm !== undefined && !compact && (
            <div className="flex items-center gap-2 mt-2">
              {proportion !== undefined && (
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isSelected ? "bg-primary" : "bg-zone-" + zone.contentType.toLowerCase()
                    )}
                    style={{ width: `${Math.min(proportion * 100, 100)}%` }}
                  />
                </div>
              )}
              <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {sizeMm}mm
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Move controls */}
          {showMoveControls && siblingCount > 1 && (
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove?.("up");
                }}
                disabled={!canMoveUp}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove?.("down");
                }}
                disabled={!canMoveDown}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Enter nested zone */}
          {zone.contentType === "NESTED" && zone.children && zone.children.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEnter?.();
              }}
              title="Wejdź do sekcji"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onDuplicate && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplikuj
                </DropdownMenuItem>
              )}
              {onDelete && canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
      )}
    </div>
  );
}

// ============================================================================
// Compact Zone Badge (for breadcrumbs and inline display)
// ============================================================================

interface ZoneBadgeProps {
  zone: InteriorZone;
  onClick?: () => void;
  isActive?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ZoneBadge({
  zone,
  onClick,
  isActive = false,
  showIcon = true,
  className,
}: ZoneBadgeProps) {
  const config = ZONE_TYPE_CONFIG[zone.contentType];
  const Icon = config.icon;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      disabled={!onClick}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </button>
  );
}

export default ZoneCard;
