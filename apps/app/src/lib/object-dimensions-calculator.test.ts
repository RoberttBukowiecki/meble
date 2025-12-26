/**
 * Tests for Object Dimensions Calculator
 * Focuses on rotation-aware dimension calculations
 */

import {
  calculateObjectDimensions,
  calculateAllObjectDimensions,
} from "./object-dimensions-calculator";
import type { Part, Cabinet, CountertopGroup } from "@/types";

// ============================================================================
// Test Helpers
// ============================================================================

function createTestPart(overrides: Partial<Part> = {}): Part {
  return {
    id: "test-part-1",
    name: "Test Part",
    furnitureId: "furniture-1",
    shapeType: "RECTANGLE",
    shapeParams: { type: "RECTANGLE" },
    width: 500,
    height: 800,
    depth: 18,
    position: [0, 400, 0],
    rotation: [0, 0, 0],
    materialId: "mat-1",
    edgeBanding: { top: null, bottom: null, left: null, right: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestCabinet(overrides: Partial<Cabinet> = {}): Cabinet {
  return {
    id: "test-cabinet-1",
    name: "Test Cabinet",
    furnitureId: "furniture-1",
    type: "KITCHEN",
    params: {
      type: "KITCHEN",
      width: 600,
      height: 720,
      depth: 560,
      topBottomPlacement: "inset",
      hasBack: true,
      backOverlapRatio: 0.67,
      backMountType: "overlap",
      shelfCount: 1,
      hasDoors: true,
    },
    materials: {
      bodyMaterialId: "mat-1",
      frontMaterialId: "mat-2",
    },
    topBottomPlacement: "inset",
    partIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests for Local Space Calculations
// ============================================================================

describe("Object Dimensions Calculator", () => {
  describe("calculateObjectDimensions - Local Space", () => {
    it("should calculate dimensions in local space (centered at origin)", () => {
      const objectInfo = {
        objectId: "part-1",
        objectType: "part" as const,
        localSize: [500, 800, 18] as [number, number, number],
        worldCenter: [100, 400, 50] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        boundingBox: {
          min: [-150, 0, 41] as [number, number, number],
          max: [350, 800, 59] as [number, number, number],
        },
      };

      const result = calculateObjectDimensions(
        "part-1",
        "part",
        objectInfo,
        1000, // camera X
        500, // camera Y
        1000 // camera Z
      );

      // Dimensions should be in local space (relative to center at 0,0,0)
      // Width dimension (X axis): from -250 to 250 (half of 500)
      const widthDim = result.dimensions.find((d) => d.label === "W");
      expect(widthDim).toBeDefined();
      expect(widthDim!.startPoint[0]).toBe(-250); // -halfW
      expect(widthDim!.endPoint[0]).toBe(250); // +halfW
      expect(widthDim!.length).toBe(500);

      // Height dimension (Y axis): from -400 to 400 (half of 800)
      const heightDim = result.dimensions.find((d) => d.label === "H");
      expect(heightDim).toBeDefined();
      expect(heightDim!.startPoint[1]).toBe(-400); // -halfH
      expect(heightDim!.endPoint[1]).toBe(400); // +halfH
      expect(heightDim!.length).toBe(800);

      // Check that worldCenter and rotation are passed through
      expect(result.worldCenter).toEqual([100, 400, 50]);
      expect(result.rotation).toEqual([0, 0, 0]);
      expect(result.localSize).toEqual([500, 800, 18]);
    });

    it("should position dimensions on camera-facing side (no rotation)", () => {
      const objectInfo = {
        objectId: "part-1",
        objectType: "part" as const,
        localSize: [500, 800, 18] as [number, number, number],
        worldCenter: [0, 400, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        boundingBox: {
          min: [-250, 0, -9] as [number, number, number],
          max: [250, 800, 9] as [number, number, number],
        },
      };

      // Camera in positive X, Y, Z quadrant
      const resultPositive = calculateObjectDimensions(
        "part-1",
        "part",
        objectInfo,
        1000,
        1000,
        1000
      );

      // Width line should be at positive Y and Z (camera side)
      const widthDimPos = resultPositive.dimensions.find((d) => d.label === "W");
      expect(widthDimPos!.startPoint[1]).toBeGreaterThan(0); // Y offset towards camera
      expect(widthDimPos!.startPoint[2]).toBeGreaterThan(0); // Z offset towards camera

      // Camera in negative X, Y, Z quadrant
      const resultNegative = calculateObjectDimensions(
        "part-1",
        "part",
        objectInfo,
        -1000,
        -1000,
        -1000
      );

      // Width line should be at negative Y and Z (camera side)
      const widthDimNeg = resultNegative.dimensions.find((d) => d.label === "W");
      expect(widthDimNeg!.startPoint[1]).toBeLessThan(0); // Y offset towards camera
      expect(widthDimNeg!.startPoint[2]).toBeLessThan(0); // Z offset towards camera
    });

    it("should handle 90-degree Y rotation correctly", () => {
      // Object rotated 90 degrees around Y axis
      // Camera at world position (1000, 500, 0)
      // In local space (after inverse rotation), camera should appear at (0, 500, -1000)
      const objectInfo = {
        objectId: "part-1",
        objectType: "part" as const,
        localSize: [500, 800, 300] as [number, number, number],
        worldCenter: [0, 400, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number], // 90 deg Y
        boundingBox: {
          min: [-150, 0, -250] as [number, number, number],
          max: [150, 800, 250] as [number, number, number],
        },
      };

      const result = calculateObjectDimensions(
        "part-1",
        "part",
        objectInfo,
        1000,
        500,
        0 // Camera at positive X in world space
      );

      // After 90-degree Y rotation, world +X becomes local -Z
      // So camera appears at local -Z, meaning useMaxZ should be false
      const depthDim = result.dimensions.find((d) => d.label === "D");
      expect(depthDim).toBeDefined();
      // Depth line should be positioned at negative Z (camera side after rotation)
      expect(depthDim!.startPoint[2]).toBe(-150); // -halfD
      expect(depthDim!.endPoint[2]).toBe(150); // +halfD
    });

    it("should handle 180-degree Y rotation correctly", () => {
      const objectInfo = {
        objectId: "part-1",
        objectType: "part" as const,
        localSize: [500, 800, 300] as [number, number, number],
        worldCenter: [0, 400, 0] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number], // 180 deg Y
        boundingBox: {
          min: [-250, 0, -150] as [number, number, number],
          max: [250, 800, 150] as [number, number, number],
        },
      };

      // Camera at positive X in world space
      // After 180 deg Y rotation, world +X becomes local -X
      const result = calculateObjectDimensions("part-1", "part", objectInfo, 1000, 500, 0);

      // Width dimension should be positioned at negative X side (camera side)
      const heightDim = result.dimensions.find((d) => d.label === "H");
      expect(heightDim).toBeDefined();
      expect(heightDim!.startPoint[0]).toBeLessThan(0); // Should be on -X side
    });
  });

  describe("calculateAllObjectDimensions - Integration", () => {
    it("should return rotation and worldCenter for parts", () => {
      const part = createTestPart({
        id: "rotated-part",
        position: [100, 200, 50],
        rotation: [0, Math.PI / 4, 0], // 45 deg Y rotation
        width: 400,
        height: 600,
        depth: 18,
      });

      const results = calculateAllObjectDimensions(
        "selection",
        "part",
        [part],
        [],
        [],
        "rotated-part",
        null,
        new Set(),
        null,
        "furniture-1",
        new Set(),
        1000,
        500,
        1000
      );

      expect(results).toHaveLength(1);
      expect(results[0].worldCenter).toEqual([100, 200, 50]);
      expect(results[0].rotation).toEqual([0, Math.PI / 4, 0]);
      expect(results[0].localSize).toEqual([400, 600, 18]);
    });

    it("should return cabinet rotation from worldTransform", () => {
      const cabinetPart = createTestPart({
        id: "cab-part-1",
        position: [300, 360, 280],
        rotation: [0, Math.PI / 2, 0],
        width: 600,
        height: 720,
        depth: 18,
        cabinetMetadata: {
          cabinetId: "cabinet-1",
          role: "LEFT_SIDE",
        },
      });

      const cabinet = createTestCabinet({
        id: "cabinet-1",
        partIds: ["cab-part-1"],
        worldTransform: {
          position: [300, 360, 280],
          rotation: [0, Math.PI / 2, 0],
        },
      });

      const results = calculateAllObjectDimensions(
        "selection",
        "group",
        [cabinetPart],
        [cabinet],
        [],
        null,
        "cabinet-1",
        new Set(),
        null,
        "furniture-1",
        new Set(),
        1000,
        500,
        1000
      );

      expect(results).toHaveLength(1);
      expect(results[0].rotation).toEqual([0, Math.PI / 2, 0]);
      expect(results[0].worldCenter).toEqual([300, 360, 280]);
      // Local size from cabinet params
      expect(results[0].localSize).toEqual([600, 720, 560]);
    });

    it("should use zero rotation for multiselect", () => {
      const part1 = createTestPart({
        id: "part-1",
        position: [0, 400, 0],
        rotation: [0, Math.PI / 4, 0],
      });
      const part2 = createTestPart({
        id: "part-2",
        position: [600, 400, 0],
        rotation: [0, -Math.PI / 4, 0],
      });

      const results = calculateAllObjectDimensions(
        "selection",
        "group",
        [part1, part2],
        [],
        [],
        null,
        null,
        new Set(["part-1", "part-2"]),
        null,
        "furniture-1",
        new Set(),
        1000,
        500,
        1000
      );

      expect(results).toHaveLength(1);
      // Multiselect should have zero rotation (uses AABB)
      expect(results[0].rotation).toEqual([0, 0, 0]);
    });

    it("should use zero rotation for countertop", () => {
      const cabinetPart = createTestPart({
        id: "cab-part",
        position: [300, 360, 280],
        cabinetMetadata: { cabinetId: "cab-1", role: "BOTTOM" },
      });

      const cabinet = createTestCabinet({
        id: "cab-1",
        partIds: ["cab-part"],
      });

      const countertop: CountertopGroup = {
        id: "ct-1",
        furnitureId: "furniture-1",
        name: "Countertop",
        segments: [
          {
            id: "seg-1",
            cabinetIds: ["cab-1"],
            materialId: "mat-1",
            thickness: 28,
            overhang: { front: 20, back: 0, left: 20, right: 20 },
            edgeBanding: { front: null, back: null, left: null, right: null },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const results = calculateAllObjectDimensions(
        "selection",
        "group",
        [cabinetPart],
        [cabinet],
        [countertop],
        null,
        null,
        new Set(),
        "ct-1",
        "furniture-1",
        new Set(),
        1000,
        500,
        1000
      );

      expect(results).toHaveLength(1);
      // Countertop should have zero rotation
      expect(results[0].rotation).toEqual([0, 0, 0]);
    });
  });

  describe("Dimension values correctness", () => {
    it("should calculate correct dimension lengths regardless of rotation", () => {
      // A 500x800x18 part rotated 45 degrees should still show W=500, H=800, D=18
      const objectInfo = {
        objectId: "part-1",
        objectType: "part" as const,
        localSize: [500, 800, 18] as [number, number, number],
        worldCenter: [0, 400, 0] as [number, number, number],
        rotation: [0, Math.PI / 4, 0] as [number, number, number],
        boundingBox: {
          min: [-300, 0, -300] as [number, number, number],
          max: [300, 800, 300] as [number, number, number],
        },
      };

      const result = calculateObjectDimensions("part-1", "part", objectInfo, 1000, 500, 1000);

      expect(result.dimensions.find((d) => d.label === "W")!.length).toBe(500);
      expect(result.dimensions.find((d) => d.label === "H")!.length).toBe(800);
      expect(result.dimensions.find((d) => d.label === "D")!.length).toBe(18);
    });

    it("should skip dimensions smaller than minimum size", () => {
      const objectInfo = {
        objectId: "thin-part",
        objectType: "part" as const,
        localSize: [500, 800, 5] as [number, number, number], // Depth < 10mm
        worldCenter: [0, 400, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        boundingBox: {
          min: [-250, 0, -2.5] as [number, number, number],
          max: [250, 800, 2.5] as [number, number, number],
        },
      };

      const result = calculateObjectDimensions("thin-part", "part", objectInfo, 1000, 500, 1000);

      // Should have W and H, but not D (too small)
      expect(result.dimensions.find((d) => d.label === "W")).toBeDefined();
      expect(result.dimensions.find((d) => d.label === "H")).toBeDefined();
      expect(result.dimensions.find((d) => d.label === "D")).toBeUndefined();
    });
  });
});
