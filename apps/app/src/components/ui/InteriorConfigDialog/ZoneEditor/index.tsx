"use client";

/**
 * Zone Editor Component (Refactored)
 *
 * Full-featured editor for a single interior zone.
 * Supports EMPTY, SHELVES, DRAWERS, NESTED content types.
 *
 * This is a refactored version split into smaller components:
 * - ZoneTypeSelector - Content type selection
 * - HeightConfig / WidthConfig - Size configuration
 * - ShelvesEditor - Shelf configuration
 * - DrawersEditor - Drawer configuration
 * - NestedEditor - Nested zone configuration
 */

import { useMemo } from "react";
import { Button, cn } from "@meble/ui";
import type { InteriorZone, ZoneContentType, Material } from "@/types";
import { DEFAULT_SHELVES_CONFIG, generateZoneId } from "@/types";
import { INTERIOR_CONFIG, DEFAULT_BODY_THICKNESS, DRAWER_SLIDE_PRESETS } from "@/lib/config";
import { Trash2 } from "lucide-react";

// Import sub-components
import { ZoneTypeSelector, ZONE_TYPE_COLORS } from "./ZoneTypeSelector";
import { HeightConfig, WidthConfig } from "./HeightWidthConfig";
import { ShelvesEditor } from "./ShelvesEditor";
import { DrawersEditor } from "./DrawersEditor";
import { NestedEditor } from "./NestedEditor";

// ============================================================================
// Props
// ============================================================================

