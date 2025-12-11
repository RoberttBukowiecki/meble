# History Implementation Plan - Undo/Redo System

## Overview
Implementation of an undo/redo system with transaction-based history, timeline UI, and keyboard shortcuts for the furniture design application.

## Project Context
- **Language:** Code & comments in English, UI text in Polish
- **State Management:** Zustand with persist middleware (localStorage)
- **Store Structure:** Multiple slices (selection, materials, furniture, parts, cabinet, collision)
- **Current Version:** v2 (will upgrade to v3 with history support)
- **Key Constraint:** Minimize localStorage writes; use deltas not snapshots

---

## Phase 1: Types & Constants Setup

### Task 1.1: Define History Types
**File:** `apps/app/src/types/index.ts`

Add new type definitions:

```typescript
// History entry types
export type HistoryEntryType =
  | 'ADD_PART'
  | 'REMOVE_PART'
  | 'UPDATE_PART'
  | 'TRANSFORM_PART'
  | 'DUPLICATE_PART'
  | 'ADD_CABINET'
  | 'REMOVE_CABINET'
  | 'UPDATE_CABINET'
  | 'REGENERATE_CABINET'
  | 'SELECTION'
  | 'MILESTONE';

export type HistoryEntryKind =
  | 'geometry'
  | 'material'
  | 'cabinet'
  | 'selection'
  | 'misc';

export interface HistoryEntryMeta {
  id: string;
  timestamp: number;
  label: string;
  batchingId?: string;
  isMilestone?: boolean;
  kind: HistoryEntryKind;
}

export interface HistoryEntry {
  type: HistoryEntryType;
  targetId?: string;
  targetIds?: string[];
  furnitureId?: string;
  cabinetId?: string;
  before?: Partial<any>; // Will be properly typed per entry type
  after?: Partial<any>;
  meta: HistoryEntryMeta;
}

// Transform-specific types
export interface TransformSnapshot {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
}

// Cabinet regeneration snapshot
export interface CabinetRegenerationSnapshot {
  cabinetParams?: Partial<Cabinet>;
  partIds: string[];
  parts: Part[];
  partIdMap?: Record<string, string>; // old -> new
}
```

**Checklist:**
- [x] Add all history types to `types/index.ts`
- [x] Ensure all types are exported
- [x] Use English naming conventions
- [x] Add JSDoc comments for complex types

---

### Task 1.2: Create History Constants
**File:** `apps/app/src/lib/store/history/constants.ts` (new)

```typescript
export const HISTORY_MAX_LENGTH = 100;
export const HISTORY_MAX_MILESTONES = 10;
export const HISTORY_MAX_SIZE_BYTES = 10_000_000; // 10MB
export const HISTORY_PERSIST_VERSION = 3;

// Polish labels for UI (will be moved to i18n later)
export const HISTORY_LABELS: Record<HistoryEntryType, string> = {
  ADD_PART: 'Dodano część',
  REMOVE_PART: 'Usunięto część',
  UPDATE_PART: 'Zaktualizowano część',
  TRANSFORM_PART: 'Przesunięto część',
  DUPLICATE_PART: 'Powielono część',
  ADD_CABINET: 'Dodano szafkę',
  REMOVE_CABINET: 'Usunięto szafkę',
  UPDATE_CABINET: 'Zaktualizowano szafkę',
  REGENERATE_CABINET: 'Przebudowano szafkę',
  SELECTION: 'Wybór elementu',
  MILESTONE: 'Punkt kontrolny',
};
```

**Checklist:**
- [x] Create `history/` directory under `lib/store/`
- [x] Add all constants with proper typing
- [x] Document Polish labels (to be moved to i18n before release)

---

## Phase 2: History Slice Implementation

### Task 2.1: Create History Slice Structure
**File:** `apps/app/src/lib/store/slices/historySlice.ts` (new)

Base structure:

```typescript
import { StateCreator } from 'zustand';
import type { StoreState, HistorySlice } from '../types';
import { HISTORY_MAX_LENGTH, HISTORY_MAX_MILESTONES } from '../history/constants';

export const createHistorySlice: StateCreator<
  StoreState,
  [['zustand/persist', unknown]],
  [],
  HistorySlice
> = (set, get) => ({
  // State
  undoStack: [],
  redoStack: [],
  milestoneStack: [],
  inFlightBatch: null,
  limit: HISTORY_MAX_LENGTH,
  milestoneLimit: HISTORY_MAX_MILESTONES,
  approxByteSize: 0,

  // Selectors (computed)
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // Actions (to be implemented in next tasks)
  beginBatch: (type, meta) => { /* TODO */ },
  commitBatch: (afterState) => { /* TODO */ },
  cancelBatch: () => { /* TODO */ },
  undo: () => { /* TODO */ },
  redo: () => { /* TODO */ },
  pushEntry: (entry) => { /* TODO */ },
  clearHistory: () => { /* TODO */ },
  jumpTo: (entryId) => { /* TODO */ },
  setTimelineCursor: (entryId) => { /* TODO */ },
  runWithHistory: (entryBuilder, mutator) => { /* TODO */ },
});
```

**Checklist:**
- [x] Create file with basic structure
- [x] Import necessary types
- [x] Define state properties
- [x] Add selector functions
- [x] Leave action implementations as TODO for next tasks

---

### Task 2.2: Implement History Slice Types
**File:** `apps/app/src/lib/store/types.ts`

Add `HistorySlice` interface:

```typescript
export interface HistorySlice {
  // State
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  milestoneStack: HistoryEntry[];
  inFlightBatch: {
    type: HistoryEntryType;
    meta: Partial<HistoryEntryMeta>;
    before?: any;
  } | null;
  limit: number;
  milestoneLimit: number;
  approxByteSize: number;

  // Selectors
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  beginBatch: (type: HistoryEntryType, meta: { targetId?: string; before?: any }) => void;
  commitBatch: (afterState: { after?: any }) => void;
  cancelBatch: () => void;
  undo: () => void;
  redo: () => void;
  pushEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  jumpTo: (entryId: string) => void;
  setTimelineCursor: (entryId: string | null) => void;
  runWithHistory: <T>(
    entryBuilder: (result: T) => HistoryEntry,
    mutator: () => T
  ) => T;
}

// Update StoreState to include HistorySlice
export type StoreState =
  & SelectionSlice
  & MaterialsSlice
  & FurnitureSlice
  & PartsSlice
  & CabinetSlice
  & CollisionSlice
  & HistorySlice; // Add this
```

**Checklist:**
- [x] Add `HistorySlice` interface
- [x] Update `StoreState` type to include `HistorySlice`
- [x] Ensure all methods are properly typed
- [x] No `any` types (use specific types or generics)

---

### Task 2.3: Implement Batch Operations
**File:** `apps/app/src/lib/store/slices/historySlice.ts`

Implement `beginBatch`, `commitBatch`, `cancelBatch`:

```typescript
beginBatch: (type, meta) => {
  set({
    inFlightBatch: {
      type,
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        kind: inferKindFromType(type),
        ...meta,
      },
      before: meta.before,
    },
  });
},

commitBatch: (afterState) => {
  const { inFlightBatch } = get();
  if (!inFlightBatch) return;

  const { type, meta, before } = inFlightBatch;
  const { after } = afterState;

  // Skip if no actual change
  if (isEqual(before, after)) {
    set({ inFlightBatch: null });
    return;
  }

  const entry: HistoryEntry = {
    type,
    meta: {
      ...meta,
      label: HISTORY_LABELS[type],
    } as HistoryEntryMeta,
    before,
    after,
  };

  get().pushEntry(entry);
  set({ inFlightBatch: null });
},

cancelBatch: () => {
  set({ inFlightBatch: null });
},
```

**Checklist:**
- [x] Implement `beginBatch` with UUID generation
- [x] Implement `commitBatch` with change detection
- [x] Implement `cancelBatch`
- [x] Add helper `inferKindFromType()`
- [x] Add helper `isEqual()` for deep comparison

---

### Task 2.4: Implement Stack Management
**File:** `apps/app/src/lib/store/slices/historySlice.ts`

Implement `pushEntry`, stack trimming, and size estimation:

```typescript
pushEntry: (entry) => {
  const { undoStack, limit, milestoneLimit, milestoneStack } = get();

  // Add to undo stack
  let newUndoStack = [...undoStack, entry];

  // Handle milestones
  let newMilestoneStack = [...milestoneStack];
  if (entry.meta.isMilestone) {
    newMilestoneStack.push(entry);
    if (newMilestoneStack.length > milestoneLimit) {
      newMilestoneStack = newMilestoneStack.slice(-milestoneLimit);
    }
  }

  // Trim undo stack
  if (newUndoStack.length > limit) {
    // Remove oldest non-milestone entries first
    const toRemove = newUndoStack.length - limit;
    const nonMilestones = newUndoStack.filter(e => !e.meta.isMilestone);
    const milestones = newUndoStack.filter(e => e.meta.isMilestone);

    if (nonMilestones.length >= toRemove) {
      newUndoStack = [
        ...milestones,
        ...nonMilestones.slice(toRemove),
      ].sort((a, b) => a.meta.timestamp - b.meta.timestamp);
    } else {
      newUndoStack = newUndoStack.slice(-limit);
    }
  }

  // Estimate size
  const approxByteSize = estimateByteSize(newUndoStack, newMilestoneStack);

  set({
    undoStack: newUndoStack,
    redoStack: [], // Clear redo stack on new action
    milestoneStack: newMilestoneStack,
    approxByteSize,
  });
},

clearHistory: () => {
  set({
    undoStack: [],
    redoStack: [],
    milestoneStack: [],
    inFlightBatch: null,
    approxByteSize: 0,
  });
},
```

**Checklist:**
- [x] Implement `pushEntry` with stack trimming
- [x] Handle milestone preservation
- [x] Clear redo stack on new entry
- [x] Add `estimateByteSize()` helper
- [x] Implement `clearHistory`

---

### Task 2.5: Implement Undo/Redo Operations
**File:** `apps/app/src/lib/store/slices/historySlice.ts`

Implement core undo/redo logic:

```typescript
undo: () => {
  const { undoStack, redoStack } = get();
  if (undoStack.length === 0) return;

  const entry = undoStack[undoStack.length - 1];

  // Apply reverse operation
  applyHistoryEntry(entry, 'undo', get, set);

  // Move entry to redo stack
  set({
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, entry],
  });

  // Trigger collision detection
  get().triggerDebouncedCollisionDetection?.();
},

redo: () => {
  const { redoStack } = get();
  if (redoStack.length === 0) return;

  const entry = redoStack[redoStack.length - 1];

  // Apply forward operation
  applyHistoryEntry(entry, 'redo', get, set);

  // Move entry back to undo stack
  set({
    undoStack: [...get().undoStack, entry],
    redoStack: redoStack.slice(0, -1),
  });

  // Trigger collision detection
  get().triggerDebouncedCollisionDetection?.();
},
```

