
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
  CardContent,
  Switch,
  Slider,
  Alert,
  AlertDescription,
  Separator,
  Badge,
} from '@meble/ui';
import { track, AnalyticsEvent } from '@meble/analytics';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/lib/store';
import {
  CabinetType,
  CabinetParams,
  CabinetMaterials,
  TopBottomPlacement,
  KitchenCabinetParams,
  WallCabinetParams,
  HangerCutoutConfig,
  FoldingDoorConfig,
  CornerInternalCabinetParams,
  CornerConfig,
  CornerOrientation,
  CornerFrontType,
  CornerPanelGeometry,
  DrawerConfiguration,
  SideFrontsConfig,
  Material,
} from '@/types';
import {
  CABINET_PRESETS,
  DEFAULT_BACK_OVERLAP_RATIO,
  DEFAULT_DOOR_CONFIG,
  DEFAULT_HANGER_CUTOUT_CONFIG,
  DEFAULT_FOLDING_DOOR_CONFIG,
  HANGER_CUTOUT_LIMITS,
  FOLDING_DOOR_LIMITS,
} from '@/lib/config';
import { Drawer, CornerDomain } from '@/lib/domain';
import { DrawerConfigDialog } from './DrawerConfigDialog';
import { SideFrontsConfigDialog } from './SideFrontsConfigDialog';
import { DecorativePanelsConfigDialog } from './DecorativePanelsConfigDialog';
import { InteriorConfigDialog } from './InteriorConfigDialog';
import { getDefaultMaterials, getDefaultBackMaterial } from '@/lib/store/utils';
import { getSideFrontsSummary, hasSideFronts, hasDecorativePanels, getDecorativePanelsSummary, hasInteriorContent, getInteriorSummary } from '@/lib/cabinetGenerators';
import { Settings2, PanelLeftDashed, AlertTriangle, RectangleHorizontal, Grip, Box, Warehouse, Library, Layers, PanelTop, LayoutGrid, CornerUpRight, Footprints, ArrowLeftRight, SquareStack, Scissors } from 'lucide-react';
import { FrontsConfigDialog } from './FrontsConfigDialog';
import { HandlesConfigDialog } from './HandlesConfigDialog';
import { LegsConfigDialog, getLegsSummary, hasLegs } from './LegsConfigDialog';
import { cn } from '@/lib/utils';

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
  icon: React.ReactNode;
  onClick: () => void;
}

const TemplateCard = ({type, title, description, icon, onClick}: TemplateCardProps) => (
    <Card 
        onClick={onClick} 
        className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 border-2 border-transparent hover:shadow-md"
    >
        <CardHeader className="p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                    {icon}
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
        </CardHeader>
    </Card>
)

interface ConfigRowProps {
    title: string;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    alert?: React.ReactNode;
}

