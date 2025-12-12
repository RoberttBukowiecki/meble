'use client';

import { useMemo } from 'react';
import { Button, cn } from '@meble/ui';
import { CabinetSection, SectionContentType } from '@/types';
import { ChevronUp, ChevronDown, Package, Layers, Box } from 'lucide-react';
import { DRAWER_SLIDE_PRESETS, getTotalBoxCount, getFrontCount } from '@/lib/config';

interface InteriorPreviewProps {
  sections: CabinetSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  cabinetHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
}

// Content type icons and labels
const CONTENT_TYPE_CONFIG: Record<
  SectionContentType,
  { icon: typeof Package; label: string; color: string }
> = {
  EMPTY: {
    icon: Box,
    label: 'Pusta',
    color: 'text-muted-foreground',
  },
  SHELVES: {
    icon: Layers,
    label: 'Półki',
    color: 'text-blue-600 dark:text-blue-400',
  },
  DRAWERS: {
    icon: Package,
    label: 'Szuflady',
    color: 'text-amber-600 dark:text-amber-400',
  },
};

const DEFAULT_BODY_THICKNESS = 18;

export function InteriorPreview({
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveSection,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
}: InteriorPreviewProps) {
  const totalRatio = sections.reduce((sum, s) => sum + s.heightRatio, 0);
  const interiorHeight = Math.max(cabinetHeight - DEFAULT_BODY_THICKNESS * 2, 0);

  // Calculate actual heights in mm for each section
  const sectionHeights = useMemo(() =>
    sections.map((section) =>
      Math.round((section.heightRatio / totalRatio) * interiorHeight)
    ),
    [sections, totalRatio, interiorHeight]
  );

  // Reverse sections for display (first section at bottom of visual)
  const displaySections = [...sections].reverse();
  const displayHeights = [...sectionHeights].reverse();

  return (
    <div className="border rounded-lg bg-muted/20 p-4 min-h-[400px] flex flex-col">
      {/* Cabinet width header */}
      <div className="text-center mb-3 pb-2 border-b border-dashed">
        <div className="text-xs text-muted-foreground">Szerokość szafki</div>
        <div className="text-sm font-mono font-semibold">{cabinetWidth} mm</div>
      </div>

      {/* Sections visualization - use fixed height container for proper flex proportions */}
      <div className="flex-1 min-h-[300px] flex flex-col gap-1 w-full max-w-[240px] mx-auto relative">
        {displaySections.map((section, displayIndex) => {
          // Get original index for correct operations
          const originalIndex = sections.length - 1 - displayIndex;
          const isSelected = section.id === selectedSectionId;
          const sectionHeightMm = displayHeights[displayIndex];
          const config = CONTENT_TYPE_CONFIG[section.contentType];
          const Icon = config.icon;

          // Calculate drawer width if this is a drawer section
          const drawerBoxWidth = section.drawerConfig
            ? cabinetWidth - 2 * DRAWER_SLIDE_PRESETS[section.drawerConfig.slideType].sideOffset - 2 * DEFAULT_BODY_THICKNESS
            : 0;

          return (
            <div
              key={section.id}
              className={cn(
                'relative rounded border-2 transition-all cursor-pointer overflow-hidden',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 z-10'
                  : 'border-border hover:border-primary/50 bg-background',
                section.contentType === 'EMPTY' && 'border-dashed'
              )}
              style={{ flex: section.heightRatio }}
              onClick={() => onSelectSection(section.id)}
            >
              {/* Section content visualization */}
              {section.contentType === 'SHELVES' && section.shelvesConfig && (
                <div className="absolute inset-2 pointer-events-none">
                  {/* Render shelf lines - first shelf at bottom, others distributed above */}
                  {Array.from({ length: section.shelvesConfig.count }).map((_, i) => {
                    // Position shelves: first at bottom (~5%), rest distributed evenly above
                    // For n shelves: positions at i/n (so first at 0%, but we add small offset)
                    const count = section.shelvesConfig!.count;
                    const bottomPercent = count === 1
                      ? 50 // Single shelf in the middle
                      : (i / count) * 95 + 5; // First at ~5%, rest distributed up to 100%
                    const isHalfDepth = section.shelvesConfig!.depthPreset === 'HALF';
                    return (
                      <div
                        key={i}
                        className={cn(
                          'absolute left-0 h-0.5 bg-blue-400/60',
                          isHalfDepth ? 'w-1/2' : 'w-full'
                        )}
                        style={{ bottom: `${bottomPercent}%` }}
                      />
                    );
                  })}
                </div>
              )}

              {section.contentType === 'DRAWERS' && section.drawerConfig && (
                <div className="absolute inset-2 pointer-events-none flex flex-col-reverse gap-0.5">
                  {/* Render drawer zones - first zone at bottom (flex-col-reverse) */}
                  {(() => {
                    const zones = section.drawerConfig.zones;
                    const zoneTotalRatio = zones.reduce((s, z) => s + z.heightRatio, 0);
                    const zoneHeights = zones.map(zone =>
                      Math.round((zone.heightRatio / zoneTotalRatio) * sectionHeightMm)
                    );

                    return zones.map((zone, zoneIdx) => {
                      const hasFront = zone.front !== null;
                      const boxCount = zone.boxes.length;
                      const zoneHeightMm = zoneHeights[zoneIdx];
                      const boxToFrontRatio = zone.boxToFrontRatio ?? 1.0;

                      return (
                        <div
                          key={zone.id}
                          className={cn(
                            'rounded-sm border relative overflow-hidden',
                            hasFront
                              ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20'
                              : 'border-dashed border-amber-300/40'
                          )}
                          style={{ flex: zone.heightRatio }}
                        >
                          {/* Drawer box visualization - positioned at bottom */}
                          {hasFront && (
                            <div
                              className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/40"
                              style={{
                                bottom: 0,
                                height: `${boxToFrontRatio * 100}%`,
                              }}
                            >
                              {/* Internal boxes visualization */}
                              {boxCount > 1 && (
                                <div className="absolute inset-0 flex flex-col-reverse">
                                  {zone.boxes.map((box, boxIdx) => {
                                    const boxTotalRatio = zone.boxes.reduce((s, b) => s + b.heightRatio, 0);
                                    const boxPercent = (box.heightRatio / boxTotalRatio) * 100;
                                    return (
                                      <div
                                        key={boxIdx}
                                        className={cn(
                                          "flex-shrink-0",
                                          boxIdx < boxCount - 1 && "border-t border-dashed border-amber-400/40"
                                        )}
                                        style={{ height: `${boxPercent}%` }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Shelves above drawer box visualization */}
                          {hasFront && boxToFrontRatio < 1.0 && zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
                            <>
                              {zone.aboveBoxContent.shelves.map((shelf, shelfIdx) => {
                                const shelfCount = zone.aboveBoxContent!.shelves.length;
                                // First shelf at box top, others distributed in remaining space
                                const boxTopPercent = boxToFrontRatio * 100;
                                const remainingPercent = 100 - boxTopPercent;
                                const shelfPositionPercent = shelfIdx === 0
                                  ? boxTopPercent
                                  : boxTopPercent + (shelfIdx / shelfCount) * remainingPercent;

                                return (
                                  <div
                                    key={shelf.id}
                                    className="absolute left-0 h-px bg-blue-400/80"
                                    style={{
                                      bottom: `${shelfPositionPercent}%`,
                                      width: shelf.depthPreset === 'HALF' ? '50%' : '100%',
                                    }}
                                  />
                                );
                              })}
                            </>
                          )}

                          {/* Zone label */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn(
                              'text-[9px] font-medium',
                              hasFront ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                            )}>
                              {hasFront ? 'F' : 'W'}
                              {boxCount > 1 && `×${boxCount}`}
                              {boxToFrontRatio < 1.0 && <span className="text-[8px] text-blue-500 ml-0.5">({Math.round(boxToFrontRatio * 100)}%)</span>}
                              {zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
                                <span className="text-[8px] text-blue-400 ml-0.5">+{zone.aboveBoxContent.shelves.length}p</span>
                              )}
                            </span>
                          </div>

                          {/* Zone height in mm */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 text-[9px] font-mono text-muted-foreground">
                            {zoneHeightMm}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Section label */}
              <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                <div className="text-center w-full overflow-hidden flex flex-col items-center gap-0.5">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <div className={cn('text-xs font-medium', config.color)}>
                    {config.label}
                  </div>
                  {section.contentType === 'SHELVES' && section.shelvesConfig && (
                    <div className="text-[10px] text-muted-foreground">
                      {section.shelvesConfig.count} szt.
                    </div>
                  )}
                  {section.contentType === 'DRAWERS' && section.drawerConfig && (
                    <div className="text-[10px] text-muted-foreground">
                      {getFrontCount(section.drawerConfig)}F / {getTotalBoxCount(section.drawerConfig)}B
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer width indicator (for drawer sections) */}
              {section.contentType === 'DRAWERS' && section.drawerConfig && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground bg-background/80 px-1 rounded">
                  szer. {Math.round(drawerBoxWidth)}mm
                </div>
              )}

              {/* Reorder buttons - use original index for movement */}
              {isSelected && sections.length > 1 && (
                <div className="absolute -right-9 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  {originalIndex < sections.length - 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, 'up');
                      }}
                      title="Przesuń wyżej"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  )}
                  {originalIndex > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, 'down');
                      }}
                      title="Przesuń niżej"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Height dimension label */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-foreground font-medium">{sectionHeightMm}</span>
                <span className="text-[10px] ml-0.5">mm</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info text */}
      <div className="text-center text-[10px] text-muted-foreground mt-2">
        Pierwsza sekcja na dole, kolejne układane do góry
      </div>

      {/* Cabinet total height footer */}
      <div className="text-center mt-2 pt-2 border-t border-dashed">
        <div className="text-xs text-muted-foreground">Wysokość szafki</div>
        <div className="text-sm font-mono font-semibold">{cabinetHeight} mm</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          (wnętrze: {interiorHeight} mm)
        </div>
      </div>
    </div>
  );
}
