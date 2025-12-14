/**
 * Domain Modules
 *
 * Namespace-like modules that organize business logic for furniture/cabinet management.
 * Each module provides creators, updaters, calculators, validators, and queries for its domain.
 *
 * Usage:
 * ```typescript
 * import { Zone, Drawer, Shelf, CabinetDomain, PartDomain } from '@/lib/domain';
 *
 * // Create a new zone
 * const zone = Zone.create('SHELVES', 0);
 *
 * // Update zone
 * const updated = Zone.updateShelvesConfig(zone, { count: 3 });
 *
 * // Calculate bounds (recursive tree)
 * const treeInfo = Zone.calculateBounds(rootZone, parentBounds, bodyThickness, cabinetDepth);
 *
 * // Validate
 * const result = Zone.validate(zone, dimensions);
 * ```
 */

// Domain modules
export { Zone } from './zone';
export type { ZoneBounds, PartitionBounds, ZoneTreeInfo, ParentBounds } from './zone';

export { Drawer } from './drawer';
export type { ZoneBounds as DrawerZoneBounds, BoxBounds } from './drawer';

export { Shelf } from './shelf';

export { CabinetDomain } from './cabinet';
export type { CabinetDimensions } from './cabinet';

export { PartDomain } from './part';
export type { GeneratedPartData } from './part';

export { LegsDomain } from './legs';

// Shared types
export type {
  ValidationResult,
  Bounds,
  BoundsWithIndex,
  Dimensions,
  Position,
  Rotation,
  BoundingBox,
  InteriorSpace,
  DrawerBoxDimensions,
} from './types';

// Shared utilities
export {
  validResult,
  invalidResult,
  mergeValidations,
} from './types';

export {
  generateId,
  clamp,
  roundTo,
  ratioToPercent,
  percentToRatio,
  distributeByRatio,
  updateArrayItem,
  updateArrayItemById,
  removeArrayItem,
  removeArrayItemById,
  moveArrayItem,
  findIndexById,
  arraysEqual,
} from './utils';
