import { Label, Slider, Switch } from '@meble/ui';
import { CabinetParams } from '@/types';
import { DEFAULT_BACK_OVERLAP_RATIO } from '@/lib/config';

interface BackWallConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const BackWallConfig = ({ params, onChange }: BackWallConfigProps) => {
  const getHasBack = (): boolean => {
    if ('hasBack' in params && params.hasBack !== undefined) return params.hasBack;
    return true; // Default to true for all cabinets
  };

  const getBackOverlapRatio = (): number => {
    if ('backOverlapRatio' in params && params.backOverlapRatio !== undefined) return params.backOverlapRatio;
    return DEFAULT_BACK_OVERLAP_RATIO;
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-normal">Plecy (tylna ściana)</Label>
        <Switch 
            className="scale-90"
            checked={getHasBack()} 
            onCheckedChange={(val) => onChange({ hasBack: val })} 
        />
      </div>
      {getHasBack() && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground font-normal">Głębokość wpustu ({Math.round(getBackOverlapRatio() * 100)}%)</Label>
          <Slider
            value={[getBackOverlapRatio()]}
            onValueChange={([val]) => onChange({ backOverlapRatio: val })}
            min={0.33}
            max={1.0}
            step={0.01}
            className="w-32"
          />
        </div>
      )}
    </div>
  );
};