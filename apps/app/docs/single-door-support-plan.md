# Plan: Single Door Support, Opening Directions, and Handle System

## Current State

- Cabinet creation happens in `CabinetTemplateDialog` (Sidebar → "Dodaj szafkę"): type selection, dimensions, `topBottomPlacement`, shelves, and boolean `hasDoors` (kitchen) / `doorCount` (wardrobe).
- `addCabinet` (store/slices/cabinetSlice.ts) calls generator from `cabinetGenerators.ts`; only `generateKitchenCabinet` is implemented – always creates a pair of fronts with 3mm gap (role `DOOR`, index 0/1), without hinge/opening direction info.
- "Properties" tab (`PropertiesPanel` + `CabinetParameterEditor`) allows changing the same parameters as the wizard; changing parameters calls `updateCabinetParams` and regenerates parts while preserving transforms.
- Data model lacks fields describing door layout (single/double), opening side, opening direction (horizontal/vertical), and handle configuration; `CabinetPartMetadata` only stores `role` and `index`.

---

## Goals

1. **Door Layout**: Single or double door selection in wizard and properties panel
2. **Horizontal Opening**: Left-hinged or right-hinged for single doors
3. **Vertical Opening**: Lift-up doors (top-hinged, opening upward)
4. **Handle System**: Configurable handle types and positions for fronts
5. **Backward Compatibility**: Existing cabinets work with default values (double doors, no handles)

---

## Part 1: Door Layout & Opening Directions

### 1.1 Type Definitions

**File:** `apps/app/src/types/index.ts`

```typescript
// ============================================================================
// Door Configuration Types
// ============================================================================

/**
 * Door layout type - single or double doors
 */
export type DoorLayout = 'SINGLE' | 'DOUBLE';

/**
 * Hinge side for horizontally opening doors
 */
export type HingeSide = 'LEFT' | 'RIGHT';

/**
 * Door opening direction
 * - HORIZONTAL: Standard side-hinged doors (left or right)
 * - LIFT_UP: Top-hinged doors that open upward (lift mechanisms)
 * - FOLD_DOWN: Bottom-hinged doors that fold down (rarely used)
 */
export type DoorOpeningDirection = 'HORIZONTAL' | 'LIFT_UP' | 'FOLD_DOWN';

/**
 * Door configuration for cabinet parameters
 */
export interface DoorConfig {
  layout: DoorLayout;
  openingDirection: DoorOpeningDirection;
  hingeSide?: HingeSide; // Only for HORIZONTAL + SINGLE
}

/**
 * Extended metadata for door parts
 */
export interface DoorMetadata {
  hingeSide?: HingeSide;
  openingDirection: DoorOpeningDirection;
  openingAngle?: number; // Future: for animation (0-120 degrees)
}
```

**Extend `KitchenCabinetParams`:**

```typescript
export interface KitchenCabinetParams extends CabinetBaseParams {
  type: 'KITCHEN';
  shelfCount: number;
  hasDoors: boolean;
  // NEW: Door configuration
  doorConfig?: DoorConfig; // Optional for backward compatibility
  handleConfig?: HandleConfig; // See Part 2
}
```

**Extend `CabinetPartMetadata`:**

```typescript
export interface CabinetPartMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number;
  // NEW: Door-specific metadata
  doorMetadata?: DoorMetadata;
  handleMetadata?: HandleMetadata; // See Part 2
}
```

### 1.2 Default Values & Migration

**File:** `apps/app/src/lib/config.ts`

```typescript
export const DEFAULT_DOOR_CONFIG: DoorConfig = {
  layout: 'DOUBLE',
  openingDirection: 'HORIZONTAL',
  hingeSide: 'LEFT', // For single doors
};
```

**Persist migration in store:**

```typescript
migrate: (persistedState: any, version: number) => {
  if (version < X) {
    // Add default doorConfig to existing cabinets with doors
    persistedState.cabinets = persistedState.cabinets?.map((cabinet: any) => {
      if (cabinet.params?.hasDoors && !cabinet.params.doorConfig) {
        return {
          ...cabinet,
          params: {
            ...cabinet.params,
            doorConfig: DEFAULT_DOOR_CONFIG,
          },
        };
      }
      return cabinet;
    });
  }
  return persistedState;
};
```

### 1.3 Generator Modifications

**File:** `apps/app/src/lib/cabinetGenerators.ts`

```typescript
function generateDoors(
  cabinetId: string,
  furnitureId: string,
  width: number,
  height: number,
  depth: number,
  thickness: number,
  frontMaterialId: string,
  doorConfig: DoorConfig,
  handleConfig?: HandleConfig
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  const FRONT_MARGIN = 2; // mm clearance on edges
  const DOOR_GAP = 3; // mm gap between double doors

  const availableWidth = width - FRONT_MARGIN * 2;
  const doorHeight = height - FRONT_MARGIN * 2;

  if (doorConfig.layout === 'SINGLE') {
    // Single door - full width
    const doorWidth = availableWidth;

    parts.push({
      name: 'Front',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [0, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 0,
        doorMetadata: {
          hingeSide: doorConfig.hingeSide,
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, 'SINGLE', doorConfig.hingeSide) : undefined,
      },
    });
  } else {
    // Double doors
    const doorWidth = (availableWidth - DOOR_GAP) / 2;

    // Left door
    parts.push({
      name: 'Front lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [-doorWidth / 2 - DOOR_GAP / 2, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 0,
        doorMetadata: {
          hingeSide: 'LEFT',
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, 'DOUBLE_LEFT') : undefined,
      },
    });

    // Right door
    parts.push({
      name: 'Front prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [doorWidth / 2 + DOOR_GAP / 2, height / 2, depth / 2 + thickness / 2],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR',
        index: 1,
        doorMetadata: {
          hingeSide: 'RIGHT',
          openingDirection: doorConfig.openingDirection,
        },
        handleMetadata: handleConfig ? generateHandleMetadata(handleConfig, doorWidth, doorHeight, 'DOUBLE_RIGHT') : undefined,
      },
    });
  }

  return parts;
}
```

