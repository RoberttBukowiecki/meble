# Cabinet Resize Implementation Plan

## Overview

Add live resize functionality for cabinets (groups) with high performance using ref-based preview. The system uses hybrid approach: proportional scaling for live preview, parametric regeneration on commit.

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| Resize Method | Hybrid - live proportional preview, parametric regeneration on commit |
| Available Dimensions | All 3 (width, height, depth) |
| Handle Placement | On bounding box of entire cabinet (6 handles) |
| Dimension Limits | None - user has full control |
| Dimension Display | Single label showing overall cabinet dimensions |

## Architecture

### Files to Create/Modify

```
apps/app/src/components/canvas/
├── CabinetResizeControls.tsx   # NEW - Main resize controls component
├── CabinetGroupTransform.tsx   # MODIFY - May share preview logic
├── Scene.tsx                   # MODIFY - Add resize mode for cabinets
apps/app/src/lib/
├── cabinetResize.ts            # NEW - Resize calculation utilities
├── store.ts                    # MODIFY - Add cabinet resize action
apps/app/src/types/
└── index.ts                    # MODIFY - Add CabinetResizeResult type
```

## Implementation Steps

### Step 1: Add Types (types/index.ts)

```typescript
/**
 * Result of cabinet resize calculation
 */
export interface CabinetResizeResult {
  /** New cabinet params (width, height, depth) */
  newParams: {
    width: number;
    height: number;
    depth: number;
  };
  /** Preview transforms for each part (proportionally scaled) */
  partPreviews: Map<string, {
    position: [number, number, number];
    scale: [number, number, number];
    width: number;
    height: number;
    depth: number;
  }>;
  /** New bounding box for dimension display */
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
}

/**
 * Cabinet resize handle type - 6 faces of bounding box
 */
export type CabinetResizeHandle =
  | 'width+'   // +X face (right)
  | 'width-'   // -X face (left)
  | 'height+'  // +Y face (top)
  | 'height-'  // -Y face (bottom)
  | 'depth+'   // +Z face (front)
  | 'depth-';  // -Z face (back)
```

### Step 2: Create Cabinet Resize Utilities (lib/cabinetResize.ts)

```typescript
/**
 * Cabinet resize calculation utilities
 *
 * Key functions:
 * - calculateCabinetBoundingBox: Get min/max/center/size of cabinet
 * - getCabinetHandlePosition: Get world position of resize handle
 * - getCabinetHandleNormal: Get normal direction for drag plane
 * - calculateCabinetResize: Main resize calculation
 * - calculateProportionalScales: Scale factors for each axis
 */

export function calculateCabinetBoundingBox(parts: Part[]): BoundingBox {
  // Find min/max corners considering part positions and dimensions
  // Account for part rotations (transform corners to world space)
}

export function getCabinetHandlePosition(
  boundingBox: BoundingBox,
  handle: CabinetResizeHandle
): [number, number, number] {
  // Return center of the handle's face on bounding box
}

export function getCabinetHandleNormal(
  handle: CabinetResizeHandle
): [number, number, number] {
  // Return normal vector for the handle's face
}

export function calculateCabinetResize(
  cabinet: Cabinet,
  parts: Part[],
  handle: CabinetResizeHandle,
  dragOffset: [number, number, number],
  initialBoundingBox: BoundingBox
): CabinetResizeResult {
  // 1. Calculate new target size based on drag direction
  // 2. Calculate scale factors for each axis
  // 3. Calculate new positions for each part (relative to pivot)
  // 4. Calculate new dimensions for each part
  // 5. Handle anchor point (opposite face stays fixed)
  // 6. Return preview transforms and new params
}

export function calculatePartPreviewTransform(
  part: Part,
  scaleFactors: [number, number, number],
  pivotPoint: [number, number, number],
  initialPosition: [number, number, number]
): PartPreviewTransform {
  // Scale position relative to pivot
  // Scale part dimensions
}
```

### Step 3: Create CabinetResizeControls Component

