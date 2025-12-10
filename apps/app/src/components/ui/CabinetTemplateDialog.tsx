
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Slider,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import { CabinetType, CabinetParams, CabinetMaterials, KitchenCabinetParams, WardrobeCabinetParams, BookshelfCabinetParams, DrawerCabinetParams } from '@/types';

interface CabinetTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  furnitureId: string;
}

type Step = 'select' | 'configure' | 'materials';

interface TemplateCardProps {
  type: CabinetType;
  title: string;
  description: string;
  onClick: () => void;
}

const TemplateCard = ({type, title, description, onClick}: TemplateCardProps) => (
    <Card onClick={onClick} className="cursor-pointer hover:bg-muted">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
    </Card>
)

interface ParameterFormProps {
  type: CabinetType;
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

const ParameterForm = ({type, params, onChange}: ParameterFormProps) => {

    const updateParams = (newParams: Partial<CabinetParams>) => {
        onChange({...params, ...newParams});
    }

    // Type-safe accessors
    const getShelfCount = (): number => {
        if ('shelfCount' in params && params.shelfCount !== undefined) return params.shelfCount;
        return type === 'BOOKSHELF' ? 1 : 0;
    };

    const getDoorCount = (): number => {
        if ('doorCount' in params && params.doorCount !== undefined) return params.doorCount;
        return 1;
    };

    const getHasDoors = (): boolean => {
        if ('hasDoors' in params && params.hasDoors !== undefined) return params.hasDoors;
        return false;
    };

    const getHasBack = (): boolean => {
        if ('hasBack' in params && params.hasBack !== undefined) return params.hasBack;
        return false;
    };

    const getDrawerCount = (): number => {
        if ('drawerCount' in params && params.drawerCount !== undefined) return params.drawerCount;
        return 2;
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Szerokość (mm)</Label>
                    <Input type="number" value={params.width || 1000} onChange={e => updateParams({width: parseInt(e.target.value)})} />
                </div>
                <div>
                    <Label>Wysokość (mm)</Label>
                    <Input type="number" value={params.height || 2000} onChange={e => updateParams({height: parseInt(e.target.value)})}/>
                </div>
                <div>
                    <Label>Głębokość (mm)</Label>
                    <Input type="number" value={params.depth || 600} onChange={e => updateParams({depth: parseInt(e.target.value)})}/>
                </div>
            </div>
            {type === 'KITCHEN' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>Półki ({getShelfCount()})</Label>
                        <Slider value={[getShelfCount()]} onValueChange={([val]) => updateParams({shelfCount: val} as any)} min={0} max={5} step={1} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Drzwi</Label>
                        <Switch checked={getHasDoors()} onCheckedChange={val => updateParams({hasDoors: val} as any)} />
                    </div>
                </>
            )}
            {type === 'WARDROBE' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>Półki ({getShelfCount()})</Label>
                        <Slider value={[getShelfCount()]} onValueChange={([val]) => updateParams({shelfCount: val} as any)} min={0} max={10} step={1} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Drzwi ({getDoorCount()})</Label>
                        <Slider value={[getDoorCount()]} onValueChange={([val]) => updateParams({doorCount: val} as any)} min={1} max={4} step={1} />
                    </div>
                </>
            )}
            {type === 'BOOKSHELF' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>Półki ({getShelfCount()})</Label>
                        <Slider value={[getShelfCount()]} onValueChange={([val]) => updateParams({shelfCount: val} as any)} min={1} max={10} step={1} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Tylna ściana</Label>
                        <Switch checked={getHasBack()} onCheckedChange={val => updateParams({hasBack: val} as any)} />
                    </div>
                </>
            )}
            {type === 'DRAWER' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>Szuflady ({getDrawerCount()})</Label>
                        <Slider value={[getDrawerCount()]} onValueChange={([val]) => updateParams({drawerCount: val} as any)} min={2} max={8} step={1} />
                    </div>
                </>
            )}


        </div>
    )
}

