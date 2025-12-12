# Advanced Drawer Generator - Full Implementation Plan

## Overview

A zone-based drawer configuration system that allows complex drawer layouts while maintaining consistency with existing UI patterns.

---

## Part 1: UX Design

### Design Principles (Consistent with Existing App)

1. **Progressive Disclosure** - Start simple, reveal complexity only when needed
2. **Visual Feedback** - Real-time 2D preview of drawer layout
3. **Familiar Patterns** - Use same components: Accordion, Slider, Button groups, NumberInput
4. **Polish Language** - All UI text in Polish
5. **Compact Layout** - Fit in PropertiesPanel width (~280px)

### Entry Points

#### A. During Cabinet Creation (CabinetTemplateDialog)
- After configuring basic parameters
- "Dodaj szuflady" toggle switch
- When enabled, shows inline drawer zone configuration

#### B. During Cabinet Editing (PropertiesPanel)
- New accordion section: "Szuflady"
- Only visible for cabinets that support drawers
- Opens DrawerZoneEditor inline

---

## Part 2: UI Components

### 2.1 DrawerZoneEditor (Main Component)

```
┌─────────────────────────────────────────────────────────────┐
│ ▼ Szuflady                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           PODGLĄD (DrawerZonePreview)               │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │   │
│  │  │░░░░░░░░░░░░░░ GÓRA SZAFKI ░░░░░░░░░░░░░░░░░░░░│  │   │
│  │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │←│   │
│  │  │ Front 1                               150mm │ │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │←│   │
│  │  │ Front 2 (2× wewn.)                    200mm │ │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │←│   │
│  │  │ Front 3                               150mm │ │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  Wysokość szuflad: 500mm / 720mm                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ STREFY SZUFLAD                                      │   │
│  │                                                     │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Strefa 1                              [↑][↓][×] │ │   │
│  │ │ ┌───────────────────────────────────────────┐   │ │   │
│  │ │ │ [Standard ▼] Wysokość: [150] mm           │   │ │   │
│  │ │ └───────────────────────────────────────────┘   │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Strefa 2 (aktywna)                    [↑][↓][×] │ │   │
│  │ │ ┌───────────────────────────────────────────┐   │ │   │
│  │ │ │ [Połączona ▼] Wysokość: [200] mm          │   │ │   │
│  │ │ │ Szuflady wewnętrzne: [2]  ──●──           │   │ │   │
│  │ │ └───────────────────────────────────────────┘   │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Strefa 3                              [↑][↓][×] │ │   │
│  │ │ ┌───────────────────────────────────────────┐   │ │   │
│  │ │ │ [Standard ▼] Wysokość: [150] mm           │   │ │   │
│  │ │ └───────────────────────────────────────────┘   │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │ [+ Dodaj strefę]                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ Ustawienia prowadnic                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▶ Uchwyty szuflad                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 DrawerZonePreview (2D Visual)

Features:
- Shows cabinet body outline (gray)
- Shows each drawer zone with front panel (colored)
- Indicates zone height in mm
- Highlights selected zone
- Shows "combined" zones with internal drawer lines
- Click on zone to select it
- Drag zone borders to resize (stretch goal)

Visual encoding:
- Cabinet body: `bg-muted` (gray)
- Standard drawer front: `bg-primary/20` with border
- Combined drawer front: Same + dashed internal lines
- Internal drawer (no front): `bg-muted-foreground/10` with dashed border
- Selected zone: `ring-2 ring-primary`
- Remaining space (top): Cross-hatched pattern

### 2.3 DrawerZoneItem (Single Zone Card)

```
┌─────────────────────────────────────────────────────────┐
│ Strefa 1                                      [↑][↓][×] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Typ:     [Standard     ▼]                           │ │
│ │ Wysokość: [150    ] mm                              │ │
│ │                                                     │ │
│ │ (for Combined only:)                                │ │
│ │ Szuflady wewnętrzne: 2      ────●────               │ │
│ │                              1  2  3  4             │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Zone types:
- **Standard** - One drawer box + one front
- **Połączona** - One front covering N internal drawer boxes
- **Wewnętrzna** - Internal drawer boxes without front (for behind doors)

