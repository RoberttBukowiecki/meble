/**
 * Tests for CornerDomain
 *
 * Tests cover:
 * - Creators (createConfig, createParams)
 * - Updaters (immutable updates)
 * - Calculators (front panel width, side height, bounding box)
 * - Validators
 * - Queries
 */

import { CornerDomain, CORNER_DEFAULTS, CORNER_LIMITS } from "./corner";
import type { CornerConfig } from "@/types";

describe("CornerDomain", () => {
  // ==========================================================================
  // CREATORS
  // ==========================================================================
  describe("createConfig", () => {
    it("should create default corner config with correct fields", () => {
      const config = CornerDomain.createConfig();

      expect(config.wallSide).toBe("LEFT");
      expect(config.W).toBe(CORNER_DEFAULTS.W);
      expect(config.D).toBe(CORNER_DEFAULTS.D);
      expect(config.bottomMount).toBe("inset");
      expect(config.topMount).toBe("inset");
      expect(config.frontType).toBe("SINGLE");
      expect(config.doorGap).toBe(2);
      expect(config.doorPosition).toBe("RIGHT");
      expect(config.doorWidth).toBe(450);
    });

    it("should create config with specified wall side", () => {
      const config = CornerDomain.createConfig("RIGHT");

      expect(config.wallSide).toBe("RIGHT");
    });
  });

  describe("createParams", () => {
    it("should create corner cabinet params with defaults", () => {
      const params = CornerDomain.createParams(1000, 720, 600);

      expect(params.type).toBe("CORNER_INTERNAL");
      expect(params.width).toBe(1000);
      expect(params.height).toBe(720);
      expect(params.depth).toBe(600);
      expect(params.cornerConfig).toBeDefined();
    });

    it("should merge custom corner config", () => {
      const params = CornerDomain.createParams(1000, 720, 600, {
        frontType: "NONE",
      });

      expect(params.cornerConfig.frontType).toBe("NONE");
    });
  });

  // ==========================================================================
  // UPDATERS
  // ==========================================================================
  describe("updateDimensions", () => {
    it("should update W and D dimensions", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateDimensions(config, 1200, 700);

      expect(updated.W).toBe(1200);
      expect(updated.D).toBe(700);
      // Original should be unchanged
      expect(config.W).toBe(CORNER_DEFAULTS.W);
    });

    it("should clamp dimensions to limits", () => {
      const config = CornerDomain.createConfig();

      const tooSmall = CornerDomain.updateDimensions(config, 100, 100);
      expect(tooSmall.W).toBe(CORNER_LIMITS.MIN_W);
      expect(tooSmall.D).toBe(CORNER_LIMITS.MIN_D);

      const tooBig = CornerDomain.updateDimensions(config, 5000, 2000);
      expect(tooBig.W).toBe(CORNER_LIMITS.MAX_W);
      expect(tooBig.D).toBe(CORNER_LIMITS.MAX_D);
    });
  });

  describe("updateWallSide", () => {
    it("should update wall side", () => {
      const config = CornerDomain.createConfig("LEFT");
      const updated = CornerDomain.updateWallSide(config, "RIGHT");

      expect(updated.wallSide).toBe("RIGHT");
    });
  });

  describe("updateDoorPosition", () => {
    it("should update door position", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateDoorPosition(config, "LEFT");

      expect(updated.doorPosition).toBe("LEFT");
    });
  });

  describe("updateDoorWidth", () => {
    it("should update door width", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateDoorWidth(config, 500);

      expect(updated.doorWidth).toBe(500);
    });

    it("should clamp door width to limits", () => {
      const config = CornerDomain.createConfig();

      const tooSmall = CornerDomain.updateDoorWidth(config, 50);
      expect(tooSmall.doorWidth).toBe(CORNER_LIMITS.MIN_DOOR_WIDTH);

      const tooBig = CornerDomain.updateDoorWidth(config, 1200);
      expect(tooBig.doorWidth).toBe(CORNER_LIMITS.MAX_DOOR_WIDTH);
    });
  });

  describe("updateBottomMount", () => {
    it("should update bottom mount type", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateBottomMount(config, "overlay");

      expect(updated.bottomMount).toBe("overlay");
    });
  });

  describe("updateTopMount", () => {
    it("should update top mount type", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateTopMount(config, "overlay");

      expect(updated.topMount).toBe("overlay");
    });
  });

  describe("updateFrontType", () => {
    it("should update front type", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateFrontType(config, "NONE");

      expect(updated.frontType).toBe("NONE");
    });
  });

  describe("updateHingeSide", () => {
    it("should update hinge side", () => {
      const config = CornerDomain.createConfig();
      const updated = CornerDomain.updateHingeSide(config, "right");

      expect(updated.hingeSide).toBe("right");
    });
  });

  // ==========================================================================
  // CALCULATORS
  // ==========================================================================
  describe("calculateFrontPanelWidth", () => {
    it("should calculate front panel width correctly", () => {
      const config: CornerConfig = {
        ...CornerDomain.createConfig(),
        W: 1000,
        doorWidth: 450,
        doorGap: 2,
      };
      // Front panel width = W - doorWidth - gap*3 - bodyThickness*2
      // = 1000 - 450 - 6 - 36 = 508
      const panelWidth = CornerDomain.calculateFrontPanelWidth(config, 18);
      expect(panelWidth).toBe(508);
    });
  });

  describe("calculateSideHeight", () => {
    it("should return full height for inset mounting", () => {
      const height = CornerDomain.calculateSideHeight(720, "inset", "inset", 18);
      expect(height).toBe(720);
    });

    it("should subtract thickness for overlay mounting", () => {
      const height = CornerDomain.calculateSideHeight(720, "overlay", "overlay", 18);
      expect(height).toBe(720 - 2 * 18);
    });

    it("should handle mixed mounting", () => {
      const height = CornerDomain.calculateSideHeight(720, "overlay", "inset", 18);
      expect(height).toBe(720 - 18);
    });
  });

  describe("calculateBoundingBox", () => {
    it("should return correct bounding box", () => {
      const config = CornerDomain.createConfig();
      const bbox = CornerDomain.calculateBoundingBox(config, 720);

      expect(bbox.width).toBe(config.W);
      expect(bbox.height).toBe(720);
      expect(bbox.depth).toBe(config.D);
    });
  });

  describe("calculateInteriorSpace", () => {
    it("should return interior space dimensions", () => {
      const config = CornerDomain.createConfig();
      const interior = CornerDomain.calculateInteriorSpace(config, 720, 18, 3);

      // Width = W - 2*t
      expect(interior.width).toBe(config.W - 36);
      // Height = H - 2*t = 720 - 36 = 684
      expect(interior.height).toBe(720 - 36);
      // Depth = D - t - backT
      expect(interior.depth).toBe(config.D - 21);
    });
  });

  // ==========================================================================
  // VALIDATORS
  // ==========================================================================
  describe("validate", () => {
    it("should pass for valid config", () => {
      const config = CornerDomain.createConfig();
      const result = CornerDomain.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when W is too small", () => {
      const config: CornerConfig = {
        ...CornerDomain.createConfig(),
        W: 100,
      };
      const result = CornerDomain.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should fail when D is too large", () => {
      const config: CornerConfig = {
        ...CornerDomain.createConfig(),
        D: 2000,
      };
      const result = CornerDomain.validate(config);

      expect(result.valid).toBe(false);
    });

    it("should fail when door width is too small", () => {
      const config: CornerConfig = {
        ...CornerDomain.createConfig(),
        doorWidth: 50,
      };
      const result = CornerDomain.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("drzwi"))).toBe(true);
    });

    it("should fail when door width is too large", () => {
      const config: CornerConfig = {
        ...CornerDomain.createConfig(),
        W: 500,
        doorWidth: 450, // >= W - 100
      };
      const result = CornerDomain.validate(config);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateParams", () => {
    it("should pass for valid params", () => {
      const params = CornerDomain.createParams(1000, 720, 600);
      const result = CornerDomain.validateParams(params);

      expect(result.valid).toBe(true);
    });

    it("should fail when height is out of range", () => {
      const params = CornerDomain.createParams(1000, 50, 600);
      const result = CornerDomain.validateParams(params);

      expect(result.valid).toBe(false);
    });
  });

  // ==========================================================================
  // QUERIES
  // ==========================================================================
  describe("hasFront", () => {
    it("should return true for SINGLE front type", () => {
      const config = CornerDomain.createConfig();
      expect(CornerDomain.hasFront(config)).toBe(true);
    });

    it("should return false for NONE front type", () => {
      const config = CornerDomain.updateFrontType(CornerDomain.createConfig(), "NONE");
      expect(CornerDomain.hasFront(config)).toBe(false);
    });
  });

  describe("isWallLeft", () => {
    it("should return true for LEFT wall side", () => {
      const config = CornerDomain.createConfig("LEFT");
      expect(CornerDomain.isWallLeft(config)).toBe(true);
    });

    it("should return false for RIGHT wall side", () => {
      const config = CornerDomain.createConfig("RIGHT");
      expect(CornerDomain.isWallLeft(config)).toBe(false);
    });
  });

  describe("isDoorLeft", () => {
    it("should return true for LEFT door position", () => {
      const config = CornerDomain.updateDoorPosition(CornerDomain.createConfig(), "LEFT");
      expect(CornerDomain.isDoorLeft(config)).toBe(true);
    });

    it("should return false for RIGHT door position", () => {
      const config = CornerDomain.createConfig(); // Default is RIGHT
      expect(CornerDomain.isDoorLeft(config)).toBe(false);
    });
  });

  describe("getWallSideLabel", () => {
    it("should return Polish label for LEFT", () => {
      expect(CornerDomain.getWallSideLabel("LEFT")).toContain("Lewa");
    });

    it("should return Polish label for RIGHT", () => {
      expect(CornerDomain.getWallSideLabel("RIGHT")).toContain("Prawa");
    });
  });

  describe("getDoorPositionLabel", () => {
    it("should return Polish label for LEFT", () => {
      expect(CornerDomain.getDoorPositionLabel("LEFT")).toContain("lewej");
    });

    it("should return Polish label for RIGHT", () => {
      expect(CornerDomain.getDoorPositionLabel("RIGHT")).toContain("prawej");
    });
  });

  describe("getFrontTypeLabel", () => {
    it("should return Polish labels", () => {
      expect(CornerDomain.getFrontTypeLabel("NONE")).toBe("Brak");
      expect(CornerDomain.getFrontTypeLabel("SINGLE")).toContain("panel");
    });
  });

  describe("getSummary", () => {
    it("should return human-readable summary", () => {
      const config = CornerDomain.createConfig();
      const summary = CornerDomain.getSummary(config);

      expect(summary).toContain(String(CORNER_DEFAULTS.W));
      expect(summary).toContain(String(CORNER_DEFAULTS.D));
      expect(summary).toContain("L"); // LEFT wall side
    });
  });
});
