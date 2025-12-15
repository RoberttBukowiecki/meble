# Snap V2 Implementation Plan

## Overview

Snap V2 is an improved snapping system that works with **external bounding boxes** of objects/groups rather than individual part faces. This provides a more intuitive, user-friendly experience when arranging furniture pieces (cabinets) in a room layout.

### Key Differences from V1

| Feature | V1 (Current) | V2 (New) |
|---------|--------------|----------|
| Snap targets | All individual part faces/edges | External bounding box faces |
| Bounding box type | N/A | OBB (Oriented Bounding Box) |
| Inter-group snap | Part-to-part | BoundingBox-to-BoundingBox |
| Internal snap | Always on | Preserved (within same group) |
| Default | Legacy | New default for users |

---

## Requirements Summary

Based on clarification:

1. **Grouping**: CabinetGroup + single parts + future groups each have their own bounding box
2. **Rotation**: OBB (Oriented Bounding Box) - rotates with the object
3. **Internal snap**: Preserved - parts within same cabinet still snap to each other using V1 logic
4. **Single part drag**: Snaps to external bounding boxes of other groups/cabinets
5. **Visualization**: Guide planes only (no wireframe boxes)
6. **Default**: V2 is default for new users
7. **Protruding parts**: Two bounding boxes (Core BB + Extended BB)
8. **Offset**: Use existing `collisionOffset` parameter

---

## Architecture

### New Types

```typescript
// types/index.ts additions

type SnapVersion = 'v1' | 'v2';

interface OrientedBoundingBox {
  center: [number, number, number];
  halfExtents: [number, number, number]; // Half-size in local space
  rotation: [number, number, number];    // Euler angles (XYZ)
  // Computed from rotation:
  axes: [Vec3, Vec3, Vec3];              // Local X, Y, Z axes in world space
}

interface BoundingBoxFace {
  center: Vec3;
  normal: Vec3;           // Outward-facing normal in world space
  halfSize: [number, number]; // Half-width and half-height
  corners: Vec3[];        // 4 corners in world space
  axisIndex: 0 | 1 | 2;   // Which local axis this face is perpendicular to
  sign: 1 | -1;           // Positive or negative side of axis
}

interface GroupBoundingBoxes {
  groupId: string;                    // cabinetId or partId for single parts
  groupType: 'cabinet' | 'part' | 'selection';
  core: OrientedBoundingBox;          // Main body bounding box
  extended: OrientedBoundingBox;      // Including protruding parts
  faces: {
    core: BoundingBoxFace[];          // 6 faces of core OBB
    extended: BoundingBoxFace[];      // 6 faces of extended OBB
  };
  partIds: string[];                  // Parts included in this group
}

interface SnapV2Candidate {
  type: 'face' | 'edge';
  sourceGroupId: string;
  targetGroupId: string;
  sourceFace: BoundingBoxFace;
  targetFace: BoundingBoxFace;
  snapOffset: [number, number, number];
  distance: number;
  alignment: number;                  // 0-1, how well faces align
  usedExtendedBox: boolean;           // True if snapped to extended BB
}

// Updated SnapSettings
interface SnapSettings {
  distance: number;
  showGuides: boolean;
  magneticPull: boolean;
  strengthCurve: 'linear' | 'quadratic';
  edgeSnap: boolean;
  faceSnap: boolean;
  collisionOffset: number;
  // NEW:
  version: SnapVersion;               // 'v1' | 'v2'
}
```

### File Structure

```
apps/app/src/lib/
├── snapping.ts              # Existing V1 logic (keep as-is)
├── snapping-v2.ts           # NEW: V2 snap calculations
├── obb.ts                   # NEW: OBB math utilities
├── group-bounds.ts          # NEW: Group bounding box calculations
└── snap-context.tsx         # Update to support both versions

apps/app/src/components/
├── canvas/
│   ├── SnapGuidesRenderer.tsx      # Update for V2 guides
│   ├── PartTransformControls.tsx   # Update to use V2
│   ├── MultiSelectTransformControls.tsx  # Update
│   └── CabinetGroupTransform.tsx   # Update
└── layout/
    └── SnapControlPanel.tsx        # Add V2 toggle
```

---

## Implementation Steps

