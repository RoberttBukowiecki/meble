# Snapping and Resize Functionality - Implementation Plan

**Document Version:** 1.0
**Created:** 2025-12-11
**Status:** Planning

---

## Executive Summary

This document outlines the implementation plan for adding intelligent snapping and visual resize capabilities to the furniture design application. The features will enable users to:

1. **Smart Snapping:** Automatically align parts edge-to-edge or face-to-face based on proximity and orientation
2. **Visual Resize Tool:** Drag handles to resize parts with real-time feedback and snap-aware resizing
3. **Cabinet/Group Snapping:** Snap entire cabinets as rigid units while maintaining internal structure

---

## Requirements Summary

### Snapping Behavior
- **Mode:** Smart adaptive (system chooses edge-to-edge or face-to-face based on context)
- **Snap Distance:** 10mm threshold (precise tolerance)
- **Visual Feedback:**
  - Snap guide lines/highlights showing alignment
  - Magnetic pull effect when approaching snap points
  - Distance-based snap strength (closer = stronger pull)
- **Cabinet Snapping:** Rigid - cabinets snap as one unit, parts maintain relative positions
- **UI Control:** Toggle button with snap options (NOT keyboard shortcut)

### Resize Tool
- **Interaction:** Visual drag handles on part edges/corners
- **Adjustable Dimensions:** Width (X), Height (Y), Depth (Z) - thickness remains tied to material
- **Target:** Individual parts only (not multi-select or cabinets)
- **Constraints:**
  - Maintain material thickness
  - Snap to other parts while resizing
  - Allow resize with collision but show warning
- **Visual Feedback:** Live preview of dimension changes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  - Snap Toggle Button (SnapControlPanel.tsx)                   │
│  - Transform Mode Selector (translate/rotate/resize)           │
│  - Resize Dimension Display (live dimensions)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      State Layer (Zustand)                       │
│  - snapEnabled: boolean                                         │
│  - snapSettings: { distance, showGuides, magneticPull, ... }   │
│  - transformMode: 'translate' | 'rotate' | 'resize'            │
│  - resizeHandleActive: 'width+' | 'height+' | 'depth+' | null  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Core Logic Layer                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ SnapEngine      │  │ ResizeEngine     │  │ SnapVisuals    │ │
│  │ (snapping.ts)   │  │ (resize.ts)      │  │ (SnapGuides)   │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      3D Scene Layer                              │
│  - PartTransformControls (translate/rotate)                     │
│  - PartResizeControls (NEW - resize handles)                    │
│  - SnapGuidesRenderer (NEW - visual snap lines)                 │
│  - CabinetGroupTransform (updated for snapping)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Design

### 1. State Management (Zustand Store)

#### New Slice: `createSnapSlice`

```typescript
interface SnapSlice {
  // Snap state
  snapEnabled: boolean;
  snapSettings: {
    distance: number;              // Snap threshold in mm (default: 10)
    showGuides: boolean;           // Show visual snap lines (default: true)
    magneticPull: boolean;         // Enable magnetic pull effect (default: true)
    strengthCurve: 'linear' | 'quadratic';  // Distance-based strength
    edgeSnap: boolean;             // Enable edge-to-edge snapping
    faceSnap: boolean;             // Enable face-to-face snapping
  };

  // Active snap info (for rendering guides)
  activeSnapPoints: SnapPoint[];

  // Actions
  toggleSnap: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  updateSnapSettings: (settings: Partial<SnapSlice['snapSettings']>) => void;
  setActiveSnapPoints: (points: SnapPoint[]) => void;
  clearSnapPoints: () => void;
}

interface SnapPoint {
  id: string;
  type: 'edge' | 'face';
  position: [number, number, number];
  normal: [number, number, number];
  partId: string;
  strength: number;  // 0-1, based on distance
}
```

#### Update `createSelectionSlice`

```typescript
interface SelectionSlice {
  // ... existing fields
  transformMode: 'translate' | 'rotate' | 'resize';  // Add 'resize'
  resizeHandleActive: ResizeHandle | null;

  // ... existing actions
  setTransformMode: (mode: 'translate' | 'rotate' | 'resize') => void;
  setResizeHandleActive: (handle: ResizeHandle | null) => void;
}

type ResizeHandle =
  | 'width+' | 'width-'   // +X, -X
  | 'height+' | 'height-' // +Y, -Y
  | 'depth+' | 'depth-';  // +Z, -Z
```

---

### 2. Snapping Engine (`lib/snapping.ts`)

#### Core Algorithm: Smart Adaptive Snapping