```typescript
// apps/app/src/components/canvas/CabinetResizeControls.tsx

/**
 * CabinetResizeControls Component
 *
 * Renders 6 resize handles on cabinet bounding box.
 * Uses ref-based drag state for performance - no store updates during drag.
 *
 * PERFORMANCE STRATEGY:
 * - dragStateRef stores all mutable state during drag
 * - previewVersion state triggers re-renders for preview mesh only
 * - Store updated ONCE on pointerup (parametric regeneration)
 * - Original cabinet parts hidden via setTransformingCabinetId
 */

interface CabinetResizeControlsProps {
  cabinetId: string;
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

interface DragState {
  isDragging: boolean;
  handle: CabinetResizeHandle | null;
  startPoint: THREE.Vector3;
  initialBoundingBox: BoundingBox;
  initialCabinetParams: { width: number; height: number; depth: number };
  initialPartTransforms: Map<string, { position: [number, number, number]; dimensions: [number, number, number] }>;
  // Preview state (updated during drag)
  previewTransforms: Map<string, PartPreviewTransform>;
  previewBoundingBox: BoundingBox | null;
}

// Key implementation details:

// 1. Calculate initial bounding box on mount and when parts change
const boundingBox = useMemo(() =>
  calculateCabinetBoundingBox(cabinetParts),
  [cabinetParts]
);

// 2. Drag state ref (no re-renders during drag)
const dragStateRef = useRef<DragState>({...});

// 3. Handle pointer down - setup drag state
const handlePointerDown = useCallback((e, handle) => {
  e.stopPropagation();

  // Store initial state
  dragStateRef.current = {
    isDragging: true,
    handle,
    startPoint: e.point.clone(),
    initialBoundingBox: boundingBox,
    initialCabinetParams: { ...cabinet.params },
    initialPartTransforms: capturePartTransforms(cabinetParts),
    previewTransforms: new Map(),
    previewBoundingBox: null,
  };

  // Setup drag plane (perpendicular to camera)
  setupDragPlane(camera, e.point);

  // Begin history batch
  beginBatch('TRANSFORM_CABINET', {...});

  // Hide original parts
  setTransformingCabinetId(cabinetId);
  onTransformStart();
}, [...]);

// 4. Pointer move handler (global, throttled with RAF)
useEffect(() => {
  const handlePointerMove = (e) => {
    if (!dragStateRef.current.isDragging) return;

    // RAF throttle
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      // Raycast to drag plane
      const intersectPoint = raycastToDragPlane(e, camera);

      // Calculate drag offset
      const dragOffset = calculateDragOffset(intersectPoint, dragStateRef.current.startPoint);

      // Calculate resize result (proportional scaling)
      const result = calculateCabinetResize(
        cabinet,
        cabinetParts,
        dragStateRef.current.handle,
        dragOffset,
        dragStateRef.current.initialBoundingBox
      );

      // Update preview state (ref only, no store!)
      dragStateRef.current.previewTransforms = result.partPreviews;
      dragStateRef.current.previewBoundingBox = result.boundingBox;

      // Trigger preview re-render
      setPreviewVersion(v => v + 1);
    });
  };

  const handlePointerUp = () => {
    if (!dragStateRef.current.isDragging) return;

    // Get final dimensions from preview
    const finalBox = dragStateRef.current.previewBoundingBox;
    if (finalBox) {
      // PARAMETRIC REGENERATION: Update cabinet params and regenerate
      updateCabinetParams(cabinetId, {
        ...cabinet.params,
        width: finalBox.size[0],
        height: finalBox.size[1],
        depth: finalBox.size[2],
      });
    }

    // Commit history
    commitBatch({ after: {...} });

    // Reset state
    setTransformingCabinetId(null);
    onTransformEnd();
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  return () => {...};
}, [...]);

// 5. Preview mesh rendering (for each cabinet part)
{isShowingPreview && cabinetParts.map(part => {
  const preview = dragStateRef.current.previewTransforms.get(part.id);
  if (!preview) return null;
  return (
    <PreviewPartMesh
      key={part.id}
      part={part}
      previewPosition={preview.position}
      previewDimensions={[preview.width, preview.height, preview.depth]}
      color={partColors.get(part.materialId)}
    />
  );
})}

// 6. Resize handles on bounding box
{HANDLES.map(handle => (
  <HandleMesh
    key={handle}
    boundingBox={displayBoundingBox}
    handle={handle}
    isActive={activeHandle === handle}
    isHovered={hoveredHandle === handle}
    onPointerDown={handlePointerDown}
    onPointerEnter={() => setHoveredHandle(handle)}
    onPointerLeave={() => setHoveredHandle(null)}
  />
))}

// 7. Dimension display (single label for cabinet bounding box)
{activeHandle && previewBoundingBox && (
  <CabinetDimensionDisplay
    boundingBox={previewBoundingBox}
    activeHandle={activeHandle}
  />
)}
```

