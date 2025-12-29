"use client";

/**
 * SnapControlPanel Component
 *
 * UI controls for snap settings in the toolbar.
 * Features:
 * - Main toggle button (snap on/off)
 * - Snap version toggle (V3 parts / V2 cabinet groups)
 * - Expandable settings dropdown
 */

import { useCallback } from "react";
import { Magnet, Settings2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Slider,
} from "@meble/ui";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { SnapVersion } from "@/types";

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

  const handleSnapGapChange = useCallback(
    (value: number[]) => {
      updateSnapSettings({ snapGap: value[0] });
    },
    [updateSnapSettings]
  );

  const handleVersionChange = useCallback(
    (version: string) => {
      updateSnapSettings({ version: version as SnapVersion });
    },
    [updateSnapSettings]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      {/* Main Toggle Button */}
      <Button
        variant={snapEnabled ? "default" : "ghost"}
        size="sm"
        onClick={toggleSnap}
        className="h-11 md:h-8 gap-1 px-2"
        title={snapEnabled ? "Wyłącz przyciąganie" : "Włącz przyciąganie"}
      >
        <Magnet className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline text-xs uppercase opacity-70">
          {snapSettings.version}
        </span>
      </Button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 md:h-8 md:w-8 p-0"
            title="Ustawienia przyciągania"
          >
            <Settings2 className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Ustawienia przyciągania</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Snap Version Selection */}
          <div className="px-2 py-1.5">
            <div className="mb-1.5 text-sm font-medium">Tryb przyciągania</div>
            <DropdownMenuRadioGroup
              value={snapSettings.version || "v3"}
              onValueChange={handleVersionChange}
            >
              <DropdownMenuRadioItem value="v3" className="text-sm">
                V3 - Przyciąganie części (zalecane)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="v2" className="text-sm">
                V2 - Obwiednia szafy
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          {/* Snap Types */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.faceSnap}
            onCheckedChange={(checked) => updateSnapSettings({ faceSnap: checked })}
          >
            Przyciąganie powierzchni (naprzeciwległe)
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={snapSettings.edgeSnap}
            onCheckedChange={(checked) => updateSnapSettings({ edgeSnap: checked })}
          >
            Wyrównanie równoległe
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={snapSettings.tJointSnap}
            onCheckedChange={(checked) => updateSnapSettings({ tJointSnap: checked })}
          >
            Przyciąganie T-joint (prostopadłe)
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          {/* Visualization Options */}
          <DropdownMenuCheckboxItem
            checked={snapSettings.showGuides}
            onCheckedChange={(checked) => updateSnapSettings({ showGuides: checked })}
          >
            Pokaż linie przyciągania
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={snapSettings.debug ?? false}
            onCheckedChange={(checked) => updateSnapSettings({ debug: checked })}
          >
            Tryb debugowania (pokaż OBB)
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

          {/* Snap Gap Slider */}
          <div className="px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Odstęp między częściami</span>
              <span className="text-muted-foreground">
                {snapSettings.snapGap?.toFixed(1) ?? 0.1}mm
              </span>
            </div>
            <Slider
              value={[snapSettings.snapGap ?? 0.1]}
              onValueChange={handleSnapGapChange}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
