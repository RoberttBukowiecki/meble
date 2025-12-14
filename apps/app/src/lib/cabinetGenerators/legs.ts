/**
 * Cabinet leg generator
 * Generates leg parts (non-cut accessories) for 3D visualization
 */

import type { LegsConfig, CabinetMaterials, LegFinish, LegShape } from '@/types';
import type { GeneratedPart } from './types';
import { LegsDomain } from '@/lib/domain/legs';

/**
 * Leg notes stored in part.notes for 3D rendering
 */
export interface LegPartNotes {
  shape: LegShape;
  finish: LegFinish;
  color: string;
  height: number;
  diameter: number;
  isAccessory: boolean;
}

/**
 * Generate leg parts for a cabinet
 */
export function generateLegs(
  cabinetId: string,
  furnitureId: string,
  legsConfig: LegsConfig,
  cabinetWidth: number,
  cabinetDepth: number,
  materials: CabinetMaterials
): GeneratedPart[] {
  if (!legsConfig.enabled) return [];

  const parts: GeneratedPart[] = [];
  const { legType, cornerInset, currentHeight } = legsConfig;

  // Calculate leg count
  const legCount = LegsDomain.getEffectiveLegCount(legsConfig, cabinetWidth);

  // Get leg positions
  const positions = LegsDomain.calculateLegPositions(
    cabinetWidth,
    cabinetDepth,
    legCount,
    cornerInset
  );

  // Leg dimensions
  const legDiameter = legType.diameter;
  const legHeight = currentHeight;
  const legColor = LegsDomain.getLegColor(legType.finish);

  // Generate each leg
  positions.forEach((pos, index) => {
    const [x, z] = pos;
    // Leg center Y is at legHeight/2 (legs start at Y=0 ground plane)
    const legCenterY = legHeight / 2;

    const legNotes: LegPartNotes = {
      shape: legType.shape,
      finish: legType.finish,
      color: legColor,
      height: legHeight,
      diameter: legDiameter,
      isAccessory: true,
    };

    parts.push({
      name: `Nozka ${index + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: {
        type: 'RECT',
        x: legDiameter,
        y: legDiameter,
      },
      width: legDiameter,
      height: legDiameter,
      depth: legHeight,
      position: [x, legCenterY, z],
      rotation: [-Math.PI / 2, 0, 0], // Rotate to stand vertically
      materialId: materials.bodyMaterialId,
      edgeBanding: {
        type: 'RECT',
        top: false,
        bottom: false,
        left: false,
        right: false,
      },
      cabinetMetadata: {
        cabinetId,
        role: 'LEG',
        legIndex: index,
      },
      notes: JSON.stringify(legNotes),
    });
  });

  return parts;
}

/**
 * Parse leg notes from part.notes
 */
export function parseLegNotes(notes?: string): LegPartNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes) as LegPartNotes;
  } catch {
    return null;
  }
}
