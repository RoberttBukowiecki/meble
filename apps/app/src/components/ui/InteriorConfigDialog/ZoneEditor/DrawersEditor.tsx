"use client";

/**
 * Drawers Editor Component
 *
 * Full-featured editor for drawer configuration within a zone.
 * Includes drawer zone preview, individual zone editing, slide type selection,
 * and material configuration.
 */

import { useState, useMemo } from "react";
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
} from "@meble/ui";
import type {
  DrawerConfiguration,
  DrawerZone,
  DrawerSlideType,
  AboveBoxShelfConfig,
  ShelfDepthPreset,
  Material,
} from "@/types";
import { generateZoneId, generateAboveBoxShelfId } from "@/types";
import {
  DRAWER_SLIDE_PRESETS,
  DRAWER_ZONE_PRESETS,
  DRAWER_CONFIG,
  INTERIOR_CONFIG,
  DEFAULT_BODY_THICKNESS,
} from "@/lib/config";
import { Drawer } from "@/lib/domain";
import {
  Trash2,
  Package,
  Layers,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  LayoutTemplate,
} from "lucide-react";

// ============================================================================
// Types & Constants
// ============================================================================

const SLIDE_TYPE_LABELS: Record<DrawerSlideType, string> = {
  SIDE_MOUNT: "Boczne (13mm)",
  UNDERMOUNT: "Podszufladowe (21mm)",
  BOTTOM_MOUNT: "Dolne (13mm)",
  CENTER_MOUNT: "Centralne (0mm)",
};

// ============================================================================
// Drawer Zones Preview (Mini preview within editor)
// Shows zones from BOTTOM to TOP (first zone = bottom)
// ============================================================================

interface DrawerZonesPreviewProps {
  zones: DrawerZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: "up" | "down") => void;
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
  const zoneHeights = zones.map((zone) =>
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
          const boxHeightsMm = zone.boxes.map((box) =>
            Math.round((box.heightRatio / boxTotalRatio) * totalBoxHeightMm)
          );

          return (
            <div
              key={zone.id}
              className={cn(
                "relative rounded border-2 transition-all cursor-pointer overflow-visible",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 z-10"
                  : "border-border hover:border-primary/50 bg-background",
                !hasExternalFront && "border-dashed opacity-70"
              )}
              style={{ flex: zone.heightRatio }}
              onClick={() => onSelectZone(zone.id)}
            >
              {/* Drawer box visualization */}
              <div
                className={cn(
                  "absolute left-1 right-1 border border-dashed rounded-sm pointer-events-none",
                  hasExternalFront
                    ? "border-zone-drawers/60 bg-zone-drawers/5"
                    : "border-muted-foreground/30 bg-muted/10"
                )}
                style={{
                  bottom: "4px",
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
                          boxIdx < boxCount - 1 &&
                            "border-t border-dashed border-muted-foreground/40"
                        )}
                        style={{ height: `${boxPercent}%` }}
                      >
                        {/* Individual box height - vertical text */}
                        <div
                          className={cn(
                            "absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-mono whitespace-nowrap",
                            hasExternalFront ? "text-zone-drawers/80" : "text-muted-foreground/80"
                          )}
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                          }}
                        >
                          {boxHeightMm}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shelves above drawer box visualization */}
              {hasExternalFront &&
                hasReducedBox &&
                zone.aboveBoxContent?.shelves &&
                zone.aboveBoxContent.shelves.length > 0 && (
                  <>
                    {zone.aboveBoxContent.shelves.map((shelf, shelfIdx) => {
                      const shelfCount = zone.aboveBoxContent!.shelves.length;
                      const boxTopPercent = boxToFrontRatio * 100;
                      const remainingPercent = 100 - boxTopPercent;
                      const shelfPositionPercent =
                        shelfIdx === 0
                          ? boxTopPercent
                          : boxTopPercent + (shelfIdx / shelfCount) * remainingPercent;

                      return (
                        <div
                          key={shelf.id}
                          className="absolute left-1 h-0.5 bg-zone-shelves/80 pointer-events-none"
                          style={{
                            bottom: `calc(${shelfPositionPercent}% - 4px)`,
                            width: shelf.depthPreset === "HALF" ? "50%" : "calc(100% - 8px)",
                          }}
                        />
                      );
                    })}
                  </>
                )}

              {/* Zone label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-[10px] font-medium truncate px-1 flex items-center gap-0.5">
                  {hasExternalFront ? "F" : "W"}
                  {boxCount > 1 && <span className="text-muted-foreground">×{boxCount}</span>}
                  {hasReducedBox && (
                    <span className="text-zone-shelves text-[8px]">
                      ({Math.round(boxToFrontRatio * 100)}%)
                    </span>
                  )}
                  {zone.aboveBoxContent?.shelves && zone.aboveBoxContent.shelves.length > 0 && (
                    <span className="text-zone-shelves text-[8px]">
                      +{zone.aboveBoxContent.shelves.length}p
                    </span>
                  )}
                </div>
              </div>

              {/* Zone/Front height - vertical text on right side */}
              <div
                className={cn(
                  "absolute -right-5 top-1/2 -translate-y-1/2 text-[8px] font-mono whitespace-nowrap",
                  hasExternalFront ? "text-primary/70" : "text-muted-foreground/70"
                )}
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                title={
                  hasExternalFront
                    ? `Front: ${drawerZoneHeightMm}mm`
                    : `Strefa: ${drawerZoneHeightMm}mm`
                }
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
                        onMoveZone(zone.id, "up");
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
                        onMoveZone(zone.id, "down");
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
// Individual Drawer Zone Editor
// ============================================================================

