'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  NumberInput,
  cn,
} from '@meble/ui';
import { SideFrontsConfig, SideFrontConfig, Material, DEFAULT_SIDE_FRONT_CONFIG } from '@/types';
import { PanelLeft, PanelRight } from 'lucide-react';

interface SideFrontsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SideFrontsConfig | undefined;
  onConfigChange: (config: SideFrontsConfig) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
  cabinetHeight: number;
}

/**
 * Single side front configuration panel
 */
interface SideFrontEditorProps {
  side: 'left' | 'right';
  config: SideFrontConfig | null;
  onUpdate: (config: SideFrontConfig | null) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
  cabinetHeight: number;
}

const SideFrontEditor = ({
  side,
  config,
  onUpdate,
  materials,
  defaultFrontMaterialId,
  cabinetHeight,
}: SideFrontEditorProps) => {
  const isEnabled = config?.enabled ?? false;
  const Icon = side === 'left' ? PanelLeft : PanelRight;
  const sideLabel = side === 'left' ? 'Lewa strona' : 'Prawa strona';

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onUpdate({
        ...DEFAULT_SIDE_FRONT_CONFIG,
        enabled: true,
      });
    } else {
      onUpdate(null);
    }
  };

  const handleMaterialChange = (materialId: string) => {
    if (!config) return;
    onUpdate({
      ...config,
      materialId: materialId === 'default' ? undefined : materialId,
    });
  };

  const handleProtrusionChange = (value: number) => {
    if (!config) return;
    onUpdate({
      ...config,
      forwardProtrusion: Math.max(0, Math.min(100, value)),
    });
  };

  const handleBottomOffsetChange = (value: number) => {
    if (!config) return;
    const maxOffset = cabinetHeight - (config.topOffset ?? 0) - 100;
    onUpdate({
      ...config,
      bottomOffset: Math.max(0, Math.min(maxOffset, value)),
    });
  };

  const handleTopOffsetChange = (value: number) => {
    if (!config) return;
    const maxOffset = cabinetHeight - (config.bottomOffset ?? 0) - 100;
    onUpdate({
      ...config,
      topOffset: Math.max(0, Math.min(maxOffset, value)),
    });
  };

  // Get board materials for selection
  const boardMaterials = materials.filter(
    (m) => m.category === 'board' || !m.category
  );

  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-4',
        isEnabled ? 'bg-card' : 'bg-muted/30'
      )}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium text-sm">{sideLabel}</h4>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      </div>

      {/* Configuration fields (only shown when enabled) */}
      {isEnabled && config && (
        <div className="space-y-4 pt-2 border-t">
          {/* Material selector */}
          <div className="space-y-2">
            <Label className="text-xs">Materiał</Label>
            <Select
              value={config.materialId ?? 'default'}
              onValueChange={handleMaterialChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz materiał" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Domyślny (materiał frontu)
                </SelectItem>
                {boardMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name} ({material.thickness}mm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Forward protrusion */}
          <div className="space-y-2">
            <Label className="text-xs">Wysunięcie do przodu (mm)</Label>
            <NumberInput
              value={config.forwardProtrusion}
              onChange={handleProtrusionChange}
              min={0}
              max={100}
              allowNegative={false}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              0 = automatycznie (grubość materiału frontu)
            </p>
          </div>

          {/* Bottom offset */}
          <div className="space-y-2">
            <Label className="text-xs">Offset dolny (mm)</Label>
            <NumberInput
              value={config.bottomOffset}
              onChange={handleBottomOffsetChange}
              min={0}
              allowNegative={false}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              Odległość od dołu szafki do początku frontu bocznego
            </p>
          </div>

          {/* Top offset */}
          <div className="space-y-2">
            <Label className="text-xs">Offset górny (mm)</Label>
            <NumberInput
              value={config.topOffset}
              onChange={handleTopOffsetChange}
              min={0}
              allowNegative={false}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              Odległość od góry szafki do końca frontu bocznego
            </p>
          </div>

          {/* Calculated height display */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Wysokość frontu:{' '}
              <span className="font-medium text-foreground">
                {Math.max(cabinetHeight - config.bottomOffset - config.topOffset, 0)}mm
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Visual preview of the cabinet with side fronts
 */
interface PreviewProps {
  config: SideFrontsConfig;
  cabinetHeight: number;
}

const Preview = ({ config, cabinetHeight }: PreviewProps) => {
  const hasLeft = config.left?.enabled;
  const hasRight = config.right?.enabled;

  const leftTopPercent = hasLeft ? ((config.left?.topOffset ?? 0) / cabinetHeight) * 100 : 0;
  const leftBottomPercent = hasLeft ? ((config.left?.bottomOffset ?? 0) / cabinetHeight) * 100 : 0;
  const rightTopPercent = hasRight ? ((config.right?.topOffset ?? 0) / cabinetHeight) * 100 : 0;
  const rightBottomPercent = hasRight ? ((config.right?.bottomOffset ?? 0) / cabinetHeight) * 100 : 0;

  return (
    <div className="border rounded-lg bg-muted/30 p-4">
      <Label className="text-xs mb-2 block text-center">Podgląd (widok z przodu)</Label>
      <div className="relative h-40 mx-auto w-32 flex justify-center">
        {/* Cabinet body */}
        <div className="w-20 h-full border-2 border-border bg-background rounded" />

        {/* Left side front */}
        {hasLeft && (
          <div
            className="absolute left-0 w-3 bg-primary/60 border border-primary rounded"
            style={{
              top: `${leftTopPercent}%`,
              bottom: `${leftBottomPercent}%`,
            }}
          />
        )}

        {/* Right side front */}
        {hasRight && (
          <div
            className="absolute right-0 w-3 bg-primary/60 border border-primary rounded"
            style={{
              top: `${rightTopPercent}%`,
              bottom: `${rightBottomPercent}%`,
            }}
          />
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        {hasLeft && hasRight
          ? 'Obie strony'
          : hasLeft
          ? 'Lewa strona'
          : hasRight
          ? 'Prawa strona'
          : 'Brak frontów bocznych'}
      </div>
    </div>
  );
};

export function SideFrontsConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  materials,
  defaultFrontMaterialId,
  cabinetHeight,
}: SideFrontsConfigDialogProps) {
  // Internal state for editing
  const [localConfig, setLocalConfig] = useState<SideFrontsConfig>(() => {
    if (config) {
      return config;
    }
    return { left: null, right: null };
  });

  // Reset local config when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalConfig(config ?? { left: null, right: null });
      }
      onOpenChange(isOpen);
    },
    [config, onOpenChange]
  );

  const handleLeftUpdate = (leftConfig: SideFrontConfig | null) => {
    setLocalConfig((prev) => ({ ...prev, left: leftConfig }));
  };

  const handleRightUpdate = (rightConfig: SideFrontConfig | null) => {
    setLocalConfig((prev) => ({ ...prev, right: rightConfig }));
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalConfig({ left: null, right: null });
  };

  const hasAnySideFront =
    localConfig.left?.enabled || localConfig.right?.enabled;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Konfiguracja frontów bocznych</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Preview */}
          <div className="mb-6">
            <Preview config={localConfig} cabinetHeight={cabinetHeight} />
          </div>

          {/* Configuration panels */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SideFrontEditor
              side="left"
              config={localConfig.left}
              onUpdate={handleLeftUpdate}
              materials={materials}
              defaultFrontMaterialId={defaultFrontMaterialId}
              cabinetHeight={cabinetHeight}
            />
            <SideFrontEditor
              side="right"
              config={localConfig.right}
              onUpdate={handleRightUpdate}
              materials={materials}
              defaultFrontMaterialId={defaultFrontMaterialId}
              cabinetHeight={cabinetHeight}
            />
          </div>

          {/* Quick actions */}
          {hasAnySideFront && (
            <div className="mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-xs"
              >
                Wyczyść wszystko
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-background px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
