
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  NumberInput,
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
  Alert,
  AlertDescription,
} from '@meble/ui';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/lib/store';
import {
  CabinetType,
  CabinetParams,
  CabinetMaterials,
  TopBottomPlacement,
  KitchenCabinetParams,
  DrawerConfiguration,
  SideFrontsConfig,
  Material,
} from '@/types';
import {
  CABINET_PRESETS,
  DEFAULT_BACK_OVERLAP_RATIO,
  DEFAULT_DOOR_CONFIG,
  getTotalBoxCount,
  getFrontCount,
  hasDrawerFronts,
  convertDrawersToInternal,
} from '@/lib/config';
import { DrawerConfigDialog } from './DrawerConfigDialog';
import { SideFrontsConfigDialog } from './SideFrontsConfigDialog';
import { getDefaultMaterials, getDefaultBackMaterial } from '@/lib/store/utils';
import { getSideFrontsSummary, hasSideFronts } from '@/lib/cabinetGenerators';
import { Settings2, PanelLeftDashed, AlertTriangle, RectangleHorizontal, Grip } from 'lucide-react';
import { FrontsConfigDialog } from './FrontsConfigDialog';
import { HandlesConfigDialog } from './HandlesConfigDialog';

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

interface FrontsConfigButtonProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

const FrontsConfigButton = ({ params, onChange }: FrontsConfigButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const kitchenParams = params as Partial<KitchenCabinetParams>;
  const doorConfig = kitchenParams.doorConfig ?? DEFAULT_DOOR_CONFIG;

  const summary = `${doorConfig.layout === 'SINGLE' ? 'Pojedyncze' : 'Podwójne'}, ${doorConfig.openingDirection === 'HORIZONTAL' ? 'na bok' : (doorConfig.openingDirection === 'LIFT_UP' ? 'do góry' : 'w dół')}`;

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Konfiguracja frontów</h4>
          <p className="text-xs text-muted-foreground">
            {summary}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <RectangleHorizontal className="h-4 w-4 mr-2" />
          Konfiguruj
        </Button>
      </div>

      <FrontsConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        params={params}
        onParamsChange={onChange}
      />
    </div>
  );
};

interface HandlesConfigButtonProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

const HandlesConfigButton = ({ params, onChange }: HandlesConfigButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const kitchenParams = params as Partial<KitchenCabinetParams>;
  const handleConfig = kitchenParams.handleConfig;

  const summary = handleConfig ? `${handleConfig.type}, ${handleConfig.finish}` : 'Brak (kliknij aby skonfigurować)';

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Konfiguracja uchwytów</h4>
          <p className="text-xs text-muted-foreground">
            {summary}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Grip className="h-4 w-4 mr-2" />
          Konfiguruj
        </Button>
      </div>

      <HandlesConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        params={params}
        onParamsChange={onChange}
      />
    </div>
  );
};

interface DrawerConfigButtonProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  cabinetHeight: number;
}
/**
 * Button that opens the drawer configuration sub-dialog
 * Shows summary of current configuration
 */