### 1.4 Lift-Up Door Specifics

Lift-up doors (LIFT_UP) differ from standard doors:

1. **Hinge Position**: Top edge instead of side
2. **Lift Mechanisms**: Typically use gas struts, Aventos, or similar
3. **Handle Position**: Usually at bottom edge or uses push-to-open
4. **Cabinet Types**: Common for wall cabinets (górne szafki)

```typescript
// Lift-up door metadata example
const liftUpDoorMetadata: DoorMetadata = {
  openingDirection: 'LIFT_UP',
  hingeSide: undefined, // Not applicable for lift-up
  openingAngle: 90, // Future: for animation
};

// Handle placement for lift-up doors
function getHandlePositionForLiftUp(doorWidth: number, doorHeight: number): HandlePosition {
  return {
    x: doorWidth / 2, // Centered horizontally
    y: 50, // 50mm from bottom edge
    orientation: 'HORIZONTAL',
  };
}
```

---

## Part 2: Handle System

### 2.1 Handle Type Definitions

**File:** `apps/app/src/types/index.ts`

```typescript
// ============================================================================
// Handle Types
// ============================================================================

/**
 * Handle category - broad classification
 */
export type HandleCategory = 'TRADITIONAL' | 'MODERN' | 'HANDLELESS';

/**
 * Traditional handle types
 */
export type TraditionalHandleType =
  | 'BAR'        // Rękojeść / reling (bar/rail handle)
  | 'STRIP'      // Listwa (strip/profile handle)
  | 'KNOB';      // Gałka (round knob)

/**
 * Modern handle types
 */
export type ModernHandleType =
  | 'MILLED'           // Uchwyt frezowany (routed into top edge of front)
  | 'GOLA'             // System GOLA (integrated groove/channel)
  | 'EDGE_MOUNTED';    // Uchwyt krawędziowy nakładany (edge-mounted profile)

/**
 * Handleless solutions
 */
export type HandlelessType =
  | 'TIP_ON'           // TIP-ON / push-to-open (Blum system)
  | 'PUSH_LATCH';      // Push latch mechanism

/**
 * Union of all handle types
 */
export type HandleType = TraditionalHandleType | ModernHandleType | HandlelessType;

/**
 * Handle orientation on the door
 */
export type HandleOrientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Handle position preset for easy selection
 */
export type HandlePositionPreset =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'TOP_CENTER'
  | 'MIDDLE_LEFT'
  | 'MIDDLE_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_CENTER'
  | 'CUSTOM';

/**
 * Handle dimensions (for visualization and reports)
 */
export interface HandleDimensions {
  length: number;       // mm - for bars/strips
  width?: number;       // mm - for strips
  height?: number;      // mm - handle projection from surface
  diameter?: number;    // mm - for knobs
  holeSpacing?: number; // mm - distance between mounting holes (CC - center to center)
}

/**
 * Handle position on the door
 */
export interface HandlePosition {
  preset: HandlePositionPreset;
  x?: number; // mm from door center (for CUSTOM)
  y?: number; // mm from door center (for CUSTOM)
  offsetFromEdge?: number; // mm from nearest edge
}

/**
 * Complete handle configuration
 */
export interface HandleConfig {
  type: HandleType;
  category: HandleCategory;
  dimensions?: HandleDimensions;
  position: HandlePosition;
  orientation: HandleOrientation;
  // Visual properties
  finish?: string; // e.g., 'chrome', 'brushed_nickel', 'black_matte', 'gold'
  // For milled handles
  milledDepth?: number; // mm - depth of routed groove
  milledWidth?: number; // mm - width of finger grip
}

/**
 * Handle metadata stored on door parts
 */
export interface HandleMetadata {
  config: HandleConfig;
  actualPosition: { x: number; y: number }; // Calculated position on door
}
```

### 2.2 Handle Presets & Defaults

**File:** `apps/app/src/lib/handlePresets.ts`

