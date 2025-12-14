# InteriorConfigDialog Test Plan

## Overview

Test plan for the Interior Configuration Dialog (zone-based cabinet interior system).

## Components Under Test

### 1. InteriorConfigDialog (`components/ui/InteriorConfigDialog/index.tsx`)
**Purpose:** Full-screen dialog for interior configuration with recursive zone tree.

### 2. ZoneEditor (`components/ui/InteriorConfigDialog/ZoneEditor.tsx`)
**Purpose:** Editor for single zone (EMPTY, SHELVES, DRAWERS, NESTED).

### 3. InteriorPreview (`components/ui/InteriorConfigDialog/InteriorPreview.tsx`)
**Purpose:** Visual preview of cabinet interior with recursive zone rendering.

### 4. Zone Domain (`lib/domain/zone.ts`)
**Purpose:** Business logic for zone operations (CRUD, calculations, validation).

---

## Test Categories

### A. Unit Tests (Domain Logic)

#### A.1 Zone Domain Module (`lib/domain/zone.ts`)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| Z-001 | `Zone.create('SHELVES', 1)` | Creates zone with shelvesConfig, depth=1 |
| Z-002 | `Zone.create('DRAWERS', 1)` | Creates zone with drawerConfig, depth=1 |
| Z-003 | `Zone.create('NESTED', 1)` | Creates zone with divisionDirection='HORIZONTAL', children array |
| Z-004 | `Zone.createNested('VERTICAL', 3)` at MAX_ZONE_DEPTH-1 | Should return EMPTY zone (cannot nest further) |
| Z-005 | `Zone.calculateBounds` with simple tree | Returns correct leafZoneBounds and partitionBounds |
| Z-006 | `Zone.distributeWidths` with FIXED + PROPORTIONAL mix | Correctly calculates fixed first, then distributes remainder |
| Z-007 | `Zone.distributeHeights` with all RATIO | Proportionally distributes by ratio values |
| Z-008 | `Zone.validate` with zone exceeding MIN_ZONE_HEIGHT_MM | Returns error |
| Z-009 | `Zone.validate` with zone exceeding MIN_ZONE_WIDTH_MM | Returns error |
| Z-010 | `Zone.findById` on nested tree | Finds zone at any depth |
| Z-011 | `Zone.findPath` from root to leaf | Returns correct path array |
| Z-012 | `Zone.updateById` on nested zone | Updates correctly, returns new tree |
| Z-013 | `Zone.deleteById` removes zone and adjusts partitions | Correct partition count after deletion |
| Z-014 | `Zone.getAllZones` on 3-level tree | Returns flat list of all zones |
| Z-015 | `Zone.canNest` at depth=MAX_ZONE_DEPTH-1 | Returns false |

#### A.2 Shelf Domain (`lib/domain/shelf.ts`)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| S-001 | `Shelf.createConfig(5, 'UNIFORM')` | Creates config with count=5, mode=UNIFORM |
| S-002 | `Shelf.setCount` beyond MAX_SHELVES_PER_ZONE | Clamps to max value |
| S-003 | `Shelf.calculatePositions` | Distributes shelves from bottom proportionally |
| S-004 | `Shelf.switchMode('MANUAL')` | Creates individual shelf configs |
| S-005 | `Shelf.updateShelfAt` in MANUAL mode | Updates correct shelf |

#### A.3 Drawer Domain (`lib/domain/drawer.ts`)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| D-001 | `Drawer.createConfig(3, 'SIDE_MOUNT')` | Creates 3 zones with SIDE_MOUNT |
| D-002 | `Drawer.addZone` at MAX_DRAWER_ZONES_PER_ZONE | No change |
| D-003 | `Drawer.removeZone` with 1 zone left | No change (min 1 zone) |
| D-004 | `Drawer.addBox` to zone | Adds box with heightRatio=1 |
| D-005 | `Drawer.addAboveBoxShelf` | Adds shelf to aboveBoxContent |
| D-006 | `Drawer.calculateZoneBounds` | Correct front/box height distribution |
| D-007 | `Drawer.getFrontCount` | Returns count of zones with front !== null |
| D-008 | `Drawer.getTotalBoxCount` | Returns sum of all boxes across zones |

