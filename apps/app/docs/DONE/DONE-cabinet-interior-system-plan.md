# Cabinet Interior & Decorative Panels System

## Overview

This plan describes the implementation of an advanced cabinet interior configuration system that combines:
1. **Enhanced Drawer Editor** - Visual improvements with dimensions and internal drawer visualization
2. **Unified Interior Configurator** - Combined drawer + shelf configuration with sections
3. **Extended Side Fronts** - Negative offsets for extending beyond cabinet
4. **Top/Bottom Decorative Panels** - Blenda, plinth (cokół), trim strips, full decorative panels

## Requirements Summary

### From User Clarification:
- Dimension visualization: **2D dialog only**
- Top/bottom fronts: **Both solutions** (negative offsets + separate panels)
- Shelf positioning: **Both modes** (uniform + manual)
- Drawers + shelves: **Horizontal sections** with configurable split
- Shelf depth presets: **Full, half, custom (mm)**
- UI approach: **Single advanced dialog** with excellent UX
- Panel types: **Blenda + Plinth + Trim strips + Full decorative panels**
- No backward compatibility needed - app not yet production

---

## Phase 1: Enhanced Drawer Config Dialog Visual Improvements

### 1.1 Zone Preview with Dimensions

**File:** `apps/app/src/components/ui/DrawerConfigDialog.tsx`

Current state:
- Shows zone preview with height ratios
- No actual mm dimensions
- Internal drawers (no front) shown with dashed border but no distinction for hidden drawers

Changes:
```
┌─────────────────────────────────────────────┐
│           Cabinet Width: 600mm               │
│  ┌───────────────────────────────────────┐  │
│  │  Zone 1 - Front      H: 200mm         │  │ ← Solid border for external front
│  │  [Drawer box inside - dashed outline] │  │ ← Dashed line showing hidden drawer box
│  ├───────────────────────────────────────┤  │
│  │  Zone 2 - Internal   H: 150mm         │  │ ← Dashed border for internal zone
│  │  [Drawer box - solid, visible]        │  │
│  ├───────────────────────────────────────┤  │
│  │  Zone 3 - Front      H: 250mm         │  │
│  │  [2 boxes inside - dashed outlines]   │  │ ← Multiple internal drawers
│  └───────────────────────────────────────┘  │
│           Drawer Width: 548mm                │ ← Calculated from slide clearance
└─────────────────────────────────────────────┘
```

**Implementation tasks:**

1. **Add dimension calculations to ZonePreview:**
   ```typescript
   interface ZonePreviewProps {
     zones: DrawerZone[];
     selectedZoneId: string | null;
     onSelectZone: (id: string) => void;
     onMoveZone: (id: string, direction: 'up' | 'down') => void;
     // NEW
     cabinetHeight: number;
     cabinetWidth: number;
     slideType: DrawerSlideType;
   }
   ```

2. **Calculate and display actual zone heights in mm:**
   - Use same calculation as generator: `(zoneRatio / totalRatio) * interiorHeight`
   - Show height label on each zone

3. **Show drawer box dimensions at top:**
   - Width = cabinetWidth - 2*sideOffset - 2*bodyThickness
   - Display once at top since all drawers same width

4. **Visualize internal drawer boxes with dashed lines:**
   - For zones with `front !== null`: draw dashed inner rectangle representing hidden drawer box
   - For zones with multiple boxes: draw multiple dashed horizontal divisions

### 1.2 Internal Drawer Visualization

**Visual representation in 2D preview:**

```
Zone with external front + 1 box:
┌──────────────────────────┐  ← Solid border (front panel)
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │  ← Dashed inner (drawer box)
│  │                    │  │
│  │   Box behind front │  │
│  │                    │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└──────────────────────────┘

Zone with external front + 2 boxes (drawer-in-drawer):
┌──────────────────────────┐  ← Solid border (front panel)
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │      Box 1         │  │  ← First hidden drawer
│  ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  │  ← Dashed divider
│  │      Box 2         │  │  ← Second hidden drawer
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└──────────────────────────┘

Zone without front (internal only):
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  ← All dashed (internal zone)
│                          │
│     Visible drawer box   │
│                          │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Phase 2: Extended Side Fronts Configuration

### 2.1 Negative Offsets for Side Fronts

**File:** `apps/app/src/components/ui/SideFrontsConfigDialog.tsx`

Current state:
- `bottomOffset` and `topOffset` have `min={0}`
- Cannot extend beyond cabinet

Changes:
- Allow negative values for both offsets
- Negative offset = panel extends beyond cabinet boundary

```typescript
// Update handlers to allow negative values
const handleBottomOffsetChange = (value: number) => {
  if (!config) return;
  // Remove max constraint, allow negative
  onUpdate({
    ...config,
    bottomOffset: value, // Can be negative
  });
};

