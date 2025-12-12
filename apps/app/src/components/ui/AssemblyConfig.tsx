import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@meble/ui';
import { CabinetParams, TopBottomPlacement } from '@/types';

interface AssemblyConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const AssemblyConfig = ({ params, onChange }: AssemblyConfigProps) => {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground font-normal">Montaż góra/dół</Label>
      <Select
        value={params.topBottomPlacement || 'inset'}
        onValueChange={(val: TopBottomPlacement) => onChange({ topBottomPlacement: val })}
      >
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inset">Wewnątrz (między bokami)</SelectItem>
          <SelectItem value="overlay">Nałożona (na boki)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};