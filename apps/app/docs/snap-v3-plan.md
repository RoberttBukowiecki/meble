# Plan: Snap V3 Implementation - Face-to-Face Furniture Assembly

> **UWAGA:** Aplikacja nie jest jeszcze produkcyjna. Nie ma potrzeby utrzymywania kompatybilności wstecznej z V2. Możemy śmiało usunąć stary kod po implementacji V3.

## Executive Summary

Implement a new Snap V3 system from scratch using TDD that provides intuitive, predictable face-to-face snapping for furniture assembly. The current V2 implementation has fundamental issues with collision detection, user intent, and face type bias.

**Key Decisions (from user):**
- **Replace V2** entirely (but maintain good cabinet-to-cabinet behavior from V2)
- **Both snap types**: Connection (opposite faces) + Alignment (parallel faces)
- **Cabinets**: Align only cabinet bounding boxes, NOT individual parts within cabinet
- **Center alignment**: Optional with modifier key (Shift)

## Problem Analysis

### Current V2 Issues Identified:

1. **Alignment snaps cause collision/overlap** - Collision detection is incomplete
2. **Ignores user movement direction** - Uses `Math.abs()` losing sign information
3. **Face size bias** - Scoring favors closer faces regardless of appropriateness
4. **T-joint deprioritized** - 0.7 score factor makes large↔small face snaps rare
5. **No stability** - Snap can jump between faces unpredictably
6. **V2 works well for cabinets** - Must preserve this behavior in V3

### User Requirements Summary:

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Face-to-face connection (opposite normals, touching, coplanar) | Critical |
| 2 | Support Large↔Large, Large↔Small, Small↔Small | Critical |
| 3 | Rotation independence | Critical |
| 4 | Respect user movement direction | Critical |
| 5 | Position-only change by default | Critical |
| 6 | No penetration/collision | Critical |
| 7 | Stable snap (no jumping) | High |
| 8 | Visual feedback | Medium |
| 9 | Smooth performance | Medium |
| 10 | Cabinet-to-cabinet works like V2 (good) | Critical |
| 11 | Alignment snap for parallel faces | High |
| 12 | Optional center alignment (Shift key) | Medium |

## Architecture Design

### Core Principles

1. **User Intent First**: Snap selection based on movement direction, not just distance
2. **All Faces Equal**: No bias toward large or small faces
3. **Collision Prevention**: Reject any snap causing penetration
4. **Stability**: Hysteresis to prevent snap jumping

### New Data Structures

```typescript
// Face representation for V3
interface SnapFace {
  id: string;              // Unique face ID: "{partId}-{axis}-{sign}"
  partId: string;
  center: Vec3;            // World position
  normal: Vec3;            // Outward normal (rotated)
  halfSize: [number, number]; // Face dimensions
  corners: Vec3[];         // 4 corners
  area: number;            // For debugging, not scoring
}

// Snap candidate for V3
interface SnapV3Candidate {
  sourceFace: SnapFace;    // Face on moving part
  targetFace: SnapFace;    // Face on target part
  snapOffset: Vec3;        // Vector to move source part
  distance: number;        // Gap between faces
  isValidConnection: boolean; // Normals opposite, no collision
}

// Final snap result
interface SnapV3Result {
  snapped: boolean;
  offset: number;          // Single axis offset
  axis: 'X' | 'Y' | 'Z';
  sourceFaceId: string;
  targetFaceId: string;
  previewPosition: Vec3;   // For visualization
}
```

### Algorithm Flow

