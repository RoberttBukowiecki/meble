# Plan: Multi-Axis Snapping (Planar Drag)

## Overview

Extend snapping-v3 to support snapping on multiple axes simultaneously when the user performs a planar drag (e.g., dragging on XZ plane).

## Current State Analysis

### Existing Architecture

1. **PartTransformControls.tsx** (lines 171-178):
   - `getDragAxis()` returns only single axis: `"X" | "Y" | "Z" | null`
   - TransformControls from three.js supports planar drag (XY, XZ, YZ planes)
   - Currently ignores planar gizmo state

2. **snapping-v3.ts**:
   - `calculatePartSnapV3()` - single axis snap (main entry point)
   - `calculatePartSnapV3CrossAxis()` - EXISTS but handles all axes in sequence, not truly planar
   - Cross-axis uses overlap-based target filtering

3. **Types** (`types/transform.ts`):
   - `SnapAxisConstraint` already defines: `"X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ" | null`

### Key Problem

TransformControls.axis can return:

- Single axis: `"X"`, `"Y"`, `"Z"`
- Planar: `"XY"`, `"XZ"`, `"YZ"`, `"XYZ"` (for plane handles)

Currently `getDragAxis()` only handles single-axis cases.

## Implementation Plan

### Phase 1: Type Updates

**File: `types/transform.ts`**

1. Add new types for multi-axis snap:

```typescript
export type DragAxes = "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ";

export interface MultiAxisSnapResult {
  snapped: boolean;
  position: [number, number, number];
  snapPoints: SnapPoint[];
  snappedAxes: DragAxes[];
  /** Per-axis snap info for debugging */
  axisResults: Map<
    "X" | "Y" | "Z",
    {
      snapped: boolean;
      offset: number;
      snapType?: "connection" | "alignment" | "tjoint";
    }
  >;
}
```

### Phase 2: Snap Algorithm Extension

**File: `snapping-v3.ts`**

1. **New function: `calculateMultiAxisSnap()`**

```typescript
export function calculateMultiAxisSnap(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  activeAxes: DragAxes // "XY" | "XZ" | "YZ" | "XYZ"
): MultiAxisSnapResult;
```

2. **Algorithm steps:**
   - Parse `activeAxes` to individual axes (e.g., "XZ" → ["X", "Z"])
   - For each active axis:
     - Calculate snap candidates using existing logic
     - Store best candidate per axis
   - Apply all snaps simultaneously to position
   - Combine snap points from all axes
   - Return unified result

3. **Key considerations:**
   - Each axis is independent (no priority)
   - Collision detection must check final combined position
   - All axes use same snap distance threshold
   - Hysteresis per-axis to prevent jitter

### Phase 3: TransformControls Integration

**File: `PartTransformControls.tsx`**

1. **Update `getDragAxis()` → `getDragAxes()`**

```typescript
const getDragAxes = useCallback((): DragAxes | null => {
  const controls = controlsRef.current;
  if (!controls) return null;
  const axis = (controls as any).axis;

  // Handle all axis types
  if (["X", "Y", "Z", "XY", "XZ", "YZ", "XYZ"].includes(axis)) {
    return axis as DragAxes;
  }
  return null;
}, []);
```

2. **Update `handleChange()` callback:**

```typescript
// In handleChange:
const dragAxes = getDragAxes();

if (dragAxes) {
  const isSingleAxis = dragAxes.length === 1;

  if (isSingleAxis) {
    // Existing single-axis snap logic
    snapResult = calculatePartSnapV3(part, position, parts, cabinets, settings, dragAxes);
  } else {
    // New multi-axis snap logic
    snapResult = calculateMultiAxisSnap(part, position, parts, cabinets, settings, dragAxes);
  }

  // Apply snap position for all affected axes
  if (snapResult.snapped) {
    applySnapPosition(position, snapResult, dragAxes);
    target.position.set(...position);
    setSnapPoints(snapResult.snapPoints);
  }
}
```

3. **Helper function for position application:**

```typescript
function applySnapPosition(
  position: [number, number, number],
  result: SnapResult | MultiAxisSnapResult,
  axes: DragAxes
): void {
  // Apply snapped position only on active axes
  const axisIndices = {
    X: 0,
    Y: 1,
    Z: 2,
  };

  for (const char of axes) {
    if (char in axisIndices) {
      const idx = axisIndices[char as "X" | "Y" | "Z"];
      position[idx] = result.position[idx];
    }
  }
}
```

