# Corner Cabinet Implementation Plan

## Overview

Implementation of corner kitchen cabinets - specialized cabinets designed for corner spaces where two walls meet. This plan covers internal corner cabinets (Phase 1) and external corner cabinets (Phase 2).

**Updated to align with current domain-driven architecture (December 2025)**

## Scope

### Phase 1: Internal Corner Cabinets (Primary)
Cabinets for internal corners (walls meeting at 90° or custom angles)

**Types:**
1. **L-Shaped (Diagonal)** - Most popular, diagonal front at 45°
2. **Blind Corner** - Partially hidden storage space, requires pull-out
3. **Lazy Susan** - Rotating carousel shelves (visual only initially)

### Phase 2: External Corner Cabinets (Future)
Cabinets for external corners (islands, peninsulas) - to be implemented later

---

## Architecture (Domain-Driven Approach)

### 1. New Types (`src/types/corner.ts`)

Create a new dedicated types file for corner cabinet types:

```typescript
// ============================================================================
// Corner Cabinet Types
// ============================================================================

/**
 * Corner cabinet sub-types for internal corners
 */
export type InternalCornerType = 'L_SHAPED' | 'BLIND_CORNER' | 'LAZY_SUSAN';

/**
 * Corner cabinet sub-types for external corners (Phase 2)
 */
export type ExternalCornerType = 'EXTERNAL_L_SHAPED' | 'EXTERNAL_DIAGONAL';

/**
 * Corner orientation - which direction the corner opens
 */
export type CornerOrientation = 'LEFT' | 'RIGHT';

/**
 * Door configuration for corner cabinets
 */
export type CornerDoorType =
  | 'BI_FOLD'        // Folding doors (2-part)
  | 'SINGLE_DIAGONAL' // Single door on diagonal front
  | 'DOUBLE_L'       // Two door sets (L-configuration)
  | 'NONE';          // No doors (open shelving)

/**
 * Dead zone handling presets
 */
export type DeadZonePreset =
  | 'MINIMAL'        // Smallest dead zone, maximum usable space
  | 'STANDARD'       // Balanced approach (default)
  | 'ACCESSIBLE'     // Larger opening for better access
  | 'CUSTOM';        // User-defined dimensions

/**
 * Wall sharing mode for adjacent cabinets
 */
export type WallSharingMode =
  | 'FULL_ISOLATION' // All walls present
  | 'SHARED_LEFT'    // Left wall shared with adjacent cabinet
  | 'SHARED_RIGHT'   // Right wall shared with adjacent cabinet
  | 'SHARED_BOTH';   // Both sides shared (rare)

/**
 * Dimension mode for corner arms
 */
export type CornerDimensionMode = 'SYMMETRIC' | 'ASYMMETRIC';

/**
 * Internal mechanism types (extensible for future)
 */
export type CornerMechanismType =
  | 'FIXED_SHELVES'  // Standard fixed shelves
  | 'LAZY_SUSAN'     // Rotating carousel (future)
  | 'PULL_OUT'       // Pull-out shelves/baskets (future)
  | 'MAGIC_CORNER';  // Magic corner system (future)

/**
 * Corner-specific configuration (embedded in CabinetParams)
 */
export interface CornerConfig {
  cornerType: InternalCornerType;
  cornerOrientation: CornerOrientation;

  // Dimensions
  dimensionMode: CornerDimensionMode;
  armA: number;        // Length of first arm (mm)
  armB: number;        // Length of second arm (mm) - equals armA if SYMMETRIC
  cornerAngle: number; // Angle in degrees (default: 90)

  // Dead zone handling
  deadZonePreset: DeadZonePreset;
  deadZoneDepth?: number;  // Custom depth when preset is CUSTOM
  deadZoneWidth?: number;  // Custom width when preset is CUSTOM

  // Wall sharing
  wallSharingMode: WallSharingMode;

  // Doors
  cornerDoorType: CornerDoorType;

  // Internal mechanism
  mechanismType: CornerMechanismType;

  // L-Shaped specific
  diagonalWidth?: number; // Width of diagonal front (auto-calculated if not provided)
}
```

### 2. Update CabinetType (`src/types/cabinet.ts`)