```
1. INPUT
   - Moving part (with current position + drag offset)
   - Target parts
   - Drag axis (X, Y, or Z)
   - Movement direction (+1 or -1 on drag axis)
   - Snap distance threshold

2. FACE EXTRACTION
   - Get 6 faces from moving part OBB
   - Get 6 faces from each target part OBB

3. CANDIDATE GENERATION (for each target part)
   For each (sourceFace, targetFace) pair:
     a. Check normals are opposite (dot < -0.95)
     b. Check faces are roughly aligned on drag axis
     c. Calculate snap offset (touch faces with 1mm gap)
     d. Check offset direction matches movement direction
     e. Check snap wouldn't cause collision
     → Add valid candidates

4. CANDIDATE SELECTION
   - Filter: only candidates on drag axis
   - Filter: only candidates in movement direction
   - Filter: only candidates within snap distance
   - Sort by distance (closest first)
   - Return best candidate

5. OUTPUT
   - Snap offset on drag axis
   - Face IDs for visualization
```

### Key Differences from V2

| Aspect | V2 (Current) | V3 (Proposed) |
|--------|--------------|---------------|
| Snap types | Connection, Alignment, T-joint | Connection + Alignment (no T-joint) |
| Direction check | None (uses Math.abs) | Required match with drag direction |
| Collision check | Only for alignment | For ALL candidates |
| Scoring | Distance × alignment × penalties | Distance only (after filtering) |
| Face size bias | Implicit via scoring | None |
| Stability | None | Hysteresis margin |
| Cabinet handling | Axis-aligned OBB | Same - preserve V2 behavior |
| Center alignment | None | Optional with Shift key |

## Implementation Plan

### Phase 1: Core Algorithm (TDD)

**Files to create:**
- `apps/app/src/lib/snapping-v3.ts` - Main algorithm
- `apps/app/src/lib/snapping-v3.test.ts` - Comprehensive tests

**Test Cases First:**

```typescript
describe('Snap V3 Core', () => {
  describe('Face-to-face connection', () => {
    it('snaps right face to left face (X axis, +direction)')
    it('snaps left face to right face (X axis, -direction)')
    it('snaps top face to bottom face (Y axis, +direction)')
    it('snaps bottom face to top face (Y axis, -direction)')
    it('snaps front face to back face (Z axis, +direction)')
    it('snaps back face to front face (Z axis, -direction)')
  })

  describe('Alignment snap (parallel faces)', () => {
    it('aligns two front faces to same plane')
    it('aligns two top faces to same height')
    it('rejects alignment that would cause collision')
  })

  describe('Rotated parts', () => {
    it('handles 90° rotated part')
    it('handles 180° rotated part')
    it('handles arbitrary rotation')
    it('works with both parts rotated differently')
  })

  describe('Large face to small face', () => {
    it('snaps shelf edge (18mm) to cabinet side (400mm)')
    it('snaps side board to horizontal panel')
    it('no bias toward larger faces')
  })

  describe('Movement direction', () => {
    it('only snaps in movement direction')
    it('ignores faces behind movement')
    it('respects user intent on each axis')
  })

  describe('Collision prevention', () => {
    it('rejects snap causing penetration')
    it('allows touching (1mm gap)')
    it('works with rotated collision shapes')
  })

  describe('Stability', () => {
    it('maintains snap within hysteresis margin')
    it('releases snap when moved far enough')
  })

  describe('Cabinet handling', () => {
    it('cabinet-to-cabinet uses bounding box (like V2)')
    it('does NOT snap to individual parts within cabinet')
    it('loose part to cabinet bounding box works')
  })

  describe('Center alignment (Shift key)', () => {
    it('without Shift: only position on drag axis changes')
    it('with Shift: centers align on perpendicular axes')
  })
})
```

### Phase 2: Integration

**Files to modify:**
- `apps/app/src/components/canvas/PartTransformControls.tsx`
- `apps/app/src/types/transform.ts` (add V3 types)

**Changes:**
1. Add movement direction detection to PartTransformControls
2. Call calculateSnapV3 instead of V2 when enabled
3. Pass direction to snap function

### Phase 3: Visual Feedback

**Files to create/modify:**
- `apps/app/src/components/canvas/SnapFaceHighlight.tsx` (new)