### Phase 1: Core OBB Infrastructure

#### 1.1 Create OBB Math Utilities (`lib/obb.ts`)

```typescript
// Key functions needed:

/**
 * Create OBB from a set of parts with rotation
 */
function createOBBFromParts(
  parts: Part[],
  groupRotation: [number, number, number]
): OrientedBoundingBox;

/**
 * Get 6 faces of OBB in world space
 */
function getOBBFaces(obb: OrientedBoundingBox): BoundingBoxFace[];

/**
 * Calculate distance between two OBB faces
 * Returns null if faces are not opposite-facing
 */
function calculateFaceToFaceDistance(
  faceA: BoundingBoxFace,
  faceB: BoundingBoxFace
): number | null;

/**
 * Check if two OBB faces can snap (opposite normals, within range)
 */
function canFacesSnap(
  faceA: BoundingBoxFace,
  faceB: BoundingBoxFace,
  maxDistance: number
): boolean;

/**
 * Calculate snap offset to align two faces
 * Accounts for collisionOffset
 */
function calculateFaceSnapOffset(
  sourceFace: BoundingBoxFace,
  targetFace: BoundingBoxFace,
  collisionOffset: number
): [number, number, number];

/**
 * Get edges of OBB for edge snapping
 */
function getOBBEdges(obb: OrientedBoundingBox): BoundingEdge[];
```

#### 1.2 Create Group Bounds Calculator (`lib/group-bounds.ts`)

```typescript
/**
 * Calculate core and extended bounding boxes for a cabinet
 */
function calculateCabinetBounds(
  cabinet: Cabinet,
  parts: Part[]
): GroupBoundingBoxes;

/**
 * Calculate bounding box for a single part
 */
function calculatePartBounds(part: Part): GroupBoundingBoxes;

/**
 * Calculate bounding box for multi-selection
 */
function calculateSelectionBounds(
  parts: Part[],
  centroid: [number, number, number],
  rotation: [number, number, number]
): GroupBoundingBoxes;

/**
 * Determine if a part is "protruding" (outside core cabinet body)
 * Used to split core vs extended bounds
 */
function isProtrudingPart(
  part: Part,
  cabinetCoreParts: Part[]
): boolean;

/**
 * Get all group bounding boxes in scene
 * Groups parts by cabinetId, creates individual bounds for loose parts
 */
function getAllGroupBounds(
  parts: Part[],
  cabinets: Cabinet[]
): Map<string, GroupBoundingBoxes>;
```

### Phase 2: V2 Snap Calculations

#### 2.1 Create Snap V2 Engine (`lib/snapping-v2.ts`)

```typescript
/**
 * Main V2 snap calculation
 * Returns best snap candidates for group-to-group snapping
 */
function calculateSnapV2(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  settings: SnapSettings,
  axisConstraint: SnapAxisConstraint
): SnapV2Candidate[];

/**
 * Simple axis-constrained snap for transform controls
 */
function calculateSnapV2Simple(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  axis: 'X' | 'Y' | 'Z',
  settings: SnapSettings
): { snapped: boolean; offset: number; candidate: SnapV2Candidate | null };

/**
 * Score a snap candidate based on distance and alignment
 */
function scoreSnapCandidate(
  candidate: SnapV2Candidate,
  settings: SnapSettings
): number;

/**
 * Filter candidates by axis constraint
 */
function filterCandidatesByAxis(
  candidates: SnapV2Candidate[],
  axis: 'X' | 'Y' | 'Z'
): SnapV2Candidate[];
```

#### 2.2 Edge Snapping for V2

```typescript
/**
 * Calculate edge-to-edge snap between OBBs
 * For alignment (min-to-min, max-to-max edges)
 */
function calculateEdgeSnapV2(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  axis: 'X' | 'Y' | 'Z',
  settings: SnapSettings
): SnapV2Candidate[];
```

### Phase 3: Store & Settings Updates

#### 3.1 Update Snap Slice (`store/slices/snapSlice.ts`)

```typescript
// Add to default settings:
const defaultSnapSettings: SnapSettings = {
  // ... existing
  version: 'v2', // NEW: V2 is default
};

// Add action:
setSnapVersion: (version: SnapVersion) => void;
```

