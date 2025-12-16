/**
 * Cabinet leg generator
 * Generates LegData[] for 3D visualization (not Part - legs are accessories)
 */

import type { LegsConfig, LegData } from '@/types';
import { getLegColor } from '@/types';
import { LegsDomain } from '@/lib/domain/legs';

/**
 * Generate leg data for a cabinet
 * Returns LegData[] which is stored in Cabinet.legs (not as Part)
 */
export function generateLegs(
  legsConfig: LegsConfig,
  cabinetWidth: number,
  cabinetDepth: number
): LegData[] {
  if (!legsConfig.enabled) return [];

  const legs: LegData[] = [];
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
  const legColor = getLegColor(legType.finish);

  // Generate each leg
  positions.forEach((pos, index) => {
    const [x, z] = pos;

    legs.push({
      index,
      position: { x, z },
      shape: legType.shape,
      finish: legType.finish,
      color: legColor,
      height: legHeight,
      diameter: legDiameter,
    });
  });

  return legs;
}
