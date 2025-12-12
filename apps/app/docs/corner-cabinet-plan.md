# Corner Cabinet Implementation Plan

## Overview

Implementation of corner kitchen cabinets - specialized cabinets designed for corner spaces where two walls meet. This plan covers internal corner cabinets (Phase 1) and external corner cabinets (Phase 2).

## Scope

### Phase 1: Internal Corner Cabinets (Primary)
Cabinets for internal corners (walls meeting at 90° or custom angles)

**Types:**
1. **L-Shaped (Diagonal)** - Most popular, diagonal front at 45°
2. **Blind Corner** - Partially hidden storage space, requires pull-out
3. **Lazy Susan** - Rotating carousel shelves (visual only initially)

### Phase 2: External Corner Cabinets (Future)
Cabinets for external corners (islands, peninsulas) - to be implemented later

---

## Architecture

### New Types (`src/types/index.ts`)

```typescript
// ============================================================================
// Corner Cabinet Types
// ============================================================================

/**
 * Corner cabinet sub-types for internal corners
 */
export type InternalCornerType = 'L_SHAPED' | 'BLIND_CORNER' | 'LAZY_SUSAN';

/**
 * Corner cabinet sub-types for external corners (Phase 2)
 */
export type ExternalCornerType = 'EXTERNAL_L_SHAPED' | 'EXTERNAL_DIAGONAL';

/**
 * Corner orientation - which direction the corner opens
 */
export type CornerOrientation = 'LEFT' | 'RIGHT';

/**
 * Door configuration for corner cabinets
 */
export type CornerDoorType =
  | 'BI_FOLD'        // Folding doors (2-part)
  | 'SINGLE_DIAGONAL' // Single door on diagonal front
  | 'DOUBLE_L'       // Two door sets (L-configuration)
  | 'NONE';          // No doors (open shelving)

/**
 * Dead zone handling presets
 */
export type DeadZonePreset =
  | 'MINIMAL'        // Smallest dead zone, maximum usable space
  | 'STANDARD'       // Balanced approach (default)
  | 'ACCESSIBLE'     // Larger opening for better access
  | 'CUSTOM';        // User-defined dimensions

/**
 * Wall sharing mode for adjacent cabinets
 */
export type WallSharingMode =
  | 'FULL_ISOLATION' // All walls present
  | 'SHARED_LEFT'    // Left wall shared with adjacent cabinet
  | 'SHARED_RIGHT'   // Right wall shared with adjacent cabinet
  | 'SHARED_BOTH';   // Both sides shared (rare)

/**
 * Dimension mode for corner arms
 */
export type CornerDimensionMode = 'SYMMETRIC' | 'ASYMMETRIC';

/**
 * Internal mechanism types (extensible for future)
 */
export type CornerMechanismType =
  | 'FIXED_SHELVES'  // Standard fixed shelves
  | 'LAZY_SUSAN'     // Rotating carousel (future)
  | 'PULL_OUT'       // Pull-out shelves/baskets (future)
  | 'MAGIC_CORNER';  // Magic corner system (future)

/**
 * Internal corner cabinet parameters
 */
export interface InternalCornerCabinetParams extends CabinetBaseParams {
  type: 'CORNER_INTERNAL';
  cornerType: InternalCornerType;
  cornerOrientation: CornerOrientation;

  // Dimensions
  dimensionMode: CornerDimensionMode;
  armA: number;        // Length of first arm (mm)
  armB: number;        // Length of second arm (mm) - equals armA if SYMMETRIC
  cornerAngle: number; // Angle in degrees (default: 90)

  // Dead zone handling
  deadZonePreset: DeadZonePreset;
  deadZoneDepth?: number;  // Custom depth when preset is CUSTOM
  deadZoneWidth?: number;  // Custom width when preset is CUSTOM

  // Wall sharing
  wallSharingMode: WallSharingMode;

  // Doors
  cornerDoorType: CornerDoorType;
  doorConfig?: DoorConfig; // For bi-fold and standard doors
  handleConfig?: HandleConfig;

  // Internal
  shelfCount: number;
  mechanismType: CornerMechanismType;

  // L-Shaped specific
  diagonalWidth?: number; // Width of diagonal front (auto-calculated if not provided)
}

/**
 * External corner cabinet parameters (Phase 2)
 */
export interface ExternalCornerCabinetParams extends CabinetBaseParams {
  type: 'CORNER_EXTERNAL';
  cornerType: ExternalCornerType;
  cornerOrientation: CornerOrientation;
  armA: number;
  armB: number;
  cornerAngle: number;
  shelfCount: number;
  doorConfig?: DoorConfig;
  handleConfig?: HandleConfig;
}
```

