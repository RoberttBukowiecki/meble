'use client';

/**
 * Properties panel for editing selected part attributes
 */

import { useStore, useSelectedPart } from '@/lib/store';
import { Input } from '@meble/ui';
import { Label } from '@meble/ui';
import { Button } from '@meble/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@meble/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import { Switch } from '@meble/ui';
import { Trash2, Copy } from 'lucide-react';
import type {
  ShapeParamsRect,
  EdgeBandingRect,
  ShapeType,
  ShapeParamsTrapezoid,
  ShapeParamsLShape,
  ShapeParamsPolygon
} from '@/types';

export function PropertiesPanel() {
  const selectedPart = useSelectedPart();
  const { updatePart, removePart, selectPart, materials, duplicatePart } = useStore();

  if (!selectedPart) return null;

  const handleUpdate = (field: string, value: any) => {
    updatePart(selectedPart.id, { [field]: value });
  };

  const handleShapeTypeChange = (shapeType: ShapeType) => {
    // Create default params for the new shape type
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
      shapeParams: {
        ...currentParams,
        [field]: value,
      },
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
    selectPart(null);
  };

  const handleDuplicate = () => {
    duplicatePart(selectedPart.id);
  };

  const handleEdgeBandingUpdate = (edge: 'top' | 'bottom' | 'left' | 'right', value: boolean) => {
    if (selectedPart.shapeType === 'RECT') {
      const currentEdgeBanding = selectedPart.edgeBanding as EdgeBandingRect | undefined;
      const edgeBanding: EdgeBandingRect = {
        type: 'RECT',
        data: {
          top: currentEdgeBanding?.data?.top || false,
          bottom: currentEdgeBanding?.data?.bottom || false,
          left: currentEdgeBanding?.data?.left || false,
          right: currentEdgeBanding?.data?.right || false,
          [edge]: value,
        },
      };
      updatePart(selectedPart.id, { edgeBanding });
    }
  };

  const edgeBanding = (selectedPart.shapeType === 'RECT'
    ? selectedPart.edgeBanding as EdgeBandingRect | undefined
    : undefined);

  return (
    <div className="space-y-4 p-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDuplicate}
          className="flex-1"
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplikuj
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="flex-1"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Usuń
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Podstawowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              value={selectedPart.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="group">Grupa</Label>
            <Input
              id="group"
              value={selectedPart.group || ''}
              onChange={(e) => handleUpdate('group', e.target.value || undefined)}
              placeholder="np. drzwi, półki"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shape & Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Kształt i Wymiary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Shape Type Selector */}
          <div>
            <Label htmlFor="shapeType">Typ kształtu</Label>
            <Select
              value={selectedPart.shapeType}
              onValueChange={(value) => handleShapeTypeChange(value as ShapeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECT">Prostokąt</SelectItem>
                <SelectItem value="TRAPEZOID">Trapez</SelectItem>
                <SelectItem value="L_SHAPE">Kształt L</SelectItem>
                <SelectItem value="POLYGON">Wielokąt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* RECT Shape Parameters */}
          {selectedPart.shapeType === 'RECT' && (
            <>
              <div>
                <Label htmlFor="rect-x">Długość X</Label>
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
                <Label htmlFor="rect-y">Szerokość Y</Label>
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

          {/* TRAPEZOID Shape Parameters */}
          {selectedPart.shapeType === 'TRAPEZOID' && (
            <>
              <div>
                <Label htmlFor="trap-frontX">Przód X</Label>
                <Input
                  id="trap-frontX"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsTrapezoid).frontX}
                  onChange={(e) =>
                    handleShapeParamUpdate('frontX', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="trap-backX">Tył X</Label>
                <Input
                  id="trap-backX"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsTrapezoid).backX}
                  onChange={(e) =>
                    handleShapeParamUpdate('backX', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="trap-y">Głębokość Y</Label>
                <Input
                  id="trap-y"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsTrapezoid).y}
                  onChange={(e) =>
                    handleShapeParamUpdate('y', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="trap-skos">Strona skosu</Label>
                <Select
                  value={(selectedPart.shapeParams as ShapeParamsTrapezoid).skosSide}
                  onValueChange={(value) => handleShapeParamUpdate('skosSide', value)}
                >
                  <SelectTrigger id="trap-skos">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Lewo</SelectItem>
                    <SelectItem value="right">Prawo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* L_SHAPE Parameters */}
          {selectedPart.shapeType === 'L_SHAPE' && (
            <>
              <div>
                <Label htmlFor="l-x">Długość X</Label>
                <Input
                  id="l-x"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsLShape).x}
                  onChange={(e) =>
                    handleShapeParamUpdate('x', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="l-y">Szerokość Y</Label>
                <Input
                  id="l-y"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsLShape).y}
                  onChange={(e) =>
                    handleShapeParamUpdate('y', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="l-cutX">Wycięcie X</Label>
                <Input
                  id="l-cutX"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsLShape).cutX}
                  onChange={(e) =>
                    handleShapeParamUpdate('cutX', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="l-cutY">Wycięcie Y</Label>
                <Input
                  id="l-cutY"
                  type="number"
                  min={1}
                  value={(selectedPart.shapeParams as ShapeParamsLShape).cutY}
                  onChange={(e) =>
                    handleShapeParamUpdate('cutY', Number(e.target.value))
                  }
                />
              </div>
            </>
          )}

          {/* POLYGON Parameters */}
          {selectedPart.shapeType === 'POLYGON' && (
            <div>
              <Label htmlFor="poly-points">Punkty (JSON)</Label>
              <textarea
                id="poly-points"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={4}
                value={JSON.stringify((selectedPart.shapeParams as ShapeParamsPolygon).points)}
                onChange={(e) => {
                  try {
                    const points = JSON.parse(e.target.value);
                    handleShapeParamUpdate('points', points);
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder="[[0,0], [600,0], [600,400], [0,400]]"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format: [[x1,y1], [x2,y2], ...]
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="depth">Grubość Z (materiał)</Label>
            <Input
              id="depth"
              type="number"
              value={selectedPart.depth}
              disabled
              className="bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pozycja (mm)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="posX">X</Label>
            <Input
              id="posX"
              type="number"
              value={selectedPart.position[0]}
              onChange={(e) => handlePositionUpdate(0, Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="posY">Y</Label>
            <Input
              id="posY"
              type="number"
              value={selectedPart.position[1]}
              onChange={(e) => handlePositionUpdate(1, Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="posZ">Z</Label>
            <Input
              id="posZ"
              type="number"
              value={selectedPart.position[2]}
              onChange={(e) => handlePositionUpdate(2, Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Material */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Materiał</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedPart.materialId}
            onValueChange={handleMaterialChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz materiał" />
            </SelectTrigger>
            <SelectContent>
              {materials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name} ({material.thickness}mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Edge Banding - only for RECT shapes */}
      {selectedPart.shapeType === 'RECT' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Okleina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="edge-top" className="cursor-pointer">
                Góra (Y+)
              </Label>
              <Switch
                id="edge-top"
                checked={edgeBanding?.data?.top || false}
                onCheckedChange={(checked) => handleEdgeBandingUpdate('top', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edge-bottom" className="cursor-pointer">
                Dół (Y-)
              </Label>
              <Switch
                id="edge-bottom"
                checked={edgeBanding?.data?.bottom || false}
                onCheckedChange={(checked) => handleEdgeBandingUpdate('bottom', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edge-left" className="cursor-pointer">
                Lewo (X-)
              </Label>
              <Switch
                id="edge-left"
                checked={edgeBanding?.data?.left || false}
                onCheckedChange={(checked) => handleEdgeBandingUpdate('left', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edge-right" className="cursor-pointer">
                Prawo (X+)
              </Label>
              <Switch
                id="edge-right"
                checked={edgeBanding?.data?.right || false}
                onCheckedChange={(checked) => handleEdgeBandingUpdate('right', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notatki</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            rows={3}
            value={selectedPart.notes || ''}
            onChange={(e) => handleUpdate('notes', e.target.value || undefined)}
            placeholder="Dodatkowe informacje..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
