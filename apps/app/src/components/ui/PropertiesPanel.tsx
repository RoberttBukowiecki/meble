'use client';

/**
 * Properties panel for editing selected part or cabinet attributes
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  useSelectedPart,
  useSelectedCabinet,
  useCabinet,
  useSelectedParts,
  useIsMultiSelectActive,
} from '@/lib/store';
import { Input, NumberInput } from '@meble/ui';
import { Button } from '@meble/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import { Switch } from '@meble/ui';
import { Trash2, Copy, AlertCircle } from 'lucide-react';
import type {
  ShapeParamsRect,
  EdgeBandingRect,
  ShapeType,
  ShapeParamsTrapezoid,
  ShapeParamsLShape,
  ShapeParamsPolygon,
  CabinetParams,
  CabinetType,
  TopBottomPlacement,
  KitchenCabinetParams,
  DrawerCabinetParams,
  DoorConfig,
  DrawerSlideType,
} from '@/types';
import { DEFAULT_DOOR_CONFIG, DRAWER_SLIDE_PRESETS } from '@/lib/config';
import { HandleSelector } from './HandleSelector';
import { generateHandleMetadata, DoorType } from '@/lib/handlePresets';
import type { HandleConfig } from '@/types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Slider,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@meble/ui';

import { getCabinetTypeLabel } from '@/lib/cabinetHelpers';

// ============================================================================
// Helper Components
// ============================================================================

interface KitchenDoorConfigSectionProps {
  params: KitchenCabinetParams;
  onUpdate: (newParams: Partial<CabinetParams>) => void;
}

const KitchenDoorConfigSection = ({ params, onUpdate }: KitchenDoorConfigSectionProps) => {
  const doorConfig = params.doorConfig ?? DEFAULT_DOOR_CONFIG;

  const updateDoorConfig = (updates: Partial<DoorConfig>) => {
    onUpdate({
      doorConfig: { ...doorConfig, ...updates },
    } as any);
  };

  return (
    <Accordion type="multiple" defaultValue={['door-config']} className="w-full border-t pt-2 mt-2">
      <AccordionItem value="door-config" className="border-b-0">
        <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
          Konfiguracja frontów
        </AccordionTrigger>
        <AccordionContent className="pb-2 pt-0">
          <div className="space-y-2">
            {/* Door layout */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">Układ</span>
              <div className="flex gap-1">
                <Button
                  variant={doorConfig.layout === 'SINGLE' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => updateDoorConfig({ layout: 'SINGLE' })}
                >
                  Pojedyncze
                </Button>
                <Button
                  variant={doorConfig.layout === 'DOUBLE' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => updateDoorConfig({ layout: 'DOUBLE' })}
                >
                  Podwójne
                </Button>
              </div>
            </div>

            {/* Opening direction */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">Otwieranie</span>
              <Select
                value={doorConfig.openingDirection}
                onValueChange={(value) => updateDoorConfig({ openingDirection: value as any })}
              >
                <SelectTrigger className="h-6 text-[10px] w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HORIZONTAL">Na bok</SelectItem>
                  <SelectItem value="LIFT_UP">Do góry</SelectItem>
                  <SelectItem value="FOLD_DOWN">W dół</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hinge side (for single horizontal doors) */}
            {doorConfig.layout === 'SINGLE' && doorConfig.openingDirection === 'HORIZONTAL' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Zawiasy</span>
                <div className="flex gap-1">
                  <Button
                    variant={doorConfig.hingeSide === 'LEFT' ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateDoorConfig({ hingeSide: 'LEFT' })}
                  >
                    Lewa
                  </Button>
                  <Button
                    variant={doorConfig.hingeSide === 'RIGHT' ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateDoorConfig({ hingeSide: 'RIGHT' })}
                  >
                    Prawa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
      {/* Handle configuration */}
      <HandleSelector
        value={params.handleConfig}
        onChange={(handleConfig) => onUpdate({ handleConfig } as any)}
        doorWidth={(params.width ?? 800) - 4}
        doorHeight={(params.height ?? 720) - 4}
      />
    </Accordion>
  );
};

