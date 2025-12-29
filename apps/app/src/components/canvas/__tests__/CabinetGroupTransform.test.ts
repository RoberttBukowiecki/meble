/**
 * Tests for CabinetGroupTransform world/local space functionality
 *
 * These tests verify that:
 * 1. Cabinet rotation is correctly extracted from worldTransform
 * 2. Proxy group has correct rotation for "local" space to work
 * 3. Translate mode keeps cabinet rotation (for local axes)
 * 4. Rotate mode resets to identity (for delta-based rotation)
 */

import { Euler, Quaternion, Vector3 } from "three";

// ============================================================================
// TYPES (matching component types)
// ============================================================================

interface WorldTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface Cabinet {
  id: string;
  worldTransform?: WorldTransform;
}

// ============================================================================
// EXTRACTED LOGIC FROM CabinetGroupTransform
// These functions mirror the component logic for testing
// ============================================================================

/**
 * Extract cabinet rotation from worldTransform (mirrors useMemo in component)
 */
function getCabinetRotation(cabinet: Cabinet | undefined): [number, number, number] {
  return cabinet?.worldTransform?.rotation ?? [0, 0, 0];
}

/**
 * Get proxy group rotation based on mode (mirrors handleTransformStart logic)
 * - Translate mode: keep cabinet rotation so "local" axes align with cabinet
 * - Rotate mode: reset to identity for delta-based rotation calculation
 */
function getProxyRotationForMode(
  mode: "translate" | "rotate",
  cabinetRotation: [number, number, number]
): [number, number, number] {
  if (mode === "rotate") {
    return [0, 0, 0];
  }
  return cabinetRotation;
}

/**
 * Calculate effective space for TransformControls
 */
function getEffectiveSpace(
  mode: "translate" | "rotate",
  userSpace: "world" | "local"
): "world" | "local" {
  // Only translate respects user space choice
  // Rotate always uses "local" (relative to proxy group)
  return mode === "translate" ? userSpace : "local";
}

/**
 * Simulate TransformControls local axis calculation
 * When space="local", axes are transformed by object's rotation
 */
