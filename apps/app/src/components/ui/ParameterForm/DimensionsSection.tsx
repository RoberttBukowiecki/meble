/**
 * DimensionsSection - Cabinet dimensions configuration
 *
 * Provides inputs for width, height, and depth with:
 * - Consistent grid layout
 * - Clear labeling with units
 */

import { CabinetParams } from "@/types";
import { FormSection } from "./FormSection";
import { InputGrid, InputField } from "./InputGrid";
import { Ruler } from "lucide-react";

interface DimensionsSectionProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export function DimensionsSection({ params, onChange }: DimensionsSectionProps) {
  const updateParams = (updates: Partial<CabinetParams>) => {
    onChange({ ...params, ...updates });
  };

  return (
    <FormSection icon={Ruler} title="Wymiary" description="Szerokość, wysokość i głębokość szafki">
      <InputGrid columns={3}>
        <InputField
          label="Szerokość"
          unit="mm"
          value={params.width}
          onChange={(val) => updateParams({ width: val })}
          min={1}
        />
        <InputField
          label="Wysokość"
          unit="mm"
          value={params.height}
          onChange={(val) => updateParams({ height: val })}
          min={1}
        />
        <InputField
          label="Głębokość"
          unit="mm"
          value={params.depth}
          onChange={(val) => updateParams({ depth: val })}
          min={1}
        />
      </InputGrid>
    </FormSection>
  );
}
