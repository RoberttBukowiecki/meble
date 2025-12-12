'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Label,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NumberInput,
  Switch,
  cn,
} from '@meble/ui';
import {
  CabinetSection,
  SectionContentType,
  DrawerConfiguration,
  DrawerZone,
  AboveBoxShelfConfig,
  DrawerSlideType,
  ShelfDepthPreset,
  ShelfConfig,
  DEFAULT_SHELVES_CONFIG,
  generateShelfId,
  generateAboveBoxShelfId,
} from '@/types';
import { DRAWER_SLIDE_PRESETS, DRAWER_ZONE_PRESETS, generateZoneId, getTotalBoxCount, getFrontCount } from '@/lib/config';
import { Trash2, Package, Layers, Box, Plus, Minus, ChevronUp, ChevronDown, LayoutTemplate } from 'lucide-react';

// ============================================================================
// Toggle Button Group Component
// ============================================================================

interface ToggleOption<T> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ToggleButtonGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  columns?: number;
  showIcons?: boolean;
}

function ToggleButtonGroup<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
  showIcons = false,
}: ToggleButtonGroupProps<T>) {
  return (
    <div className={cn('grid gap-2', `grid-cols-${columns}`)}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'h-auto py-2',
              showIcons && 'flex flex-col gap-1',
              isSelected && 'ring-2 ring-primary/20'
            )}
            onClick={() => onChange(option.value)}
          >
            {showIcons && Icon && <Icon className="h-4 w-4" />}
            <span className={cn(showIcons ? 'text-xs' : 'text-sm')}>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Drawer Zone Preview (Mini preview within section)
// Shows zones from BOTTOM to TOP (first zone = bottom)
// ============================================================================

interface DrawerZonesPreviewProps {
  zones: DrawerZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: 'up' | 'down') => void;
  sectionHeightMm: number;
  drawerBoxWidth: number;
}

