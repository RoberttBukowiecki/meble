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
import {
  DecorativePanelsConfig,
  DecorativePanelConfig,
  DecorativePanelType,
  DecorativePanelPosition,
  Material,
  DECORATIVE_PANEL_DEFAULTS,
} from '@/types';
import { ArrowUp, ArrowDown } from 'lucide-react';

// Panel type labels in Polish
const PANEL_TYPE_LABELS: Record<DecorativePanelType, { name: string; description: string }> = {
  BLENDA: {
    name: 'Blenda',
    description: 'Panel maskujący przestrzeń nad frontami',
  },
  PLINTH: {
    name: 'Cokół',
    description: 'Podstawa szafki z cofnięciem',
  },
  TRIM_STRIP: {
    name: 'Listwa ozdobna',
    description: 'Cienka listwa dekoracyjna',
  },
  FULL_PANEL: {
    name: 'Pełny panel',
    description: 'Panel dekoracyjny na całą szerokość',
  },
};

interface DecorativePanelsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DecorativePanelsConfig | undefined;
  onConfigChange: (config: DecorativePanelsConfig) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
  cabinetHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
}

/**
 * Single decorative panel editor
 */
interface PanelEditorProps {
  position: DecorativePanelPosition;
  config: DecorativePanelConfig | null;
  onUpdate: (config: DecorativePanelConfig | null) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
  cabinetWidth: number;
  cabinetDepth: number;
}

