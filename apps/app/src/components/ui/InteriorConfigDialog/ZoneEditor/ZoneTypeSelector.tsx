"use client";

/**
 * Zone Type Selector Component
 *
 * Allows selecting content type for a zone (EMPTY, SHELVES, DRAWERS, NESTED)
 * with visual icons and color-coded buttons.
 */

import { Button, Label, cn } from "@meble/ui";
import type { ZoneContentType } from "@/types";
import { Box, Layers, Package, Grid } from "lucide-react";
import { INTERIOR_CONFIG } from "@/lib/config";

// Zone type color classes (matching CSS variables)
export const ZONE_TYPE_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "border-l-zone-empty",
  SHELVES: "border-l-zone-shelves",
  DRAWERS: "border-l-zone-drawers",
  NESTED: "border-l-zone-nested",
};

export const ZONE_TYPE_BG_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "bg-zone-empty/10",
  SHELVES: "bg-zone-shelves/10",
  DRAWERS: "bg-zone-drawers/10",
  NESTED: "bg-zone-nested/10",
};

export const ZONE_TYPE_TEXT_COLORS: Record<ZoneContentType, string> = {
  EMPTY: "text-zone-empty",
  SHELVES: "text-zone-shelves",
  DRAWERS: "text-zone-drawers",
  NESTED: "text-zone-nested",
};

// Content type options with icons
const CONTENT_TYPE_OPTIONS: {
  value: ZoneContentType;
  label: string;
  icon: typeof Box;
  description: string;
}[] = [
  {
    value: "EMPTY",
    label: "Pusta",
    icon: Box,
    description: "Wolna przestrzeń",
  },
  {
    value: "SHELVES",
    label: "Półki",
    icon: Layers,
    description: "Półki na różnych wysokościach",
  },
  {
    value: "DRAWERS",
    label: "Szuflady",
    icon: Package,
    description: "Szuflady z frontami",
  },
  {
    value: "NESTED",
    label: "Podział",
    icon: Grid,
    description: "Podziel na sekcje",
  },
];

interface ZoneTypeSelectorProps {
  value: ZoneContentType;
  onChange: (type: ZoneContentType) => void;
  /** Current zone depth - affects whether NESTED is available */
  depth: number;
  /** Optional className */
  className?: string;
}

export function ZoneTypeSelector({ value, onChange, depth, className }: ZoneTypeSelectorProps) {
  // Filter out NESTED option if we're at max depth
  const availableOptions =
    depth < INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1
      ? CONTENT_TYPE_OPTIONS
      : CONTENT_TYPE_OPTIONS.filter((o) => o.value !== "NESTED");

  const columns = availableOptions.length;

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Zawartość sekcji</Label>
      <div className={cn("grid gap-2", columns === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {availableOptions.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <Button
              key={option.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-auto py-3 flex flex-col gap-1.5 transition-all",
                isSelected && "ring-2 ring-primary/20",
                !isSelected && "hover:border-primary/50"
              )}
              onClick={() => onChange(option.value)}
              title={option.description}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary-foreground" : ZONE_TYPE_TEXT_COLORS[option.value]
                )}
              />
              <span className="text-xs font-medium">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default ZoneTypeSelector;