```typescript
export type CabinetType =
  | 'KITCHEN'
  | 'WARDROBE'
  | 'BOOKSHELF'
  | 'DRAWER'
  | 'CORNER_INTERNAL'   // Phase 1
  | 'CORNER_EXTERNAL';  // Phase 2

// Add to CabinetParams discriminated union
export interface CornerInternalCabinetParams extends BaseCabinetDimensions {
  type: 'CORNER_INTERNAL';
  cornerConfig: CornerConfig;
  interiorConfig?: CabinetInteriorConfig; // Uses existing zone-based interior system
  doorConfig?: DoorConfig;
  handleConfig?: HandleConfig;
}

export interface CornerExternalCabinetParams extends BaseCabinetDimensions {
  type: 'CORNER_EXTERNAL';
  cornerConfig: CornerConfig;
  interiorConfig?: CabinetInteriorConfig;
  doorConfig?: DoorConfig;
  handleConfig?: HandleConfig;
}

// Update the union
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams
  | CornerInternalCabinetParams
  | CornerExternalCabinetParams;
```

### 3. New Part Roles (`src/types/cabinet.ts`)

Add corner-specific roles to `CabinetPartRole`:

```typescript
export type CabinetPartRole =
  // ... existing roles ...
  // Corner-specific roles
  | 'CORNER_LEFT_SIDE'     // Left arm side panel
  | 'CORNER_RIGHT_SIDE'    // Right arm side panel
  | 'CORNER_BACK_LEFT'     // Left arm back panel
  | 'CORNER_BACK_RIGHT'    // Right arm back panel
  | 'CORNER_DIAGONAL_FRONT'// Diagonal front panel (L-shaped)
  | 'CORNER_BOTTOM'        // L-shaped or trapezoid bottom
  | 'CORNER_TOP'           // L-shaped or trapezoid top
  | 'CORNER_SHELF'         // Corner shelf (L-shaped or trapezoid)
  | 'CORNER_DOOR_LEFT'     // Bi-fold left part
  | 'CORNER_DOOR_RIGHT'    // Bi-fold right part
  | 'CORNER_FILLER';       // Filler panel for dead zone
```

---

## Domain Module (`src/lib/domain/corner.ts`)

Following the established domain-driven pattern (like `CabinetDomain`, `SectionDomain`):

