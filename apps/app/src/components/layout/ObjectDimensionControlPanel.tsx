"use client";

/**
 * ObjectDimensionControlPanel Component
 *
 * UI controls for object dimension display (W/H/D).
 * Features:
 * - Main toggle button
 * - Mode selection (selection/all)
 * - Granularity selection (group/part)
 * - Visual options
 */

import { useCallback } from "react";
import { Box, Settings2, Layers, LayoutGrid } from "lucide-react";
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
} from "@meble/ui";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { KEYBOARD_SHORTCUTS, formatShortcutLabel } from "@/lib/config";
import type { ObjectDimensionMode, ObjectDimensionGranularity } from "@/types";

export function ObjectDimensionControlPanel() {
  const { objectDimensionSettings, updateObjectDimensionSettings, toggleObjectDimensions } =
    useStore(
      useShallow((state) => ({
        objectDimensionSettings: state.objectDimensionSettings,
        updateObjectDimensionSettings: state.updateObjectDimensionSettings,
        toggleObjectDimensions: state.toggleObjectDimensions,
      }))
    );

  const handleModeChange = useCallback(
    (value: string) => {
      updateObjectDimensionSettings({ mode: value as ObjectDimensionMode });
    },
    [updateObjectDimensionSettings]
  );

  const handleGranularityChange = useCallback(
    (value: string) => {
      updateObjectDimensionSettings({ granularity: value as ObjectDimensionGranularity });
    },
    [updateObjectDimensionSettings]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      {/* Main Toggle Button */}
      <Button
        variant={objectDimensionSettings?.enabled ? "default" : "ghost"}
        size="sm"
        onClick={toggleObjectDimensions}
        className="h-11 md:h-8 px-2"
        title={`Wymiary obiektów (${formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS)})`}
      >
        <Box className="h-5 w-5 md:h-4 md:w-4" />
      </Button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 md:h-8 md:w-8 p-0"
            title="Ustawienia wymiarów obiektów"
          >
            <Settings2 className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Wymiary obiektów</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Mode Selection */}
          <div className="px-2 py-1.5">
            <div className="mb-1.5 text-sm font-medium">Tryb wyświetlania</div>
            <DropdownMenuRadioGroup
              value={objectDimensionSettings?.mode || "selection"}
              onValueChange={handleModeChange}
            >
              <DropdownMenuRadioItem value="selection" className="text-sm">
                <Layers className="mr-2 h-4 w-4" />
                Tylko zaznaczone
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all" className="text-sm">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Wszystkie obiekty
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          {/* Granularity Selection */}
          <div className="px-2 py-1.5">
            <div className="mb-1.5 text-sm font-medium">Poziom szczegółowości</div>
            <DropdownMenuRadioGroup
              value={objectDimensionSettings?.granularity || "group"}
              onValueChange={handleGranularityChange}
            >
              <DropdownMenuRadioItem value="group" className="text-sm">
                Szafki / grupy
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="part" className="text-sm">
                Pojedyncze części
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          {/* Visual Options */}
          <DropdownMenuCheckboxItem
            checked={objectDimensionSettings?.showLabels ?? true}
            onCheckedChange={(checked) => updateObjectDimensionSettings({ showLabels: checked })}
          >
            Pokaż etykiety (W/H/D)
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={objectDimensionSettings?.showAxisColors ?? false}
            onCheckedChange={(checked) =>
              updateObjectDimensionSettings({ showAxisColors: checked })
            }
          >
            Kolory według osi
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
