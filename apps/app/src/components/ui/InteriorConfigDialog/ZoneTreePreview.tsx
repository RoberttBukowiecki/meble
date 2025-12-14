'use client';

/**
 * Zone Tree Preview Component
 *
 * Visual representation of the recursive zone tree for cabinet interior.
 * Displays zones with proper proportions based on cabinet dimensions.
 */

import { useMemo } from 'react';
import { cn } from '@meble/ui';
import type { InteriorZone, CabinetInteriorConfig } from '@/types';
import { Zone } from '@/lib/domain';
import { DEFAULT_BODY_THICKNESS } from '@/lib/config';
import { Layers, Box } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ZoneTreePreviewProps {
  config: CabinetInteriorConfig;
  cabinetWidth: number;
  cabinetHeight: number;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  className?: string;
}

interface ZoneRenderInfo {
  zone: InteriorZone;
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from bottom (0-100)
  width: number; // Percentage width (0-100)
  height: number; // Percentage height (0-100)
}

// ============================================================================
// Helper: Calculate Zone Render Positions
// ============================================================================

function calculateZoneRenderInfo(
  zone: InteriorZone,
  x: number,
  y: number,
  width: number,
  height: number,
  bodyThickness: number,
  cabinetDepth: number
): ZoneRenderInfo[] {
  const result: ZoneRenderInfo[] = [];

  // Only add leaf zones (zones with actual content or EMPTY)
  if (zone.contentType !== 'NESTED') {
    result.push({ zone, x, y, width, height });
    return result;
  }

  // For NESTED zones, recursively calculate children
  if (!zone.children || zone.children.length === 0) {
    result.push({ zone, x, y, width, height });
    return result;
  }

  const { children, divisionDirection } = zone;

  if (divisionDirection === 'HORIZONTAL') {
    // Horizontal division: children stack vertically (bottom to top)
    const heights = Zone.distributeHeights(children, height);
    let currentY = y;

    for (let i = 0; i < children.length; i++) {
      const childHeight = heights[i];
      const childZones = calculateZoneRenderInfo(
        children[i],
        x,
        currentY,
        width,
        childHeight,
        bodyThickness,
        cabinetDepth
      );
      result.push(...childZones);
      currentY += childHeight;
    }
  } else {
    // Vertical division: children side by side (left to right)
    const partitionWidthPercent = (bodyThickness / (width * 10)) * 100; // Rough partition width
    const widths = Zone.distributeWidths(children, width, partitionWidthPercent);
    let currentX = x;

    for (let i = 0; i < children.length; i++) {
      const childWidth = widths[i];
      const childZones = calculateZoneRenderInfo(
        children[i],
        currentX,
        y,
        childWidth,
        height,
        bodyThickness,
        cabinetDepth
      );
      result.push(...childZones);
      currentX += childWidth + (i < children.length - 1 ? partitionWidthPercent * 0.5 : 0);
    }
  }

  return result;
}

// ============================================================================
// Zone Content Label
// ============================================================================

function getZoneLabel(zone: InteriorZone): string {
  switch (zone.contentType) {
    case 'EMPTY':
      return 'Puste';
    case 'SHELVES':
      const shelfCount = zone.shelvesConfig?.count ?? 0;
      return shelfCount === 1 ? '1 półka' : `${shelfCount} półek`;
    case 'DRAWERS':
      const drawerCount = zone.drawerConfig?.zones.length ?? 0;
      return drawerCount === 1 ? '1 szuflada' : `${drawerCount} szuflad`;
    case 'NESTED':
      const childCount = zone.children?.length ?? 0;
      return `${childCount} strefy`;
    default:
      return '';
  }
}

function getZoneIcon(zone: InteriorZone) {
  switch (zone.contentType) {
    case 'SHELVES':
      return <Layers className="h-3 w-3" />;
    case 'DRAWERS':
      return <Box className="h-3 w-3" />;
    default:
      return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export function ZoneTreePreview({
  config,
  cabinetWidth,
  cabinetHeight,
  selectedZoneId,
  onSelectZone,
  className,
}: ZoneTreePreviewProps) {
  // Calculate aspect ratio from cabinet dimensions
  const aspectRatio = useMemo(() => {
    return cabinetWidth / cabinetHeight;
  }, [cabinetWidth, cabinetHeight]);

  // Calculate zone render positions
  const zones = useMemo(() => {
    if (!config.rootZone) return [];

    return calculateZoneRenderInfo(
      config.rootZone,
      0, // Start X at 0%
      0, // Start Y at 0%
      100, // Full width (100%)
      100, // Full height (100%)
      DEFAULT_BODY_THICKNESS,
      400 // Default depth for calculation
    );
  }, [config]);

  return (
    <div className={cn('relative', className)}>
      {/* Preview container with correct aspect ratio */}
      <div
        className="relative w-full border-4 border-muted rounded bg-muted/20 overflow-hidden"
        style={{
          aspectRatio,
          maxHeight: '400px',
        }}
      >
        {/* Render each zone */}
        {zones.map((info, index) => {
          const isSelected = info.zone.id === selectedZoneId;
          const isLeaf = info.zone.contentType !== 'NESTED';

          return (
            <div
              key={info.zone.id}
              className={cn(
                'absolute border transition-colors cursor-pointer',
                'flex flex-col items-center justify-center gap-0.5',
                'text-[10px] text-muted-foreground',
                isSelected
                  ? 'border-primary bg-primary/10 z-10'
                  : isLeaf
                    ? 'border-border bg-background hover:bg-accent/20'
                    : 'border-dashed border-border/50 bg-transparent'
              )}
              style={{
                left: `${info.x}%`,
                bottom: `${info.y}%`, // Use bottom for Y (cabinet coordinate system)
                width: `${info.width}%`,
                height: `${info.height}%`,
              }}
              onClick={() => onSelectZone(info.zone.id)}
            >
              {isLeaf && (
                <>
                  {getZoneIcon(info.zone)}
                  <span className="truncate max-w-full px-1">
                    {getZoneLabel(info.zone)}
                  </span>
                </>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Brak konfiguracji
          </div>
        )}
      </div>

      {/* Dimension labels */}
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{cabinetWidth} mm</span>
        <span>x</span>
        <span>{cabinetHeight} mm</span>
      </div>
    </div>
  );
}

export default ZoneTreePreview;
