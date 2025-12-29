import type { HistorySlice, StoreSlice } from "../types";
import type { HistoryEntry, HistoryEntryType } from "@/types";
import { HISTORY_MAX_LENGTH, HISTORY_MAX_MILESTONES, HISTORY_LABELS } from "../history/constants";
import { isEqual, estimateByteSize, inferKindFromType, generateId } from "../history/utils";
import { applyHistoryEntry } from "../history/apply";

/**
 * History slice implementation
 * Provides undo/redo functionality with transaction-based history
 */
export const createHistorySlice: StoreSlice<HistorySlice> = (set, get) => ({
  // State initialization
  undoStack: [],
  redoStack: [],
  milestoneStack: [],
  inFlightBatch: null,
  limit: HISTORY_MAX_LENGTH,
  milestoneLimit: HISTORY_MAX_MILESTONES,
  approxByteSize: 0,
  timelineCursor: null,

  // Selectors
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // Begin a batch operation (for transforms)
  beginBatch: (type: HistoryEntryType, meta: { targetId?: string; before?: unknown }) => {
    set({
      inFlightBatch: {
        type,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          kind: inferKindFromType(type),
          targetId: meta.targetId,
        },
        before: meta.before,
      },
    });
  },

  // Commit a batch operation
  commitBatch: (afterState: { after?: unknown }) => {
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
      targetId: meta.targetId,
      meta: {
        id: meta.id!,
        timestamp: meta.timestamp!,
        label: HISTORY_LABELS[type],
        kind: meta.kind as any,
      },
      before,
      after,
    };

    get().pushEntry(entry);
    set({ inFlightBatch: null });
  },

  // Cancel a batch operation
  cancelBatch: () => {
    set({ inFlightBatch: null });
  },

  // Push an entry to the undo stack
  pushEntry: (entry: HistoryEntry) => {
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

    // Trim undo stack if over limit
    if (newUndoStack.length > limit) {
      // Remove oldest non-milestone entries first
      const toRemove = newUndoStack.length - limit;
      const nonMilestones = newUndoStack.filter((e) => !e.meta.isMilestone);
      const milestones = newUndoStack.filter((e) => e.meta.isMilestone);

      if (nonMilestones.length >= toRemove) {
        // Remove oldest non-milestones
        const keptNonMilestones = nonMilestones.slice(toRemove);
        newUndoStack = [...milestones, ...keptNonMilestones].sort(
          (a, b) => a.meta.timestamp - b.meta.timestamp
        );
      } else {
        // Not enough non-milestones, just slice from the end
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

    // Mark project as dirty when any change is recorded in history
    get().markAsDirty();
  },

  // Undo operation
  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const entry = undoStack[undoStack.length - 1];

    // Apply reverse operation
    applyHistoryEntry(entry, "undo", get, set);

    // Move entry to redo stack
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, entry],
    });

    // Trigger collision detection if available
    const state = get();
    if ("detectCollisions" in state && typeof state.detectCollisions === "function") {
      // Debounced collision detection will be called by the slice operations
    }
  },

  // Redo operation
  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const entry = redoStack[redoStack.length - 1];

    // Apply forward operation
    applyHistoryEntry(entry, "redo", get, set);

    // Move entry back to undo stack
    set({
      undoStack: [...get().undoStack, entry],
      redoStack: redoStack.slice(0, -1),
    });

    // Trigger collision detection if available
    const state = get();
    if ("detectCollisions" in state && typeof state.detectCollisions === "function") {
      // Debounced collision detection will be called by the slice operations
    }
  },

  // Clear all history
  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      milestoneStack: [],
      inFlightBatch: null,
      approxByteSize: 0,
      timelineCursor: null,
    });
  },

  // Jump to a specific entry in the timeline
  jumpTo: (entryId: string) => {
    const { undoStack, redoStack } = get();
    const allEntries = [...undoStack, ...redoStack.slice().reverse()];

    const targetIndex = allEntries.findIndex((e) => e.meta.id === entryId);
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

  // Set timeline cursor for UI
  setTimelineCursor: (entryId: string | null) => {
    set({ timelineCursor: entryId });
  },

  // Run a mutator with automatic history recording
  runWithHistory: <T>(entryBuilder: (result: T) => HistoryEntry, mutator: () => T): T => {
    const result = mutator();
    const entry = entryBuilder(result);
    get().pushEntry(entry);
    return result;
  },
});
