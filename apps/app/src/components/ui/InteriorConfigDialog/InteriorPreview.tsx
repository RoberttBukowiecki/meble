'use client';

import { useMemo } from 'react';
import { Button, cn } from '@meble/ui';
import { CabinetSection, SectionContentType } from '@/types';
import { ChevronUp, ChevronDown, Package, Layers, Box } from 'lucide-react';
import { DRAWER_SLIDE_PRESETS, DEFAULT_BODY_THICKNESS } from '@/lib/config';
import { Section, Drawer } from '@/lib/domain';

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

// DEFAULT_BODY_THICKNESS imported from config

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
  const interiorHeight = Section.calculateInteriorHeight(cabinetHeight, DEFAULT_BODY_THICKNESS);

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

  // Calculate cumulative heights for dimension markers
  const cumulativeHeights = useMemo(() => {
    const heights: number[] = [];
    let cumulative = 0;
    for (const height of sectionHeights) {
      cumulative += height;
      heights.push(cumulative);
    }
    return heights;
  }, [sectionHeights]);

  return (
    <div className="border rounded-lg bg-muted/20 p-4 min-h-[400px] flex flex-col">
      {/* Cabinet width header */}
      <div className="text-center mb-3 pb-2 border-b border-dashed">
        <div className="text-xs text-muted-foreground">Szerokość szafki</div>
        <div className="text-sm font-mono font-semibold">{cabinetWidth} mm</div>
      </div>

      {/* Main visualization area with cabinet + dimensions */}
      <div className="flex-1 min-h-[300px] flex justify-center gap-2">
        {/* Cabinet body with sections inside */}
        <div className="flex flex-col gap-0.5 w-full max-w-[200px] border-4 border-muted-foreground/30 rounded bg-background p-1 relative">
          {displaySections.map((section, displayIndex) => {
            const originalIndex = sections.length - 1 - displayIndex;
            const isSelected = section.id === selectedSectionId;
            const sectionHeightMm = displayHeights[displayIndex];
            const config = CONTENT_TYPE_CONFIG[section.contentType];
            const Icon = config.icon;

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
                  <div className="absolute inset-1 pointer-events-none">
                    {Array.from({ length: section.shelvesConfig.count }).map((_, i) => {
                      const count = section.shelvesConfig!.count;
                      const bottomPercent = count === 1
                        ? 50
                        : (i / count) * 95 + 5;
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
                  <div className="absolute inset-1 pointer-events-none flex flex-col-reverse gap-0.5">
                    {section.drawerConfig.zones.map((zone) => {
                      const hasFront = zone.front !== null;
                      const boxCount = zone.boxes.length;
                      const boxToFrontRatio = zone.boxToFrontRatio ?? 1.0;

                      return (
                        <div
                          key={zone.id}
                          className={cn(
                            'rounded-sm border relative overflow-hidden',
                            hasFront
                              ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20'
                              : 'border-dashed border-muted-foreground/30 bg-muted/10'
                          )}
                          style={{ flex: zone.heightRatio }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn(
                              'text-[8px] font-medium',
                              hasFront ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                            )}>
                              {hasFront ? 'F' : 'W'}
                              {boxCount > 1 && `×${boxCount}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Section label */}
                <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none">
                  <div className="text-center w-full overflow-hidden flex flex-col items-center gap-0.5">
                    <Icon className={cn('h-3 w-3', config.color)} />
                    <div className={cn('text-[10px] font-medium', config.color)}>
                      {config.label}
                    </div>
                    {section.contentType === 'SHELVES' && section.shelvesConfig && (
                      <div className="text-[9px] text-muted-foreground">
                        {section.shelvesConfig.count} szt.
                      </div>
                    )}
                    {section.contentType === 'DRAWERS' && section.drawerConfig && (
                      <div className="text-[9px] text-muted-foreground">
                        {Drawer.getFrontCount(section.drawerConfig)}F/{Drawer.getTotalBoxCount(section.drawerConfig)}B
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawer width indicator (for drawer sections) */}
                {section.contentType === 'DRAWERS' && section.drawerConfig && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground bg-background/80 px-0.5 rounded">
                    {Math.round(drawerBoxWidth)}mm
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dimension scale on the right side of cabinet */}
        <div className="flex flex-col-reverse relative w-16">
          {displaySections.map((section, displayIndex) => {
            const originalIndex = sections.length - 1 - displayIndex;
            const isSelected = section.id === selectedSectionId;
            const sectionHeightMm = displayHeights[displayIndex];

            return (
              <div
                key={section.id}
                className="relative flex items-center"
                style={{ flex: section.heightRatio }}
              >
                {/* Dimension bracket */}
                <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col">
                  <div className="w-full h-px bg-muted-foreground/50" />
                  <div className="flex-1 border-l border-muted-foreground/50" />
                  <div className="w-full h-px bg-muted-foreground/50" />
                </div>

                {/* Dimension value */}
                <div className={cn(
                  "ml-3 text-[10px] font-mono whitespace-nowrap",
                  isSelected ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {sectionHeightMm}mm
                </div>

                {/* Reorder buttons */}
                {sections.length > 1 && (
                  <div className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-40 hover:opacity-100"
                  )}>
                    {originalIndex < sections.length - 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(section.id, 'up');
                        }}
                        title="Przesuń wyżej"
                      >
                        <ChevronUp className="h-2.5 w-2.5" />
                      </Button>
                    )}
                    {originalIndex > 0 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(section.id, 'down');
                        }}
                        title="Przesuń niżej"
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
