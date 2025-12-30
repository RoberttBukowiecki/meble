/**
 * ParameterForm - Main cabinet parameter configuration form
 *
 * Orchestrates all section components and manages:
 * - Dialog states for sub-configurations
 * - Conflict resolution (doors vs drawer fronts)
 * - Material preferences
 */

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@meble/ui";
import {
  CabinetType,
  CabinetParams,
  Material,
  DrawerConfiguration,
  WallCabinetParams,
  CornerInternalCabinetParams,
} from "@/types";
import { Drawer } from "@/lib/domain";
import { AlertTriangle } from "lucide-react";

// Section components
import { DimensionsSection } from "./DimensionsSection";
import { StructureSection } from "./StructureSection";
import { WallCabinetSection } from "./WallCabinetSection";
import { CornerCabinetSection } from "./CornerCabinetSection";
import { EquipmentSection } from "./EquipmentSection";

// Sub-dialogs
import { FrontsConfigDialog } from "../FrontsConfigDialog";
import { HandlesConfigDialog } from "../HandlesConfigDialog";
import { DrawerConfigDialog } from "../DrawerConfigDialog";
import { SideFrontsConfigDialog } from "../SideFrontsConfigDialog";
import { DecorativePanelsConfigDialog } from "../DecorativePanelsConfigDialog";
import { InteriorConfigDialog } from "../InteriorConfigDialog";
import { LegsConfigDialog } from "../LegsConfigDialog";
import { CountertopConfigDialog } from "../CountertopConfigDialog";

// ============================================================================
// Types
// ============================================================================

type ConflictType = "doors-enabling" | "drawer-fronts-enabling" | null;

interface ParameterFormProps {
  type: CabinetType;
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
  materials: Material[];
  defaultFrontMaterialId: string;
}

// ============================================================================
// Component
// ============================================================================

