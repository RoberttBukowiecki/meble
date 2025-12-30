/**
 * WallCabinetSection - Wall cabinet specific configuration
 *
 * Handles:
 * - Hanger cutouts configuration
 * - Folding door configuration
 */

import { WallCabinetParams, HangerCutoutConfig, FoldingDoorConfig } from "@/types";
import {
  DEFAULT_HANGER_CUTOUT_CONFIG,
  DEFAULT_FOLDING_DOOR_CONFIG,
  HANGER_CUTOUT_LIMITS,
  FOLDING_DOOR_LIMITS,
} from "@/lib/config";
import { FormSection } from "./FormSection";
import { ToggleRow } from "./ToggleRow";
import { InputGrid, InputField, SliderField } from "./InputGrid";
import { SquareStack, Scissors, Layers } from "lucide-react";

interface WallCabinetSectionProps {
  params: Partial<WallCabinetParams>;
  onChange: (params: Partial<WallCabinetParams>) => void;
  hasDoors: boolean;
}

export function WallCabinetSection({ params, onChange, hasDoors }: WallCabinetSectionProps) {
  // Hanger cutouts
  const hangerCutouts = params.hangerCutouts ?? DEFAULT_HANGER_CUTOUT_CONFIG;
  const hangerEnabled = hangerCutouts.enabled;

  const updateHangerCutouts = (updates: Partial<HangerCutoutConfig>) => {
    onChange({
      ...params,
      hangerCutouts: { ...hangerCutouts, ...updates },
    });
  };

  // Folding door
  const foldingConfig = params.foldingDoorConfig ?? DEFAULT_FOLDING_DOOR_CONFIG;
  const foldingEnabled = foldingConfig.enabled;

  const updateFoldingDoor = (updates: Partial<FoldingDoorConfig>) => {
    onChange({
      ...params,
      foldingDoorConfig: { ...foldingConfig, ...updates },
    });
  };

  return (
    <FormSection icon={SquareStack} title="Szafka wisząca" description="Zawieszki i opcje frontu">
      <div className="space-y-4">
        {/* Hanger Cutouts */}
        <ToggleRow
          label="Wycięcia na zawieszki"
          description="Otwory montażowe w wieńcu górnym"
          icon={Scissors}
          checked={hangerEnabled}
          onChange={(val) => updateHangerCutouts({ enabled: val })}
          expandedContent={
            <InputGrid columns={2}>
              <InputField
                label="Szerokość"
                unit="mm"
                value={hangerCutouts.width}
                onChange={(val) => updateHangerCutouts({ width: val })}
                min={HANGER_CUTOUT_LIMITS.MIN_WIDTH}
                max={HANGER_CUTOUT_LIMITS.MAX_WIDTH}
              />
              <InputField
                label="Wysokość"
                unit="mm"
                value={hangerCutouts.height}
                onChange={(val) => updateHangerCutouts({ height: val })}
                min={HANGER_CUTOUT_LIMITS.MIN_HEIGHT}
                max={HANGER_CUTOUT_LIMITS.MAX_HEIGHT}
              />
              <InputField
                label="Wcięcie poziome"
                unit="mm"
                value={hangerCutouts.horizontalInset}
                onChange={(val) => updateHangerCutouts({ horizontalInset: val })}
                min={HANGER_CUTOUT_LIMITS.MIN_INSET}
              />
              <InputField
                label="Wcięcie pionowe"
                unit="mm"
                value={hangerCutouts.verticalInset}
                onChange={(val) => updateHangerCutouts({ verticalInset: val })}
                min={HANGER_CUTOUT_LIMITS.MIN_INSET}
              />
            </InputGrid>
          }
        />

        {/* Folding Door - only when doors are enabled */}
        {hasDoors && (
          <ToggleRow
            label="Front łamany"
            description="Drzwi podzielone na 2 sekcje"
            icon={Layers}
            checked={foldingEnabled}
            onChange={(val) => updateFoldingDoor({ enabled: val })}
            expandedContent={
              <div className="space-y-3">
                <SliderField
                  label="Proporcja podziału (dolna sekcja)"
                  value={foldingConfig.splitRatio * 100}
                  onChange={(val) => updateFoldingDoor({ splitRatio: val / 100 })}
                  min={FOLDING_DOOR_LIMITS.MIN_SPLIT_RATIO * 100}
                  max={FOLDING_DOOR_LIMITS.MAX_SPLIT_RATIO * 100}
                  step={5}
                  formatValue={(v) => `${Math.round(v)}%`}
                />
                <InputField
                  label="Przerwa między sekcjami"
                  unit="mm"
                  value={foldingConfig.sectionGap}
                  onChange={(val) => updateFoldingDoor({ sectionGap: val })}
                  min={FOLDING_DOOR_LIMITS.MIN_GAP}
                  max={FOLDING_DOOR_LIMITS.MAX_GAP}
                />
              </div>
            }
          />
        )}
      </div>
    </FormSection>
  );
}