```typescript
import type { HandleConfig, HandleDimensions, HandlePosition } from '@/types';

// ============================================================================
// Standard Handle Dimensions
// ============================================================================

export const HANDLE_DIMENSIONS: Record<string, HandleDimensions> = {
  // Bar handles (rękojeści)
  BAR_128: { length: 128, holeSpacing: 128, height: 35 },
  BAR_160: { length: 160, holeSpacing: 160, height: 35 },
  BAR_192: { length: 192, holeSpacing: 192, height: 35 },
  BAR_256: { length: 256, holeSpacing: 256, height: 35 },
  BAR_320: { length: 320, holeSpacing: 320, height: 35 },
  BAR_480: { length: 480, holeSpacing: 480, height: 35 },
  BAR_640: { length: 640, holeSpacing: 640, height: 35 },

  // Strip handles (listwy)
  STRIP_200: { length: 200, width: 20, height: 25 },
  STRIP_400: { length: 400, width: 20, height: 25 },
  STRIP_600: { length: 600, width: 20, height: 25 },
  STRIP_FULL: { length: 0, width: 20, height: 25 }, // Full door width

  // Knobs (gałki)
  KNOB_SMALL: { diameter: 25, height: 25 },
  KNOB_MEDIUM: { diameter: 32, height: 30 },
  KNOB_LARGE: { diameter: 40, height: 35 },

  // Milled (frezowane)
  MILLED_STANDARD: { length: 0, milledDepth: 15, milledWidth: 40 }, // Full width
  MILLED_PARTIAL: { length: 300, milledDepth: 15, milledWidth: 40 },

  // GOLA profiles
  GOLA_C: { length: 0, height: 37 }, // C-profile (horizontal at top)
  GOLA_L: { length: 0, height: 65 }, // L-profile (vertical side)
  GOLA_J: { length: 0, height: 38 }, // J-profile (under countertop)
};

// ============================================================================
// Handle Position Calculations
// ============================================================================

export function calculateHandlePosition(
  config: HandleConfig,
  doorWidth: number,
  doorHeight: number,
  doorType: 'SINGLE' | 'DOUBLE_LEFT' | 'DOUBLE_RIGHT',
  hingeSide?: 'LEFT' | 'RIGHT'
): { x: number; y: number } {
  const { preset, offsetFromEdge = 30 } = config.position;

  // Default offset from edge (mm)
  const edgeOffset = offsetFromEdge;

  // For bars/strips, position is at center of handle
  // For knobs, position is at center of knob

  switch (preset) {
    case 'TOP_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: doorHeight / 2 - edgeOffset };
    case 'TOP_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: doorHeight / 2 - edgeOffset };
    case 'TOP_CENTER':
      return { x: 0, y: doorHeight / 2 - edgeOffset };
    case 'MIDDLE_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: 0 };
    case 'MIDDLE_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: 0 };
    case 'BOTTOM_LEFT':
      return { x: -doorWidth / 2 + edgeOffset, y: -doorHeight / 2 + edgeOffset };
    case 'BOTTOM_RIGHT':
      return { x: doorWidth / 2 - edgeOffset, y: -doorHeight / 2 + edgeOffset };
    case 'BOTTOM_CENTER':
      return { x: 0, y: -doorHeight / 2 + edgeOffset };
    case 'CUSTOM':
      return { x: config.position.x ?? 0, y: config.position.y ?? 0 };
    default:
      // Smart positioning based on door type and hinge side
      return getSmartHandlePosition(config, doorWidth, doorHeight, doorType, hingeSide);
  }
}

function getSmartHandlePosition(
  config: HandleConfig,
  doorWidth: number,
  doorHeight: number,
  doorType: 'SINGLE' | 'DOUBLE_LEFT' | 'DOUBLE_RIGHT',
  hingeSide?: 'LEFT' | 'RIGHT'
): { x: number; y: number } {
  const edgeOffset = 30;

  // Handle should be on opposite side of hinge
  if (doorType === 'SINGLE') {
    const handleSide = hingeSide === 'LEFT' ? 'RIGHT' : 'LEFT';
    const x = handleSide === 'LEFT' ? -doorWidth / 2 + edgeOffset : doorWidth / 2 - edgeOffset;
    return { x, y: 0 }; // Middle height
  }

  if (doorType === 'DOUBLE_LEFT') {
    // Left door - handle on right side (near center gap)
    return { x: doorWidth / 2 - edgeOffset, y: 0 };
  }

  if (doorType === 'DOUBLE_RIGHT') {
    // Right door - handle on left side (near center gap)
    return { x: -doorWidth / 2 + edgeOffset, y: 0 };
  }

  return { x: 0, y: 0 };
}

// ============================================================================
// Handle Configuration Presets
// ============================================================================

export const HANDLE_PRESETS: Record<string, HandleConfig> = {
  // Traditional - Bar handles
  BAR_128_HORIZONTAL: {
    type: 'BAR',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.BAR_128,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 30 },
    orientation: 'HORIZONTAL',
    finish: 'chrome',
  },
  BAR_320_VERTICAL: {
    type: 'BAR',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.BAR_320,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 30 },
    orientation: 'VERTICAL',
    finish: 'chrome',
  },

  // Traditional - Strip handles
  STRIP_EDGE: {
    type: 'STRIP',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.STRIP_FULL,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'brushed_nickel',
  },

  // Traditional - Knobs
  KNOB_CLASSIC: {
    type: 'KNOB',
    category: 'TRADITIONAL',
    dimensions: HANDLE_DIMENSIONS.KNOB_MEDIUM,
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 40 },
    orientation: 'HORIZONTAL', // N/A for knobs but required
    finish: 'chrome',
  },

  // Modern - Milled
  MILLED_TOP_EDGE: {
    type: 'MILLED',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.MILLED_STANDARD,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    milledDepth: 15,
    milledWidth: 40,
  },

  // Modern - GOLA
  GOLA_HORIZONTAL: {
    type: 'GOLA',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.GOLA_C,
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'aluminum',
  },
  GOLA_VERTICAL: {
    type: 'GOLA',
    category: 'MODERN',
    dimensions: HANDLE_DIMENSIONS.GOLA_L,
    position: { preset: 'MIDDLE_LEFT', offsetFromEdge: 0 },
    orientation: 'VERTICAL',
    finish: 'aluminum',
  },

  // Modern - Edge mounted
  EDGE_PROFILE: {
    type: 'EDGE_MOUNTED',
    category: 'MODERN',
    dimensions: { length: 0, height: 20 }, // Full edge
    position: { preset: 'TOP_CENTER', offsetFromEdge: 0 },
    orientation: 'HORIZONTAL',
    finish: 'black_matte',
  },

  // Handleless - TIP-ON
  TIP_ON: {
    type: 'TIP_ON',
    category: 'HANDLELESS',
    dimensions: { length: 76, height: 10 }, // Blum TIP-ON unit
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 50 },
    orientation: 'HORIZONTAL',
  },

  // Handleless - Push latch
  PUSH_LATCH: {
    type: 'PUSH_LATCH',
    category: 'HANDLELESS',
    dimensions: { length: 40, height: 15 },
    position: { preset: 'MIDDLE_RIGHT', offsetFromEdge: 50 },
    orientation: 'HORIZONTAL',
  },
};

// ============================================================================
// UI Labels (Polish)
// ============================================================================

export const HANDLE_TYPE_LABELS: Record<HandleType, string> = {
  BAR: 'Rękojeść / reling',
  STRIP: 'Listwa',
  KNOB: 'Gałka',
  MILLED: 'Uchwyt frezowany',
  GOLA: 'System GOLA',
  EDGE_MOUNTED: 'Uchwyt krawędziowy',
  TIP_ON: 'TIP-ON (push-to-open)',
  PUSH_LATCH: 'Zatrzask push',
};

export const HANDLE_CATEGORY_LABELS: Record<HandleCategory, string> = {
  TRADITIONAL: 'Tradycyjne uchwyty',
  MODERN: 'Nowoczesne rozwiązania',
  HANDLELESS: 'Bez uchwytów',
};

export const HANDLE_FINISH_LABELS: Record<string, string> = {
  chrome: 'Chrom',
  brushed_nickel: 'Nikiel szczotkowany',
  black_matte: 'Czarny mat',
  gold: 'Złoty',
  aluminum: 'Aluminium',
  stainless: 'Stal nierdzewna',
};

export const POSITION_PRESET_LABELS: Record<HandlePositionPreset, string> = {
  TOP_LEFT: 'Góra lewo',
  TOP_RIGHT: 'Góra prawo',
  TOP_CENTER: 'Góra środek',
  MIDDLE_LEFT: 'Środek lewo',
  MIDDLE_RIGHT: 'Środek prawo',
  BOTTOM_LEFT: 'Dół lewo',
  BOTTOM_RIGHT: 'Dół prawo',
  BOTTOM_CENTER: 'Dół środek',
  CUSTOM: 'Własna pozycja',
};
```

