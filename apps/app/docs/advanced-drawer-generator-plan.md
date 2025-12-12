# Advanced Drawer Generator - Implementation Plan

## Problem Statement

Current drawer implementation is limited:
- Each cabinet can only have one type of drawer configuration
- Cannot mix drawer fronts with internal drawers in the same cabinet
- Cannot have one front covering multiple internal drawer boxes
- No visual preview of drawer layout before generation

## Proposed Solution: Dedicated Drawer Generator Dialog

A separate modal/dialog that allows users to configure complex drawer layouts within a cabinet body.

## UX Concept

### Entry Point
- When creating/editing any cabinet type (Kitchen, Wardrobe, Bookshelf)
- "Konfiguruj szuflady" button opens the Drawer Generator Dialog
- Can also be accessed from DRAWER cabinet type

### Drawer Generator Dialog Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Konfiguracja szuflad                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │                     │   │  STREFA SZUFLAD                   │ │
│  │   [PODGLĄD 2D]      │   │                                  │ │
│  │                     │   │  ┌────────────────────────────┐  │ │
│  │   ┌───────────┐     │   │  │ Strefa 1 (góra)            │  │ │
│  │   │ Front 1   │     │   │  │ Typ: Wewnętrzne            │  │ │
│  │   ├───────────┤     │   │  │ Ilość: 2 szuflady          │  │ │
│  │   │ Front 2   │     │   │  │ Wysokość: 200mm            │  │ │
│  │   │ (kryje 2x)│     │   │  │ [Usuń] [Edytuj]            │  │ │
│  │   ├───────────┤     │   │  └────────────────────────────┘  │ │
│  │   │ Front 3   │     │   │                                  │ │
│  │   └───────────┘     │   │  ┌────────────────────────────┐  │ │
│  │                     │   │  │ Strefa 2 (środek)          │  │ │
│  │   Wymiary:          │   │  │ Typ: Z frontem             │  │ │
│  │   800 x 720 x 580   │   │  │ Front przykrywa: 2 szt.    │  │ │
│  │                     │   │  │ Wysokość: 300mm            │  │ │
│  └─────────────────────┘   │  │ [Usuń] [Edytuj]            │  │ │
│                            │  └────────────────────────────┘  │ │
│                            │                                  │ │
│                            │  ┌────────────────────────────┐  │ │
│                            │  │ Strefa 3 (dół)             │  │ │
│                            │  │ Typ: Z frontem             │  │ │
│                            │  │ Wysokość: 220mm            │  │ │
│                            │  │ [Usuń] [Edytuj]            │  │ │
│                            │  └────────────────────────────┘  │ │
│                            │                                  │ │
│                            │  [+ Dodaj strefę szuflad]        │ │
│                            └──────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  USTAWIENIA GLOBALNE                                     │   │
│  │  Typ prowadnic: [Boczne ▼]   Przerwa między: [3mm]       │   │
│  │  Materiał dna: [HDF 3mm ▼]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Anuluj]  [Zastosuj konfigurację]  │
└─────────────────────────────────────────────────────────────────┘
```

### Drawer Zone Types

1. **Z frontem (Standard)**
   - One drawer box with its own front panel
   - Front overlaps cabinet body
   - Can have handle

2. **Z frontem (Połączone)**
   - One front covering multiple internal drawer boxes
   - User specifies how many internal boxes the front covers
   - Example: Front height 300mm covering 2 x 150mm internal drawers

3. **Wewnętrzne (bez frontu)**
   - Internal drawers without fronts
   - Used behind doors
   - Can specify count and heights

### Data Structure

```typescript
interface DrawerZone {
  id: string;
  type: 'STANDARD' | 'COMBINED' | 'INTERNAL';
  heightMm: number; // Total zone height

  // For STANDARD
  hasHandle?: boolean;
  handleConfig?: HandleConfig;

  // For COMBINED
  internalDrawerCount?: number; // How many boxes inside

  // For INTERNAL
  drawerCount?: number;
}

