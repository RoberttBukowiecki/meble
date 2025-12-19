# Snap V3 Refactor Plan (Comprehensive)

## Overview

V3 is the best snap implementation. This plan covers:
1. Adding debug visualization (from V5)
2. Cleaning up and implementing UI options
3. Reorganizing V3 file structure for clarity
4. Consolidating snap systems
5. Updating UI components

---

## 1. UI Options Analysis

### Current SnapSettings options in UI (SnapControlPanel.tsx):

| Option | UI Label | Used in V3 | Action |
|--------|----------|:----------:|--------|
| `distance` | "Dystans przyciągania" (slider) | ✅ | KEEP |
| `showGuides` | "Pokaż linie przyciągania" | ❌ | KEEP (visual only) |
| `magneticPull` | "Magnetyczne przyciąganie" | ❌ | **IMPLEMENT or REMOVE** |
| `edgeSnap` | "Przyciąganie krawędzi" | ✅ → `enableAlignmentSnap` | KEEP (rename in UI) |
| `faceSnap` | "Przyciąganie powierzchni" | ✅ → `enableConnectionSnap` | KEEP |
| `tJointSnap` | "Przyciąganie T-joint" | ✅ | KEEP |
| `debugV5` | "Debug V5" | ❌ | **RENAME to `debug`** |
| `version` | Radio buttons | ✅ | SIMPLIFY (remove V1, V4, V5) |
| `collisionOffset` | (hidden) | ✅ | KEEP |
| `strengthCurve` | (hidden) | ❌ | **REMOVE** |

### Decisions:

1. **`magneticPull`** - Currently disabled with comment "causes position overwrites during drag"
   - **Decision: REMOVE** - not implemented, causes issues

2. **`strengthCurve`** - Never used anywhere
   - **Decision: REMOVE** - unnecessary complexity

3. **`debugV5`** → **`debug`** - Rename and use for V3
   - **Decision: RENAME** and implement debug for V3

4. **`edgeSnap`** label - Misleading, it's really "alignment snap" (parallel faces)
   - **Decision: RENAME in UI** to "Wyrównanie równoległe" (parallel alignment)

---

## 2. V3 File Reorganization

Current `snapping-v3.ts` is 1107 lines and messy. Reorganize into clear sections:

### Proposed File Structure:

```
apps/app/src/lib/
├── snapping/                    # NEW FOLDER
│   ├── index.ts                 # Main exports
│   ├── types.ts                 # All snap types
│   ├── constants.ts             # Thresholds, config
│   ├── debug.ts                 # Debug state (from V5)
│   ├── core.ts                  # Main algorithm (calculateSnapV3)
│   ├── candidates/
│   │   ├── connection.ts        # Face-to-face (opposite normals)
│   │   ├── alignment.ts         # Parallel faces
│   │   └── tjoint.ts            # Perpendicular faces
│   ├── collision.ts             # AABB collision detection
│   ├── cross-axis.ts            # Cross-axis snapping
│   └── integration.ts           # calculatePartSnapV3, calculatePartSnapV3CrossAxis
│
├── snapping-v2.ts               # KEEP (cabinet groups - different use case)
├── snapping.ts                  # DELETE (old V1)
├── snapping-v4.ts               # DELETE
├── snapping-v5.ts               # DELETE
├── snapping-simple.ts           # DELETE
```

### Alternative (simpler - single file):

Keep as single file but reorganize sections clearly:

```typescript
// ============================================================================
// SECTION 1: TYPES & INTERFACES
// ============================================================================

// ============================================================================
// SECTION 2: CONSTANTS
// ============================================================================

// ============================================================================
// SECTION 3: DEBUG STATE (NEW - from V5)
// ============================================================================

// ============================================================================
// SECTION 4: MAIN ALGORITHM
// ============================================================================

// ============================================================================
// SECTION 5: CANDIDATE GENERATION
//   5.1: Connection Snap (opposite normals)
//   5.2: Alignment Snap (parallel normals)
//   5.3: T-Joint Snap (perpendicular normals)
// ============================================================================

// ============================================================================
// SECTION 6: COLLISION DETECTION
// ============================================================================

// ============================================================================
// SECTION 7: CROSS-AXIS SNAPPING
// ============================================================================

// ============================================================================
// SECTION 8: INTEGRATION API (for PartTransformControls)
// ============================================================================

// ============================================================================
// SECTION 9: EXPORTS
// ============================================================================
```

---

## 3. Debug State Implementation

### Add to V3 (copy pattern from V5):

