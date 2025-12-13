import { Label, NumberInput } from '@meble/ui';
import { CabinetParams } from '@/types';

interface DimensionsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const DimensionsConfig = ({ params, onChange }: DimensionsConfigProps) => {
  return (
    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
      <div className="space-y-1">
        <Label className="text-[10px] md:text-xs text-muted-foreground font-normal">Szer. (mm)</Label>
        <NumberInput
          className="h-9 md:h-8 text-xs"
          value={params.width}
          onChange={(val) => onChange({ width: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] md:text-xs text-muted-foreground font-normal">Wys. (mm)</Label>
        <NumberInput
          className="h-9 md:h-8 text-xs"
          value={params.height}
          onChange={(val) => onChange({ height: val })}
          min={1}
          allowNegative={false}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] md:text-xs text-muted-foreground font-normal">Głęb. (mm)</Label>
        <NumberInput
          className="h-9 md:h-8 text-xs"
          value={params.depth}
          onChange={(val) => onChange({ depth: val })}
          min={1}
          allowNegative={false}
        />
      </div>
    </div>
  );
};