const handleTopOffsetChange = (value: number) => {
  if (!config) return;
  onUpdate({
    ...config,
    topOffset: value, // Can be negative
  });
};
```

Update NumberInput to allow negative:
```tsx
<NumberInput
  value={config.bottomOffset}
  onChange={handleBottomOffsetChange}
  allowNegative={true}  // Changed from false
  className="w-full h-9"
/>
```

**Update descriptions:**
```
Offset dolny (mm):
- Wartość dodatnia: panel zaczyna się wyżej od dołu szafki
- Wartość ujemna: panel wystaje poniżej szafki (wydłużenie)

Offset górny (mm):
- Wartość dodatnia: panel kończy się niżej od góry szafki
- Wartość ujemna: panel wystaje powyżej szafki (wydłużenie)
```

### 2.2 Update Side Front Generator

**File:** `apps/app/src/lib/cabinetGenerators/sideFronts.ts`

The generator already uses the offset values correctly - negative values will naturally extend the panel:
```typescript
const height = cabinetHeight - bottomOffset - topOffset;
// With negative offsets, height becomes > cabinetHeight
```

Just need to update position calculation to account for negative bottomOffset:
```typescript
const panelCenterY = bottomOffset + height / 2;
// With negative bottomOffset, panel shifts down correctly
```

### 2.3 Update Preview Component

Update the `Preview` component to show panels extending beyond cabinet:
```typescript
// Allow negative percentages (will overflow container)
const leftTopPercent = hasLeft ? ((config.left?.topOffset ?? 0) / cabinetHeight) * 100 : 0;
const leftBottomPercent = hasLeft ? ((config.left?.bottomOffset ?? 0) / cabinetHeight) * 100 : 0;

// Visual: use clip-path or overflow:visible to show extensions
```

---

## Phase 3: Top/Bottom Decorative Panels

### 3.1 Type Definitions

**File:** `apps/app/src/types/index.ts`

```typescript
// ============================================================================
// Top/Bottom Decorative Panels
// ============================================================================

/**
 * Type of top/bottom decorative panel
 */
export type DecorativePanelType =
  | 'BLENDA'           // Top panel covering space above doors
  | 'PLINTH'           // Bottom plinth (cokół) - base of cabinet
  | 'TRIM_STRIP'       // Thin decorative trim strip
  | 'FULL_PANEL';      // Full decorative panel like side fronts

/**
 * Position of decorative panel
 */
export type DecorativePanelPosition = 'TOP' | 'BOTTOM';

/**
 * Configuration for a single decorative panel
 */
export interface DecorativePanelConfig {
  enabled: boolean;
  type: DecorativePanelType;
  position: DecorativePanelPosition;

  /** Material ID (defaults to frontMaterialId) */
  materialId?: string;

  /** Height of the panel in mm */
  height: number;

  /** Depth of panel (for PLINTH - how far it's recessed) */
  depth?: number;

  /** Offset from cabinet edge - for recessed plinth */
  recess?: number;

  /** For TRIM_STRIP: whether it's attached to front face */
  attachedToFront?: boolean;
}

/**
 * Full decorative panels configuration
 */
export interface DecorativePanelsConfig {
  top: DecorativePanelConfig | null;
  bottom: DecorativePanelConfig | null;
}

/**
 * Default configurations for each panel type
 */
export const DECORATIVE_PANEL_DEFAULTS: Record<DecorativePanelType, Partial<DecorativePanelConfig>> = {
  BLENDA: {
    height: 50,
    depth: undefined,
    recess: 0,
  },
  PLINTH: {
    height: 100,
    depth: 50,
    recess: 50, // How far plinth is recessed from front
  },
  TRIM_STRIP: {
    height: 20,
    attachedToFront: true,
  },
  FULL_PANEL: {
    height: 100,
    depth: undefined,
    recess: 0,
  },
};
```

### 3.2 Update Cabinet Base Params

```typescript
export interface CabinetBaseParams {
  // ... existing params ...