function getLocalAxis(axis: "X" | "Y" | "Z", objectRotation: [number, number, number]): Vector3 {
  const baseAxis =
    axis === "X"
      ? new Vector3(1, 0, 0)
      : axis === "Y"
        ? new Vector3(0, 1, 0)
        : new Vector3(0, 0, 1);

  const rotationQuat = new Quaternion().setFromEuler(
    new Euler(objectRotation[0], objectRotation[1], objectRotation[2])
  );

  return baseAxis.clone().applyQuaternion(rotationQuat);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CabinetGroupTransform - World/Local Space", () => {
  describe("getCabinetRotation", () => {
    it("returns [0,0,0] for undefined cabinet", () => {
      const rotation = getCabinetRotation(undefined);
      expect(rotation).toEqual([0, 0, 0]);
    });

    it("returns [0,0,0] for cabinet without worldTransform", () => {
      const cabinet: Cabinet = { id: "cab-1" };
      const rotation = getCabinetRotation(cabinet);
      expect(rotation).toEqual([0, 0, 0]);
    });

    it("returns worldTransform rotation when available", () => {
      const cabinet: Cabinet = {
        id: "cab-1",
        worldTransform: {
          position: [100, 0, 200],
          rotation: [0, Math.PI / 4, 0], // 45° Y rotation
        },
      };
      const rotation = getCabinetRotation(cabinet);
      expect(rotation).toEqual([0, Math.PI / 4, 0]);
    });

    it("handles various rotation values correctly", () => {
      const testCases: [number, number, number][] = [
        [0, 0, 0],
        [0, Math.PI / 2, 0], // 90° Y
        [0, Math.PI, 0], // 180° Y
        [0, -Math.PI / 2, 0], // -90° Y
        [Math.PI / 6, Math.PI / 4, Math.PI / 3], // Complex rotation
      ];

      for (const expectedRotation of testCases) {
        const cabinet: Cabinet = {
          id: "cab-1",
          worldTransform: {
            position: [0, 0, 0],
            rotation: expectedRotation,
          },
        };
        const rotation = getCabinetRotation(cabinet);
        expect(rotation).toEqual(expectedRotation);
      }
    });
  });

  describe("getProxyRotationForMode", () => {
    const cabinetRotation: [number, number, number] = [0, Math.PI / 4, 0]; // 45° Y

    it("returns cabinet rotation for translate mode", () => {
      const proxyRotation = getProxyRotationForMode("translate", cabinetRotation);
      expect(proxyRotation).toEqual(cabinetRotation);
    });

    it("returns identity [0,0,0] for rotate mode", () => {
      const proxyRotation = getProxyRotationForMode("rotate", cabinetRotation);
      expect(proxyRotation).toEqual([0, 0, 0]);
    });

    it("preserves full rotation for translate mode", () => {
      const complexRotation: [number, number, number] = [Math.PI / 6, Math.PI / 3, Math.PI / 4];
      const proxyRotation = getProxyRotationForMode("translate", complexRotation);
      expect(proxyRotation).toEqual(complexRotation);
    });
  });

  describe("getEffectiveSpace", () => {
    it("returns user space for translate mode", () => {
      expect(getEffectiveSpace("translate", "world")).toBe("world");
      expect(getEffectiveSpace("translate", "local")).toBe("local");
    });

    it("always returns local for rotate mode", () => {
      expect(getEffectiveSpace("rotate", "world")).toBe("local");
      expect(getEffectiveSpace("rotate", "local")).toBe("local");
    });
  });

  describe("Local axis calculation", () => {
    it("returns world axis when rotation is identity", () => {
      const localX = getLocalAxis("X", [0, 0, 0]);
      const localY = getLocalAxis("Y", [0, 0, 0]);
      const localZ = getLocalAxis("Z", [0, 0, 0]);

      expect(localX.x).toBeCloseTo(1);
      expect(localX.y).toBeCloseTo(0);
      expect(localX.z).toBeCloseTo(0);

      expect(localY.x).toBeCloseTo(0);
      expect(localY.y).toBeCloseTo(1);
      expect(localY.z).toBeCloseTo(0);

      expect(localZ.x).toBeCloseTo(0);
      expect(localZ.y).toBeCloseTo(0);
      expect(localZ.z).toBeCloseTo(1);
    });

    it("rotates X axis correctly with 90° Y rotation", () => {
      // When rotated 90° around Y, local X becomes world -Z
      const localX = getLocalAxis("X", [0, Math.PI / 2, 0]);

      expect(localX.x).toBeCloseTo(0);
      expect(localX.y).toBeCloseTo(0);
      expect(localX.z).toBeCloseTo(-1);
    });

    it("rotates Z axis correctly with 90° Y rotation", () => {
      // When rotated 90° around Y, local Z becomes world X
      const localZ = getLocalAxis("Z", [0, Math.PI / 2, 0]);

      expect(localZ.x).toBeCloseTo(1);
      expect(localZ.y).toBeCloseTo(0);
      expect(localZ.z).toBeCloseTo(0);
    });

    it("Y axis remains unchanged with Y rotation", () => {
      // Y rotation doesn't affect Y axis
      const localY = getLocalAxis("Y", [0, Math.PI / 2, 0]);

      expect(localY.x).toBeCloseTo(0);
      expect(localY.y).toBeCloseTo(1);
      expect(localY.z).toBeCloseTo(0);
    });

    it("rotates axes correctly with 45° Y rotation", () => {
      const sqrt2over2 = Math.sqrt(2) / 2;

      const localX = getLocalAxis("X", [0, Math.PI / 4, 0]);
      const localZ = getLocalAxis("Z", [0, Math.PI / 4, 0]);

      // Local X at 45°: (cos(45), 0, -sin(45))
      expect(localX.x).toBeCloseTo(sqrt2over2);
      expect(localX.y).toBeCloseTo(0);
      expect(localX.z).toBeCloseTo(-sqrt2over2);

      // Local Z at 45°: (sin(45), 0, cos(45))
      expect(localZ.x).toBeCloseTo(sqrt2over2);
      expect(localZ.y).toBeCloseTo(0);
      expect(localZ.z).toBeCloseTo(sqrt2over2);
    });
  });

  describe("World vs Local space behavior", () => {
    it("world space: axes are always global regardless of cabinet rotation", () => {
      // In world space, X is always global X, even if cabinet is rotated
      const cabinetRotation: [number, number, number] = [0, Math.PI / 4, 0];

      // With identity proxy (wrong - old behavior):
      const wrongLocalX = getLocalAxis("X", [0, 0, 0]);
      expect(wrongLocalX.x).toBeCloseTo(1); // Always world X

      // This is why "local" didn't work - proxy had [0,0,0] rotation
    });

    it("local space with cabinet rotation: axes align with cabinet", () => {
      const cabinetRotation: [number, number, number] = [0, Math.PI / 4, 0];

      // With cabinet rotation on proxy (correct - new behavior):
      const correctLocalX = getLocalAxis("X", cabinetRotation);

      // Now local X is rotated 45° around Y
      const sqrt2over2 = Math.sqrt(2) / 2;
      expect(correctLocalX.x).toBeCloseTo(sqrt2over2);
      expect(correctLocalX.z).toBeCloseTo(-sqrt2over2);
    });

    it("demonstrates the fix: proxy with cabinet rotation enables proper local movement", () => {
      const cabinetRotation: [number, number, number] = [0, Math.PI / 2, 0]; // 90° Y

      // OLD BEHAVIOR: proxy always [0,0,0]
      const oldProxyRotation = getProxyRotationForMode("rotate", cabinetRotation); // Reusing rotate mode as example
      const oldLocalX = getLocalAxis("X", oldProxyRotation);

      // Old: "local X" was still world X
      expect(oldLocalX.x).toBeCloseTo(1);
      expect(oldLocalX.z).toBeCloseTo(0);

      // NEW BEHAVIOR: proxy has cabinet rotation for translate
      const newProxyRotation = getProxyRotationForMode("translate", cabinetRotation);
      const newLocalX = getLocalAxis("X", newProxyRotation);

      // New: local X is cabinet's forward direction (world -Z after 90° Y rotation)
      expect(newLocalX.x).toBeCloseTo(0);
      expect(newLocalX.z).toBeCloseTo(-1);
    });
  });

  describe("Integration: complete flow", () => {
    it("translate in local space moves along cabinet axes", () => {
      // Setup: cabinet rotated 90° around Y
      const cabinet: Cabinet = {
        id: "cab-1",
        worldTransform: {
          position: [0, 0, 0],
          rotation: [0, Math.PI / 2, 0],
        },
      };

      // Step 1: Get cabinet rotation
      const cabinetRotation = getCabinetRotation(cabinet);
      expect(cabinetRotation).toEqual([0, Math.PI / 2, 0]);

      // Step 2: Get proxy rotation for translate mode
      const proxyRotation = getProxyRotationForMode("translate", cabinetRotation);
      expect(proxyRotation).toEqual(cabinetRotation);

      // Step 3: Get effective space (user selected "local")
      const effectiveSpace = getEffectiveSpace("translate", "local");
      expect(effectiveSpace).toBe("local");

      // Step 4: Calculate local X axis (what TransformControls will use)
      const localX = getLocalAxis("X", proxyRotation);

      // Result: moving along local X moves along cabinet's front direction
      // (which is world -Z for 90° Y rotated cabinet)
      expect(localX.x).toBeCloseTo(0);
      expect(localX.z).toBeCloseTo(-1);
    });

    it("rotate mode uses identity proxy for delta calculation", () => {
      const cabinet: Cabinet = {
        id: "cab-1",
        worldTransform: {
          position: [0, 0, 0],
          rotation: [0, Math.PI / 4, 0],
        },
      };

      const cabinetRotation = getCabinetRotation(cabinet);
      const proxyRotation = getProxyRotationForMode("rotate", cabinetRotation);

      // Proxy starts at identity for rotate mode
      expect(proxyRotation).toEqual([0, 0, 0]);

      // This allows delta rotation = final - initial = final - identity = final
      // Which is then composed with existing cabinet rotation
    });

    it("switching between world and local affects translate but not rotate", () => {
      const cabinet: Cabinet = {
        id: "cab-1",
        worldTransform: {
          position: [0, 0, 0],
          rotation: [0, Math.PI / 3, 0], // 60° Y
        },
      };

      // Translate respects user choice
      expect(getEffectiveSpace("translate", "world")).toBe("world");
      expect(getEffectiveSpace("translate", "local")).toBe("local");

      // Rotate always uses local
      expect(getEffectiveSpace("rotate", "world")).toBe("local");
      expect(getEffectiveSpace("rotate", "local")).toBe("local");
    });
  });
});

