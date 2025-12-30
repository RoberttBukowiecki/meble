/**
 * CornerCabinetSection - Corner cabinet specific configuration
 *
 * Handles:
 * - Wall side selection
 * - Front type (none, single)
 * - Corner dimensions (W, D)
 * - Door configuration
 */

import {
  CornerInternalCabinetParams,
  CornerConfig,
  CornerWallSide,
  CornerFrontType,
  CornerDoorPosition,
} from "@/types";
import { FormSection } from "./FormSection";
import { InputGrid, InputField, SelectField } from "./InputGrid";
import { CornerUpRight } from "lucide-react";

interface CornerCabinetSectionProps {
  params: Partial<CornerInternalCabinetParams>;
  onChange: (params: Partial<CornerInternalCabinetParams>) => void;
}

export function CornerCabinetSection({ params, onChange }: CornerCabinetSectionProps) {
  const cornerConfig = params.cornerConfig;

  const updateCornerConfig = (updates: Partial<CornerConfig>) => {
    if (!cornerConfig) return;
    onChange({
      ...params,
      cornerConfig: { ...cornerConfig, ...updates },
    });
  };

  if (!cornerConfig) return null;

  const showDoorConfig = cornerConfig.frontType === "SINGLE";
  const panelWidth = (cornerConfig.W || 1000) - (cornerConfig.doorWidth || 450) - 40;

  return (
    <FormSection
      icon={CornerUpRight}
      title="Konfiguracja narożnika"
      description="Wymiary i układ szafki narożnej"
    >
      <div className="space-y-4">
        {/* Wall Side and Front Type */}
        <InputGrid columns={2}>
          <SelectField
            label="Strona przy ścianie"
            value={cornerConfig.wallSide || "LEFT"}
            onChange={(val) => updateCornerConfig({ wallSide: val as CornerWallSide })}
            options={[
              { value: "LEFT", label: "Lewa" },
              { value: "RIGHT", label: "Prawa" },
            ]}
          />
          <SelectField
            label="Typ frontu"
            value={cornerConfig.frontType || "SINGLE"}
            onChange={(val) => updateCornerConfig({ frontType: val as CornerFrontType })}
            options={[
              { value: "NONE", label: "Brak (otwarty)" },
              { value: "SINGLE", label: "Drzwi + panel" },
            ]}
          />
        </InputGrid>

        {/* Corner Dimensions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Wymiary narożnika</p>
          <InputGrid columns={2}>
            <InputField
              label="Szerokość W"
              unit="mm"
              value={cornerConfig.W}
              onChange={(val) => updateCornerConfig({ W: val })}
              min={400}
              max={1500}
            />
            <InputField
              label="Głębokość D"
              unit="mm"
              value={cornerConfig.D}
              onChange={(val) => updateCornerConfig({ D: val })}
              min={300}
              max={900}
            />
          </InputGrid>
        </div>

        {/* Door Configuration - only when front type is SINGLE */}
        {showDoorConfig && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Konfiguracja drzwi</p>
            <InputGrid columns={2}>
              <SelectField
                label="Pozycja drzwi"
                value={cornerConfig.doorPosition || "RIGHT"}
                onChange={(val) => updateCornerConfig({ doorPosition: val as CornerDoorPosition })}
                options={[
                  { value: "LEFT", label: "Po lewej" },
                  { value: "RIGHT", label: "Po prawej" },
                ]}
              />
              <InputField
                label="Szerokość drzwi"
                unit="mm"
                value={cornerConfig.doorWidth}
                onChange={(val) => updateCornerConfig({ doorWidth: val })}
                min={200}
                max={800}
              />
            </InputGrid>
            <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1.5 rounded">
              Szerokość panelu zamykającego:{" "}
              <span className="font-mono font-medium text-foreground">{panelWidth} mm</span>
            </p>
          </div>
        )}
      </div>
    </FormSection>
  );
}