### 2.4 SlideSettingsAccordion

```
┌─────────────────────────────────────────────────────────┐
│ ▼ Ustawienia prowadnic                                  │
├─────────────────────────────────────────────────────────┤
│ Typ prowadnic                                           │
│ [Boczne    ▼]   Offset: 13mm/stronę                     │
│                                                         │
│ Materiał dna szuflad                                    │
│ [HDF 3mm   ▼]                                           │
│                                                         │
│ Przerwa między frontami                                 │
│ [3    ] mm                                              │
└─────────────────────────────────────────────────────────┘
```

### 2.5 DrawerHandleAccordion

Uses existing HandleSelector component:
```
┌─────────────────────────────────────────────────────────┐
│ ▼ Uchwyty szuflad                                       │
├─────────────────────────────────────────────────────────┤
│ Zastosuj do wszystkich frontów                          │
│                                                         │
│ <HandleSelector                                         │
│   value={...}                                           │
│   onChange={...}                                        │
│   doorWidth={frontWidth}                                │
│   doorHeight={avgFrontHeight}                           │
│ />                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Part 3: Data Structures

### 3.1 Types

```typescript
// src/types/index.ts

/**
 * Type of drawer zone
 */
export type DrawerZoneType =
  | 'STANDARD'   // One box + one front
  | 'COMBINED'   // One front covering multiple internal boxes
  | 'INTERNAL';  // Internal boxes only (no front)

/**
 * Single drawer zone configuration
 */
export interface DrawerZone {
  id: string;
  type: DrawerZoneType;
  heightMm: number; // Total zone height
  internalCount?: number; // For COMBINED/INTERNAL: number of boxes (default 1)
}

/**
 * Complete drawer configuration for a cabinet
 */
export interface DrawerConfiguration {
  enabled: boolean;
  zones: DrawerZone[];
  slideType: DrawerSlideType;
  frontGapMm: number; // Gap between fronts (default 3)
  bottomMaterialId?: string; // Optional thin material for drawer bottoms
  handleConfig?: HandleConfig; // Applied to all fronts
}

// Default configuration
export const DEFAULT_DRAWER_CONFIGURATION: DrawerConfiguration = {
  enabled: false,
  zones: [],
  slideType: 'SIDE_MOUNT',
  frontGapMm: 3,
};
```

### 3.2 Updated CabinetBaseParams

```typescript
export interface CabinetBaseParams {
  width: number;
  height: number;
  depth: number;
  topBottomPlacement: TopBottomPlacement;
  hasBack: boolean;
  backOverlapRatio: number;
  backMountType: BackMountType;
  // New: drawer configuration
  drawerConfig?: DrawerConfiguration;
}
```

### 3.3 Remove Redundant Fields

Remove from DrawerCabinetParams (use drawerConfig instead):
- ~~drawerCount~~
- ~~drawerSlideType~~
- ~~hasInternalDrawers~~
- ~~drawerHeights~~
- ~~handleConfig~~

DrawerCabinetParams becomes:
```typescript
export interface DrawerCabinetParams extends CabinetBaseParams {
  type: 'DRAWER';
  // All drawer config comes from drawerConfig in base
}
```

---

## Part 4: Generation Logic

### 4.1 Zone Generation Algorithm

```typescript
interface ZoneGenerationContext {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyThickness: number;
  frontThickness: number;
  slideConfig: DrawerSlideConfig;
  frontGapMm: number;
  bottomThickness: number;
  bodyMaterialId: string;
  frontMaterialId: string;
  bottomMaterialId?: string;
  handleConfig?: HandleConfig;
}

