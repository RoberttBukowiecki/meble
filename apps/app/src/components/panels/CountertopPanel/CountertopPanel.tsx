'use client';

/**
 * CountertopPanel - Kitchen countertop configuration panel
 *
 * Features:
 * - List of countertop groups for current furniture
 * - Segment table with dimensions, edge banding, grain direction
 * - Corner treatment configuration (for L/U shapes)
 * - CNC operations management
 * - Material and thickness selection
 * - CSV export for production
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  useCountertopGroups,
  useSelectedCountertopGroup,
} from '@/lib/store';
import { Button, Badge, ScrollArea } from '@meble/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@meble/ui';
import {
  Download,
  Scan,
  Layers,
} from 'lucide-react';

import { GroupListItem } from './GroupListItem';
import { SegmentTable } from './SegmentTable';
import { CornerTreatmentSection } from './CornerTreatmentSection';
import { CncOperationsSection } from './CncOperationsSection';

export function CountertopPanel() {
  const groups = useCountertopGroups();
  const selectedGroup = useSelectedCountertopGroup();

  const {
    selectedFurnitureId,
    materials,
    selectCountertopGroup,
    removeCountertopGroup,
    generateCountertopsForFurniture,
    updateCountertopGroup,
    exportCountertopGroupCsv,
  } = useStore(
    useShallow((state) => ({
      selectedFurnitureId: state.selectedFurnitureId,
      materials: state.materials,
      selectCountertopGroup: state.selectCountertopGroup,
      removeCountertopGroup: state.removeCountertopGroup,
      generateCountertopsForFurniture: state.generateCountertopsForFurniture,
      updateCountertopGroup: state.updateCountertopGroup,
      exportCountertopGroupCsv: state.exportCountertopGroupCsv,
    }))
  );

  // Get board materials only
  const boardMaterials = materials.filter((m) => m.category === 'board' || !m.category);

  // Default material for auto-detect
  const defaultMaterialId = boardMaterials[0]?.id || '';

  const handleAutoDetect = () => {
    if (!selectedFurnitureId || !defaultMaterialId) return;
    generateCountertopsForFurniture(selectedFurnitureId, defaultMaterialId);
  };

  const handleExportCsv = () => {
    if (!selectedGroup) return;
    const csv = exportCountertopGroupCsv(selectedGroup.id);
    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blat_${selectedGroup.name.replace(/\s+/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Blaty kuchenne</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {groups.length} grup
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleAutoDetect}
            disabled={!selectedFurnitureId}
          >
            <Scan className="h-3.5 w-3.5 mr-1.5" />
            Wykryj szafki
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={handleExportCsv}
            disabled={!selectedGroup}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Group List */}
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Brak grup blatów
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Użyj "Wykryj szafki" aby automatycznie utworzyć grupy blatów dla połączonych szafek kuchennych.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <GroupListItem
                  key={group.id}
                  group={group}
                  isSelected={selectedGroup?.id === group.id}
                  onSelect={() => selectCountertopGroup(group.id)}
                  onDelete={() => removeCountertopGroup(group.id)}
                />
              ))}
            </div>
          )}

          {/* Selected Group Details */}
          {selectedGroup && (
            <Accordion type="multiple" defaultValue={['segments', 'corners', 'cnc']} className="mt-4">
              {/* Material & Thickness */}
              <AccordionItem value="material" className="border rounded-lg px-3 mb-2">
                <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                  Materiał i grubość
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Materiał</label>
                      <Select
                        value={selectedGroup.materialId}
                        onValueChange={(val) =>
                          updateCountertopGroup(selectedGroup.id, { materialId: val })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {boardMaterials.map((mat) => (
                            <SelectItem key={mat.id} value={mat.id} className="text-xs">
                              {mat.name} ({mat.thickness}mm)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Grubość (mm)</label>
                      <Select
                        value={String(selectedGroup.thickness)}
                        onValueChange={(val) =>
                          updateCountertopGroup(selectedGroup.id, { thickness: Number(val) })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="28" className="text-xs">28 mm</SelectItem>
                          <SelectItem value="38" className="text-xs">38 mm</SelectItem>
                          <SelectItem value="40" className="text-xs">40 mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Segments Table */}
              <AccordionItem value="segments" className="border rounded-lg px-3 mb-2">
                <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    Segmenty
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                      {selectedGroup.segments.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <SegmentTable
                    segments={selectedGroup.segments}
                    groupId={selectedGroup.id}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Corner Treatments */}
              {(selectedGroup.layoutType === 'L_SHAPE' ||
                selectedGroup.layoutType === 'U_SHAPE') && (
                <AccordionItem value="corners" className="border rounded-lg px-3 mb-2">
                  <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                    Narożniki
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 pt-0">
                    <CornerTreatmentSection group={selectedGroup} />
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* CNC Operations */}
              <AccordionItem value="cnc" className="border rounded-lg px-3 mb-2">
                <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    Operacje CNC
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                      {selectedGroup.segments.reduce(
                        (sum, s) => sum + s.cncOperations.length,
                        0
                      )}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <CncOperationsSection group={selectedGroup} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