  /** Decorative panels (top/bottom) configuration */
  decorativePanels?: DecorativePanelsConfig;
}
```

### 3.3 Create Decorative Panels Generator

**New file:** `apps/app/src/lib/cabinetGenerators/decorativePanels.ts`

```typescript
/**
 * Generate decorative top/bottom panels
 */

import { DecorativePanelsConfig, DecorativePanelConfig } from '@/types';
import { GeneratedPart } from './types';

export interface DecorativePanelGeneratorConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  frontMaterialId: string;
  frontThickness: number;
  decorativePanels: DecorativePanelsConfig;
}

export function generateDecorativePanels(config: DecorativePanelGeneratorConfig): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  if (config.decorativePanels.top?.enabled) {
    parts.push(...generatePanel(config, config.decorativePanels.top, 'TOP'));
  }

  if (config.decorativePanels.bottom?.enabled) {
    parts.push(...generatePanel(config, config.decorativePanels.bottom, 'BOTTOM'));
  }

  return parts;
}

function generatePanel(
  config: DecorativePanelGeneratorConfig,
  panel: DecorativePanelConfig,
  position: 'TOP' | 'BOTTOM'
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  switch (panel.type) {
    case 'BLENDA':
      parts.push(generateBlenda(config, panel, position));
      break;
    case 'PLINTH':
      parts.push(generatePlinth(config, panel, position));
      break;
    case 'TRIM_STRIP':
      parts.push(generateTrimStrip(config, panel, position));
      break;
    case 'FULL_PANEL':
      parts.push(generateFullPanel(config, panel, position));
      break;
  }

  return parts;
}

// Individual generators for each panel type...
```

### 3.4 Create Configuration Dialog

**New file:** `apps/app/src/components/ui/DecorativePanelsConfigDialog.tsx`

Features:
- Toggle for top/bottom panels independently
- Panel type selector (Blenda, Plinth, Trim Strip, Full Panel)
- Type-specific configuration options
- Visual preview showing panel placement
- Material selector

---

## Phase 4: Unified Interior Configurator

### 4.1 New Type System for Cabinet Interior

**File:** `apps/app/src/types/index.ts`

```typescript
// ============================================================================
// Cabinet Interior System
// ============================================================================

/**
 * Type of content in a cabinet section
 */
export type SectionContentType = 'EMPTY' | 'SHELVES' | 'DRAWERS';

/**
 * Shelf depth preset
 */
export type ShelfDepthPreset = 'FULL' | 'HALF' | 'CUSTOM';

/**
 * Configuration for a single shelf
 */
export interface ShelfConfig {
  /** Shelf ID */
  id: string;

  /** Position from section bottom (mm) - for manual mode */
  positionY?: number;

  /** Depth preset */
  depthPreset: ShelfDepthPreset;

  /** Custom depth in mm (when depthPreset is CUSTOM) */
  customDepth?: number;

  /** Material ID (defaults to bodyMaterialId) */
  materialId?: string;
}

/**
 * Shelf configuration for a section
 */
export interface ShelvesConfiguration {
  /** Distribution mode */
  mode: 'UNIFORM' | 'MANUAL';

  /** Number of shelves (for UNIFORM mode) */
  count?: number;

  /** Individual shelf configs (for MANUAL mode or to override uniform) */
  shelves: ShelfConfig[];
}

/**
 * A horizontal section of the cabinet interior
 */
export interface CabinetSection {
  id: string;

  /** Height ratio relative to other sections */
  heightRatio: number;

  /** What this section contains */
  contentType: SectionContentType;

  /** Shelf configuration (when contentType is SHELVES) */
  shelvesConfig?: ShelvesConfiguration;

  /** Drawer configuration (when contentType is DRAWERS) */
  drawerConfig?: DrawerConfiguration;
}

/**
 * Complete cabinet interior configuration
 */
export interface CabinetInteriorConfig {
  /** Horizontal sections from bottom to top */
  sections: CabinetSection[];
}
```

### 4.2 Update Cabinet Params

```typescript
export interface CabinetBaseParams {
  // ... existing params ...

  /** New unified interior configuration */
  interiorConfig?: CabinetInteriorConfig;