### Step 4: Create Preview Components

```typescript
// PreviewPartMesh - renders scaled preview of a cabinet part
interface PreviewPartMeshProps {
  part: Part;
  previewPosition: [number, number, number];
  previewDimensions: [number, number, number]; // width, height, depth
  rotation: [number, number, number];
  color: string;
}

function PreviewPartMesh({ part, previewPosition, previewDimensions, rotation, color }: PreviewPartMeshProps) {
  return (
    <mesh position={previewPosition} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={previewDimensions} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// CabinetDimensionDisplay - shows overall cabinet dimensions
interface CabinetDimensionDisplayProps {
  boundingBox: BoundingBox;
  activeHandle: CabinetResizeHandle;
}

function CabinetDimensionDisplay({ boundingBox, activeHandle }: CabinetDimensionDisplayProps) {
  // Determine which dimension to show based on active handle
  const axis = activeHandle.startsWith('width') ? 'width'
    : activeHandle.startsWith('height') ? 'height'
    : 'depth';

  const dimension = boundingBox.size[axis === 'width' ? 0 : axis === 'height' ? 1 : 2];

  // Position label near the active handle
  const labelPosition = calculateLabelPosition(boundingBox, activeHandle);

  return (
    <Html position={labelPosition} center>
      <div className="rounded bg-background/90 px-3 py-1.5 text-sm font-medium text-foreground shadow-md">
        {axis === 'width' && 'Szer.'}
        {axis === 'height' && 'Wys.'}
        {axis === 'depth' && 'Głęb.'}: {Math.round(dimension)}mm
      </div>
    </Html>
  );
}
```

### Step 5: Handle Mesh Component

```typescript
// HandleMesh - resize handle on bounding box face
interface HandleMeshProps {
  boundingBox: BoundingBox;
  handle: CabinetResizeHandle;
  isActive: boolean;
  isHovered: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>, handle: CabinetResizeHandle) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function HandleMesh({
  boundingBox,
  handle,
  isActive,
  isHovered,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: HandleMeshProps) {
  const position = useMemo(() => getCabinetHandlePosition(boundingBox, handle), [boundingBox, handle]);
  const normal = useMemo(() => getCabinetHandleNormal(handle), [handle]);

  // Calculate rotation to face outward
  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(...normal);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [normal]);

  const color = useMemo(() => {
    if (isActive) return 'hsl(var(--accent))';
    if (isHovered) return 'hsl(var(--primary))';
    return 'hsl(var(--muted-foreground))';
  }, [isActive, isHovered]);

  const scale = isHovered || isActive ? 1.2 : 1;

  return (
    <group position={position} rotation={rotation}>
      {/* Invisible hitbox */}
      <mesh
        onPointerDown={(e) => onPointerDown(e, handle)}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <boxGeometry args={[HITBOX_SIZE, 5, HITBOX_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visible handle */}
      <mesh scale={scale}>
        <boxGeometry args={[HANDLE_SIZE, 5, HANDLE_SIZE]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive || isHovered ? color : 'black'}
          emissiveIntensity={isActive ? 0.3 : isHovered ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}
```

### Step 6: Update Scene.tsx

