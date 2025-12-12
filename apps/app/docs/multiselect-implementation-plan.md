# Multiselect Implementation Plan

## Overview

Production-grade multiselect system for the furniture designer app.
Key principles:
- **Ref-based preview**: All visual updates during interaction via refs, zero store updates
- **Single commit**: Store update only on interaction end (mouseUp/pointerUp)
- **Batch operations**: `updatePartsBatch()` for all multi-part mutations
- **Memory efficiency**: Reuse geometries, materials; minimal allocations during drag

---

## Phase 1: Store Layer

### 1.1 Selection State Extension

**File:** `src/lib/store/slices/selectionSlice.ts`

```typescript
interface SelectionSlice {
  // EXISTING - keep for backward compatibility
  selectedPartId: string | null;
  selectedCabinetId: string | null;

  // NEW - multiselect
  selectedPartIds: Set<string>;
  isMultiSelectActive: boolean;  // true when Set.size > 1
  multiSelectAnchorId: string | null;  // first selected part (for range select)

  // Transform state
  transformingPartIds: Set<string>;  // parts being transformed (hide originals)

  // Actions
  selectPart: (id: string | null) => void;  // single select (clears multi)
  togglePartSelection: (id: string) => void;  // Shift+click toggle
  addToSelection: (ids: string[]) => void;  // add multiple
  removeFromSelection: (ids: string[]) => void;
  selectRange: (fromId: string, toId: string) => void;  // Shift+click range
  selectAll: () => void;
  clearSelection: () => void;
  setTransformingPartIds: (ids: Set<string>) => void;
}
```

**Implementation notes:**
- `selectedPartId` becomes computed: first item of `selectedPartIds` or null
- `isMultiSelectActive` is computed: `selectedPartIds.size > 1`
- All actions use immer for immutable updates

### 1.2 Derived Selectors

```typescript
// Memoized selectors for performance
export const selectSelectedParts = (state: StoreState): Part[] =>
  state.parts.filter(p => state.selectedPartIds.has(p.id));

export const selectMultiSelectBounds = (state: StoreState): Box3 | null => {
  const parts = selectSelectedParts(state);
  if (parts.length === 0) return null;
  return calculateBoundingBox(parts);
};

export const selectIsPartSelected = (partId: string) =>
  (state: StoreState): boolean => state.selectedPartIds.has(partId);
```

### 1.3 History Integration

**File:** `src/lib/store/slices/historySlice.ts`

Add new entry type:
```typescript
type HistoryEntryType =
  | ... existing ...
  | 'TRANSFORM_MULTISELECT'
  | 'DELETE_MULTISELECT'
  | 'DUPLICATE_MULTISELECT';

interface MultiSelectHistoryEntry {
  type: 'TRANSFORM_MULTISELECT';
  targetIds: string[];
  before: Record<string, { position: Vector3Tuple; rotation: Vector3Tuple }>;
  after: Record<string, { position: Vector3Tuple; rotation: Vector3Tuple }>;
}
```

---

## Phase 2: Interaction Layer

### 2.1 Click Selection Logic

**File:** `src/components/canvas/Part3D.tsx`

```typescript
const handleClick = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();

  const isShift = e.shiftKey;
  const isCmd = e.metaKey || e.ctrlKey;

  // Double-click detection (existing pattern)
  const now = Date.now();
  const isDoubleClick = now - lastClickRef.current < 300;
  lastClickRef.current = now;

  if (isDoubleClick) {
    // Double-click: isolate select (clear others, select this)
    selectPart(part.id);
    return;
  }

  // Single click with modifiers
  if (isCmd) {
    // Cmd+click: toggle in/out of selection
    togglePartSelection(part.id);
  } else if (isShift && multiSelectAnchorId) {
    // Shift+click: range select (table order)
    selectRange(multiSelectAnchorId, part.id);
  } else {
    // Plain click: single select (clears multi)
    selectPart(part.id);
  }
};
```

### 2.2 Keyboard Shortcuts