  // Keep legacy fields for backward compatibility during transition:
  // shelfCount, drawerConfig, etc.
}
```

### 4.3 Create Interior Configurator Dialog

**New file:** `apps/app/src/components/ui/InteriorConfigDialog.tsx`

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Konfiguracja wnętrza szafki                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────┐   ┌─────────────────────────────────────┐  │
│  │     PODGLĄD 2D      │   │      KONFIGURACJA SEKCJI            │  │
│  │                     │   │                                      │  │
│  │  ┌───────────────┐  │   │  Sekcja 3 (góra) - Półki            │  │
│  │  │   Sekcja 3    │  │   │  ├─ Tryb: Równomierny               │  │
│  │  │   [Półki]     │  │   │  ├─ Ilość: 3                        │  │
│  │  │   H: 400mm    │  │   │  └─ Głębokość: Połowa               │  │
│  │  ├───────────────┤  │   │                                      │  │
│  │  │   Sekcja 2    │  │   │  ──────────────────────────────────  │  │
│  │  │   [Szuflady]  │  │   │                                      │  │
│  │  │   H: 350mm    │  │   │  Sekcja 2 (środek) - Szuflady       │  │
│  │  │   ┌─────────┐ │  │   │  ├─ Strefy: 3                       │  │
│  │  │   │ Front 1 │ │  │   │  ├─ Prowadnice: Boczne             │  │
│  │  │   ├─────────┤ │  │   │  └─ [Szczegóły...]                 │  │
│  │  │   │ Front 2 │ │  │   │                                      │  │
│  │  │   └─────────┘ │  │   │  ──────────────────────────────────  │  │
│  │  ├───────────────┤  │   │                                      │  │
│  │  │   Sekcja 1    │  │   │  Sekcja 1 (dół) - Pusta             │  │
│  │  │   [Pusta]     │  │   │  └─ Brak zawartości                 │  │
│  │  │   H: 150mm    │  │   │                                      │  │
│  │  └───────────────┘  │   │  ┌──────────────────────────────┐   │  │
│  │                     │   │  │  + Dodaj sekcję              │   │  │
│  │  Szerokość: 600mm   │   │  └──────────────────────────────┘   │  │
│  │  Głębokość: 500mm   │   │                                      │  │
│  └─────────────────────┘   └─────────────────────────────────────┘  │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  [Anuluj]                                           [Zastosuj]       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Component Structure

```
InteriorConfigDialog/
├── index.tsx                    # Main dialog wrapper
├── InteriorPreview.tsx          # 2D preview component
├── SectionEditor.tsx            # Section configuration panel
├── SectionList.tsx              # List of sections with add/remove
├── ShelvesEditor.tsx            # Shelf configuration within section
├── DrawersEditor.tsx            # Drawer configuration within section
├── hooks/
│   ├── useInteriorConfig.ts     # State management for config
│   └── useSectionCalculations.ts # Dimension calculations
└── utils/
    └── presets.ts               # Preset configurations
```

### 4.5 Interactive Preview Features

**2D Preview (InteriorPreview.tsx):**

1. **Section visualization:**
   - Solid borders for sections
   - Height labels in mm
   - Content type indicators (icons)

2. **Shelf visualization (when section has shelves):**
   - Horizontal lines for each shelf
   - Position labels
   - Depth indicators (full width vs half)
   - Dashed lines for half-depth shelves

3. **Drawer visualization (when section has drawers):**
   - Use existing ZonePreview component (adapted)
   - Front vs internal drawer distinction
   - Inner box dashed outlines

4. **Interactive features:**
   - Click to select section
   - Drag section borders to resize (ratio-based)
   - Hover states with dimension tooltips

### 4.6 Section Editor Features

**Content type selector:**
```tsx
<ToggleGroup value={section.contentType} onValueChange={handleContentTypeChange}>
  <ToggleGroupItem value="EMPTY">Pusta</ToggleGroupItem>
  <ToggleGroupItem value="SHELVES">Półki</ToggleGroupItem>
  <ToggleGroupItem value="DRAWERS">Szuflady</ToggleGroupItem>
</ToggleGroup>
```

**Height ratio slider:**
```tsx
<Slider
  value={[section.heightRatio]}
  onValueChange={([val]) => handleHeightRatioChange(val)}
  min={1}
  max={4}
  step={1}
