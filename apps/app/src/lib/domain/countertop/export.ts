/**
 * Countertop Export Module
 *
 * Functions for generating production data and CSV exports
 */

import type {
  CountertopGroup,
  CountertopProductionData,
  CutListEntry,
  EdgeBandingEntry,
  EdgeId,
} from '@/types/countertop';
import type { Material } from '@/types';

/**
 * Calculate total area of countertop group in mm²
 */
export const calculateTotalArea = (group: CountertopGroup): number => {
  return group.segments.reduce((total, segment) => {
    return total + segment.length * segment.width;
  }, 0);
};

/**
 * Calculate total area in m²
 */
export const calculateTotalAreaM2 = (group: CountertopGroup): number => {
  return calculateTotalArea(group) / 1_000_000;
};

/**
 * Calculate total edge banding length for a specific option
 */
export const calculateEdgeBandingLength = (
  group: CountertopGroup,
  option?: string
): number => {
  let total = 0;

  for (const segment of group.segments) {
    const edges: { edge: EdgeId; length: number }[] = [
      { edge: 'a', length: segment.length },  // Back edge
      { edge: 'b', length: segment.width },   // Right edge
      { edge: 'c', length: segment.length },  // Front edge
      { edge: 'd', length: segment.width },   // Left edge
    ];

    for (const { edge, length } of edges) {
      const edgeOption = segment.edgeBanding[edge];
      if (option === undefined) {
        // Count all banded edges
        if (edgeOption !== 'NONE') {
          total += length;
        }
      } else if (edgeOption === option) {
        total += length;
      }
    }
  }

  return total;
};

/**
 * Generate production data for manufacturing
 */
export const generateProductionData = (
  group: CountertopGroup,
  material: Material
): CountertopProductionData => {
  const cutList: CutListEntry[] = group.segments.map(segment => ({
    segmentId: segment.id,
    name: segment.name,
    length: segment.length,
    width: segment.width,
    thickness: segment.thickness,
    grainDirection: segment.grainAlongLength ? 'LENGTH' : 'WIDTH',
    quantity: 1,
    material: material.name,
  }));

  const edgeBanding: EdgeBandingEntry[] = [];
  for (const segment of group.segments) {
    const edges: { edge: EdgeId; length: number }[] = [
      { edge: 'a', length: segment.length },
      { edge: 'b', length: segment.width },
      { edge: 'c', length: segment.length },
      { edge: 'd', length: segment.width },
    ];

    for (const { edge, length } of edges) {
      const option = segment.edgeBanding[edge];
      if (option !== 'NONE') {
        edgeBanding.push({
          segmentId: segment.id,
          segmentName: segment.name,
          edge,
          type: option,
          length,
        });
      }
    }
  }

  const cncOperations = group.segments
    .filter(s => s.cncOperations.length > 0)
    .map(segment => ({
      segmentId: segment.id,
      segmentName: segment.name,
      operations: segment.cncOperations,
    }));

  const joints = group.joints.map(joint => {
    const segmentA = group.segments.find(s => s.id === joint.segmentAId);
    const segmentB = group.segments.find(s => s.id === joint.segmentBId);
    return {
      jointId: joint.id,
      type: joint.type,
      angle: joint.angle,
      hardware: joint.hardware,
      segmentAName: segmentA?.name ?? 'Unknown',
      segmentBName: segmentB?.name ?? 'Unknown',
    };
  });

  return {
    exportDate: new Date(),
    referenceId: group.id,
    material: {
      id: material.id,
      name: material.name,
      thickness: group.thickness,
    },
    cutList,
    edgeBanding,
    cncOperations,
    joints,
    corners: group.corners,
    totalAreaM2: calculateTotalAreaM2(group),
    totalEdgeBandingMm: calculateEdgeBandingLength(group),
  };
};

/**
 * Generate CSV export string for cutting list
 */
export const generateCuttingListCsv = (group: CountertopGroup, material: Material): string => {
  const data = generateProductionData(group, material);
  const lines: string[] = [];

  // Header
  lines.push('Element;Długość (mm);Szerokość (mm);Grubość (mm);Kierunek usłojenia;Ilość;Materiał');

  // Cut list entries
  for (const entry of data.cutList) {
    lines.push([
      entry.name,
      entry.length.toString(),
      entry.width.toString(),
      entry.thickness.toString(),
      entry.grainDirection === 'LENGTH' ? 'Wzdłuż' : 'W poprzek',
      entry.quantity.toString(),
      entry.material,
    ].join(';'));
  }

  // Empty line
  lines.push('');

  // Edge banding section
  lines.push('Oklejanie krawędzi');
  lines.push('Element;Krawędź;Typ;Długość (mm)');

  for (const entry of data.edgeBanding) {
    lines.push([
      entry.segmentName,
      entry.edge.toUpperCase(),
      entry.type,
      entry.length.toString(),
    ].join(';'));
  }

  // Empty line
  lines.push('');

  // CNC operations section
  if (data.cncOperations.length > 0) {
    lines.push('Operacje CNC');
    lines.push('Element;Typ;Pozycja X (mm);Pozycja Y (mm);Wymiary');

    for (const segmentOps of data.cncOperations) {
      for (const op of segmentOps.operations) {
        const dims = op.dimensions.diameter
          ? `Ø${op.dimensions.diameter}`
          : `${op.dimensions.width}×${op.dimensions.height}`;
        lines.push([
          segmentOps.segmentName,
          op.type,
          op.position.x.toString(),
          op.position.y.toString(),
          dims,
        ].join(';'));
      }
    }
  }

  // Empty line
  lines.push('');

  // Joints section
  if (data.joints.length > 0) {
    lines.push('Połączenia');
    lines.push('Element A;Element B;Typ połączenia;Kąt;Okucia');

    for (const joint of data.joints) {
      lines.push([
        joint.segmentAName,
        joint.segmentBName,
        joint.type,
        `${joint.angle}°`,
        `${joint.hardware.type} x${joint.hardware.count}`,
      ].join(';'));
    }
  }

  // Empty line
  lines.push('');

  // Summary
  lines.push('Podsumowanie');
  lines.push(`Całkowita powierzchnia (m²);${data.totalAreaM2.toFixed(2)}`);
  lines.push(`Całkowite oklejanie krawędzi (mm);${data.totalEdgeBandingMm}`);

  return lines.join('\n');
};
