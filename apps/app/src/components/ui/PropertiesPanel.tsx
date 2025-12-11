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
} from '@/types';
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
    if ('drawerCount' in localParams) return localParams.drawerCount;
    return 2;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1">
        <div>
          <span className="text-xs text-muted-foreground">{t('width')}</span>
          <NumberInput
            className="h-8"
            value={localParams.width}
            onChange={(val) => updateParams({ width: val })}
            min={1}
            allowNegative={false}
          />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{t('height')}</span>
          <NumberInput
            className="h-8"
            value={localParams.height}
            onChange={(val) => updateParams({ height: val })}
            min={1}
            allowNegative={false}
          />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{t('depth')}</span>
          <NumberInput
            className="h-8"
            value={localParams.depth}
            onChange={(val) => updateParams({ depth: val })}
            min={1}
            allowNegative={false}
          />
        </div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{t('topBottomPlacement')}</span>
        <Select
          value={localParams.topBottomPlacement}
          onValueChange={(value) =>
            updateParams({ topBottomPlacement: value as TopBottomPlacement } as any)
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inset">{t('topBottomPlacementInset')}</SelectItem>
            <SelectItem value="overlay">{t('topBottomPlacementOverlay')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === 'KITCHEN' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
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
            <span className="text-xs text-muted-foreground">{t('doors')}</span>
            <Switch
              checked={getHasDoors()}
              onCheckedChange={(val) => updateParams({ hasDoors: val } as any)}
            />
          </div>
        </>
      )}
      {type === 'WARDROBE' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('doorsWithCount', { count: getDoorCount() })}</span>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('shelvesWithCount', { count: getShelfCount() })}</span>
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
            <span className="text-xs text-muted-foreground">{t('backPanel')}</span>
            <Switch
              checked={getHasBack()}
              onCheckedChange={(val) => updateParams({ hasBack: val } as any)}
            />
          </div>
        </>
      )}
      {type === 'DRAWER' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{t('drawersWithCount', { count: getDrawerCount() })}</span>
          <Slider
            className="w-24"
            value={[getDrawerCount()]}
            onValueChange={([val]) => updateParams({ drawerCount: val } as any)}
            min={2}
            max={8}
            step={1}
          />
        </div>
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

  // Part mode specific data - MUST call hook unconditionally (Rules of Hooks)
  const cabinetForPart = useCabinet(selectedPart?.cabinetMetadata?.cabinetId);

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
            className="h-8 mt-0.5"
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
        </Accordion>
      </div>
    );
  }

  return null;
}
