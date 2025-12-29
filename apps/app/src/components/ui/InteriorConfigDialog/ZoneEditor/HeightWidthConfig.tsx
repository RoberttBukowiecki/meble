"use client";

/**
 * Height and Width Configuration Components
 *
 * Provides controls for zone height (ratio/exact) and width (proportional/fixed)
 * with calculated dimension display.
 */

import {
  Label,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NumberInput,
  cn,
} from "@meble/ui";
import type { ZoneHeightConfig, ZoneWidthConfig, ZoneSizeMode } from "@/types";
import { INTERIOR_CONFIG, DEFAULT_BODY_THICKNESS } from "@/lib/config";

// ============================================================================
// Height Configuration
// ============================================================================

interface HeightConfigProps {
  heightConfig: ZoneHeightConfig;
  onChange: (config: ZoneHeightConfig) => void;
  /** Total ratio of all sibling zones */
  totalRatio: number;
  /** Available interior height in mm */
  interiorHeight: number;
  /** Calculated zone height in mm */
  zoneHeightMm: number;
  className?: string;
}

export function HeightConfig({
  heightConfig,
  onChange,
  totalRatio,
  interiorHeight,
  zoneHeightMm,
  className,
}: HeightConfigProps) {
  const currentRatio = heightConfig.mode === "RATIO" ? (heightConfig.ratio ?? 1) : 1;

  // Only show if there are multiple sibling zones
  if (totalRatio <= currentRatio) {
    return null;
  }

  const handleRatioChange = (value: number[]) => {
    onChange({
      mode: "RATIO",
      ratio: value[0],
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Wysokość (proporcja)</Label>
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex items-center gap-1.5">
          <span className="text-muted-foreground">{currentRatio}x</span>
          <span className="text-foreground font-semibold">= {zoneHeightMm}mm</span>
        </span>
      </div>
      <Slider
        value={[currentRatio]}
        onValueChange={handleRatioChange}
        min={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MIN}
        max={INTERIOR_CONFIG.ZONE_HEIGHT_RATIO_MAX}
        step={1}
      />
    </div>
  );
}

// ============================================================================
// Width Configuration
// ============================================================================

interface WidthConfigProps {
  widthConfig: ZoneWidthConfig;
  onChange: (config: ZoneWidthConfig) => void;
  /** Cabinet width in mm */
  cabinetWidth: number;
  /** Calculated zone width in mm (optional, for display) */
  zoneWidthMm?: number;
  className?: string;
}

const WIDTH_MODE_LABELS: Record<ZoneSizeMode, string> = {
  FIXED: "Stała (mm)",
  PROPORTIONAL: "Proporcjonalna",
};

export function WidthConfig({
  widthConfig,
  onChange,
  cabinetWidth,
  zoneWidthMm,
  className,
}: WidthConfigProps) {
  const displayValue =
    widthConfig.mode === "FIXED" ? `${widthConfig.fixedMm ?? 400}mm` : `${widthConfig.ratio ?? 1}x`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Szerokość</Label>
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex items-center gap-1.5">
          <span className="text-muted-foreground">{displayValue}</span>
          {zoneWidthMm && <span className="text-foreground font-semibold">= {zoneWidthMm}mm</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={widthConfig.mode}
          onValueChange={(mode: ZoneSizeMode) => {
            onChange({
              mode,
              ...(mode === "FIXED" ? { fixedMm: 400 } : { ratio: 1 }),
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
        {widthConfig.mode === "FIXED" ? (
          <NumberInput
            value={widthConfig.fixedMm ?? 400}
            min={INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM ?? 100}
            max={cabinetWidth - DEFAULT_BODY_THICKNESS * 2}
            onChange={(val) => {
              onChange({ mode: "FIXED", fixedMm: val });
            }}
            className="h-8 flex-1"
          />
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <Slider
              value={[widthConfig.ratio ?? 1]}
              min={0.5}
              max={5}
              step={0.5}
              onValueChange={([val]) => {
                onChange({ mode: "PROPORTIONAL", ratio: val });
              }}
              className="flex-1"
            />
            <span className="text-xs font-mono w-8 text-right">{widthConfig.ratio ?? 1}x</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default { HeightConfig, WidthConfig };
