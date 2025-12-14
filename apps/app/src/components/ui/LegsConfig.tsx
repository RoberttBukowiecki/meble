/**
 * Legs configuration component for cabinet settings
 */

import {
  Button,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@meble/ui';
import { CabinetParams, LegsConfig as LegsConfigType, LegPreset, LegFinish, LegShape, LegCountMode } from '@/types';
import {
  LEG_PRESET_OPTIONS,
  LEG_FINISH_OPTIONS,
  LEG_SHAPE_OPTIONS,
  LEG_COUNT_MODE_OPTIONS,
  LEG_DEFAULTS,
} from '@/lib/config';
import { LegsDomain } from '@/lib/domain/legs';
import { cn } from '@/lib/utils';
import { Circle, Square } from 'lucide-react';

interface LegsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const LegsConfig = ({ params, onChange }: LegsConfigProps) => {
  // Get current legs config or create default
  const legsConfig: LegsConfigType = params.legs || LegsDomain.createLegsConfig();
  const isEnabled = legsConfig.enabled;

  // Update legs config helper
  const updateLegsConfig = (updates: Partial<LegsConfigType>) => {
    onChange({
      legs: { ...legsConfig, ...updates },
    });
  };

  // Update leg type config helper
  const updateLegType = (updates: Partial<LegsConfigType['legType']>) => {
    const newLegType = { ...legsConfig.legType, ...updates };

    // When changing preset, update height and adjustRange from preset
    if (updates.preset && updates.preset !== 'CUSTOM') {
      const presetOption = LEG_PRESET_OPTIONS.find(p => p.value === updates.preset);
      if (presetOption) {
        newLegType.height = presetOption.height;
        newLegType.adjustRange = presetOption.adjustRange;
      }
    }

    updateLegsConfig({
      legType: newLegType,
      // Update currentHeight to match leg type height
      currentHeight: newLegType.height,
    });
  };

  // Toggle legs enabled
  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && !params.legs) {
      // First time enabling - create fresh config
      onChange({
        legs: LegsDomain.createLegsConfig(true),
      });
    } else {
      updateLegsConfig({ enabled });
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      {/* Enable/disable toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-normal">Nóżki</Label>
        <Switch
          className="scale-90"
          checked={isEnabled}
          onCheckedChange={handleToggleEnabled}
        />
      </div>

      {isEnabled && (
        <div className="space-y-4 pl-2">
          {/* Preset selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">Rozmiar</Label>
            <Select
              value={legsConfig.legType.preset}
              onValueChange={(val: LegPreset) => updateLegType({ preset: val })}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEG_PRESET_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.labelPl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Height input (editable only for CUSTOM preset) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-normal">Wysokość (mm)</Label>
              <NumberInput
                className="h-8 text-xs"
                value={legsConfig.currentHeight}
                onChange={(val) => {
                  if (legsConfig.legType.preset === 'CUSTOM') {
                    updateLegsConfig({
                      currentHeight: val,
                      legType: { ...legsConfig.legType, height: val },
                    });
                  } else {
                    updateLegsConfig({ currentHeight: val });
                  }
                }}
                min={LEG_DEFAULTS.MIN_HEIGHT}
                max={LEG_DEFAULTS.MAX_HEIGHT}
                allowNegative={false}
                disabled={legsConfig.legType.preset !== 'CUSTOM'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-normal">Średnica (mm)</Label>
              <NumberInput
                className="h-8 text-xs"
                value={legsConfig.legType.diameter}
                onChange={(val) => updateLegType({ diameter: val })}
                min={LEG_DEFAULTS.MIN_DIAMETER}
                max={LEG_DEFAULTS.MAX_DIAMETER}
                allowNegative={false}
              />
            </div>
          </div>

          {/* Shape selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">Kształt</Label>
            <div className="grid grid-cols-2 gap-2">
              {LEG_SHAPE_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={legsConfig.legType.shape === option.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-8 text-xs flex items-center gap-1.5",
                    legsConfig.legType.shape === option.value
                      ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary"
                      : ""
                  )}
                  onClick={() => updateLegType({ shape: option.value })}
                >
                  {option.value === 'ROUND' ? (
                    <Circle className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {option.labelPl}
                </Button>
              ))}
            </div>
          </div>

          {/* Finish selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">Wykończenie</Label>
            <Select
              value={legsConfig.legType.finish}
              onValueChange={(val: LegFinish) => updateLegType({ finish: val })}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEG_FINISH_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.labelPl}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Count mode */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">Ilość nóżek</Label>
            <Select
              value={legsConfig.countMode}
              onValueChange={(val: LegCountMode) => updateLegsConfig({ countMode: val })}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEG_COUNT_MODE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.labelPl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manual count input */}
          {legsConfig.countMode === 'MANUAL' && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-normal">Liczba nóżek</Label>
              <NumberInput
                className="h-8 text-xs"
                value={legsConfig.manualCount || 4}
                onChange={(val) => updateLegsConfig({ manualCount: val })}
                min={4}
                max={8}
                allowNegative={false}
              />
            </div>
          )}

          {/* Corner inset */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground font-normal">Odsunięcie od krawędzi (mm)</Label>
            <NumberInput
              className="h-8 text-xs"
              value={legsConfig.cornerInset}
              onChange={(val) => updateLegsConfig({ cornerInset: val })}
              min={10}
              max={100}
              allowNegative={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