```typescript
interface SnapResult {
  snapped: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  snapPoints: SnapPoint[];
}

/**
 * Calculate snap for a part being transformed
 *
 * Algorithm:
 * 1. Get all potential snap targets (exclude self, same cabinet/group)
 * 2. For each target, calculate snap candidates:
 *    a. Edge-to-edge: Check all 12 edges of both bounding boxes
 *    b. Face-to-face: Check all 6 faces of both bounding boxes
 * 3. Filter candidates within snap distance threshold
 * 4. Score candidates by:
 *    - Distance (closer = higher score)
 *    - Alignment (better aligned normals = higher score)
 *    - Type priority (face-to-face > edge-to-edge for proximity < 5mm)
 * 5. Apply highest scoring snap (if any)
 * 6. Return snapped position + visual guides
 */
function calculateSnap(
  part: Part,
  newPosition: [number, number, number],
  allParts: Part[],
  settings: SnapSettings
): SnapResult;

/**
 * Get snap candidates for edge-to-edge snapping
 *
 * For each edge of part A, check alignment with edges of part B:
 * - Edges are parallel (dot product of directions ≈ ±1)
 * - Distance between edge midpoints < snapDistance
 * - Calculate snap offset to align edge midpoints
 */
function getEdgeSnapCandidates(
  partA: Part,
  positionA: [number, number, number],
  partB: Part,
  snapDistance: number
): SnapCandidate[];

/**
 * Get snap candidates for face-to-face snapping
 *
 * For each face of part A, check if it should snap to face of part B:
 * - Faces are parallel (normals opposite, dot product ≈ -1)
 * - Distance between face centers < snapDistance
 * - Face projections overlap (parts would touch if moved together)
 * - Calculate snap offset to bring faces into contact
 */
function getFaceSnapCandidates(
  partA: Part,
  positionA: [number, number, number],
  partB: Part,
  snapDistance: number
): SnapCandidate[];

/**
 * Calculate bounding box edges in world space
 * Returns 12 edges as line segments
 */
function getPartEdges(part: Part): Edge[];

/**
 * Calculate bounding box faces in world space
 * Returns 6 faces with center position and normal
 */
function getPartFaces(part: Part): Face[];

/**
 * Score snap candidate based on distance and alignment
 *
 * Score formula:
 * - Distance component: (1 - distance/maxDistance)^curve
 * - Alignment component: |dot(normalA, normalB)|
 * - Final score: distanceScore * alignmentScore
 */
function scoreSnapCandidate(
  candidate: SnapCandidate,
  settings: SnapSettings
): number;
```

#### Supporting Types

```typescript
interface SnapCandidate {
  type: 'edge' | 'face';
  targetPartId: string;
  snapOffset: [number, number, number];  // Vector to add to position
  distance: number;
  alignment: number;  // 0-1, how well aligned
  visualGuide: {
    pointA: [number, number, number];
    pointB: [number, number, number];
  };
}

interface Edge {
  start: [number, number, number];
  end: [number, number, number];
  direction: [number, number, number];
  midpoint: [number, number, number];
}

interface Face {
  center: [number, number, number];
  normal: [number, number, number];
  corners: [number, number, number][];  // 4 corners for overlap test
}
```

---

### 3. Resize Engine (`lib/resize.ts`)

#### Core Algorithm: Constrained Resize with Snap

```typescript
interface ResizeResult {
  newWidth: number;
  newHeight: number;
  newDepth: number;
  newPosition: [number, number, number];  // May shift to maintain reference point
  snapped: boolean;
  snapPoints: SnapPoint[];
  collision: boolean;
  collisionPartIds: string[];
}

/**
 * Calculate resize for a part being resized
 *
 * Algorithm:
 * 1. Determine resize axis from active handle (width/height/depth)
 * 2. Calculate new dimension based on drag offset
 * 3. Apply constraints:
 *    a. Minimum dimension: 10mm (configurable)
 *    b. Maximum dimension: 10000mm (configurable)
 *    c. Snap to nearby parts if snapEnabled
 * 4. Calculate new position (resize from handle, not center)
 * 5. Check for collisions with new dimensions
 * 6. Return result with collision warning (don't block)
 */
function calculateResize(
  part: Part,
  handle: ResizeHandle,
  dragOffset: [number, number, number],
  allParts: Part[],
  snapEnabled: boolean,
  snapSettings: SnapSettings
): ResizeResult;

/**
 * Get resize constraints for a dimension
 *
 * Returns min/max values and snap targets:
 * - Min: MAX(10mm, current dimension - 5000mm)
 * - Max: current dimension + 5000mm
 * - Snap targets: nearby part edges/faces in resize direction
 */
function getResizeConstraints(
  part: Part,
  dimension: 'width' | 'height' | 'depth',
  allParts: Part[],
  snapSettings: SnapSettings
): ResizeConstraints;

/**
 * Apply snap during resize
 *
 * When resizing, check if the face being moved is approaching:
 * - Another part's face (face-to-face snap)
 * - Another part's edge (edge alignment)
 *
 * Return snapped dimension value if within snap threshold
 */
function applyResizeSnap(
  part: Part,
  newDimension: number,
  dimensionAxis: 'width' | 'height' | 'depth',
  allParts: Part[],
  snapSettings: SnapSettings
): { dimension: number; snapped: boolean; snapPoints: SnapPoint[] };

/**
 * Calculate position adjustment for resize
 *
 * When resizing from a handle, part may need to move to keep
 * the opposite face stationary.
 *
 * Example: Resizing width+ (right face):
 * - Right face moves +X
 * - Center shifts +X/2
 * - Left face stays in place
 */
function calculateResizePositionAdjustment(
  part: Part,
  handle: ResizeHandle,
  oldDimension: number,
  newDimension: number
): [number, number, number];
```