### 2.3 Handle UI Components

**File:** `apps/app/src/components/ui/HandleSelector.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Label } from '@meble/ui';
import { RadioGroup, RadioGroupItem } from '@meble/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@meble/ui';
import { Slider } from '@meble/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@meble/ui';
import { Input } from '@meble/ui';

import type { HandleConfig, HandleCategory, HandleType, HandlePositionPreset } from '@/types';
import {
  HANDLE_PRESETS,
  HANDLE_TYPE_LABELS,
  HANDLE_CATEGORY_LABELS,
  HANDLE_DIMENSIONS,
  POSITION_PRESET_LABELS,
  HANDLE_FINISH_LABELS,
} from '@/lib/handlePresets';

interface HandleSelectorProps {
  value?: HandleConfig;
  onChange: (config: HandleConfig | undefined) => void;
  doorWidth: number;
  doorHeight: number;
}

export function HandleSelector({ value, onChange, doorWidth, doorHeight }: HandleSelectorProps) {
  const [category, setCategory] = useState<HandleCategory | 'NONE'>(
    value?.category ?? 'NONE'
  );

  const handleCategoryChange = (newCategory: HandleCategory | 'NONE') => {
    setCategory(newCategory);
    if (newCategory === 'NONE') {
      onChange(undefined);
    } else {
      // Set default for category
      const defaultPreset = getDefaultPresetForCategory(newCategory);
      onChange(HANDLE_PRESETS[defaultPreset]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Rodzaj uchwytu</Label>
        <Tabs value={category} onValueChange={handleCategoryChange}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="NONE">Brak</TabsTrigger>
            <TabsTrigger value="TRADITIONAL">Tradycyjne</TabsTrigger>
            <TabsTrigger value="MODERN">Nowoczesne</TabsTrigger>
            <TabsTrigger value="HANDLELESS">Push-to-open</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {category !== 'NONE' && (
        <>
          {/* Handle type selection */}
          <HandleTypeSelector
            category={category}
            value={value?.type}
            onChange={(type) => onChange({ ...value!, type })}
          />

          {/* Handle size/dimensions */}
          {value && <HandleDimensionSelector config={value} onChange={onChange} />}

          {/* Handle position */}
          {value && (
            <HandlePositionSelector
              config={value}
              onChange={onChange}
              doorWidth={doorWidth}
              doorHeight={doorHeight}
            />
          )}

          {/* Handle finish */}
          {value && value.category !== 'HANDLELESS' && (
            <HandleFinishSelector config={value} onChange={onChange} />
          )}
        </>
      )}
    </div>
  );
}

function HandleTypeSelector({
  category,
  value,
  onChange,
}: {
  category: HandleCategory;
  value?: HandleType;
  onChange: (type: HandleType) => void;
}) {
  const types = getTypesForCategory(category);

  return (
    <div>
      <Label>Typ</Label>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-2">
        {types.map((type) => (
          <div key={type} className="flex items-center space-x-2">
            <RadioGroupItem value={type} id={type} />
            <Label htmlFor={type} className="font-normal cursor-pointer">
              {HANDLE_TYPE_LABELS[type]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function HandleDimensionSelector({
  config,
  onChange,
}: {
  config: HandleConfig;
  onChange: (config: HandleConfig) => void;
}) {
  const availableSizes = getDimensionsForType(config.type);

  if (availableSizes.length === 0) return null;

  return (
    <div>
      <Label>Rozmiar</Label>
      <Select
        value={config.dimensions ? JSON.stringify(config.dimensions) : undefined}
        onValueChange={(val) => onChange({ ...config, dimensions: JSON.parse(val) })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Wybierz rozmiar" />
        </SelectTrigger>
        <SelectContent>
          {availableSizes.map((size) => (
            <SelectItem key={size.label} value={JSON.stringify(size.dimensions)}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HandlePositionSelector({
  config,
  onChange,
  doorWidth,
  doorHeight,
}: {
  config: HandleConfig;
  onChange: (config: HandleConfig) => void;
  doorWidth: number;
  doorHeight: number;
}) {
  const positionPresets: HandlePositionPreset[] = [
    'TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT',
    'MIDDLE_LEFT', 'MIDDLE_RIGHT',
    'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT',
    'CUSTOM',
  ];

  return (
    <div className="space-y-2">
      <Label>Pozycja</Label>
      <Select
        value={config.position.preset}
        onValueChange={(preset: HandlePositionPreset) =>
          onChange({
            ...config,
            position: { ...config.position, preset },
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {positionPresets.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {POSITION_PRESET_LABELS[preset]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {config.position.preset === 'CUSTOM' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X (mm od środka)</Label>
            <Input
              type="number"
              value={config.position.x ?? 0}
              onChange={(e) =>
                onChange({
                  ...config,
                  position: { ...config.position, x: Number(e.target.value) },
                })
              }
              min={-doorWidth / 2}
              max={doorWidth / 2}
            />
          </div>
          <div>
            <Label className="text-xs">Y (mm od środka)</Label>
            <Input
              type="number"
              value={config.position.y ?? 0}
              onChange={(e) =>
                onChange({
                  ...config,
                  position: { ...config.position, y: Number(e.target.value) },
                })
              }
              min={-doorHeight / 2}
              max={doorHeight / 2}
            />
          </div>
        </div>
      )}

      {/* Offset from edge */}
      <div>
        <Label className="text-xs">Odstęp od krawędzi (mm)</Label>
        <Slider
          value={[config.position.offsetFromEdge ?? 30]}
          onValueChange={([val]) =>
            onChange({
              ...config,
              position: { ...config.position, offsetFromEdge: val },
            })
          }
          min={10}
          max={100}
          step={5}
        />
        <span className="text-xs text-muted-foreground">{config.position.offsetFromEdge ?? 30} mm</span>
      </div>

      {/* Orientation for bars/strips */}
      {(config.type === 'BAR' || config.type === 'STRIP') && (
        <div>
          <Label>Orientacja</Label>
          <RadioGroup
            value={config.orientation}
            onValueChange={(orientation: 'HORIZONTAL' | 'VERTICAL') =>
              onChange({ ...config, orientation })
            }
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="HORIZONTAL" id="horizontal" />
              <Label htmlFor="horizontal">Poziomo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="VERTICAL" id="vertical" />
              <Label htmlFor="vertical">Pionowo</Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}

function HandleFinishSelector({
  config,
  onChange,
}: {
  config: HandleConfig;
  onChange: (config: HandleConfig) => void;
}) {
  const finishes = ['chrome', 'brushed_nickel', 'black_matte', 'gold', 'aluminum', 'stainless'];

  return (
    <div>
      <Label>Wykończenie</Label>
      <Select
        value={config.finish ?? 'chrome'}
        onValueChange={(finish) => onChange({ ...config, finish })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {finishes.map((finish) => (
            <SelectItem key={finish} value={finish}>
              {HANDLE_FINISH_LABELS[finish]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Helper functions
function getTypesForCategory(category: HandleCategory): HandleType[] {
  switch (category) {
    case 'TRADITIONAL':
      return ['BAR', 'STRIP', 'KNOB'];
    case 'MODERN':
      return ['MILLED', 'GOLA', 'EDGE_MOUNTED'];
    case 'HANDLELESS':
      return ['TIP_ON', 'PUSH_LATCH'];
  }
}

function getDefaultPresetForCategory(category: HandleCategory): string {
  switch (category) {
    case 'TRADITIONAL':
      return 'BAR_128_HORIZONTAL';
    case 'MODERN':
      return 'MILLED_TOP_EDGE';
    case 'HANDLELESS':
      return 'TIP_ON';
  }
}

function getDimensionsForType(type: HandleType): { label: string; dimensions: HandleDimensions }[] {
  switch (type) {
    case 'BAR':
      return [
        { label: '128 mm', dimensions: HANDLE_DIMENSIONS.BAR_128 },
        { label: '160 mm', dimensions: HANDLE_DIMENSIONS.BAR_160 },
        { label: '192 mm', dimensions: HANDLE_DIMENSIONS.BAR_192 },
        { label: '256 mm', dimensions: HANDLE_DIMENSIONS.BAR_256 },
        { label: '320 mm', dimensions: HANDLE_DIMENSIONS.BAR_320 },
        { label: '480 mm', dimensions: HANDLE_DIMENSIONS.BAR_480 },
        { label: '640 mm', dimensions: HANDLE_DIMENSIONS.BAR_640 },
      ];
    case 'STRIP':
      return [
        { label: '200 mm', dimensions: HANDLE_DIMENSIONS.STRIP_200 },
        { label: '400 mm', dimensions: HANDLE_DIMENSIONS.STRIP_400 },
        { label: '600 mm', dimensions: HANDLE_DIMENSIONS.STRIP_600 },
        { label: 'Pełna szerokość', dimensions: HANDLE_DIMENSIONS.STRIP_FULL },
      ];
    case 'KNOB':
      return [
        { label: 'Mała (25 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_SMALL },
        { label: 'Średnia (32 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_MEDIUM },
        { label: 'Duża (40 mm)', dimensions: HANDLE_DIMENSIONS.KNOB_LARGE },
      ];
    case 'MILLED':
      return [
        { label: 'Pełna szerokość', dimensions: HANDLE_DIMENSIONS.MILLED_STANDARD },
        { label: 'Częściowy (300 mm)', dimensions: HANDLE_DIMENSIONS.MILLED_PARTIAL },
      ];
    case 'GOLA':
      return [
        { label: 'Profil C (poziomy)', dimensions: HANDLE_DIMENSIONS.GOLA_C },
        { label: 'Profil L (pionowy)', dimensions: HANDLE_DIMENSIONS.GOLA_L },
        { label: 'Profil J (pod blatem)', dimensions: HANDLE_DIMENSIONS.GOLA_J },
      ];
    default:
      return [];
  }
}
```

