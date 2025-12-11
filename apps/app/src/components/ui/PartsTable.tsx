'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import type { Part } from '@/types';
import { Accordion, AccordionContent, AccordionItem, Badge, Card, CardContent, CardHeader, CardTitle, cn } from '@meble/ui';
import { CircleDot, FolderTree, Layers, Package, ChevronDown } from 'lucide-react';
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
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  isSelected: boolean;
  t: TranslateFn;
}

const PartRow = memo(function PartRow({
  partId,
  materialLabelMap,
  furnitureLabelMap,
  onSelect,
  onRename,
  isSelected,
  t,
}: PartRowProps) {
  const part = useStore(
    useCallback((state) => state.parts.find((p) => p.id === partId), [partId])
  );

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

  const handleSelect = () => onSelect(part.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onDoubleClick={handleSelect}
      className={cn(
        'flex w-full items-center justify-between px-2 py-1 text-left transition hover:bg-muted/30 focus:outline-none',
        isSelected && 'bg-[#4c82fb1a]'
      )}
    >
      <div className="flex items-center gap-3">
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
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{part.shapeType}</span>
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
    renamePart,
    renameManualGroup,
    renameCabinet,
    selectedPartId,
    selectedCabinetId,
    parts,
    cabinets,
    materials,
    furnitures,
  } = useStore(
    useShallow(
      (state) => ({
        selectPart: state.selectPart,
        selectCabinet: state.selectCabinet,
        renamePart: state.renamePart,
        renameManualGroup: state.renameManualGroup,
        renameCabinet: state.renameCabinet,
        selectedPartId: state.selectedPartId,
        selectedCabinetId: state.selectedCabinetId,
        parts: state.parts,
        cabinets: state.cabinets,
        materials: state.materials,
        furnitures: state.furnitures,
      }),
    ),
  );
  const totalParts = parts.length;

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

  const accordionDefault = useMemo(() => groups.map((group) => group.id), [groups]);
  const [openGroups, setOpenGroups] = useState<string[]>(accordionDefault);

  useEffect(() => {
    setOpenGroups((prev) => {
      const existing = new Set(prev);
      const next = groups.map((g) => g.id).filter((id) => existing.has(id));
      return next.length > 0 ? next : accordionDefault;
    });
  }, [groups, accordionDefault]);

  const handlePartSelect = useCallback(
    (partId: string) => {
      setSelectedGroupId(null);
      selectPart(partId);
    },
    [selectPart]
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

  const handlePartRename = useCallback(
    (partId: string, nextName: string) => {
      renamePart(partId, nextName);
    },
    [renamePart]
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
        <CardTitle className="text-base">{t('titleWithCount', { count: totalParts })}</CardTitle>
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

            return (
              <AccordionItem key={group.id} value={group.id} className="border-b-0">
                <div
                  className={cn(
                    'flex items-stretch gap-1 px-1.5 py-1 transition',
                    isGroupSelected ? 'bg-[#4c82fb1a]' : 'hover:bg-muted/30'
                  )}
                >
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
                    <Badge variant="secondary" className="shrink-0 pointer-events-none">
                      {t('partsCount', { count: group.partIds.length })}
                    </Badge>
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
                        onRename={handlePartRename}
                        isSelected={selectedPartId === partId}
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