```typescript
// In Scene.tsx, add cabinet resize support:

// After existing cabinet transform controls:
{/* Transform controls for cabinet groups (translate/rotate only) */}
{selectedCabinetId && (transformMode === 'translate' || transformMode === 'rotate') && (
  <CabinetGroupTransform cabinetId={selectedCabinetId} />
)}

// NEW: Add resize controls for cabinets
{selectedCabinetId && transformMode === 'resize' && (
  <CabinetResizeControls
    cabinetId={selectedCabinetId}
    onTransformStart={() => setIsTransforming(true)}
    onTransformEnd={handlePartTransformEnd}
  />
)}
```

### Step 7: Bounding Box Calculation with Rotation Support

```typescript
/**
 * Calculate accurate bounding box for cabinet parts
 * Accounts for part rotations by transforming corners to world space
 */
export function calculateCabinetBoundingBox(parts: Part[]): BoundingBox {
  if (parts.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  parts.forEach(part => {
    // Get local corners of part
    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    const localCorners = [
      [-halfW, -halfH, -halfD],
      [+halfW, -halfH, -halfD],
      [-halfW, +halfH, -halfD],
      [+halfW, +halfH, -halfD],
      [-halfW, -halfH, +halfD],
      [+halfW, -halfH, +halfD],
      [-halfW, +halfH, +halfD],
      [+halfW, +halfH, +halfD],
    ];

    // Transform each corner to world space
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(new THREE.Euler(...part.rotation));
    matrix.setPosition(...part.position);

    localCorners.forEach(corner => {
      const worldCorner = new THREE.Vector3(...corner).applyMatrix4(matrix);
      minX = Math.min(minX, worldCorner.x);
      minY = Math.min(minY, worldCorner.y);
      minZ = Math.min(minZ, worldCorner.z);
      maxX = Math.max(maxX, worldCorner.x);
      maxY = Math.max(maxY, worldCorner.y);
      maxZ = Math.max(maxZ, worldCorner.z);
    });
  });

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}
```

### Step 8: Proportional Scaling Logic

```typescript
/**
 * Calculate preview transforms for proportional scaling
 *
 * Pivot point: The face opposite to the dragged handle stays fixed
 * All parts scale and reposition relative to this pivot
 */
export function calculateProportionalResize(
  parts: Part[],
  handle: CabinetResizeHandle,
  newSize: [number, number, number],
  initialBoundingBox: BoundingBox,
  initialPartTransforms: Map<string, PartTransformData>
): Map<string, PartPreviewTransform> {
  const result = new Map<string, PartPreviewTransform>();

  // Determine scale factors
  const scaleX = newSize[0] / initialBoundingBox.size[0];
  const scaleY = newSize[1] / initialBoundingBox.size[1];
  const scaleZ = newSize[2] / initialBoundingBox.size[2];

  // Determine pivot point (opposite face of handle)
  const pivot = getPivotPoint(handle, initialBoundingBox);

  parts.forEach(part => {
    const initial = initialPartTransforms.get(part.id);
    if (!initial) return;

    // Calculate new position (scale relative to pivot)
    const relX = initial.position[0] - pivot[0];
    const relY = initial.position[1] - pivot[1];
    const relZ = initial.position[2] - pivot[2];

    const newPosition: [number, number, number] = [
      pivot[0] + relX * scaleX,
      pivot[1] + relY * scaleY,
      pivot[2] + relZ * scaleZ,
    ];

    // Calculate new dimensions (scale each dimension)
    // Note: For hybrid approach, we scale visually but parametric
    // regeneration will restore proper material thicknesses
    const newDimensions: [number, number, number] = [
      initial.dimensions[0] * scaleX,
      initial.dimensions[1] * scaleY,
      initial.dimensions[2] * scaleZ,
    ];

    result.set(part.id, {
      position: newPosition,
      rotation: initial.rotation, // Rotation unchanged
      width: newDimensions[0],
      height: newDimensions[1],
      depth: newDimensions[2],
    });
  });

  return result;
}

/**
 * Get pivot point - the corner/edge opposite to the dragged handle
 */
function getPivotPoint(
  handle: CabinetResizeHandle,
  boundingBox: BoundingBox
): [number, number, number] {
  const { min, max, center } = boundingBox;

  // Pivot is on opposite face
  switch (handle) {
    case 'width+':  return [min[0], center[1], center[2]]; // Left face
    case 'width-':  return [max[0], center[1], center[2]]; // Right face
    case 'height+': return [center[0], min[1], center[2]]; // Bottom face
    case 'height-': return [center[0], max[1], center[2]]; // Top face
    case 'depth+':  return [center[0], center[1], min[2]]; // Back face
    case 'depth-':  return [center[0], center[1], max[2]]; // Front face
  }
}
```