```typescript
// ============================================================================
// Corner Cabinet Domain
// ============================================================================

import type {
  CornerConfig,
  CornerInternalCabinetParams,
  InternalCornerType,
  CornerOrientation,
  DeadZonePreset,
  CornerDimensionMode,
  CornerMechanismType,
  CornerDoorType,
  WallSharingMode,
} from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEAD_ZONE_PRESETS = {
  MINIMAL: { widthRatio: 0.15, depthRatio: 0.15 },
  STANDARD: { widthRatio: 0.25, depthRatio: 0.25 },
  ACCESSIBLE: { widthRatio: 0.35, depthRatio: 0.35 },
} as const;

export const CORNER_DEFAULTS = {
  cornerAngle: 90,
  deadZonePreset: 'STANDARD' as DeadZonePreset,
  dimensionMode: 'SYMMETRIC' as CornerDimensionMode,
  mechanismType: 'FIXED_SHELVES' as CornerMechanismType,
  cornerDoorType: 'SINGLE_DIAGONAL' as CornerDoorType,
  wallSharingMode: 'FULL_ISOLATION' as WallSharingMode,
  armA: 800,
  armB: 800,
} as const;

export const CORNER_LIMITS = {
  MIN_ARM: 300,
  MAX_ARM: 1500,
  MIN_ANGLE: 45,
  MAX_ANGLE: 135,
} as const;

// ============================================================================
// CREATORS
// ============================================================================

export function createCornerConfig(
  cornerType: InternalCornerType = 'L_SHAPED',
  orientation: CornerOrientation = 'LEFT'
): CornerConfig {
  return {
    cornerType,
    cornerOrientation: orientation,
    dimensionMode: CORNER_DEFAULTS.dimensionMode,
    armA: CORNER_DEFAULTS.armA,
    armB: CORNER_DEFAULTS.armB,
    cornerAngle: CORNER_DEFAULTS.cornerAngle,
    deadZonePreset: CORNER_DEFAULTS.deadZonePreset,
    wallSharingMode: CORNER_DEFAULTS.wallSharingMode,
    cornerDoorType: CORNER_DEFAULTS.cornerDoorType,
    mechanismType: CORNER_DEFAULTS.mechanismType,
  };
}

export function createCornerInternalParams(
  width: number,
  height: number,
  depth: number,
  cornerConfig?: Partial<CornerConfig>
): CornerInternalCabinetParams {
  return {
    type: 'CORNER_INTERNAL',
    width,
    height,
    depth,
    cornerConfig: { ...createCornerConfig(), ...cornerConfig },
  };
}

// ============================================================================
// UPDATERS (Immutable)
// ============================================================================

export function updateCornerType(
  config: CornerConfig,
  cornerType: InternalCornerType
): CornerConfig {
  return { ...config, cornerType };
}

export function updateOrientation(
  config: CornerConfig,
  orientation: CornerOrientation
): CornerConfig {
  return { ...config, cornerOrientation: orientation };
}

export function updateArmDimensions(
  config: CornerConfig,
  armA: number,
  armB?: number
): CornerConfig {
  const effectiveArmB = config.dimensionMode === 'SYMMETRIC' ? armA : (armB ?? config.armB);
  return { ...config, armA, armB: effectiveArmB };
}

export function updateDimensionMode(
  config: CornerConfig,
  mode: CornerDimensionMode
): CornerConfig {
  const armB = mode === 'SYMMETRIC' ? config.armA : config.armB;
  return { ...config, dimensionMode: mode, armB };
}

export function updateDeadZonePreset(
  config: CornerConfig,
  preset: DeadZonePreset
): CornerConfig {
  return { ...config, deadZonePreset: preset };
}

export function updateWallSharingMode(
  config: CornerConfig,
  mode: WallSharingMode
): CornerConfig {
  return { ...config, wallSharingMode: mode };
}

// ============================================================================
// CALCULATORS
// ============================================================================

export function calculateLShapePoints(
  armA: number,
  armB: number,
  depth: number,
  cornerAngle: number,
  deadZonePreset: DeadZonePreset,
  customDeadZone?: { width: number; depth: number }
): [number, number][] {
  const deadZone = getDeadZoneDimensions(deadZonePreset, armA, armB, depth, customDeadZone);

  return [
    [0, 0],
    [armA, 0],
    [armA, depth],
    [depth + deadZone.width, depth],
    [depth + deadZone.width, depth + deadZone.depth],
    [0, depth + deadZone.depth],
    [0, armB],
  ];
}

export function calculateDiagonalWidth(
  armA: number,
  armB: number,
  depth: number,
  cornerAngle: number = 90
): number {
  if (cornerAngle === 90) {
    const avgArm = (armA + armB) / 2;
    const deadZoneSize = avgArm * DEAD_ZONE_PRESETS.STANDARD.widthRatio;
    return Math.sqrt(2 * Math.pow(deadZoneSize, 2));
  }
  const radians = (cornerAngle * Math.PI) / 180;
  return Math.sqrt(
    Math.pow(depth, 2) + Math.pow(depth, 2) - 2 * depth * depth * Math.cos(radians)
  );
}

export function getDeadZoneDimensions(
  preset: DeadZonePreset,
  armA: number,
  armB: number,
  depth: number,
  custom?: { width: number; depth: number }
): { width: number; depth: number } {
  if (preset === 'CUSTOM' && custom) return custom;
  const presetConfig = DEAD_ZONE_PRESETS[preset] || DEAD_ZONE_PRESETS.STANDARD;
  const avgArm = (armA + armB) / 2;
  return {
    width: avgArm * presetConfig.widthRatio,
    depth: avgArm * presetConfig.depthRatio,
  };
}

export function calculateShelfPositions(
  cabinetHeight: number,
  materialThickness: number,
  shelfCount: number
): number[] {
  if (shelfCount <= 0) return [];
  const usableHeight = cabinetHeight - 2 * materialThickness;
  const spacing = usableHeight / (shelfCount + 1);
  return Array.from({ length: shelfCount }, (_, i) => materialThickness + spacing * (i + 1));
}

// ============================================================================
// VALIDATORS
// ============================================================================

export interface CornerValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCornerConfig(config: CornerConfig): CornerValidationResult {
  const errors: string[] = [];

  if (config.armA < CORNER_LIMITS.MIN_ARM || config.armA > CORNER_LIMITS.MAX_ARM) {
    errors.push(`Arm A must be between ${CORNER_LIMITS.MIN_ARM}-${CORNER_LIMITS.MAX_ARM}mm`);
  }

  if (config.dimensionMode === 'ASYMMETRIC') {
    if (config.armB < CORNER_LIMITS.MIN_ARM || config.armB > CORNER_LIMITS.MAX_ARM) {
      errors.push(`Arm B must be between ${CORNER_LIMITS.MIN_ARM}-${CORNER_LIMITS.MAX_ARM}mm`);
    }
  }

  if (config.cornerAngle < CORNER_LIMITS.MIN_ANGLE || config.cornerAngle > CORNER_LIMITS.MAX_ANGLE) {
    errors.push(`Corner angle must be between ${CORNER_LIMITS.MIN_ANGLE}-${CORNER_LIMITS.MAX_ANGLE}deg`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// QUERIES
// ============================================================================

export function isSymmetric(config: CornerConfig): boolean {
  return config.dimensionMode === 'SYMMETRIC';
}

export function hasDiagonalFront(config: CornerConfig): boolean {
  return config.cornerType === 'L_SHAPED';
}

export function hasSharedWalls(config: CornerConfig): boolean {
  return config.wallSharingMode !== 'FULL_ISOLATION';
}

export function getTypeLabel(type: InternalCornerType): string {
  const labels: Record<InternalCornerType, string> = {
    L_SHAPED: 'L-ksztaltna (diagonalna)',
    BLIND_CORNER: 'Slepa narozna',
    LAZY_SUSAN: 'Karuzela (Lazy Susan)',
  };
  return labels[type];
}

export function getSummary(config: CornerConfig): string {
  const type = getTypeLabel(config.cornerType);
  const dims = config.dimensionMode === 'SYMMETRIC'
    ? `${config.armA}mm`
    : `${config.armA}x${config.armB}mm`;
  return `${type} ${dims}`;
}

// ============================================================================
// EXPORT DOMAIN OBJECT
// ============================================================================

export const CornerDomain = {
  DEAD_ZONE_PRESETS,
  CORNER_DEFAULTS,
  CORNER_LIMITS,
  createCornerConfig,
  createCornerInternalParams,
  updateCornerType,
  updateOrientation,
  updateArmDimensions,
  updateDimensionMode,
  updateDeadZonePreset,
  updateWallSharingMode,
  calculateLShapePoints,
  calculateDiagonalWidth,
  getDeadZoneDimensions,
  calculateShelfPositions,
  validateCornerConfig,
  isSymmetric,
  hasDiagonalFront,
  hasSharedWalls,
  getTypeLabel,
  getSummary,
};

export default CornerDomain;
```