/>
```

### 4.7 Shelves Editor

**Uniform mode:**
```tsx
<div className="space-y-3">
  <Label>Ilość półek</Label>
  <Slider value={[count]} onValueChange={setCount} min={0} max={10} />

  <Label>Głębokość wszystkich</Label>
  <ToggleGroup value={depthPreset}>
    <ToggleGroupItem value="FULL">Pełna</ToggleGroupItem>
    <ToggleGroupItem value="HALF">Połowa</ToggleGroupItem>
    <ToggleGroupItem value="CUSTOM">Custom</ToggleGroupItem>
  </ToggleGroup>
  {depthPreset === 'CUSTOM' && (
    <NumberInput value={customDepth} onChange={setCustomDepth} />
  )}
</div>
```

**Manual mode:**
```tsx
<div className="space-y-2">
  {shelves.map(shelf => (
    <ShelfRow
      key={shelf.id}
      shelf={shelf}
      onUpdate={updateShelf}
      onDelete={deleteShelf}
    />
  ))}
  <Button onClick={addShelf}>+ Dodaj półkę</Button>
</div>
```

### 4.8 Update Interior Generator

**New file:** `apps/app/src/lib/cabinetGenerators/interior/index.ts`

```typescript
/**
 * Generate cabinet interior based on unified configuration
 */

export function generateInterior(config: InteriorGeneratorConfig): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  // Calculate section boundaries
  const sections = calculateSectionBoundaries(config.interiorConfig, config.cabinetHeight);

  for (const section of sections) {
    switch (section.contentType) {
      case 'SHELVES':
        parts.push(...generateShelves(config, section));
        break;
      case 'DRAWERS':
        parts.push(...generateSectionDrawers(config, section));
        break;
      case 'EMPTY':
        // No parts to generate
        break;
    }
  }

  return parts;
}
```

---

## Phase 5: Integration & Migration

### 5.1 Update PropertiesPanel

**File:** `apps/app/src/components/ui/PropertiesPanel.tsx`

Replace separate shelf/drawer sections with unified interior section:

```tsx
{/* Interior Configuration */}
<AccordionItem value="interior">
  <AccordionTrigger>
    <span className="flex items-center gap-2">
      <Layers className="h-4 w-4" />
      Wnętrze
    </span>
  </AccordionTrigger>
  <AccordionContent>
    <InteriorSummary config={params.interiorConfig} />
    <Button onClick={() => setInteriorDialogOpen(true)}>
      Konfiguruj wnętrze
    </Button>
  </AccordionContent>
</AccordionItem>

{/* Decorative Panels */}
<AccordionItem value="decorative-panels">
  <AccordionTrigger>
    <span className="flex items-center gap-2">
      <Frame className="h-4 w-4" />
      Panele dekoracyjne
    </span>
  </AccordionTrigger>
  <AccordionContent>
    <DecorativePanelsSummary config={params.decorativePanels} />
    <Button onClick={() => setDecorativePanelsDialogOpen(true)}>
      Konfiguruj panele
    </Button>
  </AccordionContent>
</AccordionItem>
```

### 5.2 Update CabinetTemplateDialog

Add interior and decorative panels configuration to cabinet creation wizard.

### 5.3 Update Cabinet Generators

Modify each cabinet generator to use the new interior system:

```typescript
// In kitchenCabinet.ts, wardrobe.ts, etc.
function generateKitchenCabinet(config: GeneratorConfig): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  // Structure parts (sides, top, bottom, back)
  parts.push(...generateStructure(config));

  // NEW: Interior from unified config
  if (config.params.interiorConfig) {
    parts.push(...generateInterior(config));
  } else {
    // Legacy: generate from old shelf/drawer params
    parts.push(...generateLegacyShelves(config));
    parts.push(...generateLegacyDrawers(config));
  }

  // Decorative panels
  if (config.params.decorativePanels) {
    parts.push(...generateDecorativePanels(config));
  }

  // Doors, side fronts, etc.
  parts.push(...generateDoors(config));
  parts.push(...generateSideFronts(config));

  return parts;
}
```

---

## File Structure

### New Files to Create:

```
apps/app/src/
├── components/ui/
│   ├── InteriorConfigDialog/
│   │   ├── index.tsx
│   │   ├── InteriorPreview.tsx
│   │   ├── SectionEditor.tsx
│   │   ├── SectionList.tsx
│   │   ├── ShelvesEditor.tsx
│   │   ├── DrawersEditor.tsx
│   │   └── hooks/
│   │       ├── useInteriorConfig.ts
│   │       └── useSectionCalculations.ts
│   └── DecorativePanelsConfigDialog.tsx
├── lib/cabinetGenerators/
│   ├── decorativePanels.ts
│   └── interior/
│       ├── index.ts
│       ├── shelves.ts
│       ├── sectionDrawers.ts
│       └── calculations.ts
└── types/
    └── index.ts (updates)