### 2.4 Handle Visualization in 3D

**File:** `apps/app/src/components/canvas/Handle3D.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { HandleMetadata } from '@/types';

interface Handle3DProps {
  handleMetadata: HandleMetadata;
  frontThickness: number;
}

export function Handle3D({ handleMetadata, frontThickness }: Handle3DProps) {
  const { config, actualPosition } = handleMetadata;

  const geometry = useMemo(() => {
    switch (config.type) {
      case 'BAR':
        return createBarGeometry(config.dimensions!, config.orientation);
      case 'KNOB':
        return createKnobGeometry(config.dimensions!);
      case 'STRIP':
        return createStripGeometry(config.dimensions!, config.orientation);
      case 'MILLED':
        return createMilledGeometry(config.dimensions!, config.milledDepth!, config.milledWidth!);
      case 'GOLA':
        return createGolaGeometry(config.dimensions!);
      case 'EDGE_MOUNTED':
        return createEdgeMountedGeometry(config.dimensions!);
      case 'TIP_ON':
      case 'PUSH_LATCH':
        // These are hidden mechanisms - just show mounting point
        return createMechanismIndicator();
      default:
        return null;
    }
  }, [config]);

  const material = useMemo(() => {
    const color = getHandleColor(config.finish ?? 'chrome');
    return new THREE.MeshStandardMaterial({
      color,
      metalness: config.category === 'HANDLELESS' ? 0.2 : 0.8,
      roughness: config.finish === 'brushed_nickel' ? 0.4 : 0.2,
    });
  }, [config.finish, config.category]);

  if (!geometry) return null;

  // Position relative to door center, protruding from front surface
  const zOffset = frontThickness / 2 + (config.dimensions?.height ?? 20) / 2;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[actualPosition.x, actualPosition.y, zOffset]}
      rotation={config.orientation === 'VERTICAL' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
    />
  );
}

// Geometry creation functions
function createBarGeometry(dimensions: HandleDimensions, orientation: 'HORIZONTAL' | 'VERTICAL') {
  const { length, height = 35 } = dimensions;
  const radius = height / 2;

  // Create capsule-like bar handle
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-length / 2, 0, 0),
    new THREE.Vector3(length / 2, 0, 0),
  ]);

  return new THREE.TubeGeometry(path, 20, radius / 3, 8, false);
}

function createKnobGeometry(dimensions: HandleDimensions) {
  const { diameter = 32 } = dimensions;
  return new THREE.SphereGeometry(diameter / 2, 16, 16);
}

function createStripGeometry(dimensions: HandleDimensions, orientation: 'HORIZONTAL' | 'VERTICAL') {
  const { length, width = 20, height = 25 } = dimensions;
  return new THREE.BoxGeometry(length, width, height);
}

function createMilledGeometry(dimensions: HandleDimensions, depth: number, width: number) {
  // Milled handles are negative space - visualize as a groove
  const { length } = dimensions;
  return new THREE.BoxGeometry(length || 200, width, depth);
}

function createGolaGeometry(dimensions: HandleDimensions) {
  // GOLA profiles - simplified visualization
  const { length, height = 37 } = dimensions;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(20, 0);
  shape.lineTo(20, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);

  const extrudeSettings = { depth: length || 100, bevelEnabled: false };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createEdgeMountedGeometry(dimensions: HandleDimensions) {
  const { length, height = 20 } = dimensions;
  // L-shaped profile
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(30, 0);
  shape.lineTo(30, 5);
  shape.lineTo(5, 5);
  shape.lineTo(5, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);

  const extrudeSettings = { depth: length || 100, bevelEnabled: false };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createMechanismIndicator() {
  // Small cylinder to indicate TIP-ON/push mechanism location
  return new THREE.CylinderGeometry(5, 5, 10, 16);
}

function getHandleColor(finish: string): string {
  const colors: Record<string, string> = {
    chrome: '#c0c0c0',
    brushed_nickel: '#a8a8a8',
    black_matte: '#2a2a2a',
    gold: '#d4af37',
    aluminum: '#b0b0b0',
    stainless: '#c8c8c8',
  };
  return colors[finish] ?? '#c0c0c0';
}
```

