
import {
  Button,
  Label,
} from '@meble/ui';
import {
  CabinetParams,
  KitchenCabinetParams,
} from '@/types';
import { DEFAULT_DOOR_CONFIG } from '@/lib/config';

interface FrontsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

export const FrontsConfig = ({ params, onChange }: FrontsConfigProps) => {
  const kitchenParams = params as Partial<KitchenCabinetParams>;
  const doorConfig = kitchenParams.doorConfig ?? DEFAULT_DOOR_CONFIG;

  const updateDoorConfig = (updates: Partial<typeof doorConfig>) => {
    onChange({
      ...params,
      doorConfig: { ...doorConfig, ...updates },
    } as any);
  };

  return (
    <div className="space-y-4">
      {/* Door layout */}
      <div className="space-y-2">
        <Label className="text-xs">Układ drzwi</Label>
        <div className="flex gap-2">
          <Button
            variant={doorConfig.layout === 'SINGLE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateDoorConfig({ layout: 'SINGLE' })}
          >
            Pojedyncze
          </Button>
          <Button
            variant={doorConfig.layout === 'DOUBLE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateDoorConfig({ layout: 'DOUBLE' })}
          >
            Podwójne
          </Button>
        </div>
      </div>

      {/* Opening direction */}
      <div className="space-y-2">
        <Label className="text-xs">Kierunek otwierania</Label>
        <div className="flex gap-2">
          <Button
            variant={doorConfig.openingDirection === 'HORIZONTAL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateDoorConfig({ openingDirection: 'HORIZONTAL' })}
          >
            Na bok
          </Button>
          <Button
            variant={doorConfig.openingDirection === 'LIFT_UP' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateDoorConfig({ openingDirection: 'LIFT_UP' })}
          >
            Do góry
          </Button>
          <Button
            variant={doorConfig.openingDirection === 'FOLD_DOWN' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateDoorConfig({ openingDirection: 'FOLD_DOWN' })}
          >
            W dół
          </Button>
        </div>
      </div>

      {/* Hinge side (for single horizontal doors) */}
      {doorConfig.layout === 'SINGLE' && doorConfig.openingDirection === 'HORIZONTAL' && (
        <div className="space-y-2">
          <Label className="text-xs">Strona zawiasów</Label>
          <div className="flex gap-2">
            <Button
              variant={doorConfig.hingeSide === 'LEFT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateDoorConfig({ hingeSide: 'LEFT' })}
            >
              Lewa
            </Button>
            <Button
              variant={doorConfig.hingeSide === 'RIGHT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateDoorConfig({ hingeSide: 'RIGHT' })}
            >
              Prawa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