```

### Files to Modify:

```
apps/app/src/
├── components/ui/
│   ├── DrawerConfigDialog.tsx (Phase 1 visual improvements)
│   ├── SideFrontsConfigDialog.tsx (Phase 2 negative offsets)
│   ├── PropertiesPanel.tsx (Phase 5 integration)
│   └── CabinetTemplateDialog.tsx (Phase 5 integration)
├── lib/cabinetGenerators/
│   ├── kitchenCabinet.ts
│   ├── wardrobe.ts
│   ├── bookshelf.ts
│   ├── drawerCabinet.ts
│   └── sideFronts.ts (Phase 2 negative offset handling)
└── types/
    └── index.ts (new types)
```

---

## Implementation Order

### Phase 1: Drawer Dialog Visual Improvements (Estimated: ~4h)
1. Update ZonePreview component with dimension props
2. Add dimension labels (height per zone, width at top)
3. Implement dashed line visualization for internal drawers
4. Add box count visualization within zones

### Phase 2: Side Fronts Extension (Estimated: ~2h)
1. Allow negative offsets in SideFrontsConfigDialog
2. Update preview to show panel extensions
3. Verify generator handles negative values correctly
4. Update help text/descriptions

### Phase 3: Decorative Panels (Estimated: ~6h)
1. Add type definitions
2. Create DecorativePanelsConfigDialog
3. Implement panel generators for each type
4. Add to PropertiesPanel

### Phase 4: Unified Interior Configurator (Estimated: ~10h)
1. Add type definitions for sections
2. Create InteriorConfigDialog structure
3. Implement InteriorPreview with section visualization
4. Implement SectionEditor with content type switching
5. Implement ShelvesEditor (uniform + manual modes)
6. Implement DrawersEditor (adapt from existing)
7. Create interior generator

### Phase 5: Integration (Estimated: ~4h)
1. Update PropertiesPanel
2. Update CabinetTemplateDialog
3. Update cabinet generators
4. Testing and bug fixes

---

## UI/UX Considerations

### Design Principles:
1. **Progressive disclosure** - Show basic options first, advanced on demand
2. **Visual feedback** - Preview updates in real-time
3. **Sensible defaults** - Pre-configured presets for common scenarios
4. **Clear hierarchy** - Sections → Content → Details

### Interaction Patterns:
1. Click section in preview to select and edit
2. Drag section borders to resize (visual only, updates ratio)
3. Toggle group for content type selection
4. Expandable cards for detailed configuration

### Accessibility:
1. Keyboard navigation for all controls
2. Clear focus states
3. Descriptive labels and ARIA attributes

---

## Testing Checklist

### Phase 1:
- [ ] Dimensions display correctly for various zone configurations
- [ ] Dashed lines appear for internal drawers
- [ ] Multiple boxes visualized within zones
- [ ] Dimensions update when slide type changes

### Phase 2:
- [ ] Negative offsets accepted in inputs
- [ ] Preview shows extensions correctly
- [ ] Generated parts position correctly with negative offsets
- [ ] Height calculation correct with extensions

### Phase 3:
- [ ] All panel types generate correctly
- [ ] Material selection works
- [ ] Plinth recess positions correctly
- [ ] Panel dimensions match configuration

### Phase 4:
- [ ] Sections add/remove/reorder correctly
- [ ] Content type switching preserves relevant data
- [ ] Shelf uniform mode distributes evenly
- [ ] Shelf manual mode allows precise positioning
- [ ] Drawer configuration works within sections
- [ ] Preview accurately reflects configuration

### Phase 5:
- [ ] PropertiesPanel shows correct sections
- [ ] CabinetTemplateDialog integrates new features
- [ ] Generated parts match configuration
- [ ] No regressions in existing functionality

---

## Notes

- No backward compatibility needed - feel free to replace old system entirely
- Focus on excellent UX - this is a complex feature, needs clear UI
- Use existing patterns from DrawerConfigDialog and SideFrontsConfigDialog
- Reuse ZonePreview component logic where applicable
- Consider adding presets for common cabinet interior configurations