---

## Part 3: UI Integration

### 3.1 Door Configuration in Cabinet Dialog

**File:** `apps/app/src/components/ui/CabinetTemplateDialog.tsx`

Add to Step 2 (Parameter Configuration) when `hasDoors === true`:

```typescript
{params.hasDoors && (
  <div className="border-t pt-4 mt-4">
    <h4 className="font-medium mb-3">Konfiguracja frontów</h4>

    {/* Door layout */}
    <div className="space-y-2">
      <Label>Układ drzwi</Label>
      <RadioGroup
        value={params.doorConfig?.layout ?? 'DOUBLE'}
        onValueChange={(layout: DoorLayout) =>
          setParams({
            ...params,
            doorConfig: { ...params.doorConfig, layout, openingDirection: 'HORIZONTAL' },
          })
        }
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="SINGLE" id="single" />
          <Label htmlFor="single">Pojedyncze</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="DOUBLE" id="double" />
          <Label htmlFor="double">Podwójne</Label>
        </div>
      </RadioGroup>
    </div>

    {/* Opening direction */}
    <div className="space-y-2 mt-4">
      <Label>Kierunek otwierania</Label>
      <RadioGroup
        value={params.doorConfig?.openingDirection ?? 'HORIZONTAL'}
        onValueChange={(direction: DoorOpeningDirection) =>
          setParams({
            ...params,
            doorConfig: { ...params.doorConfig, openingDirection: direction },
          })
        }
        className="grid grid-cols-3 gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="HORIZONTAL" id="horizontal" />
          <Label htmlFor="horizontal">Na bok</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="LIFT_UP" id="lift-up" />
          <Label htmlFor="lift-up">Do góry</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="FOLD_DOWN" id="fold-down" />
          <Label htmlFor="fold-down">W dół</Label>
        </div>
      </RadioGroup>
    </div>

    {/* Hinge side (for single horizontal doors) */}
    {params.doorConfig?.layout === 'SINGLE' &&
      params.doorConfig?.openingDirection === 'HORIZONTAL' && (
        <div className="space-y-2 mt-4">
          <Label>Strona zawiasów</Label>
          <RadioGroup
            value={params.doorConfig?.hingeSide ?? 'LEFT'}
            onValueChange={(side: HingeSide) =>
              setParams({
                ...params,
                doorConfig: { ...params.doorConfig, hingeSide: side },
              })
            }
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="LEFT" id="left-hinge" />
              <Label htmlFor="left-hinge">Lewa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="RIGHT" id="right-hinge" />
              <Label htmlFor="right-hinge">Prawa</Label>
            </div>
          </RadioGroup>
        </div>
      )}

    {/* Handle configuration */}
    <div className="mt-6">
      <HandleSelector
        value={params.handleConfig}
        onChange={(handleConfig) => setParams({ ...params, handleConfig })}
        doorWidth={params.width - 4} // Approximate door width
        doorHeight={params.height - 4}
      />
    </div>
  </div>
)}
```

