jest.mock("uuid", () => ({ v4: jest.fn(() => "mock-default-furniture-id") }));

import { create } from "zustand";
import type { StateCreator } from "zustand";
import { DEFAULT_FURNITURE_ID } from "../constants";
import { createSelectionSlice } from "./selectionSlice";
import type { SelectionSlice } from "../types";

// Extended state type to include countertop selection
type SelectionTestState = SelectionSlice & {
  selectedCountertopGroupId: string | null;
  cabinets: Array<{ id: string; partIds: string[] }>;
};

const createSelectionStore = (initial: Partial<SelectionTestState> = {}) =>
  create<SelectionTestState>()((set, get, api) => ({
    ...(createSelectionSlice as unknown as StateCreator<SelectionTestState>)(set, get, api),
    selectedCountertopGroupId: null,
    cabinets: [],
    ...initial,
  }));

describe("selectionSlice", () => {
  it("initializes with default selection values", () => {
    const store = createSelectionStore();
    const state = store.getState();

    expect(state.selectedPartId).toBeNull();
    expect(state.selectedCabinetId).toBeNull();
    expect(state.selectedFurnitureId).toBe(DEFAULT_FURNITURE_ID);
    expect(state.isTransforming).toBe(false);
    expect(state.transformMode).toBe("translate");
  });

  it("sets selected furniture and clears part selection", () => {
    const store = createSelectionStore();

    store.getState().selectPart("part-1");
    store.getState().setSelectedFurniture("furniture-2");

    const state = store.getState();
    expect(state.selectedFurnitureId).toBe("furniture-2");
    expect(state.selectedPartId).toBeNull();
  });

  it("selects part and clears cabinet selection", () => {
    const store = createSelectionStore();

    store.getState().selectCabinet("cabinet-1");
    store.getState().selectPart("part-2");

    const state = store.getState();
    expect(state.selectedPartId).toBe("part-2");
    expect(state.selectedCabinetId).toBeNull();
  });

  it("selects cabinet and clears part selection", () => {
    const store = createSelectionStore();

    store.getState().selectPart("part-3");
    store.getState().selectCabinet("cabinet-2");

    const state = store.getState();
    expect(state.selectedCabinetId).toBe("cabinet-2");
    expect(state.selectedPartId).toBeNull();
  });

  it("updates transform flags and mode", () => {
    const store = createSelectionStore();

    store.getState().setIsTransforming(true);
    store.getState().setTransformMode("rotate");

    const state = store.getState();
    expect(state.isTransforming).toBe(true);
    expect(state.transformMode).toBe("rotate");
  });

  describe("countertop selection clearing", () => {
    it("clears countertop selection when deselecting cabinet with selectCabinet(null)", () => {
      const store = createSelectionStore({
        selectedCabinetId: "cabinet-1",
        selectedCountertopGroupId: "countertop-group-1",
      });

      store.getState().selectCabinet(null);

      const state = store.getState();
      expect(state.selectedCabinetId).toBeNull();
      expect(state.selectedCountertopGroupId).toBeNull();
    });

    it("clears countertop selection when using clearSelection", () => {
      const store = createSelectionStore({
        selectedCabinetId: "cabinet-1",
        selectedPartId: "part-1",
        selectedCountertopGroupId: "countertop-group-1",
        selectedPartIds: new Set(["part-1"]),
      });

      store.getState().clearSelection();

      const state = store.getState();
      expect(state.selectedCabinetId).toBeNull();
      expect(state.selectedPartId).toBeNull();
      expect(state.selectedCountertopGroupId).toBeNull();
      expect(state.selectedPartIds.size).toBe(0);
    });

    it("does not clear countertop selection when selecting a new cabinet", () => {
      const store = createSelectionStore({
        selectedCountertopGroupId: "countertop-group-1",
        cabinets: [{ id: "cabinet-2", partIds: ["part-1"] }],
      });

      store.getState().selectCabinet("cabinet-2");

      const state = store.getState();
      expect(state.selectedCabinetId).toBe("cabinet-2");
      // Countertop selection remains - user may want to keep viewing countertop while navigating
      expect(state.selectedCountertopGroupId).toBe("countertop-group-1");
    });
  });
});
