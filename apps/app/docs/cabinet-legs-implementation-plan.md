# Cabinet Legs Implementation Plan

## Overview
Add adjustable furniture legs (nóżki meblowe) functionality to all cabinet types in the furniture design application.

## Research Summary: Popular Furniture Leg Dimensions

Based on research from [IKEA](https://www.ikea.com/us/en/cat/frames-rail-legs-toekicks-23615/), [Furnica](https://furnica.eu/collections/regulowane-nozki-i-nogi-meblowe), and [Castorama](https://www.castorama.pl/akcesoria-metalowe/akcesoria-meblowe/nogi-meblowe.cat):

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

## Implementation Details

### 1. Type Definitions (`src/types/index.ts`)

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
 * Leg count mode
 */
export type LegCountMode = 'AUTO' | 'MANUAL';

/**
 * Complete leg configuration for a cabinet
 */
export interface LegsConfig {
  enabled: boolean;
  legType: LegTypeConfig;
  countMode: LegCountMode;
  manualCount?: number;        // Only used when countMode === 'MANUAL'
  currentHeight: number;       // mm - actual current height (within adjust range)
  /** Inset from cabinet edges (mm) - how far legs are from cabinet corners */
  cornerInset: number;
}

/**
 * Default leg configuration
 */
export const DEFAULT_LEGS_CONFIG: LegsConfig = {
  enabled: false,
  legType: {
    preset: 'STANDARD',
    height: 150,
    adjustRange: 20,
    diameter: 30,
    shape: 'ROUND',
    finish: 'BLACK_PLASTIC',
  },
  countMode: 'AUTO',
  currentHeight: 150,
  cornerInset: 50,  // 50mm from corners
};

/**
 * Leg preset configurations
 */
export const LEG_PRESETS: Record<LegPreset, Omit<LegTypeConfig, 'preset'>> = {
  SHORT: { height: 100, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  STANDARD: { height: 150, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  TALL: { height: 200, adjustRange: 30, diameter: 40, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
  CUSTOM: { height: 150, adjustRange: 20, diameter: 30, shape: 'ROUND', finish: 'BLACK_PLASTIC' },
};

// Add to CabinetBaseParams:
export interface CabinetBaseParams {
  // ... existing fields ...
  legs?: LegsConfig;  // Optional leg configuration
}

// Add to CabinetPartRole:
export type CabinetPartRole =
  | /* existing roles */
  | 'LEG';  // Cabinet leg (not a cut part - accessory)

// Add to CabinetPartMetadata:
export interface CabinetPartMetadata {
  // ... existing fields ...
  legIndex?: number;  // Which leg (0-based, for multi-leg setups)
}
```

### 2. Configuration Constants (`src/lib/config.ts`)

```typescript
// ============================================================================
// Cabinet Leg Configuration
// ============================================================================

/**
 * Leg preset configurations with Polish labels
 */
export const LEG_PRESET_OPTIONS: Array<{
  value: LegPreset;
  label: string;
  labelPl: string;
  description: string;
}> = [
  {
    value: 'SHORT',
    label: 'Short (100mm)',
    labelPl: 'Niskie (100mm)',
    description: '80-120mm, for low cabinets'
  },
  {
    value: 'STANDARD',
    label: 'Standard (150mm)',
    labelPl: 'Standardowe (150mm)',
    description: '130-170mm, most common'
  },
  {
    value: 'TALL',
    label: 'Tall (200mm)',
    labelPl: 'Wysokie (200mm)',
    description: '170-230mm, for accessibility'
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    labelPl: 'Niestandardowe',
    description: 'User-defined dimensions'
  },
];

/**
 * Leg finish options with labels
 */
export const LEG_FINISH_OPTIONS: Array<{
  value: LegFinish;
  label: string;
  labelPl: string;
  color: string;  // For 3D rendering
}> = [
  { value: 'BLACK_PLASTIC', label: 'Black Plastic', labelPl: 'Czarny plastik', color: '#1a1a1a' },
  { value: 'CHROME', label: 'Chrome', labelPl: 'Chrom', color: '#c0c0c0' },
  { value: 'BRUSHED_STEEL', label: 'Brushed Steel', labelPl: 'Stal szczotkowana', color: '#8a8a8a' },
  { value: 'WHITE_PLASTIC', label: 'White Plastic', labelPl: 'Biały plastik', color: '#f0f0f0' },
];

/**
 * Calculate optimal leg count based on cabinet width
 */
export function calculateLegCount(widthMm: number): number {
  if (widthMm < 1000) return 4;      // < 100cm: 4 legs
  if (widthMm <= 1800) return 6;     // 100-180cm: 6 legs
  return 8;                          // > 180cm: 8 legs
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
    // Could add more for very wide cabinets
  }

  return positions;
}
```

### 3. Leg Generator (`src/lib/cabinetGenerators/legs.ts`)

```typescript
/**
 * Cabinet leg generator
 * Generates leg parts (non-cut accessories) for 3D visualization
 */

import { LegsConfig, CabinetMaterials, LegFinish } from '@/types';
import { GeneratedPart } from './types';
import { calculateLegCount, calculateLegPositions, LEG_FINISH_OPTIONS } from '@/lib/config';

/**
 * Get color hex from leg finish
 */
function getLegColor(finish: LegFinish): string {
  const option = LEG_FINISH_OPTIONS.find(o => o.value === finish);
  return option?.color ?? '#1a1a1a';
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
  materials: CabinetMaterials,
  bodyMaterialThickness: number
): GeneratedPart[] {
  if (!legsConfig.enabled) return [];

  const parts: GeneratedPart[] = [];
  const { legType, countMode, manualCount, currentHeight, cornerInset } = legsConfig;

  // Calculate leg count
  const legCount = countMode === 'AUTO'
    ? calculateLegCount(cabinetWidth)
    : (manualCount ?? 4);

  // Get leg positions
  const positions = calculateLegPositions(cabinetWidth, cabinetDepth, legCount, cornerInset);

  // Leg dimensions for shape params
  const legDiameter = legType.diameter;
  const legHeight = currentHeight;

  // Generate each leg
  positions.forEach((pos, index) => {
    const [x, z] = pos;

    // Position leg at bottom of cabinet
    // Y = -legHeight/2 (leg center, since cabinet bottom is at Y=0 after leg offset)
    // Actually: legs position the cabinet UP, so legs are below Y=0
    // Leg center Y = legHeight/2 (above ground plane)
    const legCenterY = legHeight / 2;

    parts.push({
      name: `Nóżka ${index + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',  // We'll use a special rendering for legs
      shapeParams: {
        type: 'RECT',
        x: legDiameter,
        y: legDiameter  // For round legs, we use diameter as both dimensions
      },
      width: legDiameter,
      height: legDiameter,
      depth: legHeight,  // Height becomes depth for vertical cylinder
      position: [x, legCenterY, z],
      rotation: [-Math.PI / 2, 0, 0],  // Rotate to stand vertically
      materialId: materials.bodyMaterialId,  // Use body material ID but override color
      edgeBanding: { type: 'RECT', top: false, bottom: false, left: false, right: false },
      cabinetMetadata: {
        cabinetId,
        role: 'LEG',
        legIndex: index,
      },
      // Custom properties for leg rendering
      // (These will be used by Part3D to render legs specially)
      notes: JSON.stringify({
        legShape: legType.shape,
        legFinish: legType.finish,
        legColor: getLegColor(legType.finish),
        isAccessory: true,  // Not a cut part
      }),
    });
  });

  return parts;
}

/**
 * Calculate the Y offset that legs add to a cabinet
 * This is used to position the cabinet body above the legs
 */
export function calculateLegHeightOffset(legsConfig?: LegsConfig): number {
  if (!legsConfig?.enabled) return 0;
  return legsConfig.currentHeight;
}
```

### 4. Update Cabinet Generators

Each cabinet generator needs to:
1. Accept legs configuration from params
2. Apply Y offset to all parts
3. Generate leg parts

Example modification pattern for each generator:

```typescript
// In generateKitchenCabinet, generateWardrobe, etc.

import { generateLegs, calculateLegHeightOffset } from './legs';

export function generateKitchenCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  // ... existing code ...

  // Calculate leg offset
  const legOffset = calculateLegHeightOffset(params.legs);

  // Apply leg offset to all Y positions
  // For each part being generated, add legOffset to the Y position
  // e.g., position: [0, bottomPanelY + legOffset, 0]

  // Generate body parts with offset...

  // At the end, generate legs
  if (params.legs?.enabled) {
    const legParts = generateLegs(
      cabinetId,
      furnitureId,
      params.legs,
      width,
      depth,
      materials,
      thickness
    );
    parts.push(...legParts);
  }

  return parts;
}
```

### 5. UI Components

#### 5.1 LegsConfig Component (`src/components/ui/LegsConfig.tsx`)

```typescript
/**
 * Legs configuration component for CabinetTemplateDialog and PropertiesPanel
 */

interface LegsConfigProps {
  params: Partial<CabinetParams>;
  onChange: (params: Partial<CabinetParams>) => void;
}

// UI includes:
// - Enable/disable toggle
// - Preset selector (Short/Standard/Tall/Custom)
// - Height slider (within adjust range)
// - Finish selector (Black/Chrome/Steel/White)
// - Count mode toggle (Auto/Manual)
// - Manual count input (when manual mode)
// - Corner inset input (advanced)
```

#### 5.2 LegsConfigDialog Component (`src/components/ui/LegsConfigDialog.tsx`)

Full dialog for detailed leg configuration with preview.

### 6. PropertiesPanel Integration

Add new accordion section "Nóżki" (Legs) to cabinet mode:

```tsx
<AccordionItem value="legs" className="border rounded-md px-2 bg-card">
  <AccordionTrigger className="py-3 text-xs font-medium hover:no-underline">
    <div className="flex items-center gap-2">
      <FootprintsIcon className="h-4 w-4 text-muted-foreground" />
      Nóżki
      {params.legs?.enabled && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
          {params.legs.legType.preset} • {getLegCount()}szt
        </Badge>
      )}
    </div>
  </AccordionTrigger>
  <AccordionContent className="pb-4 pt-1 border-t mt-1">
    <LegsConfig params={localParams} onChange={updateLocalParams} />
  </AccordionContent>
</AccordionItem>
```

### 7. CabinetTemplateDialog Integration

Add legs configuration section in the "Wyposażenie" (Equipment) section:

```tsx
<ConfigRow
  title="Nóżki"
  description={legsConfig.enabled ? legsSummary : 'Brak (szafka na cokole lub podłodze)'}
  icon={<FootprintsIcon className="h-4 w-4" />}
  action={
    <Button variant="outline" size="sm" onClick={() => setLegsDialogOpen(true)}>
      Konfiguruj
    </Button>
  }
/>
```

### 8. 3D Rendering (`Part3D.tsx` modifications)

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

### 9. CSV Export Integration

Add separate accessories section for legs:

```typescript
// In csv.ts export function

interface AccessoryItem {
  type: string;
  name: string;
  quantity: number;
  dimensions: string;
  finish: string;
  notes: string;
}

function collectAccessories(cabinets: Cabinet[], parts: Part[]): AccessoryItem[] {
  const accessories: AccessoryItem[] = [];

  for (const cabinet of cabinets) {
    if (cabinet.params.legs?.enabled) {
      const legConfig = cabinet.params.legs;
      const legCount = legConfig.countMode === 'AUTO'
        ? calculateLegCount(cabinet.params.width)
        : (legConfig.manualCount ?? 4);

      accessories.push({
        type: 'LEG',
        name: `Nóżka ${legConfig.legType.preset}`,
        quantity: legCount,
        dimensions: `${legConfig.legType.diameter}mm x ${legConfig.currentHeight}mm`,
        finish: legConfig.legType.finish,
        notes: `Dla szafki: ${cabinet.name}`,
      });
    }
  }

  return accessories;
}

// Add accessories section to CSV output
```

---

## Implementation Steps

### Phase 1: Type Definitions and Constants
1. [ ] Add `LegsConfig`, `LegPreset`, `LegFinish`, `LegShape` types to `src/types/index.ts`
2. [ ] Add `LEG` to `CabinetPartRole`
3. [ ] Add `legs?: LegsConfig` to `CabinetBaseParams`
4. [ ] Add leg constants to `src/lib/config.ts`
5. [ ] Add leg presets and helper functions

### Phase 2: Generator Implementation
6. [ ] Create `src/lib/cabinetGenerators/legs.ts`
7. [ ] Update `generateKitchenCabinet` with leg support
8. [ ] Update `generateWardrobe` with leg support
9. [ ] Update `generateBookshelf` with leg support
10. [ ] Update `generateDrawerCabinet` with leg support
11. [ ] Update `CABINET_PRESETS` in config.ts to include default leg config

### Phase 3: 3D Rendering
12. [ ] Add leg rendering logic to `Part3D.tsx`
13. [ ] Test leg visualization with different shapes/finishes

### Phase 4: UI Components
14. [ ] Create `LegsConfig.tsx` component
15. [ ] Create `LegsConfigDialog.tsx` for detailed configuration
16. [ ] Update `PropertiesPanel.tsx` with legs accordion section
17. [ ] Update `CabinetTemplateDialog.tsx` with legs configuration row

### Phase 5: Integration & Export
18. [ ] Update cabinet store slice for leg-aware regeneration
19. [ ] Add accessories section to CSV export
20. [ ] Update translations (pl.json) for leg-related UI strings

### Phase 6: Testing & Polish
21. [ ] Test all cabinet types with legs
22. [ ] Test auto leg count calculation
23. [ ] Test manual leg count override
24. [ ] Test leg height adjustment
25. [ ] Verify CSV export includes accessories
26. [ ] Performance testing with many cabinets with legs

---

## Affected Files

### New Files
- `src/lib/cabinetGenerators/legs.ts` - Leg generator
- `src/components/ui/LegsConfig.tsx` - Simple leg config component
- `src/components/ui/LegsConfigDialog.tsx` - Full leg config dialog

### Modified Files
- `src/types/index.ts` - Type definitions
- `src/lib/config.ts` - Constants and presets
- `src/lib/cabinetGenerators/kitchenCabinet.ts` - Add leg support
- `src/lib/cabinetGenerators/wardrobe.ts` - Add leg support
- `src/lib/cabinetGenerators/bookshelf.ts` - Add leg support
- `src/lib/cabinetGenerators/drawerCabinet.ts` - Add leg support
- `src/components/ui/PropertiesPanel.tsx` - Add legs section
- `src/components/ui/CabinetTemplateDialog.tsx` - Add legs config
- `src/components/canvas/Part3D.tsx` - Add leg rendering
- `src/lib/csv.ts` - Add accessories export
- `src/messages/pl.json` - Polish translations

---

## Design Decisions

1. **Legs as non-cut parts**: Legs are accessories, not board parts. They have `isAccessory: true` in notes and are excluded from main cut list but included in accessories section.

2. **Y offset approach**: When legs are enabled, all cabinet parts get a Y offset equal to leg height. This positions the cabinet body above the legs naturally.

3. **Independent from plinth**: Legs and plinth (cokół) are independent options. Users can have:
   - Neither (cabinet sits on floor)
   - Legs only (exposed legs)
   - Plinth only (traditional base)
   - Both (legs hidden by plinth)

4. **Automatic leg count**: Sensible defaults based on cabinet width, with manual override option for special cases.

5. **3D visualization**: Legs rendered as actual geometry (cylinders/boxes) rather than just affecting position. This provides better visual feedback.

---

## Future Enhancements

- [ ] Leveler visualization (adjustment mechanism)
- [ ] Socket/mounting plate visualization
- [ ] Plinth clip integration
- [ ] Leg material cost calculation
- [ ] Weight load calculation based on leg count
- [ ] Custom leg shapes from library