#### 3.2 Update Snap Context (`lib/snap-context.tsx`)

```typescript
interface SnapContextValue {
  // ... existing
  version: SnapVersion;
  groupBounds: Map<string, GroupBoundingBoxes>;
  updateGroupBounds: (bounds: Map<string, GroupBoundingBoxes>) => void;
}
```

### Phase 4: UI Updates

#### 4.1 Update SnapControlPanel

```tsx
// Add toggle switch between V1 and V2

<div className="flex items-center gap-2">
  <Label>Snap Version</Label>
  <Switch
    checked={snapSettings.version === 'v2'}
    onCheckedChange={(checked) =>
      updateSnapSettings({ version: checked ? 'v2' : 'v1' })
    }
  />
  <span className="text-sm text-muted-foreground">
    {snapSettings.version === 'v2' ? 'V2 (Bounding Box)' : 'V1 (Face)'}
  </span>
</div>
```

### Phase 5: Transform Controls Integration

#### 5.1 Update PartTransformControls

```typescript
// In onDrag handler:
if (snapSettings.version === 'v2') {
  // Get bounding boxes for all groups except the one containing this part
  const groupBounds = getAllGroupBounds(parts, cabinets);
  const movingPartBounds = calculatePartBounds(movingPart);

  // Filter out own group
  const targetBounds = Array.from(groupBounds.values())
    .filter(gb => !gb.partIds.includes(partId));

  const snapResult = calculateSnapV2Simple(
    movingPartBounds,
    targetBounds,
    dragAxis,
    snapSettings
  );

  if (snapResult.snapped) {
    applySnapOffset(snapResult.offset, dragAxis);
  }
} else {
  // Existing V1 logic
}
```

#### 5.2 Update CabinetGroupTransform

```typescript
// When moving entire cabinet:
if (snapSettings.version === 'v2') {
  const allBounds = getAllGroupBounds(parts, cabinets);
  const thisCabinetBounds = allBounds.get(cabinetId);

  // Filter to other cabinets/groups only
  const targetBounds = Array.from(allBounds.values())
    .filter(gb => gb.groupId !== cabinetId);

  const snapResult = calculateSnapV2Simple(
    thisCabinetBounds,
    targetBounds,
    dragAxis,
    snapSettings
  );

  // Apply snap...
}
```

#### 5.3 Update MultiSelectTransformControls

Similar to CabinetGroupTransform but creates temporary selection bounds.

### Phase 6: Guide Visualization Updates

#### 6.1 Update SnapGuidesRenderer

```typescript
// V2 uses same guide planes but positions them at bounding box faces
// No additional wireframe rendering needed per requirements

function renderV2Guides(candidates: SnapV2Candidate[]) {
  // Position guide plane at the snap interface between two bounding boxes
  candidates.forEach(candidate => {
    const guidePosition = calculateGuidePosition(
      candidate.sourceFace,
      candidate.targetFace
    );
    // Render semi-transparent plane at interface
  });
}
```

---

## OBB Mathematics Reference

### Creating OBB from Parts

```typescript
function createOBBFromParts(
  parts: Part[],
  groupRotation: [number, number, number]
): OrientedBoundingBox {
  // 1. Create rotation matrix from group rotation
  const rotMatrix = createRotationMatrix(groupRotation);

  // 2. Transform all part corners to group's local space
  const localCorners = parts.flatMap(part => {
    const worldCorners = getPartCorners(part);
    return worldCorners.map(c => transformToLocal(c, rotMatrix));
  });

  // 3. Find min/max in local space
  const min = findMinPoint(localCorners);
  const max = findMaxPoint(localCorners);

  // 4. Calculate center and half-extents
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const halfExtents = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];

  // 5. Transform center back to world space
  const worldCenter = transformToWorld(center, rotMatrix);

  return {
    center: worldCenter,
    halfExtents,
    rotation: groupRotation,
    axes: extractAxes(rotMatrix)
  };
}
```

### Face-to-Face Distance