const ConfigRow = ({ title, description, icon, action, alert }: ConfigRowProps) => (
    <div className="flex flex-col gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="mt-1 text-muted-foreground">
                        {icon}
                    </div>
                )}
                <div className="space-y-1">
                    <h4 className="text-sm font-medium leading-none">{title}</h4>
                    {description && (
                        <div className="text-xs text-muted-foreground">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
        {alert && (
            <div className="mt-1">
                {alert}
            </div>
        )}
    </div>
);

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

    // Dialog states for sub-configs
    const [frontsDialogOpen, setFrontsDialogOpen] = useState(false);
    const [handlesDialogOpen, setHandlesDialogOpen] = useState(false);
    const [drawerDialogOpen, setDrawerDialogOpen] = useState(false);
    const [sideFrontsDialogOpen, setSideFrontsDialogOpen] = useState(false);
    const [decorativePanelsDialogOpen, setDecorativePanelsDialogOpen] = useState(false);
    const [interiorDialogOpen, setInteriorDialogOpen] = useState(false);
    const [legsDialogOpen, setLegsDialogOpen] = useState(false);

    // Get material preferences from store for interior config
    const interiorMaterialPreferences = useStore((state) => state.interiorMaterialPreferences);
    const setLastUsedShelfMaterial = useStore((state) => state.setLastUsedShelfMaterial);
    const setLastUsedDrawerBoxMaterial = useStore((state) => state.setLastUsedDrawerBoxMaterial);
    const setLastUsedDrawerBottomMaterial = useStore((state) => state.setLastUsedDrawerBottomMaterial);

    // Get default body material ID
    const defaultBodyMaterialId = materials.find(m => m.isDefault && m.category === 'board')?.id ?? materials[0]?.id ?? '';

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

    // Corner cabinet specific accessors
    const getCornerConfig = (): CornerConfig | undefined => {
        if ('cornerConfig' in params) {
            return (params as CornerInternalCabinetParams).cornerConfig;
        }
        return undefined;
    };

    const updateCornerConfig = (updates: Partial<CornerConfig>) => {
        const currentConfig = getCornerConfig();
        if (!currentConfig) return;

        onChange({
            ...params,
            cornerConfig: { ...currentConfig, ...updates },
        } as any);
    };

    // Wall cabinet specific accessors
    const getHangerCutoutsEnabled = (): boolean => {
        if (params.type !== 'WALL') return false;
        return (params as WallCabinetParams).hangerCutouts?.enabled ?? DEFAULT_HANGER_CUTOUT_CONFIG.enabled;
    };

    const getHangerCutoutWidth = (): number => {
        if (params.type !== 'WALL') return DEFAULT_HANGER_CUTOUT_CONFIG.width;
        return (params as WallCabinetParams).hangerCutouts?.width ?? DEFAULT_HANGER_CUTOUT_CONFIG.width;
    };

    const getHangerCutoutHeight = (): number => {
        if (params.type !== 'WALL') return DEFAULT_HANGER_CUTOUT_CONFIG.height;
        return (params as WallCabinetParams).hangerCutouts?.height ?? DEFAULT_HANGER_CUTOUT_CONFIG.height;
    };

    const getHangerCutoutHorizontalInset = (): number => {
        if (params.type !== 'WALL') return DEFAULT_HANGER_CUTOUT_CONFIG.horizontalInset;
        return (params as WallCabinetParams).hangerCutouts?.horizontalInset ?? DEFAULT_HANGER_CUTOUT_CONFIG.horizontalInset;
    };

    const getHangerCutoutVerticalInset = (): number => {
        if (params.type !== 'WALL') return DEFAULT_HANGER_CUTOUT_CONFIG.verticalInset;
        return (params as WallCabinetParams).hangerCutouts?.verticalInset ?? DEFAULT_HANGER_CUTOUT_CONFIG.verticalInset;
    };

    const updateHangerCutouts = (updates: Partial<HangerCutoutConfig>) => {
        if (params.type !== 'WALL') return;
        const currentConfig = (params as WallCabinetParams).hangerCutouts ?? DEFAULT_HANGER_CUTOUT_CONFIG;
        onChange({
            ...params,
            hangerCutouts: { ...currentConfig, ...updates },
        } as any);
    };

    const getFoldingDoorEnabled = (): boolean => {
        if (params.type !== 'WALL') return false;
        return (params as WallCabinetParams).foldingDoorConfig?.enabled ?? false;
    };

    const getFoldingSplitRatio = (): number => {
        if (params.type !== 'WALL') return DEFAULT_FOLDING_DOOR_CONFIG.splitRatio;
        return (params as WallCabinetParams).foldingDoorConfig?.splitRatio ?? DEFAULT_FOLDING_DOOR_CONFIG.splitRatio;
    };

    const getFoldingSectionGap = (): number => {
        if (params.type !== 'WALL') return DEFAULT_FOLDING_DOOR_CONFIG.sectionGap;
        return (params as WallCabinetParams).foldingDoorConfig?.sectionGap ?? DEFAULT_FOLDING_DOOR_CONFIG.sectionGap;
    };

    const updateFoldingDoor = (updates: Partial<FoldingDoorConfig>) => {
        if (params.type !== 'WALL') return;
        const currentConfig = (params as WallCabinetParams).foldingDoorConfig ?? DEFAULT_FOLDING_DOOR_CONFIG;
        onChange({
            ...params,
            foldingDoorConfig: { ...currentConfig, ...updates },
        } as any);
    };

    // Check if drawer config has external fronts
    const drawerHasFronts = params.drawerConfig ? Drawer.hasExternalFronts(params.drawerConfig) : false;

    // Handle door toggle with conflict detection
    const handleDoorsToggle = (enableDoors: boolean) => {
        if (enableDoors && drawerHasFronts) {
            setConflictType('doors-enabling');
        } else {
            updateParams({ hasDoors: enableDoors } as any);
        }
    };

    // Handle drawer config change with conflict detection
    const handleDrawerConfigChange = (config: DrawerConfiguration) => {
        const newConfigHasFronts = Drawer.hasExternalFronts(config);
        if (newConfigHasFronts && getHasDoors()) {
            setPendingDrawerConfig(config);
            setConflictType('drawer-fronts-enabling');
        } else {
            onChange({ ...params, drawerConfig: config } as any);
            setDrawerDialogOpen(false);
        }
    };

    // Side fronts summary
    const sideFrontsConfig = params.sideFronts;
    const hasSideFrontsConfig = hasSideFronts(sideFrontsConfig);
    const sideFrontsSummary = getSideFrontsSummary(sideFrontsConfig);

    // Decorative panels summary
    const decorativePanelsConfig = params.decorativePanels;
    const hasDecorativePanelsConfig = hasDecorativePanels(decorativePanelsConfig);
    const decorativePanelsSummary = getDecorativePanelsSummary(decorativePanelsConfig);

    // Interior config summary
    const interiorConfig = params.interiorConfig;
    const hasInterior = hasInteriorContent(interiorConfig);
    const interiorSummary = getInteriorSummary(interiorConfig);

    // Door config summary
    const kitchenParams = params as Partial<KitchenCabinetParams>;
    const doorConfig = kitchenParams.doorConfig ?? DEFAULT_DOOR_CONFIG;
    const doorSummary = `${doorConfig.layout === 'SINGLE' ? 'Pojedyncze' : 'Podwójne'}, ${doorConfig.openingDirection === 'HORIZONTAL' ? 'na bok' : (doorConfig.openingDirection === 'LIFT_UP' ? 'do góry' : 'w dół')}`;

    // Handle config summary
    const handleConfig = kitchenParams.handleConfig;
    const handleSummary = handleConfig ? `${handleConfig.type}, ${handleConfig.finish}` : 'Brak';

    // Drawer config summary
    const drawerConfig = params.drawerConfig;
    const totalBoxes = drawerConfig ? Drawer.getTotalBoxCount(drawerConfig) : 0;
    const totalFronts = drawerConfig ? Drawer.getFrontCount(drawerConfig) : 0;
    const hasDrawerConfig = drawerConfig && drawerConfig.zones.length > 0;
    const configHasFronts = drawerConfig ? Drawer.hasExternalFronts(drawerConfig) : false;

    // Conflict resolution handlers
    const handleConflictResolve = (action: 'remove-doors' | 'convert-drawers' | 'cancel') => {
        if (action === 'remove-doors') {
            if (conflictType === 'doors-enabling') {
                // Just close dialog
            } else if (conflictType === 'drawer-fronts-enabling' && pendingDrawerConfig) {
                onChange({
                    ...params,
                    hasDoors: false,
                    drawerConfig: pendingDrawerConfig,
                } as any);
            }
        } else if (action === 'convert-drawers') {
            if (conflictType === 'doors-enabling') {
                const convertedConfig = params.drawerConfig
                    ? Drawer.convertToInternal(params.drawerConfig)
                    : undefined;
                onChange({
                    ...params,
                    hasDoors: true,
                    drawerConfig: convertedConfig,
                } as any);
            } else if (conflictType === 'drawer-fronts-enabling' && pendingDrawerConfig) {
                const convertedConfig = Drawer.convertToInternal(pendingDrawerConfig);
                onChange({
                    ...params,
                    drawerConfig: convertedConfig,
                } as any);
            }
        }
        setConflictType(null);
        setPendingDrawerConfig(null);
    };

    return (
        <div className="space-y-8">
            {/* Conflict Resolution Dialog */}
            <Dialog open={conflictType !== null} onOpenChange={(open) => !open && handleConflictResolve('cancel')}>
                <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Konflikt konfiguracji
                        </DialogTitle>
                        <DialogDescription>
                            {conflictType === 'doors-enabling'
                                ? 'Szafka ma szuflady z frontami. Nie można jednocześnie używać drzwi.'
                                : 'Szafka ma włączone drzwi. Nie można dodać szuflad z frontami.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto py-3"
                            onClick={() => handleConflictResolve('convert-drawers')}
                        >
                            <div className="text-left">
                                <div className="font-medium">Konwertuj szuflady na wewnętrzne</div>
                                <div className="text-xs text-muted-foreground">Usuń fronty szuflad, zachowaj boxy</div>
                            </div>
                        </Button>
                        {conflictType === 'drawer-fronts-enabling' && (
                            <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-3"
                                onClick={() => handleConflictResolve('remove-doors')}
                            >
                                <div className="text-left">
                                    <div className="font-medium">Usuń drzwi</div>
                                    <div className="text-xs text-muted-foreground">Zachowaj fronty szuflad</div>
                                </div>
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

            {/* Section: Dimensions */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Wymiary
                </h3>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="space-y-1 md:space-y-2">
                        <Label className="text-[10px] md:text-xs text-muted-foreground">Szer. (mm)</Label>
                        <NumberInput 
                            value={params.width} 
                            onChange={val => updateParams({width: val})} 
                            min={1} 
                            allowNegative={false} 
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                        <Label className="text-[10px] md:text-xs text-muted-foreground">Wys. (mm)</Label>
                        <NumberInput
                            value={params.height}
                            onChange={val => updateParams({height: val})}
                            min={1}
                            allowNegative={false}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                        <Label className="text-[10px] md:text-xs text-muted-foreground">Głęb. (mm)</Label>
                        <NumberInput 
                            value={params.depth} 
                            onChange={val => updateParams({depth: val})} 
                            min={1} 
                            allowNegative={false}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
            
            <Separator />

            {/* Section: Structure */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    Konstrukcja
                </h3>
                
                <div className="grid gap-4">
                     <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Montaż wieńców</Label>
                            <Select
                                value={params.topBottomPlacement || 'inset'}
                                onValueChange={(val: TopBottomPlacement) => updateParams({ topBottomPlacement: val } as any)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inset">Wpuszczane (między boki)</SelectItem>
                                    <SelectItem value="overlay">Nakładane (na boki)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                         <div className="flex items-center justify-between border rounded-md p-2 h-9">
                            <Label className="text-sm cursor-pointer flex-1" htmlFor="has-back">Plecy (HDF)</Label>
                            <Switch 
                                id="has-back"
                                checked={getHasBack()} 
                                onCheckedChange={val => updateParams({hasBack: val} as any)} 
                            />
                        </div>
                    </div>

                    {getHasBack() && (
                         <div className="space-y-2 bg-muted/30 p-3 rounded-md">
                            <div className="flex justify-between">
                                <Label className="text-xs">Głębokość wpustu</Label>
                                <span className="text-xs font-mono">{Math.round(getBackOverlapRatio() * 100)}%</span>
                            </div>
                            <Slider
                                value={[getBackOverlapRatio()]}
                                onValueChange={([val]) => updateParams({backOverlapRatio: val} as any)}
                                min={0.33}
                                max={1.0}
                                step={0.01}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            {/* Section: Corner Configuration (only for corner cabinets) */}
            {type === 'CORNER_INTERNAL' && (
                <>
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                            <CornerUpRight className="h-4 w-4" />
                            Konfiguracja narożnika
                        </h3>

                        <div className="grid gap-4">
                            {/* Corner Orientation and Door Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Orientacja narożnika</Label>
                                    <Select
                                        value={getCornerConfig()?.cornerOrientation || 'LEFT'}
                                        onValueChange={(val: CornerOrientation) => updateCornerConfig({ cornerOrientation: val })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LEFT">Lewa</SelectItem>
                                            <SelectItem value="RIGHT">Prawa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Typ frontu</Label>
                                    <Select
                                        value={getCornerConfig()?.frontType || 'NONE'}
                                        onValueChange={(val: CornerFrontType) => updateCornerConfig({ frontType: val })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">Brak (otwarty)</SelectItem>
                                            <SelectItem value="SINGLE">Prosty (0°)</SelectItem>
                                            <SelectItem value="ANGLED">Diagonalny (45°)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Dimensions */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Wymiary zewnętrzne</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                            const config = getCornerConfig();
                                            if (config) {
                                                updateCornerConfig({
                                                    W: config.D,
                                                    D: config.W,
                                                });
                                            }
                                        }}
                                    >
                                        <ArrowLeftRight className="h-3 w-3 mr-1" />
                                        Zamień W/D
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Szerokość W (mm)</Label>
                                        <NumberInput
                                            value={getCornerConfig()?.W || 900}
                                            onChange={(val) => updateCornerConfig({ W: val })}
                                            min={600}
                                            max={1500}
                                            allowNegative={false}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Głębokość D (mm)</Label>
                                        <NumberInput
                                            value={getCornerConfig()?.D || 900}
                                            onChange={(val) => updateCornerConfig({ D: val })}
                                            min={600}
                                            max={1500}
                                            allowNegative={false}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Głębokość korpusu (mm)</Label>
                                        <NumberInput
                                            value={getCornerConfig()?.bodyDepth || 560}
                                            onChange={(val) => updateCornerConfig({ bodyDepth: val })}
                                            min={300}
                                            max={800}
                                            allowNegative={false}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Panel Geometry */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Geometria paneli (góra/dół)</Label>
                                <Select
                                    value={getCornerConfig()?.panelGeometry || 'TWO_RECT'}
                                    onValueChange={(val: CornerPanelGeometry) => updateCornerConfig({ panelGeometry: val })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TWO_RECT">Dwa prostokąty</SelectItem>
                                        <SelectItem value="L_SHAPE">L-kształt (wymaga DXF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Front Rail Toggle */}
                            <div className="flex items-center justify-between border rounded-md p-2">
                                <Label className="text-sm cursor-pointer flex-1" htmlFor="front-rail-mode">
                                    Wieniec przedni (górna listwa)
                                </Label>
                                <Switch
                                    id="front-rail-mode"
                                    checked={getCornerConfig()?.frontRail ?? true}
                                    onCheckedChange={(checked) => updateCornerConfig({ frontRail: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />
                </>
            )}

            {/* Section: Wall Cabinet Configuration (only for wall cabinets) */}
            {type === 'WALL' && (
                <>
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                            <SquareStack className="h-4 w-4" />
                            Konfiguracja szafki wiszącej
                        </h3>

                        <div className="grid gap-4">
                            {/* Hanger Cutouts */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border rounded-md p-2 h-9">
                                    <Label className="text-sm cursor-pointer flex-1" htmlFor="hanger-cutouts">
                                        Wycięcia na zawieszki
                                    </Label>
                                    <Switch
                                        id="hanger-cutouts"
                                        checked={getHangerCutoutsEnabled()}
                                        onCheckedChange={(val) => updateHangerCutouts({ enabled: val })}
                                    />
                                </div>

                                {getHangerCutoutsEnabled() && (
                                    <div className="bg-muted/30 p-3 rounded-md space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Szerokość (mm)</Label>
                                                <NumberInput
                                                    value={getHangerCutoutWidth()}
                                                    onChange={(val) => updateHangerCutouts({ width: val })}
                                                    min={HANGER_CUTOUT_LIMITS.MIN_WIDTH}
                                                    max={HANGER_CUTOUT_LIMITS.MAX_WIDTH}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Wysokość (mm)</Label>
                                                <NumberInput
                                                    value={getHangerCutoutHeight()}
                                                    onChange={(val) => updateHangerCutouts({ height: val })}
                                                    min={HANGER_CUTOUT_LIMITS.MIN_HEIGHT}
                                                    max={HANGER_CUTOUT_LIMITS.MAX_HEIGHT}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Wcięcie poziome (mm)</Label>
                                                <NumberInput
                                                    value={getHangerCutoutHorizontalInset()}
                                                    onChange={(val) => updateHangerCutouts({ horizontalInset: val })}
                                                    min={HANGER_CUTOUT_LIMITS.MIN_INSET}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Wcięcie pionowe (mm)</Label>
                                                <NumberInput
                                                    value={getHangerCutoutVerticalInset()}
                                                    onChange={(val) => updateHangerCutouts({ verticalInset: val })}
                                                    min={HANGER_CUTOUT_LIMITS.MIN_INSET}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Folding Door */}
                            {getHasDoors() && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border rounded-md p-2 h-9">
                                        <Label className="text-sm cursor-pointer flex-1" htmlFor="folding-door">
                                            Front łamany (2 sekcje)
                                        </Label>
                                        <Switch
                                            id="folding-door"
                                            checked={getFoldingDoorEnabled()}
                                            onCheckedChange={(val) => updateFoldingDoor({ enabled: val })}
                                        />
                                    </div>

                                    {getFoldingDoorEnabled() && (
                                        <div className="bg-muted/30 p-3 rounded-md space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <Label className="text-xs">Proporcja podziału (dolna sekcja)</Label>
                                                    <span className="text-xs font-mono">{Math.round(getFoldingSplitRatio() * 100)}%</span>
                                                </div>
                                                <Slider
                                                    value={[getFoldingSplitRatio() * 100]}
                                                    onValueChange={([val]) => updateFoldingDoor({ splitRatio: val / 100 })}
                                                    min={FOLDING_DOOR_LIMITS.MIN_SPLIT_RATIO * 100}
                                                    max={FOLDING_DOOR_LIMITS.MAX_SPLIT_RATIO * 100}
                                                    step={5}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Przerwa między sekcjami (mm)</Label>
                                                <NumberInput
                                                    value={getFoldingSectionGap()}
                                                    onChange={(val) => updateFoldingDoor({ sectionGap: val })}
                                                    min={FOLDING_DOOR_LIMITS.MIN_GAP}
                                                    max={FOLDING_DOOR_LIMITS.MAX_GAP}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />
                </>
            )}

            {/* Section: Configuration */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    Wyposażenie
                </h3>

                <div className="space-y-3">
                    {/* LEGACY: Shelves Control - replaced by "Wnętrze (zaawansowane)" module */}
                    {/* TODO: Remove after confirming users have migrated to new interior config */}
                    {false && (type === 'KITCHEN' || type === 'WARDROBE' || type === 'BOOKSHELF') && (
                        <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium">Półki</h4>
                                    <p className="text-xs text-muted-foreground">Ilość półek wewnętrznych: {getShelfCount()}</p>
                                </div>
                                <div className="w-32">
                                     <Slider
                                        value={[getShelfCount()]}
                                        onValueChange={([val]) => updateParams({shelfCount: val} as any)}
                                        min={0}
                                        max={10}
                                        step={1}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Doors Main Toggle */}
                    {(type === 'KITCHEN' || type === 'WARDROBE' || type === 'WALL') && (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium">Fronty</h4>
                                    {drawerHasFronts && !getHasDoors() && (
                                        <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                                            Konflikt: szuflady
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {type === 'WARDROBE' ? `Ilość skrzydeł: ${getDoorCount()}` : (getHasDoors() ? 'Włączone' : 'Wyłączone')}
                                </p>
                             </div>
                             
                             {type === 'WARDROBE' ? (
                                <div className="w-32">
                                    <Slider 
                                        value={[getDoorCount()]} 
                                        onValueChange={([val]) => updateParams({doorCount: val} as any)} 
                                        min={1} 
                                        max={4} 
                                        step={1} 
                                    />
                                </div>
                             ) : (
                                <Switch checked={getHasDoors()} onCheckedChange={handleDoorsToggle} />
                             )}
                        </div>
                    )}

                    {/* Conditional Door Configuration */}
                    {getHasDoors() && (type === 'KITCHEN' || type === 'WALL') && (
                        <>
                            <ConfigRow
                                title="Konfiguracja frontów"
                                description={doorSummary}
                                icon={<RectangleHorizontal className="h-4 w-4" />}
                                action={
                                    <Button variant="outline" size="sm" onClick={() => setFrontsDialogOpen(true)}>
                                        Konfiguruj
                                    </Button>
                                }
                            />
                            <ConfigRow
                                title="Uchwyty"
                                description={handleSummary}
                                icon={<Grip className="h-4 w-4" />}
                                action={
                                    <Button variant="outline" size="sm" onClick={() => setHandlesDialogOpen(true)}>
                                        Konfiguruj
                                    </Button>
                                }
                            />
                        </>
                    )}

                    {/* LEGACY: Drawers Configuration - replaced by "Wnętrze (zaawansowane)" module */}
                    {/* TODO: Remove after confirming users have migrated to new interior config */}
                    {false && (type === 'KITCHEN' || type === 'WARDROBE' || type === 'BOOKSHELF' || type === 'DRAWER') && (
                         <ConfigRow
                            title="Szuflady"
                            description={
                                hasDrawerConfig
                                    ? `${totalFronts > 0 ? `${totalFronts} frontów, ` : ''}${totalBoxes} boxów • ${drawerConfig?.slideType}`
                                    : 'Brak szuflad'
                            }
                            icon={<Layers className="h-4 w-4" />}
                            alert={
                                configHasFronts && getHasDoors() ? (
                                    <Alert variant="warning" className="mt-2 py-2">
                                        <AlertTriangle className="h-3 w-3" />
                                        <AlertDescription className="text-xs">
                                            Konflikt z drzwiami. Szuflady będą wewnętrzne.
                                        </AlertDescription>
                                    </Alert>
                                ) : null
                            }
                            action={
                                <Button variant="outline" size="sm" onClick={() => setDrawerDialogOpen(true)}>
                                    Konfiguruj
                                </Button>
                            }
                        />
                    )}

                    {/* Side Fronts Configuration */}
                     <ConfigRow
                        title="Fronty boczne"
                        description={hasSideFrontsConfig ? sideFrontsSummary : 'Brak (standardowe boki)'}
                        icon={<PanelLeftDashed className="h-4 w-4" />}
                        action={
                            <Button variant="outline" size="sm" onClick={() => setSideFrontsDialogOpen(true)}>
                                Konfiguruj
                            </Button>
                        }
                    />

                    {/* Decorative Panels Configuration */}
                    <ConfigRow
                        title="Panele ozdobne"
                        description={hasDecorativePanelsConfig ? decorativePanelsSummary : 'Brak (standardowa konstrukcja)'}
                        icon={<PanelTop className="h-4 w-4" />}
                        action={
                            <Button variant="outline" size="sm" onClick={() => setDecorativePanelsDialogOpen(true)}>
                                Konfiguruj
                            </Button>
                        }
                    />

                    {/* Interior Configuration (Unified Shelves + Drawers) */}
                    <ConfigRow
                        title="Wnętrze (zaawansowane)"
                        description={hasInterior ? interiorSummary : 'Użyj konfiguracji półek/szuflad powyżej lub skonfiguruj zaawansowane sekcje'}
                        icon={<LayoutGrid className="h-4 w-4" />}
                        action={
                            <Button variant="outline" size="sm" onClick={() => setInteriorDialogOpen(true)}>
                                Konfiguruj
                            </Button>
                        }
                    />

                    {/* Legs Configuration - not for wall cabinets */}
                    {type !== 'WALL' && (
                        <ConfigRow
                            title="Nóżki"
                            description={getLegsSummary(params.legs, params.width)}
                            icon={<Footprints className="h-4 w-4" />}
                            action={
                                <Button variant="outline" size="sm" onClick={() => setLegsDialogOpen(true)}>
                                    Konfiguruj
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>

            {/* Sub-Dialogs */}
            <FrontsConfigDialog
                open={frontsDialogOpen}
                onOpenChange={setFrontsDialogOpen}
                params={params}
                onParamsChange={onChange}
            />
            <HandlesConfigDialog
                open={handlesDialogOpen}
                onOpenChange={setHandlesDialogOpen}
                params={params}
                onParamsChange={onChange}
            />
            <DrawerConfigDialog
                open={drawerDialogOpen}
                onOpenChange={setDrawerDialogOpen}
                config={drawerConfig}
                onConfigChange={handleDrawerConfigChange}
                cabinetHeight={params.height ?? 720}
                cabinetWidth={params.width ?? 600}
            />
            <SideFrontsConfigDialog
                open={sideFrontsDialogOpen}
                onOpenChange={setSideFrontsDialogOpen}
                config={sideFrontsConfig}
                onConfigChange={(config) => onChange({ ...params, sideFronts: config } as any)}
                materials={materials}
                defaultFrontMaterialId={defaultFrontMaterialId}
                cabinetHeight={params.height ?? 720}
            />
            <DecorativePanelsConfigDialog
                open={decorativePanelsDialogOpen}
                onOpenChange={setDecorativePanelsDialogOpen}
                config={decorativePanelsConfig}
                onConfigChange={(config) => onChange({ ...params, decorativePanels: config } as any)}
                materials={materials}
                defaultFrontMaterialId={defaultFrontMaterialId}
                cabinetHeight={params.height ?? 720}
                cabinetWidth={params.width ?? 600}
                cabinetDepth={params.depth ?? 500}
            />
            <InteriorConfigDialog
                open={interiorDialogOpen}
                onOpenChange={setInteriorDialogOpen}
                config={interiorConfig}
                onConfigChange={(config) => onChange({ ...params, interiorConfig: config } as any)}
                cabinetHeight={params.height ?? 720}
                cabinetWidth={params.width ?? 600}
                cabinetDepth={params.depth ?? 500}
                hasDoors={getHasDoors()}
                onRemoveDoors={() => updateParams({ hasDoors: false } as any)}
                materials={materials}
                bodyMaterialId={defaultBodyMaterialId}
                lastUsedShelfMaterial={interiorMaterialPreferences.shelfMaterialId}
                lastUsedDrawerBoxMaterial={interiorMaterialPreferences.drawerBoxMaterialId}
                lastUsedDrawerBottomMaterial={interiorMaterialPreferences.drawerBottomMaterialId}
                onShelfMaterialChange={setLastUsedShelfMaterial}
                onDrawerBoxMaterialChange={setLastUsedDrawerBoxMaterial}
                onDrawerBottomMaterialChange={setLastUsedDrawerBottomMaterial}
            />
            <LegsConfigDialog
                open={legsDialogOpen}
                onOpenChange={setLegsDialogOpen}
                config={params.legs}
                onConfigChange={(config) => onChange({ ...params, legs: config } as any)}
                cabinetWidth={params.width ?? 600}
            />
        </div>
    )
}

/**
 * Conflict type for doors vs drawer fronts
 */
type ConflictType = 'doors-enabling' | 'drawer-fronts-enabling' | null;

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

    // Track cabinet creation
    track(AnalyticsEvent.CABINET_CREATED, {
      template_type: selectedType,
      template_id: selectedType.toLowerCase(),
    });

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

    // Track template selection
    track(AnalyticsEvent.TEMPLATE_SELECTED, {
      template_id: type.toLowerCase(),
      template_name: type,
      category: 'cabinet',
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 py-6 border-b">
          <DialogTitle className="text-xl">
             {step === 'select' && 'Wybierz typ szafki'}
             {step === 'configure' && 'Konfiguracja parametrów'}
             {step === 'materials' && 'Wybór materiałów'}
          </DialogTitle>
          <DialogDescription>
             {step === 'select' && 'Wybierz jeden z dostępnych szablonów, aby rozpocząć konfigurację.'}
             {step === 'configure' && 'Dostosuj wymiary i wyposażenie szafki.'}
             {step === 'materials' && 'Wybierz materiały dla korpusu i frontów.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Template Selection */}
          {step === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <TemplateCard
                type="KITCHEN"
                title="Szafka kuchenna"
                description="Uniwersalna szafka z możliwością konfiguracji drzwi, szuflad i półek."
                icon={<Box className="w-6 h-6" />}
                onClick={() => handleSelectType('KITCHEN')}
              />
              <TemplateCard
                type="CORNER_INTERNAL"
                title="Szafka narożna"
                description="Szafka L-kształtna do wewnętrznych narożników kuchni."
                icon={<CornerUpRight className="w-6 h-6" />}
                onClick={() => handleSelectType('CORNER_INTERNAL')}
              />
              <TemplateCard
                type="WARDROBE"
                title="Szafa ubraniowa"
                description="Wysoka szafa z drzwiami skrzydłowymi i półkami."
                icon={<Warehouse className="w-6 h-6" />}
                onClick={() => handleSelectType('WARDROBE')}
              />
              <TemplateCard
                type="BOOKSHELF"
                title="Regał"
                description="Otwarty regał z konfigurowalną ilością półek."
                icon={<Library className="w-6 h-6" />}
                onClick={() => handleSelectType('BOOKSHELF')}
              />
              <TemplateCard
                type="DRAWER"
                title="Kontener szufladowy"
                description="Szafka dedykowana wyłącznie pod szuflady."
                icon={<Layers className="w-6 h-6" />}
                onClick={() => handleSelectType('DRAWER')}
              />
              <TemplateCard
                type="WALL"
                title="Szafka wisząca"
                description="Szafka ścienna z wycięciami na zawieszki, opcja frontu łamanego."
                icon={<SquareStack className="w-6 h-6" />}
                onClick={() => handleSelectType('WALL')}
              />
            </div>
          )}

          {/* Step 2: Parameter Configuration */}
          {step === 'configure' && selectedType && (
              <ParameterForm
                type={selectedType}
                params={params}
                onChange={setParams}
                materials={availableMaterials}
                defaultFrontMaterialId={default_front_material ?? ''}
              />
          )}

          {/* Step 3: Material Selection */}
          {step === 'materials' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Korpus (boki, wieńce, półki)</Label>
                <Select
                  value={materials?.bodyMaterialId}
                  onValueChange={(id) => setMaterials({ ...materials, bodyMaterialId: id })}
                >
                  <SelectTrigger className="h-10">
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
              
              <div className="space-y-3">
                <Label className="text-base font-medium">Fronty</Label>
                <Select
                  value={materials?.frontMaterialId}
                  onValueChange={(id) => setMaterials({ ...materials, frontMaterialId: id })}
                >
                  <SelectTrigger className="h-10">
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
                <div className="space-y-3">
                  <Label className="text-base font-medium">Plecy (HDF)</Label>
                  <Select
                    value={materials?.backMaterialId}
                    onValueChange={(id) => setMaterials({ ...materials, backMaterialId: id })}
                  >
                    <SelectTrigger className="h-10">
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

        {/* Footer */}
        {step !== 'select' && (
          <div className="flex-shrink-0 border-t bg-muted/20 px-4 md:px-6 py-3 md:py-4 flex flex-col-reverse sm:flex-row justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(step === 'materials' ? 'configure' : 'select')}
              className="w-full sm:w-auto"
            >
              Wstecz
            </Button>
            {step === 'configure' && (
              <Button onClick={() => setStep('materials')} className="w-full sm:w-auto">
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
                className="w-full sm:w-auto"
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
