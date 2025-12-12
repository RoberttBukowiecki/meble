import { Label, NumberInput } from '@meble/ui';
import { CabinetParams } from '@/types';

interface DimensionsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const DimensionsConfig = ({ params, onChange }: DimensionsConfigProps) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-normal">Szerokość (mm)</Label>
        <NumberInput
          className="h-8 text-xs"
          value={params.width}
          onChange={(val) => onChange({ width: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-normal">Wysokość (mm)</Label>
        <NumberInput
          className="h-8 text-xs"
          value={params.height}
          onChange={(val) => onChange({ height: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-normal">Głębokość (mm)</Label>
        <NumberInput
          className="h-8 text-xs"
          value={params.depth}
          onChange={(val) => onChange({ depth: val })}
          min={1}
          allowNegative={false}
        />
      </div>
    </div>
  );
};