---

## Generator Files Structure

Following the existing generator pattern in `src/lib/cabinetGenerators/`:

```
apps/app/src/lib/cabinetGenerators/
├── corner/
│   ├── index.ts              # Main generator + re-exports
│   ├── lShapedGenerator.ts   # L-shaped corner generation
│   ├── blindCornerGenerator.ts # Blind corner generation
│   ├── lazySusanGenerator.ts # Lazy Susan generation (Phase 1C)
│   ├── cornerParts.ts        # Shared part generation utilities
│   ├── cornerDoors.ts        # Corner-specific door generation
│   └── cornerShelves.ts      # Corner shelf generation
```

### Main Generator (`corner/index.ts`)

```typescript
import type { CornerInternalCabinetParams, CabinetMaterials, Material } from '@/types';
import type { GeneratedPart } from '../types';
import { generateLShapedCorner } from './lShapedGenerator';
import { generateBlindCorner } from './blindCornerGenerator';
import { generateLazySusan } from './lazySusanGenerator';

export function generateCornerInternalCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CornerInternalCabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  const { cornerConfig } = params;

  switch (cornerConfig.cornerType) {
    case 'L_SHAPED':
      return generateLShapedCorner(cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial);
    case 'BLIND_CORNER':
      return generateBlindCorner(cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial);
    case 'LAZY_SUSAN':
      return generateLazySusan(cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial);
    default:
      return generateLShapedCorner(cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial);
  }
}
```

---

## Store Integration

### Update Cabinet Slice (`src/lib/store/slices/cabinetSlice.ts`)

Add corner cabinet support to `addCabinet` action:

```typescript
import { generateCornerInternalCabinet } from '@/lib/cabinetGenerators/corner';

// In addCabinet action switch statement:
case 'CORNER_INTERNAL':
  generatedParts = generateCornerInternalCabinet(
    cabinetId,
    furnitureId,
    params as CornerInternalCabinetParams,
    materials,
    bodyMaterial,
    backMaterial
  );
  break;

case 'CORNER_EXTERNAL':
  // Phase 2 - not yet implemented
  generatedParts = [];
  break;
```

### Update Generator Factory (`src/lib/cabinetGenerators/index.ts`)

```typescript
import { generateCornerInternalCabinet } from './corner';

export function getGeneratorForType(type: CabinetType) {
  switch (type) {
    case 'KITCHEN':
      return generateKitchenCabinet;
    case 'WARDROBE':
      return generateWardrobe;
    case 'BOOKSHELF':
      return generateBookshelf;
    case 'DRAWER':
      return generateDrawerCabinet;
    case 'CORNER_INTERNAL':
      return generateCornerInternalCabinet;
    case 'CORNER_EXTERNAL':
      return () => []; // Phase 2
    default:
      return generateKitchenCabinet;
  }
}
```