**Features:**
- Highlight source and target faces during snap
- Show preview position of part after snap

### Phase 4: Settings Integration

**Files to modify:**
- `apps/app/src/types/transform.ts` - Add 'v3' to SnapVersion
- `apps/app/src/lib/store.ts` - Update default snap settings

## Critical Files

| File | Purpose |
|------|---------|
| `apps/app/src/lib/snapping-v3.ts` | NEW - Core V3 algorithm |
| `apps/app/src/lib/snapping-v3.test.ts` | NEW - TDD tests |
| `apps/app/src/lib/obb.ts` | EXISTING - Face calculations (reuse) |
| `apps/app/src/lib/group-bounds.ts` | EXISTING - Part bounds (reuse) |
| `apps/app/src/components/canvas/PartTransformControls.tsx` | MODIFY - Integration |
| `apps/app/src/types/transform.ts` | MODIFY - Add V3 types |

## Algorithm Details

### Face-to-Face Connection Detection

```typescript
function areFacesConnectable(source: SnapFace, target: SnapFace): boolean {
  // 1. Normals must be opposite
  const dot = vec3Dot(source.normal, target.normal);
  if (dot > -0.95) return false; // Not opposite

  // 2. Faces must roughly align (centers on same plane)
  // Already handled by distance calculation

  return true;
}
```

### Movement Direction Check

```typescript
function isSnapInMovementDirection(
  snapOffset: Vec3,
  axis: 'X' | 'Y' | 'Z',
  direction: 1 | -1
): boolean {
  const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
  const offsetOnAxis = snapOffset[axisIndex];

  // Snap offset should move part in same direction user is dragging
  if (direction > 0) {
    return offsetOnAxis >= 0; // Moving positive, snap should be positive or zero
  } else {
    return offsetOnAxis <= 0; // Moving negative, snap should be negative or zero
  }
}
```

### Collision Detection

```typescript
function wouldSnapCauseCollision(
  movingPart: Part,
  targetPart: Part,
  snapOffset: Vec3
): boolean {
  // Get AABBs for both parts
  const movingAABB = getPartAABB(movingPart, snapOffset);
  const targetAABB = getPartAABB(targetPart);

  // Shrink moving AABB by 1mm (allow touching)
  const shrunk = shrinkAABB(movingAABB, 1);

  return doAABBsOverlap(shrunk, targetAABB);
}
```

## Testing Strategy

### Unit Tests (Phase 1)
- Test each function in isolation
- Cover all edge cases for rotation
- Test both + and - movement directions
- Test collision detection accuracy

### Integration Tests (Phase 2)
- Test full snap flow from PartTransformControls
- Test with real part data from user scenarios
- Test performance with multiple parts

### Manual Testing (Phase 3)
- Test the exact user scenarios provided
- Verify visual feedback works correctly
- Test stability (no jumping)

## Estimated Complexity

| Phase | Files | New LOC | Modified LOC | Tests |
|-------|-------|---------|--------------|-------|
| 1 Core | 2 | ~300 | 0 | ~30 |
| 2 Integration | 2 | ~50 | ~30 | ~5 |
| 3 Visual | 1 | ~100 | 0 | ~3 |
| 4 Settings | 2 | ~10 | ~20 | ~2 |
| **Total** | **7** | **~460** | **~50** | **~40** |

## Success Criteria

1. ✅ All TDD tests pass
2. ✅ User's exact scenario works correctly
3. ✅ Large↔Small face snapping works
4. ✅ Rotated parts snap correctly
5. ✅ No collision/penetration occurs
6. ✅ Movement direction is respected
7. ✅ Visual feedback shows connected faces
8. ✅ Performance remains smooth
9. ✅ Cabinet-to-cabinet snapping works as well as V2

## Cleanup After Implementation

- Remove old V2 snap tests (keep as reference initially)
- Remove `snapping-v2.ts` after V3 is proven stable
- Update any documentation referencing V2
