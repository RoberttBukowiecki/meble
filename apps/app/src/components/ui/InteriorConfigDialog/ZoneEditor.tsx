'use client';

/**
 * Zone Editor Component
 *
 * Full-featured editor for a single interior zone, adapted from the original
 * SectionEditor. Supports EMPTY, SHELVES, DRAWERS content types with all
 * configuration options (drawer zones, box-to-front ratio, shelves above box, etc.)
 */

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
import type {
  InteriorZone,
  ZoneContentType,
  ZoneDivisionDirection,
  ZoneSizeMode,
  ZoneWidthConfig,
  PartitionConfig,
  PartitionDepthPreset,
  DrawerZone,
  AboveBoxShelfConfig,
  DrawerSlideType,
  ShelfDepthPreset,
  Material,
} from '@/types';
import {
  DEFAULT_SHELVES_CONFIG,
  generateShelfId,
  generateAboveBoxShelfId,
  generateZoneId,
} from '@/types';
import {
  DRAWER_SLIDE_PRESETS,
  DRAWER_ZONE_PRESETS,
  DRAWER_CONFIG,
  INTERIOR_CONFIG,
  DEFAULT_BODY_THICKNESS,
} from '@/lib/config';
import { Drawer } from '@/lib/domain';
import { Trash2, Package, Layers, Box, Plus, Minus, ChevronUp, ChevronDown, LayoutTemplate, Grid, Columns, Rows, Separator } from 'lucide-react';
import { DepthPresetSelector, type DepthPreset } from './DepthPresetSelector';

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
    <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
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
// Drawer Zone Preview (Mini preview within zone)
// Shows zones from BOTTOM to TOP (first zone = bottom)
// ============================================================================

interface DrawerZonesPreviewProps {
  zones: DrawerZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: 'up' | 'down') => void;
  zoneHeightMm: number;
  drawerBoxWidth: number;
}

