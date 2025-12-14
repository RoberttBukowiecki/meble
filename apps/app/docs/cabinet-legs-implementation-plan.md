# Cabinet Legs Implementation Plan

## Overview
Add adjustable furniture legs (nozki meblowe) functionality to all cabinet types in the furniture design application.

**Updated to align with current domain-driven architecture (December 2025)**

## Research Summary: Popular Furniture Leg Dimensions

Based on research from IKEA, Furnica, and Castorama:

### Standard Leg Heights (mm)
| Type | Min Height | Max Height | Common Adjustable Range |
|------|------------|------------|------------------------|
| Short Kitchen Legs | 75 | 105 | 30mm |
| Standard Kitchen (IKEA SEKTION) | 89 | 130 | 41mm |
| Tall Kitchen | 135 | 170 | 35mm |
| IKEA CAPITA (Stainless) | 102 | 127 | 25mm |
| IKEA ENHET | 114 | 203 | 89mm |
| European Standard | 100 | 150 | 50mm |

### Recommended Presets for Implementation
```typescript
LEG_PRESETS = {
  SHORT: { height: 100, adjustRange: 20, diameter: 30 },      // 80-120mm
  STANDARD: { height: 150, adjustRange: 20, diameter: 30 },   // 130-170mm
  TALL: { height: 200, adjustRange: 30, diameter: 40 },       // 170-230mm
  CUSTOM: { height: userDefined, adjustRange: 20, diameter: 30 }
}
```

### Leg Placement Rules
- **Width < 100cm**: 4 legs (corners only)
- **Width 100-180cm**: 6 legs (corners + 2 center)
- **Width > 180cm**: 8 legs (corners + 4 distributed)
- **Load capacity**: Standard legs ~100kg each

---

## Architecture (Domain-Driven Approach)

### 1. Type Definitions (`src/types/legs.ts`)

Create a new dedicated types file:

```typescript
// ============================================================================
// Cabinet Leg Types
// ============================================================================

/**
 * Preset leg types with predefined dimensions
 */
export type LegPreset = 'SHORT' | 'STANDARD' | 'TALL' | 'CUSTOM';

/**
 * Leg material/finish type
 */
export type LegFinish = 'BLACK_PLASTIC' | 'CHROME' | 'BRUSHED_STEEL' | 'WHITE_PLASTIC';

/**
 * Leg shape for 3D rendering
 */
export type LegShape = 'ROUND' | 'SQUARE';

/**
 * Leg count mode
 */
export type LegCountMode = 'AUTO' | 'MANUAL';

/**
 * Configuration for a single leg type
 */
export interface LegTypeConfig {
  preset: LegPreset;
  height: number;              // mm - base height
  adjustRange: number;         // mm - adjustment range (+/-)
  diameter: number;            // mm - leg diameter/width
  shape: LegShape;
  finish: LegFinish;
}

/**
 * Complete leg configuration for a cabinet
 */
export interface LegsConfig {
  enabled: boolean;
  legType: LegTypeConfig;
  countMode: LegCountMode;
  manualCount?: number;        // Only used when countMode === 'MANUAL'
  currentHeight: number;       // mm - actual current height (within adjust range)
  cornerInset: number;         // mm - inset from cabinet edges
}
```

### 2. Update Cabinet Types (`src/types/cabinet.ts`)

```typescript
// Add LEG to CabinetPartRole
export type CabinetPartRole =
  // ... existing roles ...
  | 'LEG';  // Cabinet leg (not a cut part - accessory)

// Add to CabinetPartMetadata
export interface CabinetPartMetadata {
  // ... existing fields ...
  legIndex?: number;  // Which leg (0-based, for multi-leg setups)
}

// Legs are added via CabinetParams - each cabinet type can have optional legs
// The legsConfig is part of base cabinet params, not a separate interface
```

---

## Domain Module (`src/lib/domain/legs.ts`)

Following the established domain-driven pattern:

```typescript
// ============================================================================
// Cabinet Legs Domain
// ============================================================================

import type {
  LegsConfig,
  LegTypeConfig,
  LegPreset,
  LegFinish,
  LegShape,
  LegCountMode,
} from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LEG_PRESETS: Record<LegPreset, Omit<LegTypeConfig, 'preset'>> = {
  SHORT: { height: 100, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  STANDARD: { height: 150, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  TALL: { height: 200, adjustRange: 30, diameter: 40, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  CUSTOM: { height: 150, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
};

export const LEG_FINISH_COLORS: Record<LegFinish, string> = {
  BLACK_PLASTIC: '#1a1a1a',
  CHROME: '#c0c0c0',
  BRUSHED_STEEL: '#8a8a8a',
  WHITE_PLASTIC: '#f0f0f0',
};

export const LEG_DEFAULTS = {
  enabled: false,
  countMode: 'AUTO' as LegCountMode,
  cornerInset: 50,
  preset: 'STANDARD' as LegPreset,
} as const;

export const LEG_LIMITS = {
  MIN_HEIGHT: 50,
  MAX_HEIGHT: 300,
  MIN_DIAMETER: 20,
  MAX_DIAMETER: 60,
  MIN_INSET: 20,
  MAX_INSET: 100,
  MIN_COUNT: 4,
  MAX_COUNT: 12,
} as const;

// ============================================================================
// CREATORS
// ============================================================================

export function createLegTypeConfig(preset: LegPreset = 'STANDARD'): LegTypeConfig {
  const presetConfig = LEG_PRESETS[preset];
  return {
    preset,
    ...presetConfig,
  };
}

export function createLegsConfig(
  enabled: boolean = false,
  preset: LegPreset = 'STANDARD'
): LegsConfig {
  const legType = createLegTypeConfig(preset);
  return {
    enabled,
    legType,
    countMode: LEG_DEFAULTS.countMode,
    currentHeight: legType.height,
    cornerInset: LEG_DEFAULTS.cornerInset,
  };
}

export function createDefaultLegsConfig(): LegsConfig {
  return createLegsConfig(false, 'STANDARD');
}

// ============================================================================
// UPDATERS (Immutable)
// ============================================================================

export function toggleLegsEnabled(config: LegsConfig): LegsConfig {
  return { ...config, enabled: !config.enabled };
}

export function updateLegsEnabled(config: LegsConfig, enabled: boolean): LegsConfig {
  return { ...config, enabled };
}

export function updateLegPreset(config: LegsConfig, preset: LegPreset): LegsConfig {
  const newLegType = createLegTypeConfig(preset);
  return {
    ...config,
    legType: newLegType,
    currentHeight: newLegType.height,
  };
}

export function updateLegHeight(config: LegsConfig, height: number): LegsConfig {
  const { legType } = config;
  const minHeight = legType.height - legType.adjustRange;
  const maxHeight = legType.height + legType.adjustRange;
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, height));
  return { ...config, currentHeight: clampedHeight };
}

export function updateLegFinish(config: LegsConfig, finish: LegFinish): LegsConfig {
  return {
    ...config,
    legType: { ...config.legType, finish },
  };
}

export function updateLegShape(config: LegsConfig, shape: LegShape): LegsConfig {
  return {
    ...config,
    legType: { ...config.legType, shape },
  };
}

export function updateLegCountMode(config: LegsConfig, countMode: LegCountMode): LegsConfig {
  return { ...config, countMode };
}

export function updateManualLegCount(config: LegsConfig, count: number): LegsConfig {
  const clampedCount = Math.max(LEG_LIMITS.MIN_COUNT, Math.min(LEG_LIMITS.MAX_COUNT, count));
  return { ...config, manualCount: clampedCount, countMode: 'MANUAL' };
}

export function updateCornerInset(config: LegsConfig, inset: number): LegsConfig {
  const clampedInset = Math.max(LEG_LIMITS.MIN_INSET, Math.min(LEG_LIMITS.MAX_INSET, inset));
  return { ...config, cornerInset: clampedInset };
}

export function updateCustomLegDimensions(
  config: LegsConfig,
  height: number,
  diameter: number
): LegsConfig {
  return {
    ...config,
    legType: {
      ...config.legType,
      preset: 'CUSTOM',
      height,
      diameter,
    },
    currentHeight: height,
  };
}

// ============================================================================
// CALCULATORS
// ============================================================================

/**
 * Calculate optimal leg count based on cabinet width
 */
export function calculateLegCount(widthMm: number): number {
  if (widthMm < 1000) return 4;      // < 100cm: 4 legs
  if (widthMm <= 1800) return 6;     // 100-180cm: 6 legs
  return 8;                          // > 180cm: 8 legs
}

/**
 * Get effective leg count (auto or manual)
 */
export function getEffectiveLegCount(config: LegsConfig, cabinetWidth: number): number {
  if (config.countMode === 'MANUAL' && config.manualCount) {
    return config.manualCount;
  }
  return calculateLegCount(cabinetWidth);
}

/**
 * Calculate leg positions for a cabinet
 * Returns array of [x, z] positions relative to cabinet center
 */
export function calculateLegPositions(
  width: number,
  depth: number,
  legCount: number,
  cornerInset: number = 50
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  const halfWidth = width / 2 - cornerInset;
  const halfDepth = depth / 2 - cornerInset;

  if (legCount >= 4) {
    // Corner legs (always present)
    positions.push([-halfWidth, -halfDepth]); // back-left
    positions.push([halfWidth, -halfDepth]);  // back-right
    positions.push([-halfWidth, halfDepth]);  // front-left
    positions.push([halfWidth, halfDepth]);   // front-right
  }

  if (legCount >= 6) {
    // Center legs (front and back)
    positions.push([0, -halfDepth]);  // back-center
    positions.push([0, halfDepth]);   // front-center
  }

  if (legCount >= 8) {
    // Additional distributed legs
    const quarterWidth = halfWidth / 2;
    positions.push([-quarterWidth, -halfDepth]); // back-left-quarter
    positions.push([quarterWidth, -halfDepth]);  // back-right-quarter
  }

  return positions;
}

/**
 * Calculate the Y offset that legs add to a cabinet
 */
export function calculateLegHeightOffset(legsConfig?: LegsConfig): number {
  if (!legsConfig?.enabled) return 0;
  return legsConfig.currentHeight;
}

/**
 * Get leg color from finish
 */
export function getLegColor(finish: LegFinish): string {
  return LEG_FINISH_COLORS[finish] ?? LEG_FINISH_COLORS.BLACK_PLASTIC;
}

/**
 * Calculate height range for current preset
 */
export function getHeightRange(config: LegsConfig): { min: number; max: number } {
  const { legType } = config;
  return {
    min: legType.height - legType.adjustRange,
    max: legType.height + legType.adjustRange,
  };
}

// ============================================================================
// VALIDATORS
// ============================================================================

export interface LegsValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLegsConfig(config: LegsConfig): LegsValidationResult {
  const errors: string[] = [];

  if (config.currentHeight < LEG_LIMITS.MIN_HEIGHT || config.currentHeight > LEG_LIMITS.MAX_HEIGHT) {
    errors.push(`Leg height must be between ${LEG_LIMITS.MIN_HEIGHT}-${LEG_LIMITS.MAX_HEIGHT}mm`);
  }

  if (config.legType.diameter < LEG_LIMITS.MIN_DIAMETER || config.legType.diameter > LEG_LIMITS.MAX_DIAMETER) {
    errors.push(`Leg diameter must be between ${LEG_LIMITS.MIN_DIAMETER}-${LEG_LIMITS.MAX_DIAMETER}mm`);
  }

  if (config.cornerInset < LEG_LIMITS.MIN_INSET || config.cornerInset > LEG_LIMITS.MAX_INSET) {
    errors.push(`Corner inset must be between ${LEG_LIMITS.MIN_INSET}-${LEG_LIMITS.MAX_INSET}mm`);
  }

  if (config.countMode === 'MANUAL' && config.manualCount) {
    if (config.manualCount < LEG_LIMITS.MIN_COUNT || config.manualCount > LEG_LIMITS.MAX_COUNT) {
      errors.push(`Leg count must be between ${LEG_LIMITS.MIN_COUNT}-${LEG_LIMITS.MAX_COUNT}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// QUERIES
