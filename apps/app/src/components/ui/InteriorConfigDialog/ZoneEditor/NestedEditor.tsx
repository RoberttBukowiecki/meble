"use client";

/**
 * Nested Editor Component
 *
 * Editor for NESTED zone type - handles division direction, child zones,
 * width configuration for vertical divisions, and partition management.
 */

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
  InteriorZone,
  ZoneDivisionDirection,
  ZoneSizeMode,
  PartitionConfig,
  PartitionDepthPreset,
} from "@/types";
import { INTERIOR_CONFIG, DEFAULT_BODY_THICKNESS } from "@/lib/config";
import {
  Grid,
  Rows,
  Columns,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  SplitSquareHorizontal,
} from "lucide-react";
import { DepthPresetSelector, type DepthPreset } from "../DepthPresetSelector";

// ============================================================================
// Types & Constants
// ============================================================================

const DIVISION_DIRECTION_OPTIONS: {
  value: ZoneDivisionDirection;
  label: string;
  icon: typeof Rows;
}[] = [
  { value: "HORIZONTAL", label: "Wiersze", icon: Rows },
  { value: "VERTICAL", label: "Kolumny", icon: Columns },
];

const WIDTH_MODE_LABELS: Record<ZoneSizeMode, string> = {
  FIXED: "Stała (mm)",
  PROPORTIONAL: "Proporcjonalna",
};

// ============================================================================
// Toggle Button Group (local helper)
// ============================================================================

interface ToggleOption<T> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function ToggleButtonGroup<T extends string>({
  value,
  onChange,
  options,
  showIcons = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  showIcons?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-auto py-2",
              showIcons && "flex flex-col gap-1",
              isSelected && "ring-2 ring-primary/20"
            )}
            onClick={() => onChange(option.value)}
          >
            {showIcons && Icon && <Icon className="h-4 w-4" />}
            <span className={cn(showIcons ? "text-xs" : "text-sm")}>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface NestedEditorProps {
  zone: InteriorZone;
  onChange: (zone: InteriorZone) => void;
  /** Cabinet width in mm */
  cabinetWidth: number;
  /** Cabinet depth in mm */
  cabinetDepth: number;
  className?: string;
}