### Update CabinetType

```typescript
export type CabinetType =
  | 'KITCHEN'
  | 'WARDROBE'
  | 'BOOKSHELF'
  | 'DRAWER'
  | 'CORNER_INTERNAL'   // Phase 1
  | 'CORNER_EXTERNAL';  // Phase 2
```

### Update CabinetParams Union

```typescript
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams
  | InternalCornerCabinetParams   // Phase 1
  | ExternalCornerCabinetParams;  // Phase 2
```

### New Part Roles

```typescript
export type CabinetPartRole =
  // ... existing roles ...
  // Corner-specific roles
  | 'CORNER_LEFT_SIDE'     // Left arm side panel
  | 'CORNER_RIGHT_SIDE'    // Right arm side panel
  | 'CORNER_BACK_LEFT'     // Left arm back panel
  | 'CORNER_BACK_RIGHT'    // Right arm back panel
  | 'CORNER_DIAGONAL_FRONT'// Diagonal front panel (L-shaped)
  | 'CORNER_BOTTOM'        // L-shaped or trapezoid bottom
  | 'CORNER_TOP'           // L-shaped or trapezoid top
  | 'CORNER_SHELF'         // Corner shelf (L-shaped or trapezoid)
  | 'CORNER_DOOR_LEFT'     // Bi-fold left part
  | 'CORNER_DOOR_RIGHT'    // Bi-fold right part
  | 'CORNER_FILLER';       // Filler panel for dead zone
```

---

## New Files Structure

```
apps/app/src/lib/cabinetGenerators/
├── corner/
│   ├── index.ts              # Re-exports
│   ├── types.ts              # Corner-specific internal types
│   ├── constants.ts          # Dead zone presets, default values
│   ├── geometry.ts           # Geometry calculations (L-shape, trapezoid)
│   ├── internalCorner.ts     # Main internal corner generator
│   ├── lShapedCorner.ts      # L-shaped (diagonal) corner logic
│   ├── blindCorner.ts        # Blind corner logic
│   ├── lazySusan.ts          # Lazy Susan corner logic
│   ├── cornerDoors.ts        # Corner-specific door generation
│   ├── cornerShelves.ts      # Corner shelf generation
│   └── externalCorner.ts     # External corner (Phase 2)
```

---

## Implementation Details

### 1. Geometry Calculations (`geometry.ts`)

```typescript
/**
 * Calculate L-shaped polygon points for bottom/top/shelf
 */
export function calculateLShapePoints(
  armA: number,
  armB: number,
  depth: number,
  cornerAngle: number,
  deadZonePreset: DeadZonePreset
): [number, number][];

/**
 * Calculate diagonal front width based on arms and angle
 */
export function calculateDiagonalWidth(
  armA: number,
  armB: number,
  depth: number,
  cornerAngle: number
): number;

/**
 * Calculate trapezoid points for blind corner shelves
 */
export function calculateTrapezoidPoints(
  frontWidth: number,
  backWidth: number,
  depth: number,
  skosSide: 'left' | 'right'
): [number, number][];

/**
 * Get dead zone dimensions based on preset
 */
export function getDeadZoneDimensions(
  preset: DeadZonePreset,
  armA: number,
  armB: number,
  depth: number
): { width: number; depth: number };
```

### 2. Dead Zone Presets (`constants.ts`)

