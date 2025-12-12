
import { Label, NumberInput } from '@meble/ui';
import { CabinetParams } from '@/types';

interface DimensionsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const DimensionsConfig = ({ params, onChange }: DimensionsConfigProps) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>Szerokość (mm)</Label>
        <NumberInput
          value={params.width}
          onChange={(val) => onChange({ width: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div>
        <Label>Wysokość (mm)</Label>
        <NumberInput
          value={params.height}
          onChange={(val) => onChange({ height: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div>
        <Label>Głębokość (mm)</Label>
        <NumberInput
          value={params.depth}
          onChange={(val) => onChange({ depth: val })}
          min={1}
          allowNegative={false}
        />
      </div>
    </div>
  );
};