// ============================================================================

export function isEnabled(config?: LegsConfig): boolean {
  return config?.enabled ?? false;
}

export function isAutoCount(config: LegsConfig): boolean {
  return config.countMode === 'AUTO';
}

export function isCustomPreset(config: LegsConfig): boolean {
  return config.legType.preset === 'CUSTOM';
}

export function getPresetLabel(preset: LegPreset): string {
  const labels: Record<LegPreset, string> = {
    SHORT: 'Niskie (100mm)',
    STANDARD: 'Standardowe (150mm)',
    TALL: 'Wysokie (200mm)',
    CUSTOM: 'Niestandardowe',
  };
  return labels[preset];
}

export function getFinishLabel(finish: LegFinish): string {
  const labels: Record<LegFinish, string> = {
    BLACK_PLASTIC: 'Czarny plastik',
    CHROME: 'Chrom',
    BRUSHED_STEEL: 'Stal szczotkowana',
    WHITE_PLASTIC: 'Bialy plastik',
  };
  return labels[finish];
}

export function getSummary(config: LegsConfig, cabinetWidth?: number): string {
  if (!config.enabled) return 'Brak';
  const count = cabinetWidth ? getEffectiveLegCount(config, cabinetWidth) : '?';
  const preset = getPresetLabel(config.legType.preset);
  return `${count} szt. ${preset}`;
}