**Checklist:**
- [x] Implement `undo` operation
- [x] Implement `redo` operation
- [x] Create `applyHistoryEntry()` helper function
- [x] Ensure collision detection is triggered
- [x] Handle edge cases (empty stacks)

---

### Task 2.6: Implement History Application Logic
**File:** `apps/app/src/lib/store/history/apply.ts` (new)

Create helper to apply history entries:

```typescript
export function applyHistoryEntry(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState>) => void
): void {
  const state = direction === 'undo' ? entry.before : entry.after;

  switch (entry.type) {
    case 'ADD_PART':
      if (direction === 'undo') {
        // Remove the added part
        get().removePart(entry.targetId!, false); // false = skip history
      } else {
        // Re-add the part
        get().addPart(state as Part, false);
      }
      break;

    case 'REMOVE_PART':
      if (direction === 'undo') {
        // Restore the removed part
        get().addPart(state as Part, false);
      } else {
        // Remove again
        get().removePart(entry.targetId!, false);
      }
      break;

    case 'TRANSFORM_PART':
    case 'UPDATE_PART':
      get().updatePart(entry.targetId!, state, false);
      break;

    case 'DUPLICATE_PART':
      // Handle duplication (similar to ADD_PART)
      if (direction === 'undo') {
        get().removePart(entry.targetId!, false);
      } else {
        get().addPart(state as Part, false);
      }
      break;

    case 'ADD_CABINET':
    case 'REMOVE_CABINET':
    case 'UPDATE_CABINET':
    case 'REGENERATE_CABINET':
      // Handle cabinet operations
      applyCabinetHistory(entry, direction, get, set);
      break;

    default:
      console.warn(`Unknown history entry type: ${entry.type}`);
  }
}

function applyCabinetHistory(/*...*/): void {
  // TODO: Implement cabinet-specific history application
}
```

**Checklist:**
- [x] Create `apply.ts` helper file
- [x] Implement `applyHistoryEntry` for all entry types
- [x] Add cabinet history application logic
- [ ] Update slice methods to accept `skipHistory` (Phase 3) parameter
- [x] Handle part index restoration for removed parts

---

### Task 2.7: Implement Timeline Jump
**File:** `apps/app/src/lib/store/slices/historySlice.ts`

Add timeline navigation:

```typescript
jumpTo: (entryId) => {
  const { undoStack, redoStack } = get();
  const allEntries = [...undoStack, ...redoStack.reverse()];

  const targetIndex = allEntries.findIndex(e => e.meta.id === entryId);
  if (targetIndex === -1) return;

  const currentIndex = undoStack.length - 1;

  if (targetIndex < currentIndex) {
    // Jump backwards (undo multiple times)
    const stepsToUndo = currentIndex - targetIndex;
    for (let i = 0; i < stepsToUndo; i++) {
      get().undo();
    }
  } else if (targetIndex > currentIndex) {
    // Jump forwards (redo multiple times)
    const stepsToRedo = targetIndex - currentIndex;
    for (let i = 0; i < stepsToRedo; i++) {
      get().redo();
    }
  }
},

setTimelineCursor: (entryId) => {
  // Optional: store UI cursor position
  set({ timelineCursor: entryId });
},
```

**Checklist:**
- [x] Implement `jumpTo` with multi-step undo/redo
- [x] Add `setTimelineCursor` for UI state
- [ ] Test jumping backwards and forwards (Phase 6)
- [x] Ensure collision detection runs after jump

---

### Task 2.8: Implement runWithHistory Helper
**File:** `apps/app/src/lib/store/slices/historySlice.ts`

Add convenience helper for atomic operations:

```typescript
runWithHistory: (entryBuilder, mutator) => {
  const result = mutator();
  const entry = entryBuilder(result);
  get().pushEntry(entry);
  return result;
},
```

**Checklist:**
- [x] Implement `runWithHistory` helper
- [x] Add TypeScript generic for proper typing
- [ ] Document usage examples in JSDoc (Phase 7)

---

## Phase 3: Store Integration

### Task 3.1: Update Store Index
**File:** `apps/app/src/lib/store/index.ts`

Wire up history slice:

```typescript
import { createHistorySlice } from './slices/historySlice';

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createSelectionSlice(...args),
      ...createMaterialsSlice(...args),
      ...createFurnitureSlice(...args),
      ...createPartsSlice(...args),
      ...createCabinetSlice(...args),
      ...createCollisionSlice(...args),
      ...createHistorySlice(...args), // Add this
    }),
    {
      name: 'meblarz-storage',
      version: 3, // Bump version
      migrate: migrateStore,
      partialize: (state) => {
        // Remove functions but keep history stacks
        const {
          canUndo,
          canRedo,
          beginBatch,
          commitBatch,
          cancelBatch,
          undo,
          redo,
          pushEntry,
          clearHistory,
          jumpTo,
          setTimelineCursor,
          runWithHistory,
          ...rest
        } = state;
        return rest;
      },
    }
  )
);
```

**Checklist:**
- [x] Import `createHistorySlice`
- [x] Add to store creation
- [x] Update version to 3
- [x] Configure `partialize` to exclude functions
- [x] Keep history stacks in persisted state

---

### Task 3.2: Implement Store Migration
**File:** `apps/app/src/lib/store/migrations.ts` (new or update existing)

Add v2 → v3 migration:

