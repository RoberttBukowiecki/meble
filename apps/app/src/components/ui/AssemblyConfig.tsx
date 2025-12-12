
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@meble/ui';
import { CabinetParams, TopBottomPlacement } from '@/types';

interface AssemblyConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const AssemblyConfig = ({ params, onChange }: AssemblyConfigProps) => {
  return (
    <div>
      <Label>Montaż góra/dół</Label>
      <Select
        value={params.topBottomPlacement || 'inset'}
        onValueChange={(val: TopBottomPlacement) => onChange({ topBottomPlacement: val })}
      >
        <SelectTrigger>
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
