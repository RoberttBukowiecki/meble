/**
 * MaterialsSection - Material selection for cabinet
 *
 * Handles selection of:
 * - Body material (sides, top/bottom, shelves)
 * - Front material (doors, drawer fronts)
 * - Back material (HDF panel)
 * - Countertop material (for kitchen cabinets)
 */

import { CabinetType, CabinetMaterials, Material } from "@/types";
import { FormSection } from "./FormSection";
import { SelectField } from "./InputGrid";
import { Palette, Layers, PanelBottom, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialsSectionProps {
  materials: Partial<CabinetMaterials>;
  onChange: (materials: Partial<CabinetMaterials>) => void;
  availableMaterials: Material[];
  cabinetType: CabinetType | null;
  hasBack: boolean;
  hasCountertop: boolean;
  countertopMaterialId?: string;
  onCountertopMaterialChange?: (materialId: string) => void;
}

interface MaterialCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  materialId: string | undefined;
  materials: Material[];
  onChange: (id: string) => void;
  colorPreview?: string;
}

function MaterialCard({
  icon: Icon,
  title,
  description,
  materialId,
  materials,
  onChange,
  colorPreview,
}: MaterialCardProps) {
  const selectedMaterial = materials.find((m) => m.id === materialId);

  return (
    <div
      className={cn(
        "group relative rounded-xl border-2 p-4",
        "bg-gradient-to-br from-card to-card/80",
        "transition-all duration-200",
        materialId
          ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
          : "border-border/50 hover:border-border"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon with material color preview */}
        <div
          className={cn(
            "relative flex-shrink-0 w-12 h-12 rounded-lg",
            "flex items-center justify-center",
            "bg-gradient-to-br from-amber-100 to-orange-100",
            "dark:from-amber-900/40 dark:to-orange-900/30",
            "shadow-sm overflow-hidden"
          )}
        >
          {selectedMaterial?.color ? (
            <div className="absolute inset-0" style={{ backgroundColor: selectedMaterial.color }} />
          ) : null}
          <Icon
            className={cn(
              "relative z-10 h-5 w-5",
              selectedMaterial?.color
                ? "text-white drop-shadow-md"
                : "text-amber-700 dark:text-amber-400"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          {/* Material select */}
          <SelectField
            label=""
            value={materialId}
            onChange={onChange}
            options={materials.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.thickness}mm)`,
            }))}
            placeholder="Wybierz materiał..."
            className="[&>div:first-child]:hidden"
          />

          {/* Selected material info */}
          {selectedMaterial && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {selectedMaterial.color && (
                <span
                  className="w-3 h-3 rounded-full border border-border/50 shadow-sm"
                  style={{ backgroundColor: selectedMaterial.color }}
                />
              )}
              <span className="font-medium text-foreground">{selectedMaterial.name}</span>
              <span>•</span>
              <span>{selectedMaterial.thickness}mm</span>
              {selectedMaterial.category && (
                <>
                  <span>•</span>
                  <span className="capitalize">{selectedMaterial.category}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MaterialsSection({
  materials,
  onChange,
  availableMaterials,
  cabinetType,
  hasBack,
  hasCountertop,
  countertopMaterialId,
  onCountertopMaterialChange,
}: MaterialsSectionProps) {
  // Filter materials by category
  const boardMaterials = availableMaterials.filter(
    (m) => m.category !== "hdf" && m.category !== "countertop"
  );
  const hdfMaterials = availableMaterials.filter((m) => m.category === "hdf");
  const countertopMaterials = availableMaterials.filter((m) => m.category === "countertop");

  // Use board materials as fallback for HDF if none available
  const backMaterialOptions = hdfMaterials.length > 0 ? hdfMaterials : availableMaterials;

  const showCountertop =
    hasCountertop &&
    countertopMaterials.length > 0 &&
    (cabinetType === "KITCHEN" ||
      cabinetType === "CORNER_INTERNAL" ||
      cabinetType === "CORNER_EXTERNAL");

  return (
    <FormSection
      icon={Palette}
      title="Materiały"
      description="Wybierz materiały dla poszczególnych elementów szafki"
    >
      <div className="space-y-4">
        {/* Body Material */}
        <MaterialCard
          icon={Layers}
          title="Korpus"
          description="Boki, wieńce górny i dolny, półki wewnętrzne"
          materialId={materials.bodyMaterialId}
          materials={boardMaterials}
          onChange={(id) => onChange({ ...materials, bodyMaterialId: id })}
        />

        {/* Front Material */}
        <MaterialCard
          icon={Palette}
          title="Fronty"
          description="Drzwi, fronty szuflad, panele ozdobne"
          materialId={materials.frontMaterialId}
          materials={boardMaterials}
          onChange={(id) => onChange({ ...materials, frontMaterialId: id })}
        />

        {/* Back Material - only when hasBack is true */}
        {hasBack && (
          <MaterialCard
            icon={PanelBottom}
            title="Plecy (HDF)"
            description="Tylna ściana szafki, standardowo 3mm HDF"
            materialId={materials.backMaterialId}
            materials={backMaterialOptions}
            onChange={(id) => onChange({ ...materials, backMaterialId: id })}
          />
        )}

        {/* Countertop Material - only for kitchen cabinets with countertop */}
        {showCountertop && onCountertopMaterialChange && (
          <MaterialCard
            icon={ChefHat}
            title="Blat kuchenny"
            description="Blat roboczy montowany na szafce"
            materialId={countertopMaterialId}
            materials={countertopMaterials}
            onChange={onCountertopMaterialChange}
          />
        )}
      </div>
    </FormSection>
  );
}
