# Domain Modules Architecture Plan

## Executive Summary

This plan introduces **Domain Modules** - a lightweight architectural pattern to organize business logic for furniture/cabinet/part management. The goal is to improve code organization, discoverability, and testability while maintaining rapid development velocity.

**Key principle:** Keep plain TypeScript interfaces for data, organize business logic into discoverable namespace-like modules.

---

## Problem Analysis

### Current State (Code Statistics)

| Component | Lines of Code | Complexity |
|-----------|---------------|------------|
| Cabinet generators | 3,069 | High - deeply nested logic |
| InteriorConfigDialog | 2,252 | Very High - UI + calculations mixed |
| cabinetResize | 560 | High - geometric calculations |
| Type definitions | ~1,500 | Medium - 17 files, 4-5 nesting levels |

### Pain Points

1. **Scattered Business Logic**
   - Calculations duplicated across generators, components, utils
   - Hard to find "what operations are available for X?"
   - Example: `calculateSectionBounds()` logic exists in 3 places

2. **Deep Nesting Without Helpers**
   ```typescript
   // Current: Manual deep updates everywhere
   const updated = {
     ...config,
     sections: config.sections.map((s, i) =>
       i === index
         ? {
             ...s,
             shelvesConfig: {
               ...s.shelvesConfig,
               shelves: [...s.shelvesConfig.shelves, newShelf],
             },
           }
         : s
     ),
   };
   ```

3. **No Encapsulation**
   - Any code can create invalid configurations
   - Validation scattered across UI components
   - No single source of truth for "how to create a valid Section"

4. **Poor Discoverability**
   - New developers can't find available operations
   - IDE autocomplete doesn't help (plain objects have no methods)

---

## Proposed Solution: Domain Modules

### Architecture Overview

```
lib/
├── domain/                    # NEW - Domain modules
│   ├── index.ts              # Re-exports all modules
│   ├── cabinet.ts            # Cabinet operations
│   ├── section.ts            # Section operations
│   ├── drawer.ts             # Drawer/zone operations
│   ├── shelf.ts              # Shelf operations
│   ├── part.ts               # Part operations
│   └── interior.ts           # Interior config operations
├── cabinetGenerators/        # KEEP - Pure generation functions
├── store/                    # KEEP - Zustand state management
└── config.ts                 # KEEP - Global constants
```

### Module Structure Pattern

Each domain module follows this pattern:

```typescript
// lib/domain/section.ts
import type { CabinetSection, ShelvesConfiguration, DrawerConfiguration } from '@/types';

// Types specific to this domain
export interface SectionBounds {
  startY: number;
  height: number;
}

export interface SectionValidationResult {
  valid: boolean;
  errors: string[];
}

// The domain module as a namespace-like object
export const Section = {
  // ============================================
  // CREATORS - Functions that create new objects
  // ============================================

  create: (contentType: SectionContentType): CabinetSection => {
    return {
      id: generateSectionId(),
      heightRatio: 1,
      contentType,
      shelvesConfig: contentType === 'SHELVES' ? DEFAULT_SHELVES_CONFIG : undefined,
      drawerConfig: contentType === 'DRAWERS' ? createDefaultDrawerConfig() : undefined,
    };
  },

  createEmpty: (): CabinetSection => Section.create('EMPTY'),

  createWithShelves: (count: number, depthPreset: ShelfDepthPreset = 'FULL'): CabinetSection => {
    const section = Section.create('SHELVES');
    return Section.updateShelvesCount(section, count);
  },

  // ============================================
  // UPDATERS - Functions that return modified copies
  // ============================================

  updateHeightRatio: (section: CabinetSection, ratio: number): CabinetSection => ({
    ...section,
    heightRatio: Math.max(0.1, ratio),
  }),

  updateContentType: (section: CabinetSection, type: SectionContentType): CabinetSection => ({
    ...section,
    contentType: type,
    shelvesConfig: type === 'SHELVES' ? (section.shelvesConfig ?? DEFAULT_SHELVES_CONFIG) : undefined,
    drawerConfig: type === 'DRAWERS' ? (section.drawerConfig ?? createDefaultDrawerConfig()) : undefined,
  }),

  updateShelvesCount: (section: CabinetSection, count: number): CabinetSection => ({
    ...section,
    shelvesConfig: section.shelvesConfig
      ? { ...section.shelvesConfig, count: Math.max(0, count) }
      : undefined,
  }),

  // ============================================
  // CALCULATORS - Pure calculation functions
  // ============================================

  calculateBounds: (
    sections: CabinetSection[],
    totalHeight: number,
    bodyThickness: number
  ): SectionBounds[] => {
    const interiorHeight = Math.max(totalHeight - bodyThickness * 2, 0);
    const totalRatio = sections.reduce((sum, s) => sum + s.heightRatio, 0);

    let currentY = bodyThickness;
    return sections.map((section) => {
      const height = (section.heightRatio / totalRatio) * interiorHeight;
      const bounds = { startY: currentY, height };
      currentY += height;
      return bounds;
    });
  },

  // ============================================
  // VALIDATORS - Functions that check validity
  // ============================================

  validate: (section: CabinetSection): SectionValidationResult => {
    const errors: string[] = [];

    if (section.heightRatio <= 0) {
      errors.push('Height ratio must be positive');
    }

    if (section.contentType === 'SHELVES' && !section.shelvesConfig) {
      errors.push('Shelves section must have shelvesConfig');
    }

    if (section.contentType === 'DRAWERS' && !section.drawerConfig) {
      errors.push('Drawers section must have drawerConfig');
    }

    return { valid: errors.length === 0, errors };
  },

  // ============================================
  // QUERIES - Functions that extract information
  // ============================================

  getShelfCount: (section: CabinetSection): number => {
    return section.shelvesConfig?.count ?? 0;
  },

  hasContent: (section: CabinetSection): boolean => {
    return section.contentType !== 'EMPTY';
  },

  getSummary: (section: CabinetSection): string => {
    switch (section.contentType) {
      case 'EMPTY': return 'Pusta';
      case 'SHELVES': return `${section.shelvesConfig?.count ?? 0} półek`;
      case 'DRAWERS': return `${section.drawerConfig?.zones.length ?? 0} stref szuflad`;
    }
  },
} as const;
```

---

## Detailed Module Specifications

### 1. Cabinet Module (`lib/domain/cabinet.ts`)

**Responsibilities:**
- Create cabinet configurations
- Update cabinet parameters
- Calculate cabinet bounds/dimensions
- Validate cabinet configurations

**Key Functions:**

```typescript
export const Cabinet = {
  // Creators
  create: (type: CabinetType, dimensions: Dimensions) => Cabinet,
  createKitchen: (width, height, depth, options?) => CabinetParams,
  createWardrobe: (width, height, depth, options?) => CabinetParams,

  // Updaters
  updateDimensions: (params: CabinetParams, dims: Partial<Dimensions>) => CabinetParams,
  updateInterior: (params: CabinetParams, interior: CabinetInteriorConfig) => CabinetParams,

  // Calculators
  calculateInteriorSpace: (params: CabinetParams) => InteriorSpace,
  calculatePartPositions: (params: CabinetParams) => PartPosition[],

  // Validators
  validate: (params: CabinetParams) => ValidationResult,
  canAddDoors: (params: CabinetParams) => boolean,

  // Queries
  hasDoors: (params: CabinetParams) => boolean,
  hasDrawers: (params: CabinetParams) => boolean,
  getPartCount: (params: CabinetParams) => number,
} as const;
```

### 2. Section Module (`lib/domain/section.ts`)

**Responsibilities:**
- Manage horizontal cabinet sections
- Calculate section heights
- Handle section content (shelves/drawers)

**Key Functions:**