**File:** `src/components/GlobalKeyboardListener.tsx`

```typescript
// Cmd+A: Select all parts in current furniture
if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
  e.preventDefault();
  selectAll();
}

// Escape: Clear selection
if (e.key === 'Escape') {
  clearSelection();
}

// Delete/Backspace: Delete selected parts
if (e.key === 'Delete' || e.key === 'Backspace') {
  if (selectedPartIds.size > 0) {
    deleteSelectedParts();
  }
}

// Cmd+D: Duplicate selected
if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
  e.preventDefault();
  duplicateSelectedParts();
}
```

### 2.3 Marquee Selection (Box Select)

**New file:** `src/components/canvas/MarqueeSelect.tsx`

```typescript
interface MarqueeState {
  isActive: boolean;
  startPoint: Vector2;
  endPoint: Vector2;
}

const MarqueeSelect: React.FC = () => {
  const stateRef = useRef<MarqueeState>({ isActive: false, ... });
  const [renderVersion, setRenderVersion] = useState(0);

  // Pointer handlers on canvas overlay
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.target !== canvas) return;
    stateRef.current = { isActive: true, startPoint: [e.clientX, e.clientY], ... };
    setRenderVersion(v => v + 1);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!stateRef.current.isActive) return;
    stateRef.current.endPoint = [e.clientX, e.clientY];

    // Calculate parts within marquee (frustum culling)
    const partsInMarquee = getPartsInScreenRect(
      stateRef.current.startPoint,
      stateRef.current.endPoint
    );

    // Preview selection (visual only, no store update)
    previewSelectionRef.current = new Set(partsInMarquee.map(p => p.id));
    setRenderVersion(v => v + 1);
  };

  const handlePointerUp = () => {
    // COMMIT: single store update
    const ids = Array.from(previewSelectionRef.current);
    if (shiftPressed) {
      addToSelection(ids);
    } else {
      selectParts(ids);
    }
    stateRef.current.isActive = false;
    setRenderVersion(v => v + 1);
  };

  return (
    <>
      {stateRef.current.isActive && (
        <div className="marquee-rectangle" style={computeStyle()} />
      )}
    </>
  );
};
```

**Frustum-based part detection:**
```typescript
const getPartsInScreenRect = (start: Vector2, end: Vector2): Part[] => {
  const camera = useThree.getState().camera;
  const frustum = new Frustum();

  // Create frustum from screen rectangle
  const rect = normalizeRect(start, end);
  frustum.setFromProjectionMatrix(
    computeSelectionMatrix(camera, rect)
  );

  // Test each part's bounding box
  return parts.filter(part => {
    const box = getPartBoundingBox(part);
    return frustum.intersectsBox(box);
  });
};
```

---

## Phase 3: Transform System

### 3.1 MultiSelectTransformControls

**New file:** `src/components/canvas/MultiSelectTransformControls.tsx`

Core principle: **All intermediate state in refs, single store commit on end**

