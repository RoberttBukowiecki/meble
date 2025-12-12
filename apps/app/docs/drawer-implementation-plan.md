# Drawer Implementation Plan

## Overview

Implementation of drawer functionality for the furniture design app. Drawers can be:
1. **Internal drawers** - drawer box only (no front), used inside cabinets with separate doors
2. **Standard drawers** - drawer box + integrated drawer front

> **Note:** This plan assumes `single-door-support-plan.md` has already been implemented. Drawer fronts will reuse the same `HandleConfig` and `HandleMetadata` system for handle configuration. The `DoorConfig` pattern will be adapted for drawer-specific needs.

## Technical Background: Drawer Construction

### Drawer Components
A standard drawer consists of:
- **Front** (DRAWER_FRONT) - visible face, uses front material
- **Left Side** (DRAWER_SIDE) - structural side panel
- **Right Side** (DRAWER_SIDE) - structural side panel
- **Back** (DRAWER_BACK) - rear panel
- **Bottom** (DRAWER_BOTTOM) - base panel (typically thinner material, e.g., 3mm plywood/HDF)

### Drawer Slide Types & Clearances

| Slide Type | Side Clearance | Price Range | Load Capacity | Notes |
|------------|---------------|-------------|---------------|-------|
| **Side Mount** | 12.7mm (1/2") per side | $15-40/pair | Up to 100+ lbs | Most common, robust |
| **Undermount** | 21mm fixed gap | $25-45/pair | 90-100 lbs | Premium, hidden slides |
| **Bottom Mount** | 12.7mm (1/2") per side | $8-15/pair | 60-75 lbs | Budget option |
| **Center Mount** | N/A (single rail) | $10-20/pair | 50-75 lbs | For light drawers |

### Standard Drawer Dimensions
- **Drawer box depth**: Cabinet depth - 50mm (for front clearance + rear space)
- **Drawer box height**: Variable based on drawer count
- **Drawer box width**: Cabinet width - 2×side panel thickness - 2×slide clearance
- **Front overlap**: Typically 3mm gap between fronts

---

## Implementation Phases

### Phase 1: Type System & Data Structures

#### 1.1 Add Drawer Slide Type
```typescript
// types/index.ts

export type DrawerSlideType = 'SIDE_MOUNT' | 'UNDERMOUNT' | 'BOTTOM_MOUNT' | 'CENTER_MOUNT';

export interface DrawerSlideConfig {
  type: DrawerSlideType;
  sideOffset: number; // mm - clearance per side for drawer box
  depthOffset: number; // mm - how much shorter drawer is than cabinet depth
}

export const DRAWER_SLIDE_PRESETS: Record<DrawerSlideType, DrawerSlideConfig> = {
  SIDE_MOUNT: { type: 'SIDE_MOUNT', sideOffset: 13, depthOffset: 50 },
  UNDERMOUNT: { type: 'UNDERMOUNT', sideOffset: 21, depthOffset: 50 },
  BOTTOM_MOUNT: { type: 'BOTTOM_MOUNT', sideOffset: 13, depthOffset: 50 },
  CENTER_MOUNT: { type: 'CENTER_MOUNT', sideOffset: 0, depthOffset: 50 },
};
```

#### 1.2 Update Cabinet Part Roles
```typescript
// types/index.ts - extend CabinetPartRole

export type CabinetPartRole =
  | 'BOTTOM' | 'TOP' | 'LEFT_SIDE' | 'RIGHT_SIDE' | 'BACK'
  | 'SHELF' | 'DOOR'
  // Drawer roles (already exist, verify usage)
  | 'DRAWER_FRONT'
  | 'DRAWER_SIDE_LEFT'   // NEW: distinguish left/right
  | 'DRAWER_SIDE_RIGHT'  // NEW: distinguish left/right
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM';
```

#### 1.3 Add Drawer Metadata to Part
```typescript
// types/index.ts - extend CabinetMetadata

export interface CabinetMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number; // for shelves, doors, drawer fronts
  drawerIndex?: number; // NEW: which drawer this part belongs to (0-based)
}
```

#### 1.4 Update DrawerCabinetParams
```typescript
// types/index.ts

export interface DrawerCabinetParams {
  type: 'DRAWER';
  width: number;
  height: number;
  depth: number;
  drawerCount: number; // 1-8
  drawerSlideType: DrawerSlideType; // NEW
  hasInternalDrawers: boolean; // NEW: if true, no drawer fronts (for cabinets with doors)
  drawerHeights?: number[]; // NEW: optional custom heights per drawer (mm)
  bottomMaterialId?: string; // NEW: optional separate material for drawer bottoms (thinner)
  // Reuse from single-door-support-plan.md (already implemented)
  handleConfig?: HandleConfig; // Handle configuration for all drawer fronts
}
```

#### 1.5 Drawer Front Metadata (Reusing Front System)

Drawer fronts will use the existing `HandleMetadata` from `single-door-support-plan.md`:

```typescript
// CabinetMetadata for drawer fronts - extends existing system
export interface CabinetMetadata {
  cabinetId: string;
  role: CabinetPartRole; // 'DRAWER_FRONT'
  index?: number;
  drawerIndex?: number; // Which drawer (0-based)
  // Reuse existing handle system from single-door-support-plan.md
  handleMetadata?: HandleMetadata; // Same as doors - position, type, dimensions, finish
}
```

**Benefits of reusing the front system:**
- Consistent handle configuration UI (`HandleSelector` component)
- Same handle types available (BAR, STRIP, KNOB, MILLED, GOLA, TIP_ON, etc.)
- Same position presets and custom positioning
- Same 3D visualization (`Handle3D` component)
- Same CSV export format for handles

#### 1.5 Add Drawer-specific Selection Types
```typescript
// types/index.ts or store

export interface DrawerSelection {
  cabinetId: string;
  drawerIndex: number;
}
```

---

### Phase 2: Drawer Generation Logic

#### 2.1 Create Drawer Generator Function
Location: `lib/cabinetGenerators.ts`

```typescript
interface DrawerGenerationParams {
  cabinetId: string;
  furnitureId: string;
  drawerIndex: number;
  // Positioning
  yOffset: number; // vertical position within cabinet
  drawerHeight: number; // height of this drawer
  // Cabinet dimensions
  cabinetWidth: number;
  cabinetDepth: number;
  // Materials
  bodyMaterial: Material;
  frontMaterial: Material;
  bottomMaterial?: Material; // for drawer bottom
  // Configuration
  slideConfig: DrawerSlideConfig;
  hasInternalDrawer: boolean;
  // Thicknesses
  bodyThickness: number;
  frontThickness: number;
  bottomThickness: number;
}

function generateDrawerParts(params: DrawerGenerationParams): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[]
```

#### 2.2 Drawer Dimension Calculations

```typescript
// Calculate drawer box dimensions based on slide type

function calculateDrawerDimensions(
  cabinetWidth: number,
  cabinetDepth: number,
  drawerHeight: number,
  sideThickness: number,
  slideConfig: DrawerSlideConfig,
  hasInternalDrawer: boolean,
  frontThickness: number
) {
  const boxWidth = cabinetWidth
    - 2 * sideThickness           // subtract cabinet sides
    - 2 * slideConfig.sideOffset; // subtract slide clearance

  const boxDepth = cabinetDepth
    - slideConfig.depthOffset     // rear clearance
    - (hasInternalDrawer ? 0 : frontThickness); // front protrusion

  const boxHeight = drawerHeight
    - 3                           // gap between drawers
    - (hasInternalDrawer ? 0 : 3); // front overlay gap

  const frontWidth = hasInternalDrawer ? 0 : (cabinetWidth - 2 * sideThickness - 3);
  const frontHeight = hasInternalDrawer ? 0 : (drawerHeight - 3);

  return { boxWidth, boxDepth, boxHeight, frontWidth, frontHeight };
}
```

#### 2.3 Generate Individual Drawer Parts

```typescript
function generateSingleDrawer(params: DrawerGenerationParams): Part[] {
  const parts: Part[] = [];
  const dims = calculateDrawerDimensions(...);

  // 1. Drawer Bottom
  parts.push({
    name: `Drawer ${params.drawerIndex + 1} Bottom`,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: dims.boxWidth, y: dims.boxDepth },
    position: [centerX, params.yOffset + bottomThickness/2, centerZ],
    rotation: [-Math.PI/2, 0, 0],
    width: dims.boxWidth,
    height: dims.boxDepth,
    depth: params.bottomThickness,
    materialId: params.bottomMaterial?.id ?? params.bodyMaterial.id,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_BOTTOM',
      drawerIndex: params.drawerIndex,
    }
  });

  // 2. Drawer Left Side
  parts.push({
    name: `Drawer ${params.drawerIndex + 1} Left Side`,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: dims.boxDepth, y: dims.boxHeight },
    position: [leftX, params.yOffset + dims.boxHeight/2, centerZ],
    rotation: [0, Math.PI/2, 0],
    width: dims.boxDepth,
    height: dims.boxHeight,
    depth: params.bodyThickness,
    materialId: params.bodyMaterial.id,
    cabinetMetadata: {
      cabinetId: params.cabinetId,
      role: 'DRAWER_SIDE_LEFT',
      drawerIndex: params.drawerIndex,
    }
  });

  // 3. Drawer Right Side (mirror of left)
  // 4. Drawer Back

  // 5. Drawer Front (if not internal) - REUSES FRONT SYSTEM
  if (!params.hasInternalDrawer && params.handleConfig) {
    // Use generateHandleMetadata from single-door-support-plan.md
    const handleMetadata = generateHandleMetadata(
      params.handleConfig,
      dims.frontWidth,
      dims.frontHeight,
      'SINGLE', // Drawer fronts are always single
      undefined // No hinge side for drawers
    );

    parts.push({
      name: `Drawer ${params.drawerIndex + 1} Front`,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: dims.frontWidth, y: dims.frontHeight },
      position: [centerX, params.yOffset + dims.frontHeight/2, frontZ],
      rotation: [0, 0, 0],
      width: dims.frontWidth,
      height: dims.frontHeight,
      depth: params.frontThickness,
      materialId: params.frontMaterial.id,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId: params.cabinetId,
        role: 'DRAWER_FRONT',
        drawerIndex: params.drawerIndex,
        // Reuse handle system from single-door-support-plan.md
        handleMetadata: handleMetadata,
      }
    });
  }

  return parts;
}
```

#### 2.4 Update generateDrawerCabinet Function

```typescript
export function generateDrawerCabinet(
  cabinetId: string,
  furnitureId: string,
  params: DrawerCabinetParams,
  materials: { bodyMaterialId: string; frontMaterialId: string },
  bodyMaterial: Material,
  frontMaterial: Material,
  bottomMaterial?: Material, // optional thinner material
  topBottomPlacement: 'inset' | 'overlay' = 'inset'
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parts: Part[] = [];
  const slideConfig = DRAWER_SLIDE_PRESETS[params.drawerSlideType];

  // 1. Generate cabinet structure (BOTTOM, LEFT_SIDE, RIGHT_SIDE, TOP)
  parts.push(...generateCabinetStructure(cabinetId, furnitureId, params, bodyMaterial, topBottomPlacement));

  // 2. Calculate drawer heights
  const availableHeight = params.height - 2 * bodyMaterial.thickness;
  const drawerHeights = params.drawerHeights ??
    Array(params.drawerCount).fill(availableHeight / params.drawerCount);

  // 3. Generate each drawer
  let currentY = bodyMaterial.thickness; // start above bottom panel

  for (let i = 0; i < params.drawerCount; i++) {
    const drawerParts = generateSingleDrawer({
      cabinetId,
      furnitureId,
      drawerIndex: i,
      yOffset: currentY,
      drawerHeight: drawerHeights[i],
      cabinetWidth: params.width,
      cabinetDepth: params.depth,
      bodyMaterial,
      frontMaterial,
      bottomMaterial,
      slideConfig,
      hasInternalDrawer: params.hasInternalDrawers,
      bodyThickness: bodyMaterial.thickness,
      frontThickness: frontMaterial.thickness,
      bottomThickness: bottomMaterial?.thickness ?? 3, // default 3mm
    });

    parts.push(...drawerParts);
    currentY += drawerHeights[i];
  }

  return parts;
}
```

---

### Phase 3: Store Updates

#### 3.1 Add Drawer Selection to SelectionSlice
```typescript
// store/slices/selectionSlice.ts

interface SelectionSlice {
  // ... existing
  selectedDrawerIndex: number | null; // NEW: which drawer is selected within cabinet

  selectDrawer: (cabinetId: string, drawerIndex: number) => void;
  clearDrawerSelection: () => void;
}
```

#### 3.2 Add Drawer-specific Update Actions
```typescript
// store/slices/cabinetSlice.ts

interface CabinetSlice {
  // ... existing

  // NEW: Update single drawer parameters
  updateDrawerHeight: (cabinetId: string, drawerIndex: number, height: number) => void;

  // NEW: Update drawer slide type (regenerates all drawers)
  updateDrawerSlideType: (cabinetId: string, slideType: DrawerSlideType) => void;

  // NEW: Toggle internal/external drawers
  toggleInternalDrawers: (cabinetId: string) => void;
}
```

---

### Phase 4: UI Components

#### 4.1 Update CabinetTemplateDialog
Location: `components/ui/CabinetTemplateDialog.tsx`

Add for DRAWER type:
- Drawer count slider (1-8)
- Drawer slide type dropdown (Side Mount, Undermount, Bottom Mount, Center Mount)
- "Internal drawers" checkbox (no fronts)
- Optional: Drawer bottom material selector
- **Handle configuration** - Reuse `HandleSelector` component from `single-door-support-plan.md`

```tsx
{/* For drawer cabinet with fronts - reuse HandleSelector from front system */}
{params.type === 'DRAWER' && !params.hasInternalDrawers && (
  <div className="border-t pt-4 mt-4">
    <h4 className="font-medium mb-3">Uchwyty do szuflad</h4>
    <HandleSelector
      value={params.handleConfig}
      onChange={(handleConfig) => setParams({ ...params, handleConfig })}
      doorWidth={calculateDrawerFrontWidth(params)}
      doorHeight={calculateDrawerFrontHeight(params)}
    />
  </div>
)}
```

#### 4.2 Update PropertiesPanel for Drawers
Location: `components/ui/PropertiesPanel.tsx`

When drawer cabinet is selected:
```tsx
// Add Drawer Configuration Accordion
<AccordionItem value="drawers">
  <AccordionTrigger>Szuflady</AccordionTrigger>
  <AccordionContent>
    {/* Drawer slide type selector */}
    <Label>Typ prowadnic</Label>
    <Select value={cabinet.params.drawerSlideType} onValueChange={...}>
      <SelectItem value="SIDE_MOUNT">Boczne (12.7mm)</SelectItem>
      <SelectItem value="UNDERMOUNT">Podszufladowe (21mm)</SelectItem>
      <SelectItem value="BOTTOM_MOUNT">Dolne (12.7mm)</SelectItem>
      <SelectItem value="CENTER_MOUNT">Centralne (0mm)</SelectItem>
    </Select>

    {/* Internal drawer toggle */}
    <div className="flex items-center gap-2">
      <Switch checked={cabinet.params.hasInternalDrawers} onCheckedChange={...} />
      <Label>Szuflady wewnętrzne (bez frontów)</Label>
    </div>

    {/* Per-drawer height configuration */}
    <div className="space-y-2">
      <Label>Wysokości szuflad</Label>
      {drawerHeights.map((height, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-24">Szuflada {i + 1}:</span>
          <Input
            type="number"
            value={height}
            onChange={(e) => updateDrawerHeight(cabinet.id, i, Number(e.target.value))}
          />
          <span>mm</span>
        </div>
      ))}
    </div>
  </AccordionContent>
</AccordionItem>
```

#### 4.3 Individual Drawer Properties
When clicking on a drawer part (DRAWER_FRONT, DRAWER_SIDE, etc.):

```tsx
// Show drawer-specific info in PropertiesPanel
{part.cabinetMetadata?.drawerIndex !== undefined && (
  <div className="p-3 bg-muted rounded-md mb-4">
    <p className="text-sm font-medium">
      Element szuflady {part.cabinetMetadata.drawerIndex + 1}
    </p>
    <p className="text-sm text-muted-foreground">
      Rola: {translateDrawerRole(part.cabinetMetadata.role)}
    </p>
    <Button
      variant="link"
      onClick={() => selectDrawer(part.cabinetMetadata.cabinetId, part.cabinetMetadata.drawerIndex)}
    >
      Edytuj szufladę
    </Button>
  </div>
)}
```

#### 4.4 Create DrawerPropertiesPanel Component (Optional)
For advanced per-drawer editing:

```tsx
// components/ui/DrawerPropertiesPanel.tsx

interface DrawerPropertiesPanelProps {
  cabinetId: string;
  drawerIndex: number;
}

export function DrawerPropertiesPanel({ cabinetId, drawerIndex }: DrawerPropertiesPanelProps) {
  const cabinet = useCabinet(cabinetId);
  const drawerParts = useDrawerParts(cabinetId, drawerIndex);

  return (
    <div className="space-y-4">
      <h3>Szuflada {drawerIndex + 1}</h3>

      {/* Drawer height */}
      <div>
        <Label>Wysokość</Label>
        <Input
          type="number"
          value={getDrawerHeight(cabinet, drawerIndex)}
          onChange={...}
        />
      </div>

      {/* Show parts list */}
      <div>
        <Label>Elementy</Label>
        <ul className="text-sm">
          {drawerParts.map(part => (
            <li key={part.id}>
              {part.name} ({part.width}×{part.height}×{part.depth}mm)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

### Phase 5: 3D Visualization Updates

> **Note:** The `Handle3D` component from `single-door-support-plan.md` is automatically rendered for drawer fronts since they use the same `handleMetadata` structure. No additional 3D code is needed for drawer handles.

#### 5.1 Update Part3D Click Handling
Location: `components/canvas/Part3D.tsx`

```typescript
// Enhance click handling for drawer parts
const handleClick = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();

  if (part.cabinetMetadata) {
    if (part.cabinetMetadata.drawerIndex !== undefined) {
      // Drawer part clicked
      if (e.detail === 1) {
        // Single click: select entire drawer
        selectDrawer(part.cabinetMetadata.cabinetId, part.cabinetMetadata.drawerIndex);
      } else {
        // Double click: select specific part
        selectPart(part.id);
      }
    } else {
      // Non-drawer cabinet part - existing logic
      if (e.detail === 1) {
        selectCabinet(part.cabinetMetadata.cabinetId);
      } else {
        selectPart(part.id);
      }
    }
  } else {
    selectPart(part.id);
  }
};
```

#### 5.2 Add Drawer Highlight
```typescript
// Highlight all drawer parts when drawer is selected
const isDrawerSelected =
  selectedDrawerIndex !== null &&
  part.cabinetMetadata?.cabinetId === selectedCabinetId &&
  part.cabinetMetadata?.drawerIndex === selectedDrawerIndex;

// Use different highlight color for drawer selection
const highlightColor = isDrawerSelected ? 'drawer-highlight' : 'part-highlight';
```

---

### Phase 6: CSV Export Updates

#### 6.1 Update CSV Column Definitions
Location: `lib/csv.ts`

```typescript
// Add drawer-specific columns
export const CSV_COLUMNS = {
  // ... existing columns
  drawer_index: {
    label: 'Drawer Index',
    accessor: (part: Part) => part.cabinetMetadata?.drawerIndex?.toString() ?? '',
  },
  drawer_role: {
    label: 'Drawer Role',
    accessor: (part: Part) => {
      const role = part.cabinetMetadata?.role;
      if (role?.startsWith('DRAWER_')) return role;
      return '';
    },
  },
};

// Update default columns to include drawer info
export const DEFAULT_COLUMNS = [
  'furniture', 'group', 'part_id', 'part_name', 'material',
  'thickness_mm', 'length_x_mm', 'width_y_mm',
  'drawer_index', 'drawer_role', // NEW
];
```

---

### Phase 7: Translations

#### 7.1 Add Polish Translations
Location: `messages/pl.json`

```json
{
  "PropertiesPanel": {
    "drawerConfiguration": "Konfiguracja szuflad",
    "slideType": "Typ prowadnic",
    "sideMount": "Boczne",
    "undermount": "Podszufladowe",
    "bottomMount": "Dolne",
    "centerMount": "Centralne",
    "internalDrawers": "Szuflady wewnętrzne (bez frontów)",
    "drawerHeights": "Wysokości szuflad",
    "drawer": "Szuflada",
    "drawerPart": "Element szuflady",
    "drawerFront": "Front szuflady",
    "drawerSide": "Bok szuflady",
    "drawerBack": "Tył szuflady",
    "drawerBottom": "Dno szuflady",
    "editDrawer": "Edytuj szufladę",
    "slideOffset": "Offset prowadnic"
  },
  "CabinetTemplateDialog": {
    "drawerSlideType": "Typ prowadnic do szuflad",
    "internalDrawersHelp": "Szuflady bez frontów - używane w szafkach z drzwiami"
  }
}
```

---

## Implementation Order

### Prerequisites
> **Important:** Before implementing this plan, ensure `single-door-support-plan.md` is fully implemented. The following components from that plan will be reused:
> - `HandleConfig`, `HandleMetadata` types
> - `HandleSelector` UI component
> - `Handle3D` 3D visualization component
> - `generateHandleMetadata()` function
> - `calculateHandlePosition()` function
> - Handle presets and dimension constants

### Step 1: Types & Constants
- [ ] Add `DrawerSlideType` and `DRAWER_SLIDE_PRESETS`
- [ ] Update `CabinetPartRole` with `DRAWER_SIDE_LEFT`, `DRAWER_SIDE_RIGHT`
- [ ] Update `DrawerCabinetParams` with new fields (including `handleConfig?: HandleConfig`)
- [ ] Add `drawerIndex` to `CabinetMetadata`

### Step 2: Generator Logic
- [ ] Implement `calculateDrawerDimensions()` helper
- [ ] Implement `generateSingleDrawer()` function
- [ ] Update `generateDrawerCabinet()` to use new logic
- [ ] Add unit tests for drawer generation

### Step 3: Store Updates
- [ ] Add `selectedDrawerIndex` to selection slice
- [ ] Add `selectDrawer()` and `clearDrawerSelection()` actions
- [ ] Add drawer-specific update actions

### Step 4: UI - Creation
- [ ] Update `CabinetTemplateDialog` with drawer options
- [ ] Add drawer slide type selector
- [ ] Add internal drawer toggle

### Step 5: UI - Properties Panel
- [ ] Add drawer configuration section to `PropertiesPanel`
- [ ] Show drawer info when drawer part is clicked
- [ ] Add per-drawer height editing

### Step 6: 3D Updates
- [ ] Update `Part3D` click handling for drawers
- [ ] Add drawer highlight state
- [ ] Test visual representation

### Step 7: Export & Cleanup
- [ ] Update CSV export with drawer columns
- [ ] Add translations
- [ ] Test full workflow
- [ ] Performance optimization

---

## Testing Checklist

- [ ] Create drawer cabinet with 2-8 drawers
- [ ] Test all slide types (side mount, undermount, bottom mount, center mount)
- [ ] Verify correct offsets for each slide type
- [ ] Test internal drawers (no fronts)
- [ ] Click on drawer to select it
- [ ] Edit drawer height in properties panel
- [ ] Change slide type and verify regeneration
- [ ] Export CSV with drawer data
- [ ] Test with different materials (body, front, bottom)
- [ ] Verify collision detection works with drawer parts
- [ ] Test undo/redo for drawer operations
- [ ] Test cabinet transform (move/rotate) with drawers

---

## Future Enhancements

1. **Custom drawer box joinery** - finger joints, dovetails visual representation
2. ~~**Drawer pull/handle placement**~~ - ✅ Already covered by reusing `HandleConfig` from front system
3. **Soft-close indicator** - visual marker for soft-close slides
4. **Drawer organizer inserts** - dividers within drawers
5. **File/keyboard drawer support** - specialized drawer types
6. **Drawer face style options** - inset, overlay, partial overlay fronts
7. **Per-drawer handle configuration** - Allow different handle configs for each drawer (currently all drawers share one config)

---

## References

- [Types of Drawer Slides](https://thehomewoodworker.com/types-of-drawer-slides/)
- [Mechanical Drawer Slides - FineWoodworking](https://www.finewoodworking.com/2024/10/16/mechanical-drawer-slides)
- [Rockler Drawer Slides](https://www.rockler.com/hardware/drawer-slides)