```typescript
export const Section = {
  // Creators
  create: (contentType: SectionContentType) => CabinetSection,
  createEmpty: () => CabinetSection,
  createWithShelves: (count: number) => CabinetSection,
  createWithDrawers: (zoneCount: number) => CabinetSection,

  // Updaters
  updateContentType: (section, type) => CabinetSection,
  updateHeightRatio: (section, ratio) => CabinetSection,
  updateShelvesConfig: (section, config) => CabinetSection,
  updateDrawerConfig: (section, config) => CabinetSection,

  // Calculators
  calculateBounds: (sections, totalHeight, thickness) => SectionBounds[],
  calculateHeightMm: (section, sections, totalHeight) => number,

  // Validators
  validate: (section) => ValidationResult,

  // Queries
  hasContent: (section) => boolean,
  getSummary: (section) => string,
} as const;
```

### 3. Drawer Module (`lib/domain/drawer.ts`)

**Responsibilities:**
- Manage drawer zones and boxes
- Calculate drawer dimensions
- Handle box-to-front ratio logic

**Key Functions:**

```typescript
export const Drawer = {
  // Creators
  createConfig: (zoneCount: number, slideType: DrawerSlideType) => DrawerConfiguration,
  createZone: (hasExternalFront: boolean) => DrawerZone,
  createBox: (heightRatio?: number) => DrawerZoneBox,

  // Updaters
  addZone: (config: DrawerConfiguration, zone?: DrawerZone) => DrawerConfiguration,
  removeZone: (config: DrawerConfiguration, zoneId: string) => DrawerConfiguration,
  updateZone: (config, zoneId, patch) => DrawerConfiguration,
  addBoxToZone: (config, zoneId) => DrawerConfiguration,
  updateBoxToFrontRatio: (zone, ratio) => DrawerZone,

  // Calculators
  calculateZoneBounds: (zones, totalHeight, thickness) => ZoneBounds[],
  calculateBoxDimensions: (params: BoxDimensionParams) => BoxDimensions,
  calculateDrawerWidth: (cabinetWidth, thickness, slideConfig) => number,

  // Validators
  validate: (config: DrawerConfiguration) => ValidationResult,
  validateZone: (zone: DrawerZone) => ValidationResult,

  // Queries
  getTotalBoxCount: (config) => number,
  getFrontCount: (config) => number,
  getZoneHeight: (zone, zones, totalHeight) => number,
} as const;
```

### 4. Shelf Module (`lib/domain/shelf.ts`)

**Responsibilities:**
- Manage shelf configurations
- Calculate shelf positions
- Handle depth presets

**Key Functions:**

```typescript
export const Shelf = {
  // Creators
  create: (depthPreset?: ShelfDepthPreset) => ShelfConfig,
  createConfig: (count: number, mode?: 'UNIFORM' | 'MANUAL') => ShelvesConfiguration,

  // Updaters
  updateDepthPreset: (shelf, preset) => ShelfConfig,
  updateCustomDepth: (shelf, depth) => ShelfConfig,
  addShelf: (config: ShelvesConfiguration) => ShelvesConfiguration,
  removeShelf: (config, shelfId) => ShelvesConfiguration,

  // Calculators
  calculateDepth: (preset, customDepth, cabinetDepth) => number,
  calculatePositions: (config, sectionHeight) => number[],

  // Validators
  validate: (config: ShelvesConfiguration) => ValidationResult,

  // Queries
  getEffectiveDepth: (shelf, config, cabinetDepth) => number,
} as const;
```

### 5. Interior Module (`lib/domain/interior.ts`)

**Responsibilities:**
- High-level interior configuration management
- Coordinate sections, shelves, drawers

**Key Functions:**

```typescript
export const Interior = {
  // Creators
  create: () => CabinetInteriorConfig,
  createDefault: (type: 'shelves' | 'drawers' | 'mixed') => CabinetInteriorConfig,

  // Updaters
  addSection: (config, section?) => CabinetInteriorConfig,
  removeSection: (config, sectionId) => CabinetInteriorConfig,
  updateSection: (config, sectionId, patch) => CabinetInteriorConfig,
  reorderSections: (config, fromIndex, toIndex) => CabinetInteriorConfig,

  // Calculators
  calculateAllBounds: (config, cabinetHeight, thickness) => AllBounds,

  // Validators
  validate: (config) => ValidationResult,

  // Queries
  hasContent: (config) => boolean,
  getSummary: (config) => string,
  getTotalShelfCount: (config) => number,
  getTotalDrawerCount: (config) => number,
} as const;
```