const DrawerConfigButton = ({ params, onChange, cabinetHeight }: DrawerConfigButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const drawerConfig = params.drawerConfig;

  // Calculate summary info
  const totalBoxes = drawerConfig ? getTotalBoxCount(drawerConfig) : 0;
  const totalFronts = drawerConfig ? getFrontCount(drawerConfig) : 0;
  const hasConfig = drawerConfig && drawerConfig.zones.length > 0;

  const handleConfigChange = (config: DrawerConfiguration) => {
    onChange({ ...params, drawerConfig: config } as any);
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Konfiguracja szuflad</h4>
          {hasConfig ? (
            <p className="text-xs text-muted-foreground">
              {totalFronts} frontów, {totalBoxes} boxów • {drawerConfig.slideType}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Kliknij aby skonfigurować
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Konfiguruj
        </Button>
      </div>

      <DrawerConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={drawerConfig}
        onConfigChange={handleConfigChange}
        cabinetHeight={cabinetHeight}
      />
    </div>
  );
};

interface DrawerConfigButtonWithConflictProps {
  params: Partial<CabinetParams>;
  onConfigChange: (config: DrawerConfiguration) => void;
  cabinetHeight: number;
  hasDoors: boolean;
}

/**
 * Drawer config button with conflict awareness
 * Shows warning when doors are enabled and drawer config would have fronts
 */
const DrawerConfigButtonWithConflict = ({
  params,
  onConfigChange,
  cabinetHeight,
  hasDoors,
}: DrawerConfigButtonWithConflictProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const drawerConfig = params.drawerConfig;

  // Calculate summary info
  const totalBoxes = drawerConfig ? getTotalBoxCount(drawerConfig) : 0;
  const totalFronts = drawerConfig ? getFrontCount(drawerConfig) : 0;
  const hasConfig = drawerConfig && drawerConfig.zones.length > 0;
  const configHasFronts = hasDrawerFronts(drawerConfig);

  const handleConfigChange = (config: DrawerConfiguration) => {
    onConfigChange(config);
    setDialogOpen(false);
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Konfiguracja szuflad</h4>
          {hasConfig ? (
            <p className="text-xs text-muted-foreground">
              {totalFronts > 0 ? `${totalFronts} frontów, ` : ''}{totalBoxes} boxów • {drawerConfig.slideType}
              {configHasFronts && hasDoors && (
                <span className="text-amber-500 ml-1">(konflikt z drzwiami)</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Kliknij aby skonfigurować
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Konfiguruj
        </Button>
      </div>

      {/* Info alert when doors are enabled */}
      {hasDoors && (
        <Alert className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Drzwi są włączone. Szuflady będą traktowane jako wewnętrzne (bez frontów dekoracyjnych).
          </AlertDescription>
        </Alert>
      )}

      <DrawerConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={drawerConfig}
        onConfigChange={handleConfigChange}
        cabinetHeight={cabinetHeight}
      />
    </div>
  );
};

interface SideFrontsConfigButtonProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  cabinetHeight: number;
  materials: Material[];
  defaultFrontMaterialId: string;
}

/**
 * Button that opens the side fronts configuration sub-dialog
 * Shows summary of current configuration
 */
const SideFrontsConfigButton = ({
  params,
  onChange,
  cabinetHeight,
  materials,
  defaultFrontMaterialId,
}: SideFrontsConfigButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sideFrontsConfig = params.sideFronts;
  const hasConfig = hasSideFronts(sideFrontsConfig);
  const summary = getSideFrontsSummary(sideFrontsConfig);

  const handleConfigChange = (config: SideFrontsConfig) => {
    onChange({ ...params, sideFronts: config } as any);
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Fronty boczne</h4>
          <p className="text-xs text-muted-foreground">
            {hasConfig ? summary : 'Brak (kliknij aby skonfigurować)'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <PanelLeftDashed className="h-4 w-4 mr-2" />
          Konfiguruj
        </Button>
      </div>

      <SideFrontsConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={sideFrontsConfig}
        onConfigChange={handleConfigChange}
        materials={materials}
        defaultFrontMaterialId={defaultFrontMaterialId}
        cabinetHeight={cabinetHeight}
      />
    </div>
  );
};

/**
 * Conflict type for doors vs drawer fronts
 */
type ConflictType = 'doors-enabling' | 'drawer-fronts-enabling' | null;

interface ParameterFormProps {
  type: CabinetType;
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
}

const ParameterForm = ({type, params, onChange, materials, defaultFrontMaterialId}: ParameterFormProps) => {
    // Conflict resolution state
    const [conflictType, setConflictType] = useState<ConflictType>(null);
    const [pendingDrawerConfig, setPendingDrawerConfig] = useState<DrawerConfiguration | null>(null);

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
        return true; // Default to true for all cabinets
    };

    const getBackOverlapRatio = (): number => {
        if ('backOverlapRatio' in params && params.backOverlapRatio !== undefined) return params.backOverlapRatio;
        return DEFAULT_BACK_OVERLAP_RATIO;
    };

    // Check if drawer config has external fronts
    const drawerHasFronts = hasDrawerFronts(params.drawerConfig);

    // Handle door toggle with conflict detection
    const handleDoorsToggle = (enableDoors: boolean) => {
        if (enableDoors && drawerHasFronts) {
            // Conflict: enabling doors when drawer config has fronts
            setConflictType('doors-enabling');
        } else {
            updateParams({ hasDoors: enableDoors } as any);
        }
    };

    // Handle drawer config change with conflict detection
    const handleDrawerConfigChange = (config: DrawerConfiguration) => {
        const newConfigHasFronts = hasDrawerFronts(config);
        if (newConfigHasFronts && getHasDoors()) {
            // Conflict: drawer config has fronts when doors are enabled
            setPendingDrawerConfig(config);
            setConflictType('drawer-fronts-enabling');
        } else {
            onChange({ ...params, drawerConfig: config } as any);
        }
    };

    // Conflict resolution handlers
    const handleConflictResolve = (action: 'remove-doors' | 'convert-drawers' | 'cancel') => {
        if (action === 'remove-doors') {
            if (conflictType === 'doors-enabling') {
                // User wanted to enable doors but chose to not do it
                // Just close dialog
            } else if (conflictType === 'drawer-fronts-enabling' && pendingDrawerConfig) {
                // Apply drawer config with fronts, remove doors
                onChange({
                    ...params,
                    hasDoors: false,
                    drawerConfig: pendingDrawerConfig,
                } as any);
            }
        } else if (action === 'convert-drawers') {
            if (conflictType === 'doors-enabling') {
                // Enable doors and convert existing drawers to internal
                const convertedConfig = params.drawerConfig
                    ? convertDrawersToInternal(params.drawerConfig)
                    : undefined;
                onChange({
                    ...params,
                    hasDoors: true,
                    drawerConfig: convertedConfig,
                } as any);
            } else if (conflictType === 'drawer-fronts-enabling' && pendingDrawerConfig) {
                // Convert pending drawer config to internal and apply
                const convertedConfig = convertDrawersToInternal(pendingDrawerConfig);
                onChange({
                    ...params,
                    drawerConfig: convertedConfig,
                } as any);
            }
        }
        // Reset conflict state
        setConflictType(null);
        setPendingDrawerConfig(null);
    };

    return (
        <div className="space-y-4">
            {/* Conflict Resolution Dialog */}
            <Dialog open={conflictType !== null} onOpenChange={(open) => !open && handleConflictResolve('cancel')}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Konflikt: Drzwi i fronty szuflad
                        </DialogTitle>
                        <DialogDescription>
                            {conflictType === 'doors-enabling'
                                ? 'Szafka ma skonfigurowane szuflady z frontami. Drzwi i fronty szuflad nie mogą być używane jednocześnie.'
                                : 'Szafka ma włączone drzwi. Fronty szuflad i drzwi nie mogą być używane jednocześnie.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleConflictResolve('convert-drawers')}
                        >
                            <span className="font-medium">Konwertuj szuflady na wewnętrzne</span>
                            <span className="text-xs text-muted-foreground ml-2">(usuń fronty szuflad)</span>
                        </Button>
                        {conflictType === 'drawer-fronts-enabling' && (
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleConflictResolve('remove-doors')}
                            >
                                <span className="font-medium">Usuń drzwi</span>
                                <span className="text-xs text-muted-foreground ml-2">(zachowaj fronty szuflad)</span>
                            </Button>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => handleConflictResolve('cancel')}>
                            Anuluj
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Szerokość (mm)</Label>
                    <NumberInput value={params.width} onChange={val => updateParams({width: val})} min={1} allowNegative={false} />
                </div>
                <div>
                    <Label>Wysokość (mm)</Label>
                    <NumberInput value={params.height} onChange={val => updateParams({height: val})} min={1} allowNegative={false} />
                </div>
                <div>
                    <Label>Głębokość (mm)</Label>
                    <NumberInput value={params.depth} onChange={val => updateParams({depth: val})} min={1} allowNegative={false} />
                </div>
            </div>

            <div>
                <Label>Montaż góra/dół</Label>
                <Select
                    value={params.topBottomPlacement || 'inset'}
                    onValueChange={(val: TopBottomPlacement) => updateParams({ topBottomPlacement: val } as any)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="inset">Wewnątrz (między bokami)</SelectItem>
                        <SelectItem value="overlay">Nałożona (na boki)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                    <Label>Plecy (tylna ściana)</Label>
                    <Switch checked={getHasBack()} onCheckedChange={val => updateParams({hasBack: val} as any)} />
                </div>
                {getHasBack() && (
                    <div className="flex items-center justify-between">
                        <Label>Głębokość wpustu ({Math.round(getBackOverlapRatio() * 100)}%)</Label>
                        <Slider
                            value={[getBackOverlapRatio()]}
                            onValueChange={([val]) => updateParams({backOverlapRatio: val} as any)}
                            min={0.33}
                            max={1.0}
                            step={0.01}
                            className="w-32"
                        />
                    </div>
                )}
            </div>

            {type === 'KITCHEN' && (
                <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                          <Label>Półki ({getShelfCount()})</Label>
                          <Slider value={[getShelfCount()]} onValueChange={([val]) => updateParams({shelfCount: val} as any)} min={0} max={5} step={1} />
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <Label>Drzwi</Label>
                              {drawerHasFronts && !getHasDoors() && (
                                  <span className="text-xs text-muted-foreground">(wyłączone - szuflady mają fronty)</span>
                              )}
                          </div>
                          <Switch checked={getHasDoors()} onCheckedChange={handleDoorsToggle} />
                      </div>
                    </div>
                    {/* Door configuration */}
                    {getHasDoors() && (
                        <>
                            <FrontsConfigButton params={params} onChange={onChange} />
                            <HandlesConfigButton params={params} onChange={onChange} />
                        </>
                    )}

                    {/* Drawer configuration button - with conflict-aware handler */}
                    <DrawerConfigButtonWithConflict
                        params={params}
                        onConfigChange={handleDrawerConfigChange}
                        cabinetHeight={params.height ?? 720}
                        hasDoors={getHasDoors()}
                    />
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

                    {/* Drawer configuration button */}
                    <DrawerConfigButton
                        params={params}
                        onChange={onChange}
                        cabinetHeight={params.height ?? 2200}
                    />
                </>
            )}
            {type === 'BOOKSHELF' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>Półki ({getShelfCount()})</Label>
                        <Slider value={[getShelfCount()]} onValueChange={([val]) => updateParams({shelfCount: val} as any)} min={1} max={10} step={1} />
                    </div>

                    {/* Drawer configuration button */}
                    <DrawerConfigButton
                        params={params}
                        onChange={onChange}
                        cabinetHeight={params.height ?? 1800}
                    />
                </>
            )}
            {type === 'DRAWER' && (
                <>
                    {/* Drawer configuration button - mandatory for DRAWER type */}
                    <DrawerConfigButton
                        params={params}
                        onChange={onChange}
                        cabinetHeight={params.height ?? 800}
                    />
                </>
            )}

            {/* Side fronts configuration - common for all cabinet types */}
            <SideFrontsConfigButton
                params={params}
                onChange={onChange}
                cabinetHeight={params.height ?? 720}
                materials={materials}
                defaultFrontMaterialId={defaultFrontMaterialId}
            />
        </div>
    )
}

export function CabinetTemplateDialog({ open, onOpenChange, furnitureId }: CabinetTemplateDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<CabinetType | null>(null);
  const [params, setParams] = useState<Partial<CabinetParams>>({});
  const [materials, setMaterials] = useState<Partial<CabinetMaterials>>({});

  // PERFORMANCE: Use useShallow to prevent re-renders during 3D transforms
  const { addCabinet, materials: availableMaterials } = useStore(
    useShallow((state) => ({
      addCabinet: state.addCabinet,
      materials: state.materials,
    }))
  );
  const { default_material, default_front_material } = useMemo(
    () => getDefaultMaterials(availableMaterials),
    [availableMaterials]
  );

  const default_back_material = useMemo(
    () => getDefaultBackMaterial(availableMaterials)?.id,
    [availableMaterials]
  );

  // Filter materials by category for back panel selection
  const hdfMaterials = useMemo(
    () => availableMaterials.filter((m) => m.category === 'hdf'),
    [availableMaterials]
  );
  const boardMaterials = useMemo(
    () => availableMaterials.filter((m) => m.category !== 'hdf'),
    [availableMaterials]
  );

  useEffect(() => {
    if (!open) return;

    setMaterials((prev) => {
      const nextBody = prev.bodyMaterialId ?? default_material;
      const nextFront = prev.frontMaterialId ?? default_front_material;
      const nextBack = prev.backMaterialId ?? default_back_material;

      if (
        nextBody === prev.bodyMaterialId &&
        nextFront === prev.frontMaterialId &&
        nextBack === prev.backMaterialId
      ) {
        return prev;
      }

      return {
        ...prev,
        bodyMaterialId: nextBody,
        frontMaterialId: nextFront,
        backMaterialId: nextBack,
      };
    });
  }, [default_material, default_front_material, default_back_material, open]);

  const handleCreate = () => {
    if (!selectedType || !params.width || !params.height || !params.depth || !materials.bodyMaterialId || !materials.frontMaterialId) return;
    
    // All params should be set from the preset, so we can cast more safely
    const finalParams = params as CabinetParams;

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
    // Load default parameters from the presets config
    setParams(CABINET_PRESETS[type]);
    setStep('configure');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Dodaj szafkę</DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Step 1: Template Selection */}
          {step === 'select' && (
            <div className="grid grid-cols-2 gap-4 pb-6">
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
            <div className="pb-4">
              <ParameterForm
                type={selectedType}
                params={params}
                onChange={setParams}
                materials={availableMaterials}
                defaultFrontMaterialId={default_front_material ?? ''}
              />
            </div>
          )}

          {/* Step 3: Material Selection */}
          {step === 'materials' && (
            <div className="space-y-4 pb-4">
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
                      {boardMaterials.map(m => (
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
                      {boardMaterials.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.thickness}mm)
                      </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {params.hasBack && (
                <div>
                  <Label>Materiał pleców (tylna ściana - HDF)</Label>
                  <Select
                    value={materials?.backMaterialId}
                    onValueChange={(id) => setMaterials({ ...materials, backMaterialId: id })}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="Wybierz materiał HDF" />
                    </SelectTrigger>
                    <SelectContent>
                        {hdfMaterials.length > 0 ? (
                          hdfMaterials.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                                {m.name} ({m.thickness}mm)
                            </SelectItem>
                          ))
                        ) : (
                          // Fallback to all materials if no HDF available
                          availableMaterials.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                                {m.name} ({m.thickness}mm)
                            </SelectItem>
                          ))
                        )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer - always visible at bottom */}
        {step !== 'select' && (
          <div className="flex-shrink-0 border-t bg-background px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(step === 'materials' ? 'configure' : 'select')}
            >
              Wstecz
            </Button>
            {step === 'configure' && (
              <Button onClick={() => setStep('materials')}>
                Dalej: Materiały
              </Button>
            )}
            {step === 'materials' && (
              <Button
                onClick={handleCreate}
                disabled={
                  !materials?.bodyMaterialId ||
                  !materials?.frontMaterialId ||
                  (params.hasBack && !materials?.backMaterialId)
                }
              >
                Utwórz szafkę
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
