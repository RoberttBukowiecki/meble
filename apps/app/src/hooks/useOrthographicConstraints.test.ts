/**
 * Orthographic Constraints Hook Tests
 *
 * Tests for axis constraints in orthographic views.
 */

import { renderHook } from "@testing-library/react";
import {
  useOrthographicConstraints,
  useTransformAxisConstraints,
  useHiddenResizeHandles,
} from "./useOrthographicConstraints";
import { useStore } from "@/lib/store";

// Mock the store
jest.mock("@/lib/store", () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe("useOrthographicConstraints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("perspective mode", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "perspective" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("returns isOrthographic as false", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.isOrthographic).toBe(false);
    });

    it("returns null for orthographicView", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.orthographicView).toBeNull();
    });

    it("returns all axes as editable", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.editableAxes).toEqual(["x", "y", "z"]);
    });

    it("shows all translation axes", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(true);
    });

    it("shows all rotation axes", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.rotateShowX).toBe(true);
      expect(result.current.rotateShowY).toBe(true);
      expect(result.current.rotateShowZ).toBe(true);
    });
  });

  describe("orthographic mode - TOP view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("returns isOrthographic as true", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.isOrthographic).toBe(true);
    });

    it("returns correct orthographicView", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.orthographicView).toBe("TOP");
    });

    it("returns x and z as editable axes", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.editableAxes).toEqual(["x", "z"]);
    });

    it("shows X and Z for translation, hides Y", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(false);
      expect(result.current.showZ).toBe(true);
    });

    it("shows only Y for rotation", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.rotateShowX).toBe(false);
      expect(result.current.rotateShowY).toBe(true);
      expect(result.current.rotateShowZ).toBe(false);
    });

    it("returns y as perpendicular axis", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.perpendicularAxis).toBe("y");
    });

    it("returns y as rotation axis", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.rotationAxis).toBe("y");
    });
  });

  describe("orthographic mode - FRONT view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "FRONT" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("returns x and y as editable axes", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.editableAxes).toEqual(["x", "y"]);
    });

    it("shows X and Y for translation, hides Z", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(false);
    });

    it("shows only Z for rotation", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.rotateShowX).toBe(false);
      expect(result.current.rotateShowY).toBe(false);
      expect(result.current.rotateShowZ).toBe(true);
    });

    it("returns z as perpendicular axis", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.perpendicularAxis).toBe("z");
    });
  });

  describe("orthographic mode - LEFT view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "LEFT" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("returns y and z as editable axes", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.editableAxes).toEqual(["y", "z"]);
    });

    it("shows Y and Z for translation, hides X", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.showX).toBe(false);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(true);
    });

    it("shows only X for rotation", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.rotateShowX).toBe(true);
      expect(result.current.rotateShowY).toBe(false);
      expect(result.current.rotateShowZ).toBe(false);
    });

    it("returns x as perpendicular axis", () => {
      const { result } = renderHook(() => useOrthographicConstraints());
      expect(result.current.perpendicularAxis).toBe("x");
    });
  });
});

describe("useTransformAxisConstraints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("perspective mode", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "perspective" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("shows all axes for translate mode", () => {
      const { result } = renderHook(() => useTransformAxisConstraints("translate"));
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(true);
    });

    it("shows all axes for rotate mode", () => {
      const { result } = renderHook(() => useTransformAxisConstraints("rotate"));
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(true);
    });
  });

  describe("orthographic mode - TOP view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("shows X and Z for translate mode", () => {
      const { result } = renderHook(() => useTransformAxisConstraints("translate"));
      expect(result.current.showX).toBe(true);
      expect(result.current.showY).toBe(false);
      expect(result.current.showZ).toBe(true);
    });

    it("shows only Y for rotate mode", () => {
      const { result } = renderHook(() => useTransformAxisConstraints("rotate"));
      expect(result.current.showX).toBe(false);
      expect(result.current.showY).toBe(true);
      expect(result.current.showZ).toBe(false);
    });
  });
});

describe("useHiddenResizeHandles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("perspective mode", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "perspective" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("returns empty array (no hidden handles)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual([]);
    });
  });

  describe("orthographic mode - TOP view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "TOP" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides height handles (Y axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["height+", "height-"]);
    });
  });

  describe("orthographic mode - BOTTOM view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "BOTTOM" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides height handles (Y axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["height+", "height-"]);
    });
  });

  describe("orthographic mode - FRONT view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "FRONT" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides depth handles (Z axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["depth+", "depth-"]);
    });
  });

  describe("orthographic mode - BACK view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "BACK" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides depth handles (Z axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["depth+", "depth-"]);
    });
  });

  describe("orthographic mode - LEFT view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "LEFT" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides width handles (X axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["width+", "width-"]);
    });
  });

  describe("orthographic mode - RIGHT view", () => {
    beforeEach(() => {
      mockUseStore.mockImplementation((selector: unknown) => {
        const state = {
          cameraMode: "orthographic" as const,
          orthographicView: "RIGHT" as const,
        };
        return typeof selector === "function"
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });
    });

    it("hides width handles (X axis)", () => {
      const { result } = renderHook(() => useHiddenResizeHandles());
      expect(result.current).toEqual(["width+", "width-"]);
    });
  });
});