#### Supporting Types

```typescript
interface ResizeConstraints {
  min: number;
  max: number;
  snapTargets: {
    value: number;      // Dimension value to snap to
    distance: number;   // Current distance to snap
    partId: string;     // Part providing snap target
  }[];
}
```

---

### 4. React Components

#### 4.1 PartResizeControls (`components/canvas/PartResizeControls.tsx`)

**Purpose:** Render visual resize handles for selected part in resize mode

```typescript
interface PartResizeControlsProps {
  part: Part;
}

/**
 * Resize Controls Component
 *
 * Renders 6 resize handles (one per face):
 * - Width: +X (right), -X (left)
 * - Height: +Y (top), -Y (bottom)
 * - Depth: +Z (front), -Z (back)
 *
 * Handle visualization:
 * - Small box (20mm x 20mm x 5mm) positioned on face center
 * - Color: theme primary when idle, accent when hovered/dragged
 * - Invisible raycaster hitbox (50mm x 50mm) for easier grabbing
 *
 * Interaction:
 * 1. onPointerDown: Capture initial part dimensions + mouse position
 * 2. onPointerMove: Calculate drag offset in world space
 *                   Project onto handle's normal direction
 *                   Call calculateResize() from resize engine
 *                   Update part dimensions + position
 *                   Update active snap points for visual guides
 * 3. onPointerUp: Finalize resize, push to history
 *
 * Features:
 * - Axis-constrained dragging (perpendicular to face)
 * - Real-time dimension display (floating text near handle)
 * - Snap visual feedback (handle changes color when snapped)
 * - Collision warning (handle turns red if collision detected)
 */
function PartResizeControls({ part }: PartResizeControlsProps): JSX.Element;
```

**Key Implementation Details:**
- Use `@react-three/fiber` hooks: `useThree`, `useState`, `useEffect`
- Raycasting for handle interaction (similar to `PartTransformControls`)
- Disable `OrbitControls` while dragging (set `isTransforming: true`)
- Use Three.js `Raycaster` and `Plane` for drag calculations
- Batch history: `beginBatch('RESIZE_PART')` on start, `commitBatch()` on end
- Skip history during drag: `updatePart(..., true)`

#### 4.2 SnapGuidesRenderer (`components/canvas/SnapGuidesRenderer.tsx`)

**Purpose:** Visualize active snap points as alignment lines

```typescript
/**
 * Snap Guides Component
 *
 * Renders visual feedback for snap points:
 * - Lines connecting snap points (dashed, theme accent color)
 * - Small spheres at snap points (5mm radius, accent color)
 * - Opacity based on snap strength (0.3-1.0)
 *
 * Uses activeSnapPoints from store (updated during transform/resize)
 */
function SnapGuidesRenderer(): JSX.Element | null;
```

**Visual Design:**
- Lines: `THREE.LineDashedMaterial` with `dashSize: 10, gapSize: 5`
- Points: `THREE.Mesh` with `SphereGeometry(5, 16, 16)`
- Color: Use theme `accent` color via CSS variable
- Opacity: `Math.max(0.3, snapPoint.strength)`

#### 4.3 SnapControlPanel (`components/layout/SnapControlPanel.tsx`)

**Purpose:** UI controls for snap settings

```typescript
/**
 * Snap Control Panel
 *
 * A collapsible panel with snap options:
 * - Main toggle button (snap on/off) - icon + badge
 * - Expandable settings (click to open):
 *   - Show snap guides (checkbox)
 *   - Magnetic pull (checkbox)
 *   - Snap distance (slider: 5-50mm)
 *   - Enable edge snap (checkbox)
 *   - Enable face snap (checkbox)
 *
 * Position: Top toolbar next to transform mode buttons
 */
function SnapControlPanel(): JSX.Element;
```

**UI/UX:**
- Use `shadcn/ui` components: `Button`, `Popover`, `Switch`, `Slider`
- Polish UI text (per CLAUDE.md)
- Icons: Use `lucide-react` (e.g., `Magnet`, `AlignHorizontalJustifyCenter`)
- Persist settings in Zustand store (auto-saved via persist middleware)

#### 4.4 Updated Scene (`components/canvas/Scene.tsx`)