```typescript
export function migrateStore(persistedState: any, version: number): StoreState {
  if (version === 2) {
    // Migrate v2 to v3: add empty history
    return {
      ...persistedState,
      undoStack: [],
      redoStack: [],
      milestoneStack: [],
      inFlightBatch: null,
      limit: HISTORY_MAX_LENGTH,
      milestoneLimit: HISTORY_MAX_MILESTONES,
      approxByteSize: 0,
      timelineCursor: null,
    };
  }

  return persistedState as StoreState;
}
```

**Checklist:**
- [x] Create or update migration function
- [x] Handle v2 → v3 migration
- [x] Initialize all history fields
- [ ] Test migration with existing localStorage (Phase 6) data
- [ ] Clear test data and verify fresh start (Phase 6)

---

### Task 3.3: Update PartsSlice with History
**File:** `apps/app/src/lib/store/slices/partsSlice.ts`

Add history recording to parts operations:

```typescript
addPart: (part, skipHistory = false) => {
  // Generate ID if not present
  const newPart = { ...part, id: part.id || crypto.randomUUID() };

  set((state) => ({
    parts: [...state.parts, newPart],
  }));

  if (!skipHistory) {
    get().pushEntry({
      type: 'ADD_PART',
      targetId: newPart.id,
      furnitureId: get().selectedFurnitureId,
      after: newPart,
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.ADD_PART,
        kind: 'geometry',
      },
    });
  }
},

removePart: (partId, skipHistory = false) => {
  const part = get().parts.find(p => p.id === partId);
  if (!part) return;

  const partIndex = get().parts.findIndex(p => p.id === partId);

  if (!skipHistory) {
    get().pushEntry({
      type: 'REMOVE_PART',
      targetId: partId,
      furnitureId: get().selectedFurnitureId,
      before: { ...part, _index: partIndex },
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.REMOVE_PART,
        kind: 'geometry',
      },
    });
  }

  set((state) => ({
    parts: state.parts.filter(p => p.id !== partId),
  }));

  // Clear selection if removed part was selected
  if (get().selectedPartId === partId) {
    get().setSelectedPartId(null);
  }
},

updatePart: (partId, updates, skipHistory = false) => {
  // Note: updatePart is called per-frame during transforms
  // History is only recorded via batch commit, not here
  set((state) => ({
    parts: state.parts.map(p =>
      p.id === partId ? { ...p, ...updates } : p
    ),
  }));
},

duplicatePart: (partId, skipHistory = false) => {
  const original = get().parts.find(p => p.id === partId);
  if (!original) return;

  const duplicate = {
    ...original,
    id: crypto.randomUUID(),
    position: [
      original.position[0] + 50,
      original.position[1],
      original.position[2],
    ] as [number, number, number],
  };

  set((state) => ({
    parts: [...state.parts, duplicate],
  }));

  if (!skipHistory) {
    get().pushEntry({
      type: 'DUPLICATE_PART',
      targetId: duplicate.id,
      furnitureId: get().selectedFurnitureId,
      after: duplicate,
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.DUPLICATE_PART,
        kind: 'geometry',
      },
    });
  }

  return duplicate.id;
},
```

**Checklist:**
- [x] Add `skipHistory` parameter to all mutating methods
- [x] Record history in `addPart`
- [x] Record history in `removePart` (with index)
- [x] Skip history in `updatePart` (handled by batch)
- [x] Record history in `duplicatePart`
- [x] Update method signatures in types

---

### Task 3.4: Update CabinetSlice with History
**File:** `apps/app/src/lib/store/slices/cabinetSlice.ts`

Add history for cabinet operations:

```typescript
addCabinet: (cabinet, skipHistory = false) => {
  const newCabinet = { ...cabinet, id: cabinet.id || crypto.randomUUID() };

  set((state) => ({
    cabinets: [...state.cabinets, newCabinet],
  }));

  if (!skipHistory) {
    get().pushEntry({
      type: 'ADD_CABINET',
      targetId: newCabinet.id,
      furnitureId: get().selectedFurnitureId,
      after: newCabinet,
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.ADD_CABINET,
        kind: 'cabinet',
      },
    });
  }
},

// Similar updates for removeCabinet, updateCabinet, etc.
// For regeneration, capture full snapshot:

regenerateCabinet: (cabinetId, skipHistory = false) => {
  const cabinet = get().cabinets.find(c => c.id === cabinetId);
  if (!cabinet) return;

  const oldParts = get().parts.filter(p => p.cabinetId === cabinetId);
  const oldPartIds = oldParts.map(p => p.id);

  // Perform regeneration
  const { newParts, updatedCabinet } = regenerateCabinetParts(cabinet, get);

  // Update store
  set((state) => ({
    parts: [
      ...state.parts.filter(p => p.cabinetId !== cabinetId),
      ...newParts,
    ],
    cabinets: state.cabinets.map(c =>
      c.id === cabinetId ? updatedCabinet : c
    ),
  }));

  if (!skipHistory) {
    const partIdMap = createPartIdMap(oldParts, newParts);

    get().pushEntry({
      type: 'REGENERATE_CABINET',
      targetId: cabinetId,
      before: {
        cabinetParams: cabinet,
        partIds: oldPartIds,
        parts: oldParts,
      },
      after: {
        cabinetParams: updatedCabinet,
        partIds: newParts.map(p => p.id),
        partIdMap,
      },
      meta: {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.REGENERATE_CABINET,
        kind: 'cabinet',
        isMilestone: true, // Mark regenerations as milestones
      },
    });
  }
},
```

