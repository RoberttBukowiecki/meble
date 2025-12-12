# Side Front Panel Implementation Plan

## Overview

Add the ability to configure optional decorative front panels on the left and/or right sides of any cabinet type. These side fronts provide a finished look when cabinets are placed at the end of a row or in visible positions.

## Requirements Summary

| Requirement | Details |
|-------------|---------|
| Sides | Left and Right independently configurable |
| Forward Protrusion | Configurable offset (default: same as front panel protrusion) |
| Material | Separate material per side (default: frontMaterialId) |
| Vertical Offset | Configurable top and bottom offsets |
| Handles | No handles on side fronts (decorative only) |
| Cabinet Types | All types (KITCHEN, WARDROBE, BOOKSHELF, DRAWER) |
| Default State | Disabled - user must explicitly enable |

---

## 1. Type Definitions

### 1.1 New Types in `src/types/index.ts`

```typescript
/**
 * Configuration for a single side front panel
 */
interface SideFrontConfig {
  enabled: boolean;

  /** Material ID for this side front (defaults to cabinet.materials.frontMaterialId) */
  materialId?: string;

  /** How far the side front extends beyond the cabinet front face (mm) */
  forwardProtrusion: number;

  /** Distance from cabinet bottom to start of side front (mm) */
  bottomOffset: number;

  /** Distance from cabinet top to end of side front (mm) */
  topOffset: number;
}

/**
 * Configuration for both side fronts
 */
interface SideFrontsConfig {
  left: SideFrontConfig | null;  // null = disabled
  right: SideFrontConfig | null; // null = disabled
}

/**
 * Default side front configuration factory
 */
const DEFAULT_SIDE_FRONT_CONFIG: SideFrontConfig = {
  enabled: true,
  materialId: undefined, // Uses frontMaterialId
  forwardProtrusion: 0,  // Calculated at generation time based on front material thickness
  bottomOffset: 0,
  topOffset: 0,
};
```

### 1.2 Update CabinetParams Types

Add `sideFronts` property to all cabinet param types:

```typescript
// Add to KitchenCabinetParams, WardrobeCabinetParams, BookshelfCabinetParams, DrawerCabinetParams:
interface KitchenCabinetParams {
  type: 'KITCHEN';
  // ... existing properties
  sideFronts?: SideFrontsConfig;  // Optional, defaults to { left: null, right: null }
}
```

### 1.3 New Cabinet Part Role

```typescript
type CabinetPartRole =
  | 'BOTTOM'
  | 'TOP'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE'
  | 'BACK'
  | 'SHELF'
  | 'DOOR'
  | 'DRAWER_FRONT'
  | 'DRAWER_BOX_FRONT'
  | 'DRAWER_SIDE'
  | 'DRAWER_SIDE_LEFT'
  | 'DRAWER_SIDE_RIGHT'
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM'
  | 'SIDE_FRONT_LEFT'   // NEW
  | 'SIDE_FRONT_RIGHT'; // NEW
```

---

## 2. Cabinet Generator Updates

### 2.1 New Generator File: `src/lib/cabinetGenerators/sideFronts.ts`

```typescript
interface SideFrontGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  frontMaterialThickness: number;
  sideFrontsConfig: SideFrontsConfig;
  defaultFrontMaterialId: string;
  materials: Map<string, Material>; // For looking up material thickness
}

export function generateSideFronts(config: SideFrontGenerationConfig): GeneratedPart[];
```

### 2.2 Side Front Geometry Calculations

```
LEFT SIDE FRONT:
┌────────────────────────────────────────────────┐
│                   TOP VIEW                      │
│                                                 │
│    ┌─────────────────────────────┐              │
│    │        CABINET              │              │
│    │                             │              │
│ S  │                             │              │
│ I  │                             │   FRONT      │
│ D  │                             │   DOORS      │
│ E  │                             │              │
│    │                             │              │
│ F  └─────────────────────────────┘              │
│ R  ↓                                            │
│ O  forwardProtrusion                            │
│ N  ↓                                            │
│ T  ████                                         │
│                                                 │
└────────────────────────────────────────────────┘

SIDE VIEW (LEFT):
┌────────────────────────────────────────────────┐
│                                                 │
│  topOffset ↕                                    │
│            ┌───────────────────────┐            │
│            │                       │            │
│            │    SIDE FRONT         │            │
│            │                       │            │
│            │    (height =          │            │
│            │     cabinetHeight     │            │
│            │     - topOffset       │            │
│            │     - bottomOffset)   │            │
│            │                       │            │
│            └───────────────────────┘            │
│  bottomOffset ↕                                 │
│  ═══════════════════════════════════ (floor)   │
│                                                 │
└────────────────────────────────────────────────┘
```

### 2.3 Position Calculations

```typescript
// Left Side Front Position
const leftSideFrontX = -(cabinetWidth / 2) - (bodyMaterialThickness / 2) - (sideFrontThickness / 2);
const leftSideFrontY = (bottomOffset + effectiveHeight / 2);
const leftSideFrontZ = forwardProtrusion / 2;

// Right Side Front Position (mirror of left)
const rightSideFrontX = (cabinetWidth / 2) + (bodyMaterialThickness / 2) + (sideFrontThickness / 2);

// Dimensions
const sideFrontWidth = sideFrontMaterialThickness;  // Actually the depth of the panel
const sideFrontHeight = cabinetHeight - topOffset - bottomOffset;
const sideFrontDepth = cabinetDepth + forwardProtrusion;  // Extends forward
```

