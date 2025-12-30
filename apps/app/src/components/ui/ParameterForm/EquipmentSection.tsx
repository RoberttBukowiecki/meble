/**
 * EquipmentSection - Cabinet equipment configuration
 *
 * Handles equipment config items:
 * - Fronts (doors) toggle + config
 * - Handles config
 * - Side fronts
 * - Decorative panels
 * - Interior (advanced)
 * - Legs
 * - Countertop
 */

import { ReactNode } from "react";
import { Badge, Slider } from "@meble/ui";
import { track, AnalyticsEvent } from "@meble/analytics";
import {
  CabinetType,
  CabinetParams,
  KitchenCabinetParams,
  DrawerConfiguration,
  SideFrontsConfig,
  CabinetInteriorConfig,
  CabinetCountertopConfig,
  LegsConfig,
  DecorativePanelsConfig,
} from "@/types";
import { DEFAULT_DOOR_CONFIG } from "@/lib/config";
import { Drawer } from "@/lib/domain";
import {
  getSideFrontsSummary,
  hasSideFronts,
  hasDecorativePanels,
  getDecorativePanelsSummary,
  hasInteriorContent,
  getInteriorSummary,
} from "@/lib/cabinetGenerators";
import { getLegsSummary } from "../LegsConfigDialog";
import { getCountertopSummary } from "../CountertopConfigDialog";
import { FormSection } from "./FormSection";
import { ConfigItem, ConfigToggleItem } from "./ConfigItem";
import {
  Package,
  DoorOpen,
  RectangleHorizontal,
  GripHorizontal,
  PanelLeft,
  Layers2,
  LayoutGrid,
  ArrowDownToLine,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentSectionProps {
  type: CabinetType;
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  // Dialog open handlers
  onOpenFrontsDialog: () => void;
  onOpenHandlesDialog: () => void;
  onOpenSideFrontsDialog: () => void;
  onOpenDecorativePanelsDialog: () => void;
  onOpenInteriorDialog: () => void;
  onOpenLegsDialog: () => void;
  onOpenCountertopDialog: () => void;
  // Conflict handling
  onDoorsToggle: (enabled: boolean) => void;
  drawerHasFronts: boolean;
}

export function EquipmentSection({
  type,
  params,
  onChange,
  onOpenFrontsDialog,
  onOpenHandlesDialog,
  onOpenSideFrontsDialog,
  onOpenDecorativePanelsDialog,
  onOpenInteriorDialog,
  onOpenLegsDialog,
  onOpenCountertopDialog,
  onDoorsToggle,
  drawerHasFronts,
}: EquipmentSectionProps) {
  // Type-safe accessors
  const hasDoors = ("hasDoors" in params && params.hasDoors) ?? false;
  const doorCount = ("doorCount" in params ? params.doorCount : 1) ?? 1;

  // Kitchen params
  const kitchenParams = params as Partial<KitchenCabinetParams>;
  const doorConfig = kitchenParams.doorConfig ?? DEFAULT_DOOR_CONFIG;
  const doorSummary = `${doorConfig.layout === "SINGLE" ? "Pojedyncze" : "Podwójne"}, ${
    doorConfig.openingDirection === "HORIZONTAL"
      ? "na bok"
      : doorConfig.openingDirection === "LIFT_UP"
        ? "do góry"
        : "w dół"
  }`;

  // Handle config
  const handleConfig = kitchenParams.handleConfig;
  const handleSummary = handleConfig ? `${handleConfig.type}, ${handleConfig.finish}` : "Brak";

  // Side fronts
  const sideFrontsConfig = params.sideFronts;
  const hasSideFrontsConfig = hasSideFronts(sideFrontsConfig);
  const sideFrontsSummary = getSideFrontsSummary(sideFrontsConfig);

  // Decorative panels
  const decorativePanelsConfig = params.decorativePanels;
  const hasDecorativePanelsConfig = hasDecorativePanels(decorativePanelsConfig);
  const decorativePanelsSummary = getDecorativePanelsSummary(decorativePanelsConfig);

  // Interior
  const interiorConfig = params.interiorConfig;
  const hasInterior = hasInteriorContent(interiorConfig);
  const interiorSummary = getInteriorSummary(interiorConfig);

  // Legs
  const legsSummary = getLegsSummary(params.legs, params.width);
  const hasLegsConfig = params.legs?.enabled ?? false;

  // Countertop
  const countertopConfig = ("countertopConfig" in params ? params.countertopConfig : undefined) as
    | CabinetCountertopConfig
    | undefined;
  const countertopSummary = getCountertopSummary(countertopConfig);
  const hasCountertop = countertopConfig?.hasCountertop ?? false;

  // Check if we should show doors toggle
  const showDoorsToggle = type === "KITCHEN" || type === "WARDROBE" || type === "WALL";
  const showDoorConfig = hasDoors && (type === "KITCHEN" || type === "WALL");
  const showLegs = type !== "WALL";
  const showCountertop =
    type === "KITCHEN" || type === "CORNER_INTERNAL" || type === "CORNER_EXTERNAL";

  return (
    <FormSection
      icon={Package}
      title="Wyposażenie"
      description="Fronty, uchwyty, wnętrze i akcesoria"
    >
      <div className="space-y-3">
        {/* Doors Toggle */}
        {showDoorsToggle && (
          <ConfigToggleItem
            title="Fronty"
            summary={
              type === "WARDROBE"
                ? `Ilość skrzydeł: ${doorCount}`
                : hasDoors
                  ? "Włączone"
                  : "Wyłączone"
            }
            icon={DoorOpen}
            checked={type === "WARDROBE" ? doorCount > 0 : hasDoors}
            onChange={
              type === "WARDROBE"
                ? () => {} // Wardrobe uses slider
                : onDoorsToggle
            }
            badge={
              drawerHasFronts && !hasDoors ? (
                <Badge
                  variant="outline"
                  className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700"
                >
                  Konflikt: szuflady
                </Badge>
              ) : undefined
            }
            expandedContent={
              type === "WARDROBE" ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ilość skrzydeł</span>
                    <span className="text-xs font-mono">{doorCount}</span>
                  </div>
                  <Slider
                    value={[doorCount]}
                    onValueChange={([val]) => onChange({ ...params, doorCount: val } as any)}
                    min={1}
                    max={4}
                    step={1}
                  />
                </div>
              ) : undefined
            }
          />
        )}

        {/* Door Configuration - only when doors enabled */}
        {showDoorConfig && (
          <>
            <ConfigItem
              title="Konfiguracja frontów"
              summary={doorSummary}
              icon={RectangleHorizontal}
              onConfigure={() => {
                track(AnalyticsEvent.CONFIG_OPENED, { config_type: "fronts" });
                onOpenFrontsDialog();
              }}
              isConfigured={doorConfig.layout !== "SINGLE"}
            />
            <ConfigItem
              title="Uchwyty"
              summary={handleSummary}
              icon={GripHorizontal}
              onConfigure={() => {
                track(AnalyticsEvent.CONFIG_OPENED, { config_type: "handles" });
                onOpenHandlesDialog();
              }}
              isConfigured={!!handleConfig}
            />
          </>
        )}

        {/* Side Fronts */}
        <ConfigItem
          title="Fronty boczne"
          summary={hasSideFrontsConfig ? sideFrontsSummary : "Brak (standardowe boki)"}
          icon={PanelLeft}
          onConfigure={() => {
            track(AnalyticsEvent.CONFIG_OPENED, { config_type: "side_fronts" });
            onOpenSideFrontsDialog();
          }}
          isConfigured={hasSideFrontsConfig}
        />

        {/* Decorative Panels */}
        <ConfigItem
          title="Panele ozdobne"
          summary={
            hasDecorativePanelsConfig ? decorativePanelsSummary : "Brak (standardowa konstrukcja)"
          }
          icon={Layers2}
          onConfigure={() => {
            track(AnalyticsEvent.CONFIG_OPENED, { config_type: "decorative_panels" });
            onOpenDecorativePanelsDialog();
          }}
          isConfigured={hasDecorativePanelsConfig}
        />

        {/* Interior (Advanced) */}
        <ConfigItem
          title="Wnętrze (zaawansowane)"
          summary={hasInterior ? interiorSummary : "Półki, szuflady i sekcje wewnętrzne"}
          icon={LayoutGrid}
          onConfigure={() => {
            track(AnalyticsEvent.CONFIG_OPENED, { config_type: "interior" });
            onOpenInteriorDialog();
          }}
          isConfigured={hasInterior}
        />

        {/* Legs - not for wall cabinets */}
        {showLegs && (
          <ConfigItem
            title="Nóżki"
            summary={legsSummary}
            icon={ArrowDownToLine}
            onConfigure={() => {
              track(AnalyticsEvent.CONFIG_OPENED, { config_type: "legs" });
              onOpenLegsDialog();
            }}
            isConfigured={hasLegsConfig}
          />
        )}

        {/* Countertop - for kitchen and corner cabinets */}
        {showCountertop && (
          <ConfigItem
            title="Blat kuchenny"
            summary={countertopSummary}
            icon={ChefHat}
            onConfigure={onOpenCountertopDialog}
            isConfigured={hasCountertop}
          />
        )}
      </div>
    </FormSection>
  );
}