```typescript
interface PreviewTransform {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

const MultiSelectTransformControls: React.FC = () => {
  // Selected parts (shallow for performance)
  const { selectedPartIds, parts, transformMode } = useStore(
    useShallow(state => ({
      selectedPartIds: state.selectedPartIds,
      parts: state.parts,
      transformMode: state.transformMode,
    }))
  );

  // REF-BASED STATE (no re-renders during drag)
  const previewTransformsRef = useRef<Map<string, PreviewTransform>>(new Map());
  const initialTransformsRef = useRef<Map<string, PreviewTransform>>(new Map());
  const boundingBoxRef = useRef<{ center: Vector3; size: Vector3 } | null>(null);
  const isDraggingRef = useRef(false);

  // Force preview re-render (increment only)
  const [previewVersion, setPreviewVersion] = useState(0);

  // Calculate bounding box center (transform pivot)
  const selectedParts = useMemo(() =>
    parts.filter(p => selectedPartIds.has(p.id)),
    [parts, selectedPartIds]
  );

  useEffect(() => {
    if (selectedParts.length === 0) {
      boundingBoxRef.current = null;
      return;
    }

    const box = new Box3();
    selectedParts.forEach(part => {
      box.expandByObject(getPartMesh(part)); // or calculate from part dimensions
    });

    boundingBoxRef.current = {
      center: box.getCenter(new Vector3()),
      size: box.getSize(new Vector3()),
    };
  }, [selectedParts]);

  // DRAG START
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;

    // Snapshot initial transforms
    initialTransformsRef.current.clear();
    selectedParts.forEach(part => {
      initialTransformsRef.current.set(part.id, {
        position: [...part.position],
        rotation: [...part.rotation],
      });
    });

    // Initialize preview with current positions
    previewTransformsRef.current = new Map(initialTransformsRef.current);

    // Hide original parts
    setTransformingPartIds(new Set(selectedPartIds));

    // Begin history batch
    beginBatch('TRANSFORM_MULTISELECT', {
      targetIds: Array.from(selectedPartIds),
      before: Object.fromEntries(initialTransformsRef.current),
    });

    setPreviewVersion(v => v + 1);
  }, [selectedParts, selectedPartIds]);

  // DRAG UPDATE (no store update!)
  const handleDrag = useCallback((matrix: Matrix4) => {
    if (!boundingBoxRef.current || !isDraggingRef.current) return;

    const pivotCenter = boundingBoxRef.current.center;

    // Calculate delta transform from initial pivot
    const deltaPosition = new Vector3();
    const deltaRotation = new Euler();
    matrix.decompose(deltaPosition, new Quaternion(), new Vector3());

    // Apply relative transform to each part
    initialTransformsRef.current.forEach((initial, partId) => {
      const partPos = new Vector3(...initial.position);
      const partRot = new Euler(...initial.rotation);

      // Translate relative to pivot
      const relativePos = partPos.clone().sub(pivotCenter);

      // Apply rotation around pivot
      if (transformMode === 'rotate') {
        relativePos.applyMatrix4(matrix);
        partRot.setFromQuaternion(
          new Quaternion().setFromEuler(partRot).premultiply(
            new Quaternion().setFromRotationMatrix(matrix)
          )
        );
      }

      // Apply translation
      const newPos = pivotCenter.clone().add(relativePos).add(deltaPosition);

      previewTransformsRef.current.set(partId, {
        position: newPos.toArray() as Vector3Tuple,
        rotation: [partRot.x, partRot.y, partRot.z],
      });
    });

    // Trigger preview re-render (cheap, only preview meshes)
    setPreviewVersion(v => v + 1);
  }, [transformMode]);

  // DRAG END (single store commit)
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;

    // SINGLE BATCH UPDATE
    const updates: Array<{ id: string; patch: Partial<Part> }> = [];
    previewTransformsRef.current.forEach((transform, partId) => {
      updates.push({
        id: partId,
        patch: {
          position: transform.position,
          rotation: transform.rotation,
        },
      });
    });

    updatePartsBatch(updates);

    // Commit history
    commitBatch({
      after: Object.fromEntries(previewTransformsRef.current),
    });

    // Show original parts again
    setTransformingPartIds(new Set());

    // Clear preview state
    previewTransformsRef.current.clear();
    setPreviewVersion(v => v + 1);
  }, []);

  if (selectedParts.length < 2 || !boundingBoxRef.current) {
    return null;
  }

  return (
    <>
      {/* Transform controls at bounding box center */}
      <TransformControls
        position={boundingBoxRef.current.center.toArray()}
        mode={transformMode}
        onMouseDown={handleDragStart}
        onChange={handleDrag}
        onMouseUp={handleDragEnd}
      />

      {/* Bounding box visualization */}
      <BoundingBoxHelper
        center={boundingBoxRef.current.center}
        size={boundingBoxRef.current.size}
      />

      {/* Preview meshes (only during drag) */}
      {isDraggingRef.current && (
        <MultiSelectPreview
          parts={selectedParts}
          transforms={previewTransformsRef.current}
          version={previewVersion}
        />
      )}
    </>
  );
};
```

