/**
 * Domain Modules
 *
 * Namespace-like modules that organize business logic for furniture/cabinet management.
 * Each module provides creators, updaters, calculators, validators, and queries for its domain.
 *
 * Usage:
 * ```typescript
 * import { Section, Drawer, Shelf, Interior, CabinetDomain, PartDomain } from '@/lib/domain';
 *
 * // Create a new section
 * const section = Section.create('SHELVES');
 *
 * // Update section
 * const updated = Section.updateShelvesConfig(section, { count: 3 });
 *
 * // Calculate bounds
 * const bounds = Section.calculateBounds(sections, cabinetHeight, bodyThickness);
 *
 * // Validate
 * const result = Section.validate(section);
 * ```
 */

// Domain modules
export { Section } from './section';
export type { SectionBounds, SectionHeightInfo } from './section';

export { Drawer } from './drawer';
export type { ZoneBounds, BoxBounds } from './drawer';

export { Shelf } from './shelf';

export { Interior } from './interior';
export type { InteriorBoundsInfo, InteriorSummary } from './interior';

export { CabinetDomain } from './cabinet';
export type { CabinetDimensions } from './cabinet';

export { PartDomain } from './part';
export type { GeneratedPartData } from './part';

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
