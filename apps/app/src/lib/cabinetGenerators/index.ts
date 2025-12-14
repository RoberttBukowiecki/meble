/**
 * Cabinet Generators
 *
 * This module provides functions to generate cabinet parts based on cabinet type and parameters.
 * The generated parts are raw Part objects without IDs or timestamps (store adds those).
 *
 * Structure:
 * - types.ts: Internal type definitions
 * - constants.ts: Shared constants (margins, gaps)
 * - backPanel.ts: Back panel generation
 * - doors.ts: Door generation
 * - drawers/: Drawer generation (zone-based)
 * - kitchenCabinet.ts: Kitchen cabinet generator
 * - wardrobe.ts: Wardrobe generator
 * - bookshelf.ts: Bookshelf generator
 * - drawerCabinet.ts: Drawer cabinet generator
 */

import { CabinetType } from '@/types';
import { CabinetGenerator } from './types';

// Re-export types
export type { CabinetGenerator, GeneratedPart } from './types';

// Re-export individual generators for direct access if needed
export { generateKitchenCabinet } from './kitchenCabinet';
export { generateWardrobe } from './wardrobe';
export { generateBookshelf } from './bookshelf';
export { generateDrawerCabinet } from './drawerCabinet';

// Re-export utility functions
export { generateBackPanel } from './backPanel';
export { generateDoors } from './doors';
export { generateDrawers, calculateDrawerBoxDimensions } from './drawers';
export {
  generateSideFronts,
  hasSideFronts,
  getSideFrontsSummary,
} from './sideFronts';
export {
  generateDecorativePanels,
  hasDecorativePanels,
  getDecorativePanelsSummary,
} from './decorativePanels';
export {
  generateInterior,
  hasInteriorContent,
  getInteriorSummary,
} from './interior';
export { generateLegs, parseLegNotes } from './legs';
export type { LegPartNotes } from './legs';

// Import generators for the factory function
import { generateKitchenCabinet } from './kitchenCabinet';
import { generateWardrobe } from './wardrobe';
import { generateBookshelf } from './bookshelf';
import { generateDrawerCabinet } from './drawerCabinet';

/**
 * Get the appropriate generator function for a cabinet type
 * This is the main entry point for cabinet generation
 */
export function getGeneratorForType(type: CabinetType): CabinetGenerator {
  switch (type) {
    case 'KITCHEN':
      return generateKitchenCabinet;
    case 'WARDROBE':
      return generateWardrobe;
    case 'BOOKSHELF':
      return generateBookshelf;
    case 'DRAWER':
      return generateDrawerCabinet;
  }
}