### 3.2 Preview Mesh Component

**Optimized preview rendering:**

```typescript
const MultiSelectPreview: React.FC<{
  parts: Part[];
  transforms: Map<string, PreviewTransform>;
  version: number;
}> = React.memo(({ parts, transforms }) => {
  // Reuse geometries from geometry cache
  const geometryCache = useGeometryCache();

  return (
    <group>
      {parts.map(part => {
        const transform = transforms.get(part.id);
        if (!transform) return null;

        return (
          <mesh
            key={part.id}
            position={transform.position}
            rotation={transform.rotation}
            geometry={geometryCache.get(part)}
          >
            <meshStandardMaterial
              color={part.material.color}
              transparent
              opacity={0.7}
              emissive={MULTISELECT_PREVIEW_COLOR}
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
});
```

### 3.3 Part3D Integration

**Hide parts during transform:**

```typescript
// In Part3D.tsx
const Part3D: React.FC<{ part: Part }> = ({ part }) => {
  const { transformingPartIds, selectedPartIds } = useStore(
    useShallow(state => ({
      transformingPartIds: state.transformingPartIds,
      selectedPartIds: state.selectedPartIds,
    }))
  );

  // Hide if being transformed (preview shows instead)
  const isBeingTransformed = transformingPartIds.has(part.id);
  if (isBeingTransformed) {
    return null;
  }

  // Selection visual state
  const isSelected = selectedPartIds.has(part.id);
  const isMultiSelected = isSelected && selectedPartIds.size > 1;

  const emissiveColor = isMultiSelected
    ? MULTISELECT_EMISSIVE_COLOR
    : isSelected
      ? SELECTION_EMISSIVE_COLOR
      : '#000000';

  return (
    <group>
      {/* ... existing mesh with updated emissive ... */}
    </group>
  );
};
```

---

## Phase 4: UI Layer

### 4.1 PartsTable Multiselect

**File:** `src/components/ui/PartsTable.tsx`

```typescript
const handleRowClick = (partId: string, e: React.MouseEvent) => {
  if (e.metaKey || e.ctrlKey) {
    togglePartSelection(partId);
  } else if (e.shiftKey && selectedPartIds.size > 0) {
    // Range select
    const anchor = multiSelectAnchorId || Array.from(selectedPartIds)[0];
    selectRange(anchor, partId);
  } else {
    selectPart(partId);
  }
};

// Checkbox column for explicit multiselect
const columns = [
  {
    id: 'select',
    header: () => (
      <Checkbox
        checked={selectedPartIds.size === parts.length}
        indeterminate={selectedPartIds.size > 0 && selectedPartIds.size < parts.length}
        onChange={e => e.target.checked ? selectAll() : clearSelection()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedPartIds.has(row.original.id)}
        onChange={() => togglePartSelection(row.original.id)}
        onClick={e => e.stopPropagation()}
      />
    ),
  },
  // ... existing columns
];
```

### 4.2 PropertiesPanel Multiselect

**File:** `src/components/ui/PropertiesPanel.tsx`

```typescript
const PropertiesPanel: React.FC = () => {
  const { selectedPartIds, parts } = useStore(useShallow(...));

  const selectedParts = useMemo(() =>
    parts.filter(p => selectedPartIds.has(p.id)),
    [parts, selectedPartIds]
  );

  // Multiselect mode
  if (selectedParts.length > 1) {
    return <MultiSelectPropertiesPanel parts={selectedParts} />;
  }

  // Single select mode (existing)
  if (selectedParts.length === 1) {
    return <SinglePartPropertiesPanel part={selectedParts[0]} />;
  }

  return <NoSelectionPanel />;
};

const MultiSelectPropertiesPanel: React.FC<{ parts: Part[] }> = ({ parts }) => {
  // Aggregate properties
  const commonMaterial = useMemo(() => {
    const materials = new Set(parts.map(p => p.materialId));
    return materials.size === 1 ? parts[0].materialId : null;
  }, [parts]);

  // Batch update handler
  const handleMaterialChange = (materialId: string) => {
    updatePartsBatch(parts.map(p => ({
      id: p.id,
      patch: { materialId },
    })));
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {parts.length} parts selected
      </h3>

      {/* Material selector (shows common value or "Multiple") */}
      <MaterialSelect
        value={commonMaterial}
        placeholder={commonMaterial ? undefined : "Multiple values"}
        onChange={handleMaterialChange}
      />

      {/* Aggregate bounding box info */}
      <BoundingBoxInfo parts={parts} />

      {/* Batch operations */}
      <div className="mt-4 space-y-2">
        <Button onClick={() => duplicateSelectedParts()}>
          Duplicate {parts.length} parts
        </Button>
        <Button variant="destructive" onClick={() => deleteSelectedParts()}>
          Delete {parts.length} parts
        </Button>
      </div>
    </div>
  );
};
```