## Performance Considerations

### 1. Ref-Based Drag State
```typescript
// All mutable state during drag stored in refs
const dragStateRef = useRef<DragState>({...});

// Only previewVersion state triggers re-renders
const [previewVersion, setPreviewVersion] = useState(0);
```

### 2. RAF Throttling
```typescript
const rafIdRef = useRef<number | null>(null);

// In pointermove handler:
if (rafIdRef.current !== null) return;
rafIdRef.current = requestAnimationFrame(() => {
  rafIdRef.current = null;
  // Calculate and update preview
});
```

### 3. Single Store Update on Commit
```typescript
// During drag: NO store updates
// On pointerup: ONE call to updateCabinetParams()
// This triggers regeneration ONCE
```

### 4. Memoized Calculations
```typescript
// Bounding box recalculated only when parts change
const boundingBox = useMemo(() =>
  calculateCabinetBoundingBox(cabinetParts),
  [cabinetParts]
);

// Handle positions memoized
const position = useMemo(() =>
  getCabinetHandlePosition(boundingBox, handle),
  [boundingBox, handle]
);
```

### 5. Preview Mesh Optimization
```typescript
// Preview meshes use simple boxGeometry
// No edges, no handles, no complex materials during drag
// Emissive highlight for visibility
```

## History Integration

```typescript
// On drag start:
beginBatch('TRANSFORM_CABINET', {
  targetId: cabinetId,
  before: {
    params: cabinet.params,
    partTransforms: capturePartTransforms(parts),
  },
});

// On drag end:
commitBatch({
  after: {
    params: { ...cabinet.params, width: newWidth, height: newHeight, depth: newDepth },
    partTransforms: newPartTransforms,
  },
});
```

## Edge Cases to Handle

1. **Minimum Size**: Ensure bounding box doesn't collapse to zero
2. **Negative Drag**: Handle dragging past the pivot point
3. **Rotated Cabinets**: Bounding box calculation handles rotated parts
4. **Parts with Different Rotations**: Each part scaled correctly in world space
5. **Material Thickness Preservation**: Parametric regeneration on commit restores proper thicknesses

## Testing Checklist

- [ ] Resize from each of 6 handles works correctly
- [ ] Live preview updates smoothly (60fps)
- [ ] Pivot point stays fixed (opposite face)
- [ ] Dimension label shows correct values
- [ ] Store updated only on pointerup
- [ ] Undo/redo works correctly
- [ ] Cabinet regenerates with correct proportions
- [ ] Material thicknesses preserved after regeneration
- [ ] Rotated cabinets resize correctly
- [ ] Multiple resize operations work sequentially

## File Dependencies

```
CabinetResizeControls.tsx
├── lib/cabinetResize.ts (calculations)
├── lib/store.ts (updateCabinetParams)
├── lib/snap-context.tsx (snap visualization)
├── lib/config.ts (PART_CONFIG)
├── types/index.ts (CabinetResizeHandle, etc.)
└── @react-three/fiber, @react-three/drei, three
```

## Implementation Order

1. Add types to `types/index.ts`
2. Create `lib/cabinetResize.ts` with calculation utilities
3. Create `CabinetResizeControls.tsx` with basic structure
4. Add handle rendering and hover states
5. Implement drag logic with RAF throttling
6. Add preview mesh rendering
7. Add dimension display
8. Connect to store (updateCabinetParams on commit)
9. Update Scene.tsx to use new component
10. Test and refine

---

Status: **READY FOR IMPLEMENTATION**
