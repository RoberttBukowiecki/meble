# Cabinet Back Panel (Plecy) Implementation Plan

## Overview

This plan covers the implementation of cabinet back panels ("plecy") made from HDF material. Back panels provide structural rigidity to cabinet bodies and are typically made from thin HDF boards.

## Requirements Summary

Based on user requirements:

| Parameter | Value |
|-----------|-------|
| Default material | HDF 3mm, white (#FFFFFF) |
| Target cabinet types | ALL (KITCHEN, WARDROBE, BOOKSHELF, DRAWER) |
| Material selection | Separate `backMaterialId` in CabinetMaterials |
| Default `hasBack` | `true` (enabled by default) |
| Overlap calculation | Configurable, default 2/3 of body material thickness |
| Edge banding | None (HDF typically not edge-banded) |
| Future support | Architecture for dado/wpust mounting |

---

## Phase 1: Type System Updates

### 1.1 Add HDF Material Type Marker (Optional Enhancement)

**File:** `apps/app/src/types/index.ts`

Add optional material category to distinguish HDF from standard boards:

```typescript
// Add to Material interface (line ~120)
interface Material {
  id: string;
  name: string;
  color: string;
  thickness: number;
  isDefault?: boolean;
  category?: 'board' | 'hdf' | 'mdf' | 'glass'; // NEW - for filtering in UI
}
```

**Rationale:** Allows UI to filter materials by type (e.g., show only HDF options for back panel selection).

### 1.2 Update CabinetMaterials Interface

**File:** `apps/app/src/types/index.ts` (lines 293-296)

```typescript
// BEFORE
interface CabinetMaterials {
  bodyMaterialId: string;
  frontMaterialId: string;
}

// AFTER
interface CabinetMaterials {
  bodyMaterialId: string;      // For sides, bottom, top, shelves
  frontMaterialId: string;     // For doors, drawer fronts
  backMaterialId?: string;     // NEW: For back panel (optional, defaults to HDF)
}
```

### 1.3 Add Back Panel Mount Type

**File:** `apps/app/src/types/index.ts`

Add type for future dado support:

```typescript
// Add new type definition
type BackMountType = 'overlap' | 'dado';

// Add to appropriate location near CabinetPartRole
```

### 1.4 Update Cabinet Parameter Types

**File:** `apps/app/src/types/index.ts` (lines 298-350)

Add `hasBack` and `backOverlapRatio` to ALL cabinet parameter interfaces:

```typescript
// KitchenCabinetParams (add after hasDoors)
interface KitchenCabinetParams {
  width: number;
  height: number;
  depth: number;
  shelfCount: number;
  hasDoors: boolean;
  topBottomPlacement: TopBottomPlacement;
  hasBack: boolean;              // NEW
  backOverlapRatio: number;      // NEW - default 2/3 (0.667)
  backMountType: BackMountType;  // NEW - default 'overlap'
}

// WardrobeCabinetParams (add)
interface WardrobeCabinetParams {
  width: number;
  height: number;
  depth: number;
  shelfCount: number;
  doorCount: number;
  topBottomPlacement: TopBottomPlacement;
  hasBack: boolean;              // NEW
  backOverlapRatio: number;      // NEW
  backMountType: BackMountType;  // NEW
}

// BookshelfCabinetParams (already has hasBack, add others)
interface BookshelfCabinetParams {
  width: number;
  height: number;
  depth: number;
  shelfCount: number;
  hasBack?: boolean;             // EXISTS - make required
  backOverlapRatio: number;      // NEW
  backMountType: BackMountType;  // NEW
  topBottomPlacement: TopBottomPlacement;
}

// DrawerCabinetParams (add)
interface DrawerCabinetParams {
  width: number;
  height: number;
  depth: number;
  drawerCount: number;
  topBottomPlacement: TopBottomPlacement;
  hasBack: boolean;              // NEW
  backOverlapRatio: number;      // NEW
  backMountType: BackMountType;  // NEW
}
```

---

## Phase 2: Add HDF Material

### 2.1 Update Initial Materials

**File:** `apps/app/src/lib/store/constants.ts` (lines 6-31)

Add HDF material to INITIAL_MATERIALS:

```typescript
export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'material-bialy',
    name: 'Biały',
    color: '#FFFFFF',
    thickness: 18,
    isDefault: true,
    category: 'board',
  },
  {
    id: 'material-dab',
    name: 'Dąb',
    color: '#D4A574',
    thickness: 18,
    isDefault: true, // default for fronts
    category: 'board',
  },
  {
    id: 'material-antracyt',
    name: 'Antracyt',
    color: '#2D2D2D',
    thickness: 18,
    category: 'board',
  },
  // NEW HDF Material
  {
    id: 'material-hdf-bialy',
    name: 'HDF Biały',
    color: '#FFFFFF',
    thickness: 3,
    isDefault: false,
    category: 'hdf',
  },
];
```

### 2.2 Add Default Back Material Helper

**File:** `apps/app/src/lib/store/utils.ts`

Add function to get default HDF material:

```typescript
export function getDefaultBackMaterial(materials: Material[]): Material | undefined {
  // First try to find HDF material
  const hdfMaterial = materials.find(m => m.category === 'hdf');
  if (hdfMaterial) return hdfMaterial;

  // Fallback to thinnest material
  const sorted = [...materials].sort((a, b) => a.thickness - b.thickness);
  return sorted[0];
}
```

---

## Phase 3: Update Cabinet Configuration

### 3.1 Update Preset Configurations

**File:** `apps/app/src/lib/config.ts` (lines 116-152)

Update `CABINET_PRESETS` to include back panel parameters:

```typescript
export const CABINET_PRESETS: Record<CabinetType, CabinetParams> = {
  KITCHEN: {
    width: 800,
    height: 720,
    depth: 580,
    shelfCount: 1,
    hasDoors: true,
    topBottomPlacement: 'inset',
    hasBack: true,              // NEW
    backOverlapRatio: 0.667,    // NEW - 2/3
    backMountType: 'overlap',   // NEW
  },
  WARDROBE: {
    width: 1000,
    height: 2200,
    depth: 600,
    shelfCount: 1,
    doorCount: 2,
    topBottomPlacement: 'inset',
    hasBack: true,              // NEW
    backOverlapRatio: 0.667,    // NEW
    backMountType: 'overlap',   // NEW
  },
  BOOKSHELF: {
    width: 900,
    height: 1800,
    depth: 300,
    shelfCount: 4,
    hasBack: true,              // UPDATED - was optional
    backOverlapRatio: 0.667,    // NEW
    backMountType: 'overlap',   // NEW
    topBottomPlacement: 'inset',
  },
  DRAWER: {
    width: 600,
    height: 800,
    depth: 500,
    drawerCount: 4,
    topBottomPlacement: 'inset',
    hasBack: true,              // NEW
    backOverlapRatio: 0.667,    // NEW
    backMountType: 'overlap',   // NEW
  },
};
```

---

## Phase 4: Back Panel Generation Logic

### 4.1 Create Back Panel Generator Function

**File:** `apps/app/src/lib/cabinetGenerators.ts`

Add helper function for back panel generation (add near top of file after constants):

```typescript
// Constants for back panel
const MIN_BACK_OVERLAP = 4; // Minimum overlap in mm (safety)

interface BackPanelConfig {
  cabinetId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialThickness: number;
  backMaterialId: string;
  backMaterialThickness: number;
  overlapRatio: number;
  mountType: BackMountType;
  topBottomPlacement: TopBottomPlacement;
}

function generateBackPanel(config: BackPanelConfig): Omit<Part, 'id' | 'createdAt' | 'updatedAt'> {
  const {
    cabinetId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialThickness,
    backMaterialId,
    backMaterialThickness,
    overlapRatio,
    mountType,
    topBottomPlacement,
  } = config;

  // Calculate overlap depth (how far back panel sits into cabinet)
  const overlapDepth = Math.max(
    bodyMaterialThickness * overlapRatio,
    MIN_BACK_OVERLAP
  );

  // Calculate back panel dimensions based on topBottomPlacement
  // The back panel overlaps onto the INNER edges of sides, top, and bottom
  let backWidth: number;
  let backHeight: number;

  if (topBottomPlacement === 'inset') {
    // Top/bottom are between sides
    // Back overlaps onto: left side (inner), right side (inner), top (back), bottom (back)
    backWidth = cabinetWidth - 2 * (bodyMaterialThickness - overlapDepth);
    backHeight = cabinetHeight - 2 * (bodyMaterialThickness - overlapDepth);
  } else {
    // Top/bottom overlay sides
    // Back overlaps onto: left side (inner), right side (inner), top (bottom face), bottom (top face)
    backWidth = cabinetWidth - 2 * (bodyMaterialThickness - overlapDepth);
    backHeight = cabinetHeight; // Full height when overlay
  }

  // Ensure minimum dimensions
  backWidth = Math.max(backWidth, 50);
  backHeight = Math.max(backHeight, 50);

  // Calculate Z position
  // Back panel is at the rear of the cabinet
  // Z = 0 is cabinet center, negative Z is toward the back
  // Back panel outer surface should be at -cabinetDepth/2
  // So center of back panel is at: -cabinetDepth/2 + backMaterialThickness/2
  const backZPosition = -cabinetDepth / 2 + backMaterialThickness / 2;

  // Y position: center of cabinet height
  // For inset: offset by half thickness difference
  let backYPosition: number;
  if (topBottomPlacement === 'inset') {
    backYPosition = cabinetHeight / 2;
  } else {
    backYPosition = cabinetHeight / 2;
  }

  return {
    name: 'Plecy',
    furnitureId: '', // Will be set by generator
    shapeType: 'RECT',
    shapeParams: {
      type: 'RECT',
      x: backWidth,
      y: backHeight,
    },
    width: backWidth,
    height: backHeight,
    depth: backMaterialThickness,
    position: [0, backYPosition, backZPosition],
    rotation: [0, 0, 0], // Facing backward, parallel to XY plane
    materialId: backMaterialId,
    edgeBanding: {
      type: 'RECT',
      top: false,
      bottom: false,
      left: false,
      right: false,
    },
    cabinetMetadata: {
      cabinetId,
      role: 'BACK',
    },
  };
}
```

### 4.2 Update Kitchen Cabinet Generator

**File:** `apps/app/src/lib/cabinetGenerators.ts` (in `generateKitchenCabinet` function)

Add back panel generation after doors (around line 195):

```typescript
// After door generation, before return statement:

// Generate back panel if enabled
if (params.hasBack) {
  const backMaterialId = materials.backMaterialId || bodyMaterial.id;
  const backMaterial = state.materials.find(m => m.id === backMaterialId) || bodyMaterial;

  const backPanel = generateBackPanel({
    cabinetId,
    cabinetWidth: params.width,
    cabinetHeight: params.height,
    cabinetDepth: params.depth,
    bodyMaterialThickness: bodyMaterial.thickness,
    backMaterialId: backMaterial.id,
    backMaterialThickness: backMaterial.thickness,
    overlapRatio: params.backOverlapRatio ?? 0.667,
    mountType: params.backMountType ?? 'overlap',
    topBottomPlacement: params.topBottomPlacement,
  });

  backPanel.furnitureId = furnitureId;
  parts.push(backPanel);
}

return parts;
```

### 4.3 Implement Other Cabinet Generators

The same pattern should be applied to:
- `generateWardrobe()` - Full implementation needed
- `generateBookshelf()` - Full implementation needed
- `generateDrawerCabinet()` - Full implementation needed

Each generator should include back panel generation with the same logic.

---

## Phase 5: Store Updates

### 5.1 Update Cabinet Slice

**File:** `apps/app/src/lib/store/slices/cabinetSlice.ts`

Update `addCabinet` to handle `backMaterialId`:

```typescript
// In addCabinet function, after getting default materials:
const defaultMaterials = getDefaultMaterials(get().materials);
const defaultBackMaterial = getDefaultBackMaterial(get().materials);

const materials: CabinetMaterials = {
  bodyMaterialId: defaultMaterials.body?.id || get().materials[0]?.id || '',
  frontMaterialId: defaultMaterials.front?.id || defaultMaterials.body?.id || '',
  backMaterialId: defaultBackMaterial?.id || defaultMaterials.body?.id || '', // NEW
};
```

### 5.2 Update Material Sync on Cabinet Update

When cabinet materials are updated, ensure back material changes are handled:

```typescript
// In updateCabinetMaterials or equivalent function
// Make sure backMaterialId changes trigger regeneration
```

---

## Phase 6: UI Updates

### 6.1 Cabinet Creation Form

**File:** `apps/app/src/components/ui/CabinetForm.tsx` (or equivalent)

Add controls for:
- `hasBack` toggle (checkbox)
- `backOverlapRatio` slider (range: 0.33 to 1.0, default 0.667)
- `backMaterialId` dropdown (filtered to show HDF/thin materials)

```tsx
// Example UI structure
<FormSection title="Plecy">
  <Checkbox
    label="Dodaj plecy"
    checked={params.hasBack}
    onChange={(checked) => updateParams({ hasBack: checked })}
  />

  {params.hasBack && (
    <>
      <Select
        label="Materiał pleców"
        value={materials.backMaterialId}
        options={hdfMaterials}
        onChange={(id) => updateMaterials({ backMaterialId: id })}
      />

      <Slider
        label="Głębokość wpustu"
        value={params.backOverlapRatio}
        min={0.33}
        max={1.0}
        step={0.01}
        formatValue={(v) => `${Math.round(v * bodyThickness)}mm (${Math.round(v * 100)}%)`}
        onChange={(ratio) => updateParams({ backOverlapRatio: ratio })}
      />
    </>
  )}
</FormSection>
```

### 6.2 Material Management UI

Update material creation/editing to include category:

```tsx
<Select
  label="Kategoria materiału"
  value={material.category}
  options={[
    { value: 'board', label: 'Płyta meblowa' },
    { value: 'hdf', label: 'HDF' },
    { value: 'mdf', label: 'MDF' },
  ]}
  onChange={(category) => updateMaterial({ category })}
/>
```

---

## Phase 7: CSV Export Updates

### 7.1 Update Export Logic

**File:** `apps/app/src/lib/csv.ts`

Ensure back panels are properly exported:

```typescript
// Back panels should be included in export with correct dimensions
// The role 'BACK' is already defined in CabinetPartRole
// Ensure dimension columns show correct values for rotated parts

// Add note for back panel material in export (optional)
if (part.cabinetMetadata?.role === 'BACK') {
  // Mark as HDF or back panel in notes
  notes += ' [Plecy]';
}
```

---

## Phase 8: 3D Rendering Updates

### 8.1 Part3D Component

**File:** `apps/app/src/components/canvas/Part3D.tsx`

No changes required - back panels will render like any other part. The existing rendering logic handles:
- Position and rotation
- Material color lookup
- Selection highlighting

### 8.2 Optional: Visual Differentiation

Consider adding subtle visual differentiation for back panels:
- Slightly transparent rendering
- Different selection highlight color
- Visible only in certain view modes

---

## Implementation Order

### Step 1: Type System (30 min)
1. Update `Material` interface with `category`
2. Update `CabinetMaterials` with `backMaterialId`
3. Add `BackMountType` type
4. Update all `CabinetParams` interfaces

### Step 2: Materials (15 min)
1. Add HDF material to `INITIAL_MATERIALS`
2. Add `getDefaultBackMaterial` helper

### Step 3: Configuration (15 min)
1. Update `CABINET_PRESETS` with back panel params

### Step 4: Generator Logic (60 min)
1. Add `generateBackPanel` helper function
2. Update `generateKitchenCabinet`
3. Implement other cabinet generators (WARDROBE, BOOKSHELF, DRAWER)

### Step 5: Store Updates (30 min)
1. Update `addCabinet` for `backMaterialId`
2. Update cabinet regeneration logic

### Step 6: UI Updates (60 min)
1. Add back panel controls to cabinet form
2. Update material form with category
3. Add translations (batch before release)

### Step 7: Testing & Polish (30 min)
1. Test all cabinet types
2. Verify CSV export
3. Check collision detection with back panels

---

## Technical Calculations

### Overlap Calculation Example

For a cabinet with:
- `bodyMaterialThickness = 18mm`
- `backOverlapRatio = 0.667` (2/3)
- `topBottomPlacement = 'inset'`

```
overlapDepth = 18 * 0.667 = 12mm

backWidth = cabinetWidth - 2 * (18 - 12)
         = cabinetWidth - 12mm

backHeight = cabinetHeight - 2 * (18 - 12)
          = cabinetHeight - 12mm
```

The back panel is 12mm smaller on each side, allowing it to sit 12mm into the cabinet body on each edge.

### Z Position Calculation

The back panel is mounted OUTSIDE/BEHIND the cabinet body (not inside).

```
backZPosition = -cabinetDepth/2 - backMaterialThickness/2

For depth=580mm, HDF 3mm:
backZPosition = -290 - 1.5 = -291.5mm

The back panel's FRONT face is at -290mm (cabinet back edge)
The back panel's BACK face is at -293mm (3mm behind cabinet)
```

This ensures the back panel does not collide with the cabinet body.

---

## Future Enhancements (Dado Mount)

When `backMountType = 'dado'`:

1. **Dado (wpust) calculation:**
   - Create groove/dado in side panels at `overlapDepth` from back edge
   - Groove width = `backMaterialThickness + 0.5mm` (tolerance)
   - Groove depth = `overlapDepth`

2. **Back panel dimensions for dado:**
   - Width extends into grooves on both sides
   - Height extends into grooves on top and bottom

3. **Part modifications:**
   - Side panels need groove geometry (subtract box from mesh)
   - Top/bottom panels need groove geometry
   - Requires shape modifications or CSG operations

4. **CSV export for dado:**
   - Include groove specifications in notes
   - Add machining instructions column

---

## Validation Rules

Add validation for back panel parameters:

```typescript
const backPanelValidation = {
  backOverlapRatio: {
    min: 0.25,  // Minimum 1/4 of body thickness
    max: 1.0,   // Maximum full body thickness
    default: 0.667,
  },
  backMaterial: {
    maxThickness: 6, // Warn if back material is thicker than 6mm
  },
};
```

---

## Migration

For existing cabinets without back panel params:

```typescript
// In store migration (version increment)
migrate: (state, version) => {
  if (version < NEXT_VERSION) {
    // Add default back panel params to existing cabinets
    state.cabinets = state.cabinets.map(cabinet => ({
      ...cabinet,
      params: {
        ...cabinet.params,
        hasBack: cabinet.params.hasBack ?? true,
        backOverlapRatio: cabinet.params.backOverlapRatio ?? 0.667,
        backMountType: cabinet.params.backMountType ?? 'overlap',
      },
      materials: {
        ...cabinet.materials,
        backMaterialId: cabinet.materials.backMaterialId ?? 'material-hdf-bialy',
      },
    }));
  }
  return state;
},
```

---

## Checklist

- [x] Type system updates complete
- [x] HDF material added to defaults
- [x] Cabinet presets updated
- [x] `generateBackPanel` helper implemented
- [x] Kitchen cabinet generator updated
- [x] Wardrobe generator implemented (with back)
- [x] Bookshelf generator implemented (with back)
- [x] Drawer generator implemented (with back)
- [x] Store slice updated for `backMaterialId`
- [x] Cabinet form UI updated
- [ ] Material form UI updated (category field - optional enhancement)
- [x] CSV export includes back panels correctly (uses existing BACK role)
- [x] Store migration added (version 3 → 4)
- [ ] Manual testing completed
- [ ] Collision detection works with back panels