**Changes:**
1. Add resize mode to toolbar
2. Conditionally render `PartResizeControls` when `transformMode === 'resize'`
3. Always render `SnapGuidesRenderer` (it checks if guides should show)
4. Add keyboard shortcut: `s` for resize mode

```typescript
// In Scene.tsx
const { transformMode, selectedPartId, snapEnabled } = useStore();

return (
  <Canvas>
    {/* ... existing lighting, grid, etc. */}

    {/* Render all parts */}
    {parts.map(part => <Part3D key={part.id} part={part} />)}

    {/* Conditional transform controls */}
    {selectedPartId && transformMode === 'translate' && (
      <PartTransformControls mode="translate" />
    )}
    {selectedPartId && transformMode === 'rotate' && (
      <PartTransformControls mode="rotate" />
    )}
    {selectedPartId && transformMode === 'resize' && (
      <PartResizeControls part={selectedPart} />
    )}

    {/* Snap guides (always render, component decides visibility) */}
    {snapEnabled && <SnapGuidesRenderer />}

    {/* ... existing collision warnings, etc. */}
  </Canvas>
);
```

---

### 5. Updated Transform Controls for Snapping

#### Modify `PartTransformControls.tsx`

Add snap integration to translate mode:

```typescript
// In onDragging callback
const onDrag = useCallback(() => {
  if (!controlsRef.current || !part) return;

  const newPosition = controlsRef.current.object.position.toArray() as [number, number, number];

  // SNAP INTEGRATION
  let finalPosition = newPosition;
  let snapPoints: SnapPoint[] = [];

  if (snapEnabled && snapSettings) {
    const snapResult = calculateSnap(
      part,
      newPosition,
      allParts.filter(p => p.id !== part.id && p.cabinetMetadata?.cabinetId !== part.cabinetMetadata?.cabinetId),
      snapSettings
    );

    if (snapResult.snapped) {
      finalPosition = snapResult.position;
      snapPoints = snapResult.snapPoints;

      // Update control position to snapped value
      controlsRef.current.object.position.set(...finalPosition);
    }
  }

  // Update part position
  updatePart(part.id, { position: finalPosition }, true); // skipHistory during drag

  // Update active snap points for visual guides
  setActiveSnapPoints(snapPoints);
}, [part, snapEnabled, snapSettings, allParts]);
```

#### Modify `CabinetGroupTransform.tsx`

Add snap integration for cabinet group movement:

```typescript
// In onDrag callback for cabinet transform
const onDrag = useCallback(() => {
  if (!groupRef.current || !cabinet) return;

  const newGroupPosition = groupRef.current.position.toArray() as [number, number, number];

  // SNAP INTEGRATION - use cabinet bounding box as single unit
  let finalPosition = newGroupPosition;
  let snapPoints: SnapPoint[] = [];

  if (snapEnabled && snapSettings) {
    // Create temporary "virtual part" representing cabinet bounding box
    const cabinetBounds = calculateCabinetBounds(cabinet, cabinetParts);

    const snapResult = calculateSnap(
      cabinetBounds,
      newGroupPosition,
      allParts.filter(p => p.cabinetMetadata?.cabinetId !== cabinet.id),
      snapSettings
    );

    if (snapResult.snapped) {
      finalPosition = snapResult.position;
      snapPoints = snapResult.snapPoints;
      groupRef.current.position.set(...finalPosition);
    }
  }

  // Apply transform to all parts in cabinet (existing logic)
  // ... existing code

  setActiveSnapPoints(snapPoints);
}, [cabinet, cabinetParts, snapEnabled, snapSettings]);
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Set up core infrastructure without visual features

**Tasks:**
1. **State Management**
   - [ ] Create `createSnapSlice` in `lib/store/slices/snapSlice.ts`
   - [ ] Add `snapEnabled`, `snapSettings`, `activeSnapPoints` state
   - [ ] Integrate slice into main store
   - [ ] Add `resize` mode to `transformMode` type
   - [ ] Add `resizeHandleActive` state to selection slice

2. **Type Definitions**
   - [ ] Add types to `types/index.ts`:
     - `SnapPoint`, `SnapCandidate`, `Edge`, `Face`
     - `ResizeHandle`, `ResizeResult`, `ResizeConstraints`
   - [ ] Update `TransformMode` type: `'translate' | 'rotate' | 'resize'`

3. **Testing Setup**
   - [ ] Create test file `lib/snapping.test.ts`
   - [ ] Create test file `lib/resize.test.ts`
   - [ ] Set up test fixtures (sample parts with known geometry)

**Deliverables:**
- State management fully functional (can toggle snap, change settings)
- Type-safe API for snap and resize engines
- Test infrastructure ready

---

### Phase 2: Snapping Engine (Week 2)
**Goal:** Implement smart snapping algorithm with full test coverage

**Tasks:**
1. **Geometry Utilities**
   - [ ] Implement `getPartEdges(part: Part): Edge[]`
     - Calculate 12 edges from bounding box + rotation
     - Transform to world space using part's transform matrix
   - [ ] Implement `getPartFaces(part: Part): Face[]`
     - Calculate 6 faces from bounding box + rotation
     - Include center, normal, and 4 corners for overlap testing
   - [ ] Write unit tests for edge/face calculations
     - Test with identity rotation
     - Test with 90° rotations on each axis
     - Test with arbitrary rotations

2. **Snap Candidate Detection**
   - [ ] Implement `getEdgeSnapCandidates()`
     - Check edge parallelism (direction dot product)
     - Calculate distance between edge midpoints
     - Generate snap offset vector
   - [ ] Implement `getFaceSnapCandidates()`
     - Check face parallelism (normal dot product)
     - Test face projection overlap (2D polygon intersection)
     - Calculate snap offset to bring faces into contact
   - [ ] Write unit tests for candidate detection
     - Test aligned edges (should snap)
     - Test perpendicular edges (should not snap)
     - Test parallel faces at various distances

3. **Snap Scoring and Selection**
   - [ ] Implement `scoreSnapCandidate()`
     - Distance component with configurable curve
     - Alignment component (angle between normals)
     - Type priority (face vs edge based on distance)
   - [ ] Implement `calculateSnap()`
     - Get all candidates (edges + faces)
     - Filter by distance threshold
     - Score and sort candidates
     - Select highest scoring candidate
     - Generate visual guide data
   - [ ] Write integration tests
     - Test single part snapping to another
     - Test multiple snap candidates (should pick best)
     - Test snap distance threshold
     - Test cabinet exclusion (parts in same cabinet don't snap)

**Deliverables:**
- Fully functional snapping engine
- 90%+ test coverage
- Performance benchmarked (should handle 100+ parts at 60fps)

---

### Phase 3: Resize Engine (Week 3)
**Goal:** Implement visual resize with snap integration

**Tasks:**
1. **Resize Constraints**
   - [ ] Implement `getResizeConstraints()`
     - Define min/max dimension limits
     - Find snap targets in resize direction
   - [ ] Implement `calculateResizePositionAdjustment()`
     - Handle resize from each face (6 handles)
     - Calculate center offset to keep opposite face stationary
   - [ ] Write unit tests
     - Test resize from each handle direction
     - Test position adjustment math

2. **Resize with Snap**
   - [ ] Implement `applyResizeSnap()`
     - Check if resized face approaches another part
     - Calculate snapped dimension value
     - Generate snap visual guides
   - [ ] Implement `calculateResize()`
     - Apply constraints (min/max)
     - Apply snap if enabled
     - Check collision with new dimensions
     - Return complete resize result
   - [ ] Write unit tests
     - Test resize without snap
     - Test resize with snap to nearby part
     - Test resize with collision detection

**Deliverables:**
- Functional resize calculation engine
- Snap-aware resizing working
- Collision detection integrated

---

### Phase 4: Visual Components (Week 4)
**Goal:** Build React Three Fiber UI for resize and snap guides

**Tasks:**
1. **Resize Handle Component**
   - [ ] Create `PartResizeControls.tsx`
   - [ ] Implement 6 handle meshes (one per face)
     - Position on face centers
     - Style with theme colors
     - Add invisible raycaster hitbox (larger than visual)
   - [ ] Implement drag interaction
     - Capture pointer events
     - Calculate drag offset in world space
     - Project onto handle's normal axis
     - Call resize engine
     - Update part in store
   - [ ] Add visual feedback
     - Hover state (scale up 1.2x, change color)
     - Drag state (change color to accent)
     - Snap state (pulse or glow effect)
     - Collision state (red tint)
   - [ ] Add floating dimension display
     - Show current dimension near active handle
     - Update in real-time during drag
     - Format: "Szerokość: 850mm"

2. **Snap Guides Component**
   - [ ] Create `SnapGuidesRenderer.tsx`
   - [ ] Render snap lines
     - Use `THREE.Line` with dashed material
     - Connect snap point pairs
     - Opacity based on strength
   - [ ] Render snap point markers
     - Small spheres at snap positions
     - Theme accent color
   - [ ] Performance optimization
     - Use `useMemo` for geometry
     - Limit max number of guides (e.g., 10 strongest)

3. **Integration with Scene**
   - [ ] Update `Scene.tsx`
     - Add resize mode rendering
     - Add snap guides rendering
     - Add keyboard shortcut (`s` for resize)
   - [ ] Update `PartTransformControls.tsx`
     - Integrate snap calculation in drag callback
     - Update active snap points
   - [ ] Update `CabinetGroupTransform.tsx`
     - Integrate cabinet snap calculation
     - Calculate cabinet bounding box helper

**Deliverables:**
- Fully interactive resize handles
- Visual snap guides rendering
- Integrated with existing transform system

---

### Phase 5: UI Controls (Week 5)
**Goal:** Build user-facing controls for snap configuration

**Tasks:**
1. **Snap Control Panel**
   - [ ] Create `SnapControlPanel.tsx`
   - [ ] Implement main toggle button
     - Magnet icon
     - Badge showing "Wł." / "Wył."
     - Click to toggle snap on/off
   - [ ] Implement expandable settings popover
     - Trigger: click on settings icon next to toggle
     - Content:
       - "Pokaż linie przyciągania" (Switch)
       - "Magnetyczne przyciąganie" (Switch)
       - "Dystans przyciągania" (Slider: 5-50mm)
       - "Przyciąganie krawędzi" (Switch)
       - "Przyciąganie powierzchni" (Switch)
   - [ ] Style with theme colors (no hardcoded colors!)
   - [ ] Add to toolbar in appropriate position

2. **Transform Mode Selector Update**
   - [ ] Add resize mode button to toolbar
   - [ ] Icon: Use `lucide-react` resize icon
   - [ ] Tooltip: "Zmień rozmiar (S)"
   - [ ] Active state styling

3. **Keyboard Shortcuts**
   - [ ] Add to `useKeyboardShortcuts` hook:
     - `s`: Switch to resize mode
     - Existing: `m` (move), `r` (rotate), `c` (cabinet)

**Deliverables:**
- Fully functional snap control UI
- Resize mode integrated into toolbar
- Polish UI text throughout

---

### Phase 6: Testing & Polish (Week 6)
**Goal:** Integration testing, bug fixes, performance optimization

**Tasks:**
1. **Integration Testing**
   - [ ] Test snap with various part rotations
   - [ ] Test snap with cabinet groups
   - [ ] Test resize with snap enabled/disabled
   - [ ] Test resize handles with rotated parts
   - [ ] Test collision warnings during resize
   - [ ] Test history undo/redo for resize operations

2. **Performance Optimization**
   - [ ] Profile snap calculation performance
     - Optimize spatial queries (use spatial hash grid if needed)
     - Cache part geometry (edges/faces) when possible
   - [ ] Profile resize render performance
     - Ensure 60fps with 6 handles + snap guides
   - [ ] Optimize snap guide rendering
     - Limit guide count
     - Use instanced rendering if many guides

3. **Edge Cases & Bug Fixes**
   - [ ] Handle parts with zero dimensions
   - [ ] Handle extremely large snap distances
   - [ ] Handle cabinet with single part
   - [ ] Handle resize below minimum dimension
   - [ ] Handle snap when multiple candidates have equal score

4. **User Experience Polish**
   - [ ] Add haptic feedback (if supported)
   - [ ] Add sound effects (optional, configurable)
   - [ ] Smooth handle hover transitions
   - [ ] Improve snap guide visual design
   - [ ] Add tooltips to snap settings

5. **Documentation**
   - [ ] Update user documentation (if exists)
   - [ ] Add code comments to complex algorithms
   - [ ] Create examples/tutorials for snap usage

**Deliverables:**
- Production-ready feature
- No critical bugs
- 60fps performance with 100+ parts
- Polished UX

---

## Technical Considerations

### Performance

**Snap Calculation Optimization:**
- **Spatial Partitioning:** Use grid-based spatial hash (1000mm cells) to avoid O(n²) part comparisons
- **Early Exit:** Skip detailed calculations if bounding spheres don't overlap
- **Caching:** Cache part edges/faces if part hasn't moved/rotated
- **Throttling:** Limit snap calculations to 60fps (requestAnimationFrame)

**Render Performance:**
- **Instancing:** Use `THREE.InstancedMesh` if rendering many snap guides
- **LOD:** Reduce handle geometry detail when camera is far
- **Culling:** Don't render handles outside camera frustum

### Collision Detection Integration

**During Resize:**
```typescript
// After calculating new dimensions, check collision
const tempPart: Part = {
  ...part,
  width: newWidth,
  height: newHeight,
  depth: newDepth,
  position: newPosition
};