// ============================================================================
// EXPORT DOMAIN OBJECT
// ============================================================================

export const LegsDomain = {
  // Constants
  LEG_PRESETS,
  LEG_FINISH_COLORS,
  LEG_DEFAULTS,
  LEG_LIMITS,

  // Creators
  createLegTypeConfig,
  createLegsConfig,
  createDefaultLegsConfig,

  // Updaters
  toggleLegsEnabled,
  updateLegsEnabled,
  updateLegPreset,
  updateLegHeight,
  updateLegFinish,
  updateLegShape,
  updateLegCountMode,
  updateManualLegCount,
  updateCornerInset,
  updateCustomLegDimensions,

  // Calculators
  calculateLegCount,
  getEffectiveLegCount,
  calculateLegPositions,
  calculateLegHeightOffset,
  getLegColor,
  getHeightRange,

  // Validators
  validateLegsConfig,

  // Queries
  isEnabled,
  isAutoCount,
  isCustomPreset,
  getPresetLabel,
  getFinishLabel,
  getSummary,
};

export default LegsDomain;
```

---

## Generator (`src/lib/cabinetGenerators/legs.ts`)

```typescript
/**
 * Cabinet leg generator
 * Generates leg parts (non-cut accessories) for 3D visualization
 */

import type { LegsConfig, CabinetMaterials, Material } from '@/types';
import type { GeneratedPart } from './types';
import { LegsDomain } from '@/lib/domain/legs';

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
  const positions = LegsDomain.calculateLegPositions(cabinetWidth, cabinetDepth, legCount, cornerInset);

  // Leg dimensions
  const legDiameter = legType.diameter;
  const legHeight = currentHeight;
  const legColor = LegsDomain.getLegColor(legType.finish);

  // Generate each leg
  positions.forEach((pos, index) => {
    const [x, z] = pos;
    const legCenterY = legHeight / 2;

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
      rotation: [-Math.PI / 2, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
      cabinetMetadata: {
        cabinetId,
        role: 'LEG',
        legIndex: index,
      },
      notes: JSON.stringify({
        legShape: legType.shape,
        legFinish: legType.finish,
        legColor,
        isAccessory: true,
      }),
    });
  });

  return parts;
}
```

---

## Integration with Cabinet Generators

Each cabinet generator needs to:
1. Accept legs configuration from params
2. Apply Y offset to all parts
3. Generate leg parts

### Update Pattern for Existing Generators

```typescript
// In generateKitchenCabinet, generateWardrobe, etc.
import { generateLegs } from './legs';
import { LegsDomain } from '@/lib/domain/legs';

