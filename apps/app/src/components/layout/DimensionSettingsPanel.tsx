"use client";

/**
 * DimensionSettingsPanel Component
 *
 * Unified control panel for all dimension-related settings.
 * Combines distance dimensions and object dimensions (W/H/D) into
 * a single, elegant dropdown with collapsible sections.
 */

import { useCallback, useState } from "react";
import { Ruler, ChevronDown, Layers, LayoutGrid, Box, Move3D, type LucideIcon } from "lucide-react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Switch,
  Slider,
  Label,
  cn,
} from "@meble/ui";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { KEYBOARD_SHORTCUTS, formatShortcutLabel } from "@/lib/config";
import type { ObjectDimensionMode, ObjectDimensionGranularity } from "@/types";

// Collapsible section component with smooth animations
function SettingsSection({
  title,
  icon: Icon,
  enabled,
  onToggle,
  children,
  shortcut,
}: {
  title: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card/30">
      {/* Section header with toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 transition-colors",
          "hover:bg-accent/5",
          enabled && "bg-primary/5"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            enabled ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-col items-start">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              enabled ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {title}
          </span>
          {shortcut && <span className="text-[10px] text-muted-foreground/70">{shortcut}</span>}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-primary"
        />
      </button>

      {/* Expandable settings area */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/30 bg-muted/20 px-3 py-3 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Radio option for mode/granularity selection
function RadioOption({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

// Slider setting with label and value
function SliderSetting({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-medium tabular-nums text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

// Checkbox option for boolean settings
function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          "h-3.5 w-3.5 rounded border-muted-foreground/30 text-primary",
          "focus:ring-primary focus:ring-offset-0",
          "transition-colors"
        )}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </label>
  );
}

export function DimensionSettingsPanel() {
  const [open, setOpen] = useState(false);

  const {
    dimensionSettings,
    updateDimensionSettings,
    objectDimensionSettings,
    updateObjectDimensionSettings,
    toggleObjectDimensions,
  } = useStore(
    useShallow((state) => ({
      dimensionSettings: state.dimensionSettings,
      updateDimensionSettings: state.updateDimensionSettings,
      objectDimensionSettings: state.objectDimensionSettings,
      updateObjectDimensionSettings: state.updateObjectDimensionSettings,
      toggleObjectDimensions: state.toggleObjectDimensions,
    }))
  );

  // Check if any dimension feature is enabled
  const anyEnabled = dimensionSettings?.enabled || objectDimensionSettings?.enabled;

  // Distance dimensions handlers
  const toggleDistanceDimensions = useCallback(() => {
    updateDimensionSettings({ enabled: !dimensionSettings?.enabled });
  }, [dimensionSettings?.enabled, updateDimensionSettings]);

  const handleMaxDistanceChange = useCallback(
    (value: number) => {
      updateDimensionSettings({ maxDistanceThreshold: value });
    },
    [updateDimensionSettings]
  );

  const handleMaxVisibleChange = useCallback(
    (value: number) => {
      updateDimensionSettings({ maxVisiblePerAxis: value });
    },
    [updateDimensionSettings]
  );

  // Object dimensions handlers
  const handleModeChange = useCallback(
    (mode: ObjectDimensionMode) => {
      updateObjectDimensionSettings({ mode });
    },
    [updateObjectDimensionSettings]
  );

  const handleGranularityChange = useCallback(
    (granularity: ObjectDimensionGranularity) => {
      updateObjectDimensionSettings({ granularity });
    },
    [updateObjectDimensionSettings]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={anyEnabled ? "default" : "ghost"}
            size="sm"
            className={cn("h-11 md:h-8 gap-1.5 px-2 transition-all", anyEnabled && "shadow-sm")}
            title="Ustawienia wymiarów"
          >
            <Ruler className="h-5 w-5 md:h-4 md:w-4" />
            <ChevronDown
              className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className={cn(
            "w-72 p-0 overflow-hidden",
            "border-border/50 bg-background/95 backdrop-blur-md",
            "shadow-lg shadow-black/10"
          )}
        >
          {/* Header */}
          <div className="border-b border-border/30 bg-muted/30 px-3 py-2">
            <h3 className="text-sm font-semibold text-foreground">Ustawienia wymiarów</h3>
            <p className="text-[10px] text-muted-foreground">
              Kontroluj wyświetlanie wymiarów w scenie
            </p>
          </div>

          {/* Content */}
          <div className="p-2 space-y-2">
            {/* Distance Dimensions Section */}
            <SettingsSection
              title="Odległości"
              icon={Move3D}
              enabled={dimensionSettings?.enabled ?? false}
              onToggle={toggleDistanceDimensions}
            >
              <SliderSetting
                label="Maksymalny zasięg"
                value={dimensionSettings?.maxDistanceThreshold ?? 1000}
                onChange={handleMaxDistanceChange}
                min={100}
                max={5000}
                step={100}
                unit="mm"
              />

              <SliderSetting
                label="Max linii na oś"
                value={dimensionSettings?.maxVisiblePerAxis ?? 3}
                onChange={handleMaxVisibleChange}
                min={1}
                max={10}
                step={1}
              />

              <CheckboxOption
                label="Kolory według osi"
                checked={dimensionSettings?.showAxisColors ?? false}
                onChange={(checked) => updateDimensionSettings({ showAxisColors: checked })}
              />
            </SettingsSection>

            {/* Object Dimensions Section */}
            <SettingsSection
              title="Wymiary obiektów"
              icon={Box}
              enabled={objectDimensionSettings?.enabled ?? false}
              onToggle={toggleObjectDimensions}
              shortcut={formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS)}
            >
              {/* Mode selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tryb wyświetlania</Label>
                <div className="flex gap-1">
                  <RadioOption
                    icon={Layers}
                    label="Zaznaczone"
                    selected={objectDimensionSettings?.mode === "selection"}
                    onClick={() => handleModeChange("selection")}
                  />
                  <RadioOption
                    icon={LayoutGrid}
                    label="Wszystkie"
                    selected={objectDimensionSettings?.mode === "all"}
                    onClick={() => handleModeChange("all")}
                  />
                </div>
              </div>

              {/* Granularity selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Poziom szczegółowości</Label>
                <div className="flex gap-1">
                  <RadioOption
                    label="Szafki"
                    selected={objectDimensionSettings?.granularity === "group"}
                    onClick={() => handleGranularityChange("group")}
                  />
                  <RadioOption
                    label="Części"
                    selected={objectDimensionSettings?.granularity === "part"}
                    onClick={() => handleGranularityChange("part")}
                  />
                </div>
              </div>

              {/* Visual options */}
              <div className="space-y-1 pt-1 border-t border-border/30">
                <CheckboxOption
                  label="Pokaż etykiety (W/H/D)"
                  checked={objectDimensionSettings?.showLabels ?? true}
                  onChange={(checked) => updateObjectDimensionSettings({ showLabels: checked })}
                />
                <CheckboxOption
                  label="Kolory według osi"
                  checked={objectDimensionSettings?.showAxisColors ?? false}
                  onChange={(checked) => updateObjectDimensionSettings({ showAxisColors: checked })}
                />
              </div>
            </SettingsSection>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