interface CabinetParameterEditorProps {
  type: CabinetType;
  params: CabinetParams;
  onChange: (params: CabinetParams) => void;
}

const CabinetParameterEditor = ({ type, params, onChange }: CabinetParameterEditorProps) => {
  const t = useTranslations('PropertiesPanel');
  const [localParams, setLocalParams] = React.useState(params);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Update local params when external params change
  React.useEffect(() => {
    setLocalParams(params);
    setHasChanges(false);
  }, [params]);

  const updateParams = (newParams: Partial<CabinetParams>) => {
    setLocalParams(prev => ({ ...prev, ...newParams } as CabinetParams));
    setHasChanges(true);
  };

  const handleApply = () => {
    onChange(localParams);
    setHasChanges(false);
  };

  // Type-safe accessors for discriminated union properties
  const getShelfCount = (): number => {
    if ('shelfCount' in localParams) return localParams.shelfCount;
    return 0;
  };

  const getDoorCount = (): number => {
    if ('doorCount' in localParams) return localParams.doorCount;
    return 1;
  };

  const getHasDoors = (): boolean => {
    if ('hasDoors' in localParams) return localParams.hasDoors;
    return false;
  };

  const getHasBack = (): boolean => {
    if ('hasBack' in localParams) return localParams.hasBack;
    return false;
  };

  const getDrawerCount = (): number => {
    if ('drawerCount' in localParams && localParams.drawerCount !== undefined) return localParams.drawerCount;
    return 2;
  };

  const getDrawerSlideType = (): DrawerSlideType => {
    if ('drawerSlideType' in localParams && localParams.drawerSlideType) return localParams.drawerSlideType;
    return 'SIDE_MOUNT';
  };

  const getHasInternalDrawers = (): boolean => {
    if ('hasInternalDrawers' in localParams && localParams.hasInternalDrawers !== undefined) return localParams.hasInternalDrawers;
    return false;
  };

  // Drawer slide type labels
  const DRAWER_SLIDE_LABELS: Record<DrawerSlideType, string> = {
    SIDE_MOUNT: 'Boczne (13mm)',
    UNDERMOUNT: 'Podszufladowe (21mm)',
    BOTTOM_MOUNT: 'Dolne (13mm)',
    CENTER_MOUNT: 'Centralne (0mm)',
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1">
        <div>
          <span className="text-[10px] text-muted-foreground">{t('width')}</span>
          <NumberInput
            className="h-7 text-xs"
            value={localParams.width}
            onChange={(val) => updateParams({ width: val })}
            min={1}
            allowNegative={false}
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">{t('height')}</span>
          <NumberInput
            className="h-7 text-xs"
            value={localParams.height}
            onChange={(val) => updateParams({ height: val })}
            min={1}
            allowNegative={false}
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">{t('depth')}</span>
          <NumberInput
            className="h-7 text-xs"
            value={localParams.depth}
            onChange={(val) => updateParams({ depth: val })}
            min={1}
            allowNegative={false}
          />
        </div>
      </div>
      <div>
        <span className="text-[10px] text-muted-foreground">{t('topBottomPlacement')}</span>
        <Select
          value={localParams.topBottomPlacement}
          onValueChange={(value) =>
            updateParams({ topBottomPlacement: value as TopBottomPlacement } as any)
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inset" className="text-xs">{t('topBottomPlacementInset')}</SelectItem>
            <SelectItem value="overlay" className="text-xs">{t('topBottomPlacementOverlay')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === 'KITCHEN' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
            <Slider
              className="w-24"
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={0}
              max={5}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{t('doors')}</span>
            <Switch
              className="scale-75"
              checked={getHasDoors()}
              onCheckedChange={(val) => updateParams({ hasDoors: val } as any)}
            />
          </div>

          {/* Door configuration */}
          {getHasDoors() && (
            <KitchenDoorConfigSection
              params={localParams as KitchenCabinetParams}
              onUpdate={updateParams}
            />
          )}
        </>
      )}
      {type === 'WARDROBE' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
            <Slider
              className="w-24"
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={0}
              max={10}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('doorsWithCount', { count: getDoorCount() })}</span>
            <Slider
              className="w-24"
              value={[getDoorCount()]}
              onValueChange={([val]) => updateParams({ doorCount: val } as any)}
              min={1}
              max={4}
              step={1}
            />
          </div>
        </>
      )}
      {type === 'BOOKSHELF' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
            <Slider
              className="w-24"
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{t('backPanel')}</span>
            <Switch
              className="scale-75"
              checked={getHasBack()}
              onCheckedChange={(val) => updateParams({ hasBack: val } as any)}
            />
          </div>
        </>
      )}
      {type === 'DRAWER' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('drawersWithCount', { count: getDrawerCount() })}</span>
            <Slider
              className="w-24"
              value={[getDrawerCount()]}
              onValueChange={([val]) => updateParams({ drawerCount: val } as any)}
              min={1}
              max={8}
              step={1}
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">{t('slideType')}</span>
            <Select
              value={getDrawerSlideType()}
              onValueChange={(value) =>
                updateParams({ drawerSlideType: value as DrawerSlideType } as any)
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DRAWER_SLIDE_PRESETS) as DrawerSlideType[]).map((slideType) => (
                  <SelectItem key={slideType} value={slideType} className="text-xs">
                    {DRAWER_SLIDE_LABELS[slideType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{t('internalDrawers')}</span>
            <Switch
              className="scale-75"
              checked={getHasInternalDrawers()}
              onCheckedChange={(val) => updateParams({ hasInternalDrawers: val } as any)}
            />
          </div>
          {/* Handle configuration for drawer fronts */}
          {!getHasInternalDrawers() && (
            <div className="border-t pt-2 mt-2">
              <HandleSelector
                value={(localParams as DrawerCabinetParams).handleConfig}
                onChange={(handleConfig) => updateParams({ handleConfig } as any)}
                doorWidth={(localParams.width ?? 600) - 40}
                doorHeight={((localParams.height ?? 800) - 36) / getDrawerCount() - 3}
              />
            </div>
          )}
        </>
      )}

      {/* Apply button */}
      {hasChanges && (
        <Button onClick={handleApply} size="sm" className="w-full">
          {t('applyChanges')}
        </Button>
      )}
    </div>
  );
};


