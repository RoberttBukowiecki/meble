/**
 * CabinetTemplateDialog - Multi-step dialog for creating cabinets
 *
 * Steps:
 * 1. Category Selection (Kitchen / Furniture)
 * 2. Template Selection (specific cabinet type)
 * 3. Parameter Configuration (dimensions, equipment)
 * 4. Material Selection (body, front, back materials)
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@meble/ui";
import { track, AnalyticsEvent } from "@meble/analytics";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { CabinetType, CabinetParams, CabinetMaterials } from "@/types";
import { getInitialCabinetParams, mergeWithPreferences } from "@/lib/cabinetDefaults";
import { getDefaultMaterials, getDefaultBackMaterial } from "@/lib/store/utils";
import { ParameterForm, MaterialsSection } from "../ParameterForm";
import { CategoryStep, Category } from "./CategoryStep";
import { TemplateStep } from "./TemplateStep";

// ============================================================================
// Types
// ============================================================================

interface CabinetTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  furnitureId: string;
}

type Step = "category" | "select" | "configure" | "materials";

// ============================================================================
// Step Titles & Descriptions
// ============================================================================

const STEP_CONFIG: Record<Step, { title: string; description: string }> = {
  category: {
    title: "Co chcesz zaprojektować?",
    description: "Wybierz kategorię mebla, który chcesz dodać do projektu.",
  },
  select: {
    title: "", // Set dynamically based on category
    description: "Wybierz typ szafki, aby rozpocząć konfigurację.",
  },
  configure: {
    title: "Konfiguracja parametrów",
    description: "Dostosuj wymiary i wyposażenie szafki.",
  },
  materials: {
    title: "Wybór materiałów",
    description: "Wybierz materiały dla korpusu i frontów.",
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function CabinetTemplateDialog({
  open,
  onOpenChange,
  furnitureId,
}: CabinetTemplateDialogProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [selectedType, setSelectedType] = useState<CabinetType | null>(null);
  const [params, setParams] = useState<Partial<CabinetParams>>({});
  const [materials, setMaterials] = useState<Partial<CabinetMaterials>>({});

  // -------------------------------------------------------------------------
  // Store access
  // -------------------------------------------------------------------------
  const {
    addCabinet,
    materials: availableMaterials,
    cabinetPreferences,
    saveCabinetPreferencesFromParams,
  } = useStore(
    useShallow((state) => ({
      addCabinet: state.addCabinet,
      materials: state.materials,
      cabinetPreferences: state.cabinetPreferences,
      saveCabinetPreferencesFromParams: state.saveCabinetPreferencesFromParams,
    }))
  );

  // -------------------------------------------------------------------------
  // Default materials
  // -------------------------------------------------------------------------
  const { default_material, default_front_material } = useMemo(
    () => getDefaultMaterials(availableMaterials),
    [availableMaterials]
  );

  const default_back_material = useMemo(
    () => getDefaultBackMaterial(availableMaterials)?.id,
    [availableMaterials]
  );

  const defaultCountertopMaterialId = useMemo(
    () => availableMaterials.find((m) => m.category === "countertop")?.id,
    [availableMaterials]
  );

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleCreate = () => {
    if (
      !selectedType ||
      !params.width ||
      !params.height ||
      !params.depth ||
      !materials.bodyMaterialId ||
      !materials.frontMaterialId
    )
      return;

    const finalParams = params as CabinetParams;
    addCabinet(furnitureId, selectedType, finalParams, materials as CabinetMaterials);
    saveCabinetPreferencesFromParams(selectedType, finalParams);

    track(AnalyticsEvent.CABINET_CREATED, {
      template_type: selectedType,
      template_id: selectedType.toLowerCase(),
    });

    // Reset and close
    onOpenChange(false);
    resetDialog();
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setStep("select");
  };

  const handleSelectType = (type: CabinetType) => {
    setSelectedType(type);
    const initialParams = getInitialCabinetParams(type);
    const typePreferences = cabinetPreferences[type];
    const mergedParams = mergeWithPreferences(initialParams, typePreferences, type);
    setParams(mergedParams);
    setStep("configure");

    track(AnalyticsEvent.TEMPLATE_SELECTED, {
      template_id: type.toLowerCase(),
      template_name: type,
      category: "cabinet",
    });
  };

  const handleBack = () => {
    if (step === "materials") setStep("configure");
    else if (step === "configure") setStep("select");
    else if (step === "select") {
      setStep("category");
      setSelectedCategory(null);
    }
  };

  const resetDialog = () => {
    setStep("category");
    setSelectedCategory(null);
    setSelectedType(null);
    setParams({});
    setMaterials({});
  };

  // -------------------------------------------------------------------------
  // Dynamic title for select step
  // -------------------------------------------------------------------------
  const getTitle = () => {
    if (step === "select") {
      return selectedCategory === "kitchen" ? "Szafki kuchenne" : "Meble";
    }
    return STEP_CONFIG[step].title;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-6 border-b">
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
          <DialogDescription>{STEP_CONFIG[step].description}</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "category" && <CategoryStep onSelect={handleSelectCategory} />}

          {step === "select" && (
            <TemplateStep category={selectedCategory} onSelect={handleSelectType} />
          )}

          {step === "configure" && selectedType && (
            <ParameterForm
              type={selectedType}
              params={params}
              onChange={setParams}
              materials={availableMaterials}
              defaultFrontMaterialId={default_front_material ?? ""}
            />
          )}

          {step === "materials" && (
            <MaterialsSection
              materials={materials}
              onChange={setMaterials}
              availableMaterials={availableMaterials}
              cabinetType={selectedType}
              hasBack={params.hasBack ?? true}
              hasCountertop={(params as any).countertopConfig?.hasCountertop ?? false}
              countertopMaterialId={
                (params as any).countertopConfig?.materialId || defaultCountertopMaterialId
              }
              onCountertopMaterialChange={(id) =>
                setParams((prev) => ({
                  ...prev,
                  countertopConfig: {
                    ...(prev as any).countertopConfig,
                    hasCountertop: true,
                    materialId: id,
                  },
                }))
              }
            />
          )}
        </div>

        {/* Footer */}
        {step !== "category" && (
          <div className="flex-shrink-0 border-t bg-muted/20 px-4 md:px-6 py-3 md:py-4 flex flex-col-reverse sm:flex-row justify-between gap-2">
            <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
              Wstecz
            </Button>

            {step === "configure" && (
              <Button onClick={() => setStep("materials")} className="w-full sm:w-auto">
                Dalej: Materiały
              </Button>
            )}

            {step === "materials" && (
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
