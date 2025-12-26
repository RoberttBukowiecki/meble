import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createViewSlice, type ViewSlice } from "./viewSlice";

const createViewStore = () =>
  create<ViewSlice>()(createViewSlice as unknown as StateCreator<ViewSlice, [], [], ViewSlice>);

describe("viewSlice", () => {
  describe("initial state", () => {
    it("initializes with perspective camera mode", () => {
      const store = createViewStore();
      const state = store.getState();

      expect(state.cameraMode).toBe("perspective");
    });

    it("initializes with TOP as default orthographic view", () => {
      const store = createViewStore();
      const state = store.getState();

      expect(state.orthographicView).toBe("TOP");
    });

    it("initializes with default zoom level", () => {
      const store = createViewStore();
      const state = store.getState();

      expect(state.orthographicZoom).toBe(1);
    });

    it("initializes with origin as default target", () => {
      const store = createViewStore();
      const state = store.getState();

      expect(state.orthographicTarget).toEqual([0, 0, 0]);
    });
  });

  describe("setCameraMode", () => {
    it("sets camera mode to orthographic", () => {
      const store = createViewStore();

      store.getState().setCameraMode("orthographic");

      expect(store.getState().cameraMode).toBe("orthographic");
    });

    it("sets camera mode to perspective", () => {
      const store = createViewStore();
      store.getState().setCameraMode("orthographic");

      store.getState().setCameraMode("perspective");

      expect(store.getState().cameraMode).toBe("perspective");
    });
  });

  describe("setOrthographicView", () => {
    it("sets orthographic view to FRONT", () => {
      const store = createViewStore();

      store.getState().setOrthographicView("FRONT");

      expect(store.getState().orthographicView).toBe("FRONT");
    });

    it("sets orthographic view to all 6 directions", () => {
      const store = createViewStore();
      const views = ["TOP", "BOTTOM", "FRONT", "BACK", "LEFT", "RIGHT"] as const;

      views.forEach((view) => {
        store.getState().setOrthographicView(view);
        expect(store.getState().orthographicView).toBe(view);
      });
    });
  });

  describe("setOrthographicZoom", () => {
    it("sets zoom level within valid range", () => {
      const store = createViewStore();

      store.getState().setOrthographicZoom(2);

      expect(store.getState().orthographicZoom).toBe(2);
    });

    it("clamps zoom level to minimum of 0.1", () => {
      const store = createViewStore();

      store.getState().setOrthographicZoom(0.01);

      expect(store.getState().orthographicZoom).toBe(0.1);
    });

    it("clamps zoom level to maximum of 10", () => {
      const store = createViewStore();

      store.getState().setOrthographicZoom(15);

      expect(store.getState().orthographicZoom).toBe(10);
    });
  });

  describe("setOrthographicTarget", () => {
    it("sets target position", () => {
      const store = createViewStore();

      store.getState().setOrthographicTarget([100, 200, 300]);

      expect(store.getState().orthographicTarget).toEqual([100, 200, 300]);
    });
  });

  describe("toggleCameraMode", () => {
    it("toggles from perspective to orthographic", () => {
      const store = createViewStore();
      expect(store.getState().cameraMode).toBe("perspective");

      store.getState().toggleCameraMode();

      expect(store.getState().cameraMode).toBe("orthographic");
    });

    it("toggles from orthographic to perspective", () => {
      const store = createViewStore();
      store.getState().setCameraMode("orthographic");

      store.getState().toggleCameraMode();

      expect(store.getState().cameraMode).toBe("perspective");
    });

    it("toggles back and forth multiple times", () => {
      const store = createViewStore();

      store.getState().toggleCameraMode();
      expect(store.getState().cameraMode).toBe("orthographic");

      store.getState().toggleCameraMode();
      expect(store.getState().cameraMode).toBe("perspective");

      store.getState().toggleCameraMode();
      expect(store.getState().cameraMode).toBe("orthographic");
    });
  });

  describe("switchToOrthographicView", () => {
    it("sets camera mode to orthographic and view to specified direction", () => {
      const store = createViewStore();

      store.getState().switchToOrthographicView("FRONT");

      expect(store.getState().cameraMode).toBe("orthographic");
      expect(store.getState().orthographicView).toBe("FRONT");
    });

    it("switches from perspective to specific orthographic view", () => {
      const store = createViewStore();
      expect(store.getState().cameraMode).toBe("perspective");

      store.getState().switchToOrthographicView("LEFT");

      expect(store.getState().cameraMode).toBe("orthographic");
      expect(store.getState().orthographicView).toBe("LEFT");
    });

    it("changes view when already in orthographic mode", () => {
      const store = createViewStore();
      store.getState().switchToOrthographicView("TOP");

      store.getState().switchToOrthographicView("BOTTOM");

      expect(store.getState().cameraMode).toBe("orthographic");
      expect(store.getState().orthographicView).toBe("BOTTOM");
    });
  });

  describe("switchToPerspective", () => {
    it("sets camera mode to perspective", () => {
      const store = createViewStore();
      store.getState().setCameraMode("orthographic");

      store.getState().switchToPerspective();

      expect(store.getState().cameraMode).toBe("perspective");
    });

    it("preserves orthographic view setting for next switch", () => {
      const store = createViewStore();
      store.getState().switchToOrthographicView("RIGHT");
      store.getState().switchToPerspective();

      expect(store.getState().cameraMode).toBe("perspective");
      expect(store.getState().orthographicView).toBe("RIGHT");
    });
  });
});
