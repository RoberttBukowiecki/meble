"use client";

/**
 * Interior Configuration Dialog (Zone-based)
 *
 * Full-screen dialog for interior configuration, adapted from the original
 * SectionEditor-based dialog. Uses recursive zone tree with horizontal root
 * division acting like the old "sections" array.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  cn,
} from "@meble/ui";
import type { CabinetInteriorConfig, InteriorZone, Material } from "@/types";
import { DEFAULT_SHELVES_CONFIG } from "@/types";
import { Zone } from "@/lib/domain";
import { INTERIOR_CONFIG, DEFAULT_BODY_THICKNESS } from "@/lib/config";
import { generateZoneId } from "@/types";
import { Plus, AlertTriangle } from "lucide-react";
import { InteriorPreview } from "./InteriorPreview";
import { ZoneEditor } from "./ZoneEditor";
import { ZoneCard } from "./ZoneCard";
import { ZoneBreadcrumb } from "./ZoneBreadcrumb";
import { ZoneMinimap } from "./ZoneMinimap";

// ============================================================================
// Scroll Container with Fade Indicator
// ============================================================================

interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
}

function ScrollContainer({ children, className }: ScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 10;

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  useEffect(() => {
    checkScroll();
  }, [children, checkScroll]);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10 transition-opacity duration-200",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
      />

      <div ref={containerRef} className="h-full overflow-y-auto">
        {children}
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 transition-opacity duration-200",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

// ============================================================================
// Types and Props
// ============================================================================

interface InteriorConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CabinetInteriorConfig | undefined;
  onConfigChange: (config: CabinetInteriorConfig) => void;
  cabinetHeight: number;
  cabinetWidth: number;
  cabinetDepth: number;
  /** Whether the cabinet has doors configured */
  hasDoors?: boolean;
  /** Callback to remove doors when resolving conflict */
  onRemoveDoors?: () => void;
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

type ConflictType = "drawer-fronts-with-doors" | null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a child zone with specified content type
 */
function createChildZone(
  contentType: "EMPTY" | "SHELVES" | "DRAWERS",
  depth: number
): InteriorZone {
  const zone: InteriorZone = {
    id: crypto.randomUUID(),
    contentType,
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth,
  };

  if (contentType === "SHELVES") {
    zone.shelvesConfig = { ...DEFAULT_SHELVES_CONFIG };
  } else if (contentType === "DRAWERS") {
    zone.drawerConfig = {
      slideType: "SIDE_MOUNT",
      zones: [
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: generateZoneId(), heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    };
  }

  return zone;
}

/**
 * Create default config with NESTED root that has HORIZONTAL children (like old sections)
 */
function createDefaultConfig(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: crypto.randomUUID(),
      contentType: "NESTED",
      divisionDirection: "HORIZONTAL",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: 0,
      children: [createChildZone("SHELVES", 1)],
    },
  };
}

/**
 * Ensure config has proper structure (NESTED root with HORIZONTAL children)
 */
function normalizeConfig(config: CabinetInteriorConfig | undefined): CabinetInteriorConfig {
  if (!config?.rootZone) {
    return createDefaultConfig();
  }

  // If rootZone is already NESTED with HORIZONTAL, use as-is
  if (
    config.rootZone.contentType === "NESTED" &&
    config.rootZone.divisionDirection === "HORIZONTAL"
  ) {
    // Ensure there's at least one child
    if (!config.rootZone.children || config.rootZone.children.length === 0) {
      return {
        rootZone: {
          ...config.rootZone,
          children: [createChildZone("SHELVES", 1)],
        },
      };
    }
    return config;
  }

  // If rootZone is a simple zone (not NESTED), wrap it in a HORIZONTAL parent
  return {
    rootZone: {
      id: crypto.randomUUID(),
      contentType: "NESTED",
      divisionDirection: "HORIZONTAL",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: 0,
      children: [{ ...config.rootZone, depth: 1 }],
    },
  };
}

/**
 * Check if any zone in tree has drawer fronts
 */
function hasDrawerFronts(zone: InteriorZone): boolean {
  if (zone.contentType === "DRAWERS" && zone.drawerConfig) {
    if (zone.drawerConfig.zones.some((z) => z.front !== null)) {
      return true;
    }
  }
  if (zone.contentType === "NESTED" && zone.children) {
    return zone.children.some(hasDrawerFronts);
  }
  return false;
}