### Add to Config (`src/lib/config.ts`)

```typescript
// Corner cabinet presets
export const CORNER_CABINET_PRESETS: Record<InternalCornerType, Partial<CornerConfig>> = {
  L_SHAPED: {
    cornerType: 'L_SHAPED',
    cornerDoorType: 'SINGLE_DIAGONAL',
    mechanismType: 'FIXED_SHELVES',
  },
  BLIND_CORNER: {
    cornerType: 'BLIND_CORNER',
    cornerDoorType: 'NONE',
    mechanismType: 'PULL_OUT',
  },
  LAZY_SUSAN: {
    cornerType: 'LAZY_SUSAN',
    cornerDoorType: 'BI_FOLD',
    mechanismType: 'LAZY_SUSAN',
  },
};
```

---

## UI Components

### New Components Structure

```
apps/app/src/components/ui/
├── corner/
│   ├── CornerCabinetDialog.tsx    # Main corner cabinet creation dialog
│   ├── CornerTypeSelector.tsx     # Visual selector for corner types
│   ├── CornerDimensionInput.tsx   # Arms A/B input with symmetric toggle
│   ├── DeadZonePresetSelector.tsx # Dead zone preset buttons
│   └── WallSharingSelector.tsx    # Wall sharing mode selector
```

### Integration with CabinetTemplateDialog

```tsx
// In CabinetTemplateDialog.tsx - add corner option
const CABINET_CATEGORIES = [
  { id: 'kitchen', label: 'Kuchenna', icon: ChefHat },
  { id: 'corner', label: 'Narozna', icon: CornerUpRight, isNew: true },
  { id: 'wardrobe', label: 'Szafa', icon: Shirt },
  { id: 'bookshelf', label: 'Regal', icon: BookOpen },
  { id: 'drawer', label: 'Szufladowa', icon: Archive },
];
```

---

## Implementation Phases

### Phase 1A: Core Types & Domain Module
1. [ ] Create `src/types/corner.ts` with all corner types
2. [ ] Update `src/types/cabinet.ts` with corner cabinet types and part roles
3. [ ] Update `src/types/index.ts` to export corner types
4. [ ] Create `src/lib/domain/corner.ts` domain module
5. [ ] Update `src/lib/domain/index.ts` to export CornerDomain

### Phase 1B: L-Shaped Corner Generator
1. [ ] Create `src/lib/cabinetGenerators/corner/` directory
2. [ ] Implement `corner/index.ts` main generator
3. [ ] Implement `corner/lShapedGenerator.ts`
4. [ ] Implement `corner/cornerParts.ts` utilities
5. [ ] Implement `corner/cornerShelves.ts`
6. [ ] Update `cabinetGenerators/index.ts` with corner generator

### Phase 1C: Store & Factory Integration
1. [ ] Update `cabinetSlice.ts` with corner support
2. [ ] Update generator factory in `cabinetGenerators/index.ts`
3. [ ] Add corner presets to `config.ts`

### Phase 1D: UI Components
1. [ ] Create `CornerTypeSelector.tsx`
2. [ ] Create `CornerDimensionInput.tsx`
3. [ ] Create `DeadZonePresetSelector.tsx`
4. [ ] Create `CornerCabinetDialog.tsx`
5. [ ] Integrate with `CabinetTemplateDialog.tsx`

### Phase 1E: Doors & Advanced Features
1. [ ] Implement `corner/cornerDoors.ts` (bi-fold, diagonal)
2. [ ] Implement blind corner generator
3. [ ] Implement wall sharing mode
4. [ ] Implement non-90 degree angle support

### Phase 2: External Corner (Future)
1. [ ] External corner generator
2. [ ] External corner UI
3. [ ] Island/peninsula integration

---

## Testing Checklist

- [ ] L-shaped corner creates correct parts
- [ ] Polygon geometry renders properly in 3D (Part3D handles POLYGON shapeType)
- [ ] Dead zone presets produce valid dimensions
- [ ] Wall sharing removes correct panels
- [ ] Door configurations work
- [ ] CSV export handles polygon parts
- [ ] Validation catches invalid configurations
- [ ] PropertiesPanel shows corner-specific options
- [ ] Domain functions are pure and testable

---

## Success Criteria

1. User can create L-shaped corner cabinet from template dialog
2. All parts render correctly in 3D view
3. Domain functions follow established patterns (creators, updaters, calculators, validators, queries)
4. Integration with existing zone-based interior system works
5. CSV export includes corner parts correctly
6. Architecture supports future corner types (blind, lazy susan, external)