export function generateKitchenCabinet(
  cabinetId: string,
  furnitureId: string,
  params: KitchenCabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  // Calculate leg offset
  const legOffset = LegsDomain.calculateLegHeightOffset(params.legs);

  // All Y positions should add legOffset
  // e.g., position: [0, bottomPanelY + legOffset, 0]

  // Generate body parts with offset...
  // ... existing generation code with legOffset applied ...

  // At the end, generate legs
  if (params.legs?.enabled) {
    const legParts = generateLegs(
      cabinetId,
      furnitureId,
      params.legs,
      params.width,
      params.depth,
      materials
    );
    parts.push(...legParts);
  }

  return parts;
}
```

---

## Store Integration

### Add to Config (`src/lib/config.ts`)

```typescript
import type { LegPreset, LegFinish } from '@/types';

// Leg preset options for UI
export const LEG_PRESET_OPTIONS: Array<{
  value: LegPreset;
  label: string;
  description: string;
}> = [
  { value: 'SHORT', label: 'Niskie (100mm)', description: '80-120mm, dla niskich szafek' },
  { value: 'STANDARD', label: 'Standardowe (150mm)', description: '130-170mm, najpopularniejsze' },
  { value: 'TALL', label: 'Wysokie (200mm)', description: '170-230mm, dla lepszej dostepnosci' },
  { value: 'CUSTOM', label: 'Niestandardowe', description: 'Wymiary uzytkownika' },
];

// Leg finish options for UI
export const LEG_FINISH_OPTIONS: Array<{
  value: LegFinish;
  label: string;
  color: string;
}> = [
  { value: 'BLACK_PLASTIC', label: 'Czarny plastik', color: '#1a1a1a' },
  { value: 'CHROME', label: 'Chrom', color: '#c0c0c0' },
  { value: 'BRUSHED_STEEL', label: 'Stal szczotkowana', color: '#8a8a8a' },
  { value: 'WHITE_PLASTIC', label: 'Bialy plastik', color: '#f0f0f0' },
];
```

---

## UI Components

### New Components Structure

```
apps/app/src/components/ui/
├── legs/
│   ├── LegsConfig.tsx           # Simple leg config component
│   ├── LegsConfigDialog.tsx     # Full leg config dialog (if needed)
│   ├── LegPresetSelector.tsx    # Preset buttons
│   └── LegFinishSelector.tsx    # Finish color selector
```

### LegsConfig Component (`src/components/ui/legs/LegsConfig.tsx`)

```tsx
import { LegsDomain } from '@/lib/domain/legs';
import { LEG_PRESET_OPTIONS, LEG_FINISH_OPTIONS } from '@/lib/config';

interface LegsConfigProps {
  config: LegsConfig;
  cabinetWidth: number;
  onChange: (config: LegsConfig) => void;
}