```typescript
// ============================================================================
// DEBUG STATE
// ============================================================================

export interface SnapV3DebugInfo {
  // Moving part info
  movingPartId: string;
  movingOBB: OrientedBoundingBox;
  movingFaces: OBBFace[];

  // Filtered faces
  relevantFaces: OBBFace[];      // Perpendicular to drag axis
  leadingFaces: OBBFace[];       // Pointing in movement direction

  // Target parts
  targetParts: Array<{
    partId: string;
    obb: OrientedBoundingBox;
    faces: OBBFace[];
  }>;

  // Candidates
  allCandidates: SnapV3Candidate[];
  connectionCandidates: SnapV3Candidate[];
  alignmentCandidates: SnapV3Candidate[];
  tjointCandidates: SnapV3Candidate[];
  selectedCandidate: SnapV3Candidate | null;

  // Context
  dragAxis: 'X' | 'Y' | 'Z';
  movementDirection: 1 | -1;
  currentOffset: Vec3;

  // V3-specific
  hysteresisActive: boolean;
  previousSnap?: {
    sourceFaceId: string;
    targetFaceId: string;
    offset: number;
  };
  crossAxisEnabled: boolean;
  crossAxisTargets?: CrossAxisTarget[];
}

// Global debug state for visualization
export let lastSnapV3Debug: SnapV3DebugInfo | null = null;

// Function to update debug state
function updateDebugState(info: Partial<SnapV3DebugInfo>): void {
  lastSnapV3Debug = lastSnapV3Debug
    ? { ...lastSnapV3Debug, ...info }
    : info as SnapV3DebugInfo;
}

// Function to clear debug state
export function clearSnapV3Debug(): void {
  lastSnapV3Debug = null;
}
```

### Create SnapV3DebugRenderer.tsx:

Copy `SnapV5DebugRenderer.tsx` and modify:
- Import from `snapping-v3` instead of `snapping-v5`
- Add visualization for:
  - Hysteresis state (highlight when active)
  - T-joint candidates (purple)
  - Cross-axis targets (orange)

---

## 4. SnapSettings Type Cleanup

### Before:
```typescript
export interface SnapSettings {
  distance: number;
  showGuides: boolean;           // KEEP
  magneticPull: boolean;         // REMOVE
  strengthCurve: 'linear' | 'quadratic';  // REMOVE
  edgeSnap: boolean;             // KEEP (rename to alignmentSnap?)
  faceSnap: boolean;             // KEEP (rename to connectionSnap?)
  tJointSnap: boolean;           // KEEP
  collisionOffset: number;       // KEEP
  version: SnapVersion;          // KEEP but simplify
  debugV5?: boolean;             // RENAME to debug
}
```

### After:
```typescript
export interface SnapSettings {
  // Core settings
  distance: number;              // Snap threshold in mm (default: 20)
  collisionOffset: number;       // Gap between snapped faces (default: 1.0)

  // Snap types
  connectionSnap: boolean;       // Face-to-face (opposite normals) - was faceSnap
  alignmentSnap: boolean;        // Parallel face alignment - was edgeSnap
  tJointSnap: boolean;           // T-joint (perpendicular faces)

  // Visualization
  showGuides: boolean;           // Show snap guide lines
  debug: boolean;                // Show debug visualization (OBB, faces, etc.)

  // Version (simplified)
  version: 'v2' | 'v3';          // v2 for cabinet groups, v3 for parts
}
```

### Migration:
- `faceSnap` → `connectionSnap`
- `edgeSnap` → `alignmentSnap`
- `debugV5` → `debug`
- Remove: `magneticPull`, `strengthCurve`
- Remove versions: `v1`, `v4`, `v5`

---

## 5. UI Updates

### SnapControlPanel.tsx changes:

```tsx
// Version selection - simplified
<DropdownMenuRadioGroup value={snapSettings.version} onValueChange={handleVersionChange}>
  <DropdownMenuRadioItem value="v3" className="text-sm">
    Przyciąganie części (zalecane)
  </DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="v2" className="text-sm">
    Obwiednia szafy
  </DropdownMenuRadioItem>
</DropdownMenuRadioGroup>

// Snap types - renamed
<DropdownMenuCheckboxItem
  checked={snapSettings.connectionSnap}
  onCheckedChange={(checked) => updateSnapSettings({ connectionSnap: checked })}
>
  Przyciąganie powierzchni (naprzeciwległe)
</DropdownMenuCheckboxItem>

<DropdownMenuCheckboxItem
  checked={snapSettings.alignmentSnap}
  onCheckedChange={(checked) => updateSnapSettings({ alignmentSnap: checked })}
>
  Wyrównanie równoległe
</DropdownMenuCheckboxItem>

<DropdownMenuCheckboxItem
  checked={snapSettings.tJointSnap}
  onCheckedChange={(checked) => updateSnapSettings({ tJointSnap: checked })}
>
  Przyciąganie T-joint (prostopadłe)
</DropdownMenuCheckboxItem>

// Debug - now for V3
<DropdownMenuCheckboxItem
  checked={snapSettings.debug ?? false}
  onCheckedChange={(checked) => updateSnapSettings({ debug: checked })}
>
  Tryb debugowania (pokaż OBB)
</DropdownMenuCheckboxItem>

// REMOVE magneticPull checkbox entirely
```