interface ZoneEditorProps {
  /** The zone to edit */
  zone: InteriorZone;
  /** Callback when zone is updated */
  onUpdate: (zone: InteriorZone) => void;
  /** Callback to delete this zone */
  onDelete: () => void;
  /** Whether this zone can be deleted */
  canDelete: boolean;
  /** Cabinet height in mm */
  cabinetHeight: number;
  /** Cabinet width in mm */
  cabinetWidth: number;
  /** Cabinet depth in mm */
  cabinetDepth: number;
  /** Total height ratio of all sibling zones */
  totalRatio: number;
  /** Available interior height in mm */
  interiorHeight: number;
  /** Available materials for selection */
  materials: Material[];
  /** Default body material ID from cabinet */
  bodyMaterialId: string;
  /** Last used material for shelves */
  lastUsedShelfMaterial: string;
  /** Last used material for drawer box */
  lastUsedDrawerBoxMaterial: string;
  /** Last used material for drawer bottom */
  lastUsedDrawerBottomMaterial: string;
  /** Callback when shelf material is changed */
  onShelfMaterialChange?: (materialId: string) => void;
  /** Callback when drawer box material is changed */
  onDrawerBoxMaterialChange?: (materialId: string) => void;
  /** Callback when drawer bottom material is changed */
  onDrawerBottomMaterialChange?: (materialId: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function ZoneEditor({
  zone,
  onUpdate,
  onDelete,
  canDelete,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
  totalRatio,
  interiorHeight,
  materials,
  bodyMaterialId,
  lastUsedShelfMaterial,
  lastUsedDrawerBoxMaterial,
  lastUsedDrawerBottomMaterial,
  onShelfMaterialChange,
  onDrawerBoxMaterialChange,
  onDrawerBottomMaterialChange,
}: ZoneEditorProps) {
  // ============================================================================
  // Calculated Values
  // ============================================================================

  // Get the zone's height ratio (from heightConfig)
  const zoneHeightRatio = zone.heightConfig.mode === "RATIO" ? (zone.heightConfig.ratio ?? 1) : 1;

  // Calculate zone height in mm
  const zoneHeightMm = useMemo(() => {
    if (zone.heightConfig.mode === "EXACT" && zone.heightConfig.exactMm) {
      return zone.heightConfig.exactMm;
    }
    return Math.round((zoneHeightRatio / totalRatio) * interiorHeight);
  }, [zone.heightConfig, zoneHeightRatio, totalRatio, interiorHeight]);

  // Calculate drawer box width (if applicable)
  const drawerBoxWidth = useMemo(() => {
    if (!zone.drawerConfig) return 0;
    const slideConfig = DRAWER_SLIDE_PRESETS[zone.drawerConfig.slideType];
    return cabinetWidth - 2 * slideConfig.sideOffset - 2 * DEFAULT_BODY_THICKNESS;
  }, [zone.drawerConfig, cabinetWidth]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleContentTypeChange = (contentType: ZoneContentType) => {
    const updatedZone: InteriorZone = {
      ...zone,
      contentType,
      shelvesConfig: undefined,
      drawerConfig: undefined,
      children: undefined,
      divisionDirection: undefined,
    };

    if (contentType === "SHELVES") {
      // Apply last used shelf material if different from body material
      const shelfMaterial =
        lastUsedShelfMaterial && lastUsedShelfMaterial !== bodyMaterialId
          ? lastUsedShelfMaterial
          : undefined;
      updatedZone.shelvesConfig = {
        ...DEFAULT_SHELVES_CONFIG,
        materialId: shelfMaterial,
      };
    } else if (contentType === "DRAWERS") {
      const defaultZones = [
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ];
      // Apply last used drawer materials
      const boxMaterial =
        lastUsedDrawerBoxMaterial && lastUsedDrawerBoxMaterial !== bodyMaterialId
          ? lastUsedDrawerBoxMaterial
          : undefined;
      updatedZone.drawerConfig = {
        slideType: "SIDE_MOUNT",
        zones: defaultZones,
        boxMaterialId: boxMaterial,
        bottomMaterialId: lastUsedDrawerBottomMaterial ?? undefined,
      };
    } else if (contentType === "NESTED") {
      // Create initial nested structure with 2 children
      updatedZone.divisionDirection = "HORIZONTAL";
      updatedZone.children = [
        {
          id: crypto.randomUUID(),
          contentType: "EMPTY",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: zone.depth + 1,
        },
        {
          id: crypto.randomUUID(),
          contentType: "EMPTY",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: zone.depth + 1,
        },
      ];
    }

    onUpdate(updatedZone);
  };

  const handleHeightConfigChange = (heightConfig: InteriorZone["heightConfig"]) => {
    onUpdate({ ...zone, heightConfig });
  };

  const handleWidthConfigChange = (widthConfig: InteriorZone["widthConfig"]) => {
    onUpdate({ ...zone, widthConfig });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={cn(
        "border rounded-lg p-5 space-y-5 bg-card shadow-sm border-l-4",
        ZONE_TYPE_COLORS[zone.contentType]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h4 className="font-semibold text-sm">Edycja sekcji</h4>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Height configuration - show if there are multiple sibling zones and this zone doesn't have widthConfig */}
      {!zone.widthConfig && (
        <HeightConfig
          heightConfig={zone.heightConfig}
          onChange={handleHeightConfigChange}
          totalRatio={totalRatio}
          interiorHeight={interiorHeight}
          zoneHeightMm={zoneHeightMm}
        />
      )}

      {/* Width configuration - show if this zone has widthConfig (VERTICAL parent) */}
      {zone.widthConfig && (
        <WidthConfig
          widthConfig={zone.widthConfig}
          onChange={handleWidthConfigChange}
          cabinetWidth={cabinetWidth}
        />
      )}

      {/* Content type selector */}
      <ZoneTypeSelector
        value={zone.contentType}
        onChange={handleContentTypeChange}
        depth={zone.depth}
      />

      {/* Shelves configuration */}
      {zone.contentType === "SHELVES" && zone.shelvesConfig && (
        <ShelvesEditor
          config={zone.shelvesConfig}
          onChange={(shelvesConfig) => onUpdate({ ...zone, shelvesConfig })}
          cabinetDepth={cabinetDepth}
          materials={materials}
          bodyMaterialId={bodyMaterialId}
          onMaterialChange={onShelfMaterialChange}
        />
      )}

      {/* Drawers configuration */}
      {zone.contentType === "DRAWERS" && zone.drawerConfig && (
        <DrawersEditor
          config={zone.drawerConfig}
          onChange={(drawerConfig) => onUpdate({ ...zone, drawerConfig })}
          zoneHeightMm={zoneHeightMm}
          cabinetWidth={cabinetWidth}
          materials={materials}
          bodyMaterialId={bodyMaterialId}
          onBoxMaterialChange={onDrawerBoxMaterialChange}
          onBottomMaterialChange={onDrawerBottomMaterialChange}
        />
      )}

      {/* NESTED zone configuration */}
      {zone.contentType === "NESTED" && (
        <NestedEditor
          zone={zone}
          onChange={onUpdate}
          cabinetWidth={cabinetWidth}
          cabinetDepth={cabinetDepth}
        />
      )}

      {/* Empty zone info */}
      {zone.contentType === "EMPTY" && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center py-4">
            Pusta sekcja - brak zawartości do konfiguracji.
            <br />
            Wybierz półki, szuflady lub podział powyżej.
          </p>
        </div>
      )}
    </div>
  );
}

export default ZoneEditor;

// Re-export sub-components for external use
export { ZoneTypeSelector, ZONE_TYPE_COLORS } from "./ZoneTypeSelector";
export { HeightConfig, WidthConfig } from "./HeightWidthConfig";
export { ShelvesEditor } from "./ShelvesEditor";
export { DrawersEditor } from "./DrawersEditor";
export { NestedEditor } from "./NestedEditor";