const PanelEditor = ({
  position,
  config,
  onUpdate,
  materials,
  defaultFrontMaterialId,
  cabinetWidth,
  cabinetDepth,
}: PanelEditorProps) => {
  const isEnabled = config?.enabled ?? false;
  const Icon = position === 'TOP' ? ArrowUp : ArrowDown;
  const positionLabel = position === 'TOP' ? 'Góra' : 'Dół';

  // Get default type based on position
  const defaultType: DecorativePanelType = position === 'TOP' ? 'BLENDA' : 'PLINTH';

  const handleToggle = (checked: boolean) => {
    if (checked) {
      const defaults = DECORATIVE_PANEL_DEFAULTS[defaultType];
      onUpdate({
        enabled: true,
        type: defaultType,
        position,
        height: defaults.height ?? 50,
        recess: defaults.recess ?? 0,
        thickness: defaults.thickness,
      });
    } else {
      onUpdate(null);
    }
  };

  const handleTypeChange = (type: DecorativePanelType) => {
    if (!config) return;
    const defaults = DECORATIVE_PANEL_DEFAULTS[type];
    onUpdate({
      ...config,
      type,
      height: defaults.height ?? config.height,
      recess: defaults.recess ?? 0,
      thickness: defaults.thickness,
    });
  };

  const handleHeightChange = (value: number) => {
    if (!config) return;
    onUpdate({
      ...config,
      height: Math.max(10, Math.min(500, value)),
    });
  };

  const handleRecessChange = (value: number) => {
    if (!config) return;
    onUpdate({
      ...config,
      recess: Math.max(0, Math.min(cabinetDepth - 20, value)),
    });
  };

  const handleMaterialChange = (materialId: string) => {
    if (!config) return;
    onUpdate({
      ...config,
      materialId: materialId === 'default' ? undefined : materialId,
    });
  };

  // Get board materials for selection
  const boardMaterials = materials.filter(
    (m) => m.category === 'board' || !m.category
  );

  // Determine which options to show based on type
  const showRecess = config?.type === 'PLINTH';
  const showThickness = config?.type === 'TRIM_STRIP';

  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-4 transition-colors',
        isEnabled ? 'bg-card' : 'bg-muted/30 border-dashed'
      )}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-1.5 rounded-md',
              isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h4 className="font-medium text-sm">{positionLabel}</h4>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      </div>

      {/* Configuration fields (only shown when enabled) */}
      {isEnabled && config && (
        <div className="space-y-4 pt-2 border-t mt-2">
          {/* Panel type selector */}
          <div className="space-y-2">
            <Label className="text-sm">Typ panelu</Label>
            <Select value={config.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PANEL_TYPE_LABELS) as DecorativePanelType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col">
                      <span>{PANEL_TYPE_LABELS[type].name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PANEL_TYPE_LABELS[config.type].description}
            </p>
          </div>

          {/* Material selector */}
          <div className="space-y-2">
            <Label className="text-sm">Materiał</Label>
            <Select
              value={config.materialId ?? 'default'}
              onValueChange={handleMaterialChange}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Wybierz materiał" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Domyślny (materiał frontu)</SelectItem>
                {boardMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name} ({material.thickness}mm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label className="text-sm">Wysokość (mm)</Label>
            <NumberInput
              value={config.height}
              onChange={handleHeightChange}
              min={10}
              max={500}
              allowNegative={false}
              className="w-full h-9"
            />
          </div>

          {/* Recess - only for PLINTH */}
          {showRecess && (
            <div className="space-y-2">
              <Label className="text-sm">Cofnięcie od frontu (mm)</Label>
              <NumberInput
                value={config.recess ?? 0}
                onChange={handleRecessChange}
                min={0}
                max={cabinetDepth - 20}
                allowNegative={false}
                className="w-full h-9"
              />
              <p className="text-xs text-muted-foreground">
                Odległość od przodu szafki do czoła cokołu
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground flex justify-between">
              Wymiary:
              <span className="font-medium text-foreground">
                {cabinetWidth}mm × {config.height}mm
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Visual preview of cabinet with decorative panels
 */
interface PreviewProps {
  config: DecorativePanelsConfig;
  cabinetHeight: number;
}

const Preview = ({ config, cabinetHeight }: PreviewProps) => {
  const hasTop = config.top?.enabled;
  const hasBottom = config.bottom?.enabled;

  const topHeight = config.top?.height ?? 0;
  const bottomHeight = config.bottom?.height ?? 0;
  const bottomRecess = config.bottom?.recess ?? 0;

  // Preview dimensions (px)
  const previewCabinetHeight = 160;
  const scale = previewCabinetHeight / cabinetHeight;

  const topHeightPx = Math.max(topHeight * scale, 8);
  const bottomHeightPx = Math.max(bottomHeight * scale, 8);
  const bottomRecessPx = bottomRecess * scale;

  return (
    <div className="border rounded-lg bg-muted/30 p-6 flex flex-col items-center justify-center">
      <Label className="text-xs font-medium mb-4 block text-center text-muted-foreground uppercase tracking-wider">
        Podgląd (widok z boku)
      </Label>

      <div className="flex flex-col items-center gap-0.5">
        {/* Top panel */}
        {hasTop && (
          <div
            className="w-24 bg-primary/20 border border-primary rounded-t-sm"
            style={{ height: `${topHeightPx}px` }}
          />
        )}

        {/* Cabinet body */}
        <div
          className="w-24 border-2 border-border bg-background shadow-inner"
          style={{ height: `${previewCabinetHeight}px` }}
        />

        {/* Bottom panel (plinth) */}
        {hasBottom && (
          <div
            className={cn(
              'bg-primary/20 border border-primary rounded-b-sm',
              bottomRecess > 0 ? 'self-end' : 'self-center'
            )}
            style={{
              width: bottomRecess > 0 ? `${96 - bottomRecessPx}px` : '96px',
              height: `${bottomHeightPx}px`,
              marginRight: bottomRecess > 0 ? `${bottomRecessPx / 2}px` : 0,
            }}
          />
        )}
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center font-medium">
        {hasTop && hasBottom
          ? 'Góra i dół skonfigurowane'
          : hasTop
          ? 'Góra skonfigurowana'
          : hasBottom
          ? 'Dół skonfigurowany'
          : 'Brak paneli dekoracyjnych'}
      </div>
    </div>
  );
};

export function DecorativePanelsConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  materials,
  defaultFrontMaterialId,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
}: DecorativePanelsConfigDialogProps) {
  // Internal state for editing
  const [localConfig, setLocalConfig] = useState<DecorativePanelsConfig>(() => {
    if (config) {
      return config;
    }
    return { top: null, bottom: null };
  });

  // Reset local config when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalConfig(config ?? { top: null, bottom: null });
      }
      onOpenChange(isOpen);
    },
    [config, onOpenChange]
  );

  const handleTopUpdate = (topConfig: DecorativePanelConfig | null) => {
    setLocalConfig((prev) => ({ ...prev, top: topConfig }));
  };

  const handleBottomUpdate = (bottomConfig: DecorativePanelConfig | null) => {
    setLocalConfig((prev) => ({ ...prev, bottom: bottomConfig }));
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalConfig({ top: null, bottom: null });
  };

  const hasAnyPanel = localConfig.top?.enabled || localConfig.bottom?.enabled;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-6 border-b">
          <DialogTitle>Panele dekoracyjne (góra/dół)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Preview */}
            <div className="md:col-span-1 space-y-4">
              <Preview config={localConfig} cabinetHeight={cabinetHeight} />
              {hasAnyPanel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Wyczyść konfigurację
                </Button>
              )}
            </div>

            {/* Right Column: Configuration Panels */}
            <div className="md:col-span-2 space-y-4">
              <PanelEditor
                position="TOP"
                config={localConfig.top}
                onUpdate={handleTopUpdate}
                materials={materials}
                defaultFrontMaterialId={defaultFrontMaterialId}
                cabinetWidth={cabinetWidth}
                cabinetDepth={cabinetDepth}
              />
              <PanelEditor
                position="BOTTOM"
                config={localConfig.bottom}
                onUpdate={handleBottomUpdate}
                materials={materials}
                defaultFrontMaterialId={defaultFrontMaterialId}
                cabinetWidth={cabinetWidth}
                cabinetDepth={cabinetDepth}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-muted/20 px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
