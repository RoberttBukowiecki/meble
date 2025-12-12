# Transform Dimensions Display Plan

## Overview

Display CAD-style distance dimensions during translate/resize operations showing distances to nearest cabinets/groups. Uses bounding boxes for calculations and only shows dimensions relevant to the current transform axis.

## User Requirements (from discussion)

- **Dimensions shown**: Distance to neighbors only (not object size or wall distances)
- **Alignment guides**: No guides, only numeric dimensions
- **Visibility threshold**: Adaptive - show only 2-3 nearest objects, hide when > 1000mm
- **Visual style**: CAD-style with classic dimension lines and arrows

---

## Architecture

### High-Level Flow

```
Transform Start
    ↓
Calculate Bounding Boxes (once per frame)
    ↓
Find Nearest Objects per Axis
    ↓
Filter by Adaptive Threshold
    ↓
Render Dimension Lines (via refs, no rerenders)
    ↓
Transform End → Clear Dimensions
```

### Key Design Decisions

1. **Ref-based rendering** - Follow existing `SnapGuidesRenderer` pattern for zero-rerender updates
2. **Context-based state** - New `DimensionContext` similar to `SnapContext`
3. **Axis-aware calculations** - Only compute dimensions for current transform axis
4. **Instanced rendering** - Use `InstancedMesh` for dimension lines (max 6 per axis × 3 axes = 18)

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Create Dimension Context (`/lib/dimension-context.tsx`)

```typescript
interface DimensionLine {
  id: string;
  axis: 'X' | 'Y' | 'Z';
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  distance: number; // in mm
  targetId: string; // ID of cabinet/group we're measuring to
}

interface DimensionContextValue {
  dimensionLinesRef: MutableRefObject<DimensionLine[]>;
  versionRef: MutableRefObject<number>;
  setDimensionLines: (lines: DimensionLine[]) => void;
  clearDimensionLines: () => void;
  activeAxisRef: MutableRefObject<'X' | 'Y' | 'Z' | null>;
  setActiveAxis: (axis: 'X' | 'Y' | 'Z' | null) => void;
}
```

**Performance note**: Use refs exclusively for dimension data to avoid rerenders during drag.

#### 1.2 Create Dimension Calculator (`/lib/dimension-calculator.ts`)

```typescript
interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  groupId: string; // Cabinet ID or manual group ID
}

interface DimensionCandidate {
  distance: number;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  targetId: string;
  axis: 'X' | 'Y' | 'Z';
}

// Main calculation function
function calculateDimensions(
  movingBounds: BoundingBox,
  allBounds: BoundingBox[],
  activeAxis: 'X' | 'Y' | 'Z',
  settings: DimensionSettings
): DimensionLine[];
```

**Algorithm**:
1. Get bounding box of moving object (part/cabinet/multiselect)
2. For active axis only, find objects with overlapping projection on other two axes
3. Calculate min distance from moving object's face to each target's opposite face
4. Sort by distance, take top N (configurable, default 2-3)
5. Filter out distances > threshold (default 1000mm)

#### 1.3 Bounding Box Utilities (`/lib/bounding-box-utils.ts`)

```typescript
// Get AABB for a single part
function getPartBoundingBox(part: Part): BoundingBox;

// Get combined AABB for a cabinet (all its parts)
function getCabinetBoundingBox(cabinetId: string, parts: Part[]): BoundingBox;

// Get combined AABB for multiselect
function getMultiselectBoundingBox(partIds: Set<string>, parts: Part[]): BoundingBox;

// Get all other bounding boxes (excluding moving object)
function getOtherBoundingBoxes(
  excludeIds: Set<string>,
  parts: Part[],
  cabinets: Cabinet[]
): BoundingBox[];
```

---

### Phase 2: Rendering

#### 2.1 Dimension Renderer Component (`/components/canvas/DimensionRenderer.tsx`)

CAD-style dimension line with:
- Main line between two points
- Extension lines at both ends (perpendicular to main line)
- Arrow heads at both ends
- Distance label centered on line

