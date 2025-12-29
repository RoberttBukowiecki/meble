"use client";

/**
 * Shelves Editor Component
 *
 * Full-featured editor for shelf configuration within a zone.
 * Supports UNIFORM mode (all shelves same depth) and MANUAL mode (individual depths).
 */

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NumberInput,
  cn,
} from "@meble/ui";
import type { ShelvesConfiguration, ShelfDepthPreset, Material } from "@/types";
import { generateShelfId } from "@/types";
import { INTERIOR_CONFIG } from "@/lib/config";
import { Layers, Plus, Minus } from "lucide-react";

// ============================================================================
// Types & Constants
// ============================================================================

const DEPTH_PRESET_LABELS: Record<ShelfDepthPreset, string> = {
  FULL: "Pełna",
  HALF: "Połowa",
  CUSTOM: "Własna",
};

interface ShelvesEditorProps {
  config: ShelvesConfiguration;
  onChange: (config: ShelvesConfiguration) => void;
  /** Cabinet depth in mm */
  cabinetDepth: number;
  /** Available materials */
  materials: Material[];
  /** Default body material ID */
  bodyMaterialId: string;
  /** Callback when shelf material changes */
  onMaterialChange?: (materialId: string) => void;
  className?: string;
}

// ============================================================================
// Toggle Button Group (local helper)
// ============================================================================

interface ToggleOption<T> {
  value: T;
  label: string;
}

function ToggleButtonGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={cn("h-auto py-2", isSelected && "ring-2 ring-primary/20")}
            onClick={() => onChange(option.value)}
          >
            <span className="text-sm">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ShelvesEditor({
  config,
  onChange,
  cabinetDepth,
  materials,
  bodyMaterialId,
  onMaterialChange,
  className,
}: ShelvesEditorProps) {
  // ============================================================================
  // Handlers
  // ============================================================================

  const handleModeChange = (mode: "UNIFORM" | "MANUAL") => {
    // When switching to MANUAL, initialize individual shelf configs from current preset
    let shelves = config.shelves;
    if (mode === "MANUAL" && shelves.length < config.count) {
      shelves = Array.from({ length: config.count }, (_, i) => {
        const existing = config.shelves[i];
        return (
          existing ?? {
            id: generateShelfId(),
            depthPreset: config.depthPreset,
            customDepth: config.customDepth,
          }
        );
      });
    }

    onChange({ ...config, mode, shelves });
  };

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(
      0,
      Math.min(INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE, config.count + delta)
    );

    // In MANUAL mode, adjust shelves array
    let shelves = config.shelves;
    if (config.mode === "MANUAL") {
      if (newCount > shelves.length) {
        // Add new shelves
        const newShelves = [...shelves];
        for (let i = shelves.length; i < newCount; i++) {
          newShelves.push({
            id: generateShelfId(),
            depthPreset: config.depthPreset,
            customDepth: config.customDepth,
          });
        }
        shelves = newShelves;
      } else {
        // Trim shelves array
        shelves = shelves.slice(0, newCount);
      }
    }

    onChange({ ...config, count: newCount, shelves });
  };

  const handleDepthPresetChange = (preset: ShelfDepthPreset) => {
    onChange({
      ...config,
      depthPreset: preset,
      customDepth: preset === "CUSTOM" ? (config.customDepth ?? cabinetDepth / 2) : undefined,
    });
  };

  const handleCustomDepthChange = (value: number) => {
    onChange({
      ...config,
      customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
    });
  };

  const handleIndividualShelfDepthChange = (shelfIndex: number, preset: ShelfDepthPreset) => {
    const shelves = [...config.shelves];
    const existing = shelves[shelfIndex] ?? {
      id: generateShelfId(),
      depthPreset: "FULL",
    };
    shelves[shelfIndex] = {
      ...existing,
      depthPreset: preset,
      customDepth: preset === "CUSTOM" ? (existing.customDepth ?? cabinetDepth / 2) : undefined,
    };

    onChange({ ...config, shelves });
  };

  const handleIndividualShelfCustomDepthChange = (shelfIndex: number, value: number) => {
    const shelves = [...config.shelves];
    const existing = shelves[shelfIndex] ?? {
      id: generateShelfId(),
      depthPreset: "CUSTOM",
    };
    shelves[shelfIndex] = {
      ...existing,
      customDepth: Math.max(50, Math.min(cabinetDepth - 10, value)),
    };

    onChange({ ...config, shelves });
  };

  const handleMaterialChange = (value: string) => {
    onChange({
      ...config,
      materialId: value === bodyMaterialId ? undefined : value,
    });
    onMaterialChange?.(value);
  };

  // ============================================================================
  // Calculated values
  // ============================================================================

  const calculateDepth = (preset: ShelfDepthPreset, customDepth?: number) => {
    if (preset === "FULL") return cabinetDepth - 10;
    if (preset === "HALF") return Math.round((cabinetDepth - 10) / 2);
    return customDepth ?? cabinetDepth / 2;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("space-y-4 pt-3 border-t", className)}>
      <h5 className="text-sm font-medium text-zone-shelves flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Konfiguracja półek
      </h5>

      {/* Mode selector */}
      <div className="space-y-2">
        <Label className="text-sm">Tryb</Label>
        <ToggleButtonGroup
          value={config.mode}
          onChange={handleModeChange}
          options={[
            { value: "UNIFORM", label: "Jednolita głębokość" },
            { value: "MANUAL", label: "Różne głębokości" },
          ]}
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
            onClick={() => handleCountChange(-1)}
            disabled={config.count <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-10 text-center text-sm font-medium">{config.count}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none border-l"
            onClick={() => handleCountChange(1)}
            disabled={config.count >= 10}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Shelf material selector - only in UNIFORM mode */}
      {config.mode === "UNIFORM" && (
        <div className="space-y-2">
          <Label className="text-sm">Materiał półek</Label>
          <Select value={config.materialId ?? bodyMaterialId} onValueChange={handleMaterialChange}>
            <SelectTrigger className="h-9">
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
      )}

      {/* UNIFORM MODE: Single depth preset for all shelves */}
      {config.mode === "UNIFORM" && (
        <>
          {/* Depth preset */}
          <div className="space-y-2">
            <Label className="text-sm">Głębokość półek</Label>
            <ToggleButtonGroup
              value={config.depthPreset}
              onChange={handleDepthPresetChange}
              options={(Object.keys(DEPTH_PRESET_LABELS) as ShelfDepthPreset[]).map((preset) => ({
                value: preset,
                label: DEPTH_PRESET_LABELS[preset],
              }))}
            />
          </div>

          {/* Custom depth input */}
          {config.depthPreset === "CUSTOM" && (
            <div className="space-y-2">
              <Label className="text-sm">Własna głębokość (mm)</Label>
              <NumberInput
                value={config.customDepth ?? cabinetDepth / 2}
                onChange={handleCustomDepthChange}
                min={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN}
                max={cabinetDepth - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET}
                allowNegative={false}
                className="w-full h-9"
              />
            </div>
          )}

          {/* Calculated depth display */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex justify-between items-center">
            <span>Rzeczywista głębokość:</span>
            <span className="font-mono font-semibold text-foreground">
              {calculateDepth(config.depthPreset, config.customDepth)}mm
            </span>
          </div>
        </>
      )}

      {/* MANUAL MODE: Individual depth for each shelf */}
      {config.mode === "MANUAL" && config.count > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Głębokość każdej półki</Label>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {Array.from({ length: config.count }).map((_, i) => {
              const shelfConfig = config.shelves[i];
              const shelfDepthPreset = shelfConfig?.depthPreset ?? config.depthPreset;
              const shelfCustomDepth = shelfConfig?.customDepth ?? config.customDepth;
              const actualDepth = calculateDepth(shelfDepthPreset, shelfCustomDepth);

              return (
                <div key={i} className="flex items-center gap-2 p-2 border rounded bg-background">
                  <span className="text-xs font-medium w-16">Półka {i + 1}</span>
                  <Select
                    value={shelfDepthPreset}
                    onValueChange={(v) =>
                      handleIndividualShelfDepthChange(i, v as ShelfDepthPreset)
                    }
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
                  {shelfDepthPreset === "CUSTOM" && (
                    <NumberInput
                      value={shelfCustomDepth ?? cabinetDepth / 2}
                      onChange={(v) => handleIndividualShelfCustomDepthChange(i, v)}
                      min={INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN}
                      max={cabinetDepth - INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_OFFSET}
                      allowNegative={false}
                      className="w-20 h-7 text-xs"
                    />
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground w-14 text-right font-semibold">
                    = {actualDepth}mm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Positioning info */}
      <div className="text-xs text-zone-shelves bg-zone-shelves/10 p-2 rounded">
        Pierwsza półka na dole sekcji, kolejne rozmieszczone proporcjonalnie do góry.
      </div>
    </div>
  );
}

export default ShelvesEditor;