interface DrawerConfiguration {
  zones: DrawerZone[];
  slideType: DrawerSlideType;
  gapBetweenFronts: number; // mm
  bottomMaterialId?: string;
}
```

## Implementation Phases

### Phase 1: Core Data Structures
- [ ] Define DrawerZone and DrawerConfiguration types
- [ ] Add drawerConfiguration to CabinetBaseParams (replaces simple drawerCount)
- [ ] Update Part generation to handle zones

### Phase 2: Generation Logic
- [ ] Create generateDrawerZone() function
- [ ] Handle STANDARD zone (single drawer with front)
- [ ] Handle COMBINED zone (one front, multiple boxes)
- [ ] Handle INTERNAL zone (boxes only, no front)
- [ ] Calculate proper Y positions for each zone

### Phase 3: UI - Basic Dialog
- [ ] Create DrawerConfigDialog component
- [ ] 2D preview component showing zones
- [ ] Zone list with add/remove/edit
- [ ] Global settings section

### Phase 4: UI - Zone Editor
- [ ] Zone type selector
- [ ] Height input
- [ ] Internal drawer count (for COMBINED)
- [ ] Handle configuration (for fronts)

### Phase 5: Integration
- [ ] Add "Konfiguruj szuflady" button to CabinetTemplateDialog
- [ ] Add to PropertiesPanel for existing cabinets
- [ ] Update all cabinet generators to use new system

### Phase 6: Refinements
- [ ] Height validation (zones must fit in cabinet)
- [ ] Auto-distribute remaining space
- [ ] Presets (common configurations)
- [ ] Copy/paste configurations

## UI Text (Polish)

- "Konfiguracja szuflad" - main title
- "Strefa szuflad" - drawer zone
- "Z frontem" - with front
- "Wewnętrzna" - internal
- "Połączone" - combined
- "Front przykrywa X szuflad" - front covers X drawers
- "Dodaj strefę" - add zone
- "Usuń strefę" - remove zone
- "Wysokość strefy" - zone height
- "Ilość szuflad wewnętrznych" - number of internal drawers
- "Ustawienia prowadnic" - slide settings
- "Przerwa między frontami" - gap between fronts
- "Materiał dna szuflad" - drawer bottom material

## Questions to Clarify

1. Should zones always stack from bottom to top, or allow custom positioning?
   - **Recommendation**: Bottom to top, with remaining space filled by cabinet body

2. Should we allow mixing regular shelves with drawer zones?
   - **Recommendation**: Yes, but in separate feature - drawer zones replace shelves in that area

3. How to handle cabinet with doors + drawers?
   - **Recommendation**: All drawer zones marked as "INTERNAL" when hasDoors=true

4. Preset configurations?
   - Kitchen base: 1 standard drawer + 1 combined (2 internal)
   - Wardrobe: 3 standard drawers
   - Filing cabinet: 4 internal drawers

## Alternative Approach: Simplified

If full zone system is too complex, consider simpler approach:

```
┌─────────────────────────────────────────────┐
│  Szuflady w szafce                          │
├─────────────────────────────────────────────┤
│  Ilość szuflad z frontami: [2 ▼]            │
│  Ilość szuflad wewnętrznych: [1 ▼]          │
│                                             │
│  [x] Jeden front przykrywa szuflady         │
│      wewnętrzne (efekt: 2 fronty widoczne,  │
│      1 front kryje szufladę wewnętrzną)     │
│                                             │
│  Typ prowadnic: [Boczne ▼]                  │
│  Uchwyty do frontów: [Konfiguruj...]        │
└─────────────────────────────────────────────┘
```

This simpler approach:
- Standard drawers with fronts at top
- Optional internal drawers at bottom
- Optional "combined" mode where lowest front covers internal drawers

## Recommendation

Start with **Alternative Approach (Simplified)** as Phase 1, then expand to full zone system if needed. This provides:
- 80% of use cases covered
- Simpler UX
- Faster implementation
- Easy upgrade path to full system

## Files to Modify

1. `src/types/index.ts` - New drawer configuration types
2. `src/lib/cabinetGenerators.ts` - Zone-based generation
3. `src/components/ui/DrawerConfigDialog.tsx` - New component
4. `src/components/ui/CabinetTemplateDialog.tsx` - Integration
5. `src/components/ui/PropertiesPanel.tsx` - Integration
6. `src/messages/*.json` - Translations
