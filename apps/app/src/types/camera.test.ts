import {
  ORTHOGRAPHIC_VIEW_CONFIGS,
  ORTHOGRAPHIC_VIEWS,
  getEditableAxes,
  getRotationAxis,
  getPerpendicularAxis,
  isAxisEditable,
  type OrthographicView,
} from "./camera";

describe("camera types", () => {
  describe("ORTHOGRAPHIC_VIEW_CONFIGS", () => {
    it("contains all 6 orthographic views", () => {
      const views = Object.keys(ORTHOGRAPHIC_VIEW_CONFIGS);
      expect(views).toHaveLength(6);
      expect(views).toContain("TOP");
      expect(views).toContain("BOTTOM");
      expect(views).toContain("FRONT");
      expect(views).toContain("BACK");
      expect(views).toContain("LEFT");
      expect(views).toContain("RIGHT");
    });

    it("each view has exactly 2 editable axes", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        expect(config.editableAxes).toHaveLength(2);
      });
    });

    it("perpendicular axis is not in editable axes", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        expect(config.editableAxes).not.toContain(config.perpendicularAxis);
      });
    });

    it("rotation axis equals perpendicular axis", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        expect(config.rotationAxis).toBe(config.perpendicularAxis);
      });
    });

    it("direction vectors are normalized", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        const [x, y, z] = config.direction;
        const length = Math.sqrt(x * x + y * y + z * z);
        expect(length).toBeCloseTo(1, 5);
      });
    });

    it("up vectors are normalized", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        const [x, y, z] = config.up;
        const length = Math.sqrt(x * x + y * y + z * z);
        expect(length).toBeCloseTo(1, 5);
      });
    });

    it("direction and up vectors are perpendicular", () => {
      Object.values(ORTHOGRAPHIC_VIEW_CONFIGS).forEach((config) => {
        const [dx, dy, dz] = config.direction;
        const [ux, uy, uz] = config.up;
        const dotProduct = dx * ux + dy * uy + dz * uz;
        expect(dotProduct).toBeCloseTo(0, 5);
      });
    });
  });

  describe("ORTHOGRAPHIC_VIEWS array", () => {
    it("contains all 6 views", () => {
      expect(ORTHOGRAPHIC_VIEWS).toHaveLength(6);
    });

    it("contains unique views", () => {
      const uniqueViews = new Set(ORTHOGRAPHIC_VIEWS);
      expect(uniqueViews.size).toBe(6);
    });
  });

  describe("getEditableAxes", () => {
    it("returns x and z for TOP view", () => {
      expect(getEditableAxes("TOP")).toEqual(["x", "z"]);
    });

    it("returns x and z for BOTTOM view", () => {
      expect(getEditableAxes("BOTTOM")).toEqual(["x", "z"]);
    });

    it("returns x and y for FRONT view", () => {
      expect(getEditableAxes("FRONT")).toEqual(["x", "y"]);
    });

    it("returns x and y for BACK view", () => {
      expect(getEditableAxes("BACK")).toEqual(["x", "y"]);
    });

    it("returns y and z for LEFT view", () => {
      expect(getEditableAxes("LEFT")).toEqual(["y", "z"]);
    });

    it("returns y and z for RIGHT view", () => {
      expect(getEditableAxes("RIGHT")).toEqual(["y", "z"]);
    });
  });

  describe("getRotationAxis", () => {
    it("returns y for TOP/BOTTOM views", () => {
      expect(getRotationAxis("TOP")).toBe("y");
      expect(getRotationAxis("BOTTOM")).toBe("y");
    });

    it("returns z for FRONT/BACK views", () => {
      expect(getRotationAxis("FRONT")).toBe("z");
      expect(getRotationAxis("BACK")).toBe("z");
    });

    it("returns x for LEFT/RIGHT views", () => {
      expect(getRotationAxis("LEFT")).toBe("x");
      expect(getRotationAxis("RIGHT")).toBe("x");
    });
  });

  describe("getPerpendicularAxis", () => {
    it("returns y for TOP/BOTTOM views", () => {
      expect(getPerpendicularAxis("TOP")).toBe("y");
      expect(getPerpendicularAxis("BOTTOM")).toBe("y");
    });

    it("returns z for FRONT/BACK views", () => {
      expect(getPerpendicularAxis("FRONT")).toBe("z");
      expect(getPerpendicularAxis("BACK")).toBe("z");
    });

    it("returns x for LEFT/RIGHT views", () => {
      expect(getPerpendicularAxis("LEFT")).toBe("x");
      expect(getPerpendicularAxis("RIGHT")).toBe("x");
    });
  });

  describe("isAxisEditable", () => {
    describe("TOP view", () => {
      it("x is editable", () => {
        expect(isAxisEditable("TOP", "x")).toBe(true);
      });

      it("y is NOT editable", () => {
        expect(isAxisEditable("TOP", "y")).toBe(false);
      });

      it("z is editable", () => {
        expect(isAxisEditable("TOP", "z")).toBe(true);
      });
    });

    describe("FRONT view", () => {
      it("x is editable", () => {
        expect(isAxisEditable("FRONT", "x")).toBe(true);
      });

      it("y is editable", () => {
        expect(isAxisEditable("FRONT", "y")).toBe(true);
      });

      it("z is NOT editable", () => {
        expect(isAxisEditable("FRONT", "z")).toBe(false);
      });
    });

    describe("LEFT view", () => {
      it("x is NOT editable", () => {
        expect(isAxisEditable("LEFT", "x")).toBe(false);
      });

      it("y is editable", () => {
        expect(isAxisEditable("LEFT", "y")).toBe(true);
      });

      it("z is editable", () => {
        expect(isAxisEditable("LEFT", "z")).toBe(true);
      });
    });

    it("perpendicular axis is never editable", () => {
      const views: OrthographicView[] = ["TOP", "BOTTOM", "FRONT", "BACK", "LEFT", "RIGHT"];
      views.forEach((view) => {
        const perpAxis = getPerpendicularAxis(view);
        expect(isAxisEditable(view, perpAxis)).toBe(false);
      });
    });
  });
});
