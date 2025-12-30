/**
 * StructureSection - Cabinet construction configuration
 *
 * Handles:
 * - Top/bottom placement (inset vs overlay)
 * - Back panel toggle and overlap ratio
 */

import { CabinetParams, TopBottomPlacement } from "@/types";
import { DEFAULT_BACK_OVERLAP_RATIO } from "@/lib/config";
import { FormSection } from "./FormSection";
import { ToggleRow } from "./ToggleRow";
import { SelectField, SliderField } from "./InputGrid";
import { Layers3, PanelBottom } from "lucide-react";

interface StructureSectionProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export function StructureSection({ params, onChange }: StructureSectionProps) {
  const updateParams = (updates: Partial<CabinetParams>) => {
    onChange({ ...params, ...updates });
  };

  const hasBack = params.hasBack ?? true;
  const backOverlapRatio = params.backOverlapRatio ?? DEFAULT_BACK_OVERLAP_RATIO;

  return (
    <FormSection icon={Layers3} title="Konstrukcja" description="Sposób montażu i tylna ściana">
      <div className="space-y-4">
        {/* Top/Bottom Placement */}
        <SelectField
          label="Montaż wieńców"
          value={params.topBottomPlacement || "inset"}
          onChange={(val) => updateParams({ topBottomPlacement: val as TopBottomPlacement } as any)}
          options={[
            { value: "inset", label: "Wpuszczane (między boki)" },
            { value: "overlay", label: "Nakładane (na boki)" },
          ]}
        />

        {/* Back Panel */}
        <ToggleRow
          label="Plecy (HDF)"
          description="Panel tylny szafki"
          icon={PanelBottom}
          checked={hasBack}
          onChange={(val) => updateParams({ hasBack: val } as any)}
          expandedContent={
            <SliderField
              label="Głębokość wpustu"
              value={backOverlapRatio}
              onChange={(val) => updateParams({ backOverlapRatio: val } as any)}
              min={0.33}
              max={1.0}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          }
        />
      </div>
    </FormSection>
  );
}