```typescript
export const DEAD_ZONE_PRESETS = {
  MINIMAL: {
    widthRatio: 0.15,  // 15% of average arm length
    depthRatio: 0.15,
    description: 'Minimalna martwa strefa - maksymalna przestrzeń użytkowa'
  },
  STANDARD: {
    widthRatio: 0.25,  // 25% of average arm length
    depthRatio: 0.25,
    description: 'Standardowa - zbalansowane podejście'
  },
  ACCESSIBLE: {
    widthRatio: 0.35,  // 35% of average arm length
    depthRatio: 0.35,
    description: 'Dostępna - większy otwór dla łatwego dostępu'
  }
} as const;

export const CORNER_DEFAULTS = {
  cornerAngle: 90,
  deadZonePreset: 'STANDARD' as DeadZonePreset,
  dimensionMode: 'SYMMETRIC' as CornerDimensionMode,
  mechanismType: 'FIXED_SHELVES' as CornerMechanismType,
  cornerDoorType: 'SINGLE_DIAGONAL' as CornerDoorType,
  wallSharingMode: 'FULL_ISOLATION' as WallSharingMode,
  shelfCount: 1,
} as const;

// Bi-fold door constants
export const BI_FOLD_GAP = 3; // mm gap between folding parts
export const BI_FOLD_HINGE_OFFSET = 30; // mm from edge for hinge placement
```

### 3. L-Shaped Corner Generator (`lShapedCorner.ts`)

Core logic for diagonal/L-shaped corner cabinets:

```typescript
export function generateLShapedCorner(
  params: GenerateLShapedCornerParams
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];

  // 1. Generate L-shaped bottom panel
  // 2. Generate L-shaped top panel
  // 3. Generate left side panel (along armA)
  // 4. Generate right side panel (along armB)
  // 5. Generate diagonal front panel (no door) or door frame
  // 6. Generate back panels (left + right arm backs)
  // 7. Generate L-shaped shelves
  // 8. Generate doors based on cornerDoorType
  // 9. Apply wall sharing mode (remove shared walls)

  return parts;
}
```

### 4. Blind Corner Generator (`blindCorner.ts`)

Logic for blind corner cabinets with hidden storage:

```typescript
export function generateBlindCorner(
  params: GenerateBlindCornerParams
): GeneratedPart[] {
  // Blind corner has one full-depth arm and one shallow arm
  // The "blind" portion is accessible via pull-out mechanism

  // 1. Generate bottom (trapezoid or rect depending on config)
  // 2. Generate full side panels
  // 3. Generate filler panel for blind area
  // 4. Generate back panel
  // 5. Generate shelves
  // 6. Generate door (standard single door on accessible side)

  return parts;
}
```

### 5. Corner Doors (`cornerDoors.ts`)

```typescript
/**
 * Generate bi-fold doors for corner cabinets
 */
export function generateBiFoldDoors(params: BiFoldDoorParams): GeneratedPart[];

/**
 * Generate single diagonal door
 */
export function generateDiagonalDoor(params: DiagonalDoorParams): GeneratedPart[];

/**
 * Generate double-L door configuration
 */
export function generateDoubleLDoors(params: DoubleLDoorParams): GeneratedPart[];
```

### 6. Corner Shelves (`cornerShelves.ts`)

```typescript
/**
 * Generate L-shaped shelf
 */
export function generateLShapedShelf(
  params: LShapedShelfParams,
  shelfIndex: number
): GeneratedPart;

/**
 * Generate trapezoid shelf (for blind corner)
 */
export function generateTrapezoidShelf(
  params: TrapezoidShelfParams,
  shelfIndex: number
): GeneratedPart;

/**
 * Calculate shelf Y positions with even spacing
 */
export function calculateShelfPositions(
  cabinetHeight: number,
  materialThickness: number,
  shelfCount: number
): number[];
```

---

## UI Components

### New/Updated Components

```
apps/app/src/components/ui/
├── CornerCabinetDialog.tsx    # Main corner cabinet creation dialog
├── CornerTypeSelector.tsx     # Visual selector for corner types
├── CornerDimensionInput.tsx   # Arms A/B input with symmetric toggle
├── DeadZonePresetSelector.tsx # Dead zone preset buttons
└── WallSharingSelector.tsx    # Wall sharing mode selector
```

### CornerCabinetDialog Structure