// ============================================================================
// Main Panel Component
// ============================================================================

export function PropertiesPanel() {
  const t = useTranslations('PropertiesPanel');
  // PERFORMANCE: Use useShallow to prevent re-renders during 3D transforms
  const {
    updatePart,
    removePart,
    selectPart,
    materials,
    parts,
    duplicatePart,
    updateCabinet,
    updateCabinetParams,
    updateCabinetTransform,
    removeCabinet,
    duplicateCabinet,
    selectCabinet,
  } = useStore(
    useShallow((state) => ({
      updatePart: state.updatePart,
      removePart: state.removePart,
      selectPart: state.selectPart,
      materials: state.materials,
      parts: state.parts,
      duplicatePart: state.duplicatePart,
      updateCabinet: state.updateCabinet,
      updateCabinetParams: state.updateCabinetParams,
      updateCabinetTransform: state.updateCabinetTransform,
      removeCabinet: state.removeCabinet,
      duplicateCabinet: state.duplicateCabinet,
      selectCabinet: state.selectCabinet,
    }))
  );

  const selectedPart = useSelectedPart();
  const selectedCabinet = useSelectedCabinet();
  const selectedParts = useSelectedParts();
  const isMultiSelect = useIsMultiSelectActive();

  // Part mode specific data - MUST call hook unconditionally (Rules of Hooks)
  const cabinetForPart = useCabinet(selectedPart?.cabinetMetadata?.cabinetId);

  // Multiselect actions
  const {
    deleteSelectedParts,
    duplicateSelectedParts,
    updatePartsBatch,
    clearSelection,
  } = useStore(
    useShallow((state) => ({
      deleteSelectedParts: state.deleteSelectedParts,
      duplicateSelectedParts: state.duplicateSelectedParts,
      updatePartsBatch: state.updatePartsBatch,
      clearSelection: state.clearSelection,
    }))
  );

  // ================= Render Multiselect Mode =================
  if (isMultiSelect && selectedParts.length > 1) {
    // Check if all parts have the same material
    const materialIds = new Set(selectedParts.map(p => p.materialId));
    const commonMaterialId = materialIds.size === 1 ? Array.from(materialIds)[0] : null;

    const handleBatchMaterialChange = (materialId: string) => {
      const updates = selectedParts.map(p => ({ id: p.id, patch: { materialId } }));
      updatePartsBatch(updates);
    };

    return (
      <div className="p-2">
        {/* Multiselect header */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="text-xs">
            {t('multiselect', { count: selectedParts.length })}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={duplicateSelectedParts}
              title={t('duplicateAll')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={deleteSelectedParts}
              title={t('deleteAll')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selection summary */}
        <div className="mb-3 p-2 bg-muted/30 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">{t('selectedParts')}:</p>
          <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
            {selectedParts.map(p => (
              <li key={p.id} className="truncate">{p.name}</li>
            ))}
          </ul>
        </div>

        {/* Batch material change */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t('material')}</label>
          <Select
            value={commonMaterialId ?? ''}
            onValueChange={handleBatchMaterialChange}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={commonMaterialId ? undefined : t('mixedMaterials')} />
            </SelectTrigger>
            <SelectContent>
              {materials.map((mat) => (
                <SelectItem key={mat.id} value={mat.id}>
                  {mat.name} ({mat.thickness}mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear selection button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={clearSelection}
        >
          {t('clearSelection')}
        </Button>
      </div>
    );
  }

  if (selectedCabinet) {
    // ================= Render Cabinet Mode =================
    const handleParamsChange = (id: string, newParams: CabinetParams) => {
      if (window.confirm(t('parametersConfirm'))) {
        updateCabinetParams(id, newParams);
      }
    };

    const handleDeleteCabinet = () => {
      if (window.confirm(t('deleteCabinetConfirm', { name: selectedCabinet.name }))) {
        removeCabinet(selectedCabinet.id);
      }
    };

    // Calculate cabinet center and rotation from its parts
    const cabinetParts = parts.filter((p) => selectedCabinet.partIds.includes(p.id));
    const cabinetCenter: [number, number, number] = cabinetParts.length > 0
      ? (() => {
          const sum = cabinetParts.reduce(
            (acc, p) => [acc[0] + p.position[0], acc[1] + p.position[1], acc[2] + p.position[2]] as [number, number, number],
            [0, 0, 0] as [number, number, number]
          );
          return [
            Math.round(sum[0] / cabinetParts.length),
            Math.round(sum[1] / cabinetParts.length),
            Math.round(sum[2] / cabinetParts.length)
          ] as [number, number, number];
        })()
      : [0, 0, 0];

    // Get rotation from reference part (bottom or first)
    const referencePart = cabinetParts.find((p) => p.cabinetMetadata?.role === 'BOTTOM') ?? cabinetParts[0];
    const cabinetRotation: [number, number, number] = referencePart?.rotation ?? [0, 0, 0];
    const cabinetRotationDegrees = cabinetRotation.map(
      (r) => Math.round((r * 180) / Math.PI * 100) / 100
    ) as [number, number, number];

    const handleCabinetPositionUpdate = (axis: 0 | 1 | 2, value: number) => {
      const newPosition = [...cabinetCenter] as [number, number, number];
      newPosition[axis] = value;
      updateCabinetTransform(selectedCabinet.id, { position: newPosition });
    };

    const handleCabinetRotationUpdate = (axis: 0 | 1 | 2, valueDegrees: number) => {
      const newRotation = [...cabinetRotation] as [number, number, number];
      newRotation[axis] = (valueDegrees * Math.PI) / 180;
      updateCabinetTransform(selectedCabinet.id, { rotation: newRotation });
    };

    return (
      <div className="p-2">
        {/* Cabinet header */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {getCabinetTypeLabel(selectedCabinet.type)}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => duplicateCabinet(selectedCabinet.id)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDeleteCabinet}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground">{t('cabinetName')}</span>
          <Input
            className="h-7 text-xs mt-0.5"
            value={selectedCabinet.name}
            onChange={(e) =>
              updateCabinet(selectedCabinet.id, { name: e.target.value })
            }
          />
        </div>

        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {/* Parameters */}
          <AccordionItem value="params" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              <div className="flex items-center gap-1">
                {t('parameters')}
                <AlertCircle className="h-3 w-3 text-amber-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <p className="text-[10px] text-muted-foreground mb-2">{t('parametersWarning')}</p>
              <CabinetParameterEditor
                type={selectedCabinet.type}
                params={selectedCabinet.params}
                onChange={(newParams) => handleParamsChange(selectedCabinet.id, newParams)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Transform (Position & Rotation) */}
          <AccordionItem value="transform" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('transform')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('position')}</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetCenter[0]}
                        onChange={(val) => handleCabinetPositionUpdate(0, val)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetCenter[1]}
                        onChange={(val) => handleCabinetPositionUpdate(1, val)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Z</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetCenter[2]}
                        onChange={(val) => handleCabinetPositionUpdate(2, val)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('rotation')}</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetRotationDegrees[0]}
                        onChange={(val) => handleCabinetRotationUpdate(0, val)}
                        allowDecimals
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetRotationDegrees[1]}
                        onChange={(val) => handleCabinetRotationUpdate(1, val)}
                        allowDecimals
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Z</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={cabinetRotationDegrees[2]}
                        onChange={(val) => handleCabinetRotationUpdate(2, val)}
                        allowDecimals
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Materials */}
          <AccordionItem value="materials" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('materials')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('bodyMaterial')}</span>
                  <Select
                    value={selectedCabinet.materials.bodyMaterialId}
                    onValueChange={(id) =>
                      updateCabinet(selectedCabinet.id, {
                        materials: { ...selectedCabinet.materials, bodyMaterialId: id },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.thickness}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('frontMaterial')}</span>
                  <Select
                    value={selectedCabinet.materials.frontMaterialId}
                    onValueChange={(id) =>
                      updateCabinet(selectedCabinet.id, {
                        materials: { ...selectedCabinet.materials, frontMaterialId: id },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.thickness}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  if (selectedPart) {
    // ================= Render Part Mode =================
    const handleUpdate = (field: string, value: any) => {
      updatePart(selectedPart.id, { [field]: value });
    };

    const handleShapeTypeChange = (shapeType: ShapeType) => {
      let shapeParams;
      switch (shapeType) {
        case 'RECT':
          shapeParams = { type: 'RECT' as const, x: 600, y: 400 };
          break;
        case 'TRAPEZOID':
          shapeParams = {
            type: 'TRAPEZOID' as const,
            frontX: 600,
            backX: 400,
            y: 400,
            skosSide: 'left' as const,
          };
          break;
        case 'L_SHAPE':
          shapeParams = {
            type: 'L_SHAPE' as const,
            x: 600,
            y: 400,
            cutX: 200,
            cutY: 200,
          };
          break;
        case 'POLYGON':
          shapeParams = {
            type: 'POLYGON' as const,
            points: [
              [0, 0],
              [600, 0],
              [600, 400],
              [0, 400],
            ] as [number, number][],
          };
          break;
      }
      updatePart(selectedPart.id, { shapeType, shapeParams });
    };

    const handleShapeParamUpdate = (field: string, value: any) => {
      const currentParams = selectedPart.shapeParams;
      updatePart(selectedPart.id, {
        shapeParams: { ...currentParams, [field]: value },
      });
    };

    const handlePositionUpdate = (axis: 0 | 1 | 2, value: number) => {
      const newPosition = [...selectedPart.position] as [number, number, number];
      newPosition[axis] = value;
      updatePart(selectedPart.id, { position: newPosition });
    };

    const handleRotationUpdate = (axis: 0 | 1 | 2, valueDegrees: number) => {
      const newRotation = [...selectedPart.rotation] as [number, number, number];
      // Convert degrees to radians
      newRotation[axis] = (valueDegrees * Math.PI) / 180;
      updatePart(selectedPart.id, { rotation: newRotation });
    };

    // Convert radians to degrees for display
    const rotationDegrees = selectedPart.rotation.map(
      (r) => Math.round((r * 180) / Math.PI * 100) / 100
    ) as [number, number, number];

    const handleMaterialChange = (materialId: string) => {
      updatePart(selectedPart.id, { materialId });
    };

    const handleDelete = () => {
      removePart(selectedPart.id);
    };

    const handleDuplicate = () => {
      duplicatePart(selectedPart.id);
    };

    const handleEdgeBandingUpdate = (
      edge: 'top' | 'bottom' | 'left' | 'right',
      value: boolean
    ) => {
      if (selectedPart.shapeType === 'RECT') {
        const currentEdgeBanding =
          (selectedPart.edgeBanding as EdgeBandingRect) || {};
        const edgeBanding: EdgeBandingRect = {
          type: 'RECT',
          top: currentEdgeBanding?.top || false,
          bottom: currentEdgeBanding?.bottom || false,
          left: currentEdgeBanding?.left || false,
          right: currentEdgeBanding?.right || false,
          [edge]: value,
        };
        updatePart(selectedPart.id, { edgeBanding });
      }
    };

    const edgeBanding =
      selectedPart.shapeType === 'RECT'
        ? (selectedPart.edgeBanding as EdgeBandingRect | undefined)
        : undefined;

    return (
      <div className="p-2">
        {/* Cabinet Part Warning */}
        {cabinetForPart && (
          <Alert className="py-2 mb-2">
            <AlertCircle className="h-3 w-3" />
            <AlertTitle className="text-xs">{t('cabinetPartWarningTitle', { name: cabinetForPart.name })}</AlertTitle>
            <AlertDescription className="text-[10px]">
              {t('cabinetPartWarningDescription')}
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto ml-1 text-[10px]"
                onClick={() => selectCabinet(cabinetForPart.id)}
              >
                {t('editCabinet')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-1 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="flex-1 h-7 text-xs"
          >
            <Copy className="mr-1 h-3 w-3" />
            {t('duplicate')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex-1 h-7 text-xs"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {t('delete')}
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {/* Basic Info */}
          <AccordionItem value="basic" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('basicInfo')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('name')}</span>
                  <Input
                    className="h-7 text-xs"
                    value={selectedPart.name}
                    onChange={(e) => handleUpdate('name', e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('group')}</span>
                  <Input
                    className="h-7 text-xs"
                    value={selectedPart.group || ''}
                    onChange={(e) => handleUpdate('group', e.target.value || undefined)}
                    placeholder={t('groupPlaceholder')}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Shape & Dimensions */}
          <AccordionItem value="shape" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('shapeAndDimensions')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('shapeType')}</span>
                  <Select
                    value={selectedPart.shapeType}
                    onValueChange={(value) => handleShapeTypeChange(value as ShapeType)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECT">{t('shapeRectangle')}</SelectItem>
                      <SelectItem value="TRAPEZOID">{t('shapeTrapezoid')}</SelectItem>
                      <SelectItem value="L_SHAPE">{t('shapeLShape')}</SelectItem>
                      <SelectItem value="POLYGON">{t('shapePolygon')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedPart.shapeType === 'RECT' && (
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">{t('lengthX')}</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={(selectedPart.shapeParams as ShapeParamsRect).x}
                        onChange={(val) => handleShapeParamUpdate('x', val)}
                        min={1}
                        allowNegative={false}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">{t('widthY')}</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={(selectedPart.shapeParams as ShapeParamsRect).y}
                        onChange={(val) => handleShapeParamUpdate('y', val)}
                        min={1}
                        allowNegative={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Transform (Position & Rotation) */}
          <AccordionItem value="transform" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('transform')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('position')}</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={selectedPart.position[0]}
                        onChange={(val) => handlePositionUpdate(0, val)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={selectedPart.position[1]}
                        onChange={(val) => handlePositionUpdate(1, val)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Z</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={selectedPart.position[2]}
                        onChange={(val) => handlePositionUpdate(2, val)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">{t('rotation')}</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={rotationDegrees[0]}
                        onChange={(val) => handleRotationUpdate(0, val)}
                        allowDecimals
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={rotationDegrees[1]}
                        onChange={(val) => handleRotationUpdate(1, val)}
                        allowDecimals
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Z</span>
                      <NumberInput
                        className="h-7 text-xs"
                        value={rotationDegrees[2]}
                        onChange={(val) => handleRotationUpdate(2, val)}
                        allowDecimals
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Material */}
          <AccordionItem value="material" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
              {t('material')}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <Select value={selectedPart.materialId} onValueChange={handleMaterialChange}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder={t('selectMaterial')} />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.thickness}mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>

          {/* Edge Banding */}
          {selectedPart.shapeType === 'RECT' && (
            <AccordionItem value="edgebanding" className="border-b-0">
              <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                {t('edgeBanding')}
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{t('edgeTop')}</span>
                    <Switch
                      className="scale-75"
                      checked={edgeBanding?.top || false}
                      onCheckedChange={(checked) => handleEdgeBandingUpdate('top', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{t('edgeBottom')}</span>
                    <Switch
                      className="scale-75"
                      checked={edgeBanding?.bottom || false}
                      onCheckedChange={(checked) => handleEdgeBandingUpdate('bottom', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{t('edgeLeft')}</span>
                    <Switch
                      className="scale-75"
                      checked={edgeBanding?.left || false}
                      onCheckedChange={(checked) => handleEdgeBandingUpdate('left', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{t('edgeRight')}</span>
                    <Switch
                      className="scale-75"
                      checked={edgeBanding?.right || false}
                      onCheckedChange={(checked) => handleEdgeBandingUpdate('right', checked)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Handle Configuration - only for DOOR or DRAWER_FRONT parts */}
          {(selectedPart.cabinetMetadata?.role === 'DOOR' || selectedPart.cabinetMetadata?.role === 'DRAWER_FRONT') && (
            <AccordionItem value="handle" className="border-b-0">
              <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                {t('handleConfig')}
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-0">
                <HandleSelector
                  value={selectedPart.cabinetMetadata?.handleMetadata?.config}
                  onChange={(handleConfig: HandleConfig | undefined) => {
                    if (!selectedPart.cabinetMetadata) return;

                    // Determine door type based on metadata
                    let doorType: DoorType = 'SINGLE';
                    const doorMeta = selectedPart.cabinetMetadata.doorMetadata;
                    if (doorMeta?.hingeSide === 'LEFT' && selectedPart.name?.toLowerCase().includes('lewy')) {
                      doorType = 'DOUBLE_LEFT';
                    } else if (doorMeta?.hingeSide === 'RIGHT' && selectedPart.name?.toLowerCase().includes('prawy')) {
                      doorType = 'DOUBLE_RIGHT';
                    }

                    // Generate new handle metadata or clear it
                    const handleMetadata = handleConfig
                      ? generateHandleMetadata(
                          handleConfig,
                          selectedPart.width ?? 400,
                          selectedPart.height ?? 400,
                          doorType,
                          doorMeta?.hingeSide
                        )
                      : undefined;

                    // Update the part with new cabinet metadata
                    updatePart(selectedPart.id, {
                      cabinetMetadata: {
                        ...selectedPart.cabinetMetadata,
                        handleMetadata,
                      },
                    });
                  }}
                  doorWidth={selectedPart.width ?? 400}
                  doorHeight={selectedPart.height ?? 400}
                />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    );
  }

  return null;
}
