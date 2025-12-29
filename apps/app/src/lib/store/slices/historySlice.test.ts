jest.mock("../history/apply", () => ({
  applyHistoryEntry: jest.fn(),
}));

jest.mock("../history/utils", () => {
  const actual = jest.requireActual("../history/utils");
  return {
    ...actual,
    generateId: jest.fn(() => "generated-id"),
    estimateByteSize: jest.fn(() => 128),
  };
});

import { create } from "zustand";
import type { StateCreator } from "zustand";
import type { HistoryEntry } from "@/types";
import { HISTORY_LABELS } from "../history/constants";
import { createHistorySlice } from "./historySlice";
import type { HistorySlice } from "../types";
import { applyHistoryEntry } from "../history/apply";
import { estimateByteSize, generateId } from "../history/utils";

// Create a store that includes mock for markAsDirty (called by historySlice)
interface TestStoreState extends HistorySlice {
  markAsDirty: () => void;
}

const createHistoryStore = () =>
  create<TestStoreState>()((set, get, api) => ({
    ...createHistorySlice(set as any, get as any, api as any),
    // Mock markAsDirty - historySlice calls this when recording changes
    markAsDirty: jest.fn(),
  }));

const createEntry = (
  id: string,
  timestamp: number,
  overrides: Partial<HistoryEntry> = {}
): HistoryEntry => {
  const { meta, ...rest } = overrides;
  return {
    type: "UPDATE_PART",
    targetId: "p-1",
    before: { value: "before" },
    after: { value: "after" },
    meta: {
      id,
      timestamp,
      label: HISTORY_LABELS.UPDATE_PART,
      kind: "geometry",
      ...meta,
    },
    ...rest,
  };
};

describe("historySlice", () => {
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.clearAllMocks();
    (estimateByteSize as jest.Mock).mockReturnValue(128);
    (generateId as jest.Mock).mockReturnValue("generated-id");
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("records batch entry when commit includes changes", () => {
    const store = createHistoryStore();
    (estimateByteSize as jest.Mock).mockReturnValue(512);

    store.getState().beginBatch("UPDATE_PART", { targetId: "p-1", before: { value: 1 } });

    expect(store.getState().inFlightBatch).toMatchObject({
      type: "UPDATE_PART",
      meta: {
        id: "generated-id",
        timestamp: 1_700_000_000_000,
        kind: "geometry",
        targetId: "p-1",
      },
      before: { value: 1 },
    });

    store.getState().commitBatch({ after: { value: 2 } });

    const [entry] = store.getState().undoStack;
    expect(entry).toMatchObject({
      type: "UPDATE_PART",
      targetId: "p-1",
      before: { value: 1 },
      after: { value: 2 },
      meta: {
        id: "generated-id",
        timestamp: 1_700_000_000_000,
        label: HISTORY_LABELS.UPDATE_PART,
        kind: "geometry",
      },
    });
    expect(store.getState().inFlightBatch).toBeNull();
    expect(store.getState().redoStack).toHaveLength(0);
    expect(store.getState().approxByteSize).toBe(512);
    expect(generateId).toHaveBeenCalled();
  });

  it("skips committing batch when before and after are equal", () => {
    const store = createHistoryStore();

    store.getState().beginBatch("UPDATE_PART", { targetId: "p-1", before: { value: 1 } });
    store.getState().commitBatch({ after: { value: 1 } });

    expect(store.getState().undoStack).toHaveLength(0);
    expect(store.getState().inFlightBatch).toBeNull();
  });

  it("trims undo stack while preserving milestones and clears redo stack", () => {
    const store = createHistoryStore();
    (estimateByteSize as jest.Mock).mockReturnValue(999);

    store.setState({ limit: 2, milestoneLimit: 1, redoStack: [createEntry("redo", 0)] });

    const entry1 = createEntry("e1", 1);
    const entry2 = createEntry("e2", 2, {
      meta: {
        id: "e2",
        timestamp: 2,
        label: HISTORY_LABELS.UPDATE_PART,
        kind: "geometry",
        isMilestone: true,
      },
    });
    const entry3 = createEntry("e3", 3);

    store.getState().pushEntry(entry1);
    store.getState().pushEntry(entry2);
    store.getState().pushEntry(entry3);

    const state = store.getState();
    expect(state.undoStack.map((e) => e.meta.id)).toEqual(["e2", "e3"]);
    expect(state.milestoneStack.map((e) => e.meta.id)).toEqual(["e2"]);
    expect(state.redoStack).toEqual([]);
    expect(state.approxByteSize).toBe(999);
  });

  it("moves entries between stacks on undo and redo", () => {
    const store = createHistoryStore();
    const entryA = createEntry("a", 1);
    const entryB = createEntry("b", 2);
    store.setState({ undoStack: [entryA, entryB], redoStack: [] });

    store.getState().undo();

    expect(applyHistoryEntry).toHaveBeenCalledWith(
      entryB,
      "undo",
      expect.any(Function),
      expect.any(Function)
    );
    expect(store.getState().undoStack).toEqual([entryA]);
    expect(store.getState().redoStack).toEqual([entryB]);

    (applyHistoryEntry as jest.Mock).mockClear();
    store.getState().redo();

    expect(applyHistoryEntry).toHaveBeenCalledWith(
      entryB,
      "redo",
      expect.any(Function),
      expect.any(Function)
    );
    expect(store.getState().undoStack).toEqual([entryA, entryB]);
    expect(store.getState().redoStack).toEqual([]);
  });

  it("jumps to specific timeline entry using undo/redo chain", () => {
    const store = createHistoryStore();
    const entry1 = createEntry("e1", 1);
    const entry2 = createEntry("e2", 2);
    const entry3 = createEntry("e3", 3);
    store.setState({ undoStack: [entry1, entry2, entry3], redoStack: [] });

    (applyHistoryEntry as jest.Mock).mockClear();
    store.getState().jumpTo("e1");

    expect(applyHistoryEntry).toHaveBeenCalledTimes(2);
    expect(applyHistoryEntry).toHaveBeenNthCalledWith(
      1,
      entry3,
      "undo",
      expect.any(Function),
      expect.any(Function)
    );
    expect(applyHistoryEntry).toHaveBeenNthCalledWith(
      2,
      entry2,
      "undo",
      expect.any(Function),
      expect.any(Function)
    );
    expect(store.getState().undoStack.map((e) => e.meta.id)).toEqual(["e1"]);
    expect(store.getState().redoStack.map((e) => e.meta.id)).toEqual(["e3", "e2"]);
  });

  it("wraps mutator execution with history entry creation", () => {
    const store = createHistoryStore();
    (estimateByteSize as jest.Mock).mockReturnValue(321);

    const mutator = jest.fn(() => "result");
    const entryBuilder = jest.fn((result: string) =>
      createEntry("built", 10, {
        after: { value: result },
        meta: { id: "built", timestamp: 10, label: HISTORY_LABELS.MILESTONE, kind: "misc" },
      })
    );

    const result = store.getState().runWithHistory(entryBuilder, mutator);

    expect(result).toBe("result");
    expect(mutator).toHaveBeenCalled();
    expect(entryBuilder).toHaveBeenCalledWith("result");
    const [entry] = store.getState().undoStack;
    expect(entry).toMatchObject({
      after: { value: "result" },
      meta: expect.objectContaining({
        id: "built",
        timestamp: 10,
        label: HISTORY_LABELS.MILESTONE,
        kind: "misc",
      }),
    });
    expect(store.getState().approxByteSize).toBe(321);
  });
});