export function NestedEditor({
  zone,
  onChange,
  cabinetWidth,
  cabinetDepth,
  className,
}: NestedEditorProps) {
  const divisionDirection = zone.divisionDirection ?? "HORIZONTAL";
  const children = zone.children ?? [];
  const partitions = zone.partitions ?? [];

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDivisionDirectionChange = (direction: ZoneDivisionDirection) => {
    const newZone = { ...zone, divisionDirection: direction };
    const childCount = children.length;
    const partitionCount = Math.max(0, childCount - 1);

    // When switching to VERTICAL, initialize width configs for children
    if (direction === "VERTICAL" && children.length > 0) {
      newZone.children = children.map((child) => ({
        ...child,
        widthConfig: child.widthConfig ?? { mode: "PROPORTIONAL", ratio: 1 },
      }));
    } else if (direction === "HORIZONTAL" && children.length > 0) {
      // Clear width configs when switching to HORIZONTAL
      newZone.children = children.map((child) => {
        const { widthConfig, ...rest } = child;
        return rest;
      });
    }

    // Initialize/update partitions for both directions (n-1 for n children)
    if (partitionCount > 0) {
      const existingPartitions = partitions;
      newZone.partitions = Array.from(
        { length: partitionCount },
        (_, i) =>
          existingPartitions[i] ?? {
            id: crypto.randomUUID(),
            enabled: false,
            depthPreset: "FULL" as PartitionDepthPreset,
          }
      );
    } else {
      newZone.partitions = undefined;
    }

    onChange(newZone);
  };

  const handleRemoveChild = () => {
    if (children.length <= 1) return;
    const newChildren = children.slice(0, -1);
    const newPartitions =
      partitions.length > 0 ? partitions.slice(0, Math.max(0, newChildren.length - 1)) : undefined;
    onChange({
      ...zone,
      children: newChildren,
      partitions: newPartitions?.length ? newPartitions : undefined,
    });
  };

  const handleAddChild = () => {
    if (children.length >= (INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE ?? 6)) return;

    const newChild: InteriorZone = {
      id: crypto.randomUUID(),
      contentType: "EMPTY",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: zone.depth + 1,
      ...(divisionDirection === "VERTICAL" && {
        widthConfig: { mode: "PROPORTIONAL", ratio: 1 },
      }),
    };

    const newPartition: PartitionConfig = {
      id: crypto.randomUUID(),
      enabled: false,
      depthPreset: "FULL",
    };

    onChange({
      ...zone,
      children: [...children, newChild],
      partitions: [...partitions, newPartition],
    });
  };

  const handleMoveChild = (idx: number, direction: "left" | "right") => {
    const newChildren = [...children];
    const newPartitions = partitions.length > 0 ? [...partitions] : [];
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    // Swap children
    [newChildren[idx], newChildren[newIdx]] = [newChildren[newIdx], newChildren[idx]];
    onChange({ ...zone, children: newChildren, partitions: newPartitions });
  };

  const handleUpdateChildWidth = (idx: number, widthConfig: InteriorZone["widthConfig"]) => {
    const newChildren = [...children];
    newChildren[idx] = { ...newChildren[idx], widthConfig };
    onChange({ ...zone, children: newChildren });
  };

  const handleTogglePartition = (idx: number, enabled: boolean) => {
    const newPartitions = [...partitions];
    newPartitions[idx] = { ...newPartitions[idx], enabled };
    onChange({ ...zone, partitions: newPartitions });
  };

  const handleUpdatePartitionDepth = (
    idx: number,
    depthPreset: PartitionDepthPreset,
    customDepth?: number
  ) => {
    const newPartitions = [...partitions];
    newPartitions[idx] = { ...newPartitions[idx], depthPreset, customDepth };
    onChange({ ...zone, partitions: newPartitions });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("pt-3 border-t space-y-4", className)}>
      <h5 className="text-sm font-medium text-zone-nested flex items-center gap-2">
        <Grid className="h-4 w-4" />
        Podział na sekcje
      </h5>

      {/* Division direction */}
      <div className="space-y-2">
        <Label className="text-xs">Kierunek podziału</Label>
        <ToggleButtonGroup
          value={divisionDirection}
          onChange={handleDivisionDirectionChange}
          options={DIVISION_DIRECTION_OPTIONS}
          showIcons
        />
      </div>

      {/* Child zones management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {divisionDirection === "VERTICAL" ? "Kolumny" : "Sekcje"} ({children.length})
          </Label>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={handleRemoveChild}
              disabled={children.length <= 1}
              title="Usuń ostatnią"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddChild}
              disabled={children.length >= (INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE ?? 6)}
              title="Dodaj"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Width configuration for VERTICAL division with reordering */}
      {divisionDirection === "VERTICAL" && children.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs">Szerokości kolumn</Label>
          <div className="space-y-2">
            {children.map((child, idx) => {
              const widthConfig = child.widthConfig ?? { mode: "PROPORTIONAL", ratio: 1 };
              const canMoveLeft = idx > 0;
              const canMoveRight = idx < children.length - 1;

              return (
                <div key={child.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  {/* Move buttons */}
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveChild(idx, "left")}
                      disabled={!canMoveLeft}
                      title="Przesuń w lewo"
                    >
                      <ChevronUp className="h-3 w-3 -rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveChild(idx, "right")}
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
                      handleUpdateChildWidth(idx, {
                        mode,
                        ...(mode === "FIXED" ? { fixedMm: 400 } : { ratio: 1 }),
                      });
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
                  {widthConfig.mode === "FIXED" ? (
                    <NumberInput
                      value={widthConfig.fixedMm ?? 400}
                      min={INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM ?? 100}
                      max={cabinetWidth - DEFAULT_BODY_THICKNESS * 2}
                      onChange={(val) => {
                        handleUpdateChildWidth(idx, { mode: "FIXED", fixedMm: val });
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
                          handleUpdateChildWidth(idx, { mode: "PROPORTIONAL", ratio: val });
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

      {/* Partition configuration */}
      {partitions.length > 0 && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-dashed">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-2">
              <SplitSquareHorizontal className="h-3 w-3" />
              {divisionDirection === "VERTICAL" ? "Przegrody pionowe" : "Przegrody poziome"}
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {partitions.filter((p) => p.enabled).length} / {partitions.length} aktywnych
            </span>
          </div>
          <div className="space-y-2">
            {partitions.map((partition, idx) => {
              const isVertical = divisionDirection === "VERTICAL";
              const beforeLabel = isVertical ? `Kol. ${idx + 1}` : `Sek. ${idx + 1}`;
              const afterLabel = isVertical ? `Kol. ${idx + 2}` : `Sek. ${idx + 2}`;

              // Calculate displayed depth
              const displayDepth =
                partition.depthPreset === "FULL"
                  ? cabinetDepth - 10
                  : partition.depthPreset === "HALF"
                    ? Math.round((cabinetDepth - 10) / 2)
                    : (partition.customDepth ?? Math.round(cabinetDepth * 0.75));

              return (
                <div
                  key={partition.id}
                  className={cn(
                    "p-2 rounded border transition-colors",
                    partition.enabled
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  {/* Header with toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`partition-${partition.id}`}
                        checked={partition.enabled}
                        onCheckedChange={(enabled) => handleTogglePartition(idx, enabled)}
                      />
                      <Label
                        htmlFor={`partition-${partition.id}`}
                        className="text-xs cursor-pointer"
                      >
                        {beforeLabel} ↔ {afterLabel}
                      </Label>
                    </div>
                    {partition.enabled && (
                      <span className="text-[10px] text-muted-foreground font-mono font-semibold">
                        = {displayDepth}mm
                      </span>
                    )}
                  </div>

                  {/* Depth configuration - only when enabled */}
                  {partition.enabled && (
                    <DepthPresetSelector
                      value={partition.depthPreset as DepthPreset}
                      onChange={(preset, customDepth) => {
                        handleUpdatePartitionDepth(
                          idx,
                          preset as PartitionDepthPreset,
                          customDepth
                        );
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
            {divisionDirection === "VERTICAL"
              ? "Przegrody pionowe rozdzielają kolumny."
              : "Przegrody poziome rozdzielają sekcje."}
          </p>
        </div>
      )}

      {/* Info text */}
      <div className="text-xs text-zone-nested bg-zone-nested/10 p-2 rounded">
        {divisionDirection === "VERTICAL"
          ? "Kolumny ułożone od lewej do prawej. Wybierz konkretną kolumnę w podglądzie aby ją edytować."
          : "Sekcje ułożone od dołu do góry. Wybierz konkretną sekcję w podglądzie aby ją edytować."}
      </div>
    </div>
  );
}

export default NestedEditor;