function generateDrawerZones(
  zones: DrawerZone[],
  context: ZoneGenerationContext
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parts: Part[] = [];

  // Calculate total zones height
  const totalZonesHeight = zones.reduce((sum, z) => sum + z.heightMm, 0);

  // Zones stack from bottom of cabinet
  // Front positions calculated relative to cabinet exterior (with FRONT_MARGIN)
  // Box positions calculated relative to cabinet interior

  let currentFrontY = FRONT_MARGIN; // Start from bottom margin
  let currentBoxY = context.bodyThickness; // Start above bottom panel

  // Calculate front heights (accounting for gaps)
  const frontZones = zones.filter(z => z.type !== 'INTERNAL');
  const totalFrontGaps = (frontZones.length - 1) * context.frontGapMm;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const zoneIndex = i;

    // Box interior height for this zone
    const boxInteriorHeight = zone.heightMm * (context.cabinetHeight - 2 * context.bodyThickness) / totalZonesHeight;

    if (zone.type === 'STANDARD') {
      // Generate single drawer with front
      parts.push(...generateStandardZone(zone, zoneIndex, currentFrontY, currentBoxY, boxInteriorHeight, context));
      currentFrontY += getFrontHeight(zone, context) + context.frontGapMm;
    }
    else if (zone.type === 'COMBINED') {
      // Generate multiple internal boxes + one front
      parts.push(...generateCombinedZone(zone, zoneIndex, currentFrontY, currentBoxY, boxInteriorHeight, context));
      currentFrontY += getFrontHeight(zone, context) + context.frontGapMm;
    }
    else if (zone.type === 'INTERNAL') {
      // Generate internal boxes only (no front)
      parts.push(...generateInternalZone(zone, zoneIndex, currentBoxY, boxInteriorHeight, context));
    }

    currentBoxY += boxInteriorHeight;
  }

  return parts;
}
```

### 4.2 Zone Type Generators

```typescript
// STANDARD: One drawer box + one front
function generateStandardZone(...) {
  return [
    // Drawer box (bottom, sides, back)
    ...generateDrawerBox(zoneIndex, 0, boxY, boxHeight, context),
    // Front panel
    generateDrawerFront(zoneIndex, frontY, frontHeight, context),
  ];
}

// COMBINED: One front + N internal boxes
function generateCombinedZone(zone, zoneIndex, frontY, boxY, totalBoxHeight, context) {
  const parts = [];
  const internalCount = zone.internalCount ?? 2;
  const singleBoxHeight = totalBoxHeight / internalCount;

  // Generate N internal boxes
  for (let i = 0; i < internalCount; i++) {
    parts.push(...generateDrawerBox(
      zoneIndex,
      i, // internal index
      boxY + i * singleBoxHeight,
      singleBoxHeight,
      context
    ));
  }

  // Generate single front covering all internal boxes
  parts.push(generateDrawerFront(zoneIndex, frontY, frontHeight, context));

  return parts;
}

// INTERNAL: N boxes without front
function generateInternalZone(zone, zoneIndex, boxY, totalBoxHeight, context) {
  const parts = [];
  const count = zone.internalCount ?? 1;
  const singleBoxHeight = totalBoxHeight / count;

  for (let i = 0; i < count; i++) {
    parts.push(...generateDrawerBox(
      zoneIndex,
      i,
      boxY + i * singleBoxHeight,
      singleBoxHeight,
      context
    ));
  }

  return parts;
}
```

---

## Part 5: Component Hierarchy

```
DrawerZoneEditor (main component)
├── DrawerZonePreview (2D visual)
│   └── ZonePreviewItem (single zone in preview)
├── DrawerZoneList
│   └── DrawerZoneItem (single zone config card)
│       ├── Select (zone type)
│       ├── NumberInput (height)
│       └── Slider (internal count, if COMBINED/INTERNAL)
├── Accordion: SlideSettings
│   ├── Select (slide type)
│   ├── Select (bottom material)
│   └── NumberInput (front gap)
└── Accordion: HandleConfig
    └── HandleSelector (existing component)
```

---

## Part 6: Integration Points

### 6.1 CabinetTemplateDialog

```tsx
// In ParameterForm for any cabinet type:

{/* Drawer configuration toggle */}
<div className="flex items-center justify-between">
  <Label>Szuflady</Label>
  <Switch
    checked={params.drawerConfig?.enabled ?? false}
    onCheckedChange={(enabled) => {
      onChange({
        ...params,
        drawerConfig: enabled
          ? { ...DEFAULT_DRAWER_CONFIGURATION, enabled: true }
          : { ...DEFAULT_DRAWER_CONFIGURATION, enabled: false }
      });
    }}
  />
