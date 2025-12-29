import * as THREE from "three";
import { getWallNormal, getWallCenter, isWallOccluding, setsEqual } from "./wallOcclusionUtils";
import type { WallSegment } from "@/types";

// Helper to create a minimal wall segment for testing
function createWall(start: [number, number], end: [number, number], heightMm = 2400): WallSegment {
  return {
    id: "test-wall",
    roomId: "test-room",
    start,
    end,
    thicknessMm: 100,
    heightMm,
    join: "BUTT",
    openingIds: [],
  };
}

describe("wallOcclusionUtils", () => {
  describe("getWallNormal", () => {
    it("returns perpendicular normal for wall along X axis", () => {
      // Wall from (0,0) to (1000,0) - pointing along +X
      const wall = createWall([0, 0], [1000, 0]);
      const normal = getWallNormal(wall);

      // Normal should be perpendicular, pointing in -Z direction (left side)
      expect(normal.x).toBeCloseTo(0);
      expect(normal.y).toBeCloseTo(0);
      expect(normal.z).toBeCloseTo(1);
    });

    it("returns perpendicular normal for wall along Z axis", () => {
      // Wall from (0,0) to (0,1000) - pointing along +Z
      const wall = createWall([0, 0], [0, 1000]);
      const normal = getWallNormal(wall);

      // Normal should be perpendicular, pointing in +X direction (left side)
      expect(normal.x).toBeCloseTo(-1);
      expect(normal.y).toBeCloseTo(0);
      expect(normal.z).toBeCloseTo(0);
    });

    it("returns normalized vector for diagonal wall", () => {
      // Wall at 45 degrees
      const wall = createWall([0, 0], [1000, 1000]);
      const normal = getWallNormal(wall);

      // Should be unit vector
      expect(normal.length()).toBeCloseTo(1);
      // Y should always be 0 (2D in XZ plane)
      expect(normal.y).toBeCloseTo(0);
    });

    it("handles zero-length wall gracefully", () => {
      const wall = createWall([0, 0], [0, 0]);
      const normal = getWallNormal(wall);

      // Should return a zero vector (or NaN after normalize - depends on THREE.js)
      // At minimum, should not throw
      expect(normal).toBeDefined();
    });
  });

  describe("getWallCenter", () => {
    it("calculates center point correctly", () => {
      const wall = createWall([0, 0], [1000, 0], 2400);
      const roomOrigin: [number, number] = [0, 0];
      const center = getWallCenter(wall, roomOrigin, 2400);

      expect(center.x).toBe(500); // Midpoint of 0 and 1000
      expect(center.y).toBe(1200); // Half of height
      expect(center.z).toBe(0); // Midpoint of 0 and 0
    });

    it("includes room origin offset", () => {
      const wall = createWall([0, 0], [1000, 0], 2400);
      const roomOrigin: [number, number] = [500, 300];
      const center = getWallCenter(wall, roomOrigin, 2400);

      expect(center.x).toBe(1000); // 500 (origin) + 500 (wall center)
      expect(center.z).toBe(300); // 300 (origin) + 0 (wall center)
    });

    it("uses provided wall height", () => {
      const wall = createWall([0, 0], [1000, 0], 3000);
      const roomOrigin: [number, number] = [0, 0];
      const center = getWallCenter(wall, roomOrigin, 3000);

      expect(center.y).toBe(1500); // Half of 3000
    });
  });

  describe("isWallOccluding", () => {
    const roomOrigin: [number, number] = [0, 0];
    const wallHeight = 2400;

    it("returns true when camera is behind wall", () => {
      // Wall along X axis at Z=0, normal points +Z
      const wall = createWall([0, 0], [1000, 0]);

      // Camera at negative Z (behind the wall relative to normal)
      const cameraPosition = new THREE.Vector3(500, 1200, -1000);

      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraPosition)).toBe(true);
    });

    it("returns false when camera is in front of wall", () => {
      // Wall along X axis at Z=0, normal points +Z
      const wall = createWall([0, 0], [1000, 0]);

      // Camera at positive Z (in front of the wall, same side as normal)
      const cameraPosition = new THREE.Vector3(500, 1200, 1000);

      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraPosition)).toBe(false);
    });

    it("respects custom threshold", () => {
      const wall = createWall([0, 0], [1000, 0]);

      // Camera behind wall but close - creates dot product around -0.05
      // Wall center: (500, 1200, 0), normal: +Z, camera: (500, 1200, -100)
      // toCamera direction: (0, 0, -1), dot = -1 (directly behind)
      const cameraBehind = new THREE.Vector3(500, 1200, -100);

      // With threshold 0.1, dot=-1 < 0.1, so occluding = true
      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraBehind, 0.1)).toBe(true);

      // With threshold -2 (impossible to reach), nothing should be occluding
      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraBehind, -2)).toBe(false);
    });

    it("handles diagonal walls correctly", () => {
      // Wall at 45 degrees from (0,0) to (1000,1000)
      const wall = createWall([0, 0], [1000, 1000]);

      // Camera on the "back" side (where normal doesn't point)
      const cameraPosition = new THREE.Vector3(1000, 1200, 0);
      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraPosition)).toBe(true);

      // Camera on the "front" side (where normal points)
      const cameraPositionFront = new THREE.Vector3(0, 1200, 1000);
      expect(isWallOccluding(wall, roomOrigin, wallHeight, cameraPositionFront)).toBe(false);
    });
  });

  describe("setsEqual", () => {
    it("returns true for empty sets", () => {
      expect(setsEqual(new Set(), new Set())).toBe(true);
    });

    it("returns true for identical sets", () => {
      const a = new Set(["1", "2", "3"]);
      const b = new Set(["1", "2", "3"]);
      expect(setsEqual(a, b)).toBe(true);
    });

    it("returns true regardless of insertion order", () => {
      const a = new Set(["1", "2", "3"]);
      const b = new Set(["3", "1", "2"]);
      expect(setsEqual(a, b)).toBe(true);
    });

    it("returns false for sets with different sizes", () => {
      const a = new Set(["1", "2"]);
      const b = new Set(["1", "2", "3"]);
      expect(setsEqual(a, b)).toBe(false);
    });

    it("returns false for sets with same size but different elements", () => {
      const a = new Set(["1", "2", "3"]);
      const b = new Set(["1", "2", "4"]);
      expect(setsEqual(a, b)).toBe(false);
    });

    it("handles single element sets", () => {
      expect(setsEqual(new Set(["a"]), new Set(["a"]))).toBe(true);
      expect(setsEqual(new Set(["a"]), new Set(["b"]))).toBe(false);
    });
  });
});