```typescript
function calculateFaceToFaceDistance(
  faceA: BoundingBoxFace,
  faceB: BoundingBoxFace
): number | null {
  // Check if faces are opposite (normals point toward each other)
  const dotProduct = dot(faceA.normal, faceB.normal);
  if (dotProduct > -0.95) return null; // Not opposite-facing

  // Project face centers onto shared normal
  const normalDir = normalize(faceA.normal);
  const centerDiff = subtract(faceB.center, faceA.center);
  const distance = Math.abs(dot(centerDiff, normalDir));

  return distance;
}
```

### Snap Offset Calculation

```typescript
function calculateFaceSnapOffset(
  sourceFace: BoundingBoxFace,
  targetFace: BoundingBoxFace,
  collisionOffset: number
): [number, number, number] {
  // Direction from source to target face
  const direction = normalize(subtract(targetFace.center, sourceFace.center));

  // Distance to close the gap (minus collision offset)
  const currentDist = calculateFaceToFaceDistance(sourceFace, targetFace);
  const targetDist = collisionOffset;
  const moveDist = currentDist - targetDist;

  return [
    direction[0] * moveDist,
    direction[1] * moveDist,
    direction[2] * moveDist
  ];
}
```

---

## Core vs Extended Bounding Box Logic

### Determining Core Parts

```typescript
function getCoreAndExtendedParts(
  cabinet: Cabinet,
  parts: Part[]
): { core: Part[]; extended: Part[] } {
  const cabinetParts = parts.filter(p => p.cabinetId === cabinet.id);

  // Core parts: sides, back, top, bottom, shelves
  // Extended parts: countertops, decorative elements that exceed cabinet dimensions

  // Strategy: Calculate "expected" cabinet dimensions from cabinet config
  // Parts that exceed these dimensions by more than threshold are "extended"

  const expectedDims = {
    width: cabinet.config.width,
    height: cabinet.config.height,
    depth: cabinet.config.depth
  };

  const threshold = 50; // mm - parts exceeding by more than 50mm are extended

  const core: Part[] = [];
  const extended: Part[] = [];

  cabinetParts.forEach(part => {
    const partBounds = getPartWorldBounds(part);
    const exceedsWidth = partBounds.max.x - partBounds.min.x > expectedDims.width + threshold;
    const exceedsDepth = partBounds.max.z - partBounds.min.z > expectedDims.depth + threshold;

    if (exceedsWidth || exceedsDepth) {
      extended.push(part);
    } else {
      core.push(part);
    }
  });

  return { core, extended };
}
```

### Snap Priority

When snapping, prefer core bounding box matches over extended:

```typescript
function scoreSnapCandidate(candidate: SnapV2Candidate): number {
  let score = 1.0;

  // Distance factor (closer = better)
  score *= 1 - (candidate.distance / snapSettings.distance);

  // Alignment factor
  score *= candidate.alignment;

  // Prefer core BB over extended BB
  if (candidate.usedExtendedBox) {
    score *= 0.8; // 20% penalty for extended box snaps
  }

  return score;
}
```

---

## Internal vs External Snap Decision

```typescript
function shouldUseInternalSnap(
  movingPartId: string,
  targetPartId: string,
  parts: Part[]
): boolean {
  const movingPart = parts.find(p => p.id === movingPartId);
  const targetPart = parts.find(p => p.id === targetPartId);

  // If both parts are in the same cabinet, use V1 (internal) snap
  if (movingPart?.cabinetId &&
      movingPart.cabinetId === targetPart?.cabinetId) {
    return true;
  }

  // Otherwise use V2 (external bounding box) snap
  return false;
}
```

---

## Migration & Backwards Compatibility

### Settings Migration

```typescript
// In store initialization:
const migrateSnapSettings = (stored: unknown): SnapSettings => {
  const settings = stored as Partial<SnapSettings>;

  return {
    distance: settings.distance ?? 20,
    showGuides: settings.showGuides ?? true,
    magneticPull: settings.magneticPull ?? false,
    strengthCurve: settings.strengthCurve ?? 'linear',
    edgeSnap: settings.edgeSnap ?? true,
    faceSnap: settings.faceSnap ?? true,
    collisionOffset: settings.collisionOffset ?? 1.0,
    // NEW: Default to V2 for new users, preserve V1 for existing
    version: settings.version ?? 'v2',
  };
};
```

---

## Testing Strategy

### Unit Tests (`snapping-v2.test.ts`)

