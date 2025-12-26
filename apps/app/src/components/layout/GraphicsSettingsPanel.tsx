"use client";

import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@meble/ui";
import { MonitorPlay } from "lucide-react";

export function GraphicsSettingsPanel() {
  const { graphicsSettings, updateGraphicsSettings, featureFlags } = useStore(
    useShallow((state) => ({
      graphicsSettings: state.graphicsSettings,
      updateGraphicsSettings: state.updateGraphicsSettings,
      featureFlags: state.featureFlags,
    }))
  );

  if (featureFlags.HIDE_GRAPHICS_SETTINGS) return null;

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 md:h-8 md:w-8 p-0"
            title="Ustawienia grafiki"
          >
            <MonitorPlay className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Ustawienia grafiki</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="shadows">Cienie</Label>
              <Switch
                id="shadows"
                checked={graphicsSettings.shadows}
                onCheckedChange={(checked) => updateGraphicsSettings({ shadows: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ao">Ambient Occlusion</Label>
              <Switch
                id="ao"
                checked={graphicsSettings.ambientOcclusion}
                onCheckedChange={(checked) => updateGraphicsSettings({ ambientOcclusion: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Jakość</Label>
              <Select
                value={graphicsSettings.quality}
                onValueChange={(v: any) => updateGraphicsSettings({ quality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niska (Wydajność)</SelectItem>
                  <SelectItem value="medium">Średnia</SelectItem>
                  <SelectItem value="high">Wysoka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tryb oświetlenia</Label>
              <Select
                value={graphicsSettings.lightingMode}
                onValueChange={(v: any) => updateGraphicsSettings({ lightingMode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standardowy (Edycja)</SelectItem>
                  <SelectItem value="simulation">Symulacja (Realistyczny)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
