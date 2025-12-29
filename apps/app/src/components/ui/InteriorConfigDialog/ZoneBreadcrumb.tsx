"use client";

/**
 * Zone Breadcrumb Component
 *
 * Enhanced breadcrumb navigation with:
 * - Visual context (zone type icons and colors)
 * - Hover miniatures showing zone contents
 * - Smooth navigation animations
 */

import { Button, cn } from "@meble/ui";
import type { InteriorZone, ZoneContentType } from "@/types";
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Box,
  Layers,
  Package,
  Grid,
  Rows,
  Columns,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@meble/ui";

// ============================================================================
// Types & Constants
// ============================================================================

const ZONE_TYPE_ICONS: Record<ZoneContentType, typeof Box> = {
  EMPTY: Box,
  SHELVES: Layers,
  DRAWERS: Package,
  NESTED: Grid,
};

const ZONE_TYPE_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "text-zone-empty",
  SHELVES: "text-zone-shelves",
  DRAWERS: "text-zone-drawers",
  NESTED: "text-zone-nested",
};

interface ZoneBreadcrumbProps {
  /** Full path from root to selected zone (zone IDs) */
  path: string[];
  /** Root zone (for looking up zones by ID) */
  rootZone: InteriorZone;
  /** Callback when navigating to a zone */
  onNavigate: (zoneId: string) => void;
  /** Callback to navigate home (first top-level zone) */
  onNavigateHome: () => void;
  /** Whether we're at a nested level (not top-level) */
  isNested: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function findZoneById(zone: InteriorZone, id: string): InteriorZone | null {
  if (zone.id === id) return zone;
  if (zone.children) {
    for (const child of zone.children) {
      const found = findZoneById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function getZoneLabel(
  zone: InteriorZone,
  parentZone: InteriorZone | null,
  childIndex: number
): string {
  if (zone.contentType === "NESTED") {
    return zone.divisionDirection === "VERTICAL" ? "Kolumny" : "Sekcje";
  }
  if (parentZone?.divisionDirection === "VERTICAL") {
    return `Kol. ${childIndex + 1}`;
  }
  return `Sek. ${childIndex + 1}`;
}

function getZoneSummary(zone: InteriorZone): string {
  switch (zone.contentType) {
    case "SHELVES":
      return zone.shelvesConfig ? `${zone.shelvesConfig.count} półek` : "Półki";
    case "DRAWERS":
      return zone.drawerConfig ? `${zone.drawerConfig.zones.length} stref` : "Szuflady";
    case "NESTED":
      return zone.children
        ? `${zone.children.length} ${zone.divisionDirection === "VERTICAL" ? "kol." : "sek."}`
        : "Podział";
    default:
      return "Pusta";
  }
}

// ============================================================================
// Zone Preview Miniature (for tooltip)
// ============================================================================

interface ZoneMiniatureProps {
  zone: InteriorZone;
}

function ZoneMiniature({ zone }: ZoneMiniatureProps) {
  const Icon = ZONE_TYPE_ICONS[zone.contentType];
  const colorClass = ZONE_TYPE_COLORS[zone.contentType];

  return (
    <div className="p-2 space-y-2 min-w-[120px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", colorClass)} />
        <span className="text-xs font-medium">
          {zone.contentType === "NESTED"
            ? zone.divisionDirection === "VERTICAL"
              ? "Podział na kolumny"
              : "Podział na sekcje"
            : zone.contentType === "SHELVES"
              ? "Półki"
              : zone.contentType === "DRAWERS"
                ? "Szuflady"
                : "Pusta"}
        </span>
      </div>

      {/* Content preview */}
      {zone.contentType === "NESTED" && zone.children && (
        <div
          className={cn(
            "flex gap-0.5 h-8 rounded overflow-hidden border",
            zone.divisionDirection === "VERTICAL" ? "flex-row" : "flex-col-reverse"
          )}
        >
          {zone.children.map((child, idx) => {
            const childColor = ZONE_TYPE_COLORS[child.contentType];
            return (
              <div
                key={child.id}
                className={cn(
                  "flex-1 flex items-center justify-center text-[8px]",
                  idx > 0 && (zone.divisionDirection === "VERTICAL" ? "border-l" : "border-t"),
                  `bg-${child.contentType.toLowerCase()}/10`
                )}
                style={{
                  backgroundColor: `hsl(var(--zone-${child.contentType.toLowerCase()}) / 0.1)`,
                }}
              >
                <span className={childColor}>
                  {child.contentType === "SHELVES"
                    ? "═"
                    : child.contentType === "DRAWERS"
                      ? "☰"
                      : child.contentType === "NESTED"
                        ? "▤"
                        : "○"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {zone.contentType === "SHELVES" && zone.shelvesConfig && (
        <div className="h-8 border rounded flex flex-col justify-end p-0.5">
          {Array.from({ length: Math.min(zone.shelvesConfig.count, 4) }).map((_, i) => (
            <div
              key={i}
              className="h-0.5 bg-zone-shelves/60 rounded-full mb-1"
              style={{ width: zone.shelvesConfig!.depthPreset === "HALF" ? "50%" : "100%" }}
            />
          ))}
          {zone.shelvesConfig.count > 4 && (
            <span className="text-[8px] text-muted-foreground text-center">
              +{zone.shelvesConfig.count - 4} więcej
            </span>
          )}
        </div>
      )}

      {zone.contentType === "DRAWERS" && zone.drawerConfig && (
        <div className="h-8 border rounded flex flex-col-reverse gap-0.5 p-0.5">
          {zone.drawerConfig.zones.slice(0, 3).map((dz) => (
            <div
              key={dz.id}
              className={cn(
                "flex-1 rounded-sm border",
                dz.front ? "border-zone-drawers/60 bg-zone-drawers/10" : "border-dashed"
              )}
            />
          ))}
          {zone.drawerConfig.zones.length > 3 && (
            <span className="text-[8px] text-muted-foreground text-center">
              +{zone.drawerConfig.zones.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <p className="text-[10px] text-muted-foreground">{getZoneSummary(zone)}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ZoneBreadcrumb({
  path,
  rootZone,
  onNavigate,
  onNavigateHome,
  isNested,
}: ZoneBreadcrumbProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Home button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={!isNested ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={onNavigateHome}
            >
              <Home className="h-3 w-3" />
              <span className="hidden sm:inline">Szafka</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Wróć do widoku głównego</p>
          </TooltipContent>
        </Tooltip>

        {/* Path breadcrumbs */}
        {path.length > 2 &&
          path.slice(1).map((zoneId, idx) => {
            const zone = findZoneById(rootZone, zoneId);
            const parentId = idx > 0 ? path[idx] : rootZone.id;
            const parentZone = findZoneById(rootZone, parentId);
            const childIndex = parentZone?.children?.findIndex((c) => c.id === zoneId) ?? -1;
            const isLast = idx === path.length - 2;

            if (!zone) return null;

            const Icon = ZONE_TYPE_ICONS[zone.contentType];
            const colorClass = ZONE_TYPE_COLORS[zone.contentType];
            const label = getZoneLabel(zone, parentZone ?? null, childIndex);

            return (
              <div key={zoneId} className="flex items-center gap-1.5 animate-breadcrumb-slide">
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isLast ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("h-7 px-2 text-xs gap-1.5", isLast && "font-medium")}
                      onClick={() => onNavigate(zoneId)}
                    >
                      <Icon className={cn("h-3 w-3", colorClass)} />
                      <span>{label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-0">
                    <ZoneMiniature zone={zone} />
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}

        {/* Back button */}
        {isNested && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 ml-auto"
            onClick={() => {
              if (path.length > 2) {
                onNavigate(path[path.length - 2]);
              } else {
                onNavigateHome();
              }
            }}
          >
            <ArrowLeft className="h-3 w-3" />
            Wróć
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ZoneBreadcrumb;
