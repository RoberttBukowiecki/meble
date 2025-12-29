import { useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Label,
  Switch,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@meble/ui";
import { Settings, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function SettingsDropdown() {
  const t = useTranslations("Settings");

  const { featureFlags, toggleFeatureFlag, snapSettings, updateSnapSettings } = useStore(
    useShallow((state) => ({
      featureFlags: state.featureFlags,
      toggleFeatureFlag: state.toggleFeatureFlag,
      snapSettings: state.snapSettings,
      updateSnapSettings: state.updateSnapSettings,
    }))
  );

  const handleCollisionMarginChange = useCallback(
    (value: number[]) => {
      updateSnapSettings({ collisionMargin: value[0] });
    },
    [updateSnapSettings]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("settings")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <LanguageSwitcher />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Eksperymentalne</DropdownMenuLabel>

        <div className="px-2 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-graphics" className="text-xs">
              Ukryj ustawienia grafiki
            </Label>
            <Switch
              id="hide-graphics"
              checked={featureFlags?.HIDE_GRAPHICS_SETTINGS ?? false}
              onCheckedChange={() => toggleFeatureFlag("HIDE_GRAPHICS_SETTINGS")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="hide-rooms" className="text-xs">
              Ukryj zakładkę pokoi
            </Label>
            <Switch
              id="hide-rooms"
              checked={featureFlags?.HIDE_ROOMS_TAB ?? false}
              onCheckedChange={() => toggleFeatureFlag("HIDE_ROOMS_TAB")}
            />
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Kolizje</DropdownMenuLabel>

        {/* Collision Margin Slider */}
        <div className="px-2 py-2">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-xs">Margines kolizji</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <p className="font-medium mb-1">Próg wykrywania kolizji:</p>
                    <ul className="space-y-0.5">
                      <li>
                        • <b>0.01mm</b> – tylko nakładanie
                      </li>
                      <li>
                        • <b>0mm</b> – stykanie się
                      </li>
                      <li>
                        • <b>-0.5mm</b> – toleruje 0.5mm nakładania
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-muted-foreground text-xs">
              {(snapSettings.collisionMargin ?? 0.01).toFixed(2)}mm
            </span>
          </div>
          <Slider
            value={[snapSettings.collisionMargin ?? 0.01]}
            onValueChange={handleCollisionMarginChange}
            min={-1}
            max={2}
            step={0.01}
            className="w-full"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
