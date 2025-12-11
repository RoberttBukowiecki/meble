'use client';

/**
 * SnapControlPanel Component
 *
 * UI controls for snap settings in the toolbar.
 * Features:
 * - Main toggle button (snap on/off)
 * - Expandable settings dropdown
 */

import { useCallback } from 'react';
import { Magnet, Settings2 } from 'lucide-react';
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

export function SnapControlPanel() {
  const { snapEnabled, snapSettings, toggleSnap, updateSnapSettings } = useStore(
    useShallow((state) => ({
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      toggleSnap: state.toggleSnap,
      updateSnapSettings: state.updateSnapSettings,
    }))
  );

  const handleDistanceChange = useCallback(
    (value: number[]) => {
      updateSnapSettings({ distance: value[0] });
    },
    [updateSnapSettings]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      {/* Main Toggle Button */}
      <Button
        variant={snapEnabled ? 'default' : 'ghost'}
        size="sm"
        onClick={toggleSnap}
        className="h-8 px-2"
        title={snapEnabled ? 'Wyłącz przyciąganie' : 'Włącz przyciąganie'}
      >
        <Magnet className="h-4 w-4" />
      </Button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ustawienia przyciągania"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Ustawienia przyciągania</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Show Guides */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.showGuides}
            onCheckedChange={(checked) => updateSnapSettings({ showGuides: checked })}
          >
            Pokaż linie przyciągania
          </DropdownMenuCheckboxItem>

          {/* Magnetic Pull */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.magneticPull}
            onCheckedChange={(checked) => updateSnapSettings({ magneticPull: checked })}
          >
            Magnetyczne przyciąganie
          </DropdownMenuCheckboxItem>

          {/* Edge Snap */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.edgeSnap}
            onCheckedChange={(checked) => updateSnapSettings({ edgeSnap: checked })}
          >
            Przyciąganie krawędzi
          </DropdownMenuCheckboxItem>

          {/* Face Snap */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.faceSnap}
            onCheckedChange={(checked) => updateSnapSettings({ faceSnap: checked })}
          >
            Przyciąganie powierzchni
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          {/* Snap Distance Slider */}
          <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Dystans przyciągania</span>
              <span className="text-muted-foreground">{snapSettings.distance}mm</span>
            </div>
            <Slider
              value={[snapSettings.distance]}
              onValueChange={handleDistanceChange}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
