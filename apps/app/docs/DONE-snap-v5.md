# Snap V5 Implementation Plan

## Overview
Implement a new face-to-face snapping system (V5) that works perfectly with rotated parts. V5 will be the default snapping version.

## Key Design Principles
1. **Face-to-Face Focus**: Only face connection and face alignment (no edge/T-joint complexity)
2. **Rotation Independence**: Uses OBB faces which are already in world space
3. **Simple Algorithm**: ~200 lines vs V4's ~1200 lines
4. **Perfect Accuracy**: Works with any rotation combinations

## Files to Create

### 1. `apps/app/src/lib/snapping-v5.ts` (NEW)
Core algorithm implementation:

```typescript
// Main export function
export function calculatePartSnapV5SingleAxis(
  movingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  cabinets: Cabinet[],
  settings: SnapSettings,
  dragAxis: 'X' | 'Y' | 'Z'
): SnapV5Result
```

**Algorithm Flow:**
1. Get OBB faces of moving part (at original position)
2. Filter to faces aligned with drag axis (|normal[axis]| > 0.7)
3. Filter to leading faces (facing movement direction)
4. For each target part:
   - Get target OBB faces
   - For each (movingFace, targetFace) pair:
     - **Connection**: dot < -0.95 (opposite normals) → bring faces together
     - **Alignment**: dot > 0.95 (parallel normals) → align to same plane
   - Validate face overlap on perpendicular axes
   - Calculate snap offset if within snap distance
5. Select best candidate (closest to current position)
6. Return snapped position and snap points

**Debug Features:**
- `DEBUG_V5` constant for console logging
- Optional `debugInfo` in result with candidates checked/selected

## Files to Modify

### 2. `apps/app/src/types/transform.ts`
**Line 88** - Add 'v5' to SnapVersion:
```typescript
// Before:
export type SnapVersion = 'v1' | 'v2' | 'v3' | 'v4';
// After:
export type SnapVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5';
```

### 3. `apps/app/src/lib/store/slices/snapSlice.ts`
**Line 17** - Change default version to 'v5':
```typescript
// Before:
version: 'v4',
// After:
version: 'v5',
```

### 4. `apps/app/src/components/canvas/PartTransformControls.tsx`
**Line 16** - Add import:
```typescript
import { calculatePartSnapV5SingleAxis } from '@/lib/snapping-v5';
```

**Lines 134-144** - Add V5 case (before V4):
```typescript
if (snapSettings.version === 'v5') {
  snapResult = calculatePartSnapV5SingleAxis(
    part,
    position,
    parts,
    cabinets,
    snapSettings,
    effectiveAxis
  );
} else if (snapSettings.version === 'v4') {
  // ... existing V4 code
}
```

### 5. `apps/app/src/components/layout/SnapControlPanel.tsx`
Add V5 option to version selector (as first/default option):
```typescript
<DropdownMenuRadioItem value="v5" className="text-sm">
  V5 - Precyzyjne powierzchniowe (obroty)
</DropdownMenuRadioItem>
```

## Algorithm Details

### Face-to-Face Connection (Primary)
```
movingFacePos = movingFace.center[axisIndex]
targetFacePos = targetFace.center[axisIndex]
diff = targetFacePos - movingFacePos
normalSign = movingFace.normal[axisIndex] > 0 ? 1 : -1
snapOffset = diff - (collisionOffset * normalSign)
```

### Face Alignment
```
snapOffset = targetFace.center[axisIndex] - movingFace.center[axisIndex]
```

### Face Overlap Validation
Check overlap on perpendicular axes (with 10mm tolerance):
- If snapping on X, check Y and Z overlap
- If snapping on Y, check X and Z overlap
- If snapping on Z, check X and Y overlap

## Debug Visualization (Future Enhancement)
The existing `SnapGuidesRenderer` works with V5 because:
- V5 returns `SnapPoint[]` in the same format
- Snap guides render at `snapPoint.position`

For bounding box debug visualization, we can add a simple wireframe component later.

## Implementation Order
1. Add 'v5' to SnapVersion type
2. Create snapping-v5.ts with core algorithm
3. Integrate into PartTransformControls
4. Update SnapControlPanel with V5 option
5. Change default to 'v5' in snapSlice
6. Test with rotated parts

## Key Dependencies Used
From `obb.ts`:
- `createOBBFromPart(part)` - Creates OBB with world-space axes
- `getOBBFaces(obb)` - Returns 6 faces with world-space normals/corners
- `vec3Dot(a, b)` - Dot product for normal comparison

## Testing Scenarios
1. Two non-rotated parts snapping face-to-face
2. One rotated part (Y 90deg) snapping to non-rotated
3. Both parts rotated to different angles
4. Parts with 45-degree rotations
5. Vertical stacking (Y-axis snapping)