### 6. Part Module (`lib/domain/part.ts`)

**Responsibilities:**
- Part creation and updates
- Transform calculations
- Bounding box operations

**Key Functions:**

```typescript
export const Part = {
  // Creators (from GeneratedPart to full Part)
  fromGenerated: (generated: GeneratedPart, now?: Date) => Part,

  // Updaters
  updatePosition: (part, position) => Part,
  updateRotation: (part, rotation) => Part,
  updateMaterial: (part, materialId) => Part,

  // Calculators
  calculateBoundingBox: (part) => BoundingBox,
  calculateWorldCorners: (part) => Vector3[],

  // Validators
  validate: (part) => ValidationResult,

  // Queries
  belongsToCabinet: (part, cabinetId) => boolean,
  getRole: (part) => CabinetPartRole | undefined,
} as const;
```

---

## Implementation Plan

### Phase 1: Foundation (Priority: High)

**Goal:** Create core infrastructure and most impactful modules.

#### Step 1.1: Create Domain Module Infrastructure
```
lib/domain/
├── index.ts          # Re-exports
├── types.ts          # Shared types (ValidationResult, etc.)
└── utils.ts          # Shared utilities
```

#### Step 1.2: Implement Section Module
- Most used in InteriorConfigDialog (1432 lines)
- High impact on code reduction
- Clear boundaries

**Files to create:**
- `lib/domain/section.ts`

**Files to refactor:**
- `components/ui/InteriorConfigDialog/SectionEditor.tsx` - extract calculations
- `lib/cabinetGenerators/interior/index.ts` - use Section.calculateBounds

#### Step 1.3: Implement Drawer Module
- Complex zone logic spread across files
- Second most complex domain

**Files to create:**
- `lib/domain/drawer.ts`

**Files to refactor:**
- `lib/cabinetGenerators/drawers/generator.ts` - use Drawer.calculateBoxDimensions
- `components/ui/InteriorConfigDialog/SectionEditor.tsx` - use Drawer helpers

### Phase 2: Core Modules (Priority: Medium)

#### Step 2.1: Implement Shelf Module
- Simpler domain, good for establishing patterns
- Used in both section and drawer contexts

#### Step 2.2: Implement Interior Module
- High-level coordination
- Depends on Section, Drawer, Shelf modules

#### Step 2.3: Implement Cabinet Module
- Top-level domain
- Depends on Interior module

### Phase 3: Integration (Priority: Medium)

#### Step 3.1: Implement Part Module
- Part transformations
- Bounding box calculations

#### Step 3.2: Refactor Generators
- Use domain modules in generators
- Reduce code duplication

#### Step 3.3: Refactor Components
- Replace inline calculations with domain module calls
- Improve readability

### Phase 4: Validation & Testing (Priority: Low - for later)

#### Step 4.1: Add Validation Layer
- Comprehensive validation in each module
- Use in UI for immediate feedback

#### Step 4.2: Add Unit Tests
- Test each domain module
- Pure functions are easy to test

---

## Migration Strategy

### Incremental Adoption

Domain modules can be adopted incrementally:

```typescript
// Before (current code)
const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);
const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
// ... more calculations

// After (with domain module)
import { Drawer } from '@/lib/domain';
const bounds = Drawer.calculateZoneBounds(zones, cabinetHeight, bodyThickness);
```

### No Breaking Changes

- Types remain plain interfaces (no migration needed)
- Store structure unchanged
- Generators can be refactored one at a time
- Components can adopt domain modules gradually

### Backward Compatibility

- Existing code continues to work
- New code uses domain modules
- No "big bang" migration required

---

## Benefits

### For Rapid Development

1. **Faster Feature Development**
   - Clear API for common operations
   - Less code to write for each feature
   - IDE autocomplete shows available operations

