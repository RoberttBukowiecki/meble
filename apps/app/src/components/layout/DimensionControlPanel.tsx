'use client';

/**
 * DimensionControlPanel Component
 *
 * UI controls for dimension settings in the toolbar.
 * Features:
 * - Main toggle button (dimension on/off)
 * - Expandable settings dropdown
 */

import { useCallback } from 'react';
import { Ruler, Settings2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  Slider,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';

export function DimensionControlPanel() {
  const { dimensionSettings, updateDimensionSettings } = useStore(
    useShallow((state) => ({
      dimensionSettings: state.dimensionSettings,
      updateDimensionSettings: state.updateDimensionSettings,
    }))
  );

  const handleMaxDistanceChange = useCallback(
    (value: number[]) => {
      updateDimensionSettings({ maxDistanceThreshold: value[0] });
    },
    [updateDimensionSettings]
  );

  const handleMaxVisibleChange = useCallback(
    (value: number[]) => {
      updateDimensionSettings({ maxVisiblePerAxis: value[0] });
    },
    [updateDimensionSettings]
  );

  const toggleDimensions = useCallback(() => {
    updateDimensionSettings({ enabled: !dimensionSettings?.enabled });
  }, [dimensionSettings, updateDimensionSettings]);

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      {/* Main Toggle Button */}
      <Button
        variant={dimensionSettings?.enabled ? 'default' : 'ghost'}
        size="sm"
        onClick={toggleDimensions}
        className="h-8 px-2"
        title={dimensionSettings?.enabled ? 'Ukryj wymiary' : 'Pokaż wymiary'}
      >
        <Ruler className="h-4 w-4" />
      </Button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ustawienia wymiarowania"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Ustawienia wymiarowania</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Show axis colors */}
          <DropdownMenuCheckboxItem
            checked={dimensionSettings?.showAxisColors ?? false}
            onCheckedChange={(checked) => updateDimensionSettings({ showAxisColors: checked })}
          >
            Kolory według osi
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          {/* Max distance threshold */}
          <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Maksymalny zasięg</span>
              <span className="text-muted-foreground">
                {dimensionSettings?.maxDistanceThreshold ?? 1000}mm
              </span>
            </div>
            <Slider
              value={[dimensionSettings?.maxDistanceThreshold ?? 1000]}
              onValueChange={handleMaxDistanceChange}
              min={100}
              max={5000}
              step={100}
              className="w-full"
            />
          </div>

          {/* Max visible per axis */}
          <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Max linii na oś</span>
              <span className="text-muted-foreground">
                {dimensionSettings?.maxVisiblePerAxis ?? 3}
              </span>
            </div>
            <Slider
              value={[dimensionSettings?.maxVisiblePerAxis ?? 3]}
              onValueChange={handleMaxVisibleChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