**Checklist:**
- [x] Add `skipHistory` to all cabinet methods
- [x] Capture full part snapshot for regeneration
- [x] Create part ID mapping helper
- [x] Mark regenerations as milestones
- [ ] Handle cabinet removal with associated parts (TODO)

---

### Task 3.5: Integrate Transform Controls
**File:** `apps/app/src/components/canvas/PartTransformControls.tsx`

Add batch tracking to transform controls:

```typescript
const PartTransformControls = ({ partId }: Props) => {
  const part = useStore(state => state.parts.find(p => p.id === partId));
  const updatePart = useStore(state => state.updatePart);
  const setIsTransforming = useStore(state => state.setIsTransforming);
  const beginBatch = useStore(state => state.beginBatch);
  const commitBatch = useStore(state => state.commitBatch);
  const cancelBatch = useStore(state => state.cancelBatch);

  const controlsRef = useRef<TransformControls>(null);

  const handleMouseDown = useCallback(() => {
    if (!part) return;

    // Start history batch
    beginBatch('TRANSFORM_PART', {
      targetId: partId,
      before: {
        position: [...part.position],
        rotation: [...part.rotation],
      },
    });

    setIsTransforming(true);
  }, [part, partId, beginBatch, setIsTransforming]);

  const handleMouseUp = useCallback(() => {
    if (!part) return;

    // Commit history batch
    commitBatch({
      after: {
        position: [...part.position],
        rotation: [...part.rotation],
      },
    });

    setIsTransforming(false);
  }, [part, commitBatch, setIsTransforming]);

  const handleChange = useCallback(() => {
    if (!controlsRef.current || !part) return;

    const { position, rotation } = controlsRef.current.object;

    // Update part (no history - handled by batch)
    updatePart(partId, {
      position: position.toArray(),
      rotation: rotation.toArray(),
    });
  }, [partId, updatePart]);

  return (
    <TransformControls
      ref={controlsRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onChange={handleChange}
    >
      {/* ... */}
    </TransformControls>
  );
};
```

**Checklist:**
- [x] Add `beginBatch` call on mouse down
- [x] Add `commitBatch` call on mouse up
- [x] Capture before/after transform state
- [x] Ensure updatePart doesn't record history during drag
- [ ] Test with position, rotation, and scale transforms (Phase 6)
- [ ] Handle touch events (TODO) (pointerdown/pointerup)

---

## Phase 4: Keyboard Shortcuts & UI

### Task 4.1: Create Keyboard Hook
**File:** `apps/app/src/hooks/useHistoryKeyboard.ts` (new)

```typescript
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function useHistoryKeyboard() {
  const undo = useStore(state => state.undo);
  const redo = useStore(state => state.redo);
  const canUndo = useStore(state => state.canUndo());
  const canRedo = useStore(state => state.canRedo());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in text input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore auto-repeat
      if (e.repeat) return;

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y = Redo
      if (
        (isMod && e.key === 'z' && e.shiftKey && canRedo) ||
        (isMod && e.key === 'y' && canRedo)
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
```

**Checklist:**
- [x] Create keyboard hook
- [x] Handle Cmd/Ctrl + Z for undo
- [x] Handle Cmd/Ctrl + Shift + Z and Cmd/Ctrl + Y for redo
- [x] Block in text inputs
- [x] Prevent auto-repeat
- [x] Clean up event listeners

---

### Task 4.2: Add History Hook to App
**File:** `apps/app/src/app/[locale]/layout.tsx` or main app component

```typescript
import { useHistoryKeyboard } from '@/hooks/useHistoryKeyboard';

export default function RootLayout({ children }: Props) {
  useHistoryKeyboard(); // Add this

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

**Checklist:**
- [x] Import and call `useHistoryKeyboard` in root layout
- [ ] Verify keyboard shortcuts work globally (testing)
- [ ] Test in different browsers (testing) (Mac/Windows)

---

### Task 4.3: Create Undo/Redo Toolbar Buttons
**File:** `apps/app/src/components/ui/HistoryButtons.tsx` (new)

```typescript
'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@meble/ui/button';
import { useStore } from '@/lib/store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@meble/ui/tooltip';

