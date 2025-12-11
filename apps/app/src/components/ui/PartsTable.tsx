'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@meble/ui';
import type { Part, Cabinet } from '@/types';
import { Layers, Package, FolderTree, CircleDot } from 'lucide-react';

type PartsGroup =
  | { type: 'cabinet'; id: string; name: string; parts: Part[]; cabinet: Cabinet }
  | { type: 'manual'; id: string; name: string; parts: Part[]; furnitureId: string }
  | { type: 'ungrouped'; id: string; name: string; parts: Part[]; furnitureId: string };

export function PartsTable() {
  const t = useTranslations('PartsTable');
  const {
    parts,
    materials,
    furnitures,
    cabinets,
    selectPart,
    selectCabinet,
    selectedPartId,
    selectedCabinetId,
  } = useStore();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const getMaterialName = useCallback(
    (materialId: string) => {
      const material = materials.find((m) => m.id === materialId);
      return material ? `${material.name} (${material.thickness}mm)` : t('none');
    },
    [materials, t]
  );

  const getFurnitureName = useCallback(
    (furnitureId: string) => {
      const furniture = furnitures.find((f) => f.id === furnitureId);
      return furniture?.name || t('none');
    },
    [furnitures, t]
  );

  const getEdgeBandingSummary = (part: Part) => {
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

  const groups = useMemo<PartsGroup[]>(() => {
    const assigned = new Set<string>();

    const cabinetGroups: PartsGroup[] = cabinets
      .map((cabinet) => {
        const cabParts = parts.filter(
          (p) => p.cabinetMetadata?.cabinetId === cabinet.id
        );
        cabParts.forEach((p) => assigned.add(p.id));
        return {
          type: 'cabinet' as const,
          id: `cabinet-${cabinet.id}`,
          name: cabinet.name,
          parts: cabParts,
          cabinet,
        };
      })
      .filter((group) => group.parts.length > 0);

    const manualGroupsMap = new Map<
      string,
      { name: string; parts: Part[]; furnitureId: string }
    >();
    const ungroupedMap = new Map<string, Part[]>();

    parts.forEach((part) => {
      if (assigned.has(part.id)) return;

      const trimmedGroup = part.group?.trim();
      if (trimmedGroup) {
        const key = `${part.furnitureId}::${trimmedGroup}`;
        const current =
          manualGroupsMap.get(key) ??
          { name: trimmedGroup, parts: [], furnitureId: part.furnitureId };
        current.parts.push(part);
        manualGroupsMap.set(key, current);
      } else {
        const current = ungroupedMap.get(part.furnitureId) ?? [];
        current.push(part);
        ungroupedMap.set(part.furnitureId, current);
      }
    });

    const manualGroups: PartsGroup[] = Array.from(manualGroupsMap.entries()).map(
      ([key, value]) => ({
        type: 'manual' as const,
        id: `group-${key}`,
        name: value.name,
        parts: value.parts,
        furnitureId: value.furnitureId,
      })
    );

    const ungrouped: PartsGroup[] = Array.from(ungroupedMap.entries())
      .filter(([, list]) => list.length > 0)
      .map(([furnitureId, list]) => ({
        type: 'ungrouped' as const,
        id: `ungrouped-${furnitureId}`,
        name: getFurnitureName(furnitureId),
        parts: list,
        furnitureId,
      }));

    return [...cabinetGroups, ...manualGroups, ...ungrouped];
  }, [parts, cabinets, getFurnitureName]);

  const handlePartClick = (part: Part) => {
    setSelectedGroupId(null);
    selectPart(part.id);
  };

  const handleGroupSelect = (group: PartsGroup) => {
    setSelectedGroupId(group.id);
    selectPart(null);
    if (group.type === 'cabinet') {
      selectCabinet(group.cabinet.id);
    } else {
      selectCabinet(null);
    }
  };

  const renderGroupIcon = (group: PartsGroup) => {
    if (group.type === 'cabinet') return <Package className="h-4 w-4" />;
    if (group.type === 'manual') return <FolderTree className="h-4 w-4" />;
    return <CircleDot className="h-4 w-4" />;
  };

  const accordionDefault = groups.map((group) => group.id);

  if (parts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('noParts')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('titleWithCount', { count: parts.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          defaultValue={accordionDefault}
          className="divide-y rounded-md border"
        >
          {groups.map((group) => {
            const subtitleParts: string[] = [];
            if (group.type === 'cabinet') {
              subtitleParts.push(t('cabinetGroup'));
              subtitleParts.push(getFurnitureName(group.cabinet.furnitureId));
            } else if (group.type === 'manual') {
              subtitleParts.push(t('customGroup'));
              subtitleParts.push(getFurnitureName(group.furnitureId));
            } else {
              subtitleParts.push(t('ungrouped'));
              subtitleParts.push(getFurnitureName(group.furnitureId));
            }

            const isGroupSelected =
              selectedGroupId === group.id ||
              (group.type === 'cabinet' &&
                selectedCabinetId === group.cabinet.id);

            return (
              <AccordionItem key={group.id} value={group.id} className="border-b-0">
                <AccordionTrigger
                  className={cn(
                    'gap-3 px-3 py-3 text-left hover:no-underline',
                    group.type === 'cabinet'
                      ? 'bg-muted/40'
                      : 'bg-transparent',
                    isGroupSelected
                      ? 'border border-primary/40 bg-primary/5'
                      : ''
                  )}
                >
                  <div
                    className="flex w-full items-center gap-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupSelect(group);
                    }}
                  >
                    {renderGroupIcon(group)}
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold leading-5">
                        {group.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {subtitleParts.join(' • ')}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupSelect(group);
                      }}
                      className="shrink-0"
                    >
                      {t('partsCount', { count: group.parts.length })}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-background px-3 pb-3">
                  <div className="space-y-2">
                    {group.parts.map((part) => {
                      const meta: string[] = [
                        getFurnitureName(part.furnitureId),
                        t('dimensions', {
                          width: part.width,
                          height: part.height,
                          depth: part.depth,
                        }),
                        getMaterialName(part.materialId),
                      ];
                      const edge = getEdgeBandingSummary(part);
                      if (edge) {
                        meta.push(`${t('edgeBanding')}: ${edge}`);
                      }

                      const isSelected = selectedPartId === part.id;

                      return (
                        <button
                          key={part.id}
                          onClick={() => handlePartClick(part)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/60',
                            isSelected && 'border-primary/40 bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium leading-5">
                                {part.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {meta.join(' • ')}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {part.shapeType}
                          </span>
                        </button>
                      );
                    })}
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
