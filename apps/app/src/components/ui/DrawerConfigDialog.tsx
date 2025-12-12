'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Slider,
  Switch,
  cn,
} from '@meble/ui';
import { DrawerConfiguration, DrawerZone, DrawerSlideType } from '@/types';
import {
  DRAWER_ZONE_PRESETS,
  DRAWER_SLIDE_PRESETS,
  generateZoneId,
  getTotalBoxCount,
  getFrontCount,
} from '@/lib/config';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

// Drawer slide type labels
const DRAWER_SLIDE_LABELS: Record<DrawerSlideType, string> = {
  SIDE_MOUNT: 'Boczne (13mm)',
  UNDERMOUNT: 'Podszufladowe (21mm)',
  BOTTOM_MOUNT: 'Dolne (13mm)',
  CENTER_MOUNT: 'Centralne (0mm)',
};

interface DrawerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DrawerConfiguration | undefined;
  onConfigChange: (config: DrawerConfiguration) => void;
  cabinetHeight: number;
}

/**
 * Interactive 2D preview of drawer zones
 */
interface ZonePreviewProps {
  zones: DrawerZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: 'up' | 'down') => void;
}

const ZonePreview = ({ zones, selectedZoneId, onSelectZone, onMoveZone }: ZonePreviewProps) => {
  const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);

  return (
    <div className="border rounded-lg bg-muted/30 p-3 h-80">
      <div className="flex flex-col h-full gap-1">
        {zones.map((zone, index) => {
          const heightPercent = (zone.heightRatio / totalRatio) * 100;
          const isSelected = zone.id === selectedZoneId;
          const hasExternalFront = zone.front !== null;
          const boxCount = zone.boxes.length;

          return (
            <div
              key={zone.id}
              className={cn(
                'relative flex-shrink-0 rounded border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-background',
                hasExternalFront ? '' : 'border-dashed'
              )}
              style={{ height: `${heightPercent}%`, minHeight: '32px' }}
              onClick={() => onSelectZone(zone.id)}
            >
              {/* Zone content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-medium">
                    {hasExternalFront ? 'Front' : 'Wewnętrzna'}
                  </div>
                  {boxCount > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      {boxCount} boxy
                    </div>
                  )}
                </div>
              </div>

              {/* Reorder buttons */}
              {isSelected && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveZone(zone.id, 'up');
                      }}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  )}
                  {index < zones.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveZone(zone.id, 'down');
                      }}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Height ratio indicator */}
              <div className="absolute left-1 top-1 text-[10px] text-muted-foreground">
                {zone.heightRatio}x
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Zone configuration panel
 */
interface ZoneEditorProps {
  zone: DrawerZone;
  onUpdate: (zone: DrawerZone) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const ZoneEditor = ({ zone, onUpdate, onDelete, canDelete }: ZoneEditorProps) => {
  const hasExternalFront = zone.front !== null;
  const boxCount = zone.boxes.length;

  const handleHeightRatioChange = (value: number[]) => {
    onUpdate({ ...zone, heightRatio: value[0] });
  };

  const handleFrontToggle = (checked: boolean) => {
    onUpdate({
      ...zone,
      front: checked ? {} : null,
    });
  };

  const handleBoxCountChange = (newCount: number) => {
    const boxes = Array.from({ length: newCount }, (_, i) =>
      zone.boxes[i] || { heightRatio: 1 }
    );
    onUpdate({ ...zone, boxes });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Strefa szuflady</h4>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Height ratio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Wysokość (proporcja)</Label>
          <span className="text-xs text-muted-foreground">{zone.heightRatio}x</span>
        </div>
        <Slider
          value={[zone.heightRatio]}
          onValueChange={handleHeightRatioChange}
          min={1}
          max={4}
          step={1}
        />
      </div>

      {/* External front toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Front zewnętrzny</Label>
          <p className="text-[10px] text-muted-foreground">
            {hasExternalFront ? 'Widoczny front' : 'Szuflada wewnętrzna (bez frontu)'}
          </p>
        </div>
        <Switch
          checked={hasExternalFront}
          onCheckedChange={handleFrontToggle}
        />
      </div>

      {/* Box count (for drawer-in-drawer) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Boxy wewnętrzne</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleBoxCountChange(Math.max(1, boxCount - 1))}
              disabled={boxCount <= 1}
            >
              -
            </Button>
            <span className="w-6 text-center text-sm">{boxCount}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleBoxCountChange(Math.min(4, boxCount + 1))}
              disabled={boxCount >= 4}
            >
              +
            </Button>
          </div>
        </div>
        {boxCount > 1 && (
          <p className="text-[10px] text-muted-foreground">
            {hasExternalFront
              ? `Jeden front wysoki zakrywa ${boxCount} boxy wewnętrzne`
              : `${boxCount} wewnętrzne szuflady bez frontu`}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Preset buttons for quick configuration
 */
interface PresetButtonsProps {
  onSelect: (config: DrawerConfiguration) => void;
}

const PresetButtons = ({ onSelect }: PresetButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(DRAWER_ZONE_PRESETS).map(([key, preset]) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            // Create a deep copy with new IDs
            const configCopy: DrawerConfiguration = {
              ...preset.config,
              zones: preset.config.zones.map(z => ({
                ...z,
                id: generateZoneId(),
                boxes: [...z.boxes],
              })),
            };
            onSelect(configCopy);
          }}
        >
          {preset.labelPl}
        </Button>
      ))}
    </div>
  );
};