1. **OBB Creation**
   - [ ] Create OBB from single part
   - [ ] Create OBB from multiple parts
   - [ ] OBB with rotation applied correctly
   - [ ] Core vs Extended BB separation

2. **Face Calculations**
   - [ ] Get 6 faces from OBB
   - [ ] Face normals point outward
   - [ ] Face corners calculated correctly with rotation

3. **Snap Calculations**
   - [ ] Face-to-face snap detection
   - [ ] Face-to-face offset calculation
   - [ ] Edge-to-edge alignment
   - [ ] Axis constraint filtering
   - [ ] Collision offset applied

4. **Group Bounds**
   - [ ] Cabinet bounds calculated correctly
   - [ ] Single part bounds
   - [ ] Multi-selection bounds
   - [ ] Protruding parts detected

### Integration Tests

1. **Transform Controls**
   - [ ] Single part snaps to cabinet bounding box
   - [ ] Cabinet snaps to cabinet
   - [ ] Multi-selection snaps correctly
   - [ ] Axis constraint respected

2. **Internal vs External**
   - [ ] Parts within same cabinet use V1
   - [ ] Parts in different cabinets use V2
   - [ ] Free-standing parts snap to cabinet BBs

3. **UI**
   - [ ] V2 toggle works
   - [ ] Guide planes render at correct positions
   - [ ] Settings persist

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache group bounds - recalculate only when:
// 1. Parts are added/removed
// 2. Parts are moved/resized
// 3. Cabinet structure changes

const groupBoundsCache = new Map<string, {
  bounds: GroupBoundingBoxes;
  hash: string; // Hash of part positions/dimensions
}>();

function getGroupBoundsWithCache(
  groupId: string,
  parts: Part[],
  cabinets: Cabinet[]
): GroupBoundingBoxes {
  const relevantParts = parts.filter(p => p.cabinetId === groupId || p.id === groupId);
  const hash = computePartsHash(relevantParts);

  const cached = groupBoundsCache.get(groupId);
  if (cached && cached.hash === hash) {
    return cached.bounds;
  }

  const bounds = calculateGroupBounds(groupId, relevantParts, cabinets);
  groupBoundsCache.set(groupId, { bounds, hash });
  return bounds;
}
```

### Early Exit Optimizations

```typescript
function calculateSnapV2(
  movingGroup: GroupBoundingBoxes,
  targetGroups: GroupBoundingBoxes[],
  settings: SnapSettings
): SnapV2Candidate[] {
  const candidates: SnapV2Candidate[] = [];

  for (const target of targetGroups) {
    // Early exit: bounding sphere check
    const centerDist = distance(movingGroup.core.center, target.core.center);
    const maxRadius = Math.max(
      ...movingGroup.core.halfExtents,
      ...target.core.halfExtents
    );

    if (centerDist > maxRadius * 2 + settings.distance) {
      continue; // Too far, skip detailed calculation
    }

    // Detailed face-to-face calculations...
  }

  return candidates;
}
```

---

## Estimated Complexity

| Component | Files | Complexity |
|-----------|-------|------------|
| OBB utilities | 1 | Medium |
| Group bounds | 1 | Medium |
| Snap V2 engine | 1 | High |
| Store updates | 1 | Low |
| UI updates | 1 | Low |
| Transform controls | 3 | Medium |
| Guide renderer | 1 | Low |
| Tests | 2 | Medium |

---

## Implementation Order

1. **Phase 1**: OBB infrastructure (`obb.ts`, `group-bounds.ts`)
2. **Phase 2**: V2 snap calculations (`snapping-v2.ts`)
3. **Phase 3**: Store & settings updates
4. **Phase 4**: UI toggle in SnapControlPanel
5. **Phase 5**: Integrate into transform controls
6. **Phase 6**: Update guide visualization
7. **Phase 7**: Testing & refinement

---

## Open Questions / Future Enhancements

1. **Snap preview**: Show where object will snap before releasing mouse?
2. **Snap strength indicator**: Visual feedback showing snap "pull" strength?
3. **Group definition UI**: Allow users to manually define snap groups?
4. **Nested groups**: Support for groups within groups?
5. **Snap history**: Undo/redo for snap operations?