### 2.4 Integration with Cabinet Generators

Update all cabinet generators to call `generateSideFronts()`:

```typescript
// In kitchenCabinet.ts, wardrobe.ts, bookshelf.ts, drawerCabinet.ts:
export function generateKitchenCabinet(...): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  // ... existing generation code ...

  // Generate side fronts if configured
  if (params.sideFronts) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: params.width,
      cabinetHeight: params.height,
      cabinetDepth: params.depth,
      bodyMaterialThickness: bodyMaterial.thickness,
      frontMaterialThickness: frontMaterial?.thickness ?? bodyMaterial.thickness,
      sideFrontsConfig: params.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
      materials: materialsMap,
    });
    parts.push(...sideFrontParts);
  }

  return parts;
}
```

---

## 3. UI Components

### 3.1 New Dialog: `SideFrontsConfigDialog.tsx`

Location: `src/components/ui/SideFrontsConfigDialog.tsx`

**Features:**
- Toggle for left side front
- Toggle for right side front
- Per-side configuration when enabled:
  - Material selector (dropdown)
  - Forward protrusion input (mm)
  - Bottom offset input (mm)
  - Top offset input (mm)
- Visual preview showing side front position relative to cabinet

**Dialog Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  Konfiguracja frontów bocznych                      [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │  LEWA STRONA    │    │  PRAWA STRONA   │             │
│  │  [x] Włączona   │    │  [ ] Włączona   │             │
│  ├─────────────────┤    ├─────────────────┤             │
│  │ Materiał:       │    │ (disabled)      │             │
│  │ [▼ PLY 18mm   ] │    │                 │             │
│  │                 │    │                 │             │
│  │ Wysunięcie:     │    │                 │             │
│  │ [___18___] mm   │    │                 │             │
│  │                 │    │                 │             │
│  │ Offset dolny:   │    │                 │             │
│  │ [___0____] mm   │    │                 │             │
│  │                 │    │                 │             │
│  │ Offset górny:   │    │                 │             │
│  │ [___0____] mm   │    │                 │             │
│  └─────────────────┘    └─────────────────┘             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           PODGLĄD (opcjonalny)                  │    │
│  │                                                 │    │
│  │    ┌───────────────────┐                        │    │
│  │  ██│     SZAFKA        │                        │    │
│  │  ██│                   │                        │    │
│  │  ██└───────────────────┘                        │    │
│  │    ↑ front boczny                               │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│                           [Anuluj]  [Zapisz]            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Integration Points

#### A. CabinetTemplateDialog (Step 2 - Parameters)

Add button to open SideFrontsConfigDialog:

```tsx
// In ParameterForm or as separate section
<Button
  variant="outline"
  onClick={() => setShowSideFrontsDialog(true)}
>
  <PanelLeft className="mr-2 h-4 w-4" />
  Fronty boczne
  {hasSideFronts && <Badge className="ml-2">Skonfigurowane</Badge>}
</Button>
```

#### B. PropertiesPanel (Cabinet Selected)

Add section for side fronts configuration:

```tsx
// In PropertiesPanel when cabinet is selected
<Collapsible>
  <CollapsibleTrigger>
    Fronty boczne
    {hasSideFronts && <Badge>Aktywne</Badge>}
  </CollapsibleTrigger>
  <CollapsibleContent>
    <Button onClick={() => setShowSideFrontsDialog(true)}>
      Konfiguruj fronty boczne
    </Button>
    {/* Quick status: "Lewa: włączona, Prawa: wyłączona" */}
  </CollapsibleContent>
</Collapsible>
```

---

## 4. Store Updates

### 4.1 New Actions in Zustand Store

```typescript
interface StoreActions {
  // ... existing actions

  /** Update side fronts configuration for a cabinet */
  updateCabinetSideFronts: (cabinetId: string, sideFronts: SideFrontsConfig) => void;
}
```

### 4.2 Implementation

```typescript
updateCabinetSideFronts: (cabinetId: string, sideFronts: SideFrontsConfig) => {
  const cabinet = get().cabinets.find(c => c.id === cabinetId);
  if (!cabinet) return;

  // Update params with new sideFronts config
  const updatedParams = {
    ...cabinet.params,
    sideFronts,
  };

  // Regenerate cabinet parts
  get().updateCabinetParams(cabinetId, updatedParams);
}
```

---

## 5. Part3D Rendering Updates

### 5.1 Side Front Visibility Toggle

Update `hideFronts` logic to optionally include side fronts:

```typescript
// In Part3D.tsx
const isFrontPart =
  part.cabinetMetadata?.role === 'DOOR' ||
  part.cabinetMetadata?.role === 'DRAWER_FRONT' ||
  part.cabinetMetadata?.role === 'SIDE_FRONT_LEFT' ||
  part.cabinetMetadata?.role === 'SIDE_FRONT_RIGHT';
```

### 5.2 Edge Banding for Side Fronts

Side fronts should have all edges banded:

```typescript
edgeBanding: {
  type: 'RECT',
  top: true,
  bottom: true,
  left: true,
  right: true,
}
```

---

## 6. Validation

### 6.1 Input Validation Rules

```typescript
interface SideFrontValidation {
  // Forward protrusion
  forwardProtrusion: {
    min: 0,
    max: 100, // mm - reasonable limit
  },

  // Offsets
  bottomOffset: {
    min: 0,
    max: (cabinetHeight) => cabinetHeight - 100, // Leave at least 100mm height
  },
  topOffset: {
    min: 0,
    max: (cabinetHeight, bottomOffset) => cabinetHeight - bottomOffset - 100,
  },
}
```

### 6.2 Validation Messages (Polish)

```typescript
const validationMessages = {
  forwardProtrusionTooLarge: 'Wysunięcie frontu nie może przekraczać 100mm',
  offsetsTooLarge: 'Suma offsetów musi być mniejsza niż wysokość szafki',
  minimumHeight: 'Wysokość frontu bocznego musi wynosić minimum 100mm',
  materialNotFound: 'Wybrany materiał nie istnieje',
};
```

---

## 7. CSV Export Updates

### 7.1 Part Naming Convention

Side front parts should be exported with descriptive names:

```typescript
// Left side front
name: `${cabinetName} - Front boczny lewy`

// Right side front
name: `${cabinetName} - Front boczny prawy`
```

### 7.2 CSV Export Integration

Side fronts are regular parts with material and dimensions, so they should automatically be included in CSV export without changes to the export logic.

---

## 8. Implementation Order

### Phase 1: Core Types and Generator
1. [ ] Add type definitions to `src/types/index.ts`
2. [ ] Create `src/lib/cabinetGenerators/sideFronts.ts`
3. [ ] Update generator index to export new module
4. [ ] Integrate with one cabinet type (KITCHEN) for testing

### Phase 2: UI Components
5. [ ] Create `SideFrontsConfigDialog.tsx`
6. [ ] Add dialog trigger to CabinetTemplateDialog
7. [ ] Add dialog trigger to PropertiesPanel

### Phase 3: Store Integration
8. [ ] Add `updateCabinetSideFronts` action
9. [ ] Handle regeneration on config change

### Phase 4: Full Integration
10. [ ] Integrate with all cabinet types (WARDROBE, BOOKSHELF, DRAWER)
11. [ ] Update Part3D for side front visibility toggle
12. [ ] Add validation

### Phase 5: Testing & Polish
13. [ ] Test all cabinet types with side fronts
14. [ ] Test CSV export
15. [ ] Edge case testing (zero offsets, max offsets, material changes)
16. [ ] UI polish and responsiveness

---

## 9. File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types/index.ts` | Modify | Add SideFrontConfig, SideFrontsConfig, new roles |
| `src/lib/cabinetGenerators/sideFronts.ts` | Create | New generator for side front parts |
| `src/lib/cabinetGenerators/index.ts` | Modify | Export sideFronts generator |
| `src/lib/cabinetGenerators/kitchenCabinet.ts` | Modify | Integrate side front generation |
| `src/lib/cabinetGenerators/wardrobe.ts` | Modify | Integrate side front generation |
| `src/lib/cabinetGenerators/bookshelf.ts` | Modify | Integrate side front generation |
| `src/lib/cabinetGenerators/drawerCabinet.ts` | Modify | Integrate side front generation |
| `src/components/ui/SideFrontsConfigDialog.tsx` | Create | New configuration dialog |
| `src/components/ui/CabinetTemplateDialog.tsx` | Modify | Add side fronts button |
| `src/components/ui/PropertiesPanel.tsx` | Modify | Add side fronts section |
| `src/lib/store.ts` | Modify | Add updateCabinetSideFronts action |
| `src/components/canvas/Part3D.tsx` | Modify | Handle side front visibility |

---

## 10. Notes and Considerations

### Default Forward Protrusion Logic

When `forwardProtrusion` is not explicitly set (or set to 0), the system should calculate the default based on front material thickness:

```typescript
const effectiveForwardProtrusion = config.forwardProtrusion || frontMaterialThickness;
```

This ensures the side front aligns with the front face of door/drawer fronts by default.

### Material Inheritance

When `materialId` is not set for a side front, it inherits from `cabinet.materials.frontMaterialId`. This provides sensible defaults while allowing customization.

### Interaction with Cabinet Body

Side fronts are positioned OUTSIDE the cabinet body (adjacent to LEFT_SIDE and RIGHT_SIDE parts), not overlapping. This ensures clean geometry and accurate measurements.

### Future Considerations

- **Grain Direction:** Side fronts may need vertical grain direction by default for aesthetic consistency
- **Mirroring:** Consider adding a "mirror configuration" button to quickly apply left config to right (or vice versa)
- **Presets:** Could add common configurations like "standard end panel" preset

---

## Status

**Status:** Ready for implementation

**Created:** 2025-12-12

**Author:** AI Assistant