function DrawerZonesPreview({
  zones,
  selectedZoneId,
  onSelectZone,
  onMoveZone,
  zoneHeightMm,
  drawerBoxWidth,
}: DrawerZonesPreviewProps) {
  const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);

  // Calculate zone heights in mm
  const zoneHeights = zones.map(zone =>
    Math.round((zone.heightRatio / totalRatio) * zoneHeightMm)
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
      {/* Padding on left for reorder buttons, right for dimension labels */}
      <div className="h-[180px] flex flex-col gap-0.5 w-full max-w-[160px] mx-auto relative pl-7 pr-6">
        {displayZones.map((zone, displayIndex) => {
          // Get original index for correct operations
          const originalIndex = zones.length - 1 - displayIndex;
          const isSelected = zone.id === selectedZoneId;
          const hasExternalFront = zone.front !== null;
          const boxCount = zone.boxes.length;
          const drawerZoneHeightMm = displayHeights[displayIndex];
          // For internal zones, box takes full zone height
          const boxToFrontRatio = hasExternalFront ? (zone.boxToFrontRatio ?? 1.0) : 1.0;
          const hasReducedBox = hasExternalFront && boxToFrontRatio < 1.0;
          const totalBoxHeightMm = Math.round(drawerZoneHeightMm * boxToFrontRatio);

          // Calculate individual box heights
          const boxTotalRatio = zone.boxes.reduce((s, b) => s + b.heightRatio, 0);
          const boxHeightsMm = zone.boxes.map(box =>
            Math.round((box.heightRatio / boxTotalRatio) * totalBoxHeightMm)
          );

          return (
            <div
              key={zone.id}
              className={cn(
                'relative rounded border-2 transition-all cursor-pointer overflow-visible',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 z-10'
                  : 'border-border hover:border-primary/50 bg-background',
                !hasExternalFront && 'border-dashed opacity-70'
              )}
              style={{ flex: zone.heightRatio }}
              onClick={() => onSelectZone(zone.id)}
            >
              {/* Drawer box visualization - shows for both external and internal */}
              <div
                className={cn(
                  "absolute left-1 right-1 border border-dashed rounded-sm pointer-events-none",
                  hasExternalFront
                    ? "border-amber-400/60 bg-amber-50/20 dark:bg-amber-950/20"
                    : "border-muted-foreground/30 bg-muted/10"
                )}
                style={{
                  bottom: '4px',
                  height: `calc(${boxToFrontRatio * 100}% - 8px)`,
                }}
              >
                {/* Show individual boxes with their heights */}
                <div className="absolute inset-0 flex flex-col-reverse">
                  {zone.boxes.map((box, boxIdx) => {
                    const boxPercent = (box.heightRatio / boxTotalRatio) * 100;
                    const boxHeightMm = boxHeightsMm[boxIdx];
                    return (
                      <div
                        key={boxIdx}
                        className={cn(
                          "flex-shrink-0 relative",
                          boxIdx < boxCount - 1 && "border-t border-dashed border-muted-foreground/40"
                        )}
                        style={{ height: `${boxPercent}%` }}
                      >
                        {/* Individual box height - vertical text */}
                        <div
                          className={cn(
                            "absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-mono whitespace-nowrap",
                            hasExternalFront
                              ? "text-amber-600/80 dark:text-amber-400/80"
                              : "text-muted-foreground/80"
                          )}
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          {boxHeightMm}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shelves above drawer box visualization */}
              {hasExternalFront && hasReducedBox && zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
                <>
                  {zone.aboveBoxContent.shelves.map((shelf, shelfIdx) => {
                    const shelfCount = zone.aboveBoxContent!.shelves.length;
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

              {/* Zone/Front height - vertical text on right side only */}
              <div
                className={cn(
                  "absolute -right-5 top-1/2 -translate-y-1/2 text-[8px] font-mono whitespace-nowrap",
                  hasExternalFront ? "text-primary/70" : "text-muted-foreground/70"
                )}
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                title={hasExternalFront ? `Front: ${drawerZoneHeightMm}mm` : `Strefa: ${drawerZoneHeightMm}mm`}
              >
                {drawerZoneHeightMm}
              </div>

              {/* Reorder buttons - on left side */}
              {isSelected && (
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
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

      {/* Zone height footer */}
      <div className="text-center mt-2 pt-2 border-t border-dashed">
        <div className="text-[10px] text-muted-foreground">Wysokość sekcji</div>
        <div className="text-xs font-mono font-semibold">{zoneHeightMm} mm</div>
      </div>
    </div>
  );
}

// ============================================================================
// Drawer Zone Editor (for individual drawer zone within a DRAWERS zone)
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
      depthPreset: INTERIOR_CONFIG.DEFAULT_ABOVE_BOX_SHELF_PRESET,
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
          min={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MIN}
          max={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MAX}
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
            min={DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MIN}
            max={DRAWER_CONFIG.BOX_TO_FRONT_RATIO.MAX}
            step={DRAWER_CONFIG.BOX_TO_FRONT_RATIO.STEP}
          />
          <p className="text-[9px] text-muted-foreground">
            {boxToFrontRatio < 1.0
              ? `Front ${zoneHeightMm}mm, szuflada ${boxHeightMm}mm (na dole)`
              : 'Szuflada zajmuje pełną wysokość frontu'}
          </p>
        </div>
      )}

      {/* Shelves above drawer box - always visible when has external front */}
      {hasExternalFront && (
        <div className="space-y-2 pt-2 border-t border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Półki nad szufladą</Label>
              {boxToFrontRatio < 1.0 ? (
                <p className="text-[9px] text-muted-foreground">
                  Wolna przestrzeń: {zoneHeightMm - boxHeightMm}mm
                </p>
              ) : (
                <p className="text-[9px] text-blue-600 dark:text-blue-400">
                  Zmniejsz wysokość szuflady aby dodać półki
                </p>
              )}
            </div>
            {boxToFrontRatio < 1.0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={handleAddAboveBoxShelf}
                disabled={(zone.aboveBoxContent?.shelves.length ?? 0) >= INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER}
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleBoxToFrontRatioChange([75])}
              >
                <Layers className="h-3 w-3 mr-1" />
                Włącz
              </Button>
            )}
          </div>

          {boxToFrontRatio < 1.0 && zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
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
                        min={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN}
                        max={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MAX}
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

          {boxToFrontRatio < 1.0 && zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
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

interface ZoneEditorProps {
  /** The zone to edit */
  zone: InteriorZone;
  /** Callback when zone is updated */
  onUpdate: (zone: InteriorZone) => void;
  /** Callback to delete this zone */
  onDelete: () => void;
  /** Whether this zone can be deleted */
  canDelete: boolean;
  /** Cabinet height in mm */
  cabinetHeight: number;
  /** Cabinet width in mm */
  cabinetWidth: number;
  /** Cabinet depth in mm */
  cabinetDepth: number;
  /** Total height ratio of all sibling zones */
  totalRatio: number;
  /** Available interior height in mm */
  interiorHeight: number;
  /** Available materials for selection */
  materials: Material[];
  /** Default body material ID from cabinet */
  bodyMaterialId: string;
  /** Last used material for shelves */
  lastUsedShelfMaterial: string;
  /** Last used material for drawer box */
  lastUsedDrawerBoxMaterial: string;
  /** Last used material for drawer bottom */
  lastUsedDrawerBottomMaterial: string;
  /** Callback when shelf material is changed */
  onShelfMaterialChange?: (materialId: string) => void;
  /** Callback when drawer box material is changed */
  onDrawerBoxMaterialChange?: (materialId: string) => void;
  /** Callback when drawer bottom material is changed */
  onDrawerBottomMaterialChange?: (materialId: string) => void;
}

// Content types available for leaf zones (non-NESTED)
const CONTENT_TYPE_OPTIONS: { value: ZoneContentType; label: string; icon: typeof Package }[] = [
  { value: 'EMPTY', label: 'Pusta', icon: Box },
  { value: 'SHELVES', label: 'Półki', icon: Layers },
  { value: 'DRAWERS', label: 'Szuflady', icon: Package },
  { value: 'NESTED', label: 'Podział', icon: Grid },
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

// Division direction options
const DIVISION_DIRECTION_OPTIONS: { value: ZoneDivisionDirection; label: string; icon: typeof Rows }[] = [
  { value: 'HORIZONTAL', label: 'Wiersze', icon: Rows },
  { value: 'VERTICAL', label: 'Kolumny', icon: Columns },
];

// Partition direction labels
const PARTITION_DIRECTION_LABELS: Record<ZoneDivisionDirection, string> = {
  HORIZONTAL: 'Przegrody poziome',
  VERTICAL: 'Przegrody pionowe',
};

// Width mode labels
const WIDTH_MODE_LABELS: Record<ZoneSizeMode, string> = {
  FIXED: 'Stała (mm)',
  PROPORTIONAL: 'Proporcjonalna',
};

// ============================================================================
// Main Zone Editor Component
// ============================================================================

export function ZoneEditor({
  zone,
  onUpdate,
  onDelete,
  canDelete,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
  totalRatio,
  interiorHeight,
  materials,
  bodyMaterialId,
  lastUsedShelfMaterial,
  lastUsedDrawerBoxMaterial,
  lastUsedDrawerBottomMaterial,
  onShelfMaterialChange,
  onDrawerBoxMaterialChange,
  onDrawerBottomMaterialChange,
}: ZoneEditorProps) {
  // State for selected drawer zone within this zone
  const [selectedDrawerZoneId, setSelectedDrawerZoneId] = useState<string | null>(
    zone.drawerConfig?.zones[0]?.id ?? null
  );

  // Get the zone's height ratio (from heightConfig)
  const zoneHeightRatio = zone.heightConfig.mode === 'RATIO'
    ? (zone.heightConfig.ratio ?? 1)
    : 1;

  // Calculate zone height in mm
  const zoneHeightMm = useMemo(() => {
    if (zone.heightConfig.mode === 'EXACT' && zone.heightConfig.exactMm) {
      return zone.heightConfig.exactMm;
    }
    return Math.round((zoneHeightRatio / totalRatio) * interiorHeight);
  }, [zone.heightConfig, zoneHeightRatio, totalRatio, interiorHeight]);

  // Calculate drawer box width
  const drawerBoxWidth = useMemo(() => {
    if (!zone.drawerConfig) return 0;
    const slideConfig = DRAWER_SLIDE_PRESETS[zone.drawerConfig.slideType];
    return cabinetWidth - 2 * slideConfig.sideOffset - 2 * DEFAULT_BODY_THICKNESS;
  }, [zone.drawerConfig, cabinetWidth]);

  // Selected drawer zone and its calculated height
  const selectedDrawerZone = useMemo(() => {
    if (!zone.drawerConfig) return null;
    return zone.drawerConfig.zones.find(z => z.id === selectedDrawerZoneId) ?? null;
  }, [zone.drawerConfig, selectedDrawerZoneId]);

  const selectedDrawerZoneIndex = useMemo(() => {
    if (!zone.drawerConfig || !selectedDrawerZoneId) return -1;
    return zone.drawerConfig.zones.findIndex(z => z.id === selectedDrawerZoneId);
  }, [zone.drawerConfig, selectedDrawerZoneId]);

  // Calculate drawer zone heights in mm
  const drawerZoneHeightsMm = useMemo(() => {
    if (!zone.drawerConfig) return [];
    const zoneTotalRatio = zone.drawerConfig.zones.reduce((s, z) => s + z.heightRatio, 0);
    return zone.drawerConfig.zones.map(z =>
      Math.round((z.heightRatio / zoneTotalRatio) * zoneHeightMm)
    );
  }, [zone.drawerConfig, zoneHeightMm]);

  const selectedDrawerZoneHeightMm = selectedDrawerZoneIndex >= 0 ? drawerZoneHeightsMm[selectedDrawerZoneIndex] : 0;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleContentTypeChange = (contentType: ZoneContentType) => {
    const updatedZone: InteriorZone = {
      ...zone,
      contentType,
      shelvesConfig: undefined,
      drawerConfig: undefined,
      children: undefined,
      divisionDirection: undefined,
    };

    if (contentType === 'SHELVES') {
      // Apply last used shelf material if different from body material
      const shelfMaterial = lastUsedShelfMaterial && lastUsedShelfMaterial !== bodyMaterialId
        ? lastUsedShelfMaterial
        : undefined;
      updatedZone.shelvesConfig = {
        ...DEFAULT_SHELVES_CONFIG,
        materialId: shelfMaterial,
      };
    } else if (contentType === 'DRAWERS') {
      const defaultZones = [
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ];
      // Apply last used drawer materials
      const boxMaterial = lastUsedDrawerBoxMaterial && lastUsedDrawerBoxMaterial !== bodyMaterialId
        ? lastUsedDrawerBoxMaterial
        : undefined;
      updatedZone.drawerConfig = {
        slideType: 'SIDE_MOUNT',
        zones: defaultZones,
        boxMaterialId: boxMaterial,
        bottomMaterialId: lastUsedDrawerBottomMaterial ?? undefined,
      };
      setSelectedDrawerZoneId(defaultZones[0].id);
    } else if (contentType === 'NESTED') {
      // Create initial nested structure with 2 children
      updatedZone.divisionDirection = 'HORIZONTAL';
      updatedZone.children = [
        {
          id: crypto.randomUUID(),
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: zone.depth + 1,
        },
        {
          id: crypto.randomUUID(),
          contentType: 'EMPTY',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: zone.depth + 1,
        },
      ];
    }

    onUpdate(updatedZone);
  };

  const handleHeightRatioChange = (value: number[]) => {
    onUpdate({
      ...zone,
      heightConfig: {
        mode: 'RATIO',
        ratio: value[0],
      },
    });
  };

  // Shelves handlers
  const handleShelfModeChange = (mode: 'UNIFORM' | 'MANUAL') => {
    if (!zone.shelvesConfig) return;

    // When switching to MANUAL, initialize individual shelf configs from current preset
    let shelves = zone.shelvesConfig.shelves;
    if (mode === 'MANUAL' && shelves.length < zone.shelvesConfig.count) {
      shelves = Array.from({ length: zone.shelvesConfig.count }, (_, i) => {
        const existing = zone.shelvesConfig!.shelves[i];
        return existing ?? {
          id: generateShelfId(),
          depthPreset: zone.shelvesConfig!.depthPreset,
          customDepth: zone.shelvesConfig!.customDepth,
        };
      });
    }

    onUpdate({
      ...zone,
      shelvesConfig: {
        ...zone.shelvesConfig,
        mode,
        shelves,
      },
    });
  };

  const handleShelfCountChange = (delta: number) => {
    if (!zone.shelvesConfig) return;
    const newCount = Math.max(0, Math.min(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE, zone.shelvesConfig.count + delta));

    // In MANUAL mode, adjust shelves array
    let shelves = zone.shelvesConfig.shelves;
    if (zone.shelvesConfig.mode === 'MANUAL') {
      if (newCount > shelves.length) {
        // Add new shelves
        const newShelves = [...shelves];
        for (let i = shelves.length; i < newCount; i++) {
          newShelves.push({
            id: generateShelfId(),
            depthPreset: zone.shelvesConfig.depthPreset,
            customDepth: zone.shelvesConfig.customDepth,
          });
        }
        shelves = newShelves;
      } else {
        // Trim shelves array
        shelves = shelves.slice(0, newCount);
      }
    }

    onUpdate({
      ...zone,
      shelvesConfig: { ...zone.shelvesConfig, count: newCount, shelves },
    });
  };

  const handleShelfDepthPresetChange = (preset: ShelfDepthPreset) => {
    if (!zone.shelvesConfig) return;
    onUpdate({
      ...zone,
      shelvesConfig: {
        ...zone.shelvesConfig,
        depthPreset: preset,
        customDepth: preset === 'CUSTOM' ? zone.shelvesConfig.customDepth ?? cabinetDepth / 2 : undefined,
      },
    });
  };

  const handleCustomDepthChange = (value: number) => {
    if (!zone.shelvesConfig) return;
    onUpdate({
      ...zone,
      shelvesConfig: {
        ...zone.shelvesConfig,
        customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
      },
    });
  };

  const handleIndividualShelfDepthChange = (shelfIndex: number, preset: ShelfDepthPreset) => {
    if (!zone.shelvesConfig) return;

    const shelves = [...zone.shelvesConfig.shelves];
    const existing = shelves[shelfIndex] ?? { id: generateShelfId(), depthPreset: 'FULL' };
    shelves[shelfIndex] = {
      ...existing,
      depthPreset: preset,
      customDepth: preset === 'CUSTOM' ? existing.customDepth ?? cabinetDepth / 2 : undefined,
    };

    onUpdate({
      ...zone,
      shelvesConfig: { ...zone.shelvesConfig, shelves },
    });
  };

  const handleIndividualShelfCustomDepthChange = (shelfIndex: number, value: number) => {
    if (!zone.shelvesConfig) return;

    const shelves = [...zone.shelvesConfig.shelves];
    const existing = shelves[shelfIndex] ?? { id: generateShelfId(), depthPreset: 'CUSTOM' };
    shelves[shelfIndex] = {
      ...existing,
      customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
    };

    onUpdate({
      ...zone,
      shelvesConfig: { ...zone.shelvesConfig, shelves },
    });
  };

  // Drawer handlers
  const handleSlideTypeChange = (slideType: DrawerSlideType) => {
    if (!zone.drawerConfig) return;
    onUpdate({
      ...zone,
      drawerConfig: { ...zone.drawerConfig, slideType },
    });
  };

  const handleAddDrawerZone = () => {
    if (!zone.drawerConfig) return;
    if (zone.drawerConfig.zones.length >= INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE) return;

    const newZone: DrawerZone = {
      id: generateZoneId(),
      heightRatio: 1,
      front: {},
      boxes: [{ heightRatio: 1 }],
    };

    onUpdate({
      ...zone,
      drawerConfig: {
        ...zone.drawerConfig,
        zones: [...zone.drawerConfig.zones, newZone],
      },
    });
    setSelectedDrawerZoneId(newZone.id);
  };

  const handleDeleteDrawerZone = (drawerZoneId: string) => {
    if (!zone.drawerConfig) return;
    const newZones = zone.drawerConfig.zones.filter(z => z.id !== drawerZoneId);
    if (newZones.length === 0) return;

    if (selectedDrawerZoneId === drawerZoneId) {
      setSelectedDrawerZoneId(newZones[0].id);
    }

    onUpdate({
      ...zone,
      drawerConfig: {
        ...zone.drawerConfig,
        zones: newZones,
      },
    });
  };

  const handleUpdateDrawerZone = (updatedDrawerZone: DrawerZone) => {
    if (!zone.drawerConfig) return;
    onUpdate({
      ...zone,
      drawerConfig: {
        ...zone.drawerConfig,
        zones: zone.drawerConfig.zones.map(z => z.id === updatedDrawerZone.id ? updatedDrawerZone : z),
      },
    });
  };

  const handleMoveDrawerZone = (drawerZoneId: string, direction: 'up' | 'down') => {
    if (!zone.drawerConfig) return;
    const zones = [...zone.drawerConfig.zones];
    const index = zones.findIndex(z => z.id === drawerZoneId);
    if (index === -1) return;

    // 'up' means higher in cabinet = higher index, 'down' means lower = lower index
    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= zones.length) return;

    [zones[index], zones[newIndex]] = [zones[newIndex], zones[index]];
    onUpdate({
      ...zone,
      drawerConfig: { ...zone.drawerConfig, zones },
    });
  };

  const handleApplyDrawerPreset = (presetKey: string) => {
    const preset = DRAWER_ZONE_PRESETS[presetKey];
    if (!preset) return;

    const newZones = preset.config.zones.map(z => ({ ...z, id: generateZoneId() }));
    onUpdate({
      ...zone,
      drawerConfig: {
        ...preset.config,
        zones: newZones,
      },
    });
    setSelectedDrawerZoneId(newZones[0]?.id ?? null);
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

      {/* Height ratio - show if there are multiple sibling zones and this zone doesn't have widthConfig (HORIZONTAL parent) */}
      {totalRatio > zoneHeightRatio && !zone.widthConfig && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Wysokość (proporcja)</Label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {zoneHeightRatio}x = {zoneHeightMm}mm
            </span>
          </div>
          <Slider
            value={[zoneHeightRatio]}
            onValueChange={handleHeightRatioChange}
            min={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MIN}
            max={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MAX}
            step={1}
          />
        </div>
      )}

      {/* Width ratio - show if this zone has widthConfig (VERTICAL parent) */}
      {zone.widthConfig && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Szerokość</Label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {zone.widthConfig.mode === 'FIXED'
                ? `${zone.widthConfig.fixedMm ?? 400}mm`
                : `${zone.widthConfig.ratio ?? 1}x`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={zone.widthConfig.mode}
              onValueChange={(mode: ZoneSizeMode) => {
                onUpdate({
                  ...zone,
                  widthConfig: {
                    mode,
                    ...(mode === 'FIXED' ? { fixedMm: 400 } : { ratio: 1 }),
                  },
                });
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROPORTIONAL">Proporcjonalna</SelectItem>
                <SelectItem value="FIXED">Stała (mm)</SelectItem>
              </SelectContent>
            </Select>
            {zone.widthConfig.mode === 'FIXED' ? (
              <NumberInput
                value={zone.widthConfig.fixedMm ?? 400}
                min={INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM ?? 100}
                max={cabinetWidth - DEFAULT_BODY_THICKNESS * 2}
                onChange={(val) => {
                  onUpdate({
                    ...zone,
                    widthConfig: { mode: 'FIXED', fixedMm: val },
                  });
                }}
                className="h-8 flex-1"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <Slider
                  value={[zone.widthConfig.ratio ?? 1]}
                  min={0.5}
                  max={5}
                  step={0.5}
                  onValueChange={([val]) => {
                    onUpdate({
                      ...zone,
                      widthConfig: { mode: 'PROPORTIONAL', ratio: val },
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-8 text-right">{zone.widthConfig.ratio ?? 1}x</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content type selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Zawartość sekcji</Label>
        <ToggleButtonGroup
          value={zone.contentType}
          onChange={handleContentTypeChange}
          options={zone.depth < (INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1) ? CONTENT_TYPE_OPTIONS : CONTENT_TYPE_OPTIONS.filter(o => o.value !== 'NESTED')}
          columns={zone.depth < (INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1) ? 4 : 3}
          showIcons
        />
      </div>

      {/* Shelves configuration */}
      {zone.contentType === 'SHELVES' && zone.shelvesConfig && (
        <div className="space-y-4 pt-3 border-t">
          <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Konfiguracja półek
          </h5>

          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-sm">Tryb</Label>
            <ToggleButtonGroup
              value={zone.shelvesConfig.mode}
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
                disabled={zone.shelvesConfig.count <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-10 text-center text-sm font-medium">
                {zone.shelvesConfig.count}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l"
                onClick={() => handleShelfCountChange(1)}
                disabled={zone.shelvesConfig.count >= 10}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Shelf material selector - only in UNIFORM mode */}
          {zone.shelvesConfig.mode === 'UNIFORM' && (
            <div className="space-y-2">
              <Label className="text-sm">Materiał półek</Label>
              <Select
                value={zone.shelvesConfig.materialId ?? bodyMaterialId}
                onValueChange={(value) => {
                  onUpdate({
                    ...zone,
                    shelvesConfig: {
                      ...zone.shelvesConfig!,
                      materialId: value === bodyMaterialId ? undefined : value,
                    },
                  });
                  onShelfMaterialChange?.(value);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Wybierz materiał" />
                </SelectTrigger>
                <SelectContent>
                  {materials.filter(m => m.category === 'board').map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm border"
                          style={{ backgroundColor: material.color }}
                        />
                        <span>{material.name}</span>
                        <span className="text-muted-foreground text-xs">({material.thickness}mm)</span>
                        {material.id === bodyMaterialId && (
                          <span className="text-xs text-blue-600">(korpus)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* UNIFORM MODE: Single depth preset for all shelves */}
          {zone.shelvesConfig.mode === 'UNIFORM' && (
            <>
              {/* Depth preset */}
              <div className="space-y-2">
                <Label className="text-sm">Głębokość półek</Label>
                <ToggleButtonGroup
                  value={zone.shelvesConfig.depthPreset}
                  onChange={handleShelfDepthPresetChange}
                  options={(Object.keys(DEPTH_PRESET_LABELS) as ShelfDepthPreset[]).map((preset) => ({
                    value: preset,
                    label: DEPTH_PRESET_LABELS[preset],
                  }))}
                />
              </div>

              {/* Custom depth input */}
              {zone.shelvesConfig.depthPreset === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label className="text-sm">Własna głębokość (mm)</Label>
                  <NumberInput
                    value={zone.shelvesConfig.customDepth ?? cabinetDepth / 2}
                    onChange={handleCustomDepthChange}
                    min={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN}
                    max={cabinetDepth - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET}
                    allowNegative={false}
                    className="w-full h-9"
                  />
                </div>
              )}

              {/* Calculated depth display */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                Rzeczywista głębokość:{' '}
                <span className="font-mono font-medium text-foreground">
                  {zone.shelvesConfig.depthPreset === 'FULL'
                    ? cabinetDepth - 10
                    : zone.shelvesConfig.depthPreset === 'HALF'
                    ? Math.round((cabinetDepth - 10) / 2)
                    : zone.shelvesConfig.customDepth ?? cabinetDepth / 2}
                  mm
                </span>
              </div>
            </>
          )}

          {/* MANUAL MODE: Individual depth for each shelf */}
          {zone.shelvesConfig.mode === 'MANUAL' && zone.shelvesConfig.count > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Głębokość każdej półki</Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {Array.from({ length: zone.shelvesConfig.count }).map((_, i) => {
                  const shelfConfig = zone.shelvesConfig!.shelves[i];
                  const shelfDepthPreset = shelfConfig?.depthPreset ?? zone.shelvesConfig!.depthPreset;
                  const shelfCustomDepth = shelfConfig?.customDepth ?? zone.shelvesConfig!.customDepth;
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
                          min={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN}
                          max={cabinetDepth - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET}
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
      {zone.contentType === 'DRAWERS' && zone.drawerConfig && (
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
                zones={zone.drawerConfig.zones}
                selectedZoneId={selectedDrawerZoneId}
                onSelectZone={setSelectedDrawerZoneId}
                onMoveZone={handleMoveDrawerZone}
                zoneHeightMm={zoneHeightMm}
                drawerBoxWidth={drawerBoxWidth}
              />

              {/* Add zone button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-dashed text-xs h-7"
                onClick={handleAddDrawerZone}
                disabled={zone.drawerConfig.zones.length >= INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE}
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj strefę
              </Button>
            </div>

            {/* Right: Selected zone editor */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Edycja strefy</Label>
              {selectedDrawerZone ? (
                <DrawerZoneEditor
                  zone={selectedDrawerZone}
                  onUpdate={handleUpdateDrawerZone}
                  onDelete={() => handleDeleteDrawerZone(selectedDrawerZone.id)}
                  canDelete={zone.drawerConfig.zones.length > 1}
                  zoneIndex={selectedDrawerZoneIndex}
                  zoneHeightMm={selectedDrawerZoneHeightMm}
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
              value={zone.drawerConfig.slideType}
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
              Luz boczny: {DRAWER_SLIDE_PRESETS[zone.drawerConfig.slideType].sideOffset}mm/stronę
            </p>
          </div>

          {/* Drawer materials selector */}
          <div className="space-y-3 bg-muted/10 p-3 rounded-lg border">
            <Label className="text-sm font-medium">Materiały szuflady</Label>

            {/* Box material (sides, back, front) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Box (boki, tył, przód)</Label>
              <Select
                value={zone.drawerConfig.boxMaterialId ?? bodyMaterialId}
                onValueChange={(value) => {
                  onUpdate({
                    ...zone,
                    drawerConfig: {
                      ...zone.drawerConfig!,
                      boxMaterialId: value === bodyMaterialId ? undefined : value,
                    },
                  });
                  onDrawerBoxMaterialChange?.(value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Wybierz materiał" />
                </SelectTrigger>
                <SelectContent>
                  {materials.filter(m => m.category === 'board').map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm border"
                          style={{ backgroundColor: material.color }}
                        />
                        <span>{material.name}</span>
                        <span className="text-muted-foreground text-xs">({material.thickness}mm)</span>
                        {material.id === bodyMaterialId && (
                          <span className="text-xs text-blue-600">(korpus)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bottom material */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dno szuflady</Label>
              <Select
                value={zone.drawerConfig.bottomMaterialId ?? lastUsedDrawerBottomMaterial}
                onValueChange={(value) => {
                  onUpdate({
                    ...zone,
                    drawerConfig: {
                      ...zone.drawerConfig!,
                      bottomMaterialId: value,
                    },
                  });
                  onDrawerBottomMaterialChange?.(value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Wybierz materiał" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm border"
                          style={{ backgroundColor: material.color }}
                        />
                        <span>{material.name}</span>
                        <span className="text-muted-foreground text-xs">({material.thickness}mm)</span>
                        {material.category === 'hdf' && (
                          <span className="text-xs text-green-600">(HDF)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex justify-between">
            <span>
              {Drawer.getFrontCount(zone.drawerConfig)} frontów • {Drawer.getTotalBoxCount(zone.drawerConfig)} szuflad
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

      {/* NESTED zone configuration - full editor for divisions */}
      {zone.contentType === 'NESTED' && (
        <div className="pt-3 border-t space-y-4">
          {/* Division direction */}
          <div className="space-y-2">
            <Label className="text-xs">Kierunek podziału</Label>
            <ToggleButtonGroup
              value={zone.divisionDirection ?? 'HORIZONTAL'}
              onChange={(direction) => {
                const newZone = { ...zone, divisionDirection: direction as ZoneDivisionDirection };
                const childCount = newZone.children?.length ?? 0;
                const partitionCount = Math.max(0, childCount - 1);

                // When switching to VERTICAL, initialize width configs for children
                if (direction === 'VERTICAL' && newZone.children) {
                  newZone.children = newZone.children.map(child => ({
                    ...child,
                    widthConfig: child.widthConfig ?? { mode: 'PROPORTIONAL', ratio: 1 },
                  }));
                } else if (direction === 'HORIZONTAL' && newZone.children) {
                  // Clear width configs when switching to HORIZONTAL
                  newZone.children = newZone.children.map(child => {
                    const { widthConfig, ...rest } = child;
                    return rest;
                  });
                }

                // Initialize/update partitions for both directions (n-1 for n children)
                if (partitionCount > 0) {
                  const existingPartitions = newZone.partitions ?? [];
                  newZone.partitions = Array.from(
                    { length: partitionCount },
                    (_, i) => existingPartitions[i] ?? {
                      id: crypto.randomUUID(),
                      enabled: false, // Default to disabled
                      depthPreset: 'FULL' as PartitionDepthPreset,
                    }
                  );
                } else {
                  newZone.partitions = undefined;
                }

                onUpdate(newZone);
              }}
              options={DIVISION_DIRECTION_OPTIONS}
              columns={2}
              showIcons
            />
          </div>

          {/* Child zones management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {zone.divisionDirection === 'VERTICAL' ? 'Kolumny' : 'Sekcje'} ({zone.children?.length ?? 0})
              </Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    const children = zone.children ?? [];
                    if (children.length <= 1) return;
                    const newChildren = children.slice(0, -1);
                    // Keep n-1 partitions for n children
                    const newPartitions = zone.partitions
                      ? zone.partitions.slice(0, Math.max(0, newChildren.length - 1))
                      : undefined;
                    onUpdate({
                      ...zone,
                      children: newChildren,
                      partitions: newPartitions?.length ? newPartitions : undefined,
                    });
                  }}
                  disabled={(zone.children?.length ?? 0) <= 1}
                  title="Usuń ostatnią"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    const children = zone.children ?? [];
                    if (children.length >= (INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE ?? 6)) return;
                    const newChild: InteriorZone = {
                      id: crypto.randomUUID(),
                      contentType: 'EMPTY',
                      heightConfig: { mode: 'RATIO', ratio: 1 },
                      depth: zone.depth + 1,
                      ...(zone.divisionDirection === 'VERTICAL' && {
                        widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
                      }),
                    };
                    // Add a new partition (disabled by default)
                    const newPartition: PartitionConfig = {
                      id: crypto.randomUUID(),
                      enabled: false,
                      depthPreset: 'FULL',
                    };
                    const existingPartitions = zone.partitions ?? [];
                    onUpdate({
                      ...zone,
                      children: [...children, newChild],
                      partitions: [...existingPartitions, newPartition],
                    });
                  }}
                  disabled={(zone.children?.length ?? 0) >= (INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE ?? 6)}
                  title="Dodaj"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Width configuration for VERTICAL division with reordering */}
          {zone.divisionDirection === 'VERTICAL' && zone.children && zone.children.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs">Szerokości kolumn</Label>
              <div className="space-y-2">
                {zone.children.map((child, idx) => {
                  const widthConfig = child.widthConfig ?? { mode: 'PROPORTIONAL', ratio: 1 };
                  const canMoveLeft = idx > 0;
                  const canMoveRight = idx < zone.children!.length - 1;

                  const handleMoveChild = (direction: 'left' | 'right') => {
                    const newChildren = [...zone.children!];
                    const newPartitions = zone.partitions ? [...zone.partitions] : [];
                    const newIdx = direction === 'left' ? idx - 1 : idx + 1;
                    // Swap children
                    [newChildren[idx], newChildren[newIdx]] = [newChildren[newIdx], newChildren[idx]];
                    onUpdate({ ...zone, children: newChildren, partitions: newPartitions });
                  };

                  return (
                    <div key={child.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      {/* Move buttons */}
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveChild('left')}
                          disabled={!canMoveLeft}
                          title="Przesuń w lewo"
                        >
                          <ChevronUp className="h-3 w-3 -rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveChild('right')}
                          disabled={!canMoveRight}
                          title="Przesuń w prawo"
                        >
                          <ChevronDown className="h-3 w-3 -rotate-90" />
                        </Button>
                      </div>
                      <span className="text-xs font-medium w-16">Kolumna {idx + 1}</span>
                      <Select
                        value={widthConfig.mode}
                        onValueChange={(mode: ZoneSizeMode) => {
                          const newChildren = [...zone.children!];
                          newChildren[idx] = {
                            ...newChildren[idx],
                            widthConfig: {
                              mode,
                              ...(mode === 'FIXED' ? { fixedMm: 400 } : { ratio: 1 }),
                            },
                          };
                          onUpdate({ ...zone, children: newChildren });
                        }}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WIDTH_MODE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {widthConfig.mode === 'FIXED' ? (
                        <NumberInput
                          value={widthConfig.fixedMm ?? 400}
                          min={INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM ?? 100}
                          max={cabinetWidth - DEFAULT_BODY_THICKNESS * 2}
                          onChange={(val) => {
                            const newChildren = [...zone.children!];
                            newChildren[idx] = {
                              ...newChildren[idx],
                              widthConfig: { mode: 'FIXED', fixedMm: val },
                            };
                            onUpdate({ ...zone, children: newChildren });
                          }}
                          className="h-7 w-20 text-xs"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Slider
                            value={[widthConfig.ratio ?? 1]}
                            min={0.5}
                            max={5}
                            step={0.5}
                            onValueChange={([val]) => {
                              const newChildren = [...zone.children!];
                              newChildren[idx] = {
                                ...newChildren[idx],
                                widthConfig: { mode: 'PROPORTIONAL', ratio: val },
                              };
                              onUpdate({ ...zone, children: newChildren });
                            }}
                            className="w-16"
                          />
                          <span className="text-xs font-mono w-6">{widthConfig.ratio ?? 1}x</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Partition configuration for both HORIZONTAL and VERTICAL divisions */}
          {zone.partitions && zone.partitions.length > 0 && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-dashed">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Separator className="h-3 w-3" />
                  {zone.divisionDirection === 'VERTICAL' ? 'Przegrody pionowe' : 'Przegrody poziome'}
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {zone.partitions.filter(p => p.enabled).length} / {zone.partitions.length} aktywnych
                </span>
              </div>
              <div className="space-y-2">
                {zone.partitions.map((partition, idx) => {
                  const beforeChild = zone.children?.[idx];
                  const afterChild = zone.children?.[idx + 1];
                  const isVertical = zone.divisionDirection === 'VERTICAL';
                  const beforeLabel = isVertical ? `Kol. ${idx + 1}` : `Sek. ${idx + 1}`;
                  const afterLabel = isVertical ? `Kol. ${idx + 2}` : `Sek. ${idx + 2}`;

                  return (
                    <div
                      key={partition.id}
                      className={cn(
                        'p-2 rounded border transition-colors',
                        partition.enabled
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-muted/30 border-transparent'
                      )}
                    >
                      {/* Header with toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`partition-${partition.id}`}
                            checked={partition.enabled}
                            onCheckedChange={(enabled) => {
                              const newPartitions = [...zone.partitions!];
                              newPartitions[idx] = { ...newPartitions[idx], enabled };
                              onUpdate({ ...zone, partitions: newPartitions });
                            }}
                          />
                          <Label
                            htmlFor={`partition-${partition.id}`}
                            className="text-xs cursor-pointer"
                          >
                            {beforeLabel} ↔ {afterLabel}
                          </Label>
                        </div>
                        {partition.enabled && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {partition.depthPreset === 'FULL'
                              ? `${cabinetDepth - 10}mm`
                              : partition.depthPreset === 'HALF'
                                ? `${Math.round((cabinetDepth - 10) / 2)}mm`
                                : `${partition.customDepth ?? Math.round(cabinetDepth * 0.75)}mm`}
                          </span>
                        )}
                      </div>

                      {/* Depth configuration - only when enabled */}
                      {partition.enabled && (
                        <DepthPresetSelector
                          value={partition.depthPreset as DepthPreset}
                          onChange={(preset, customDepth) => {
                            const newPartitions = [...zone.partitions!];
                            newPartitions[idx] = {
                              ...newPartitions[idx],
                              depthPreset: preset as PartitionDepthPreset,
                              customDepth,
                            };
                            onUpdate({ ...zone, partitions: newPartitions });
                          }}
                          customDepth={partition.customDepth}
                          cabinetDepth={cabinetDepth}
                          variant="compact"
                          showCalculatedDepth={false}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {zone.divisionDirection === 'VERTICAL'
                  ? 'Przegrody pionowe rozdzielają kolumny.'
                  : 'Przegrody poziome rozdzielają sekcje.'}
              </p>
            </div>
          )}

          {/* Info text */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            {zone.divisionDirection === 'VERTICAL'
              ? 'Kolumny ułożone od lewej do prawej. Wybierz konkretną kolumnę w podglądzie aby ją edytować.'
              : 'Sekcje ułożone od dołu do góry. Wybierz konkretną sekcję w podglądzie aby ją edytować.'}
          </div>
        </div>
      )}

      {/* Empty zone info */}
      {zone.contentType === 'EMPTY' && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center py-4">
            Pusta sekcja - brak zawartości do konfiguracji.
            <br />
            Wybierz półki, szuflady lub podział powyżej.
          </p>
        </div>
      )}
    </div>
  );
}

export default ZoneEditor;
