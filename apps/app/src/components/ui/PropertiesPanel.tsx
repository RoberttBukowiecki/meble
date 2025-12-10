'use client';

/**
 * Properties panel for editing selected part or cabinet attributes
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  useStore,
  useSelectedPart,
  useSelectedCabinet,
  useCabinet,
} from '@/lib/store';
import { Input } from '@meble/ui';
import { Label } from '@meble/ui';
import { Button } from '@meble/ui';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@meble/ui';
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
import { Alert, AlertDescription, AlertTitle, Badge, Slider } from '@meble/ui';

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
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>{t('width')}</Label>
          <Input
            type="number"
            value={localParams.width}
            onChange={(e) => updateParams({ width: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>{t('height')}</Label>
          <Input
            type="number"
            value={localParams.height}
            onChange={(e) => updateParams({ height: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>{t('depth')}</Label>
          <Input
            type="number"
            value={localParams.depth}
            onChange={(e) => updateParams({ depth: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div>
        <Label>{t('topBottomPlacement')}</Label>
        <Select
          value={localParams.topBottomPlacement}
          onValueChange={(value) =>
            updateParams({ topBottomPlacement: value as TopBottomPlacement } as any)
          }
        >
          <SelectTrigger>
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
          <div className="flex items-center justify-between">
            <Label>{t('shelvesWithCount', { count: getShelfCount() })}</Label>
            <Slider
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={0}
              max={5}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('doors')}</Label>
            <Switch
              checked={getHasDoors()}
              onCheckedChange={(val) => updateParams({ hasDoors: val } as any)}
            />
          </div>
        </>
      )}
      {type === 'WARDROBE' && (
        <>
          <div className="flex items-center justify-between">
            <Label>{t('shelvesWithCount', { count: getShelfCount() })}</Label>
            <Slider
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={0}
              max={10}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('doorsWithCount', { count: getDoorCount() })}</Label>
            <Slider
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
          <div className="flex items-center justify-between">
            <Label>{t('shelvesWithCount', { count: getShelfCount() })}</Label>
            <Slider
              value={[getShelfCount()]}
              onValueChange={([val]) => updateParams({ shelfCount: val } as any)}
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('backPanel')}</Label>
            <Switch
              checked={getHasBack()}
              onCheckedChange={(val) => updateParams({ hasBack: val } as any)}
            />
          </div>
        </>
      )}
      {type === 'DRAWER' && (
        <>
          <div className="flex items-center justify-between">
            <Label>{t('drawersWithCount', { count: getDrawerCount() })}</Label>
            <Slider
              value={[getDrawerCount()]}
              onValueChange={([val]) => updateParams({ drawerCount: val } as any)}
              min={2}
              max={8}
              step={1}
            />
          </div>
        </>
      )}

      {/* Apply button */}
      {hasChanges && (
        <Button onClick={handleApply} className="w-full">
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
  const {
    updatePart,
    removePart,
    selectPart,
    materials,
    duplicatePart,
    updateCabinet,
    updateCabinetParams,
    removeCabinet,
    duplicateCabinet,
    selectCabinet,
  } = useStore();

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
    }

    return (
      <div className="space-y-4 p-4">
        {/* Cabinet header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {getCabinetTypeLabel(selectedCabinet.type)}
          </Badge>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => duplicateCabinet(selectedCabinet.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteCabinet}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('cabinetName')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={selectedCabinet.name}
              onChange={(e) =>
                updateCabinet(selectedCabinet.id, { name: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              {t('parameters')}
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardTitle>
            <CardDescription>
              {t('parametersWarning')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <CabinetParameterEditor
              type={selectedCabinet.type}
              params={selectedCabinet.params}
              onChange={(newParams) =>
                handleParamsChange(selectedCabinet.id, newParams)
              }
            />
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('materials')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>{t('bodyMaterial')}</Label>
              <Select
                value={selectedCabinet.materials.bodyMaterialId}
                onValueChange={(id) =>
                  updateCabinet(selectedCabinet.id, {
                    materials: { ...selectedCabinet.materials, bodyMaterialId: id },
                  })
                }
              >
                <SelectTrigger>
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
              <Label>{t('frontMaterial')}</Label>
              <Select
                value={selectedCabinet.materials.frontMaterialId}
                onValueChange={(id) =>
                  updateCabinet(selectedCabinet.id, {
                    materials: { ...selectedCabinet.materials, frontMaterialId: id },
                  })
                }
              >
                <SelectTrigger>
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
          </CardContent>
        </Card>
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
      <div className="space-y-4 p-4">
        {/* Cabinet Part Warning */}
        {cabinetForPart && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('cabinetPartWarningTitle', { name: cabinetForPart.name })}</AlertTitle>
            <AlertDescription>
              {t('cabinetPartWarningDescription')}
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto ml-1"
                onClick={() => selectCabinet(cabinetForPart.id)}
              >
                {t('editCabinet')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            {t('duplicate')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={selectedPart.name}
                onChange={(e) => handleUpdate('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="group">{t('group')}</Label>
              <Input
                id="group"
                value={selectedPart.group || ''}
                onChange={(e) =>
                  handleUpdate('group', e.target.value || undefined)
                }
                placeholder={t('groupPlaceholder')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shape & Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('shapeAndDimensions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="shapeType">{t('shapeType')}</Label>
              <Select
                value={selectedPart.shapeType}
                onValueChange={(value) =>
                  handleShapeTypeChange(value as ShapeType)
                }
              >
                <SelectTrigger>
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
              <>
                <div>
                  <Label htmlFor="rect-x">{t('lengthX')}</Label>
                  <Input
                    id="rect-x"
                    type="number"
                    min={1}
                    value={(selectedPart.shapeParams as ShapeParamsRect).x}
                    onChange={(e) =>
                      handleShapeParamUpdate('x', Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="rect-y">{t('widthY')}</Label>
                  <Input
                    id="rect-y"
                    type="number"
                    min={1}
                    value={(selectedPart.shapeParams as ShapeParamsRect).y}
                    onChange={(e) =>
                      handleShapeParamUpdate('y', Number(e.target.value))
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Position & Material */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('positionAndMaterial')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Position inputs */}
            <Label>{t('position')}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                value={selectedPart.position[0]}
                onChange={(e) => handlePositionUpdate(0, Number(e.target.value))}
                aria-label={t('positionX')}
              />
              <Input
                type="number"
                value={selectedPart.position[1]}
                onChange={(e) => handlePositionUpdate(1, Number(e.target.value))}
                aria-label={t('positionY')}
              />
              <Input
                type="number"
                value={selectedPart.position[2]}
                onChange={(e) => handlePositionUpdate(2, Number(e.target.value))}
                aria-label={t('positionZ')}
              />
            </div>
             {/* Material select */}
            <div>
              <Label>{t('material')}</Label>
              <Select
                value={selectedPart.materialId}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        {/* Edge Banding */}
        {selectedPart.shapeType === 'RECT' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('edgeBanding')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edge-top">{t('edgeTop')}</Label>
                <Switch
                  id="edge-top"
                  checked={edgeBanding?.top || false}
                  onCheckedChange={(checked) =>
                    handleEdgeBandingUpdate('top', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edge-bottom">{t('edgeBottom')}</Label>
                <Switch
                  id="edge-bottom"
                  checked={edgeBanding?.bottom || false}
                  onCheckedChange={(checked) =>
                    handleEdgeBandingUpdate('bottom', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edge-left">{t('edgeLeft')}</Label>
                <Switch
                  id="edge-left"
                  checked={edgeBanding?.left || false}
                  onCheckedChange={(checked) =>
                    handleEdgeBandingUpdate('left', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edge-right">{t('edgeRight')}</Label>
                <Switch
                  id="edge-right"
                  checked={edgeBanding?.right || false}
                  onCheckedChange={(checked) =>
                    handleEdgeBandingUpdate('right', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
