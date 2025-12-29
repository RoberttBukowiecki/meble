import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createWallOcclusionSlice, type WallOcclusionSlice } from "./wallOcclusionSlice";

const createWallOcclusionStore = () =>
  create<WallOcclusionSlice>()(
    createWallOcclusionSlice as unknown as StateCreator<
      WallOcclusionSlice,
      [],
      [],
      WallOcclusionSlice
    >
  );

describe("wallOcclusionSlice", () => {
  describe("initial state", () => {
    it("initializes with occlusion enabled by default", () => {
      const store = createWallOcclusionStore();
      const state = store.getState();

      expect(state.wallOcclusionEnabled).toBe(true);
    });

    it("initializes with empty occluding wall IDs", () => {
      const store = createWallOcclusionStore();
      const state = store.getState();

      expect(state.occludingWallIds.size).toBe(0);
    });
  });

  describe("toggleWallOcclusion", () => {
    it("toggles from enabled to disabled", () => {
      const store = createWallOcclusionStore();

      expect(store.getState().wallOcclusionEnabled).toBe(true);

      store.getState().toggleWallOcclusion();

      expect(store.getState().wallOcclusionEnabled).toBe(false);
    });

    it("toggles from disabled to enabled", () => {
      const store = createWallOcclusionStore();

      store.getState().toggleWallOcclusion(); // Disable
      store.getState().toggleWallOcclusion(); // Enable again

      expect(store.getState().wallOcclusionEnabled).toBe(true);
    });

    it("clears occluding wall IDs when disabling", () => {
      const store = createWallOcclusionStore();

      // Set some occluding walls
      store.getState().setOccludingWallIds(new Set(["wall1", "wall2"]));
      expect(store.getState().occludingWallIds.size).toBe(2);

      // Disable occlusion
      store.getState().toggleWallOcclusion();

      // Should have cleared the set
      expect(store.getState().occludingWallIds.size).toBe(0);
    });

    it("preserves empty occluding wall IDs when enabling", () => {
      const store = createWallOcclusionStore();

      // Disable first
      store.getState().toggleWallOcclusion();
      expect(store.getState().wallOcclusionEnabled).toBe(false);

      // Enable again
      store.getState().toggleWallOcclusion();

      // Should still be empty (controller will populate it)
      expect(store.getState().occludingWallIds.size).toBe(0);
    });
  });

  describe("setWallOcclusionEnabled", () => {
    it("sets enabled state directly", () => {
      const store = createWallOcclusionStore();

      store.getState().setWallOcclusionEnabled(false);
      expect(store.getState().wallOcclusionEnabled).toBe(false);

      store.getState().setWallOcclusionEnabled(true);
      expect(store.getState().wallOcclusionEnabled).toBe(true);
    });

    it("clears occluding wall IDs regardless of enabled state", () => {
      const store = createWallOcclusionStore();

      // Set some walls
      store.getState().setOccludingWallIds(new Set(["wall1", "wall2"]));

      // Set to disabled - should clear
      store.getState().setWallOcclusionEnabled(false);
      expect(store.getState().occludingWallIds.size).toBe(0);

      // Set some walls again
      store.getState().setOccludingWallIds(new Set(["wall3"]));

      // Set to enabled - should also clear (controller will recalculate)
      store.getState().setWallOcclusionEnabled(true);
      expect(store.getState().occludingWallIds.size).toBe(0);
    });
  });

  describe("setOccludingWallIds", () => {
    it("sets occluding wall IDs", () => {
      const store = createWallOcclusionStore();

      const wallIds = new Set(["wall1", "wall2", "wall3"]);
      store.getState().setOccludingWallIds(wallIds);

      expect(store.getState().occludingWallIds).toEqual(wallIds);
    });

    it("replaces previous wall IDs completely", () => {
      const store = createWallOcclusionStore();

      store.getState().setOccludingWallIds(new Set(["wall1", "wall2"]));
      store.getState().setOccludingWallIds(new Set(["wall3"]));

      expect(store.getState().occludingWallIds).toEqual(new Set(["wall3"]));
      expect(store.getState().occludingWallIds.has("wall1")).toBe(false);
    });

    it("can clear wall IDs with empty set", () => {
      const store = createWallOcclusionStore();

      store.getState().setOccludingWallIds(new Set(["wall1", "wall2"]));
      store.getState().setOccludingWallIds(new Set());

      expect(store.getState().occludingWallIds.size).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("handles rapid toggle operations", () => {
      const store = createWallOcclusionStore();

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        store.getState().toggleWallOcclusion();
      }

      // After even number of toggles, should be back to initial state
      expect(store.getState().wallOcclusionEnabled).toBe(true);
    });

    it("handles concurrent set and toggle operations", () => {
      const store = createWallOcclusionStore();

      // Set walls then toggle
      store.getState().setOccludingWallIds(new Set(["wall1"]));
      store.getState().toggleWallOcclusion(); // Disable - clears

      expect(store.getState().wallOcclusionEnabled).toBe(false);
      expect(store.getState().occludingWallIds.size).toBe(0);

      // Toggle back - still empty
      store.getState().toggleWallOcclusion();

      expect(store.getState().wallOcclusionEnabled).toBe(true);
      expect(store.getState().occludingWallIds.size).toBe(0);
    });
  });
});