### 4.3 Toolbar Updates

**Selection count indicator:**
```typescript
const SelectionIndicator: React.FC = () => {
  const count = useStore(state => state.selectedPartIds.size);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
      <span className="text-sm text-muted-foreground">
        {count} selected
      </span>
      <Button variant="ghost" size="sm" onClick={clearSelection}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
```

---

## Phase 5: Visual Feedback

### 5.1 Config Updates

**File:** `src/lib/config.ts`

```typescript
export const PART_CONFIG = {
  // ... existing ...

  // Multiselect visual feedback
  MULTISELECT_EMISSIVE_COLOR: '#6644ff',
  MULTISELECT_EMISSIVE_INTENSITY: 0.25,
  MULTISELECT_EDGE_COLOR: '#6644ff',
  MULTISELECT_PREVIEW_OPACITY: 0.7,
  MULTISELECT_PREVIEW_EMISSIVE: '#4444aa',

  // Bounding box visualization
  MULTISELECT_BBOX_COLOR: '#6644ff',
  MULTISELECT_BBOX_LINE_WIDTH: 2,
  MULTISELECT_BBOX_DASH_SIZE: 10,
  MULTISELECT_BBOX_GAP_SIZE: 5,
};
```

### 5.2 Bounding Box Helper

```typescript
const BoundingBoxHelper: React.FC<{
  center: Vector3;
  size: Vector3;
}> = ({ center, size }) => {
  const geometry = useMemo(() => {
    return new BoxGeometry(size.x, size.y, size.z);
  }, [size.x, size.y, size.z]);

  return (
    <lineSegments position={center.toArray()}>
      <edgesGeometry args={[geometry]} />
      <lineDashedMaterial
        color={MULTISELECT_BBOX_COLOR}
        dashSize={MULTISELECT_BBOX_DASH_SIZE}
        gapSize={MULTISELECT_BBOX_GAP_SIZE}
        linewidth={MULTISELECT_BBOX_LINE_WIDTH}
      />
    </lineSegments>
  );
};
```

---

## Phase 6: Batch Operations

### 6.1 Delete Selected

```typescript
// In partsSlice.ts
deleteSelectedParts: () => {
  const { selectedPartIds, parts } = get();
  if (selectedPartIds.size === 0) return;

  // History entry
  const deletedParts = parts.filter(p => selectedPartIds.has(p.id));
  addHistoryEntry({
    type: 'DELETE_MULTISELECT',
    targetIds: Array.from(selectedPartIds),
    before: { parts: deletedParts },
    after: { parts: [] },
  });

  // Single state update
  set({
    parts: parts.filter(p => !selectedPartIds.has(p.id)),
    selectedPartIds: new Set(),
    selectedPartId: null,
  });
};
```

### 6.2 Duplicate Selected