### 3.2 Cabinet Parameter Editor Extension

**File:** `apps/app/src/components/ui/CabinetParameterEditor.tsx`

Add door and handle configuration sections for cabinets with doors:

```typescript
{cabinet.params.hasDoors && (
  <Collapsible defaultOpen>
    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
      <span className="font-medium">Fronty i uchwyty</span>
      <ChevronDown className="h-4 w-4" />
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-4 p-2">
      {/* Door configuration */}
      <DoorConfigEditor
        config={cabinet.params.doorConfig}
        onChange={(doorConfig) => handleParamsChange({ ...cabinet.params, doorConfig })}
      />

      {/* Handle configuration */}
      <HandleSelector
        value={cabinet.params.handleConfig}
        onChange={(handleConfig) => handleParamsChange({ ...cabinet.params, handleConfig })}
        doorWidth={calculateDoorWidth(cabinet.params)}
        doorHeight={cabinet.params.height - 4}
      />
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## Part 4: CSV Export & Reports

### 4.1 Handle Information in Cut List

Extend CSV export to include handle placement info:

```typescript
// In csv.ts - extend generateCutList function
function getHandleInfo(part: Part): string {
  const handleMeta = part.cabinetMetadata?.handleMetadata;
  if (!handleMeta) return '-';

  const { config, actualPosition } = handleMeta;

  if (config.category === 'HANDLELESS') {
    return `${HANDLE_TYPE_LABELS[config.type]} (X: ${actualPosition.x}mm, Y: ${actualPosition.y}mm)`;
  }

  return `${HANDLE_TYPE_LABELS[config.type]} ${config.dimensions?.length ?? ''}mm, ${config.finish ?? ''} (X: ${actualPosition.x}mm, Y: ${actualPosition.y}mm)`;
}

// Add to CSV columns
const handleColumn = getHandleInfo(part);
```

### 4.2 Separate Handle Report

Generate a separate handle/hardware report:

```typescript
// New file: apps/app/src/lib/handleReport.ts