---

### B. Component Tests (UI Logic)

#### B.1 InteriorPreview

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| IP-001 | Render with empty zones array | Shows empty cabinet body |
| IP-002 | Render with 2 SHELVES zones | Shows 2 zones with shelf lines |
| IP-003 | Render with DRAWERS zone (3 zones) | Shows 3 drawer boxes |
| IP-004 | Render NESTED/VERTICAL with 2 children | Shows 2 columns side by side |
| IP-005 | Click on zone | Calls onSelectZone with correct id |
| IP-006 | Selected zone styling | Shows ring-2 ring-primary |
| IP-007 | Aspect ratio for 800x700 cabinet | Wider than tall |
| IP-008 | Drawer with 2 boxes shows divider | Shows F×2 label |
| IP-009 | Drawer with shelvesAbove | Shows blue shelf line above drawer |
| IP-010 | SHELVES zone with 3 shelves | Shows 3 horizontal lines from bottom |

#### B.2 ZoneEditor

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| ZE-001 | Render with EMPTY zone | Shows content type selector with EMPTY selected |
| ZE-002 | Change content type to SHELVES | Calls onUpdate with shelvesConfig |
| ZE-003 | Change content type to NESTED | Shows direction toggle (HORIZONTAL/VERTICAL) |
| ZE-004 | NESTED at MAX_ZONE_DEPTH-1 | NESTED option is disabled |
| ZE-005 | Add child to NESTED zone | Children count increases |
| ZE-006 | Remove child from NESTED zone (min 1) | Cannot remove last child |
| ZE-007 | Height ratio slider change | Updates zone.heightConfig.ratio |
| ZE-008 | Width ratio for zone with widthConfig | Shows width controls |
| ZE-009 | Change shelf count | Updates shelvesConfig.count |
| ZE-010 | DRAWERS: add drawer zone | Adds zone to drawerConfig.zones |
| ZE-011 | DRAWERS: add box to zone | Adds box to selected zone |
| ZE-012 | DRAWERS: toggle external front | Changes front from {} to null |
| ZE-013 | DRAWERS: boxToFrontRatio change | Updates zone.boxToFrontRatio |
| ZE-014 | Delete zone button | Calls onDelete when canDelete=true |
| ZE-015 | Delete disabled for last zone | Button disabled when canDelete=false |

#### B.3 InteriorConfigDialog

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| ICD-001 | Open with no config | Creates default config with 1 SHELVES zone |
| ICD-002 | Add section button | Adds new EMPTY zone at depth 1 |
| ICD-003 | Breadcrumb navigation | Shows correct path for nested selection |
| ICD-004 | Back button | Navigates to parent zone |
| ICD-005 | Home button | Returns to first top-level zone |
| ICD-006 | Section reorder up/down | Moves zone in array |
| ICD-007 | Column reorder left/right | Moves child in VERTICAL parent |
| ICD-008 | Apply changes button | Calls onConfigChange with localConfig |
| ICD-009 | Cancel button | Calls onOpenChange(false), no changes |
| ICD-010 | Conflict: drawer fronts + doors | Shows warning dialog |
| ICD-011 | Resolve conflict: remove fronts | Removes all fronts from tree |
| ICD-012 | Resolve conflict: remove doors | Calls onRemoveDoors |
| ICD-013 | interiorHeight calculation for nested | Uses parent zone's allocated height |
| ICD-014 | totalRatio calculation for nested | Uses sibling zones' ratios |

---