export function HistoryButtons() {
  const undo = useStore(state => state.undo);
  const redo = useStore(state => state.redo);
  const canUndo = useStore(state => state.canUndo());
  const canRedo = useStore(state => state.canRedo());

  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Cofnij"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cofnij (Cmd+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Ponów"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ponów (Cmd+Shift+Z)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

**Checklist:**
- [ ] Create history buttons component
- [ ] Add undo/redo icons (lucide-react)
- [ ] Wire up to store actions
- [ ] Disable buttons based on canUndo/canRedo
- [ ] Add Polish tooltips with shortcuts
- [ ] Use theme colors (no hardcoded colors)

---

### Task 4.4: Add Buttons to Toolbar
**File:** Find main toolbar component (likely `apps/app/src/components/ui/Toolbar.tsx` or similar)

```typescript
import { HistoryButtons } from './HistoryButtons';

export function Toolbar() {
  return (
    <div className="toolbar">
      {/* Existing toolbar items */}
      <HistoryButtons />
      {/* More toolbar items */}
    </div>
  );
}
```

**Checklist:**
- [ ] Locate main toolbar component
- [ ] Import and add `HistoryButtons`
- [ ] Position appropriately in toolbar
- [ ] Test button states and interactions

---

### Task 4.5: Create Timeline Component
**File:** `apps/app/src/components/ui/HistoryTimeline.tsx` (new)

```typescript
'use client';

import { useStore } from '@/lib/store';
import { formatHistoryTimestamp } from '@/lib/utils/time';
import { ScrollArea } from '@meble/ui/scroll-area';
import { cn } from '@meble/ui/utils';

export function HistoryTimeline() {
  const undoStack = useStore(state => state.undoStack);
  const redoStack = useStore(state => state.redoStack);
  const jumpTo = useStore(state => state.jumpTo);

  const allEntries = [
    ...undoStack.map((e, i) => ({ ...e, status: 'done' as const, index: i })),
    ...redoStack
      .slice()
      .reverse()
      .map((e, i) => ({
        ...e,
        status: 'undone' as const,
        index: undoStack.length + i
      })),
  ];

  const currentIndex = undoStack.length - 1;

  return (
    <div className="w-80 border-l border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Historia</h3>
        <p className="text-sm text-muted-foreground">
          {allEntries.length} operacji
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-2">
          {allEntries.map((entry, i) => (
            <button
              key={entry.meta.id}
              onClick={() => jumpTo(entry.meta.id)}
              className={cn(
                "w-full text-left p-3 rounded-md mb-1 transition-colors",
                "hover:bg-accent",
                i === currentIndex && "bg-primary text-primary-foreground",
                entry.status === 'undone' && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{entry.meta.label}</span>
                {entry.meta.isMilestone && (
                  <span className="text-xs bg-accent px-2 py-1 rounded">
                    Milestone
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatHistoryTimestamp(entry.meta.timestamp)}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Checklist:**
- [ ] Create timeline component
- [ ] Display undo/redo stacks as unified list
- [ ] Highlight current position
- [ ] Show undone entries with reduced opacity
- [ ] Implement click to jump
- [ ] Format timestamps (HH:MM for today, date for older)
- [ ] Mark milestones visually
- [ ] Use theme colors throughout

---

### Task 4.6: Create Time Formatting Utility
**File:** `apps/app/src/lib/utils/time.ts` (new)

```typescript
export function formatHistoryTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    // Format as HH:MM
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else {
    // Format as DD.MM.YYYY HH:MM
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
```

**Checklist:**
- [ ] Create time formatting utility
- [ ] Show HH:MM for today
- [ ] Show full date for older entries
- [ ] Use Polish locale
- [ ] Add JSDoc comments

---

### Task 4.7: Add Timeline to Layout
**File:** Add to appropriate layout (e.g., sidebar panel)

```typescript
import { HistoryTimeline } from '@/components/ui/HistoryTimeline';

// Add timeline as collapsible panel or separate tab
```

**Checklist:**
- [ ] Decide timeline placement (sidebar, panel, modal)
- [ ] Add timeline to UI
- [ ] Make it toggleable/collapsible
- [ ] Test timeline interactions

---

## Phase 5: Helper Functions

### Task 5.1: Create Comparison Utilities
**File:** `apps/app/src/lib/store/history/utils.ts` (new)

```typescript
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }

  return true;
}

export function pickTransform(part: Part): TransformSnapshot {
  return {
    position: [...part.position],
    rotation: [...part.rotation],
    scale: part.scale ? [...part.scale] : undefined,
  };
}

export function pickMaterialChange(part: Part): Partial<Part> {
  return {
    materialId: part.materialId,
    texture: part.texture,
  };
}

export function estimateByteSize(
  undoStack: HistoryEntry[],
  milestoneStack: HistoryEntry[]
): number {
  try {
    const json = JSON.stringify({ undoStack, milestoneStack });
    return new Blob([json]).size;
  } catch {
    // Fallback estimation
    return (undoStack.length + milestoneStack.length) * 500; // ~500 bytes per entry
  }
}

export function inferKindFromType(type: HistoryEntryType): HistoryEntryKind {
  if (type.includes('CABINET')) return 'cabinet';
  if (type.includes('MATERIAL')) return 'material';
  if (type === 'SELECTION') return 'selection';
  if (type.includes('TRANSFORM') || type.includes('PART')) return 'geometry';
  return 'misc';
}