export function ParameterForm({
  type,
  params,
  onChange,
  materials,
  defaultFrontMaterialId,
}: ParameterFormProps) {
  // -------------------------------------------------------------------------
  // Conflict resolution state
  // -------------------------------------------------------------------------
  const [conflictType, setConflictType] = useState<ConflictType>(null);
  const [pendingDrawerConfig, setPendingDrawerConfig] = useState<DrawerConfiguration | null>(null);

  // -------------------------------------------------------------------------
  // Dialog states
  // -------------------------------------------------------------------------
  const [frontsDialogOpen, setFrontsDialogOpen] = useState(false);
  const [handlesDialogOpen, setHandlesDialogOpen] = useState(false);
  const [drawerDialogOpen, setDrawerDialogOpen] = useState(false);
  const [sideFrontsDialogOpen, setSideFrontsDialogOpen] = useState(false);
  const [decorativePanelsDialogOpen, setDecorativePanelsDialogOpen] = useState(false);
  const [interiorDialogOpen, setInteriorDialogOpen] = useState(false);
  const [legsDialogOpen, setLegsDialogOpen] = useState(false);
  const [countertopDialogOpen, setCountertopDialogOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Store access for material preferences
  // -------------------------------------------------------------------------
  const interiorMaterialPreferences = useStore((state) => state.interiorMaterialPreferences);
  const setLastUsedShelfMaterial = useStore((state) => state.setLastUsedShelfMaterial);
  const setLastUsedDrawerBoxMaterial = useStore((state) => state.setLastUsedDrawerBoxMaterial);
  const setLastUsedDrawerBottomMaterial = useStore(
    (state) => state.setLastUsedDrawerBottomMaterial
  );

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const defaultBodyMaterialId =
    materials.find((m) => m.isDefault && m.category === "board")?.id ?? materials[0]?.id ?? "";

  const hasDoors = ("hasDoors" in params && params.hasDoors) ?? false;
  const drawerConfig = params.drawerConfig;
  const drawerHasFronts = drawerConfig ? Drawer.hasExternalFronts(drawerConfig) : false;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const updateParams = (updates: Partial<CabinetParams>) => {
    onChange({ ...params, ...updates });
  };

  const handleDoorsToggle = (enableDoors: boolean) => {
    if (enableDoors && drawerHasFronts) {
      setConflictType("doors-enabling");
    } else {
      updateParams({ hasDoors: enableDoors } as any);
    }
  };

  const handleDrawerConfigChange = (config: DrawerConfiguration) => {
    const newConfigHasFronts = Drawer.hasExternalFronts(config);
    if (newConfigHasFronts && hasDoors) {
      setPendingDrawerConfig(config);
      setConflictType("drawer-fronts-enabling");
    } else {
      onChange({ ...params, drawerConfig: config } as any);
      setDrawerDialogOpen(false);
    }
  };

  const handleConflictResolve = (action: "remove-doors" | "convert-drawers" | "cancel") => {
    if (action === "remove-doors") {
      if (conflictType === "drawer-fronts-enabling" && pendingDrawerConfig) {
        onChange({
          ...params,
          hasDoors: false,
          drawerConfig: pendingDrawerConfig,
        } as any);
      }
    } else if (action === "convert-drawers") {
      if (conflictType === "doors-enabling") {
        const convertedConfig = params.drawerConfig
          ? Drawer.convertToInternal(params.drawerConfig)
          : undefined;
        onChange({
          ...params,
          hasDoors: true,
          drawerConfig: convertedConfig,
        } as any);
      } else if (conflictType === "drawer-fronts-enabling" && pendingDrawerConfig) {
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Conflict Resolution Dialog */}
      <Dialog
        open={conflictType !== null}
        onOpenChange={(open) => !open && handleConflictResolve("cancel")}
      >
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Konflikt konfiguracji
            </DialogTitle>
            <DialogDescription>
              {conflictType === "doors-enabling"
                ? "Szafka ma szuflady z frontami. Nie można jednocześnie używać drzwi."
                : "Szafka ma włączone drzwi. Nie można dodać szuflad z frontami."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleConflictResolve("convert-drawers")}
            >
              <div className="text-left">
                <div className="font-medium">Konwertuj szuflady na wewnętrzne</div>
                <div className="text-xs text-muted-foreground">
                  Usuń fronty szuflad, zachowaj boxy
                </div>
              </div>
            </Button>
            {conflictType === "drawer-fronts-enabling" && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleConflictResolve("remove-doors")}
              >
                <div className="text-left">
                  <div className="font-medium">Usuń drzwi</div>
                  <div className="text-xs text-muted-foreground">Zachowaj fronty szuflad</div>
                </div>
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleConflictResolve("cancel")}>
              Anuluj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section: Dimensions */}
      <DimensionsSection params={params} onChange={onChange} />

      {/* Section: Structure */}
      <StructureSection params={params} onChange={onChange} />

      {/* Section: Corner Cabinet (only for CORNER_INTERNAL) */}
      {type === "CORNER_INTERNAL" && (
        <CornerCabinetSection
          params={params as Partial<CornerInternalCabinetParams>}
          onChange={onChange as any}
        />
      )}

      {/* Section: Wall Cabinet (only for WALL) */}
      {type === "WALL" && (
        <WallCabinetSection
          params={params as Partial<WallCabinetParams>}
          onChange={onChange as any}
          hasDoors={hasDoors}
        />
      )}

      {/* Section: Equipment */}
      <EquipmentSection
        type={type}
        params={params}
        onChange={onChange}
        onOpenFrontsDialog={() => setFrontsDialogOpen(true)}
        onOpenHandlesDialog={() => setHandlesDialogOpen(true)}
        onOpenSideFrontsDialog={() => setSideFrontsDialogOpen(true)}
        onOpenDecorativePanelsDialog={() => setDecorativePanelsDialogOpen(true)}
        onOpenInteriorDialog={() => setInteriorDialogOpen(true)}
        onOpenLegsDialog={() => setLegsDialogOpen(true)}
        onOpenCountertopDialog={() => setCountertopDialogOpen(true)}
        onDoorsToggle={handleDoorsToggle}
        drawerHasFronts={drawerHasFronts}
      />

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
        config={params.sideFronts}
        onConfigChange={(config) => onChange({ ...params, sideFronts: config } as any)}
        materials={materials}
        defaultFrontMaterialId={defaultFrontMaterialId}
        cabinetHeight={params.height ?? 720}
      />
      <DecorativePanelsConfigDialog
        open={decorativePanelsDialogOpen}
        onOpenChange={setDecorativePanelsDialogOpen}
        config={params.decorativePanels}
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
        config={params.interiorConfig}
        onConfigChange={(config) => onChange({ ...params, interiorConfig: config } as any)}
        cabinetHeight={params.height ?? 720}
        cabinetWidth={params.width ?? 600}
        cabinetDepth={params.depth ?? 500}
        hasDoors={hasDoors}
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
      {(type === "KITCHEN" || type === "CORNER_INTERNAL" || type === "CORNER_EXTERNAL") && (
        <CountertopConfigDialog
          open={countertopDialogOpen}
          onOpenChange={setCountertopDialogOpen}
          config={"countertopConfig" in params ? (params as any).countertopConfig : undefined}
          onConfigChange={(config) => onChange({ ...params, countertopConfig: config } as any)}
          isExistingCabinet={false}
          countertopMaterials={materials.filter((m) => m.category === "countertop")}
          defaultMaterialId={materials.find((m) => m.category === "countertop")?.id}
        />
      )}
    </div>
  );
}