```
    ↑                           ↑
    | Extension                 | Extension
    | Line                      | Line
    ↓                           ↓
────┼───────────────────────────┼────
    ←         245 mm            →
────┼───────────────────────────┼────
    ↑                           ↑
    |                           |
```

**Technical approach**:
- Use `THREE.Line` for dimension lines (thin, no aliasing issues)
- Use `THREE.Sprite` or `Html` from drei for text labels
- Update via `useFrame` reading from context refs
- Render order > 1000 to always be on top

#### 2.2 Visual Specifications

```typescript
const DIMENSION_CONFIG = {
  // Line styling
  LINE_COLOR: 0x2563eb, // Blue-600 from theme
  LINE_WIDTH: 1,
  EXTENSION_LINE_LENGTH: 15, // mm, perpendicular extensions
  ARROW_SIZE: 8, // mm

  // Label styling
  LABEL_FONT_SIZE: 12,
  LABEL_BACKGROUND: 'rgba(255, 255, 255, 0.9)',
  LABEL_PADDING: 4,
  LABEL_OFFSET: 10, // mm above line

  // Behavior
  MAX_VISIBLE_DIMENSIONS: 3, // per axis
  MAX_DISTANCE_THRESHOLD: 1000, // mm
  MIN_DISTANCE_TO_SHOW: 5, // mm - don't show for overlapping

  // Axis colors (optional differentiation)
  AXIS_COLORS: {
    X: 0xef4444, // Red for X
    Y: 0x22c55e, // Green for Y
    Z: 0x3b82f6, // Blue for Z
  },
};
```

---

### Phase 3: Integration

#### 3.1 Integrate with PartTransformControls

```typescript
// In PartTransformControls.tsx

const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

const handleChange = useCallback(() => {
  // ... existing snap logic ...

  // Calculate dimensions for current drag axis
  if (mode === 'translate') {
    const axis = getDragAxis();
    if (axis) {
      setActiveAxis(axis);

      const movingBounds = getPartBoundingBox({ ...part, position: currentPosition });
      const otherBounds = getOtherBoundingBoxes(
        new Set([part.id]),
        parts,
        cabinets
      );

      const dimensions = calculateDimensions(
        movingBounds,
        otherBounds,
        axis,
        dimensionSettings
      );

      setDimensionLines(dimensions);
    }
  }
}, [/* deps */]);

const handleTransformEnd = useCallback(() => {
  clearDimensionLines();
  setActiveAxis(null);
  // ... existing logic ...
}, [/* deps */]);
```

#### 3.2 Integrate with CabinetGroupTransform

Same pattern as PartTransformControls, but using `getCabinetBoundingBox` for the moving object.

#### 3.3 Integrate with MultiSelectTransformControls

Same pattern, but using `getMultiselectBoundingBox` for the moving object.

#### 3.4 Integrate with Scene

```tsx
// In Scene.tsx
<DimensionProvider>
  <SnapProvider>
    <Canvas>
      {/* ... existing content ... */}

      {/* Dimension lines (rendered based on context) */}
      <DimensionRenderer />
    </Canvas>
  </SnapProvider>
</DimensionProvider>
```

---

### Phase 4: Resize Mode Support

#### 4.1 Extend for PartResizeControls

For resize mode, show dimension from the resizing face to nearest objects:
- Only calculate for the face being dragged
- Show distance that would result if resize continues
- Update label to show "new distance" during resize

---

## Performance Optimizations

### 1. Calculation Optimizations

```typescript
// Pre-compute bounding boxes at transform start, not every frame
const boundingBoxCache = useRef<Map<string, BoundingBox>>(new Map());

// Only recalculate for objects within reasonable range
const MAX_CONSIDERATION_DISTANCE = 2000; // mm

// Early exit using center-to-center distance
function quickDistanceCheck(a: BoundingBox, b: BoundingBox): boolean {
  const dx = Math.abs(a.center[0] - b.center[0]);
  const dy = Math.abs(a.center[1] - b.center[1]);
  const dz = Math.abs(a.center[2] - b.center[2]);
  return Math.max(dx, dy, dz) < MAX_CONSIDERATION_DISTANCE;
}
```

### 2. Rendering Optimizations