function DrawerZonesPreview({
  zones,
  selectedZoneId,
  onSelectZone,
  onMoveZone,
  sectionHeightMm,
  drawerBoxWidth,
}: DrawerZonesPreviewProps) {
  const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);

  // Calculate zone heights in mm
  const zoneHeights = zones.map(zone =>
    Math.round((zone.heightRatio / totalRatio) * sectionHeightMm)
  );

  // Reverse zones for display (first zone at bottom of visual)
  const displayZones = [...zones].reverse();
  const displayHeights = [...zoneHeights].reverse();

  return (
    <div className="border rounded-lg bg-muted/20 p-3">
      {/* Drawer width header */}
      <div className="text-center mb-2 pb-2 border-b border-dashed">
        <div className="text-[10px] text-muted-foreground">Szerokość szuflad</div>
        <div className="text-xs font-mono font-semibold">{Math.round(drawerBoxWidth)} mm</div>
      </div>

      {/* Container with fixed height for proper proportions */}
      <div className="h-[180px] flex flex-col gap-0.5 w-full max-w-[160px] mx-auto relative">
        {displayZones.map((zone, displayIndex) => {
          // Get original index for correct operations
          const originalIndex = zones.length - 1 - displayIndex;
          const heightPercent = (zone.heightRatio / totalRatio) * 100;
          const isSelected = zone.id === selectedZoneId;
          const hasExternalFront = zone.front !== null;
          const boxCount = zone.boxes.length;
          const zoneHeightMm = displayHeights[displayIndex];
          const boxToFrontRatio = zone.boxToFrontRatio ?? 1.0;
          const hasReducedBox = boxToFrontRatio < 1.0;

          return (
            <div
              key={zone.id}
              className={cn(
                'relative rounded border-2 transition-all cursor-pointer overflow-hidden',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 z-10'
                  : 'border-border hover:border-primary/50 bg-background',
                !hasExternalFront && 'border-dashed opacity-80'
              )}
              style={{ flex: zone.heightRatio }}
              onClick={() => onSelectZone(zone.id)}
            >
              {/* Drawer box visualization */}
              {hasExternalFront && (
                <div
                  className="absolute left-1 right-1 border border-dashed border-muted-foreground/50 rounded-sm pointer-events-none bg-amber-50/20 dark:bg-amber-950/20"
                  style={{
                    bottom: '4px',
                    height: `calc(${boxToFrontRatio * 100}% - 8px)`,
                  }}
                >
                  {/* Show dividers for multiple boxes */}
                  {boxCount > 1 && (
                    <div className="absolute inset-0 flex flex-col">
                      {zone.boxes.map((box, boxIdx) => {
                        const boxTotalRatio = zone.boxes.reduce((s, b) => s + b.heightRatio, 0);
                        const boxPercent = (box.heightRatio / boxTotalRatio) * 100;
                        return (
                          <div
                            key={boxIdx}
                            className={cn(
                              "flex-shrink-0",
                              boxIdx < boxCount - 1 && "border-b border-dashed border-muted-foreground/40"
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
              {hasExternalFront && hasReducedBox && zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
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
                        className="absolute left-1 h-0.5 bg-blue-400/80 pointer-events-none"
                        style={{
                          bottom: `calc(${shelfPositionPercent}% - 4px)`,
                          width: shelf.depthPreset === 'HALF' ? '50%' : 'calc(100% - 8px)',
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* Zone label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-[10px] font-medium truncate px-1 flex items-center gap-0.5">
                  {hasExternalFront ? 'F' : 'W'}
                  {boxCount > 1 && <span className="text-muted-foreground">×{boxCount}</span>}
                  {hasReducedBox && <span className="text-blue-500 text-[8px]">({Math.round(boxToFrontRatio * 100)}%)</span>}
                  {zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
                    <span className="text-blue-400 text-[8px]">+{zone.aboveBoxContent.shelves.length}p</span>
                  )}
                </div>
              </div>

              {/* Height dimension */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {zoneHeightMm}
              </div>

              {/* Reorder buttons - use original index for movement */}
              {isSelected && (
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                  {originalIndex < zones.length - 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5 rounded-full"
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
                      variant="outline"
                      size="icon"
                      className="h-5 w-5 rounded-full"
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
          );
        })}
      </div>

      {/* Section height footer */}
      <div className="text-center mt-2 pt-2 border-t border-dashed">
        <div className="text-[10px] text-muted-foreground">Wysokość sekcji</div>
        <div className="text-xs font-mono font-semibold">{sectionHeightMm} mm</div>
      </div>
    </div>
  );
}

// ============================================================================
// Drawer Zone Editor
// ============================================================================

interface DrawerZoneEditorProps {
  zone: DrawerZone;
  onUpdate: (zone: DrawerZone) => void;
  onDelete: () => void;
  canDelete: boolean;
  zoneIndex: number;
  zoneHeightMm: number;
}

function DrawerZoneEditor({ zone, onUpdate, onDelete, canDelete, zoneIndex, zoneHeightMm }: DrawerZoneEditorProps) {
  const hasExternalFront = zone.front !== null;
  const boxCount = zone.boxes.length;
  const boxToFrontRatio = zone.boxToFrontRatio ?? 1.0;
  const boxHeightMm = Math.round(zoneHeightMm * boxToFrontRatio);

  const handleHeightRatioChange = (value: number[]) => {
    onUpdate({ ...zone, heightRatio: value[0] });
  };

  const handleFrontToggle = (checked: boolean) => {
    onUpdate({
      ...zone,
      front: checked ? {} : null,
    });
  };

  const handleBoxCountChange = (newCount: number) => {
    const boxes = Array.from({ length: newCount }, (_, i) =>
      zone.boxes[i] || { heightRatio: 1 }
    );
    onUpdate({ ...zone, boxes });
  };

  const handleBoxToFrontRatioChange = (value: number[]) => {
    const ratio = value[0] / 100;
    // When ratio goes back to 1.0, remove the shelves
    const updatedZone: DrawerZone = {
      ...zone,
      boxToFrontRatio: ratio === 1.0 ? undefined : ratio,
    };
    if (ratio === 1.0) {
      updatedZone.aboveBoxContent = undefined;
    }
    onUpdate(updatedZone);
  };

  // Shelves above box handlers
  const handleAddAboveBoxShelf = () => {
    const newShelf: AboveBoxShelfConfig = {
      id: generateAboveBoxShelfId(),
      depthPreset: 'HALF',
    };
    const currentShelves = zone.aboveBoxContent?.shelves ?? [];
    onUpdate({
      ...zone,
      aboveBoxContent: {
        shelves: [...currentShelves, newShelf],
      },
    });
  };

  const handleRemoveAboveBoxShelf = (shelfId: string) => {
    const currentShelves = zone.aboveBoxContent?.shelves ?? [];
    const newShelves = currentShelves.filter((s) => s.id !== shelfId);
    onUpdate({
      ...zone,
      aboveBoxContent: newShelves.length > 0 ? { shelves: newShelves } : undefined,
    });
  };

  const handleUpdateAboveBoxShelf = (shelfId: string, updates: Partial<AboveBoxShelfConfig>) => {
    const currentShelves = zone.aboveBoxContent?.shelves ?? [];
    const newShelves = currentShelves.map((s) =>
      s.id === shelfId ? { ...s, ...updates } : s
    );
    onUpdate({
      ...zone,
      aboveBoxContent: { shelves: newShelves },
    });
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h6 className="text-xs font-medium text-muted-foreground">
          Strefa {zoneIndex + 1} <span className="font-mono">({zoneHeightMm}mm)</span>
        </h6>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Height ratio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Wysokość frontu</Label>
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{zone.heightRatio}x</span>
        </div>
        <Slider
          value={[zone.heightRatio]}
          onValueChange={handleHeightRatioChange}
          min={1}
          max={4}
          step={1}
        />
      </div>

      {/* External front toggle */}
      <div className="flex items-center justify-between py-2 px-2 border rounded bg-muted/10">
        <div>
          <Label className="text-xs font-medium cursor-pointer" htmlFor={`front-${zone.id}`}>
            Front zewnętrzny
          </Label>
          <p className="text-[10px] text-muted-foreground">
            {hasExternalFront ? 'Widoczny' : 'Wewnętrzna'}
          </p>
        </div>
        <Switch
          id={`front-${zone.id}`}
          checked={hasExternalFront}
          onCheckedChange={handleFrontToggle}
        />
      </div>

      {/* Box to front ratio - only show for zones with front */}
      {hasExternalFront && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Wysokość szuflady vs frontu</Label>
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {Math.round(boxToFrontRatio * 100)}% ({boxHeightMm}mm)
            </span>
          </div>
          <Slider
            value={[Math.round(boxToFrontRatio * 100)]}
            onValueChange={handleBoxToFrontRatioChange}
            min={25}
            max={100}
            step={25}
          />
          <p className="text-[9px] text-muted-foreground">
            {boxToFrontRatio < 1.0
              ? `Front ${zoneHeightMm}mm, szuflada ${boxHeightMm}mm (na dole)`
              : 'Szuflada zajmuje pełną wysokość frontu'}
          </p>
        </div>
      )}

      {/* Shelves above drawer box - only show when boxToFrontRatio < 1.0 */}
      {hasExternalFront && boxToFrontRatio < 1.0 && (
        <div className="space-y-2 pt-2 border-t border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Półki nad szufladą</Label>
              <p className="text-[9px] text-muted-foreground">
                Wolna przestrzeń: {zoneHeightMm - boxHeightMm}mm
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={handleAddAboveBoxShelf}
              disabled={(zone.aboveBoxContent?.shelves.length ?? 0) >= 4}
            >
              <Plus className="h-3 w-3 mr-1" />
              Dodaj
            </Button>
          </div>

          {zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {zone.aboveBoxContent.shelves.map((shelf, shelfIdx) => {
                const shelfCount = zone.aboveBoxContent!.shelves.length;
                const spaceHeight = zoneHeightMm - boxHeightMm;
                // First shelf at box top, others distributed evenly
                const shelfPositionMm = shelfIdx === 0
                  ? boxHeightMm
                  : boxHeightMm + (shelfIdx / shelfCount) * spaceHeight;

                return (
                  <div
                    key={shelf.id}
                    className="flex items-center gap-2 p-1.5 border rounded bg-blue-50/50 dark:bg-blue-950/20"
                  >
                    <span className="text-[10px] font-medium w-14 text-blue-700 dark:text-blue-300">
                      Półka {shelfIdx + 1}
                    </span>
                    <Select
                      value={shelf.depthPreset}
                      onValueChange={(v) => handleUpdateAboveBoxShelf(shelf.id, {
                        depthPreset: v as ShelfDepthPreset,
                        customDepth: v === 'CUSTOM' ? shelf.customDepth ?? 150 : undefined,
                      })}
                    >
                      <SelectTrigger className="h-5 text-[10px] flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL" className="text-xs">Pełna</SelectItem>
                        <SelectItem value="HALF" className="text-xs">Połowa</SelectItem>
                        <SelectItem value="CUSTOM" className="text-xs">Własna</SelectItem>
                      </SelectContent>
                    </Select>
                    {shelf.depthPreset === 'CUSTOM' && (
                      <NumberInput
                        value={shelf.customDepth ?? 150}
                        onChange={(v) => handleUpdateAboveBoxShelf(shelf.id, { customDepth: v })}
                        min={50}
                        max={500}
                        allowNegative={false}
                        className="w-16 h-5 text-[10px]"
                      />
                    )}
                    <span className="text-[9px] text-muted-foreground w-12 text-right">
                      {Math.round(shelfPositionMm)}mm
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAboveBoxShelf(shelf.id)}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
            <p className="text-[8px] text-blue-600 dark:text-blue-400">
              Pierwsza półka bezpośrednio nad boxem, kolejne rozłożone równomiernie
            </p>
          )}
        </div>
      )}

      {/* Box count */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Szuflady w strefie</Label>
        <div className="flex items-center gap-0.5 border rounded">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none"
            onClick={() => handleBoxCountChange(Math.max(1, boxCount - 1))}
            disabled={boxCount <= 1}
          >
            <Minus className="h-2.5 w-2.5" />
          </Button>
          <span className="w-6 text-center text-xs font-medium">{boxCount}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none"
            onClick={() => handleBoxCountChange(Math.min(4, boxCount + 1))}
            disabled={boxCount >= 4}
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {boxCount > 1 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">
          {hasExternalFront
            ? `Jeden front zakrywa ${boxCount} szuflady`
            : `${boxCount} wewnętrzne szuflady`}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Props and Constants
// ============================================================================

interface SectionEditorProps {
  section: CabinetSection;
  onUpdate: (section: CabinetSection) => void;
  onDelete: () => void;
  canDelete: boolean;
  cabinetHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
  totalRatio: number;
  interiorHeight: number;
}

const CONTENT_TYPE_OPTIONS: { value: SectionContentType; label: string; icon: typeof Package }[] = [
  { value: 'EMPTY', label: 'Pusta', icon: Box },
  { value: 'SHELVES', label: 'Półki', icon: Layers },
  { value: 'DRAWERS', label: 'Szuflady', icon: Package },
];

const SLIDE_TYPE_LABELS: Record<DrawerSlideType, string> = {
  SIDE_MOUNT: 'Boczne (13mm)',
  UNDERMOUNT: 'Podszufladowe (21mm)',
  BOTTOM_MOUNT: 'Dolne (13mm)',
  CENTER_MOUNT: 'Centralne (0mm)',
};

const DEPTH_PRESET_LABELS: Record<ShelfDepthPreset, string> = {
  FULL: 'Pełna',
  HALF: 'Połowa',
  CUSTOM: 'Własna',
};

const DEFAULT_BODY_THICKNESS = 18;

// ============================================================================
// Main Section Editor Component
// ============================================================================

export function SectionEditor({
  section,
  onUpdate,
  onDelete,
  canDelete,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
  totalRatio,
  interiorHeight,
}: SectionEditorProps) {
  // State for selected drawer zone within this section
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    section.drawerConfig?.zones[0]?.id ?? null
  );

  // Calculate section height in mm
  const sectionHeightMm = useMemo(
    () => Math.round((section.heightRatio / totalRatio) * interiorHeight),
    [section.heightRatio, totalRatio, interiorHeight]
  );

  // Calculate drawer box width
  const drawerBoxWidth = useMemo(() => {
    if (!section.drawerConfig) return 0;
    const slideConfig = DRAWER_SLIDE_PRESETS[section.drawerConfig.slideType];
    return cabinetWidth - 2 * slideConfig.sideOffset - 2 * DEFAULT_BODY_THICKNESS;
  }, [section.drawerConfig, cabinetWidth]);

  // Selected zone and its calculated height
  const selectedZone = useMemo(() => {
    if (!section.drawerConfig) return null;
    return section.drawerConfig.zones.find(z => z.id === selectedZoneId) ?? null;
  }, [section.drawerConfig, selectedZoneId]);

  const selectedZoneIndex = useMemo(() => {
    if (!section.drawerConfig || !selectedZoneId) return -1;
    return section.drawerConfig.zones.findIndex(z => z.id === selectedZoneId);
  }, [section.drawerConfig, selectedZoneId]);

  // Calculate zone heights in mm
  const zoneHeightsMm = useMemo(() => {
    if (!section.drawerConfig) return [];
    const zoneTotalRatio = section.drawerConfig.zones.reduce((s, z) => s + z.heightRatio, 0);
    return section.drawerConfig.zones.map(z =>
      Math.round((z.heightRatio / zoneTotalRatio) * sectionHeightMm)
    );
  }, [section.drawerConfig, sectionHeightMm]);

  const selectedZoneHeightMm = selectedZoneIndex >= 0 ? zoneHeightsMm[selectedZoneIndex] : 0;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleContentTypeChange = (contentType: SectionContentType) => {
    const updatedSection: CabinetSection = {
      ...section,
      contentType,
      shelvesConfig: undefined,
      drawerConfig: undefined,
    };

    if (contentType === 'SHELVES') {
      updatedSection.shelvesConfig = { ...DEFAULT_SHELVES_CONFIG };
    } else if (contentType === 'DRAWERS') {
      const defaultZones = [
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ];
      updatedSection.drawerConfig = {
        slideType: 'SIDE_MOUNT',
        zones: defaultZones,
      };
      setSelectedZoneId(defaultZones[0].id);
    }

    onUpdate(updatedSection);
  };

  const handleHeightRatioChange = (value: number[]) => {
    onUpdate({ ...section, heightRatio: value[0] });
  };

  // Shelves handlers
  const handleShelfModeChange = (mode: 'UNIFORM' | 'MANUAL') => {
    if (!section.shelvesConfig) return;

    // When switching to MANUAL, initialize individual shelf configs from current preset
    let shelves = section.shelvesConfig.shelves;
    if (mode === 'MANUAL' && shelves.length < section.shelvesConfig.count) {
      shelves = Array.from({ length: section.shelvesConfig.count }, (_, i) => {
        const existing = section.shelvesConfig!.shelves[i];
        return existing ?? {
          id: generateShelfId(),
          depthPreset: section.shelvesConfig!.depthPreset,
          customDepth: section.shelvesConfig!.customDepth,
        };
      });
    }

    onUpdate({
      ...section,
      shelvesConfig: {
        ...section.shelvesConfig,
        mode,
        shelves,
      },
    });
  };

  const handleShelfCountChange = (delta: number) => {
    if (!section.shelvesConfig) return;
    const newCount = Math.max(0, Math.min(10, section.shelvesConfig.count + delta));

    // In MANUAL mode, adjust shelves array
    let shelves = section.shelvesConfig.shelves;
    if (section.shelvesConfig.mode === 'MANUAL') {
      if (newCount > shelves.length) {
        // Add new shelves
        const newShelves = [...shelves];
        for (let i = shelves.length; i < newCount; i++) {
          newShelves.push({
            id: generateShelfId(),
            depthPreset: section.shelvesConfig.depthPreset,
            customDepth: section.shelvesConfig.customDepth,
          });
        }
        shelves = newShelves;
      } else {
        // Trim shelves array
        shelves = shelves.slice(0, newCount);
      }
    }

    onUpdate({
      ...section,
      shelvesConfig: { ...section.shelvesConfig, count: newCount, shelves },
    });
  };

  const handleShelfDepthPresetChange = (preset: ShelfDepthPreset) => {
    if (!section.shelvesConfig) return;
    onUpdate({
      ...section,
      shelvesConfig: {
        ...section.shelvesConfig,
        depthPreset: preset,
        customDepth: preset === 'CUSTOM' ? section.shelvesConfig.customDepth ?? cabinetDepth / 2 : undefined,
      },
    });
  };

  const handleCustomDepthChange = (value: number) => {
    if (!section.shelvesConfig) return;
    onUpdate({
      ...section,
      shelvesConfig: {
        ...section.shelvesConfig,
        customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
      },
    });
  };

  const handleIndividualShelfDepthChange = (shelfIndex: number, preset: ShelfDepthPreset) => {
    if (!section.shelvesConfig) return;

    const shelves = [...section.shelvesConfig.shelves];
    const existing = shelves[shelfIndex] ?? { id: generateShelfId(), depthPreset: 'FULL' };
    shelves[shelfIndex] = {
      ...existing,
      depthPreset: preset,
      customDepth: preset === 'CUSTOM' ? existing.customDepth ?? cabinetDepth / 2 : undefined,
    };

    onUpdate({
      ...section,
      shelvesConfig: { ...section.shelvesConfig, shelves },
    });
  };

  const handleIndividualShelfCustomDepthChange = (shelfIndex: number, value: number) => {
    if (!section.shelvesConfig) return;

    const shelves = [...section.shelvesConfig.shelves];
    const existing = shelves[shelfIndex] ?? { id: generateShelfId(), depthPreset: 'CUSTOM' };
    shelves[shelfIndex] = {
      ...existing,
      customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
    };

    onUpdate({
      ...section,
      shelvesConfig: { ...section.shelvesConfig, shelves },
    });
  };

  // Drawer handlers
  const handleSlideTypeChange = (slideType: DrawerSlideType) => {
    if (!section.drawerConfig) return;
    onUpdate({
      ...section,
      drawerConfig: { ...section.drawerConfig, slideType },
    });
  };

  const handleAddDrawerZone = () => {
    if (!section.drawerConfig) return;
    if (section.drawerConfig.zones.length >= 8) return;

    const newZone: DrawerZone = {
      id: generateZoneId(),
      heightRatio: 1,
      front: {},
      boxes: [{ heightRatio: 1 }],
    };

    onUpdate({
      ...section,
      drawerConfig: {
        ...section.drawerConfig,
        zones: [...section.drawerConfig.zones, newZone],
      },
    });
    setSelectedZoneId(newZone.id);
  };

  const handleDeleteDrawerZone = (zoneId: string) => {
    if (!section.drawerConfig) return;
    const newZones = section.drawerConfig.zones.filter(z => z.id !== zoneId);
    if (newZones.length === 0) return;

    if (selectedZoneId === zoneId) {
      setSelectedZoneId(newZones[0].id);
    }

    onUpdate({
      ...section,
      drawerConfig: {
        ...section.drawerConfig,
        zones: newZones,
      },
    });
  };

  const handleUpdateDrawerZone = (updatedZone: DrawerZone) => {
    if (!section.drawerConfig) return;
    onUpdate({
      ...section,
      drawerConfig: {
        ...section.drawerConfig,
        zones: section.drawerConfig.zones.map(z => z.id === updatedZone.id ? updatedZone : z),
      },
    });
  };

  const handleMoveDrawerZone = (zoneId: string, direction: 'up' | 'down') => {
    if (!section.drawerConfig) return;
    const zones = [...section.drawerConfig.zones];
    const index = zones.findIndex(z => z.id === zoneId);
    if (index === -1) return;

    // 'up' means higher in cabinet = higher index, 'down' means lower = lower index
    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= zones.length) return;

    [zones[index], zones[newIndex]] = [zones[newIndex], zones[index]];
    onUpdate({
      ...section,
      drawerConfig: { ...section.drawerConfig, zones },
    });
  };

  const handleApplyDrawerPreset = (presetKey: string) => {
    const preset = DRAWER_ZONE_PRESETS[presetKey];
    if (!preset) return;

    const newZones = preset.config.zones.map(z => ({ ...z, id: generateZoneId() }));
    onUpdate({
      ...section,
      drawerConfig: {
        ...preset.config,
        zones: newZones,
      },
    });
    setSelectedZoneId(newZones[0]?.id ?? null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="border rounded-lg p-5 space-y-5 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h4 className="font-semibold text-sm">Edycja sekcji</h4>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Height ratio - only show if there are multiple sections */}
      {totalRatio > section.heightRatio && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Wysokość (proporcja)</Label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {section.heightRatio}x = {sectionHeightMm}mm
            </span>
          </div>
          <Slider
            value={[section.heightRatio]}
            onValueChange={handleHeightRatioChange}
            min={1}
            max={4}
            step={1}
          />
        </div>
      )}

      {/* Single section info */}
      {totalRatio === section.heightRatio && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded text-center">
          Pojedyncza sekcja - zajmuje pełną wysokość wnętrza ({interiorHeight}mm)
        </div>
      )}

      {/* Content type selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Zawartość sekcji</Label>
        <ToggleButtonGroup
          value={section.contentType}
          onChange={handleContentTypeChange}
          options={CONTENT_TYPE_OPTIONS}
          showIcons
        />
      </div>

      {/* Shelves configuration */}
      {section.contentType === 'SHELVES' && section.shelvesConfig && (
        <div className="space-y-4 pt-3 border-t">
          <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Konfiguracja półek
          </h5>

          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-sm">Tryb</Label>
            <ToggleButtonGroup
              value={section.shelvesConfig.mode}
              onChange={handleShelfModeChange}
              options={[
                { value: 'UNIFORM', label: 'Jednolita głębokość' },
                { value: 'MANUAL', label: 'Różne głębokości' },
              ]}
              columns={2}
            />
          </div>

          {/* Shelf count */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Ilość półek</Label>
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-r"
                onClick={() => handleShelfCountChange(-1)}
                disabled={section.shelvesConfig.count <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-10 text-center text-sm font-medium">
                {section.shelvesConfig.count}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l"
                onClick={() => handleShelfCountChange(1)}
                disabled={section.shelvesConfig.count >= 10}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* UNIFORM MODE: Single depth preset for all shelves */}
          {section.shelvesConfig.mode === 'UNIFORM' && (
            <>
              {/* Depth preset */}
              <div className="space-y-2">
                <Label className="text-sm">Głębokość półek</Label>
                <ToggleButtonGroup
                  value={section.shelvesConfig.depthPreset}
                  onChange={handleShelfDepthPresetChange}
                  options={(Object.keys(DEPTH_PRESET_LABELS) as ShelfDepthPreset[]).map((preset) => ({
                    value: preset,
                    label: DEPTH_PRESET_LABELS[preset],
                  }))}
                />
              </div>

              {/* Custom depth input */}
              {section.shelvesConfig.depthPreset === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label className="text-sm">Własna głębokość (mm)</Label>
                  <NumberInput
                    value={section.shelvesConfig.customDepth ?? cabinetDepth / 2}
                    onChange={handleCustomDepthChange}
                    min={50}
                    max={cabinetDepth - 10}
                    allowNegative={false}
                    className="w-full h-9"
                  />
                </div>
              )}

              {/* Calculated depth display */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                Rzeczywista głębokość:{' '}
                <span className="font-mono font-medium text-foreground">
                  {section.shelvesConfig.depthPreset === 'FULL'
                    ? cabinetDepth - 10
                    : section.shelvesConfig.depthPreset === 'HALF'
                    ? Math.round((cabinetDepth - 10) / 2)
                    : section.shelvesConfig.customDepth ?? cabinetDepth / 2}
                  mm
                </span>
              </div>
            </>
          )}

          {/* MANUAL MODE: Individual depth for each shelf */}
          {section.shelvesConfig.mode === 'MANUAL' && section.shelvesConfig.count > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Głębokość każdej półki</Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {Array.from({ length: section.shelvesConfig.count }).map((_, i) => {
                  const shelfConfig = section.shelvesConfig!.shelves[i];
                  const shelfDepthPreset = shelfConfig?.depthPreset ?? section.shelvesConfig!.depthPreset;
                  const shelfCustomDepth = shelfConfig?.customDepth ?? section.shelvesConfig!.customDepth;
                  const actualDepth = shelfDepthPreset === 'FULL'
                    ? cabinetDepth - 10
                    : shelfDepthPreset === 'HALF'
                    ? Math.round((cabinetDepth - 10) / 2)
                    : shelfCustomDepth ?? cabinetDepth / 2;

                  return (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded bg-background">
                      <span className="text-xs font-medium w-16">Półka {i + 1}</span>
                      <Select
                        value={shelfDepthPreset}
                        onValueChange={(v) => handleIndividualShelfDepthChange(i, v as ShelfDepthPreset)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(DEPTH_PRESET_LABELS) as ShelfDepthPreset[]).map((preset) => (
                            <SelectItem key={preset} value={preset} className="text-xs">
                              {DEPTH_PRESET_LABELS[preset]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {shelfDepthPreset === 'CUSTOM' && (
                        <NumberInput
                          value={shelfCustomDepth ?? cabinetDepth / 2}
                          onChange={(v) => handleIndividualShelfCustomDepthChange(i, v)}
                          min={50}
                          max={cabinetDepth - 10}
                          allowNegative={false}
                          className="w-20 h-7 text-xs"
                        />
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
                        {actualDepth}mm
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Positioning info */}
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
            Pierwsza półka na dole sekcji, kolejne rozmieszczone proporcjonalnie do góry.
          </div>
        </div>
      )}

      {/* Drawers configuration */}
      {section.contentType === 'DRAWERS' && section.drawerConfig && (
        <div className="space-y-4 pt-3 border-t">
          <h5 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Konfiguracja szuflad
          </h5>

          {/* Quick presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Szybkie szablony</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(DRAWER_ZONE_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => handleApplyDrawerPreset(key)}
                >
                  <LayoutTemplate className="h-3 w-3 mr-1" />
                  {preset.labelPl.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Two-column layout: Preview + Editor */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Mini preview of zones */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Podgląd stref <span className="font-mono">(od dołu)</span>
              </Label>
              <DrawerZonesPreview
                zones={section.drawerConfig.zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                onMoveZone={handleMoveDrawerZone}
                sectionHeightMm={sectionHeightMm}
                drawerBoxWidth={drawerBoxWidth}
              />

              {/* Add zone button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-dashed text-xs h-7"
                onClick={handleAddDrawerZone}
                disabled={section.drawerConfig.zones.length >= 8}
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj strefę
              </Button>
            </div>

            {/* Right: Selected zone editor */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Edycja strefy</Label>
              {selectedZone ? (
                <DrawerZoneEditor
                  zone={selectedZone}
                  onUpdate={handleUpdateDrawerZone}
                  onDelete={() => handleDeleteDrawerZone(selectedZone.id)}
                  canDelete={section.drawerConfig.zones.length > 1}
                  zoneIndex={selectedZoneIndex}
                  zoneHeightMm={selectedZoneHeightMm}
                />
              ) : (
                <div className="border-2 border-dashed rounded-md p-4 text-center text-muted-foreground text-xs">
                  Wybierz strefę z podglądu
                </div>
              )}
            </div>
          </div>

          {/* Slide type selector */}
          <div className="space-y-2 bg-muted/10 p-3 rounded-lg border">
            <Label className="text-sm">System prowadnic</Label>
            <Select
              value={section.drawerConfig.slideType}
              onValueChange={(v) => handleSlideTypeChange(v as DrawerSlideType)}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DRAWER_SLIDE_PRESETS) as DrawerSlideType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {SLIDE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Luz boczny: {DRAWER_SLIDE_PRESETS[section.drawerConfig.slideType].sideOffset}mm/stronę
            </p>
          </div>

          {/* Summary */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex justify-between">
            <span>
              {getFrontCount(section.drawerConfig)} frontów • {getTotalBoxCount(section.drawerConfig)} szuflad
            </span>
            <span className="font-mono">
              {Math.round(drawerBoxWidth)} mm szer.
            </span>
          </div>

          {/* Positioning info */}
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
            Pierwsza strefa (szuflada) na dole sekcji, kolejne układane do góry.
          </div>
        </div>
      )}

      {/* Empty section info */}
      {section.contentType === 'EMPTY' && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center py-4">
            Pusta sekcja - brak zawartości do konfiguracji.
            <br />
            Wybierz półki lub szuflady powyżej.
          </p>
        </div>
      )}
    </div>
  );
}
