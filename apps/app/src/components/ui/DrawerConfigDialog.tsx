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
import { Plus, Trash2, ChevronUp, ChevronDown, LayoutTemplate } from 'lucide-react';

// Drawer slide type labels
const DRAWER_SLIDE_LABELS: Record<DrawerSlideType, string> = {
  SIDE_MOUNT: 'Boczne (13mm)',
  UNDERMOUNT: 'Podszufladowe (21mm)',
  BOTTOM_MOUNT: 'Dolne (13mm)',
  CENTER_MOUNT: 'Centralne (0mm)',
};

// Default body material thickness for drawer box calculations
const DEFAULT_BODY_THICKNESS = 18;

interface DrawerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DrawerConfiguration | undefined;
  onConfigChange: (config: DrawerConfiguration) => void;
  cabinetHeight: number;
  cabinetWidth: number;
}

/**
 * Interactive 2D preview of drawer zones with dimensions
 */
interface ZonePreviewProps {
  zones: DrawerZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onMoveZone: (id: string, direction: 'up' | 'down') => void;
  cabinetHeight: number;
  cabinetWidth: number;
  slideType: DrawerSlideType;
}

const ZonePreview = ({
  zones,
  selectedZoneId,
  onSelectZone,
  onMoveZone,
  cabinetHeight,
  cabinetWidth,
  slideType,
}: ZonePreviewProps) => {
  const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);

  // Calculate interior height (cabinet height - 2x body thickness)
  const interiorHeight = Math.max(cabinetHeight - DEFAULT_BODY_THICKNESS * 2, 0);

  // Calculate drawer box width based on slide type
  const slideConfig = DRAWER_SLIDE_PRESETS[slideType];
  const drawerBoxWidth = cabinetWidth - 2 * slideConfig.sideOffset - 2 * DEFAULT_BODY_THICKNESS;

  // Calculate actual heights in mm for each zone
  const zoneHeights = zones.map(zone =>
    Math.round((zone.heightRatio / totalRatio) * interiorHeight)
  );

  return (
    <div className="border rounded-lg bg-muted/20 p-4 h-full min-h-[360px] flex flex-col">
      {/* Drawer width header */}
      <div className="text-center mb-3 pb-2 border-b border-dashed">
        <div className="text-xs text-muted-foreground">Szerokość szuflad</div>
        <div className="text-sm font-mono font-semibold">{Math.round(drawerBoxWidth)} mm</div>
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full max-w-[200px] mx-auto relative">
        {zones.map((zone, index) => {
          const heightPercent = (zone.heightRatio / totalRatio) * 100;
          const isSelected = zone.id === selectedZoneId;
          const hasExternalFront = zone.front !== null;
          const boxCount = zone.boxes.length;
          const zoneHeightMm = zoneHeights[index];

          return (
            <div
              key={zone.id}
              className={cn(
                'relative flex-shrink-0 rounded border-2 transition-all cursor-pointer shadow-sm',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 z-10'
                  : 'border-border hover:border-primary/50 bg-background',
                hasExternalFront ? '' : 'border-dashed opacity-80'
              )}
              style={{ height: `${heightPercent}%`, minHeight: '48px' }}
              onClick={() => onSelectZone(zone.id)}
            >
              {/* Internal drawer boxes visualization (dashed) */}
              {hasExternalFront && (
                <div className="absolute inset-2 border border-dashed border-muted-foreground/40 rounded-sm pointer-events-none">
                  {/* Show dividers for multiple boxes */}
                  {boxCount > 1 && (
                    <div className="absolute inset-0 flex flex-col">
                      {zone.boxes.map((box, boxIdx) => {
                        const boxTotalRatio = zone.boxes.reduce((s, b) => s + b.heightRatio, 0);
                        const boxPercent = (box.heightRatio / boxTotalRatio) * 100;
                        return (
                          <div
                            key={boxIdx}
                            className={cn(
                              "flex-shrink-0",
                              boxIdx < boxCount - 1 && "border-b border-dashed border-muted-foreground/40"
                            )}
                            style={{ height: `${boxPercent}%` }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Zone content label */}
              <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                <div className="text-center w-full overflow-hidden">
                  <div className="text-xs font-semibold truncate">
                    {hasExternalFront ? 'Front' : 'Wewnętrzna'}
                  </div>
                  {boxCount > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      {boxCount} {boxCount === 1 ? 'box' : boxCount < 5 ? 'boxy' : 'boxów'}
                    </div>
                  )}
                </div>
              </div>

              {/* Reorder buttons (only visible on selection) */}
              {isSelected && (
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
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
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
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

              {/* Height dimension label (mm) */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-foreground font-medium">{zoneHeightMm}</span>
                <span className="text-[10px] ml-0.5">mm</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cabinet total height footer */}
      <div className="text-center mt-3 pt-2 border-t border-dashed">
        <div className="text-xs text-muted-foreground">Wysokość szafki</div>
        <div className="text-sm font-mono font-semibold">{cabinetHeight} mm</div>
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
    <div className="border rounded-lg p-5 space-y-5 bg-card shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b">
        <h4 className="font-semibold text-sm flex items-center gap-2">
            Edycja strefy
        </h4>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Height ratio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Wysokość (proporcja)</Label>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{zone.heightRatio}x</span>
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
      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/10">
        <div>
          <Label className="text-sm font-medium cursor-pointer" htmlFor="front-toggle">Front zewnętrzny</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasExternalFront ? 'Widoczny front' : 'Szuflada wewnętrzna'}
          </p>
        </div>
        <Switch
          id="front-toggle"
          checked={hasExternalFront}
          onCheckedChange={handleFrontToggle}
        />
      </div>

      {/* Box count (for drawer-in-drawer) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Ilość szuflad w strefie</Label>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={() => handleBoxCountChange(Math.max(1, boxCount - 1))}
              disabled={boxCount <= 1}
            >
              -
            </Button>
            <span className="w-8 text-center text-sm font-medium">{boxCount}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-l"
              onClick={() => handleBoxCountChange(Math.min(4, boxCount + 1))}
              disabled={boxCount >= 4}
            >
              +
            </Button>
          </div>
        </div>
        {boxCount > 1 && (
          <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 p-2 rounded border border-amber-200 dark:border-amber-900">
            {hasExternalFront
              ? `Jeden wysoki front zakrywa ${boxCount} szuflady wewnętrzne.`
              : `${boxCount} wewnętrzne szuflady bez frontów.`}
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.entries(DRAWER_ZONE_PRESETS).map(([key, preset]) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          className="text-xs h-auto py-2 flex flex-col gap-1 items-center"
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
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
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
  cabinetWidth,
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
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-4xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-6 border-b">
          <DialogTitle>Konfiguracja szuflad</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
            
            {/* Left Column: Preview */}
            <div className="md:col-span-5 flex flex-col gap-4">
               <div>
                  <Label className="text-sm font-medium mb-3 block">Podgląd układu</Label>
                  <ZonePreview
                    zones={localConfig.zones}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={setSelectedZoneId}
                    onMoveZone={handleMoveZone}
                    cabinetHeight={cabinetHeight}
                    cabinetWidth={cabinetWidth}
                    slideType={localConfig.slideType}
                  />
                  <div className="mt-2 text-xs text-center text-muted-foreground bg-muted/20 py-2 rounded">
                    {totalFronts} frontów • {totalBoxes} szuflad łącznie
                  </div>
               </div>
               
               {/* Add zone button */}
               <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={handleAddZone}
                  disabled={localConfig.zones.length >= 8}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj nową strefę
               </Button>
            </div>

            {/* Right Column: Editor & Settings */}
            <div className="md:col-span-7 flex flex-col gap-6">
              
              {/* Presets */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Szybkie szablony</Label>
                <PresetButtons onSelect={handlePresetSelect} />
              </div>

              {/* Active Zone Editor */}
              <div>
                 {selectedZone ? (
                    <ZoneEditor
                      zone={selectedZone}
                      onUpdate={handleUpdateZone}
                      onDelete={() => handleDeleteZone(selectedZone.id)}
                      canDelete={localConfig.zones.length > 1}
                    />
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm h-full flex items-center justify-center">
                      Wybierz strefę z podglądu, aby ją edytować
                    </div>
                  )}
              </div>

              {/* Slide type selector */}
              <div className="bg-muted/10 p-4 rounded-lg border">
                <Label className="text-sm font-medium mb-2 block">System prowadnic</Label>
                <Select
                  value={localConfig.slideType}
                  onValueChange={(value: DrawerSlideType) => handleSlideTypeChange(value)}
                >
                  <SelectTrigger className="w-full h-9">
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
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Wymagany luz boczny: {DRAWER_SLIDE_PRESETS[localConfig.slideType].sideOffset}mm na stronę
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-muted/20 px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            Zastosuj zmiany
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