```typescript
// Use instanced mesh for lines (single draw call)
<instancedMesh args={[lineGeometry, lineMaterial, MAX_DIMENSION_LINES]} />

// Update only when version changes
useFrame(() => {
  if (versionRef.current === lastVersionRef.current) return;
  // ... update instances ...
});

// Pool text sprites instead of creating/destroying
const textSpritePool = useRef<THREE.Sprite[]>([]);
```

### 3. Memory Optimizations

```typescript
// Reuse vector objects
const tempVec = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();

// Clear refs on transform end to allow GC
clearDimensionLines(); // Sets ref to empty array
```

---

## File Structure

```
apps/app/src/
├── lib/
│   ├── dimension-context.tsx      # Context provider (similar to snap-context)
│   ├── dimension-calculator.ts    # Core calculation logic
│   └── bounding-box-utils.ts      # Bounding box helpers
├── components/
│   └── canvas/
│       └── DimensionRenderer.tsx  # 3D dimension line rendering
└── types/
    └── index.ts                   # Add DimensionLine, DimensionSettings types
```

---

## Types to Add (`/types/index.ts`)

```typescript
// Dimension line for visualization
export interface DimensionLine {
  id: string;
  axis: 'X' | 'Y' | 'Z';
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  distance: number;
  targetId: string;
}

// Settings for dimension display
export interface DimensionSettings {
  enabled: boolean;
  maxVisiblePerAxis: number;    // Default: 3
  maxDistanceThreshold: number; // Default: 1000mm
  showAxisColors: boolean;      // Default: false (use single color)
  lineColor: string;            // Default: theme primary
}
```

---

## Store Updates

Add to Zustand store:

```typescript
// State
dimensionSettings: DimensionSettings;

// Actions
updateDimensionSettings: (patch: Partial<DimensionSettings>) => void;
```

Default settings:
```typescript
dimensionSettings: {
  enabled: true,
  maxVisiblePerAxis: 3,
  maxDistanceThreshold: 1000,
  showAxisColors: false,
  lineColor: 'hsl(var(--primary))',
}
```

---

## UI Toggle (Optional)

Add toggle to `SnapControlPanel` or create separate `DimensionControlPanel`:

```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={dimensionSettings.enabled}
    onCheckedChange={(enabled) => updateDimensionSettings({ enabled })}
  />
  <Label>Pokaż wymiary</Label>
</div>
```

---

## Testing Checklist

- [ ] Single part translate - X, Y, Z axes
- [ ] Cabinet translate - all axes
- [ ] Multiselect translate - all axes
- [ ] Dimensions hide when > 1000mm threshold
- [ ] Only 2-3 nearest shown (adaptive filtering)
- [ ] Dimensions only show for active axis (not all axes)
- [ ] No performance degradation with 50+ cabinets
- [ ] Dimensions clear on transform end
- [ ] Text labels readable at all camera angles
- [ ] Works with rotated parts/cabinets
- [ ] Resize mode shows correct dimensions

---

## Implementation Order

1. **Types** - Add types to `/types/index.ts`
2. **Bounding Box Utils** - `/lib/bounding-box-utils.ts`
3. **Dimension Calculator** - `/lib/dimension-calculator.ts`
4. **Dimension Context** - `/lib/dimension-context.tsx`
5. **Dimension Renderer** - `/components/canvas/DimensionRenderer.tsx`
6. **Store Updates** - Add settings to store
7. **Integration: PartTransformControls**
8. **Integration: CabinetGroupTransform**
9. **Integration: MultiSelectTransformControls**
10. **Integration: Scene** - Add provider and renderer
11. **Optional: UI Toggle**
12. **Optional: Resize mode support**

---

## Estimated Complexity

| Component | Complexity | Notes |
|-----------|------------|-------|
| Types | Low | Just interfaces |
| Bounding Box Utils | Low | Existing patterns in snapping.ts |
| Dimension Calculator | Medium | Algorithm for axis-aware distances |
| Dimension Context | Low | Copy snap-context pattern |
| Dimension Renderer | Medium-High | CAD-style lines + text labels |
| Store Updates | Low | Simple settings |
| Transform Integration | Medium | Integrate with 3 components |

Total: ~500-700 lines of new code
