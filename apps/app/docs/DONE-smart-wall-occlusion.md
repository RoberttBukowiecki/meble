# Smart Wall Occlusion - Implementation Plan

## Overview

Feature that automatically makes walls transparent when they block the view of furniture/cabinets. Enabled by default, toggled with keyboard shortcut "W".

## Algorithm

**Angle-based heuristic**: For each wall, check if its normal vector points away from the camera. Walls "facing away" from the camera are blocking the view and should become transparent.

```
dot(wallNormal, cameraToWall) < 0.1 → wall is occluding
```

## Files to Create

### 1. `apps/app/src/lib/store/slices/wallOcclusionSlice.ts`

```typescript
interface WallOcclusionSlice {
  wallOcclusionEnabled: boolean; // ON by default
  toggleWallOcclusion: () => void;
  occludingWallIds: Set<string>; // Transient - not persisted
  setOccludingWallIds: (ids: Set<string>) => void;
}
```

### 2. `apps/app/src/lib/wallOcclusionUtils.ts`

Utility functions:

- `getWallNormal(wall)` - calculate perpendicular normal vector
- `getWallCenter(wall, roomOrigin)` - get 3D center point
- `isWallOccluding(wall, roomOrigin, cameraPosition)` - check if wall blocks view

### 3. `apps/app/src/components/canvas/WallOcclusionController.tsx`

R3F component using `useFrame` with debouncing:

- Track camera position/rotation changes (threshold: 10mm / 0.02 rad)
- Calculate occluding walls only when camera moves
- Update `occludingWallIds` in store

## Files to Modify

### 1. `apps/app/src/lib/config.ts`

Add keyboard shortcut:

```typescript
TOGGLE_WALL_OCCLUSION: 'w',
```

### 2. `apps/app/src/components/GlobalKeyboardListener.tsx`

Add handler (around line 296, after visibility shortcuts):

```typescript
// W = Toggle wall occlusion
if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_WALL_OCCLUSION, key)) {
  event.preventDefault();
  useStore.getState().toggleWallOcclusion();
  return;
}
```

### 3. `apps/app/src/components/canvas/Room3D.tsx`

Modify `Wall3D` component:

- Subscribe to `wallOcclusionEnabled` and `occludingWallIds`
- Apply transparency when `isOccluding`:

```typescript
<meshStandardMaterial
  color="#e5e7eb"
  side={DoubleSide}
  transparent={isOccluding}
  opacity={isOccluding ? 0.2 : 1}
/>
```

### 4. `apps/app/src/components/canvas/Scene.tsx`

Add controller component after Room3D:

```typescript
<WallOcclusionController />
```

### 5. `apps/app/src/lib/store/index.ts`

- Import and compose `createWallOcclusionSlice`
- Add to `partialize`: exclude `occludingWallIds`, `setOccludingWallIds`, `toggleWallOcclusion`
- Keep `wallOcclusionEnabled` persisted

### 6. `apps/app/src/lib/store/types.ts`

Add `WallOcclusionSlice` to `StoreState` type

## Implementation Order

1. Create `wallOcclusionSlice.ts` - store state
2. Create `wallOcclusionUtils.ts` - detection logic
3. Update `store/index.ts` and `store/types.ts` - integrate slice
4. Create `WallOcclusionController.tsx` - R3F controller
5. Update `Room3D.tsx` - apply transparency
6. Update `Scene.tsx` - add controller
7. Update `config.ts` - add shortcut
8. Update `GlobalKeyboardListener.tsx` - handle shortcut

## Performance Considerations

- Debounced camera tracking (only recalculate on significant movement)
- `Set<string>` for O(1) wall ID lookup
- Only update store when occluding set actually changes
- `useShallow` for minimal re-renders

## Key Files Reference

- `/apps/app/src/components/canvas/Room3D.tsx` - wall rendering
- `/apps/app/src/lib/store/slices/uiSlice.ts` - pattern for feature toggles
- `/apps/app/src/components/GlobalKeyboardListener.tsx` - keyboard shortcuts
- `/apps/app/src/components/canvas/DimensionRenderer.tsx` - pattern for useFrame debouncing
- `/apps/app/src/lib/config.ts` - keyboard shortcuts config