interface DrawerZoneEditorProps {
  zone: DrawerZone;
  onUpdate: (zone: DrawerZone) => void;
  onDelete: () => void;
  canDelete: boolean;
  zoneIndex: number;
  zoneHeightMm: number;
}

function DrawerZoneEditor({
  zone,
  onUpdate,
  onDelete,
  canDelete,
  zoneIndex,
  zoneHeightMm,
}: DrawerZoneEditorProps) {
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
    const boxes = Array.from({ length: newCount }, (_, i) => zone.boxes[i] || { heightRatio: 1 });
    onUpdate({ ...zone, boxes });
  };

  const handleBoxToFrontRatioChange = (value: number[]) => {
    const ratio = value[0] / 100;
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
    const newShelves = currentShelves.map((s) => (s.id === shelfId ? { ...s, ...updates } : s));
    onUpdate({
      ...zone,
      aboveBoxContent: { shelves: newShelves },
    });
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h6 className="text-xs font-medium text-muted-foreground">
          Strefa {zoneIndex + 1}{" "}
          <span className="font-mono font-semibold text-foreground">= {zoneHeightMm}mm</span>
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
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {zone.heightRatio}x
          </span>
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
            {hasExternalFront ? "Widoczny" : "Wewnętrzna"}
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
              {Math.round(boxToFrontRatio * 100)}% = {boxHeightMm}mm
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
              : "Szuflada zajmuje pełną wysokość frontu"}
          </p>
        </div>
      )}

      {/* Shelves above drawer box */}
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
                <p className="text-[9px] text-zone-shelves">
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
                disabled={
                  (zone.aboveBoxContent?.shelves.length ?? 0) >=
                  INTERIOR_CONFIG.MAX_SHELVES_ABOVE_DRAWER
                }
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

          {boxToFrontRatio < 1.0 &&
            zone.aboveBoxContent?.shelves &&
            zone.aboveBoxContent.shelves.length > 0 && (
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {zone.aboveBoxContent.shelves.map((shelf, shelfIdx) => {
                  const shelfCount = zone.aboveBoxContent!.shelves.length;
                  const spaceHeight = zoneHeightMm - boxHeightMm;
                  const shelfPositionMm =
                    shelfIdx === 0
                      ? boxHeightMm
                      : boxHeightMm + (shelfIdx / shelfCount) * spaceHeight;

                  return (
                    <div
                      key={shelf.id}
                      className="flex items-center gap-2 p-1.5 border rounded bg-zone-shelves/5"
                    >
                      <span className="text-[10px] font-medium w-14 text-zone-shelves">
                        Półka {shelfIdx + 1}
                      </span>
                      <Select
                        value={shelf.depthPreset}
                        onValueChange={(v) =>
                          handleUpdateAboveBoxShelf(shelf.id, {
                            depthPreset: v as ShelfDepthPreset,
                            customDepth: v === "CUSTOM" ? (shelf.customDepth ?? 150) : undefined,
                          })
                        }
                      >
                        <SelectTrigger className="h-5 text-[10px] flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL" className="text-xs">
                            Pełna
                          </SelectItem>
                          <SelectItem value="HALF" className="text-xs">
                            Połowa
                          </SelectItem>
                          <SelectItem value="CUSTOM" className="text-xs">
                            Własna
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {shelf.depthPreset === "CUSTOM" && (
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

          {boxToFrontRatio < 1.0 &&
            zone.aboveBoxContent?.shelves &&
            zone.aboveBoxContent.shelves.length > 0 && (
              <p className="text-[8px] text-zone-shelves">
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
        <p className="text-[10px] text-zone-drawers bg-zone-drawers/10 p-1.5 rounded">
          {hasExternalFront
            ? `Jeden front zakrywa ${boxCount} szuflady`
            : `${boxCount} wewnętrzne szuflady`}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Drawers Editor Component
// ============================================================================

interface DrawersEditorProps {
  config: DrawerConfiguration;
  onChange: (config: DrawerConfiguration) => void;
  /** Zone height in mm */
  zoneHeightMm: number;
  /** Cabinet width in mm */
  cabinetWidth: number;
  /** Available materials */
  materials: Material[];
  /** Default body material ID */
  bodyMaterialId: string;
  /** Callback when drawer box material changes */
  onBoxMaterialChange?: (materialId: string) => void;
  /** Callback when drawer bottom material changes */
  onBottomMaterialChange?: (materialId: string) => void;
  className?: string;
}

export function DrawersEditor({
  config,
  onChange,
  zoneHeightMm,
  cabinetWidth,
  materials,
  bodyMaterialId,
  onBoxMaterialChange,
  onBottomMaterialChange,
  className,
}: DrawersEditorProps) {
  // State for selected drawer zone
  const [selectedDrawerZoneId, setSelectedDrawerZoneId] = useState<string | null>(
    config.zones[0]?.id ?? null
  );

  // Calculate drawer box width
  const drawerBoxWidth = useMemo(() => {
    const slideConfig = DRAWER_SLIDE_PRESETS[config.slideType];
    return cabinetWidth - 2 * slideConfig.sideOffset - 2 * DEFAULT_BODY_THICKNESS;
  }, [config.slideType, cabinetWidth]);

  // Selected drawer zone and its calculated height
  const selectedDrawerZone = useMemo(() => {
    return config.zones.find((z) => z.id === selectedDrawerZoneId) ?? null;
  }, [config.zones, selectedDrawerZoneId]);

  const selectedDrawerZoneIndex = useMemo(() => {
    if (!selectedDrawerZoneId) return -1;
    return config.zones.findIndex((z) => z.id === selectedDrawerZoneId);
  }, [config.zones, selectedDrawerZoneId]);

  // Calculate drawer zone heights in mm
  const drawerZoneHeightsMm = useMemo(() => {
    const zoneTotalRatio = config.zones.reduce((s, z) => s + z.heightRatio, 0);
    return config.zones.map((z) => Math.round((z.heightRatio / zoneTotalRatio) * zoneHeightMm));
  }, [config.zones, zoneHeightMm]);

  const selectedDrawerZoneHeightMm =
    selectedDrawerZoneIndex >= 0 ? drawerZoneHeightsMm[selectedDrawerZoneIndex] : 0;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSlideTypeChange = (slideType: DrawerSlideType) => {
    onChange({ ...config, slideType });
  };

  const handleAddDrawerZone = () => {
    if (config.zones.length >= INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE) return;

    const newZone: DrawerZone = {
      id: generateZoneId(),
      heightRatio: 1,
      front: {},
      boxes: [{ heightRatio: 1 }],
    };

    onChange({
      ...config,
      zones: [...config.zones, newZone],
    });
    setSelectedDrawerZoneId(newZone.id);
  };

  const handleDeleteDrawerZone = (drawerZoneId: string) => {
    const newZones = config.zones.filter((z) => z.id !== drawerZoneId);
    if (newZones.length === 0) return;

    if (selectedDrawerZoneId === drawerZoneId) {
      setSelectedDrawerZoneId(newZones[0].id);
    }

    onChange({
      ...config,
      zones: newZones,
    });
  };

  const handleUpdateDrawerZone = (updatedDrawerZone: DrawerZone) => {
    onChange({
      ...config,
      zones: config.zones.map((z) => (z.id === updatedDrawerZone.id ? updatedDrawerZone : z)),
    });
  };

  const handleMoveDrawerZone = (drawerZoneId: string, direction: "up" | "down") => {
    const zones = [...config.zones];
    const index = zones.findIndex((z) => z.id === drawerZoneId);
    if (index === -1) return;

    // 'up' means higher in cabinet = higher index, 'down' means lower = lower index
    const newIndex = direction === "up" ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= zones.length) return;

    [zones[index], zones[newIndex]] = [zones[newIndex], zones[index]];
    onChange({ ...config, zones });
  };

  const handleApplyDrawerPreset = (presetKey: string) => {
    const preset = DRAWER_ZONE_PRESETS[presetKey];
    if (!preset) return;

    const newZones = preset.config.zones.map((z) => ({ ...z, id: generateZoneId() }));
    onChange({
      ...preset.config,
      zones: newZones,
    });
    setSelectedDrawerZoneId(newZones[0]?.id ?? null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("space-y-4 pt-3 border-t", className)}>
      <h5 className="text-sm font-medium text-zone-drawers flex items-center gap-2">
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
              {preset.labelPl.split(" ")[0]}
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
            zones={config.zones}
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
            disabled={config.zones.length >= INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE}
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
              canDelete={config.zones.length > 1}
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
          value={config.slideType}
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
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-zone-shelves"></span>
          Luz boczny: {DRAWER_SLIDE_PRESETS[config.slideType].sideOffset}mm/stronę
        </p>
      </div>

      {/* Drawer materials selector */}
      <div className="space-y-3 bg-muted/10 p-3 rounded-lg border">
        <Label className="text-sm font-medium">Materiały szuflady</Label>

        {/* Box material (sides, back, front) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Box (boki, tył, przód)</Label>
          <Select
            value={config.boxMaterialId ?? bodyMaterialId}
            onValueChange={(value) => {
              onChange({
                ...config,
                boxMaterialId: value === bodyMaterialId ? undefined : value,
              });
              onBoxMaterialChange?.(value);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Wybierz materiał" />
            </SelectTrigger>
            <SelectContent>
              {materials
                .filter((m) => m.category === "board")
                .map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm border"
                        style={{ backgroundColor: material.color }}
                      />
                      <span>{material.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({material.thickness}mm)
                      </span>
                      {material.id === bodyMaterialId && (
                        <span className="text-xs text-zone-shelves">(korpus)</span>
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
            value={config.bottomMaterialId ?? ""}
            onValueChange={(value) => {
              onChange({
                ...config,
                bottomMaterialId: value,
              });
              onBottomMaterialChange?.(value);
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
                    {material.category === "hdf" && (
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
          {Drawer.getFrontCount(config)} frontów • {Drawer.getTotalBoxCount(config)} szuflad
        </span>
        <span className="font-mono font-semibold text-foreground">
          = {Math.round(drawerBoxWidth)} mm szer.
        </span>
      </div>

      {/* Positioning info */}
      <div className="text-xs text-zone-drawers bg-zone-drawers/10 p-2 rounded">
        Pierwsza strefa (szuflada) na dole sekcji, kolejne układane do góry.
      </div>
    </div>
  );
}

export default DrawersEditor;
