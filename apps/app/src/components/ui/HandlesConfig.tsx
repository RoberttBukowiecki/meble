
import { CabinetParams, KitchenCabinetParams } from '@/types';
import { HandleSelector } from './HandleSelector';

interface HandlesConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const HandlesConfig = ({ params, onChange }: HandlesConfigProps) => {
  const kitchenParams = params as Partial<KitchenCabinetParams>;

  return (
    <div className="space-y-4">
      <HandleSelector
        value={kitchenParams.handleConfig}
        onChange={(handleConfig) =>
          onChange({
            ...params,
            handleConfig,
          } as any)
        }
        doorWidth={(params.width ?? 800) - 4}
        doorHeight={(params.height ?? 720) - 4}
      />
    </div>
  );
};