export function createPartIdMap(
  oldParts: Part[],
  newParts: Part[]
): Record<string, string> {
  // Create mapping based on part properties
  // This is simplified - real implementation needs proper matching logic
  const map: Record<string, string> = {};

  oldParts.forEach((oldPart, i) => {
    if (newParts[i]) {
      map[oldPart.id] = newParts[i].id;
    }
  });

  return map;
}
```

**Checklist:**
- [x] Implement `isEqual` for deep comparison
- [x] Implement `pickTransform` helper
- [x] Implement `pickMaterialChange` helper
- [x] Implement `estimateByteSize`
- [x] Implement `inferKindFromType`
- [x] Implement `createPartIdMap` for cabinet regeneration
- [ ] Add unit tests for all utilities (skipped - tests phase)

---

## Phase 6: Testing

### Task 6.1: Unit Tests - History Slice
**File:** `apps/app/src/lib/store/slices/__tests__/historySlice.test.ts` (new)

Test scenarios:
1. Push entry adds to undo stack and clears redo
2. Undo moves entry from undo to redo stack
3. Redo moves entry from redo to undo stack
4. Stack trimming at 100 entries
5. Milestone preservation during trimming
6. Milestone stack max 10 entries
7. beginBatch creates inFlightBatch
8. commitBatch with no changes is skipped
9. commitBatch with changes creates entry
10. cancelBatch clears inFlightBatch

**Checklist:**
- [ ] Create test file
- [ ] Test all basic operations
- [ ] Test stack limits
- [ ] Test milestone handling
- [ ] Test batch operations
- [ ] Achieve >80% code coverage

---

### Task 6.2: Unit Tests - Transform Batching
**File:** `apps/app/src/lib/store/slices/__tests__/transformHistory.test.ts` (new)

Test scenarios:
1. Transform batch records single entry for entire drag
2. No history entries during per-frame updates
3. Batch with no change is not recorded
4. Multiple transforms create separate entries

**Checklist:**
- [ ] Test transform batching flow
- [ ] Verify per-frame updates don't create entries
- [ ] Test change detection
- [ ] Test multiple sequential transforms

---

### Task 6.3: Integration Tests - Parts Operations
**File:** `apps/app/src/lib/store/__tests__/partsHistory.test.ts` (new)

Test scenarios:
1. Add part → undo → redo cycle
2. Remove part → undo restores at correct index
3. Duplicate part → undo removes duplicate
4. Update part material → undo restores old material

**Checklist:**
- [ ] Test add/remove/duplicate with history
- [ ] Test undo/redo for each operation
- [ ] Verify state consistency after operations
- [ ] Test index preservation for removed parts

---

### Task 6.4: Integration Tests - Cabinet Operations
**File:** `apps/app/src/lib/store/__tests__/cabinetHistory.test.ts` (new)

Test scenarios:
1. Regenerate cabinet → undo restores old parts and params
2. Remove cabinet → undo restores cabinet and parts
3. Update cabinet params → undo/redo cycle
4. Part ID mapping works correctly

**Checklist:**
- [ ] Test cabinet regeneration history
- [ ] Test cabinet removal with parts
- [ ] Test cabinet updates
- [ ] Verify part ID mapping
- [ ] Test milestone marking for regeneration

---

### Task 6.5: Integration Tests - Timeline
**File:** `apps/app/src/lib/store/__tests__/timeline.test.ts` (new)

Test scenarios:
1. jumpTo navigates to correct state
2. jumpTo backwards (multiple undos)
3. jumpTo forwards (multiple redos)
4. Timeline displays all entries correctly

**Checklist:**
- [ ] Test timeline navigation
- [ ] Test multi-step undo/redo
- [ ] Verify state after jumps
- [ ] Test edge cases (jump to current, non-existent ID)

---

### Task 6.6: Integration Tests - Migration
**File:** `apps/app/src/lib/store/__tests__/migration.test.ts` (new)

Test scenarios:
1. Migration from v2 to v3 adds empty history
2. Migrated store functions correctly
3. Fresh store (no localStorage) initializes correctly

**Checklist:**
- [ ] Test v2 → v3 migration
- [ ] Verify all history fields initialized
- [ ] Test fresh initialization
- [ ] Test with real localStorage mock

---

### Task 6.7: E2E Tests - Keyboard Shortcuts
**File:** `apps/app/e2e/history.spec.ts` (new, if using Playwright/Cypress)

Test scenarios:
1. Cmd+Z triggers undo
2. Cmd+Shift+Z triggers redo
3. Cmd+Y triggers redo
4. Shortcuts blocked in text inputs
5. Buttons update enabled/disabled state

**Checklist:**
- [ ] Set up E2E test file
- [ ] Test keyboard shortcuts
- [ ] Test UI button states
- [ ] Test actual undo/redo in UI
- [ ] Run in multiple browsers

---

## Phase 7: Documentation & Polish

### Task 7.1: Add Code Documentation
Add JSDoc comments to all public APIs:

**Files to document:**
- `historySlice.ts` - all public methods
- `apply.ts` - applyHistoryEntry function
- `utils.ts` - all utility functions
- `types.ts` - all history types

**Checklist:**
- [ ] Add JSDoc to all public methods
- [ ] Document parameters and return types
- [ ] Add usage examples where helpful
- [ ] Document complex logic with inline comments

---

### Task 7.2: Update README
**File:** `apps/app/README.md` or create `docs/HISTORY.md`

Document:
- History system architecture
- How to use history in new slices
- How batching works
- Performance considerations
- Keyboard shortcuts
- Testing guidelines

**Checklist:**
- [ ] Create or update documentation
- [ ] Explain architecture and design decisions
- [ ] Provide usage examples
- [ ] Document edge cases and limitations
- [ ] Add diagrams if helpful

---

### Task 7.3: Performance Optimization Review
Review and optimize:

1. Store selectors - use shallow equality
2. Component re-renders - memoize expensive operations
3. History entry size - minimize stored data
4. Stack trimming performance
5. Timeline rendering for large stacks

**Checklist:**
- [ ] Profile store subscriptions
- [ ] Optimize React components with memo
- [ ] Minimize history entry payload
- [ ] Add performance tests
- [ ] Document performance characteristics

---

### Task 7.4: Polish UI Components
Final UI polish:

1. Add loading states if needed
2. Add empty states (no history)
3. Improve accessibility (ARIA labels)
4. Test keyboard navigation
5. Responsive design for timeline

**Checklist:**
- [ ] Add empty states
- [ ] Improve accessibility
- [ ] Test keyboard navigation
- [ ] Test on different screen sizes
- [ ] Verify theme colors used throughout

---

### Task 7.5: Translation Preparation
**Note:** Actual translation happens before release, but prepare infrastructure now.

**Files to update:**
- `apps/app/src/messages/pl.json`
- `apps/app/src/messages/en.json`

Add placeholders for:
- History labels (already in constants, move to i18n)
- Timeline UI text
- Button tooltips
- Error messages

**Checklist:**
- [ ] Identify all UI strings
- [ ] Add to translation files (Polish for now)
- [ ] Prepare English translations structure
- [ ] Update components to use i18n system
- [ ] Document translation keys

---

## Implementation Order Summary

**Week 1:** Phase 1 & 2
- Setup types, constants, history slice structure
- Implement core history operations

**Week 2:** Phase 3
- Integrate history into existing slices
- Update parts and cabinet operations
- Wire up transform controls

**Week 3:** Phase 4 & 5
- Build keyboard shortcuts
- Create UI components (buttons, timeline)
- Implement helper utilities

**Week 4:** Phase 6 & 7
- Write comprehensive tests
- Documentation
- Performance optimization
- Polish and refinement

---

## Testing Checklist Before Release

- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing in Chrome, Firefox, Safari
- [ ] Keyboard shortcuts work on Mac and Windows
- [ ] Timeline navigates correctly with 100+ entries
- [ ] Undo/redo works for all operation types
- [ ] Cabinet regeneration undo/redo works correctly
- [ ] localStorage migration from v2 to v3 works
- [ ] No memory leaks during extended use
- [ ] Performance acceptable with max history stack
- [ ] UI components use theme colors only
- [ ] All UI text in Polish (code/comments in English)
- [ ] Accessibility tested (keyboard only, screen reader)
- [ ] Works correctly after page refresh (persist)
- [ ] No console errors or warnings

---

## Known Limitations & Future Improvements

### Current Limitations
1. History is local only (not synced across devices)
2. 100 entry limit may not be enough for power users
3. Cabinet regeneration undo may be complex with custom parts
4. No "branch" history (only linear undo/redo)

### Future Enhancements
1. Compress history entries with algorithm (e.g., LZ-string)
2. Implement tree-based history (Git-like branches)
3. Add cloud sync for history (requires backend)
4. Visual diff preview before undo/redo
5. Undo grouping (combine similar operations)
6. Export/import history for debugging
7. Add collaborative editing with CRDT

---

## Dependencies to Install

```bash
# No new dependencies expected
# Existing dependencies should cover all needs:
# - zustand (already installed)
# - react, react-dom
# - lucide-react (for icons)
# - @meble/ui components
```

---

## Files to Create

### New Files
- `apps/app/src/lib/store/slices/historySlice.ts`
- `apps/app/src/lib/store/history/constants.ts`
- `apps/app/src/lib/store/history/utils.ts`
- `apps/app/src/lib/store/history/apply.ts`
- `apps/app/src/hooks/useHistoryKeyboard.ts`
- `apps/app/src/components/ui/HistoryButtons.tsx`
- `apps/app/src/components/ui/HistoryTimeline.tsx`
- `apps/app/src/lib/utils/time.ts`
- `apps/app/src/lib/store/__tests__/*.test.ts` (multiple test files)
- `apps/app/docs/HISTORY.md` (documentation)

### Files to Modify
- `apps/app/src/types/index.ts`
- `apps/app/src/lib/store/types.ts`
- `apps/app/src/lib/store/index.ts`
- `apps/app/src/lib/store/slices/partsSlice.ts`
- `apps/app/src/lib/store/slices/cabinetSlice.ts`
- `apps/app/src/components/canvas/PartTransformControls.tsx`
- `apps/app/src/app/[locale]/layout.tsx`
- Main toolbar component (location TBD)
- `apps/app/src/messages/pl.json`
- `apps/app/src/messages/en.json`

---

## Success Criteria

The implementation is complete when:

1. ✅ User can undo/redo all operations (parts, cabinets, transforms)
2. ✅ Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z) work correctly
3. ✅ Timeline UI shows operation history and allows navigation
4. ✅ Transform operations create single history entry per drag
5. ✅ History persists across page refreshes
6. ✅ Migration from v2 to v3 works without data loss
7. ✅ Stack limits (100 entries, 10 milestones) are enforced
8. ✅ All tests pass with good coverage
9. ✅ Performance is acceptable (no lag during normal use)
10. ✅ Code follows project guidelines (English code, Polish UI, TypeScript strict, theme colors)

---

## Risk Mitigation

### High Risk Areas
1. **Cabinet regeneration undo** - Complex state with part ID mapping
   - Mitigation: Thorough testing, store full snapshots if needed

2. **localStorage size** - History could grow large
   - Mitigation: Strict limits, size monitoring, trimming algorithm

3. **Performance** - Per-frame updates during transform
   - Mitigation: Batch system prevents per-frame history writes

4. **State consistency** - Undo/redo could corrupt state
   - Mitigation: Extensive integration tests, readonly operations

### Medium Risk Areas
1. **Migration** - Users could lose data
   - Mitigation: Careful migration code, backup localStorage in dev tools

2. **Keyboard conflicts** - Shortcuts may conflict with browser/OS
   - Mitigation: Standard shortcuts, block in text inputs, test on all platforms

---

## Additional Notes

- Remember: DO NOT add translations until before release
- Always use theme colors, never hardcoded
- All code and comments in English
- All UI text in Polish
- Test on both Mac and Windows for keyboard shortcuts
- Consider adding Sentry or error tracking for history bugs
- Keep history entries as small as possible
- Document any deviations from the plan

---

**End of Implementation Plan**