const collisions = detectCollisions([tempPart], allOtherParts);

if (collisions.length > 0) {
  // Allow resize but set collision flag
  return {
    ...resizeResult,
    collision: true,
    collisionPartIds: collisions.map(c => c.partBId)
  };
}
```

**Visual Feedback:**
- Highlight colliding parts in red (already exists)
- Show collision warning badge on resize handle
- Don't block resize (per requirements: "Allow with warning")

### History Integration

**Resize Operations:**
```typescript
// On resize start
beginBatch('RESIZE_PART');

// During drag (skip history to avoid spam)
updatePart(partId, { width, height, depth, position }, true);

// On resize end
commitBatch(); // Saves single history entry for entire resize
```

**Snap Operations:**
- Snap doesn't create separate history entries
- Snap is just a position adjustment during transform/resize
- History records the final snapped position, not the snap itself

### Cabinet Snapping Implementation

**Bounding Box Calculation:**
```typescript
function calculateCabinetBounds(cabinet: Cabinet, parts: Part[]): Part {
  // Calculate min/max in world space
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

  parts.forEach(part => {
    const corners = getPartCorners(part); // 8 corners in world space
    corners.forEach(corner => {
      bounds.min[0] = Math.min(bounds.min[0], corner[0]);
      bounds.min[1] = Math.min(bounds.min[1], corner[1]);
      bounds.min[2] = Math.min(bounds.min[2], corner[2]);
      bounds.max[0] = Math.max(bounds.max[0], corner[0]);
      bounds.max[1] = Math.max(bounds.max[1], corner[1]);
      bounds.max[2] = Math.max(bounds.max[2], corner[2]);
    });
  });

  // Create virtual part representing cabinet bounding box
  const center = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  ];

  return {
    id: `cabinet-${cabinet.id}-bounds`,
    width: bounds.max[0] - bounds.min[0],
    height: bounds.max[1] - bounds.min[1],
    depth: bounds.max[2] - bounds.min[2],
    position: center,
    rotation: [0, 0, 0], // Axis-aligned bounding box
    // ... other fields as needed
  };
}
```

**Rigid Transform:**
- When cabinet snaps, calculate offset: `snapPosition - currentPosition`
- Apply same offset to all parts in cabinet: `part.position + offset`
- Maintain part rotations (don't change)

---

## Testing Strategy

### Unit Tests

**Snapping Engine:**
- Edge detection with various rotations
- Face detection with various rotations
- Snap scoring algorithm
- Candidate filtering
- Edge cases: overlapping parts, coincident faces

**Resize Engine:**
- Dimension constraint enforcement
- Position adjustment calculation
- Snap integration during resize
- Collision detection during resize

### Integration Tests

**Transform + Snap:**
- Move part near another, verify snap triggers
- Rotate part, verify snap still works correctly
- Move cabinet group, verify group snaps as unit

**Resize + Snap:**
- Resize part to approach another, verify snap triggers
- Resize with snap disabled, verify no snap occurs
- Resize below min dimension, verify clamping

### Manual Testing Checklist

- [ ] Snap two rectangular parts edge-to-edge
- [ ] Snap two rectangular parts face-to-face
- [ ] Snap rotated parts (45°, 90°, arbitrary angles)
- [ ] Snap cabinet to individual part
- [ ] Snap cabinet to another cabinet
- [ ] Resize part with snap enabled
- [ ] Resize part with snap disabled
- [ ] Resize part to cause collision (verify warning)
- [ ] Undo/redo resize operations
- [ ] Toggle snap settings and verify changes
- [ ] Test with 100+ parts (performance)

---

## Potential Challenges & Mitigations

### Challenge 1: Snap Ambiguity
**Problem:** Multiple equally-scored snap candidates
**Mitigation:**
- Prioritize by type: face-to-face > edge-to-edge when very close (<5mm)
- Add hysteresis: once snapped, require 2x distance to unsnap
- Show all viable snap guides (let user see options)

### Challenge 2: Resize with Rotation
**Problem:** Handle positioning on rotated parts is complex
**Mitigation:**
- Calculate handle positions in local space, transform to world
- Use Three.js transformation matrices (built-in)
- Test thoroughly with rotated parts

### Challenge 3: Performance with Many Parts
**Problem:** O(n²) snap calculations can lag
**Mitigation:**
- Spatial hash grid (already used in collision detection)
- Only check parts within 500mm bounding sphere
- Throttle snap calculations (max 60fps)
- Cache part geometry when static

### Challenge 4: Cabinet Bounds Calculation
**Problem:** Rotated parts make AABB inaccurate
**Mitigation:**
- Use Oriented Bounding Box (OBB) instead of AABB
- Or: calculate exact convex hull (more expensive)
- Or: accept AABB is approximate (simpler, may over-snap)
- Recommendation: Start with OBB (good tradeoff)

### Challenge 5: Snap Visual Clutter
**Problem:** Too many snap guides confuse user
**Mitigation:**
- Show max 5 strongest snap guides
- Fade out weaker guides (opacity proportional to strength)
- Only show guides for currently dragged object
- Hide guides when not transforming

---

## File Structure

```
apps/app/src/
├── lib/
│   ├── snapping.ts                 # NEW: Snap engine
│   ├── resize.ts                   # NEW: Resize engine
│   ├── snapping.test.ts            # NEW: Snap tests
│   ├── resize.test.ts              # NEW: Resize tests
│   └── store/
│       └── slices/
│           └── snapSlice.ts        # NEW: Snap state slice
│
├── components/
│   ├── canvas/
│   │   ├── PartResizeControls.tsx  # NEW: Resize handles
│   │   ├── SnapGuidesRenderer.tsx  # NEW: Snap visual guides
│   │   ├── PartTransformControls.tsx  # UPDATED: Add snap
│   │   ├── CabinetGroupTransform.tsx  # UPDATED: Add snap
│   │   └── Scene.tsx               # UPDATED: Add resize mode
│   │
│   └── layout/
│       └── SnapControlPanel.tsx    # NEW: Snap UI controls
│
└── types/
    └── index.ts                    # UPDATED: Add snap/resize types
