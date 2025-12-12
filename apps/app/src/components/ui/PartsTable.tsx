'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore, useIsPartHidden, useHiddenPartsCount } from '@/lib/store';
import type { Part } from '@/types';
import { Accordion, AccordionContent, AccordionItem, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, cn } from '@meble/ui';
import { CircleDot, FolderTree, Layers, Package, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { InlineEditableText } from './InlineEditableText';
import { buildManualGroupId } from '@/lib/groups';
import { NAME_MAX_LENGTH, sanitizeName } from '@/lib/naming';
import { useShallow } from 'zustand/react/shallow';
import type { StoreState } from '@/lib/store/types';

type CabinetGroup = { type: 'cabinet'; id: string; cabinetId: string; partIds: string[]; furnitureId: string };
type ManualGroup = { type: 'manual'; id: string; name: string; partIds: string[]; furnitureId: string };
type UngroupedGroup = { type: 'ungrouped'; id: string; name: string; partIds: string[]; furnitureId: string };
type PartsGroup = CabinetGroup | ManualGroup | UngroupedGroup;

type TranslateFn = ReturnType<typeof useTranslations<'PartsTable'>>;

const cabinetGroupId = (cabinetId: string) => `cabinet-${cabinetId}`;
const ungroupedGroupId = (furnitureId: string) => `ungrouped-${furnitureId}`;

const edgeBandingSummary = (part: Part) => {
  if (part.shapeType === 'RECT' && part.edgeBanding?.type === 'RECT') {
    const active: string[] = [];
    if (part.edgeBanding.top) active.push('G');
    if (part.edgeBanding.bottom) active.push('D');
    if (part.edgeBanding.left) active.push('L');
    if (part.edgeBanding.right) active.push('P');
    return active.length > 0 ? active.join(',') : null;
  }
  return null;
};

interface PartRowProps {
  partId: string;
  materialLabelMap: Map<string, string>;
  furnitureLabelMap: Map<string, string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onToggleSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRename: (id: string, name: string) => void;
  isSelected: boolean;
  isMultiSelected: boolean;
  t: TranslateFn;
}

const PartRow = memo(function PartRow({
  partId,
  materialLabelMap,
  furnitureLabelMap,
  onSelect,
  onToggleSelect,
  onToggleVisibility,
  onRename,
  isSelected,
  isMultiSelected,
  t,
}: PartRowProps) {
  const part = useStore(
    useCallback((state) => state.parts.find((p) => p.id === partId), [partId])
  );

  // PERFORMANCE: Optimized selector - only re-renders when THIS part's hidden status changes
  const isHidden = useIsPartHidden(partId);

  if (!part) return null;

  const furnitureName = furnitureLabelMap.get(part.furnitureId) ?? t('none');
  const materialName = materialLabelMap.get(part.materialId) ?? t('none');

  const meta: string[] = [
    furnitureName,
    t('dimensions', {
      width: part.width,
      height: part.height,
      depth: part.depth,
    }),
    materialName,
  ];

  const edge = edgeBandingSummary(part);
  if (edge) {
    meta.push(`${t('edgeBanding')}: ${edge}`);
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't interfere with checkbox or visibility button clicks
    if ((e.target as HTMLElement).closest('button[role="checkbox"]') ||
        (e.target as HTMLElement).closest('[data-visibility-toggle]')) {
      return;
    }
    onSelect(part.id, e);
  };

  const handleCheckboxChange = () => {
    onToggleSelect(part.id);
  };

  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility(part.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onDoubleClick={handleRowClick}
      className={cn(
        'flex w-full items-center justify-between px-2 py-1 text-left transition hover:bg-muted/30 focus:outline-none',
        isSelected && 'bg-[#4c82fb1a]',
        isMultiSelected && 'bg-primary/10',
        isHidden && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('selectPart')}
        />
        <button
          type="button"
          data-visibility-toggle
          onClick={handleVisibilityClick}
          className={cn(
            'p-0.5 rounded hover:bg-muted/50 transition-colors',
            isHidden ? 'text-muted-foreground/50' : 'text-muted-foreground'
          )}
          title={isHidden ? 'Pokaż' : 'Ukryj'}
        >
          {isHidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        <Layers className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <InlineEditableText
            value={part.name}
            onCommit={(next) => onRename(part.id, next)}
            placeholder={t('name')}
            ariaLabel={t('renamePart')}
            maxLength={NAME_MAX_LENGTH}
            activationMode="doubleClick"
          />
          <span className="text-xs text-muted-foreground">{meta.join(' • ')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isHidden && (
          <Badge variant="outline" className="text-xs px-1 py-0 text-muted-foreground">
            ukryta
          </Badge>
        )}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{part.shapeType}</span>
      </div>
    </div>
  );
});

PartRow.displayName = 'PartRow';

function GroupIcon({ group }: { group: PartsGroup }) {
  if (group.type === 'cabinet') return <Package className="h-4 w-4" />;
  if (group.type === 'manual') return <FolderTree className="h-4 w-4" />;
  return <CircleDot className="h-4 w-4" />;
}

export function PartsTable() {
  const t = useTranslations('PartsTable');
  const {
    selectPart,
    selectCabinet,
    togglePartSelection,
    selectRange,
    addToSelection,
    renamePart,
    renameManualGroup,
    renameCabinet,
    togglePartsHidden,
    showAllParts,
    selectedPartIds,
    selectedCabinetId,
    multiSelectAnchorId,
    parts,
    cabinets,
    materials,
    furnitures,
  } = useStore(
    useShallow(
      (state) => ({
        selectPart: state.selectPart,
        selectCabinet: state.selectCabinet,
        togglePartSelection: state.togglePartSelection,
        selectRange: state.selectRange,
        addToSelection: state.addToSelection,
        renamePart: state.renamePart,
        renameManualGroup: state.renameManualGroup,
        renameCabinet: state.renameCabinet,
        togglePartsHidden: state.togglePartsHidden,
        showAllParts: state.showAllParts,
        selectedPartIds: state.selectedPartIds,
        selectedCabinetId: state.selectedCabinetId,
        multiSelectAnchorId: state.multiSelectAnchorId,
        parts: state.parts,
        cabinets: state.cabinets,
        materials: state.materials,
        furnitures: state.furnitures,
      }),
    ),
  );
  const totalParts = parts.length;
  const hiddenCount = useHiddenPartsCount();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const materialLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((material) => {
      map.set(material.id, `${material.name} (${material.thickness}mm)`);
    });
    return map;
  }, [materials]);

  const furnitureLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    furnitures.forEach((furniture) => {
      map.set(furniture.id, furniture.name);
    });
    return map;
  }, [furnitures]);

  const groups = useMemo<PartsGroup[]>(() => {
    const assigned = new Set<string>();

    const cabinetGroups: PartsGroup[] = cabinets
      .map((cabinet) => {
        const partIds = parts
          .filter((p) => p.cabinetMetadata?.cabinetId === cabinet.id)
          .map((p) => p.id);
        partIds.forEach((id) => assigned.add(id));
        return {
          type: 'cabinet' as const,
          id: cabinetGroupId(cabinet.id),
          cabinetId: cabinet.id,
          partIds,
          furnitureId: cabinet.furnitureId,
        };
      })
      .filter((group) => group.partIds.length > 0);

    const manualGroupsMap = new Map<string, { name: string; partIds: string[]; furnitureId: string }>();
    const ungroupedMap = new Map<string, string[]>();

    parts.forEach((part) => {
      if (assigned.has(part.id)) return;

      const trimmedGroup = part.group?.trim();
      if (trimmedGroup) {
        const manualId = buildManualGroupId(part.furnitureId, trimmedGroup);
        const current =
          manualGroupsMap.get(manualId) ?? { name: trimmedGroup, partIds: [], furnitureId: part.furnitureId };
        current.partIds.push(part.id);
        manualGroupsMap.set(manualId, current);
      } else {
        const current = ungroupedMap.get(part.furnitureId) ?? [];
        current.push(part.id);
        ungroupedMap.set(part.furnitureId, current);
      }
    });

    const manualGroups: PartsGroup[] = Array.from(manualGroupsMap.entries()).map(([id, value]) => ({
      type: 'manual' as const,
      id,
      name: value.name,
      partIds: value.partIds,
      furnitureId: value.furnitureId,
    }));

    const ungrouped: PartsGroup[] = Array.from(ungroupedMap.entries())
      .filter(([, list]) => list.length > 0)
      .map(([furnitureId, list]) => ({
        type: 'ungrouped' as const,
        id: ungroupedGroupId(furnitureId),
        name: furnitureLabelMap.get(furnitureId) ?? t('none'),
        partIds: list,
        furnitureId,
      }));

    return [...cabinetGroups, ...manualGroups, ...ungrouped];
  }, [cabinets, furnitureLabelMap, parts, t]);

  const STORAGE_KEY = 'partsTable.openGroups';

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      // Ignore storage errors
    }
  }, [openGroups]);

  useEffect(() => {
    // Remove stale group IDs that no longer exist
    const validIds = new Set(groups.map((g) => g.id));
    setOpenGroups((prev) => prev.filter((id) => validIds.has(id)));
  }, [groups]);

  const handlePartSelect = useCallback(
    (partId: string, e: React.MouseEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isCmd) {
        // Cmd/Ctrl+click: Toggle selection
        togglePartSelection(partId);
      } else if (isShift && multiSelectAnchorId) {
        // Shift+click: Range select
        selectRange(multiSelectAnchorId, partId);
      } else {
        // Plain click: Single select
        setSelectedGroupId(null);
        selectPart(partId);
      }
    },
    [selectPart, togglePartSelection, selectRange, multiSelectAnchorId]
  );

  const handleTogglePartSelect = useCallback(
    (partId: string) => {
      togglePartSelection(partId);
    },
    [togglePartSelection]
  );

  const handleGroupSelect = useCallback(
    (group: PartsGroup) => {
      setSelectedGroupId(group.id);
      selectPart(null);
      if (group.type === 'cabinet') {
        selectCabinet(group.cabinetId);
      } else {
        selectCabinet(null);
      }
    },
    [selectCabinet, selectPart]
  );

  const handleGroupCheckboxChange = useCallback(
    (group: PartsGroup, checked: boolean) => {
      if (checked) {
        // Add all parts in group to selection
        addToSelection(group.partIds);
      } else {
        // This would need a removeFromSelection call
        // For now, clicking again will toggle individual parts
        selectPart(null);
      }
    },
    [addToSelection, selectPart]
  );

  const handlePartRename = useCallback(
    (partId: string, nextName: string) => {
      renamePart(partId, nextName);
    },
    [renamePart]
  );

  const handleToggleVisibility = useCallback(
    (partId: string) => {
      togglePartsHidden([partId]);
    },
    [togglePartsHidden]
  );

  const handleManualGroupRename = useCallback(
    (group: ManualGroup, nextName: string) => {
      const normalized = sanitizeName(nextName, NAME_MAX_LENGTH);
      if (!normalized) return;
      const nextId = buildManualGroupId(group.furnitureId, normalized);
      renameManualGroup(group.id, normalized);
      setSelectedGroupId((current) => (current === group.id ? nextId : current));
    },
    [renameManualGroup]
  );

  const handleCabinetRename = useCallback(
    (cabinetId: string, nextName: string) => {
      renameCabinet(cabinetId, nextName);
    },
    [renameCabinet]
  );

  // Check if all parts in a group are selected
  const isGroupFullySelected = useCallback(
    (group: PartsGroup) => {
      return group.partIds.length > 0 && group.partIds.every((id) => selectedPartIds.has(id));
    },
    [selectedPartIds]
  );

  // Check if some parts in a group are selected
  const isGroupPartiallySelected = useCallback(
    (group: PartsGroup) => {
      const selectedCount = group.partIds.filter((id) => selectedPartIds.has(id)).length;
      return selectedCount > 0 && selectedCount < group.partIds.length;
    },
    [selectedPartIds]
  );

  // Get hidden part IDs for visibility checks
  const hiddenPartIds = useStore((state) => state.hiddenPartIds);

  // Check group visibility status
  const getGroupHiddenStatus = useCallback(
    (group: PartsGroup): 'all' | 'some' | 'none' => {
      if (group.partIds.length === 0) return 'none';
      const hiddenCount = group.partIds.filter((id) => hiddenPartIds.has(id)).length;
      if (hiddenCount === 0) return 'none';
      if (hiddenCount === group.partIds.length) return 'all';
      return 'some';
    },
    [hiddenPartIds]
  );

  // Toggle visibility for all parts in a group
  const handleToggleGroupVisibility = useCallback(
    (group: PartsGroup) => {
      togglePartsHidden(group.partIds);
    },
    [togglePartsHidden]
  );

  if (totalParts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noParts')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('titleWithCount', { count: totalParts })}</CardTitle>
          <div className="flex items-center gap-2">
            {hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={showAllParts}
              >
                <Eye className="h-3 w-3" />
                Pokaż ukryte ({hiddenCount})
              </Button>
            )}
            {selectedPartIds.size > 0 && (
              <Badge variant="secondary">
                {selectedPartIds.size} {t('selected')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion
          type="multiple"
          value={openGroups}
          onValueChange={(val) => setOpenGroups(Array.isArray(val) ? val : [val])}
          className="divide-y divide-border border-0"
        >
          {groups.map((group) => {
            const subtitleParts: string[] = [];
            if (group.type === 'cabinet') {
              subtitleParts.push(t('cabinetGroup'));
              subtitleParts.push(furnitureLabelMap.get(group.furnitureId) ?? t('none'));
            } else if (group.type === 'manual') {
              subtitleParts.push(t('customGroup'));
              subtitleParts.push(furnitureLabelMap.get(group.furnitureId) ?? t('none'));
            } else {
              subtitleParts.push(t('ungrouped'));
              subtitleParts.push(furnitureLabelMap.get(group.furnitureId) ?? t('none'));
            }

            const isGroupSelected =
              selectedGroupId === group.id ||
              (group.type === 'cabinet' && selectedCabinetId === group.cabinetId);

            const groupFullySelected = isGroupFullySelected(group);
            const groupPartiallySelected = isGroupPartiallySelected(group);
            const groupHiddenStatus = getGroupHiddenStatus(group);

            return (
              <AccordionItem key={group.id} value={group.id} className="border-b-0">
                <div
                  className={cn(
                    'flex items-stretch gap-1 px-1.5 py-1 transition',
                    isGroupSelected ? 'bg-[#4c82fb1a]' : 'hover:bg-muted/30',
                    groupHiddenStatus === 'all' && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-1 px-1">
                    <Checkbox
                      checked={groupFullySelected}
                      indeterminate={groupPartiallySelected}
                      onCheckedChange={(checked) => handleGroupCheckboxChange(group, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t('selectAll')}
                    />
                    <button
                      type="button"
                      data-visibility-toggle
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGroupVisibility(group);
                      }}
                      className={cn(
                        'p-0.5 rounded hover:bg-muted/50 transition-colors',
                        groupHiddenStatus !== 'none' ? 'text-muted-foreground/50' : 'text-muted-foreground'
                      )}
                      title={groupHiddenStatus !== 'none' ? 'Pokaż wszystkie' : 'Ukryj wszystkie'}
                    >
                      {groupHiddenStatus === 'all' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : groupHiddenStatus === 'some' ? (
                        <Eye className="h-4 w-4 opacity-50" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'flex flex-1 items-center gap-2 px-2 py-1 text-left transition focus:outline-none',
                      group.type === 'cabinet' ? 'bg-muted/40' : 'bg-transparent'
                    )}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <GroupIcon group={group} />
                    <div className="flex flex-1 flex-col">
                      {group.type === 'cabinet' ? (
                        <CabinetInlineName
                          cabinetId={group.cabinetId}
                          onRename={handleCabinetRename}
                          t={t}
                        />
                      ) : group.type === 'manual' ? (
                        <InlineEditableText
                          value={group.name}
                          onCommit={(next) => handleManualGroupRename(group, next)}
                          placeholder={t('group')}
                          ariaLabel={t('renameGroup')}
                          maxLength={NAME_MAX_LENGTH}
                          asChild
                          activationMode="doubleClick"
                        />
                      ) : (
                        <span className="text-sm font-semibold leading-5">{group.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{subtitleParts.join(' • ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {groupHiddenStatus !== 'none' && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground pointer-events-none">
                          {groupHiddenStatus === 'all'
                            ? 'ukryte'
                            : `${group.partIds.filter(id => hiddenPartIds.has(id)).length} ukrytych`}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="pointer-events-none">
                        {t('partsCount', { count: group.partIds.length })}
                      </Badge>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-muted/30 focus:outline-none focus:ring-0"
                    aria-label={t('title')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGroups((prev) =>
                        prev.includes(group.id)
                          ? prev.filter((id) => id !== group.id)
                          : [...prev, group.id]
                      );
                    }}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        openGroups.includes(group.id) ? 'rotate-180' : ''
                      )}
                    />
                  </button>
                </div>
                <AccordionContent className="bg-background px-3 pb-2">
                  <div className="space-y-0 divide-y divide-border border-0">
                    {group.partIds.map((partId) => (
                      <PartRow
                        key={partId}
                        partId={partId}
                        materialLabelMap={materialLabelMap}
                        furnitureLabelMap={furnitureLabelMap}
                        onSelect={handlePartSelect}
                        onToggleSelect={handleTogglePartSelect}
                        onToggleVisibility={handleToggleVisibility}
                        onRename={handlePartRename}
                        isSelected={selectedPartIds.has(partId)}
                        isMultiSelected={selectedPartIds.has(partId) && selectedPartIds.size > 1}
                        t={t}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

interface CabinetInlineNameProps {
  cabinetId: string;
  onRename: (id: string, name: string) => void;
  t: TranslateFn;
}

const CabinetInlineName = memo(function CabinetInlineName({ cabinetId, onRename, t }: CabinetInlineNameProps) {
  const cabinet = useStore(
    useCallback((state: StoreState) => state.cabinets.find((c) => c.id === cabinetId), [cabinetId])
  );

  if (!cabinet) return null;

  return (
    <InlineEditableText
      value={cabinet.name}
      onCommit={(next) => onRename(cabinet.id, next)}
      placeholder={t('cabinet')}
      ariaLabel={t('renameCabinet')}
      maxLength={NAME_MAX_LENGTH}
      asChild
      activationMode="doubleClick"
    />
  );
});

CabinetInlineName.displayName = 'CabinetInlineName';