```tsx
<Dialog>
  <DialogContent>
    <Tabs defaultValue="type">
      {/* Tab 1: Corner Type Selection */}
      <TabsContent value="type">
        <CornerTypeSelector
          selectedType={cornerType}
          orientation={cornerOrientation}
          onTypeChange={setCornerType}
          onOrientationChange={setCornerOrientation}
        />
      </TabsContent>

      {/* Tab 2: Dimensions */}
      <TabsContent value="dimensions">
        <CornerDimensionInput
          mode={dimensionMode}
          armA={armA}
          armB={armB}
          height={height}
          depth={depth}
          cornerAngle={cornerAngle}
          onChange={handleDimensionChange}
        />
        <DeadZonePresetSelector
          preset={deadZonePreset}
          onChange={setDeadZonePreset}
        />
      </TabsContent>

      {/* Tab 3: Configuration */}
      <TabsContent value="config">
        <WallSharingSelector ... />
        <ShelfCountInput ... />
        <CornerDoorTypeSelector ... />
      </TabsContent>

      {/* Tab 4: Materials */}
      <TabsContent value="materials">
        <MaterialSelector ... />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

---

## Integration Points

### 1. Update `CabinetTemplateDialog.tsx`

Add "Narożna" tab/option alongside existing cabinet types:

```tsx
const CABINET_CATEGORIES = [
  { id: 'kitchen', label: 'Kuchenna', icon: ... },
  { id: 'corner', label: 'Narożna', icon: ..., isNew: true },
  { id: 'drawer', label: 'Szufladowa', icon: ... },
  // ...
];
```

### 2. Update `getGeneratorForType()` in `index.ts`

```typescript
export function getGeneratorForType(type: CabinetType): CabinetGenerator {
  switch (type) {
    // ... existing cases
    case 'CORNER_INTERNAL':
      return generateInternalCornerCabinet;
    case 'CORNER_EXTERNAL':
      return generateExternalCornerCabinet;
  }
}
```

### 3. Update `Part3D.tsx` for New ShapeTypes

Ensure L_SHAPE and POLYGON shape types render correctly for corner shelves:

```tsx
// Already supported via existing ShapeParams union
// Verify geometry generation for L_SHAPE handles corner cases
```

### 4. PropertiesPanel Updates

Add corner-specific properties when corner cabinet is selected:
- Corner type display
- Dead zone preset selector
- Wall sharing mode toggle
- Arm dimensions (A/B)

---

## Validation Rules

```typescript
// Minimum dimensions
const CORNER_MIN_ARM = 300;     // mm - minimum arm length
const CORNER_MAX_ARM = 1500;    // mm - maximum arm length
const CORNER_MIN_HEIGHT = 400;  // mm
const CORNER_MAX_HEIGHT = 2400; // mm
const CORNER_MIN_DEPTH = 300;   // mm
const CORNER_MAX_DEPTH = 800;   // mm

// Angle constraints
const CORNER_MIN_ANGLE = 45;    // degrees
const CORNER_MAX_ANGLE = 135;   // degrees

