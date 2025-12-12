
import {
  Button,
  Label,
} from '@meble/ui';
import {
  CabinetParams,
  KitchenCabinetParams,
} from '@/types';
import { DEFAULT_DOOR_CONFIG } from '@/lib/config';
import { cn } from '@/lib/utils';
import { ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine, SplitSquareHorizontal, Square } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Door layout */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Układ drzwi</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={doorConfig.layout === 'SINGLE' ? 'default' : 'outline'}
            className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.layout === 'SINGLE' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
            onClick={() => updateDoorConfig({ layout: 'SINGLE' })}
          >
            <Square className="h-5 w-5 mb-1" />
            <span className="text-xs">Pojedyncze</span>
          </Button>
          <Button
            variant={doorConfig.layout === 'DOUBLE' ? 'default' : 'outline'}
            className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.layout === 'DOUBLE' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
            onClick={() => updateDoorConfig({ layout: 'DOUBLE' })}
          >
            <SplitSquareHorizontal className="h-5 w-5 mb-1" />
            <span className="text-xs">Podwójne</span>
          </Button>
        </div>
      </div>

      {/* Opening direction */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Kierunek otwierania</Label>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant={doorConfig.openingDirection === 'HORIZONTAL' ? 'default' : 'outline'}
            className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.openingDirection === 'HORIZONTAL' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
            onClick={() => updateDoorConfig({ openingDirection: 'HORIZONTAL' })}
          >
            <ArrowRightToLine className="h-5 w-5 mb-1" />
            <span className="text-xs">Na bok</span>
          </Button>
          <Button
            variant={doorConfig.openingDirection === 'LIFT_UP' ? 'default' : 'outline'}
            className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.openingDirection === 'LIFT_UP' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
            onClick={() => updateDoorConfig({ openingDirection: 'LIFT_UP' })}
          >
            <ArrowUpToLine className="h-5 w-5 mb-1" />
            <span className="text-xs">Do góry</span>
          </Button>
          <Button
            variant={doorConfig.openingDirection === 'FOLD_DOWN' ? 'default' : 'outline'}
            className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.openingDirection === 'FOLD_DOWN' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
            onClick={() => updateDoorConfig({ openingDirection: 'FOLD_DOWN' })}
          >
            <ArrowDownToLine className="h-5 w-5 mb-1" />
            <span className="text-xs">W dół</span>
          </Button>
        </div>
      </div>

      {/* Hinge side (for single horizontal doors) */}
      {doorConfig.layout === 'SINGLE' && doorConfig.openingDirection === 'HORIZONTAL' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Strona zawiasów</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={doorConfig.hingeSide === 'LEFT' ? 'default' : 'outline'}
              className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.hingeSide === 'LEFT' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
              onClick={() => updateDoorConfig({ hingeSide: 'LEFT' })}
            >
              <ArrowLeftToLine className="h-5 w-5 mb-1" />
              <span className="text-xs">Lewa</span>
            </Button>
            <Button
              variant={doorConfig.hingeSide === 'RIGHT' ? 'default' : 'outline'}
              className={cn("h-auto py-3 flex flex-col gap-1", doorConfig.hingeSide === 'RIGHT' ? "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:text-primary" : "")}
              onClick={() => updateDoorConfig({ hingeSide: 'RIGHT' })}
            >
              <ArrowRightToLine className="h-5 w-5 mb-1" />
              <span className="text-xs">Prawa</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