```typescript
duplicateSelectedParts: () => {
  const { selectedPartIds, parts } = get();
  if (selectedPartIds.size === 0) return;

  const selectedParts = parts.filter(p => selectedPartIds.has(p.id));
  const offset: Vector3Tuple = [50, 0, 0]; // 50mm offset

  const duplicates = selectedParts.map(part => ({
    ...part,
    id: generateId(),
    name: `${part.name} (copy)`,
    position: [
      part.position[0] + offset[0],
      part.position[1] + offset[1],
      part.position[2] + offset[2],
    ] as Vector3Tuple,
    cabinetMetadata: undefined, // Remove cabinet association
    group: undefined, // Remove group association
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Single state update
  set({
    parts: [...parts, ...duplicates],
    selectedPartIds: new Set(duplicates.map(p => p.id)),
    selectedPartId: duplicates[0]?.id || null,
  });

  // History entry
  addHistoryEntry({
    type: 'DUPLICATE_MULTISELECT',
    targetIds: duplicates.map(p => p.id),
    before: { parts: [] },
    after: { parts: duplicates },
  });
};
```

### 6.3 Group Selected

```typescript
groupSelectedParts: (groupName: string) => {
  const { selectedPartIds, selectedFurnitureId } = get();
  if (selectedPartIds.size === 0) return;

  const groupId = buildManualGroupId(selectedFurnitureId, groupName);

  updatePartsBatch(
    Array.from(selectedPartIds).map(id => ({
      id,
      patch: { group: groupId },
    }))
  );
};

ungroupSelectedParts: () => {
  const { selectedPartIds } = get();

  updatePartsBatch(
    Array.from(selectedPartIds).map(id => ({
      id,
      patch: { group: undefined },
    }))
  );
};
```

---

## Phase 7: Collision Detection Integration

### 7.1 Multi-Part Collision Check

```typescript
// During multiselect transform preview
const checkMultiSelectCollisions = (
  selectedParts: Part[],
  previewTransforms: Map<string, PreviewTransform>,
  allParts: Part[]
): Set<string> => {
  const collidingIds = new Set<string>();
  const selectedIds = new Set(selectedParts.map(p => p.id));

  // Create virtual parts with preview transforms
  const virtualParts = selectedParts.map(part => ({
    ...part,
    position: previewTransforms.get(part.id)?.position || part.position,
    rotation: previewTransforms.get(part.id)?.rotation || part.rotation,
  }));

  // Check each virtual part against non-selected parts
  const otherParts = allParts.filter(p => !selectedIds.has(p.id));

  for (const virtualPart of virtualParts) {
    for (const other of otherParts) {
      if (checkOBBCollision(virtualPart, other)) {
        collidingIds.add(virtualPart.id);
        break;
      }
    }
  }

  return collidingIds;
};
```

---

## Phase 8: Snap Integration

### 8.1 Multi-Part Snap Points

```typescript
// Generate snap points for multiselect bounding box
const generateMultiSelectSnapPoints = (
  center: Vector3,
  size: Vector3
): SnapPoint[] => {
  const halfSize = size.clone().multiplyScalar(0.5);

  return [
    // Center
    { position: center.clone(), type: 'center' },
    // Corners (8 points)
    ...generateCornerPoints(center, halfSize),
    // Edge midpoints (12 points)
    ...generateEdgeMidpoints(center, halfSize),
    // Face centers (6 points)
    ...generateFaceCenters(center, halfSize),
  ];
};

// Apply snap during transform
const applySnapToMultiSelect = (
  delta: Vector3,
  boundingBox: { center: Vector3; size: Vector3 },
  snapPoints: SnapPoint[],
  tolerance: number
): Vector3 => {
  const testCenter = boundingBox.center.clone().add(delta);
  const candidates = generateMultiSelectSnapPoints(testCenter, boundingBox.size);

  let bestSnap: Vector3 | null = null;
  let bestDistance = tolerance;

  for (const candidate of candidates) {
    for (const target of snapPoints) {
      const distance = candidate.position.distanceTo(target.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSnap = target.position.clone().sub(candidate.position).add(delta);
      }
    }
  }

  return bestSnap || delta;
};
```

---

## Performance Checklist

### Critical Optimizations