### Phase 4: Visual Feedback Enhancement

**File: `SnapGuidesRenderer.tsx`**

1. Support multiple simultaneous snap guides
2. Different colors for different axes (if enabled)
3. Show all active snap points at once

### Phase 5: Dimension Display Update

**File: `PartTransformControls.tsx` (dimension section)**

1. Pass multiple axes to `calculateDimensions()`
2. Show dimension lines for all active axes

## Data Flow

```
User drags on XZ plane
         ↓
TransformControls.axis = "XZ"
         ↓
getDragAxes() returns "XZ"
         ↓
calculateMultiAxisSnap(part, pos, ..., "XZ")
         ↓
    ┌────────┴────────┐
    ↓                 ↓
Calculate X snap  Calculate Z snap
    ↓                 ↓
    └────────┬────────┘
             ↓
   Combine results:
   - X: snap to target A (offset: 5mm)
   - Z: snap to target B (offset: 3mm)
             ↓
   Apply combined position
             ↓
   Return MultiAxisSnapResult
```

## Edge Cases

1. **Conflicting snaps**: If X snap would cause collision after Z snap is applied
   - Solution: Check combined position for collisions, reject if invalid

2. **Partial snap**: Only one axis finds valid snap
   - Solution: Apply snap only to axes that found targets

3. **Hysteresis with multiple axes**: Previous snap state per-axis
   - Solution: Store previousSnap as `Map<axis, snapInfo>`

4. **Rotated objects on planar drag**:
   - Use existing `localAxisToWorldAxis()` for each component of planar drag
   - E.g., "XZ" in local space → determine world axes mapping

## Testing Strategy

1. **Unit tests** (`snapping-v3.test.ts`):
   - Test XY plane snap
   - Test XZ plane snap
   - Test YZ plane snap
   - Test XYZ (all axes) snap
   - Test partial snap (only one axis finds target)
   - Test conflict resolution

2. **Integration tests**:
   - Verify TransformControls axis detection
   - Verify snap guides render for multiple axes

## Implementation Order

### Phase 1: Types & Interfaces

1. [ ] Add `DragAxes` type to `types/transform.ts`
2. [ ] Add `MultiAxisSnapResult` interface to `types/transform.ts`
3. [ ] Update `WallSnapResult.axis` in `types/wall-snap.ts` to support "XZ"
4. [ ] Add `snappedAxes` field to `WallSnapResult`

### Phase 2: Core Algorithms

5. [ ] Implement `calculateMultiAxisSnap()` in `snapping-v3.ts`
6. [ ] Add unit tests for `calculateMultiAxisSnap()`
7. [ ] Implement `calculateMultiAxisWallSnap()` in `wall-snapping.ts`
8. [ ] Add unit tests for `calculateMultiAxisWallSnap()`

### Phase 3: TransformControls Integration

9. [ ] Update `getDragAxis()` → `getDragAxes()` in `PartTransformControls.tsx`
10. [ ] Implement combined part + wall snap logic in `handleChange()`
11. [ ] Add corner snap priority check
12. [ ] Ensure proper snap offset application on multiple axes

### Phase 4: Visualization

13. [ ] Update `SnapGuidesRenderer.tsx` for multiple simultaneous guides
14. [ ] Add corner snap visualization (L-shaped guide or two lines)
15. [ ] Update dimension display for multi-axis

### Phase 5: Testing & Polish

16. [ ] Manual testing: XZ plane drag with part snap
17. [ ] Manual testing: XZ plane drag with wall snap
18. [ ] Manual testing: Corner snap (szafka do narożnika!)
19. [ ] Performance testing (ensure no frame drops)
20. [ ] Edge case testing (rotated parts, complex room shapes)

## Settings Extension (Optional)

Add to `SnapSettings`:

```typescript
interface SnapSettings {
  // ... existing settings

  /** Enable multi-axis snap for planar drag */
  multiAxisSnap: boolean;

  /** Snap distance multiplier for secondary axes (default: 1.0) */
  secondaryAxisMultiplier: number;
}
```

## Files to Modify

| File                        | Changes                                            |
| --------------------------- | -------------------------------------------------- |
| `types/transform.ts`        | Add `DragAxes`, `MultiAxisSnapResult` types        |
| `types/wall-snap.ts`        | Update `WallSnapResult.axis` to support multi-axis |
| `snapping-v3.ts`            | Add `calculateMultiAxisSnap()` function            |
| `snapping-v3.test.ts`       | Add multi-axis snap tests                          |
| `wall-snapping.ts`          | Add `calculateMultiAxisWallSnap()` function        |
| `PartTransformControls.tsx` | Update drag detection and snap application         |
| `SnapGuidesRenderer.tsx`    | Support multiple simultaneous guides               |