```

---

## Success Metrics

**Functionality:**
- ✅ Parts snap edge-to-edge within 10mm
- ✅ Parts snap face-to-face within 10mm
- ✅ Cabinets snap as rigid units
- ✅ Resize handles work on all 6 faces
- ✅ Resize respects min/max constraints
- ✅ Resize shows collision warnings
- ✅ Snap can be toggled on/off via UI
- ✅ Snap settings are persisted

**Performance:**
- ✅ 60fps with 100 parts and snap enabled
- ✅ Snap calculation < 16ms per frame
- ✅ Resize handle interaction < 16ms per frame
- ✅ No frame drops during continuous drag

**UX:**
- ✅ Snap feels "magnetic" and intuitive
- ✅ Resize handles are easy to grab
- ✅ Visual feedback is clear and not cluttered
- ✅ All UI text is in Polish
- ✅ No hardcoded colors (uses theme)

**Code Quality:**
- ✅ 80%+ test coverage
- ✅ TypeScript strict mode (no `any`)
- ✅ All code/comments in English
- ✅ Follows CLAUDE.md guidelines

---

## Future Enhancements (Post-MVP)

1. **Advanced Snap Modes:**
   - Center-to-center snapping
   - Grid snapping (snap to 10mm, 50mm, 100mm grid)
   - Angle snapping for rotation (15°, 45°, 90° increments)

2. **Resize Improvements:**
   - Proportional resize (hold Shift to maintain aspect ratio)
   - Resize multiple parts simultaneously
   - Resize entire cabinet (scale all parts)
   - Thickness override (decouple from material)

3. **Smart Assembly:**
   - Auto-suggest next part placement
   - Template-based assembly (e.g., "standard kitchen cabinet")
   - Snap to predefined connection points (hinges, handles)

4. **Performance:**
   - Web Worker for snap calculations (offload from main thread)
   - WASM for geometry calculations (10-100x faster)

5. **Accessibility:**
   - Keyboard-only resize (arrow keys to adjust dimensions)
   - Screen reader support for snap feedback
   - High contrast mode for snap guides

---

## Appendix: Math Formulas

### Edge-to-Edge Snap Distance

Given two edges A and B (represented as line segments):

```
Edge A: a1 -> a2 (endpoints)
Edge B: b1 -> b2 (endpoints)

