'use client';

/**
 * Interior Preview Component
 *
 * Visual preview of cabinet interior with recursive zone rendering.
 * Single source of truth for zone visualization at any depth level.
 */

import { useMemo } from 'react';
import { Button, cn } from '@meble/ui';
import type { InteriorZone, ZoneContentType, ZoneDivisionDirection } from '@/types';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { DRAWER_SLIDE_PRESETS, DEFAULT_BODY_THICKNESS, INTERIOR_CONFIG } from '@/lib/config';
import { Drawer } from '@/lib/domain';

// ============================================================================
// Types
// ============================================================================

interface InteriorPreviewProps {
  zones: InteriorZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: 'up' | 'down') => void;
  cabinetHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
}

interface ZoneBlockProps {
  zone: InteriorZone;
  isSelected: boolean;
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  /** Available width for this zone in mm */
  availableWidth: number;
  /** Available height for this zone in mm */
  availableHeight: number;
  /** Calculated height/width of this zone in mm */
  sizeMm: number;
  /** Direction of parent layout */
  parentDirection: ZoneDivisionDirection;
  /** Depth level for styling */
  depth: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate zone sizes in mm based on their configurations
 */
function calculateZoneSizes(
  zones: InteriorZone[],
  totalSize: number,
  direction: ZoneDivisionDirection
): number[] {
  if (zones.length === 0) return [];

  const isVertical = direction === 'VERTICAL';

  // Calculate fixed sizes first
  let fixedTotal = 0;
  const fixedSizes: (number | null)[] = zones.map(zone => {
    if (isVertical) {
      // Width for vertical division
      if (zone.widthConfig?.mode === 'FIXED' && zone.widthConfig.fixedMm) {
        fixedTotal += zone.widthConfig.fixedMm;
        return zone.widthConfig.fixedMm;
      }
    } else {
      // Height for horizontal division
      if (zone.heightConfig.mode === 'EXACT' && zone.heightConfig.exactMm) {
        fixedTotal += zone.heightConfig.exactMm;
        return zone.heightConfig.exactMm;
      }
    }
    return null;
  });

  // Calculate total ratio for proportional zones
  const proportionalZones = zones.filter((_, i) => fixedSizes[i] === null);
  const totalRatio = proportionalZones.reduce((sum, zone) => {
    if (isVertical) {
      return sum + (zone.widthConfig?.ratio ?? 1);
    }
    return sum + (zone.heightConfig.ratio ?? 1);
  }, 0);

  // Distribute remaining space
  const remainingSize = Math.max(0, totalSize - fixedTotal);

  return zones.map((zone, i) => {
    if (fixedSizes[i] !== null) return fixedSizes[i]!;
    const ratio = isVertical
      ? (zone.widthConfig?.ratio ?? 1)
      : (zone.heightConfig.ratio ?? 1);
    return Math.round((ratio / totalRatio) * remainingSize);
  });
}

/**
 * Get content type styling
 */
function getContentStyle(contentType: ZoneContentType) {
  switch (contentType) {
    case 'SHELVES':
      return {
        bgClass: 'bg-blue-50/50 dark:bg-blue-950/20',
        borderClass: 'border-blue-300 dark:border-blue-700',
        textClass: 'text-blue-600 dark:text-blue-400',
        label: 'Półki',
      };
    case 'DRAWERS':
      return {
        bgClass: 'bg-amber-50/50 dark:bg-amber-950/20',
        borderClass: 'border-amber-300 dark:border-amber-700',
        textClass: 'text-amber-600 dark:text-amber-400',
        label: 'Szuflady',
      };
    case 'NESTED':
      return {
        bgClass: 'bg-purple-50/30 dark:bg-purple-950/20',
        borderClass: 'border-purple-300 dark:border-purple-700',
        textClass: 'text-purple-600 dark:text-purple-400',
        label: 'Podział',
      };
    default:
      return {
        bgClass: 'bg-muted/20',
        borderClass: 'border-muted-foreground/30 border-dashed',
        textClass: 'text-muted-foreground',
        label: 'Pusta',
      };
  }
}

// ============================================================================
// Zone Block Component (Recursive)
// ============================================================================

function ZoneBlock({
  zone,
  isSelected,
  selectedZoneId,
  onSelectZone,
  availableWidth,
  availableHeight,
  sizeMm,
  parentDirection,
  depth,
}: ZoneBlockProps) {
  const style = getContentStyle(zone.contentType);
  const isAnyChildSelected = zone.children?.some(c =>
    c.id === selectedZoneId ||
    c.children?.some(gc => gc.id === selectedZoneId)
  ) ?? false;

  // Calculate child sizes if NESTED
  const childSizes = useMemo(() => {
    if (zone.contentType !== 'NESTED' || !zone.children) return [];
    const isVertical = zone.divisionDirection === 'VERTICAL';
    const totalSize = isVertical ? availableWidth : availableHeight;
    return calculateZoneSizes(zone.children, totalSize, zone.divisionDirection ?? 'HORIZONTAL');
  }, [zone, availableWidth, availableHeight]);

  // Size label
  const sizeLabel = parentDirection === 'VERTICAL'
    ? `${sizeMm}mm`
    : `${sizeMm}mm`;

  return (
    <div
      className={cn(
        'relative rounded transition-all cursor-pointer overflow-hidden flex flex-col',
        'border',
        isSelected
          ? 'border-primary ring-2 ring-primary/30 z-10'
          : isAnyChildSelected
            ? 'border-primary/50'
            : style.borderClass,
        !isSelected && !isAnyChildSelected && 'hover:border-primary/40',
        zone.contentType === 'EMPTY' && !isSelected && 'border-dashed',
        depth === 0 ? style.bgClass : 'bg-background/80'
      )}
      style={{
        flex: parentDirection === 'VERTICAL'
          ? (zone.widthConfig?.ratio ?? 1)
          : (zone.heightConfig.ratio ?? 1)
      }}
      data-testid={`zone-${zone.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      }}
    >
      {/* Content visualization - SHELVES */}
      {zone.contentType === 'SHELVES' && zone.shelvesConfig && zone.shelvesConfig.count > 0 && (
        <div className="absolute inset-1 pointer-events-none">
          {/* Shelves positioned from bottom: first at 0%, others distributed proportionally */}
          {Array.from({ length: zone.shelvesConfig.count }).map((_, i) => {
            // First shelf at bottom (0%), others distributed in remaining space
            // For n shelves: positions are 0%, 1/(n), 2/(n), ... (n-1)/(n) from bottom
            const positionPercent = zone.shelvesConfig!.count === 1
              ? 0
              : (i / zone.shelvesConfig!.count) * 100;
            const shelfConfig = zone.shelvesConfig!.shelves?.[i];
            const depthPreset = shelfConfig?.depthPreset ?? zone.shelvesConfig!.depthPreset;
            return (
              <div
                key={i}
                className={cn(
                  'absolute left-0 h-0.5 bg-blue-400/80 rounded-full',
                  depthPreset === 'HALF' ? 'w-1/2' : 'w-full'
                )}
                style={{ bottom: `${positionPercent}%` }}
              />
            );
          })}
        </div>
      )}

      {/* Content visualization - DRAWERS with full details */}
      {zone.contentType === 'DRAWERS' && zone.drawerConfig && (
        <div className="absolute inset-1 pointer-events-none flex flex-col-reverse gap-px">
          {zone.drawerConfig.zones.map((drawerZone) => {
            const hasFront = drawerZone.front !== null;
            const boxCount = drawerZone.boxes.length;
            const boxToFrontRatio = drawerZone.boxToFrontRatio ?? 1;
            const hasReducedBox = hasFront && boxToFrontRatio < 1;
            const shelvesAbove = drawerZone.aboveBoxContent?.shelves ?? [];

            return (
              <div
                key={drawerZone.id}
                className={cn(
                  'rounded-sm border relative overflow-hidden',
                  hasFront
                    ? 'border-amber-400/80 bg-amber-50/30 dark:bg-amber-900/20'
                    : 'border-dashed border-muted-foreground/40 bg-muted/20'
                )}
                style={{ flex: drawerZone.heightRatio }}
              >
                {/* Drawer box area - positioned at bottom */}
                <div
                  className="absolute left-0.5 right-0.5 bottom-0.5 flex flex-col-reverse"
                  style={{ height: `${boxToFrontRatio * 100 - 10}%` }}
                >
                  {/* Individual boxes (drawers in drawer) */}
                  {drawerZone.boxes.map((box, boxIdx) => (
                    <div
                      key={boxIdx}
                      className={cn(
                        'flex-1 border-t first:border-t-0',
                        hasFront
                          ? 'border-amber-300/60'
                          : 'border-muted-foreground/30 border-dashed'
                      )}
                    />
                  ))}
                </div>

                {/* Shelves above drawer box */}
                {hasReducedBox && shelvesAbove.length > 0 && (
                  <div
                    className="absolute left-0.5 right-0.5"
                    style={{
                      bottom: `${boxToFrontRatio * 100}%`,
                      height: `${(1 - boxToFrontRatio) * 100 - 5}%`
                    }}
                  >
                    {shelvesAbove.map((shelf, shelfIdx) => {
                      const shelfPosPercent = shelfIdx === 0
                        ? 0
                        : (shelfIdx / shelvesAbove.length) * 100;
                      return (
                        <div
                          key={shelf.id}
                          className={cn(
                            'absolute left-0 h-px bg-blue-400/80',
                            shelf.depthPreset === 'HALF' ? 'w-1/2' : 'w-full'
                          )}
                          style={{ bottom: `${shelfPosPercent}%` }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Zone label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn(
                    'text-[6px] font-medium px-0.5 bg-background/60 rounded',
                    hasFront ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
                  )}>
                    {hasFront ? 'F' : 'W'}
                    {boxCount > 1 && <span className="text-[5px]">×{boxCount}</span>}
                    {shelvesAbove.length > 0 && <span className="text-blue-500 text-[5px]">+{shelvesAbove.length}p</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nested children - recursive rendering with partitions */}
      {zone.contentType === 'NESTED' && zone.children && zone.children.length > 0 && (
        <div className={cn(
          'absolute inset-1 flex',
          zone.divisionDirection === 'VERTICAL' ? 'flex-row' : 'flex-col-reverse'
        )}>
          {zone.children.map((child, idx) => {
            const childSize = childSizes[idx] ?? 0;
            const isVertical = zone.divisionDirection === 'VERTICAL';
            const partition = zone.partitions?.[idx];
            const hasPartitionAfter = partition?.enabled && idx < zone.children!.length - 1;

            return (
              <div
                key={child.id}
                className={cn(
                  'flex',
                  isVertical ? 'flex-row' : 'flex-col-reverse'
                )}
                style={{
                  flex: isVertical
                    ? (child.widthConfig?.ratio ?? 1)
                    : (child.heightConfig.ratio ?? 1)
                }}
              >
                <ZoneBlock
                  zone={child}
                  isSelected={child.id === selectedZoneId}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={onSelectZone}
                  availableWidth={isVertical ? childSize : availableWidth}
                  availableHeight={isVertical ? availableHeight : childSize}
                  sizeMm={childSize}
                  parentDirection={zone.divisionDirection ?? 'HORIZONTAL'}
                  depth={depth + 1}
                />
                {/* Partition indicator */}
                {hasPartitionAfter && (
                  <div
                    className={cn(
                      'flex-shrink-0 bg-muted-foreground/60 rounded-full',
                      isVertical ? 'w-0.5 mx-px' : 'h-0.5 my-px'
                    )}
                    title={`Przegroda ${idx + 1}`}
                  />
                )}
                {/* Gap when no partition */}
                {!hasPartitionAfter && idx < zone.children!.length - 1 && (
                  <div className={cn(
                    'flex-shrink-0',
                    isVertical ? 'w-0.5' : 'h-0.5'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zone label - only show if no nested children or for empty/leaf zones */}
      {(zone.contentType !== 'NESTED' || !zone.children?.length) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            'text-center px-1 py-0.5 rounded bg-background/70',
            isSelected && 'bg-primary/10'
          )}>
            <div className={cn('text-[9px] font-medium', style.textClass)}>
              {style.label}
            </div>
            {zone.contentType === 'SHELVES' && zone.shelvesConfig && (
              <div className="text-[8px] text-muted-foreground">
                {zone.shelvesConfig.count}×
              </div>
            )}
            {zone.contentType === 'DRAWERS' && zone.drawerConfig && (
              <div className="text-[8px] text-muted-foreground">
                {Drawer.getFrontCount(zone.drawerConfig)}F/{Drawer.getTotalBoxCount(zone.drawerConfig)}B
              </div>
            )}
          </div>
        </div>
      )}

      {/* Size indicator */}
      {depth > 0 && (
        <div className={cn(
          'absolute text-[7px] font-mono bg-background/90 px-0.5 rounded shadow-sm',
          parentDirection === 'VERTICAL'
            ? 'bottom-0.5 left-1/2 -translate-x-1/2'
            : 'right-0.5 top-1/2 -translate-y-1/2 [writing-mode:vertical-lr] rotate-180'
        )}>
          <span className={cn(
            isSelected ? 'text-primary font-semibold' : 'text-muted-foreground'
          )}>
            {sizeLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InteriorPreview({
  zones,
  selectedZoneId,
  onSelectZone,
  onMoveZone,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
}: InteriorPreviewProps) {
  const interiorHeight = Math.max(cabinetHeight - DEFAULT_BODY_THICKNESS * 2, 0);
  const interiorWidth = Math.max(cabinetWidth - DEFAULT_BODY_THICKNESS * 2, 0);

  // Calculate zone heights
  const zoneHeights = useMemo(() =>
    calculateZoneSizes(zones, interiorHeight, 'HORIZONTAL'),
    [zones, interiorHeight]
  );

  // Reverse for display (first zone at bottom)
  const displayZones = useMemo(() => [...zones].reverse(), [zones]);
  const displayHeights = useMemo(() => [...zoneHeights].reverse(), [zoneHeights]);

  // Aspect ratio for proper proportions
  const aspectRatio = cabinetWidth / cabinetHeight;

  // Calculate visualization size - 70% of viewport height, maintaining aspect ratio
  // Base height is 50vh (will scale with screen), width calculated from aspect ratio
  const maxVizHeight = 'min(50vh, 500px)';
  const vizHeightStyle = aspectRatio < 1 ? maxVizHeight : `calc(${maxVizHeight} * ${1 / aspectRatio})`;
  const vizWidthStyle = aspectRatio >= 1 ? `calc(${maxVizHeight} * ${aspectRatio})` : maxVizHeight;

  return (
    <div className="border rounded-lg bg-muted/10 p-3 flex flex-col h-full" data-testid="interior-preview">
      {/* Header with cabinet dimensions */}
      <div className="flex items-center justify-center gap-2 mb-2 pb-2 border-b border-dashed">
        <span className="text-[10px] text-muted-foreground">Szer:</span>
        <span className="text-xs font-mono font-semibold">{cabinetWidth}mm</span>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-[10px] text-muted-foreground">Wys:</span>
        <span className="text-xs font-mono font-semibold">{cabinetHeight}mm</span>
      </div>

      {/* Main visualization - takes remaining space */}
      <div className="flex-1 flex justify-center items-center gap-3 py-2 min-h-0">
        {/* Cabinet body */}
        <div
          className="border-4 border-muted-foreground/40 rounded-md bg-background p-1 flex flex-col-reverse gap-0.5 shadow-inner"
          style={{
            width: vizWidthStyle,
            height: vizHeightStyle,
            minHeight: 280,
            maxWidth: '100%',
            aspectRatio: `${cabinetWidth} / ${cabinetHeight}`,
          }}
        >
          {displayZones.map((zone, displayIndex) => {
            const heightMm = displayHeights[displayIndex];
            const heightRatio = zone.heightConfig.mode === 'RATIO'
              ? (zone.heightConfig.ratio ?? 1)
              : 1;

            return (
              <ZoneBlock
                key={zone.id}
                zone={zone}
                isSelected={zone.id === selectedZoneId}
                selectedZoneId={selectedZoneId}
                onSelectZone={onSelectZone}
                availableWidth={interiorWidth}
                availableHeight={heightMm}
                sizeMm={heightMm}
                parentDirection="HORIZONTAL"
                depth={0}
              />
            );
          })}
        </div>

        {/* Dimension scale */}
        <div className="flex flex-col-reverse gap-0.5" style={{ height: vizHeightStyle, minHeight: 280 }}>
          {displayZones.map((zone, displayIndex) => {
            const originalIndex = zones.length - 1 - displayIndex;
            const isSelected = zone.id === selectedZoneId;
            const heightMm = displayHeights[displayIndex];
            const heightRatio = zone.heightConfig.mode === 'RATIO'
              ? (zone.heightConfig.ratio ?? 1)
              : 1;

            return (
              <div
                key={zone.id}
                className="flex items-center gap-1"
                style={{ flex: heightRatio }}
              >
                {/* Bracket */}
                <div className="w-2 h-full flex flex-col">
                  <div className="w-full h-px bg-muted-foreground/50" />
                  <div className="flex-1 border-l border-muted-foreground/50 ml-0" />
                  <div className="w-full h-px bg-muted-foreground/50" />
                </div>

                {/* Value and controls */}
                <div className="flex flex-col items-start gap-0.5">
                  <span className={cn(
                    'text-[10px] font-mono whitespace-nowrap',
                    isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                  )}>
                    {heightMm}mm
                  </span>

                  {/* Reorder buttons */}
                  {zones.length > 1 && (
                    <div className={cn(
                      'flex gap-0.5 transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}>
                      {originalIndex < zones.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveZone(zone.id, 'up');
                          }}
                          title="Przesuń wyżej"
                        >
                          <ChevronUp className="h-2.5 w-2.5" />
                        </Button>
                      )}
                      {originalIndex > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveZone(zone.id, 'down');
                          }}
                          title="Przesuń niżej"
                        >
                          <ChevronDown className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with interior dimensions */}
      <div className="text-center mt-2 pt-2 border-t border-dashed">
        <div className="text-[10px] text-muted-foreground">
          Wnętrze: {interiorWidth}×{interiorHeight}mm
        </div>
      </div>
    </div>
  );
}
