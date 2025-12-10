'use client';

/**
 * Parts table component - displays all parts in tabular format
 */

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

export function PartsTable() {
  const { parts, materials, furnitures, selectPart } = useStore();

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material ? `${material.name} (${material.thickness}mm)` : 'Brak';
  };

  const getFurnitureName = (furnitureId: string) => {
    const furniture = furnitures.find((f) => f.id === furnitureId);
    return furniture?.name || 'Brak';
  };

  const getEdgeBandingSummary = (part: Part) => {
    if (part.shapeType === 'RECT' && part.edgeBanding) {
      const edges = part.edgeBanding as EdgeBandingRect;
      const active: string[] = [];
      if (edges.data?.top) active.push('G');
      if (edges.data?.bottom) active.push('D');
      if (edges.data?.left) active.push('L');
      if (edges.data?.right) active.push('P');
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
          <CardTitle>Lista części</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Brak części. Dodaj pierwszą część używając przycisku "Dodaj część".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista części ({parts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mebel</TableHead>
                <TableHead>Grupa</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead className="text-right">Długość X</TableHead>
                <TableHead className="text-right">Szerokość Y</TableHead>
                <TableHead className="text-right">Grubość Z</TableHead>
                <TableHead>Materiał</TableHead>
                <TableHead>Kształt</TableHead>
                <TableHead>Okleina</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => (
                <TableRow
                  key={part.id}
                  onClick={() => handleRowClick(part.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {getFurnitureName(part.furnitureId)}
                  </TableCell>
                  <TableCell>{part.group || '-'}</TableCell>
                  <TableCell>{part.name}</TableCell>
                  <TableCell className="text-right">{part.width}</TableCell>
                  <TableCell className="text-right">{part.height}</TableCell>
                  <TableCell className="text-right">{part.depth}</TableCell>
                  <TableCell>{getMaterialName(part.materialId)}</TableCell>
                  <TableCell>{part.shapeType}</TableCell>
                  <TableCell>{getEdgeBandingSummary(part)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
