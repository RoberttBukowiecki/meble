# Plan: Wall and Corner Snapping for Parts and Cabinets

## Overview

Implement snapping of parts and cabinets to room walls and interior corners (two walls simultaneously).

## Key Concepts

### Wall Geometry

- Walls are defined as 2D line segments `start: [x, z]` → `end: [x, z]` with `thicknessMm`
- 3D wall mesh is centered on line segment (offset by `-thickness/2`)
- **Inner surface** = wall line offset by `+thickness/2` toward room interior
- Normal pointing inward determines snap direction

### Corner Detection

- Interior corner = intersection point of two adjacent wall inner surfaces
- Object snaps flush against both walls at corner point

---

## Implementation Steps

### Step 1: Types (`apps/app/src/types/wall-snap.ts`) - NEW FILE

```typescript
export interface WallInnerSurface {
  wallId: string;
  roomId: string;
  start: [number, number]; // Inner surface [x, z]
  end: [number, number];
  normal: [number, number]; // Normalized, pointing into room
  heightMm: number;
  length: number;
}

export interface WallCorner {
  id: string;
  roomId: string;
  point: [number, number]; // Inner corner [x, z]
  wall1Id: string;
  wall2Id: string;
  wall1Normal: [number, number];
  wall2Normal: [number, number];
  heightMm: number;
}

export interface WallSnapCandidate {
  type: "wall" | "corner";
  wallId?: string;
  cornerId?: string;
  snapOffset: [number, number, number];
  distance: number;
  visualGuide: {
    start: [number, number, number];
    end: [number, number, number];
  };
}
```

### Step 2: Geometry Calculator (`apps/app/src/lib/wall-snap-geometry.ts`) - NEW FILE

Core functions:

1. `calculateRoomCentroid(walls)` - find room center for normal direction
2. `determineInwardNormal(wallStart, wallEnd, centroid)` - perpendicular pointing inside
3. `calculateWallInnerSurfaces(walls, room)` - offset wall lines by thickness/2
4. `calculateWallCorners(surfaces, walls)` - find line intersections of adjacent walls

Key algorithm for inward normal:

```typescript
// Perpendicular vectors
const dx = end[0] - start[0];
const dz = end[1] - start[1];
const len = Math.sqrt(dx * dx + dz * dz);
const normal1 = [-dz / len, dx / len]; // 90° CCW
const normal2 = [dz / len, -dx / len]; // 90° CW

// Pick one pointing toward centroid
const midToCenter = [centroid[0] - midX, centroid[1] - midZ];
return dot(normal1, midToCenter) > 0 ? normal1 : normal2;
```

### Step 3: Wall Snap Calculator (`apps/app/src/lib/wall-snapping.ts`) - NEW FILE

Main function: `calculateWallSnap(objectBounds, position, surfaces, corners, dragAxis, settings)`

Logic:

1. **Wall snap**: For each surface, if drag axis aligns with wall normal:
   - Project object center onto wall line
   - Calculate distance from object edge to wall
   - If within threshold, compute offset to align edge with wall

2. **Corner snap**: For each corner:
   - Check distance to both walls
   - If near both (within 1.5× threshold), snap to corner point
   - Compute combined offset for both walls

### Step 4: Extend SnapSettings (`apps/app/src/types/transform.ts`)

Add to `SnapSettings` interface:

```typescript
wallSnap: boolean; // Enable wall snapping
cornerSnap: boolean; // Enable corner snapping
```

### Step 5: Extend Snap Context (`apps/app/src/lib/snap-context.tsx`)

Add wall geometry cache to avoid recalculation during drag:

```typescript
interface WallSnapCache {
  roomId: string | null;
  surfaces: WallInnerSurface[];
  corners: WallCorner[];
}
wallSnapCacheRef: MutableRefObject<WallSnapCache>;
updateWallSnapCache: (roomId, walls, room) => void;
```

### Step 6: Update Snap Slice (`apps/app/src/lib/store/slices/snapSlice.ts`)

- Add `wallSnap: true` and `cornerSnap: true` to defaults
- Update `SnapSettings` type

### Step 7: Integrate into PartTransformControls (`apps/app/src/components/canvas/PartTransformControls.tsx`)

In `handleChange()` after existing V3 snap:

```typescript
if (snapEnabled && snapSettings.wallSnap) {
  const wallResult = calculateWallSnap(
    bounds,
    position,
    cache.surfaces,
    cache.corners,
    axis,
    settings
  );
  if (wallResult.snapped) {
    position[axisIndex] += wallResult.snapOffset[axisIndex];
    // Add wall snap points to visualization
  }
}
```

### Step 8: Integrate into CabinetGroupTransform (`apps/app/src/components/canvas/CabinetGroupTransform.tsx`)

Similar integration - apply wall snap to cabinet pivot point during drag.

### Step 9: Cache Update Hook (`apps/app/src/components/canvas/WallSnapCacheUpdater.tsx`) - NEW FILE

React hook/component that:

- Watches `activeRoomId` and `walls` in store
- Recalculates `surfaces` and `corners` when room/walls change
- Updates `wallSnapCacheRef` in context

### Step 10: Visual Guides (modify `apps/app/src/components/canvas/SnapGuidesRenderer.tsx`)

Add rendering for wall snap guides:

- Vertical line at snap point (floor to wall height)
- Different color for wall (blue) vs corner (green)

---

## Files to Create

1. `apps/app/src/types/wall-snap.ts`
2. `apps/app/src/lib/wall-snap-geometry.ts`
3. `apps/app/src/lib/wall-snapping.ts`
4. `apps/app/src/components/canvas/WallSnapCacheUpdater.tsx`

## Files to Modify

1. `apps/app/src/types/transform.ts` - add wallSnap, cornerSnap to SnapSettings
2. `apps/app/src/lib/store/slices/snapSlice.ts` - update defaults
3. `apps/app/src/lib/snap-context.tsx` - add wall cache refs
4. `apps/app/src/components/canvas/PartTransformControls.tsx` - integrate wall snap
5. `apps/app/src/components/canvas/CabinetGroupTransform.tsx` - integrate wall snap
6. `apps/app/src/components/canvas/SnapGuidesRenderer.tsx` - wall snap visualization
7. `apps/app/src/types/index.ts` - export new types

---

## Performance Considerations

- Wall geometry calculated once per room change (cached in ref)
- Snap calculations use simple 2D math (fast)
- Only check walls relevant to drag axis
- Early exit if object clearly outside wall bounds

---

## Edge Cases to Handle

1. **Angled walls** - walls not axis-aligned (snap works with any angle via normal projection)
2. **L-shaped rooms** - multiple corners, concave polygons
3. **Rotated cabinets** - use OBB bounds instead of AABB for accuracy
4. **Openings (doors/windows)** - optionally skip snap near openings
5. **Multiple rooms** - only snap to active room walls