1. **Zero store updates during drag**
   - All intermediate state in `useRef`
   - Only `setPreviewVersion(v => v + 1)` for visual updates
   - Single `updatePartsBatch()` on mouseUp

2. **Memoization**
   - `useMemo` for derived calculations (bounding box, selected parts)
   - `React.memo` for preview components
   - `useCallback` for stable handler references

3. **Shallow store access**
   ```typescript
   // ALWAYS use useShallow
   const { selectedPartIds } = useStore(useShallow(state => ({
     selectedPartIds: state.selectedPartIds,
   })));
   ```

4. **Geometry reuse**
   - Use geometry cache for preview meshes
   - Don't recreate geometries on every frame

5. **RAF throttling for pointer move**
   ```typescript
   const rafIdRef = useRef<number | null>(null);

   const handlePointerMove = (e: PointerEvent) => {
     if (rafIdRef.current) return; // Skip if pending

     rafIdRef.current = requestAnimationFrame(() => {
       rafIdRef.current = null;
       // ... process move
     });
   };
   ```

6. **Batch collision detection**
   - Debounce collision checks during drag
   - Use spatial partitioning for large selections

---

## Implementation Order

### Sprint 1: Core Selection (Est. complexity: Medium)
1. [ ] Extend selectionSlice with Set-based selection
2. [ ] Update Part3D click handlers for modifiers
3. [ ] Add keyboard shortcuts (Cmd+A, Escape, Delete)
4. [ ] Update PartsTable for multiselect
5. [ ] Visual feedback (emissive colors)

### Sprint 2: Transform System (Est. complexity: High)
1. [ ] Implement MultiSelectTransformControls
2. [ ] Ref-based preview system
3. [ ] Bounding box calculation and visualization
4. [ ] Relative transform application
5. [ ] Single-commit batch update

### Sprint 3: UI & Operations (Est. complexity: Medium)
1. [ ] MultiSelectPropertiesPanel
2. [ ] Batch delete/duplicate/group
3. [ ] Selection indicator in toolbar
4. [ ] History integration (undo/redo)

### Sprint 4: Advanced Features (Est. complexity: Medium-High)
1. [ ] Marquee selection (box select)
2. [ ] Snap integration for multiselect
3. [ ] Collision detection during transform
4. [ ] Range select (Shift+click in table)

### Sprint 5: Polish (Est. complexity: Low)
1. [ ] Keyboard focus management
2. [ ] Selection persistence across views
3. [ ] Performance profiling and optimization
4. [ ] Edge cases and error handling

---

## Testing Strategy

### Unit Tests
- Selection state mutations
- Bounding box calculations
- Relative transform math
- Collision detection with virtual parts

### Integration Tests
- Click with modifiers (Cmd, Shift)
- Drag transform with preview
- Batch operations (delete, duplicate)
- Undo/redo for multiselect operations

### Performance Tests
- 100+ parts selection
- Transform preview at 60fps
- Memory usage during long drag operations
- Store update batch efficiency

---

## Files to Create/Modify

### New Files
- `src/components/canvas/MultiSelectTransformControls.tsx`
- `src/components/canvas/MultiSelectPreview.tsx`
- `src/components/canvas/MarqueeSelect.tsx`
- `src/components/canvas/BoundingBoxHelper.tsx`
- `src/components/ui/MultiSelectPropertiesPanel.tsx`

### Modified Files
- `src/lib/store/slices/selectionSlice.ts` - Set-based selection
- `src/lib/store/slices/partsSlice.ts` - Batch operations
- `src/lib/store/slices/historySlice.ts` - Multiselect entries
- `src/lib/store/types.ts` - New types
- `src/components/canvas/Part3D.tsx` - Click handlers, visibility
- `src/components/canvas/Scene.tsx` - Add controls
- `src/components/ui/PartsTable.tsx` - Row selection
- `src/components/ui/PropertiesPanel.tsx` - Multiselect mode
- `src/components/GlobalKeyboardListener.tsx` - Shortcuts
- `src/lib/config.ts` - Visual constants
- `src/types/index.ts` - Type definitions