---

## Wall Snapping Integration (Corner Snap)

### Current State Analysis

**Good news:** `checkCornerSnap()` already calculates offset on BOTH axes:

```typescript
// wall-snapping.ts:247-251
const snapOffset: [number, number, number] = [
  targetCenterX - bounds.center[0], // X offset
  0,
  targetCenterZ - bounds.center[2], // Z offset
];
```

**Problem:** `PartTransformControls.tsx` applies only ONE axis component:

```typescript
// Line 254 - ONLY applies single axis!
position[axisIndex] += wallSnapResult.snapOffset[axisIndex];
```

### Required Changes

#### Phase W1: Update `WallSnapResult` type

**File: `types/wall-snap.ts`**

```typescript
export interface WallSnapResult {
  snapped: boolean;
  snapOffset: [number, number, number];

  // CHANGE: Support multi-axis
  axis?: "X" | "Z" | "XZ";  // Was: "X" | "Z"
  snappedAxes?: Array<"X" | "Z">;  // NEW

  snappedToWall?: string;
  snappedToCorner?: string;
  visualGuides: Array<{...}>;
}
```

#### Phase W2: Add `calculateMultiAxisWallSnap()`

**File: `wall-snapping.ts`**

```typescript
/**
 * Calculate wall snap for multi-axis drag (planar drag on XZ plane).
 * Prioritizes corner snaps which provide alignment to both walls.
 */
export function calculateMultiAxisWallSnap(
  bounds: WallSnapBounds,
  surfaces: WallInnerSurface[],
  corners: WallCorner[],
  activeAxes: "XZ", // Only XZ is valid for walls
  settings: SnapSettings
): WallSnapResult {
  // 1. Try corner snap first (provides both X and Z)
  if (settings.cornerSnap !== false) {
    for (const corner of corners) {
      const candidate = checkCornerSnap(bounds, corner, settings);
      if (candidate) {
        return {
          snapped: true,
          snapOffset: candidate.snapOffset,
          axis: "XZ",
          snappedAxes: ["X", "Z"],
          snappedToCorner: candidate.cornerId,
          visualGuides: [
            /* corner guide */
          ],
        };
      }
    }
  }

  // 2. Try individual wall snaps on each axis
  const xResult = calculateWallSnap(bounds, surfaces, corners, "X", settings);
  const zResult = calculateWallSnap(bounds, surfaces, corners, "Z", settings);

  // Combine results
  const combinedOffset: [number, number, number] = [
    xResult.snapped ? xResult.snapOffset[0] : 0,
    0,
    zResult.snapped ? zResult.snapOffset[2] : 0,
  ];

  const snappedAxes: Array<"X" | "Z"> = [];
  if (xResult.snapped) snappedAxes.push("X");
  if (zResult.snapped) snappedAxes.push("Z");

  return {
    snapped: snappedAxes.length > 0,
    snapOffset: combinedOffset,
    axis: snappedAxes.length === 2 ? "XZ" : snappedAxes[0],
    snappedAxes,
    snappedToWall: xResult.snappedToWall || zResult.snappedToWall,
    visualGuides: [...xResult.visualGuides, ...zResult.visualGuides],
  };
}
```

#### Phase W3: Update `PartTransformControls` integration

**File: `PartTransformControls.tsx`**

```typescript
// In handleChange(), for multi-axis drag:
if (isPlanarDrag && dragAxes === "XZ") {
  const wallSnapResult = calculateMultiAxisWallSnap(
    wallBounds,
    wallCache.surfaces,
    wallCache.corners,
    "XZ",
    snapSettings
  );

  if (wallSnapResult.snapped) {
    // Apply BOTH axes from corner/wall snap
    if (wallSnapResult.snappedAxes?.includes("X")) {
      position[0] += wallSnapResult.snapOffset[0];
    }
    if (wallSnapResult.snappedAxes?.includes("Z")) {
      position[2] += wallSnapResult.snapOffset[2];
    }
    target.position.set(...position);
  }
}
```

### Corner Snap Priority Flow