Direction vectors:
dirA = normalize(a2 - a1)
dirB = normalize(b2 - b1)

Parallelism check:
parallel = |dot(dirA, dirB)| > 0.95  # ~18° tolerance

If parallel:
  midA = (a1 + a2) / 2
  midB = (b1 + b2) / 2
  distance = ||midB - midA||

  If distance < snapDistance:
    snapOffset = midB - midA
```

### Face-to-Face Snap Distance

Given two faces A and B (represented by center + normal):

```
Face A: centerA, normalA
Face B: centerB, normalB

Opposite normals check:
opposite = dot(normalA, normalB) < -0.95  # Facing each other

If opposite:
  distance = ||centerB - centerA||

  If distance < snapDistance:
    # Check if face projections overlap (2D polygon intersection)
    overlap = projectAndCheckOverlap(faceA.corners, faceB.corners, normalA)

    If overlap:
      snapOffset = (distance - 0) * normalA  # Bring faces into contact
```

### Resize Position Adjustment

When resizing from a handle, maintain opposite face position:

```
Example: Resize width from right face (width+ handle)

oldWidth = part.width
newWidth = calculatedNewWidth
delta = newWidth - oldWidth

# Right face moves +X, center shifts +X/2, left face stays
positionAdjustment = [delta / 2, 0, 0]

newPosition = part.position + positionAdjustment

# Apply rotation to adjustment vector if part is rotated
rotationMatrix = eulerToMatrix(part.rotation)
adjustmentWorld = rotationMatrix * positionAdjustment
newPosition = part.position + adjustmentWorld
```

---

## Questions for Clarification (Answered)

1. ✅ **Snap mode:** Smart adaptive
2. ✅ **Snap distance:** 10mm (precise)
3. ✅ **Resize constraints:** Free with handles, snap-aware
4. ✅ **Resize target:** Individual parts only
5. ✅ **Collision behavior:** Allow with warning
6. ✅ **Resize dimensions:** Width, Height, Depth (not thickness)
7. ✅ **Snap UI:** Button with settings popover (not keyboard toggle)
8. ✅ **Cabinet snap:** Rigid (maintain internal structure)
9. ✅ **Visual feedback:** Guides + magnetic pull + distance-based strength

---

**End of Implementation Plan**