export function generateHandleReport(parts: Part[]): string {
  const doorParts = parts.filter(
    (p) => p.cabinetMetadata?.role === 'DOOR' && p.cabinetMetadata?.handleMetadata
  );

  if (doorParts.length === 0) {
    return 'Brak uchwytów w projekcie.';
  }

  const rows = doorParts.map((part) => {
    const handle = part.cabinetMetadata!.handleMetadata!;
    const config = handle.config;

    return [
      part.name,
      HANDLE_TYPE_LABELS[config.type],
      config.dimensions?.length ? `${config.dimensions.length}mm` : '-',
      config.dimensions?.holeSpacing ? `CC: ${config.dimensions.holeSpacing}mm` : '-',
      config.finish ? HANDLE_FINISH_LABELS[config.finish] : '-',
      `X: ${handle.actualPosition.x}mm`,
      `Y: ${handle.actualPosition.y}mm`,
      config.orientation,
    ].join(',');
  });

  const header = 'Front,Typ uchwytu,Długość,Rozstaw,Wykończenie,Pozycja X,Pozycja Y,Orientacja';

  return [header, ...rows].join('\n');
}
```

---

## Implementation Order

### Phase 1: Core Types & Door Configuration
1. [ ] Add type definitions for doors (DoorLayout, HingeSide, DoorOpeningDirection, DoorConfig, DoorMetadata)
2. [ ] Extend KitchenCabinetParams with doorConfig
3. [ ] Add default values and persistence migration
4. [ ] Modify generateDoors() function in cabinetGenerators.ts
5. [ ] Test single/double door generation
6. [ ] Test lift-up door generation

### Phase 2: Handle Types
1. [ ] Add handle type definitions (HandleCategory, HandleType, HandleConfig, etc.)
2. [ ] Create handlePresets.ts with dimensions and presets
3. [ ] Add calculateHandlePosition() logic
4. [ ] Extend CabinetPartMetadata with handleMetadata

### Phase 3: Handle UI
1. [ ] Create HandleSelector component
2. [ ] Integrate HandleSelector into CabinetTemplateDialog
3. [ ] Integrate HandleSelector into CabinetParameterEditor
4. [ ] Test handle selection and configuration

### Phase 4: 3D Visualization
1. [ ] Create Handle3D component
2. [ ] Integrate Handle3D into Part3D for doors
3. [ ] Add handle geometry functions (bar, knob, strip, etc.)
4. [ ] Test 3D handle rendering

### Phase 5: Reports & Polish
1. [ ] Extend CSV export with handle info
2. [ ] Create separate handle report generator
3. [ ] Add Polish translations for all new UI text
4. [ ] Final testing and edge cases

---

## Testing Checklist

### Door Configuration
- [ ] Create cabinet with single door - left hinge
- [ ] Create cabinet with single door - right hinge
- [ ] Create cabinet with double doors
- [ ] Create cabinet with lift-up door
- [ ] Change door layout in properties panel
- [ ] Verify door positions after regeneration

### Handle System
- [ ] Add bar handle (various sizes)
- [ ] Add strip handle
- [ ] Add knob
- [ ] Add milled handle
- [ ] Add GOLA profile
- [ ] Add edge-mounted handle
- [ ] Add TIP-ON (push-to-open)
- [ ] Change handle position preset
- [ ] Set custom handle position
- [ ] Change handle finish
- [ ] Verify handle position on single vs double doors

### Integration
- [ ] Handle position respects hinge side
- [ ] Handle position correct for lift-up doors
- [ ] Handle visible in 3D view
- [ ] Handle info in CSV export
- [ ] Persistence - save and reload project
- [ ] Undo/redo with handle changes

---

## UI Text (Polish)

```typescript
const translations = {
  doors: {
    layout: 'Układ drzwi',
    single: 'Pojedyncze',
    double: 'Podwójne',
    openingDirection: 'Kierunek otwierania',
    horizontal: 'Na bok',
    liftUp: 'Do góry',
    foldDown: 'W dół',
    hingeSide: 'Strona zawiasów',
    left: 'Lewa',
    right: 'Prawa',
  },
  handles: {
    title: 'Uchwyt',
    none: 'Brak',
    type: 'Typ',
    size: 'Rozmiar',
    position: 'Pozycja',
    offset: 'Odstęp od krawędzi',
    orientation: 'Orientacja',
    horizontal: 'Poziomo',
    vertical: 'Pionowo',
    finish: 'Wykończenie',
    // Types
    bar: 'Rękojeść / reling',
    strip: 'Listwa',
    knob: 'Gałka',
    milled: 'Uchwyt frezowany',
    gola: 'System GOLA',
    edgeMounted: 'Uchwyt krawędziowy',
    tipOn: 'TIP-ON (push-to-open)',
    pushLatch: 'Zatrzask push',
    // Categories
    traditional: 'Tradycyjne uchwyty',
    modern: 'Nowoczesne rozwiązania',
    handleless: 'Bez uchwytów',
    // Positions
    topLeft: 'Góra lewo',
    topCenter: 'Góra środek',
    topRight: 'Góra prawo',
    middleLeft: 'Środek lewo',
    middleRight: 'Środek prawo',
    bottomLeft: 'Dół lewo',
    bottomCenter: 'Dół środek',
    bottomRight: 'Dół prawo',
    custom: 'Własna pozycja',
    // Finishes
    chrome: 'Chrom',
    brushedNickel: 'Nikiel szczotkowany',
    blackMatte: 'Czarny mat',
    gold: 'Złoty',
    aluminum: 'Aluminium',
    stainless: 'Stal nierdzewna',
  },
};
```

---

## Notes

### Handle Hole Drilling
- Bar handles typically have 2 mounting holes with standard CC (center-to-center) distances
- Common CC distances: 128mm, 160mm, 192mm, 256mm, 320mm
- CSV export should include drilling positions for production

### GOLA System Considerations
- GOLA requires special aluminum profiles
- Different profiles for horizontal (C), vertical (L), and under-counter (J) applications
- May affect cabinet structure (gaps for profiles)
- Consider as advanced feature for later phases

### Milled Handles
- Require CNC machining of front edge
- Typically routed into top edge of door
- Depth: 10-20mm, width: 30-50mm for finger grip
- Affects edge banding (no banding where milled)

### TIP-ON / Push-to-Open
- Blum TIP-ON or similar mechanisms
- Mounting position matters for proper function
- Typically installed at door corner opposite to hinge
- Requires minimum gap between door and cabinet body
