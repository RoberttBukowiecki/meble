/**
 * Drawer dimension calculation utilities
 */

import { DrawerSlideConfig } from '@/types';
import { DRAWER_CONFIG } from '../../config';

export interface DrawerBoxDimensions {
  boxWidth: number;
  boxDepth: number;
  boxSideHeight: number;
  bottomThickness: number;
}

/**
 * Calculate drawer box dimensions based on slide type and cabinet dimensions
 */
export function calculateDrawerBoxDimensions(
  cabinetWidth: number,
  cabinetDepth: number,
  boxSpaceHeight: number,
  sideThickness: number,
  slideConfig: DrawerSlideConfig,
  bottomThickness: number
): DrawerBoxDimensions {
  // Drawer box width = cabinet interior width - slide clearances
  const boxWidth = cabinetWidth
    - 2 * sideThickness           // subtract cabinet sides
    - 2 * slideConfig.sideOffset; // subtract slide clearance

  // Drawer box depth - ends at cabinet front, only rear clearance applies
  const boxDepth = cabinetDepth - slideConfig.depthOffset;

  // Drawer box height (sides height) - smaller than the space available
  const boxSideHeight = Math.max(boxSpaceHeight - DRAWER_CONFIG.BOX_HEIGHT_REDUCTION, DRAWER_CONFIG.BOX_HEIGHT_MIN);

  return { boxWidth, boxDepth, boxSideHeight, bottomThickness };
}