/**
 * Remove all drawer fronts from zone tree
 */
function removeDrawerFronts(zone: InteriorZone): InteriorZone {
  if (zone.contentType === "DRAWERS" && zone.drawerConfig) {
    return {
      ...zone,
      drawerConfig: {
        ...zone.drawerConfig,
        zones: zone.drawerConfig.zones.map((z) => ({ ...z, front: null })),
      },
    };
  }
  if (zone.contentType === "NESTED" && zone.children) {
    return {
      ...zone,
      children: zone.children.map(removeDrawerFronts),
    };
  }
  return zone;
}

/**
 * Find a zone by ID recursively in the tree
 */
function findZoneById(zone: InteriorZone, id: string): InteriorZone | null {
  if (zone.id === id) return zone;
  if (zone.children) {
    for (const child of zone.children) {
      const found = findZoneById(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the path from root to a zone (list of zone IDs)
 */
function findZonePath(zone: InteriorZone, targetId: string, path: string[] = []): string[] | null {
  const currentPath = [...path, zone.id];
  if (zone.id === targetId) return currentPath;
  if (zone.children) {
    for (const child of zone.children) {
      const found = findZonePath(child, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Update a zone by ID recursively in the tree
 */
function updateZoneById(
  zone: InteriorZone,
  id: string,
  updater: (z: InteriorZone) => InteriorZone
): InteriorZone {
  if (zone.id === id) {
    return updater(zone);
  }
  if (zone.children) {
    return {
      ...zone,
      children: zone.children.map((child) => updateZoneById(child, id, updater)),
    };
  }
  return zone;
}

/**
 * Delete a zone by ID from the tree
 */
function deleteZoneById(zone: InteriorZone, id: string): InteriorZone {
  if (zone.children) {
    const newChildren = zone.children.filter((child) => child.id !== id);
    // If a child was removed, update partitions count for VERTICAL divisions
    let newPartitions = zone.partitions;
    if (
      newChildren.length !== zone.children.length &&
      zone.divisionDirection === "VERTICAL" &&
      zone.partitions
    ) {
      // Keep n-1 partitions for n children
      newPartitions = zone.partitions.slice(0, Math.max(0, newChildren.length - 1));
    }
    return {
      ...zone,
      children: newChildren.map((child) => deleteZoneById(child, id)),
      partitions: newPartitions,
    };
  }
  return zone;
}

/**
 * Get all zones in a flat list (for debugging or iteration)
 */
function getAllZones(zone: InteriorZone): InteriorZone[] {
  const result: InteriorZone[] = [zone];
  if (zone.children) {
    for (const child of zone.children) {
      result.push(...getAllZones(child));
    }
  }
  return result;
}

// ============================================================================
// Main Component
// ============================================================================

export function InteriorConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  cabinetHeight,
  cabinetWidth,
  cabinetDepth,
  hasDoors = false,
  onRemoveDoors,
  materials,
  bodyMaterialId,
  lastUsedShelfMaterial,
  lastUsedDrawerBoxMaterial,
  lastUsedDrawerBottomMaterial,
  onShelfMaterialChange,
  onDrawerBoxMaterialChange,
  onDrawerBottomMaterialChange,
}: InteriorConfigDialogProps) {
  // Internal state for editing
  const [localConfig, setLocalConfig] = useState<CabinetInteriorConfig>(() =>
    normalizeConfig(config)
  );

  // Get the top-level children zones (for preview display) - memoized to maintain stable reference
  const zones = useMemo(() => localConfig.rootZone.children ?? [], [localConfig.rootZone.children]);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(zones[0]?.id ?? null);

  // Conflict resolution state
  const [conflictType, setConflictType] = useState<ConflictType>(null);

  // Check for drawer fronts in config
  const configHasDrawerFronts = useMemo(
    () => hasDrawerFronts(localConfig.rootZone),
    [localConfig.rootZone]
  );

  // Reset local config when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const normalized = normalizeConfig(config);
        setLocalConfig(normalized);
        const firstZone = normalized.rootZone.children?.[0];
        setSelectedZoneId(firstZone?.id ?? null);
      }
      onOpenChange(isOpen);
    },
    [config, onOpenChange]
  );

  // Find selected zone anywhere in the tree (supports nested navigation)
  const selectedZone = useMemo(
    () => (selectedZoneId ? findZoneById(localConfig.rootZone, selectedZoneId) : null),
    [localConfig.rootZone, selectedZoneId]
  );

  // Get path to selected zone for breadcrumb navigation
  const selectedZonePath = useMemo(
    () => (selectedZoneId ? findZonePath(localConfig.rootZone, selectedZoneId) : null),
    [localConfig.rootZone, selectedZoneId]
  );

  // Get the parent zone of the selected zone (for navigation back)
  const selectedZoneParent = useMemo(() => {
    if (!selectedZonePath || selectedZonePath.length <= 2) return null; // rootZone -> zone means no parent to go back to
    const parentId = selectedZonePath[selectedZonePath.length - 2];
    return findZoneById(localConfig.rootZone, parentId);
  }, [localConfig.rootZone, selectedZonePath]);

  // Check if selected zone is a nested child (not top-level)
  const isNestedSelection = selectedZonePath && selectedZonePath.length > 2;

  const handleAddZone = () => {
    const newZone = createChildZone("EMPTY", 1);
    setLocalConfig((prev) => ({
      rootZone: {
        ...prev.rootZone,
        children: [...(prev.rootZone.children ?? []), newZone],
      },
    }));
    setSelectedZoneId(newZone.id);
  };

  const handleAddZoneAtIndex = (atIndex: number) => {
    const newZone = createChildZone("EMPTY", 1);
    setLocalConfig((prev) => {
      const children = [...(prev.rootZone.children ?? [])];
      children.splice(atIndex, 0, newZone);
      return {
        rootZone: {
          ...prev.rootZone,
          children,
        },
      };
    });
    setSelectedZoneId(newZone.id);
  };

  const handleDeleteZone = (zoneId: string) => {
    setLocalConfig((prev) => {
      const newRootZone = deleteZoneById(prev.rootZone, zoneId);

      // If we deleted the selected zone, select the first top-level zone
      if (selectedZoneId === zoneId) {
        const firstZone = newRootZone.children?.[0];
        setTimeout(() => setSelectedZoneId(firstZone?.id ?? null), 0);
      }

      return { rootZone: newRootZone };
    });
  };

  // Navigate into a nested zone's children
  const handleEnterNestedZone = (zone: InteriorZone) => {
    if (zone.contentType === "NESTED" && zone.children && zone.children.length > 0) {
      setSelectedZoneId(zone.children[0].id);
    }
  };

  // Navigate back to parent zone
  const handleNavigateBack = () => {
    if (selectedZoneParent) {
      setSelectedZoneId(selectedZoneParent.id);
    }
  };

  const handleUpdateZone = (updatedZone: InteriorZone) => {
    // Check if this update introduces drawer fronts while doors exist
    const willHaveFronts = hasDrawerFronts(updatedZone);

    // Show conflict dialog if adding fronts while doors exist
    if (hasDoors && willHaveFronts && !configHasDrawerFronts) {
      setConflictType("drawer-fronts-with-doors");
    }

    // Use recursive update to handle zones at any depth
    setLocalConfig((prev) => ({
      rootZone: updateZoneById(prev.rootZone, updatedZone.id, () => updatedZone),
    }));
  };

  // Conflict resolution handlers
  const handleConflictResolve = (action: "convert-drawers" | "remove-doors" | "cancel") => {
    if (action === "convert-drawers") {
      setLocalConfig((prev) => ({
        rootZone: removeDrawerFronts(prev.rootZone),
      }));
    } else if (action === "remove-doors") {
      onRemoveDoors?.();
    }
    setConflictType(null);
  };

  const handleMoveZone = (zoneId: string, direction: "up" | "down") => {
    setLocalConfig((prev) => {
      const children = [...(prev.rootZone.children ?? [])];
      const index = children.findIndex((z) => z.id === zoneId);
      if (index === -1) return prev;

      // 'up' = higher in cabinet = higher index (since first zone is at bottom)
      const newIndex = direction === "up" ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= children.length) return prev;

      [children[index], children[newIndex]] = [children[newIndex], children[index]];
      return {
        rootZone: { ...prev.rootZone, children },
      };
    });
  };

  // Move child within a nested zone
  const handleMoveNestedChild = (
    parentId: string,
    childId: string,
    direction: "up" | "down" | "left" | "right"
  ) => {
    setLocalConfig((prev) => {
      const parent = findZoneById(prev.rootZone, parentId);
      if (!parent?.children) return prev;

      const children = [...parent.children];
      const index = children.findIndex((z) => z.id === childId);
      if (index === -1) return prev;

      // For HORIZONTAL: up/down, for VERTICAL: left/right
      const delta = direction === "up" || direction === "right" ? 1 : -1;
      const newIndex = index + delta;
      if (newIndex < 0 || newIndex >= children.length) return prev;

      [children[index], children[newIndex]] = [children[newIndex], children[index]];

      return {
        rootZone: updateZoneById(prev.rootZone, parentId, (z) => ({ ...z, children })),
      };
    });
  };

  // Handle zone resize (change height ratio)
  const handleResizeZone = useCallback((zoneId: string, newRatio: number) => {
    setLocalConfig((prev) => ({
      rootZone: updateZoneById(prev.rootZone, zoneId, (zone) => ({
        ...zone,
        heightConfig: {
          ...zone.heightConfig,
          mode: "RATIO" as const,
          ratio: newRatio,
        },
      })),
    }));
  }, []);

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  // Calculate dimensions for the cabinet interior
  const bodyThickness = DEFAULT_BODY_THICKNESS;
  const fullInteriorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
  const fullInteriorWidth = Math.max(cabinetWidth - bodyThickness * 2, 0);

  // Calculate totalRatio and interiorHeight based on selected zone's context
  // This ensures nested zones show correct dimensions in the editor
  const { totalRatio, interiorHeight } = useMemo(() => {
    if (!selectedZone || !selectedZonePath || selectedZonePath.length <= 1) {
      // Top-level zones: use full interior height
      const ratio = zones.reduce((sum, z) => {
        const r = z.heightConfig.mode === "RATIO" ? (z.heightConfig.ratio ?? 1) : 1;
        return sum + r;
      }, 0);
      return { totalRatio: ratio, interiorHeight: fullInteriorHeight };
    }

    // For nested zones, calculate the height allocated to the parent chain
    let currentHeight = fullInteriorHeight;
    let currentWidth = fullInteriorWidth;

    // Walk down the path from root to parent of selected zone
    for (let i = 1; i < selectedZonePath.length - 1; i++) {
      const parentId = selectedZonePath[i];
      const grandparentId = selectedZonePath[i - 1];
      const grandparent = findZoneById(localConfig.rootZone, grandparentId);

      if (!grandparent?.children) continue;

      const parent = grandparent.children.find((c) => c.id === parentId);
      if (!parent) continue;

      // Calculate this zone's allocated space based on grandparent's direction
      if (grandparent.divisionDirection === "HORIZONTAL") {
        // Horizontal division = heights are distributed
        const siblings = grandparent.children;
        const siblingTotalRatio = siblings.reduce((sum, s) => {
          if (s.heightConfig.mode === "EXACT" && s.heightConfig.exactMm) return sum;
          return sum + (s.heightConfig.ratio ?? 1);
        }, 0);
        const fixedTotal = siblings.reduce((sum, s) => {
          if (s.heightConfig.mode === "EXACT" && s.heightConfig.exactMm)
            return sum + s.heightConfig.exactMm;
          return sum;
        }, 0);
        const remainingHeight = currentHeight - fixedTotal;

        if (parent.heightConfig.mode === "EXACT" && parent.heightConfig.exactMm) {
          currentHeight = parent.heightConfig.exactMm;
        } else {
          const ratio = parent.heightConfig.ratio ?? 1;
          currentHeight = Math.round((ratio / siblingTotalRatio) * remainingHeight);
        }
      } else if (grandparent.divisionDirection === "VERTICAL") {
        // Vertical division = widths are distributed, height stays same
        // But we also need to track width for nested VERTICAL divisions
        const siblings = grandparent.children;
        const siblingTotalRatio = siblings.reduce((sum, s) => {
          if (s.widthConfig?.mode === "FIXED" && s.widthConfig.fixedMm) return sum;
          return sum + (s.widthConfig?.ratio ?? 1);
        }, 0);
        const fixedTotal = siblings.reduce((sum, s) => {
          if (s.widthConfig?.mode === "FIXED" && s.widthConfig.fixedMm)
            return sum + s.widthConfig.fixedMm;
          return sum;
        }, 0);
        const remainingWidth = currentWidth - fixedTotal;

        if (parent.widthConfig?.mode === "FIXED" && parent.widthConfig.fixedMm) {
          currentWidth = parent.widthConfig.fixedMm;
        } else {
          const ratio = parent.widthConfig?.ratio ?? 1;
          currentWidth = Math.round((ratio / siblingTotalRatio) * remainingWidth);
        }
      }
    }

    // Now calculate totalRatio for the selected zone's siblings
    const parentId = selectedZonePath[selectedZonePath.length - 2];
    const parent = findZoneById(localConfig.rootZone, parentId);

    if (!parent?.children) {
      return { totalRatio: 1, interiorHeight: currentHeight };
    }

    const siblingRatio = parent.children.reduce((sum, s) => {
      if (parent.divisionDirection === "HORIZONTAL") {
        return sum + (s.heightConfig.mode === "RATIO" ? (s.heightConfig.ratio ?? 1) : 1);
      }
      return sum + (s.widthConfig?.mode === "PROPORTIONAL" ? (s.widthConfig.ratio ?? 1) : 1);
    }, 0);

    return { totalRatio: siblingRatio, interiorHeight: currentHeight };
  }, [
    selectedZone,
    selectedZonePath,
    localConfig.rootZone,
    zones,
    fullInteriorHeight,
    fullInteriorWidth,
  ]);

  // Check for conflicts
  const hasShelves = zones.some((z) => z.contentType === "SHELVES");
  const showDoorsDrawerWarning = hasDoors && configHasDrawerFronts;
  const showShelvesNeedCover = hasDoors && hasShelves && configHasDrawerFronts;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none flex flex-col p-0 m-0">
          <DialogHeader className="flex-shrink-0 px-4 py-3 border-b">
            <DialogTitle>Konfiguracja wnętrza szafki</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Preview */}
            <ScrollContainer className="w-full md:w-5/12 flex-shrink-0 md:border-r border-b md:border-b-0 max-h-[40vh] md:max-h-none">
              <div className="px-4 py-4 flex flex-col gap-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Podgląd układu</Label>
                  <InteriorPreview
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={setSelectedZoneId}
                    onMoveZone={handleMoveZone}
                    onAddZone={handleAddZoneAtIndex}
                    onEnterZone={(zoneId) => {
                      const zone = findZoneById(localConfig.rootZone, zoneId);
                      if (zone) handleEnterNestedZone(zone);
                    }}
                    onResizeZone={handleResizeZone}
                    cabinetHeight={cabinetHeight}
                    cabinetWidth={cabinetWidth}
                    cabinetDepth={cabinetDepth}
                  />
                </div>

                {/* Minimap for deep navigation */}
                <ZoneMinimap
                  rootZone={localConfig.rootZone}
                  selectedZoneId={selectedZoneId}
                  selectedPath={selectedZonePath ?? []}
                  onSelectZone={setSelectedZoneId}
                />

                {/* Add zone button */}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={handleAddZone}
                  disabled={zones.length >= INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj sekcję
                </Button>

                {/* Dimensions summary */}
                <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span>Szerokość wewnętrzna:</span>
                    <span className="font-mono">{cabinetWidth - bodyThickness * 2} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wysokość wewnętrzna:</span>
                    <span className="font-mono">{interiorHeight} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Głębokość:</span>
                    <span className="font-mono">{cabinetDepth} mm</span>
                  </div>
                </div>

                {/* Warnings */}
                {showDoorsDrawerWarning && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 dark:text-amber-200">
                        <p className="font-medium">Konflikt: Drzwi + fronty szuflad</p>
                        <p className="mt-1 text-amber-700 dark:text-amber-300">
                          Szafka ma drzwi i szuflady z frontami. Wybierz jak rozwiązać konflikt:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-auto py-2 text-left"
                        onClick={() => handleConflictResolve("convert-drawers")}
                      >
                        <div>
                          <div className="text-xs font-medium">
                            Konwertuj na szuflady wewnętrzne
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Usuń fronty szuflad, zachowaj drzwi
                          </div>
                        </div>
                      </Button>
                      {onRemoveDoors && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-auto py-2 text-left"
                          onClick={() => handleConflictResolve("remove-doors")}
                        >
                          <div>
                            <div className="text-xs font-medium">Usuń drzwi</div>
                            <div className="text-[10px] text-muted-foreground">
                              Zachowaj fronty szuflad
                            </div>
                          </div>
                        </Button>
                      )}
                    </div>
                    {showShelvesNeedCover && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        Uwaga: Sekcje z półkami będą zakryte drzwiami.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollContainer>

            {/* Right Column: Zone Editor */}
            <ScrollContainer className="flex-1">
              <div className="px-4 py-4 flex flex-col gap-4">
                {/* Breadcrumb navigation - always show for context */}
                <div className="pb-3 border-b bg-muted/20 -mx-4 px-4 -mt-4 pt-4 rounded-t-lg">
                  <ZoneBreadcrumb
                    path={selectedZonePath ?? []}
                    rootZone={localConfig.rootZone}
                    onNavigate={setSelectedZoneId}
                    onNavigateHome={() => setSelectedZoneId(zones[0]?.id ?? null)}
                    isNested={isNestedSelection ?? false}
                  />
                </div>

                {/* Enter nested zone - show children as ZoneCards */}
                {selectedZone?.contentType === "NESTED" &&
                  selectedZone.children &&
                  selectedZone.children.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {selectedZone.divisionDirection === "VERTICAL" ? "Kolumny" : "Sekcje"} (
                          {selectedZone.children.length})
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Wybierz sekcję do edycji
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex gap-2",
                          selectedZone.divisionDirection === "VERTICAL"
                            ? "flex-row"
                            : "flex-col-reverse"
                        )}
                      >
                        {selectedZone.children.map((child, idx) => (
                          <ZoneCard
                            key={child.id}
                            zone={child}
                            index={idx}
                            siblingCount={selectedZone.children!.length}
                            isSelected={child.id === selectedZoneId}
                            onClick={() => setSelectedZoneId(child.id)}
                            onEnter={() => {
                              if (child.contentType === "NESTED" && child.children?.length) {
                                setSelectedZoneId(child.children[0].id);
                              }
                            }}
                            onMove={(direction) => {
                              const moveDir =
                                selectedZone.divisionDirection === "VERTICAL"
                                  ? direction === "up"
                                    ? "right"
                                    : "left"
                                  : direction;
                              handleMoveNestedChild(selectedZone.id, child.id, moveDir);
                            }}
                            onDelete={() => handleDeleteZone(child.id)}
                            canDelete={selectedZone.children!.length > 1}
                            parentDirection={selectedZone.divisionDirection}
                            compact={selectedZone.divisionDirection === "VERTICAL"}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                {/* Current zone indicator */}
                {selectedZone && (
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <Label className="text-sm font-medium">
                        {selectedZone.contentType === "NESTED"
                          ? selectedZone.divisionDirection === "VERTICAL"
                            ? "Podział na kolumny"
                            : "Podział na sekcje"
                          : selectedZone.contentType === "SHELVES"
                            ? "Sekcja z półkami"
                            : selectedZone.contentType === "DRAWERS"
                              ? "Sekcja z szufladami"
                              : "Pusta sekcja"}
                      </Label>
                      {isNestedSelection && selectedZonePath && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Głębokość: {selectedZone.depth} • ID: {selectedZone.id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedZone ? (
                  <ZoneEditor
                    zone={selectedZone}
                    onUpdate={handleUpdateZone}
                    onDelete={() => handleDeleteZone(selectedZone.id)}
                    canDelete={
                      selectedZoneParent
                        ? (selectedZoneParent.children?.length ?? 0) > 1
                        : zones.length > 1
                    }
                    cabinetHeight={cabinetHeight}
                    cabinetWidth={cabinetWidth}
                    cabinetDepth={cabinetDepth}
                    totalRatio={totalRatio}
                    interiorHeight={interiorHeight}
                    materials={materials}
                    bodyMaterialId={bodyMaterialId}
                    lastUsedShelfMaterial={lastUsedShelfMaterial}
                    lastUsedDrawerBoxMaterial={lastUsedDrawerBoxMaterial}
                    lastUsedDrawerBottomMaterial={lastUsedDrawerBottomMaterial}
                    onShelfMaterialChange={onShelfMaterialChange}
                    onDrawerBoxMaterialChange={onDrawerBoxMaterialChange}
                    onDrawerBottomMaterialChange={onDrawerBottomMaterialChange}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm flex items-center justify-center h-full">
                    Wybierz sekcję z podglądu, aby ją edytować
                  </div>
                )}
              </div>
            </ScrollContainer>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t bg-muted/20 px-4 py-3 flex flex-col-reverse sm:flex-row justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              Zastosuj zmiany
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Popup Dialog */}
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
              Szafka ma włączone drzwi. Nie można jednocześnie używać frontów szuflad.
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
            {onRemoveDoors && (
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
    </>
  );
}

export { InteriorConfigDialog as default };
