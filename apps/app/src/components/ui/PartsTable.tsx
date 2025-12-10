'use client';

/**
 * Parts table component - displays all parts in tabular format
 */

import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@meble/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@meble/ui';
import type { Part, EdgeBandingRect } from '@/types';
import { CabinetBadge } from './CabinetBadge';

export function PartsTable() {
  const t = useTranslations('PartsTable');
  const { parts, materials, furnitures, cabinets, selectPart, selectCabinet } =
    useStore();

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material ? `${material.name} (${material.thickness}mm)` : t('none');
  };

  const getFurnitureName = (furnitureId: string) => {
    const furniture = furnitures.find((f) => f.id === furnitureId);
    return furniture?.name || t('none');
  };

  const getEdgeBandingSummary = (part: Part) => {
    if (part.shapeType === 'RECT' && part.edgeBanding) {
      const edges = part.edgeBanding as EdgeBandingRect;
      const active: string[] = [];
      if (edges.top) active.push('G');
      if (edges.bottom) active.push('D');
      if (edges.left) active.push('L');
      if (edges.right) active.push('P');
      return active.length > 0 ? active.join(',') : '-';
    }
    return '-';
  };

  const handleRowClick = (partId: string) => {
    selectPart(partId);
  };

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('furniture')}</TableHead>
                <TableHead>{t('cabinet')}</TableHead>
                <TableHead>{t('group')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-right">{t('lengthX')}</TableHead>
                <TableHead className="text-right">{t('widthY')}</TableHead>
                <TableHead className="text-right">{t('thicknessZ')}</TableHead>
                <TableHead>{t('material')}</TableHead>
                <TableHead>{t('shape')}</TableHead>
                <TableHead>{t('edgeBanding')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => {
                const cabinet = part.cabinetMetadata
                  ? cabinets.find((c) => c.id === part.cabinetMetadata?.cabinetId)
                  : null;

                return (
                  <TableRow
                    key={part.id}
                    onClick={() => handleRowClick(part.id)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {getFurnitureName(part.furnitureId)}
                    </TableCell>
                    <TableCell>
                      {cabinet ? (
                        <CabinetBadge
                          cabinet={cabinet}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectCabinet(cabinet.id);
                          }}
                        />
                      ) : (
                        t('noDash')
                      )}
                    </TableCell>
                    <TableCell>{part.group || t('noDash')}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell className="text-right">{part.width}</TableCell>
                    <TableCell className="text-right">{part.height}</TableCell>
                    <TableCell className="text-right">{part.depth}</TableCell>
                    <TableCell>{getMaterialName(part.materialId)}</TableCell>
                    <TableCell>{part.shapeType}</TableCell>
                    <TableCell>{getEdgeBandingSummary(part)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