2. **Easier Debugging**
   - Business logic in one place
   - Clear input/output contracts
   - Easy to add logging/breakpoints

3. **Safer Refactoring**
   - Change domain module, all usages update
   - Type system catches breaking changes
   - Tests cover business logic

### For Code Quality

1. **Single Source of Truth**
   - One place for "how to create Section"
   - One place for "how to calculate bounds"
   - No more duplicated calculations

2. **Better Discoverability**
   - `Section.` shows all section operations
   - `Drawer.` shows all drawer operations
   - New developers onboard faster

3. **Testability**
   - Pure functions
   - No mocking required
   - Easy to test edge cases

---

## Example: Before vs After

### Before (Current InteriorConfigDialog)

```typescript
// SectionEditor.tsx - scattered calculations
const calculateSectionHeightMm = (section: CabinetSection) => {
  const totalRatio = config.sections.reduce((sum, s) => sum + s.heightRatio, 0);
  const interiorHeight = Math.max(cabinetHeight - bodyThickness * 2, 0);
  return Math.round((section.heightRatio / totalRatio) * interiorHeight);
};

// Drawer zone bounds calculation (duplicated from generator)
const totalRatio = zones.reduce((sum, z) => sum + z.heightRatio, 0);
const zoneHeights = zones.map(zone =>
  Math.round((zone.heightRatio / totalRatio) * sectionHeightMm)
);
```

### After (With Domain Modules)

```typescript
// SectionEditor.tsx - clean and discoverable
import { Section, Drawer } from '@/lib/domain';

const sectionHeightMm = Section.calculateHeightMm(
  section,
  config.sections,
  cabinetHeight,
  bodyThickness
);

const zoneBounds = Drawer.calculateZoneBounds(
  zones,
  sectionHeightMm,
  bodyThickness
);
```

---

## Files to Create

```
lib/domain/
├── index.ts              # Export all modules
├── types.ts              # ValidationResult, Bounds types
├── utils.ts              # Shared utilities (generateId, etc.)
├── cabinet.ts            # Cabinet domain module
├── section.ts            # Section domain module
├── drawer.ts             # Drawer domain module
├── shelf.ts              # Shelf domain module
├── interior.ts           # Interior domain module
└── part.ts               # Part domain module
```

**Total: 9 new files**

---

## Estimated Impact

### Code Reduction (Estimated)

| File | Current Lines | After Refactor | Reduction |
|------|---------------|----------------|-----------|
| SectionEditor.tsx | 1,432 | ~900 | ~35% |
| interior/index.ts | 339 | ~200 | ~40% |
| drawers/generator.ts | 427 | ~300 | ~30% |

### New Code (Domain Modules)

| Module | Estimated Lines |
|--------|-----------------|
| section.ts | ~200 |
| drawer.ts | ~250 |
| shelf.ts | ~100 |
| interior.ts | ~150 |
| cabinet.ts | ~200 |
| part.ts | ~100 |
| types.ts + utils.ts | ~100 |
| **Total** | **~1,100** |

**Net result:** Similar total lines, but much better organization and reusability.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Over-engineering | Start with most impactful modules only (Section, Drawer) |
| Breaking changes | Incremental adoption, no forced migration |
| Learning curve | Clear patterns, good documentation |
| Performance | Pure functions, no overhead vs current approach |

---

## Decision Points

Before implementing, consider:

1. **Start with Phase 1 only?**
   - Just Section and Drawer modules
   - ~500 lines of new code
   - Highest impact on current pain points

2. **Full implementation?**
   - All 6 modules
   - ~1,100 lines of new code
   - Comprehensive but more upfront work

3. **Alternative: Just utility functions?**
   - No namespace pattern
   - Simpler but less discoverable
   - `calculateSectionBounds()` vs `Section.calculateBounds()`

---

## Recommendation

**Start with Phase 1:** Implement Section and Drawer modules first.

These address the biggest pain points (InteriorConfigDialog complexity) with minimal investment. Evaluate after Phase 1 before proceeding to Phase 2.

**Timeline:** No time estimates per project guidelines. Steps are ordered by priority and dependency.