```
Planar drag on XZ plane
         ↓
calculateMultiAxisWallSnap()
         ↓
    ┌────────────────────────┐
    │ Try corner snap first  │
    │ (gives X + Z together) │
    └────────────────────────┘
         ↓
    Found corner within range?
         │
    ┌────┴────┐
   YES       NO
    │         │
    ↓         ↓
Return     Try separate wall snaps
corner     on X and Z independently
snap          │
              ↓
         Combine results
```

### Test Cases for Wall + Corner Snap

```typescript
describe("Multi-axis wall snap", () => {
  it("snaps to room corner on XZ planar drag", () => {
    // Cabinet at position near corner
    // Drag on XZ plane toward corner
    // Should snap to both walls simultaneously
  });

  it("snaps to single wall when corner not in range", () => {
    // Cabinet near one wall only
    // Should snap to that wall on relevant axis
  });

  it("combines wall snap X + wall snap Z when no corner", () => {
    // Cabinet in middle of room
    // Near wall on X side, near different wall on Z side
    // Should snap to both walls independently
  });
});
```

---

## Combined Part + Wall Snap Flow

When doing planar drag (XZ), the system needs to check both:

1. **Part-to-part snap** (V3 algorithm)
2. **Wall snap** (corner and surface)

### Priority Logic

```
Planar drag XZ
         ↓
    ┌─────────────────────────────────┐
    │ 1. Check CORNER snap first      │
    │    (highest priority - locks    │
    │    both X and Z at once)        │
    └─────────────────────────────────┘
         ↓
    Corner found?
         │
    ┌────┴────┐
   YES       NO
    │         │
    ↓         ↓
  DONE    ┌─────────────────────┐
          │ 2. For each axis:   │
          │   - Try part snap   │
          │   - Try wall snap   │
          │   - Pick closest    │
          └─────────────────────┘
                   ↓
              Combine results
```

### Implementation in `PartTransformControls`

```typescript
// handleChange() for planar drag
if (dragAxes.length > 1) {
  // e.g., "XZ"
  const axes = parseAxes(dragAxes); // ["X", "Z"]

  // Step 1: Check corner snap (takes both axes at once)
  if (hasRoom && snapSettings.cornerSnap) {
    const cornerResult = calculateCornerSnap(bounds, corners, settings);
    if (cornerResult.snapped) {
      applySnap(position, cornerResult.snapOffset, ["X", "Z"]);
      setSnapPoints([cornerSnapPoint]);
      return; // Corner snap is complete - done!
    }
  }

  // Step 2: Per-axis snap (part or wall, whichever is closer)
  for (const axis of axes) {
    const partSnap = calculatePartSnapV3(part, position, parts, cabinets, settings, axis);
    const wallSnap = calculateWallSnap(bounds, surfaces, corners, axis, settings);

    // Pick the closer snap
    const partDist = partSnap.snapped ? getSnapDistance(partSnap) : Infinity;
    const wallDist = wallSnap.snapped ? getSnapDistance(wallSnap) : Infinity;

    if (partDist < wallDist && partSnap.snapped) {
      applySnapOnAxis(position, partSnap, axis);
      addSnapPoints(partSnap.snapPoints);
    } else if (wallSnap.snapped) {
      applySnapOnAxis(position, wallSnap, axis);
      addWallGuide(wallSnap.visualGuides);
    }
  }
}
```

### Snap Priority Rules

| Priority    | Snap Type       | Axes Affected | When Applied             |
| ----------- | --------------- | ------------- | ------------------------ |
| 1 (highest) | Corner          | X + Z         | Always first for XZ drag |
| 2           | Part connection | Single        | Closest on that axis     |
| 3           | Wall surface    | Single        | If no closer part snap   |
| 4           | Part alignment  | Single        | If no connection/wall    |

---

## Risk Assessment

| Risk                      | Impact | Mitigation                                              |
| ------------------------- | ------ | ------------------------------------------------------- |
| Performance regression    | Medium | Use existing candidate generation, add early exit       |
| Breaking single-axis snap | High   | Keep separate code paths, add feature flag              |
| Collision edge cases      | Medium | Add comprehensive collision check for combined position |
| UX confusion              | Low    | Consistent snap behavior, clear visual feedback         |

## Success Criteria

- [ ] XZ plane drag snaps correctly to both X and Z targets
- [ ] No regression in single-axis snap behavior
- [ ] Snap guides show all active snap points
- [ ] No frame drops during planar drag with snap
- [ ] Works correctly with rotated objects
