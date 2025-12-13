'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
} from '@meble/ui';
import {
  CabinetInteriorConfig,
  CabinetSection,
  SectionContentType,
  Material,
} from '@/types';
import { INTERIOR_CONFIG, DEFAULT_BODY_THICKNESS } from '@/lib/config';
import { Section, Interior, Drawer } from '@/lib/domain';
import { Plus, AlertTriangle } from 'lucide-react';
import { InteriorPreview } from './InteriorPreview';
import { SectionEditor } from './SectionEditor';

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
    const threshold = 10; // Small threshold to account for rounding

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial check
    checkScroll();

    // Check on scroll
    el.addEventListener('scroll', checkScroll, { passive: true });

    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  // Also recheck when children change
  useEffect(() => {
    checkScroll();
  }, [children, checkScroll]);

  return (
    <div className={cn('relative', className)}>
      {/* Top fade indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10 transition-opacity duration-200',
          canScrollUp ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
      >
        {children}
      </div>

      {/* Bottom fade indicator */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 transition-opacity duration-200',
          canScrollDown ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

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
  /** Last used material for shelves (from preferences, defaults to body material) */
  lastUsedShelfMaterial: string;
  /** Last used material for drawer box (from preferences, defaults to body material) */
  lastUsedDrawerBoxMaterial: string;
  /** Last used material for drawer bottom (from preferences, defaults to HDF) */
  lastUsedDrawerBottomMaterial: string;
  /** Callback when shelf material is changed (to save preference) */
  onShelfMaterialChange?: (materialId: string) => void;
  /** Callback when drawer box material is changed (to save preference) */
  onDrawerBoxMaterialChange?: (materialId: string) => void;
  /** Callback when drawer bottom material is changed (to save preference) */
  onDrawerBottomMaterialChange?: (materialId: string) => void;
}

type ConflictType = 'drawer-fronts-with-doors' | null;

/**
 * Create a default section with specified content type using domain module
 */
function createDefaultSection(contentType: SectionContentType): CabinetSection {
  return Section.create(contentType);
}

/**
 * Create default interior config with one section using domain module
 */
function createDefaultConfig(): CabinetInteriorConfig {
  return Interior.createWithShelves(2, 'FULL');
}

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
  const [localConfig, setLocalConfig] = useState<CabinetInteriorConfig>(() => {
    if (config && config.sections.length > 0) {
      return config;
    }
    return createDefaultConfig();
  });

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    localConfig.sections[0]?.id ?? null
  );

  // Conflict resolution state
  const [conflictType, setConflictType] = useState<ConflictType>(null);

  // Check for potential conflicts (calculated early for use in handlers)
  const hasDrawersWithFronts = useMemo(() =>
    localConfig.sections.some(
      (s) => s.contentType === 'DRAWERS' && s.drawerConfig?.zones.some((z) => z.front !== null)
    ),
    [localConfig.sections]
  );

  // Reset local config when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        if (config && config.sections.length > 0) {
          setLocalConfig(config);
          setSelectedSectionId(config.sections[0]?.id ?? null);
        } else {
          const defaultConfig = createDefaultConfig();
          setLocalConfig(defaultConfig);
          setSelectedSectionId(defaultConfig.sections[0]?.id ?? null);
        }
      }
      onOpenChange(isOpen);
    },
    [config, onOpenChange]
  );

  const selectedSection = useMemo(
    () => localConfig.sections.find((s) => s.id === selectedSectionId),
    [localConfig.sections, selectedSectionId]
  );

  const handleAddSection = () => {
    const newSection = createDefaultSection('EMPTY');
    setLocalConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setSelectedSectionId(newSection.id);
  };

  const handleDeleteSection = (sectionId: string) => {
    setLocalConfig((prev) => {
      const newSections = prev.sections.filter((s) => s.id !== sectionId);
      if (selectedSectionId === sectionId && newSections.length > 0) {
        setSelectedSectionId(newSections[0].id);
      }
      return { ...prev, sections: newSections };
    });
  };

  const handleUpdateSection = (updatedSection: CabinetSection) => {
    // Check if this update introduces drawer fronts while doors exist
    const willHaveFronts = updatedSection.contentType === 'DRAWERS' &&
      updatedSection.drawerConfig?.zones.some((z) => z.front !== null);

    // Check if other sections already have fronts
    const otherSectionsHaveFronts = localConfig.sections
      .filter((s) => s.id !== updatedSection.id)
      .some((s) => s.contentType === 'DRAWERS' && s.drawerConfig?.zones.some((z) => z.front !== null));

    const totalWillHaveFronts = willHaveFronts || otherSectionsHaveFronts;

    // Show conflict dialog if adding fronts while doors exist
    if (hasDoors && willHaveFronts && !hasDrawersWithFronts) {
      setConflictType('drawer-fronts-with-doors');
    }

    setLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === updatedSection.id ? updatedSection : s
      ),
    }));
  };

  // Conflict resolution handlers
  const handleConflictResolve = (action: 'convert-drawers' | 'remove-doors' | 'cancel') => {
    if (action === 'convert-drawers') {
      // Convert all drawer zones to internal (remove fronts) using domain module
      setLocalConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.contentType !== 'DRAWERS' || !section.drawerConfig) {
            return section;
          }
          return {
            ...section,
            drawerConfig: Drawer.convertToInternal(section.drawerConfig),
          };
        }),
      }));
    } else if (action === 'remove-doors') {
      // Call parent callback to remove doors
      onRemoveDoors?.();
    }
    // 'cancel' - just close the dialog, keep the config as-is
    setConflictType(null);
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    setLocalConfig((prev) => {
      const sections = [...prev.sections];
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;

      // 'up' = higher in cabinet = higher index (since first section is at bottom)
      // 'down' = lower in cabinet = lower index
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= sections.length) return prev;

      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      return { ...prev, sections };
    });
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  // Calculate section heights for display using domain module
  const totalRatio = localConfig.sections.reduce((sum, s) => sum + s.heightRatio, 0);
  const bodyThickness = DEFAULT_BODY_THICKNESS;
  const interiorHeight = Section.calculateInteriorHeight(cabinetHeight, bodyThickness);

  // Check for additional conflicts
  const hasShelves = localConfig.sections.some((s) => s.contentType === 'SHELVES');
  const showDoorsDrawerWarning = hasDoors && hasDrawersWithFronts;
  const showShelvesNeedCover = hasDoors && hasShelves && hasDrawersWithFronts;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none flex flex-col p-0 m-0">
        <DialogHeader className="flex-shrink-0 px-4 py-3 border-b">
          <DialogTitle>Konfiguracja wnętrza szafki</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Preview - with scroll indicator */}
          <ScrollContainer className="w-full md:w-5/12 flex-shrink-0 md:border-r border-b md:border-b-0 max-h-[40vh] md:max-h-none">
            <div className="px-4 py-4 flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Podgląd układu</Label>
                <InteriorPreview
                  sections={localConfig.sections}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                  onMoveSection={handleMoveSection}
                  cabinetHeight={cabinetHeight}
                  cabinetWidth={cabinetWidth}
                  cabinetDepth={cabinetDepth}
                />
              </div>

              {/* Add section button */}
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={handleAddSection}
                disabled={localConfig.sections.length >= INTERIOR_CONFIG.MAX_SECTIONS}
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

              {/* Warnings with action buttons */}
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
                      onClick={() => handleConflictResolve('convert-drawers')}
                    >
                      <div>
                        <div className="text-xs font-medium">Konwertuj na szuflady wewnętrzne</div>
                        <div className="text-[10px] text-muted-foreground">Usuń fronty szuflad, zachowaj drzwi</div>
                      </div>
                    </Button>
                    {onRemoveDoors && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-auto py-2 text-left"
                        onClick={() => handleConflictResolve('remove-doors')}
                      >
                        <div>
                          <div className="text-xs font-medium">Usuń drzwi</div>
                          <div className="text-[10px] text-muted-foreground">Zachowaj fronty szuflad</div>
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

          {/* Right Column: Section Editor - with scroll indicator */}
          <ScrollContainer className="flex-1">
            <div className="px-4 py-4 flex flex-col gap-4">
              {selectedSection ? (
                <SectionEditor
                  section={selectedSection}
                  onUpdate={handleUpdateSection}
                  onDelete={() => handleDeleteSection(selectedSection.id)}
                  canDelete={localConfig.sections.length > 1}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Anuluj
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">Zastosuj zmiany</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Conflict Resolution Popup Dialog */}
    <Dialog open={conflictType !== null} onOpenChange={(open) => !open && handleConflictResolve('cancel')}>
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
            onClick={() => handleConflictResolve('convert-drawers')}
          >
            <div className="text-left">
              <div className="font-medium">Konwertuj szuflady na wewnętrzne</div>
              <div className="text-xs text-muted-foreground">Usuń fronty szuflad, zachowaj boxy</div>
            </div>
          </Button>
          {onRemoveDoors && (
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
    </>
  );
}

export { InteriorConfigDialog as default };