// Validation function
export function validateCornerCabinetParams(
  params: InternalCornerCabinetParams
): ValidationResult {
  const errors: string[] = [];

  if (params.armA < CORNER_MIN_ARM || params.armA > CORNER_MAX_ARM) {
    errors.push(`Ramię A musi być w zakresie ${CORNER_MIN_ARM}-${CORNER_MAX_ARM}mm`);
  }

  if (params.dimensionMode === 'ASYMMETRIC') {
    if (params.armB < CORNER_MIN_ARM || params.armB > CORNER_MAX_ARM) {
      errors.push(`Ramię B musi być w zakresie ${CORNER_MIN_ARM}-${CORNER_MAX_ARM}mm`);
    }
  }

  if (params.cornerAngle < CORNER_MIN_ANGLE || params.cornerAngle > CORNER_MAX_ANGLE) {
    errors.push(`Kąt narożnika musi być w zakresie ${CORNER_MIN_ANGLE}-${CORNER_MAX_ANGLE}°`);
  }

  // ... more validations

  return { valid: errors.length === 0, errors };
}
```

---

## Implementation Phases

### Phase 1A: Core Types & L-Shaped Corner
1. Add new types to `src/types/index.ts`
2. Create `corner/` directory structure
3. Implement `geometry.ts` calculations
4. Implement `constants.ts` with presets
5. Implement `lShapedCorner.ts` generator
6. Basic UI dialog (dimensions + type selection)
7. Integration with existing generator factory

### Phase 1B: Doors & Shelves
1. Implement `cornerDoors.ts` (bi-fold, diagonal, double-L)
2. Implement `cornerShelves.ts` (L-shaped shelves)
3. Full door configuration UI
4. Handle configuration for corner doors

### Phase 1C: Blind Corner & Lazy Susan
1. Implement `blindCorner.ts` generator
2. Implement `lazySusan.ts` (visual representation)
3. Corner type selector with visual previews
4. Dead zone preset selector UI

### Phase 1D: Advanced Features
1. Wall sharing mode implementation
2. Asymmetric dimensions support
3. Custom angle support (non-90°)
4. PropertiesPanel integration for editing

### Phase 2: External Corner Cabinets (Future)
1. `externalCorner.ts` generator
2. External corner specific UI
3. Island/peninsula integration

---

## Testing Checklist

### Unit Tests
- [ ] Geometry calculations (L-shape points, diagonal width)
- [ ] Dead zone dimension calculations
- [ ] Shelf position calculations
- [ ] Validation functions

### Integration Tests
- [ ] L-shaped corner generation produces correct parts
- [ ] Blind corner generation works
- [ ] Door configurations render correctly
- [ ] Wall sharing removes correct panels

### Visual Tests (Manual)
- [ ] L-shaped bottom/top renders correctly in 3D
- [ ] Diagonal front aligns properly
- [ ] Bi-fold doors open animation (future)
- [ ] Shelves fit inside cabinet space
- [ ] No z-fighting or overlapping parts

### Edge Cases
- [ ] Minimum dimensions (300mm arms)
- [ ] Maximum dimensions (1500mm arms)
- [ ] Non-90° angles (45°, 135°)
- [ ] Asymmetric arms (A ≠ B)
- [ ] Zero shelves configuration
- [ ] All door types with all corner types

---

## Migration & Backwards Compatibility

No migration needed - this is a new cabinet type. Existing cabinets remain unchanged.

Ensure:
- `CabinetType` union is updated
- `CabinetParams` union is updated
- Default store state handles new types
- CSV export handles corner parts correctly

---

## Open Questions (To Resolve During Implementation)

1. **Bi-fold door animation** - How to handle open/close animation in 3D view?
2. **Lazy Susan visualization** - How detailed should the carousel be rendered?
3. **Pull-out mechanism** - Visual representation vs. just metadata?
4. **CSV export** - How to represent L-shaped parts in cut list?
5. **Collision detection** - Special handling for L-shaped bounding boxes?

---

## Related Files to Modify

1. `src/types/index.ts` - Add new types
2. `src/lib/cabinetGenerators/index.ts` - Register new generators
3. `src/components/ui/CabinetTemplateDialog.tsx` - Add corner option
4. `src/components/ui/PropertiesPanel.tsx` - Corner cabinet properties
5. `src/lib/store.ts` - Handle new cabinet type in actions
6. `src/lib/csv.ts` - Export corner parts correctly

---

## Estimated Complexity

| Component | Complexity | Notes |
|-----------|------------|-------|
| Types definition | Low | Straightforward type additions |
| Geometry calculations | High | Complex L-shape math |
| L-shaped generator | High | Many parts with precise positioning |
| Blind corner generator | Medium | Simpler geometry |
| Bi-fold doors | High | Two-part doors with hinge logic |
| UI dialog | Medium | Multiple tabs, conditional fields |
| Wall sharing | Medium | Conditional part removal |
| Non-90° angles | High | Trigonometry for arbitrary angles |

---

## Success Criteria

1. User can create L-shaped corner cabinet with diagonal front
2. User can create blind corner cabinet
3. All door configurations work correctly
4. Dead zone presets provide sensible defaults
5. Wall sharing mode removes correct panels
6. Parts appear correctly in 3D view
7. Parts export correctly to CSV cut list
8. Architecture supports future mechanism types (Lazy Susan, pull-out)