export function CabinetTemplateDialog({ open, onOpenChange, furnitureId }: CabinetTemplateDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<CabinetType | null>(null);
  const [params, setParams] = useState<Partial<CabinetParams>>({});
  const [materials, setMaterials] = useState<Partial<CabinetMaterials>>({});

  const { addCabinet, materials: availableMaterials } = useStore();

  const handleCreate = () => {
    if (!selectedType || !params || !materials || !materials.bodyMaterialId || !materials.frontMaterialId) return;

    let finalParams: CabinetParams;
    const baseParams = {
        width: params.width || 1000,
        height: params.height || 2000,
        depth: params.depth || 600,
    }

    switch(selectedType) {
        case 'KITCHEN':
            finalParams = {
                ...baseParams,
                type: 'KITCHEN',
                shelfCount: ('shelfCount' in params && params.shelfCount !== undefined) ? params.shelfCount : 0,
                hasDoors: ('hasDoors' in params && params.hasDoors !== undefined) ? params.hasDoors : false,
            } as KitchenCabinetParams;
            break;
        case 'WARDROBE':
            finalParams = {
                ...baseParams,
                type: 'WARDROBE',
                shelfCount: ('shelfCount' in params && params.shelfCount !== undefined) ? params.shelfCount : 0,
                doorCount: ('doorCount' in params && params.doorCount !== undefined) ? params.doorCount : 1,
            } as WardrobeCabinetParams;
            break;
        case 'BOOKSHELF':
            finalParams = {
                ...baseParams,
                type: 'BOOKSHELF',
                shelfCount: ('shelfCount' in params && params.shelfCount !== undefined) ? params.shelfCount : 1,
                hasBack: ('hasBack' in params && params.hasBack !== undefined) ? params.hasBack : false,
            } as BookshelfCabinetParams;
            break;
        case 'DRAWER':
            finalParams = {
                ...baseParams,
                type: 'DRAWER',
                drawerCount: ('drawerCount' in params && params.drawerCount !== undefined) ? params.drawerCount : 2,
            } as DrawerCabinetParams;
            break;
        default:
            return;
    }


    addCabinet(furnitureId, selectedType, finalParams, materials as CabinetMaterials);
    onOpenChange(false);
    // Reset state
    setStep('select');
    setSelectedType(null);
    setParams({});
    setMaterials({});
  };
  
  const handleSelectType = (type: CabinetType) => {
    setSelectedType(type);
    setParams({type});
    setStep('configure');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dodaj szafkę</DialogTitle>
        </DialogHeader>

        {/* Step 1: Template Selection */}
        {step === 'select' && (
          <div className="grid grid-cols-2 gap-4">
            <TemplateCard
              type="KITCHEN"
              title="Szafka kuchenna"
              description="Podstawowa szafka z półkami i frontami"
              onClick={() => handleSelectType('KITCHEN')}
            />
            <TemplateCard
              type="WARDROBE"
              title="Szafa ubraniowa"
              description="Wysoka szafa z drzwiami i półkami"
              onClick={() => handleSelectType('WARDROBE')}
            />
            <TemplateCard
              type="BOOKSHELF"
              title="Regał/Biblioteczka"
              description="Otwarty regał z półkami"
              onClick={() => handleSelectType('BOOKSHELF')}
            />
            <TemplateCard
              type="DRAWER"
              title="Szafka z szufladami"
              description="Szafka z frontami szufladowymi"
              onClick={() => handleSelectType('DRAWER')}
            />
          </div>
        )}

        {/* Step 2: Parameter Configuration */}
        {step === 'configure' && selectedType && (
          <div className="space-y-4">
            <ParameterForm
              type={selectedType}
              params={params}
              onChange={setParams}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select')}>
                Wstecz
              </Button>
              <Button onClick={() => setStep('materials')}>
                Dalej: Materiały
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Material Selection */}
        {step === 'materials' && (
          <div className="space-y-4">
            <div>
              <Label>Materiał korpusu (boki, dno, góra, półki)</Label>
              <Select
                value={materials?.bodyMaterialId}
                onValueChange={(id) => setMaterials({ ...materials, bodyMaterialId: id })}
              >
                <SelectTrigger>
                    <SelectValue placeholder="Wybierz materiał" />
                </SelectTrigger>
                <SelectContent>
                    {availableMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.thickness}mm)
                    </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Materiał frontu (drzwi, szuflady)</Label>
              <Select
                value={materials?.frontMaterialId}
                onValueChange={(id) => setMaterials({ ...materials, frontMaterialId: id })}
              >
                <SelectTrigger>
                    <SelectValue placeholder="Wybierz materiał" />
                </SelectTrigger>
                <SelectContent>
                    {availableMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.thickness}mm)
                    </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('configure')}>
                Wstecz
              </Button>
              <Button onClick={handleCreate} disabled={!materials?.bodyMaterialId || !materials?.frontMaterialId}>
                Utwórz szafkę
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