</div>

{params.drawerConfig?.enabled && (
  <DrawerZoneEditor
    config={params.drawerConfig}
    onChange={(drawerConfig) => onChange({ ...params, drawerConfig })}
    cabinetHeight={params.height}
    cabinetWidth={params.width}
  />
)}
```

### 6.2 PropertiesPanel (Cabinet Mode)

Add new accordion section when cabinet has or can have drawers:

```tsx
<AccordionItem value="drawers" className="border-b-0">
  <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
    Szuflady
  </AccordionTrigger>
  <AccordionContent className="pb-2 pt-0">
    <DrawerZoneEditor
      config={selectedCabinet.params.drawerConfig ?? DEFAULT_DRAWER_CONFIGURATION}
      onChange={(drawerConfig) => updateCabinetParams(selectedCabinet.id, { drawerConfig })}
      cabinetHeight={selectedCabinet.params.height}
      cabinetWidth={selectedCabinet.params.width}
    />
  </AccordionContent>
</AccordionItem>
```

### 6.3 Cabinet Generators

Each generator (Kitchen, Wardrobe, Bookshelf, Drawer) checks for drawerConfig:

```typescript
export function generateKitchenCabinet(...) {
  // ... generate body, shelves, doors ...

  // Generate drawers if configured
  if (params.drawerConfig?.enabled && params.drawerConfig.zones.length > 0) {
    const drawerParts = generateDrawerZones(params.drawerConfig.zones, {
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      // ... etc
    });
    parts.push(...drawerParts);
  }

  return parts;
}
```

---

## Part 7: Presets

Quick-start configurations for common use cases:

```typescript
export const DRAWER_PRESETS = {
  // 3 equal standard drawers
  KITCHEN_BASE: {
    enabled: true,
    zones: [
      { id: '1', type: 'STANDARD', heightMm: 150 },
      { id: '2', type: 'STANDARD', heightMm: 150 },
      { id: '3', type: 'STANDARD', heightMm: 150 },
    ],
    slideType: 'SIDE_MOUNT',
    frontGapMm: 3,
  },

  // 1 standard + 1 combined (2 internal)
  KITCHEN_COMBO: {
    enabled: true,
    zones: [
      { id: '1', type: 'STANDARD', heightMm: 150 },
      { id: '2', type: 'COMBINED', heightMm: 300, internalCount: 2 },
    ],
    slideType: 'SIDE_MOUNT',
    frontGapMm: 3,
  },

  // Internal drawers for wardrobe with doors
  WARDROBE_INTERNAL: {
    enabled: true,
    zones: [
      { id: '1', type: 'INTERNAL', heightMm: 400, internalCount: 3 },
    ],
    slideType: 'UNDERMOUNT',
    frontGapMm: 0,
  },
};
```

UI for presets:
```
┌─────────────────────────────────────────────────────────┐
│ Szybki start                                            │
│ [3 równe ▾] [Combo ▾] [Wewnętrzne ▾] [Własna konfiguracja]│
└─────────────────────────────────────────────────────────┘
```

---

## Part 8: Validation

### 8.1 Height Validation
- Sum of zone heights must not exceed cabinet interior height
- Show warning when total exceeds available space
- Auto-adjust option: "Dopasuj wysokości"

### 8.2 Minimum Heights
- Standard zone: min 80mm
- Combined zone: min 120mm (for 2 internal)
- Internal zone: min 60mm per box

### 8.3 Real-time Feedback
- Preview updates immediately on changes
- Invalid zones highlighted in red
- Error messages below zones list

---

## Part 9: Implementation Phases

### Phase 1: Core Types & Basic UI (2-3h)
- [ ] Define DrawerZone, DrawerConfiguration types
- [ ] Add drawerConfig to CabinetBaseParams
- [ ] Create DrawerZoneEditor skeleton
- [ ] Create DrawerZonePreview (static)
- [ ] Create DrawerZoneItem (single zone card)

### Phase 2: Zone Management (2h)
- [ ] Add zone (default STANDARD)
- [ ] Remove zone
- [ ] Reorder zones (up/down)
- [ ] Zone type selector
- [ ] Height input
- [ ] Internal count slider (for COMBINED/INTERNAL)

### Phase 3: Preview & Validation (2h)
- [ ] Interactive preview (click to select)
- [ ] Height validation
- [ ] Visual feedback for errors
- [ ] Real-time preview updates

### Phase 4: Generation Logic (3h)
- [ ] Refactor generateSingleDrawer to use zones
- [ ] Implement generateStandardZone
- [ ] Implement generateCombinedZone
- [ ] Implement generateInternalZone
- [ ] Update all cabinet generators

### Phase 5: Integration (2h)
- [ ] Add to CabinetTemplateDialog
- [ ] Add to PropertiesPanel
- [ ] Presets system
- [ ] Settings accordion (slide type, materials)

### Phase 6: Polish & Testing (2h)
- [ ] Handle configuration integration
- [ ] Translations
- [ ] Edge cases
- [ ] Manual testing

**Total estimated: ~13-15h**

---

## Part 10: Files to Create/Modify

### New Files
```
src/components/ui/DrawerZoneEditor.tsx      # Main component
src/components/ui/DrawerZonePreview.tsx     # 2D preview
src/components/ui/DrawerZoneItem.tsx        # Zone card
src/lib/drawerZoneGenerator.ts              # Zone generation logic
```

### Modified Files
```
src/types/index.ts                          # New types
src/lib/config.ts                           # Presets, constants
src/lib/cabinetGenerators.ts                # Integration
src/components/ui/CabinetTemplateDialog.tsx # Integration
src/components/ui/PropertiesPanel.tsx       # Integration
src/messages/pl.json                        # Translations
src/messages/en.json                        # Translations
```

---

## Part 11: UI Text (Polish)

```json
{
  "DrawerZoneEditor": {
    "title": "Szuflady",
    "addZone": "Dodaj strefę",
    "removeZone": "Usuń",
    "moveUp": "Przenieś wyżej",
    "moveDown": "Przenieś niżej",
    "zoneHeight": "Wysokość",
    "zoneType": "Typ",
    "internalCount": "Szuflady wewnętrzne",
    "types": {
      "STANDARD": "Standardowa",
      "COMBINED": "Połączona",
      "INTERNAL": "Wewnętrzna"
    },
    "typeDescriptions": {
      "STANDARD": "Jedna szuflada z frontem",
      "COMBINED": "Jeden front przykrywa wiele szuflad",
      "INTERNAL": "Szuflady bez frontu (za drzwiami)"
    },
    "presets": {
      "label": "Szybki start",
      "threeEqual": "3 równe",
      "combo": "1 + połączona",
      "internal": "Wewnętrzne",
      "custom": "Własna"
    },
    "settings": {
      "title": "Ustawienia prowadnic",
      "slideType": "Typ prowadnic",
      "bottomMaterial": "Materiał dna",
      "frontGap": "Przerwa między frontami"
    },
    "handles": {
      "title": "Uchwyty szuflad",
      "applyToAll": "Zastosuj do wszystkich frontów"
    },
    "preview": {
      "totalHeight": "Wysokość szuflad",
      "availableHeight": "Dostępna wysokość",
      "remaining": "Pozostało"
    },
    "validation": {
      "exceedsHeight": "Suma wysokości przekracza dostępną przestrzeń",
      "minHeight": "Minimalna wysokość strefy to {min}mm",
      "noZones": "Dodaj co najmniej jedną strefę szuflad"
    }
  }
}
```

---

## Summary

This plan provides:

1. **Consistent UX** - Uses existing patterns (accordions, sliders, buttons)
2. **Visual Feedback** - Real-time 2D preview with zone selection
3. **Flexibility** - Three zone types cover all use cases
4. **Progressive Disclosure** - Simple toggle to enable, detailed config only when needed
5. **Quick Start** - Presets for common configurations
6. **Validation** - Real-time feedback with error messages

The implementation can be done incrementally, with each phase adding value.
