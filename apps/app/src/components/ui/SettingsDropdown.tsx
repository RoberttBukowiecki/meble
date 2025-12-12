'use client';

import { useCallback } from 'react';
import { Settings } from 'lucide-react';
import { Button, Slider } from '@meble/ui';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@meble/ui';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';

export function SettingsDropdown() {
  const t = useTranslations('Settings');

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Language */}
        <div className="px-2 py-2">
          <LanguageSwitcher />
        </div>

        <DropdownMenuSeparator />

        {/* Dimension Settings */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Wymiary podczas przesuwania
        </DropdownMenuLabel>

        {/* Enable dimensions */}
        <DropdownMenuCheckboxItem
          checked={dimensionSettings?.enabled ?? true}
          onCheckedChange={(checked) => updateDimensionSettings({ enabled: checked })}
        >
          Pokaż wymiary
        </DropdownMenuCheckboxItem>

        {/* Show axis colors */}
        <DropdownMenuCheckboxItem
          checked={dimensionSettings?.showAxisColors ?? false}
          onCheckedChange={(checked) => updateDimensionSettings({ showAxisColors: checked })}
        >
          Kolory według osi
        </DropdownMenuCheckboxItem>

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
            max={3000}
            step={100}
            className="w-full"
          />
        </div>

        {/* Max visible per axis */}
        <div className="px-2 py-2">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Ilość wymiarów</span>
            <span className="text-muted-foreground">
              {dimensionSettings?.maxVisiblePerAxis ?? 3}
            </span>
          </div>
          <Slider
            value={[dimensionSettings?.maxVisiblePerAxis ?? 3]}
            onValueChange={handleMaxVisibleChange}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