describe("Edge cases", () => {
  it("handles negative rotations", () => {
    const cabinet: Cabinet = {
      id: "cab-1",
      worldTransform: {
        position: [0, 0, 0],
        rotation: [0, -Math.PI / 4, 0], // -45° Y
      },
    };

    const rotation = getCabinetRotation(cabinet);
    expect(rotation[1]).toBe(-Math.PI / 4);

    const proxyRotation = getProxyRotationForMode("translate", rotation);
    expect(proxyRotation[1]).toBe(-Math.PI / 4);
  });

  it("handles full rotation (360°)", () => {
    const cabinet: Cabinet = {
      id: "cab-1",
      worldTransform: {
        position: [0, 0, 0],
        rotation: [0, Math.PI * 2, 0], // 360° Y
      },
    };

    const rotation = getCabinetRotation(cabinet);
    const localX = getLocalAxis("X", rotation);

    // 360° rotation should be equivalent to 0°
    expect(localX.x).toBeCloseTo(1);
    expect(localX.z).toBeCloseTo(0);
  });

  it("handles very small rotations", () => {
    const smallAngle = 0.001; // ~0.057°
    const cabinet: Cabinet = {
      id: "cab-1",
      worldTransform: {
        position: [0, 0, 0],
        rotation: [0, smallAngle, 0],
      },
    };

    const rotation = getCabinetRotation(cabinet);
    expect(rotation[1]).toBe(smallAngle);

    const localX = getLocalAxis("X", rotation);
    // Should be very close to world X
    expect(localX.x).toBeCloseTo(1, 2);
    expect(localX.z).toBeCloseTo(-smallAngle, 2);
  });
});
