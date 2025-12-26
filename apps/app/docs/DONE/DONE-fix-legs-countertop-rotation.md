# Plan: Fix Cabinet Legs and Countertop Positioning at Different Rotations

## Problem Summary

1. **Legs not attached to cabinet base**: `getCabinetBodyTransform` returns AVERAGE of body part positions as "center", but this is NOT the geometric center. The BACK panel shifts the average backwards, causing legs to be mispositioned.

2. **Countertop changes size with rotation**: Countertop dimensions are calculated from WORLD-SPACE bounding box (maxX-minX), which changes when cabinet rotates. Should use LOCAL dimensions.

## Root Cause Analysis

### Legs Issue

```
Kitchen cabinet body parts average:
- BOTTOM: [0, bottomY, 0]
- TOP: [0, topY, 0]
- LEFT_SIDE: [-w/2+t/2, sideY, 0]
- RIGHT_SIDE: [w/2-t/2, sideY, 0]
- BACK: [0, centerY, -depth/2+t/2]  <- Shifts average Z!

Average Z = (-depth/2+t/2)/5 ≈ -56mm for 560mm depth
```

Leg positions are calculated relative to (0,0), but rendering uses shifted center.

### Countertop Issue

When 600x560mm cabinet rotates 90°:

- Before: world boundsWidth=600, boundsDepth=560
- After: world boundsWidth=560, boundsDepth=600

Countertop should maintain LOCAL dimensions!

---

## Implementation Plan

### Step 1: Create `CabinetTransformDomain` Module

**File**: `apps/app/src/lib/domain/cabinetTransform.ts`

```typescript
// Types
interface CabinetGeometricBounds {
  min: [number, number, number];
  max: [number, number, number];
  geometricCenter: [number, number, number];  // TRUE geometric center
  rotation: Quaternion;
  localDimensions: { width: number; height: number; depth: number };
}

// Key functions
function getCabinetGeometricBounds(parts: Part[]): CabinetGeometricBounds;
function getLegsAnchorPoint(bounds: CabinetGeometricBounds): [number, number, number];
function getCountertopLocalDimensions(cabinets: Cabinet[], parts: Part[]): {...};
```

**Algorithm for geometric center**:

- Calculate world-space bounding box using rotation-aware extents
- Geometric center = midpoint of bounds (NOT average of positions)
- Extract rotation from BOTTOM part
- Calculate LOCAL dimensions by inverse-rotating world bounds

### Step 2: Fix Legs Rendering in `Scene.tsx`

**File**: `apps/app/src/components/canvas/Scene.tsx` (lines 395-413)

**Current (broken)**:

```tsx
const { center, rotation } = getCabinetBodyTransform(cabinetParts);
<group position={[center.x, 0, center.z]} rotation={euler}>
```

**New**:

```tsx
const bounds = CabinetTransformDomain.getCabinetGeometricBounds(cabinetParts);
const legsAnchor = CabinetTransformDomain.getLegsAnchorPoint(bounds);
<group position={legsAnchor} rotation={euler}>
```

### Step 3: Fix Preview Legs in `CabinetGroupTransform.tsx`

**File**: `apps/app/src/components/canvas/CabinetGroupTransform.tsx` (lines 160-183)

Update `PreviewLegs` to use geometric bounds from preview transforms instead of position average.

### Step 4: Fix Countertop Dimensions in `CountertopPart3D.tsx`

**File**: `apps/app/src/components/canvas/CountertopPart3D.tsx` (lines 159-227)

**Current (broken)**:

```tsx
const boundsWidth = maxX - minX; // World-space - changes with rotation!
const countertopWidth = boundsWidth + overhangs;
```

**New approach**:

1. Get LOCAL dimensions from cabinet params or calculate from parts
2. Use LOCAL dimensions for countertop size (rotation-invariant)
3. Position based on geometric center + rotated overhang offset

### Step 5: Fix Preview Countertop in `CabinetGroupTransform.tsx`

**File**: `apps/app/src/components/canvas/CabinetGroupTransform.tsx` (lines 213-334)

Update `calculateCountertopPreview` to use LOCAL dimensions.

### Step 6: Update Helper Functions

**File**: `apps/app/src/lib/domain/countertop/helpers.ts`

Add `getCabinetBoundsWithLocal()` that returns both world bounds AND local dimensions.

**File**: `apps/app/src/lib/store/utils.ts`

Deprecate `getCabinetBodyTransform`, update to use new domain module internally.

---

## Files to Create

1. `apps/app/src/lib/domain/cabinetTransform.ts` - New domain module
2. `apps/app/src/lib/domain/cabinetTransform.test.ts` - Unit tests

## Files to Modify

1. `apps/app/src/lib/domain/index.ts` - Export new domain
2. `apps/app/src/lib/store/utils.ts` - Update getCabinetBodyTransform
3. `apps/app/src/lib/domain/countertop/helpers.ts` - Add local bounds helper
4. `apps/app/src/components/canvas/Scene.tsx` - Fix legs rendering
5. `apps/app/src/components/canvas/CabinetGroupTransform.tsx` - Fix previews
6. `apps/app/src/components/canvas/CountertopPart3D.tsx` - Fix countertop dims

---

## Implementation Order

1. Create `CabinetTransformDomain` module with core functions
2. Add unit tests for domain functions
3. Update `Scene.tsx` - fix legs rendering
4. Update `CabinetGroupTransform.tsx` - fix preview legs
5. Update `CountertopPart3D.tsx` - fix countertop dimensions
6. Update `CabinetGroupTransform.tsx` - fix preview countertop
7. Update helpers and deprecate old functions
8. Integration testing

## Test Scenarios

### Legs:

- Cabinet at 0°, 45°, 90°, 180° - legs at corners
- Preview during drag matches final

### Countertop:

- Single cabinet at 0° vs 90° - SAME dimensions
- Multiple cabinets - correct combined width
- Preview matches final
