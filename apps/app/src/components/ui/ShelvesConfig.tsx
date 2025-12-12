
import { Label, Slider } from '@meble/ui';
import { CabinetParams } from '@/types';

interface ShelvesConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  maxShelves?: number;
}

export const ShelvesConfig = ({ params, onChange, maxShelves = 10 }: ShelvesConfigProps) => {
  const getShelfCount = (): number => {
    if ('shelfCount' in params && params.shelfCount !== undefined) return params.shelfCount;
    return 1;
  };

  return (
    <div className="flex items-center justify-between">
      <Label>Półki ({getShelfCount()})</Label>
      <Slider
        value={[getShelfCount()]}
        onValueChange={([val]) => onChange({ shelfCount: val })}
        min={0}
        max={maxShelves}
        step={1}
      />
    </div>
  );
};