export function LegsConfig({ config, cabinetWidth, onChange }: LegsConfigProps) {
  const effectiveCount = LegsDomain.getEffectiveLegCount(config, cabinetWidth);
  const heightRange = LegsDomain.getHeightRange(config);

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <Label>Nozki meblowe</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange(LegsDomain.updateLegsEnabled(config, enabled))}
        />
      </div>

      {config.enabled && (
        <>
          {/* Preset selector */}
          <div className="space-y-2">
            <Label>Typ nozek</Label>
            <Select
              value={config.legType.preset}
              onValueChange={(preset) => onChange(LegsDomain.updateLegPreset(config, preset as LegPreset))}
            >
              {LEG_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Height slider */}
          <div className="space-y-2">
            <Label>Wysokosc: {config.currentHeight}mm</Label>
            <Slider
              min={heightRange.min}
              max={heightRange.max}
              value={[config.currentHeight]}
              onValueChange={([height]) => onChange(LegsDomain.updateLegHeight(config, height))}
            />
          </div>

          {/* Finish selector */}
          <div className="space-y-2">
            <Label>Wykonczenie</Label>
            <div className="flex gap-2">
              {LEG_FINISH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    'w-8 h-8 rounded-full border-2',
                    config.legType.finish === option.value ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: option.color }}
                  onClick={() => onChange(LegsDomain.updateLegFinish(config, option.value))}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Count mode */}
          <div className="space-y-2">
            <Label>Ilosc nozek: {effectiveCount} szt.</Label>
            <div className="flex gap-2">
              <Button
                variant={config.countMode === 'AUTO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange(LegsDomain.updateLegCountMode(config, 'AUTO'))}
              >
                Auto
              </Button>
              <Button
                variant={config.countMode === 'MANUAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange(LegsDomain.updateLegCountMode(config, 'MANUAL'))}
              >
                Reczne
              </Button>
            </div>
            {config.countMode === 'MANUAL' && (
              <NumberInput
                value={config.manualCount ?? 4}
                min={LegsDomain.LEG_LIMITS.MIN_COUNT}
                max={LegsDomain.LEG_LIMITS.MAX_COUNT}
                onChange={(count) => onChange(LegsDomain.updateManualLegCount(config, count))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

### PropertiesPanel Integration

Add legs section to cabinet properties:

```tsx
// In PropertiesPanel.tsx
<AccordionItem value="legs" className="border rounded-md px-2 bg-card">
  <AccordionTrigger className="py-3 text-xs font-medium hover:no-underline">
    <div className="flex items-center gap-2">
      <FootprintsIcon className="h-4 w-4 text-muted-foreground" />
      Nozki
      {localParams.legs?.enabled && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
          {LegsDomain.getSummary(localParams.legs, localParams.width)}
        </Badge>
      )}
    </div>
  </AccordionTrigger>
  <AccordionContent className="pb-4 pt-1 border-t mt-1">
    <LegsConfig
      config={localParams.legs ?? LegsDomain.createDefaultLegsConfig()}
      cabinetWidth={localParams.width}
      onChange={(legs) => updateLocalParams({ legs })}
    />
  </AccordionContent>
</AccordionItem>
```

---

## 3D Rendering (`Part3D.tsx`)

Add special rendering for LEG role parts:

```typescript
// In Part3D component
if (part.cabinetMetadata?.role === 'LEG') {
  const legNotes = JSON.parse(part.notes || '{}');
  const isRound = legNotes.legShape === 'ROUND';
  const legColor = legNotes.legColor || '#1a1a1a';

  return (
    <mesh position={position} rotation={rotation}>
      {isRound ? (
        <cylinderGeometry args={[part.width / 2, part.width / 2, part.depth, 16]} />
      ) : (
        <boxGeometry args={[part.width, part.depth, part.height]} />
      )}
      <meshStandardMaterial color={legColor} metalness={0.3} roughness={0.7} />
    </mesh>
  );
}
```

---

## CSV Export Integration

Add accessories section for legs:

```typescript
// In csv.ts
import { LegsDomain } from '@/lib/domain/legs';

interface AccessoryItem {
  type: string;
  name: string;
  quantity: number;
  dimensions: string;
  finish: string;
  notes: string;
}

function collectAccessories(cabinets: Cabinet[]): AccessoryItem[] {
  const accessories: AccessoryItem[] = [];

  for (const cabinet of cabinets) {
    if (cabinet.params.legs?.enabled) {
      const legConfig = cabinet.params.legs;
      const legCount = LegsDomain.getEffectiveLegCount(legConfig, cabinet.params.width);
      const finishLabel = LegsDomain.getFinishLabel(legConfig.legType.finish);

      accessories.push({
        type: 'LEG',
        name: `Nozka ${LegsDomain.getPresetLabel(legConfig.legType.preset)}`,
        quantity: legCount,
        dimensions: `${legConfig.legType.diameter}mm x ${legConfig.currentHeight}mm`,
        finish: finishLabel,
        notes: `Dla szafki: ${cabinet.name}`,
      });
    }
  }

  return accessories;
}
```

---

## Implementation Phases

### Phase 1: Type Definitions and Domain Module
1. [ ] Create `src/types/legs.ts` with all leg types
2. [ ] Update `src/types/cabinet.ts` with LEG role
3. [ ] Update `src/types/index.ts` to export leg types
4. [ ] Create `src/lib/domain/legs.ts` domain module
5. [ ] Update `src/lib/domain/index.ts` to export LegsDomain

### Phase 2: Generator Implementation
1. [ ] Create `src/lib/cabinetGenerators/legs.ts`
2. [ ] Update `generateKitchenCabinet` with leg support
3. [ ] Update `generateWardrobe` with leg support
4. [ ] Update `generateBookshelf` with leg support
5. [ ] Update `generateDrawerCabinet` with leg support
6. [ ] Add leg config to `CABINET_PRESETS` in config.ts

### Phase 3: 3D Rendering
1. [ ] Add leg rendering logic to `Part3D.tsx`
2. [ ] Test leg visualization with different shapes/finishes
3. [ ] Ensure proper Y offset for cabinet body

### Phase 4: UI Components
1. [ ] Create `LegsConfig.tsx` component
2. [ ] Create `LegPresetSelector.tsx`
3. [ ] Create `LegFinishSelector.tsx`
4. [ ] Update `PropertiesPanel.tsx` with legs accordion section
5. [ ] Update `CabinetTemplateDialog.tsx` with legs configuration

### Phase 5: Integration & Export
1. [ ] Test cabinet regeneration with legs
2. [ ] Add accessories section to CSV export
3. [ ] Verify legs excluded from cut list but included in accessories

---

## Design Decisions

1. **Legs as non-cut parts**: Legs are accessories with `isAccessory: true` in notes. Excluded from main cut list but included in accessories section.

2. **Y offset approach**: When legs are enabled, all cabinet parts get a Y offset equal to leg height. This positions the cabinet body above the legs.

3. **Independent from plinth**: Legs and plinth (cokol) are independent options. Users can have:
   - Neither (cabinet sits on floor)
   - Legs only (exposed legs)
   - Plinth only (traditional base)
   - Both (legs hidden by plinth)

4. **Automatic leg count**: Sensible defaults based on cabinet width, with manual override for special cases.

5. **Domain-driven**: All leg logic is in `LegsDomain` for consistency with project architecture.

---

## Testing Checklist

- [ ] Legs generate at correct positions
- [ ] Leg count calculation works for different widths
- [ ] Height adjustment respects preset range
- [ ] All finish colors render correctly
- [ ] Round vs square shapes render properly
- [ ] Cabinet body offset is correct when legs enabled
- [ ] CSV export includes accessories section
- [ ] PropertiesPanel shows leg configuration
- [ ] Domain functions are pure and testable

---

## Success Criteria

1. User can enable/disable legs for any cabinet type
2. Legs render correctly in 3D view (round/square, correct colors)
3. Cabinet body is properly elevated when legs are enabled
4. Leg count auto-calculates based on width or can be overridden
5. CSV export shows legs in accessories section
6. Domain functions follow established patterns (creators, updaters, calculators, validators, queries)