---

## 6. PartTransformControls.tsx Updates

```tsx
// Simplified snap version handling
if (snapSettings.version === 'v3') {
  snapResult = calculatePartSnapV3(
    part, position, parts, cabinets, snapSettings, effectiveAxis
  );
} else if (snapSettings.version === 'v2') {
  snapResult = calculatePartSnapV2(
    part, position, parts, cabinets, snapSettings, effectiveAxis
  );
}
// Remove v1, v4, v5 branches
```

---

## 7. Cross-Axis Fix

Replace the hacky 50x multiplier with proper logic:

```typescript
// BEFORE (hacky):
const effectiveSnapDistance = isCrossAxis
  ? settings.distance * 50
  : settings.distance;

// AFTER (proper):
function getCrossAxisSnapDistance(
  movingAABB: AABB,
  targetAABB: AABB,
  baseDistance: number
): number {
  // Calculate overlap area on perpendicular axes
  const overlapFactor = calculateOverlapFactor(movingAABB, targetAABB);

  // Scale distance based on how much parts overlap
  // Full overlap (1.0) = 3x distance
  // Partial overlap (0.5) = 2x distance
  // No overlap (0.0) = base distance
  return baseDistance * (1 + overlapFactor * 2);
}
```

---

## 8. Files to Delete

After consolidation:
- `apps/app/src/lib/snapping.ts` (V1)
- `apps/app/src/lib/snapping-v4.ts`
- `apps/app/src/lib/snapping-v5.ts`
- `apps/app/src/lib/snapping-simple.ts`
- `apps/app/src/components/canvas/SnapV5DebugRenderer.tsx` (replaced by V3 version)

---

## 9. Files to Create

- `apps/app/src/components/canvas/SnapDebugRenderer.tsx` (generic, works with V3)

---

## 10. Implementation Order

### Phase 1: Non-breaking additions (2-3h)
1. Add debug state to V3 (copy from V5)
2. Create `SnapDebugRenderer.tsx` (copy from V5, use V3 debug state)
3. Add `debug` option to SnapSettings (alongside `debugV5`)
4. Test debug visualization works with V3

### Phase 2: Settings cleanup (1-2h)
1. Add migration for old settings → new settings
2. Rename `faceSnap` → `connectionSnap`, `edgeSnap` → `alignmentSnap`
3. Remove `magneticPull`, `strengthCurve` from type
4. Update `snapSlice.ts` defaults
5. Update `SnapControlPanel.tsx` UI

### Phase 3: V3 file reorganization (2-3h)
1. Reorganize sections in `snapping-v3.ts`
2. Add clear section headers and comments
3. Improve variable naming for clarity
4. Fix cross-axis 50x hack

### Phase 4: Consolidation (2h)
1. Remove V1, V4, V5, simple from codebase
2. Update `PartTransformControls.tsx` imports
3. Simplify `SnapVersion` type
4. Remove `SnapV5DebugRenderer.tsx`
5. Rename `snapping-v3.ts` → `snapping.ts` (optional)

### Phase 5: Testing (1-2h)
- [ ] Face-to-face snapping (connection)
- [ ] Parallel face alignment
- [ ] T-joint snapping
- [ ] Rotated parts snapping
- [ ] Cross-axis snapping
- [ ] Hysteresis stability
- [ ] Collision prevention
- [ ] Debug visualization
- [ ] All UI toggles work

---

## 11. Estimated Total Effort

- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 2-3 hours
- Phase 4: 2 hours
- Phase 5: 1-2 hours

**Total: 8-12 hours**

---

## 12. V3 Code Quality Improvements

### Current issues to fix:

1. **Duplicate code** - `calculatePartSnapV3` and `calculatePartSnapV3CrossAxis` share logic
2. **Magic numbers** - `50` for cross-axis, `0.9` for thresholds scattered
3. **Unclear naming** - `sourceFace` vs `movingFace` used inconsistently
4. **Missing JSDoc** - Some functions lack documentation
5. **Long functions** - `generateCandidates` is too long, split into helpers
6. **Type inconsistency** - Mix of `Vec3` and `[number, number, number]`

### Naming conventions to apply:

```typescript
// Faces
movingFace      // Face on the part being dragged
targetFace      // Face on a stationary part

// Snaps
connectionSnap  // Opposite normals (face-to-face)
alignmentSnap   // Parallel normals (coplanar)
tjointSnap      // Perpendicular normals (edge-to-face)

// Position
currentPosition // World position after drag
originalPosition // Position before drag started
snapOffset      // How much to adjust from current position
```