export function DrawerConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  cabinetHeight,
}: DrawerConfigDialogProps) {
  // Internal state for editing
  const [localConfig, setLocalConfig] = useState<DrawerConfiguration>(() => {
    if (config && config.zones.length > 0) {
      return config;
    }
    // Default: 3 standard drawers
    return DRAWER_ZONE_PRESETS.STANDARD_3.config;
  });

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    localConfig.zones[0]?.id ?? null
  );

  // Reset local config when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && config && config.zones.length > 0) {
      setLocalConfig(config);
      setSelectedZoneId(config.zones[0]?.id ?? null);
    } else if (isOpen && (!config || config.zones.length === 0)) {
      const defaultConfig = DRAWER_ZONE_PRESETS.STANDARD_3.config;
      setLocalConfig({
        ...defaultConfig,
        zones: defaultConfig.zones.map(z => ({ ...z, id: generateZoneId() })),
      });
    }
    onOpenChange(isOpen);
  }, [config, onOpenChange]);

  const selectedZone = useMemo(
    () => localConfig.zones.find(z => z.id === selectedZoneId),
    [localConfig.zones, selectedZoneId]
  );

  const handleAddZone = () => {
    const newZone: DrawerZone = {
      id: generateZoneId(),
      heightRatio: 1,
      front: {},
      boxes: [{ heightRatio: 1 }],
    };
    setLocalConfig(prev => ({
      ...prev,
      zones: [...prev.zones, newZone],
    }));
    setSelectedZoneId(newZone.id);
  };

  const handleDeleteZone = (zoneId: string) => {
    setLocalConfig(prev => {
      const newZones = prev.zones.filter(z => z.id !== zoneId);
      // Select another zone if deleted was selected
      if (selectedZoneId === zoneId && newZones.length > 0) {
        setSelectedZoneId(newZones[0].id);
      }
      return { ...prev, zones: newZones };
    });
  };

  const handleUpdateZone = (updatedZone: DrawerZone) => {
    setLocalConfig(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === updatedZone.id ? updatedZone : z),
    }));
  };

  const handleMoveZone = (zoneId: string, direction: 'up' | 'down') => {
    setLocalConfig(prev => {
      const zones = [...prev.zones];
      const index = zones.findIndex(z => z.id === zoneId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= zones.length) return prev;

      // Swap
      [zones[index], zones[newIndex]] = [zones[newIndex], zones[index]];
      return { ...prev, zones };
    });
  };

  const handleSlideTypeChange = (slideType: DrawerSlideType) => {
    setLocalConfig(prev => ({ ...prev, slideType }));
  };

  const handlePresetSelect = (presetConfig: DrawerConfiguration) => {
    setLocalConfig(presetConfig);
    setSelectedZoneId(presetConfig.zones[0]?.id ?? null);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  const totalBoxes = getTotalBoxCount(localConfig);
  const totalFronts = getFrontCount(localConfig);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Konfiguracja szuflad</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Presets */}
          <div className="mb-6">
            <Label className="text-xs mb-2 block">Szablony</Label>
            <PresetButtons onSelect={handlePresetSelect} />
          </div>

          {/* Main content: Preview + Editor */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Preview */}
            <div>
              <Label className="text-xs mb-2 block">Podgląd (kliknij aby wybrać)</Label>
              <ZonePreview
                zones={localConfig.zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                onMoveZone={handleMoveZone}
              />
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {totalFronts} frontów, {totalBoxes} boxów
              </div>
            </div>

            {/* Editor */}
            <div className="space-y-4">
              {selectedZone ? (
                <ZoneEditor
                  zone={selectedZone}
                  onUpdate={handleUpdateZone}
                  onDelete={() => handleDeleteZone(selectedZone.id)}
                  canDelete={localConfig.zones.length > 1}
                />
              ) : (
                <div className="border rounded-lg p-4 text-center text-muted-foreground text-sm">
                  Wybierz strefę z podglądu
                </div>
              )}

              {/* Add zone button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddZone}
                disabled={localConfig.zones.length >= 8}
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj strefę
              </Button>
            </div>
          </div>

          {/* Slide type selector */}
          <div className="mb-6">
            <Label className="text-xs mb-2 block">Typ prowadnic</Label>
            <Select
              value={localConfig.slideType}
              onValueChange={(value: DrawerSlideType) => handleSlideTypeChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DRAWER_SLIDE_PRESETS) as DrawerSlideType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {DRAWER_SLIDE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Offset boczny: {DRAWER_SLIDE_PRESETS[localConfig.slideType].sideOffset}mm na stronę
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-background px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            Zapisz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