### C. Integration Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| INT-001 | Create 3-level nested structure | All zones accessible via navigation |
| INT-002 | Configure drawers in nested column | Correct drawer dimensions shown |
| INT-003 | Add partition between VERTICAL children | Partition config added |
| INT-004 | Full flow: open, configure, save | Cabinet receives new interiorConfig |
| INT-005 | Generator creates correct parts | Parts match zone configuration |

---

### D. Visual/Snapshot Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| VIS-001 | InteriorPreview: SHELVES zone | Matches snapshot |
| VIS-002 | InteriorPreview: DRAWERS zone | Matches snapshot |
| VIS-003 | InteriorPreview: NESTED 2x2 | Matches snapshot |
| VIS-004 | ZoneEditor: SHELVES controls | Matches snapshot |
| VIS-005 | ZoneEditor: DRAWERS controls | Matches snapshot |

---

## Test Fixtures

### Zone Fixtures
```typescript
// Simple shelves zone
const shelvesZone: InteriorZone = {
  id: 'test-shelves-1',
  contentType: 'SHELVES',
  heightConfig: { mode: 'RATIO', ratio: 1 },
  depth: 1,
  shelvesConfig: { mode: 'UNIFORM', count: 3, depthPreset: 'FULL', shelves: [] },
};

// Simple drawers zone
const drawersZone: InteriorZone = {
  id: 'test-drawers-1',
  contentType: 'DRAWERS',
  heightConfig: { mode: 'RATIO', ratio: 1 },
  depth: 1,
  drawerConfig: {
    slideType: 'SIDE_MOUNT',
    zones: [
      { id: 'dz1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      { id: 'dz2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
    ],
  },
};

// 2-column nested zone
const nestedVerticalZone: InteriorZone = {
  id: 'test-nested-v',
  contentType: 'NESTED',
  divisionDirection: 'VERTICAL',
  heightConfig: { mode: 'RATIO', ratio: 1 },
  depth: 1,
  children: [
    { ...shelvesZone, id: 'col-1', depth: 2 },
    { ...drawersZone, id: 'col-2', depth: 2 },
  ],
};

// Root config for tests
const testRootConfig: CabinetInteriorConfig = {
  rootZone: {
    id: 'root',
    contentType: 'NESTED',
    divisionDirection: 'HORIZONTAL',
    heightConfig: { mode: 'RATIO', ratio: 1 },
    depth: 0,
    children: [nestedVerticalZone, shelvesZone],
  },
};
```

---

## Mock Setup

### Store Mock
```typescript
const mockStore = {
  materials: [{ id: 'mat-1', name: 'Test Material', color: '#ffffff', thickness: 18 }],
  selectedCabinetId: 'cabinet-1',
};
```

### Props Mock
```typescript
const defaultProps: InteriorConfigDialogProps = {
  open: true,
  onOpenChange: vi.fn(),
  config: testRootConfig,
  onConfigChange: vi.fn(),
  cabinetHeight: 720,
  cabinetWidth: 600,
  cabinetDepth: 560,
  hasDoors: false,
  onRemoveDoors: vi.fn(),
  materials: mockStore.materials,
  bodyMaterialId: 'mat-1',
  lastUsedShelfMaterial: 'mat-1',
  lastUsedDrawerBoxMaterial: 'mat-1',
  lastUsedDrawerBottomMaterial: 'mat-1',
};
```

---

## Priority Order

1. **Domain logic tests (A.1, A.2, A.3)** - Pure functions, easiest to test
2. **InteriorPreview tests (B.1)** - Visual component, key for UX
3. **ZoneEditor tests (B.2)** - User interaction logic
4. **InteriorConfigDialog tests (B.3)** - Dialog orchestration
5. **Integration tests (C)** - End-to-end flows
6. **Visual/snapshot tests (D)** - Regression protection

---

## Notes

- Use `@testing-library/react` for component tests
- Use `vitest` for unit tests
- Mock `@/lib/config` constants where needed
- Focus on user-visible behavior, not implementation details
