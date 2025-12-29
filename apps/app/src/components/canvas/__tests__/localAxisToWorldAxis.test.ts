/**
 * Tests for localAxisToWorldAxis function
 *
 * This function transforms a local axis (from TransformControls) to world axis
 * based on object rotation. This is critical for correct snapping behavior
 * when dragging rotated objects.
 */

// The function being tested (extracted from PartTransformControls.tsx)
function localAxisToWorldAxis(
  localAxis: "X" | "Y" | "Z",
  rotation: [number, number, number]
): "X" | "Y" | "Z" {
  // Get the local axis direction
  const localDir: [number, number, number] =
    localAxis === "X" ? [1, 0, 0] : localAxis === "Y" ? [0, 1, 0] : [0, 0, 1];

  // Apply rotation to get world direction
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(ry),
    sy = Math.sin(ry);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);

  let [x, y, z] = localDir;

  // Rotate Z first
  const x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  x = x1;
  y = y1;

  // Rotate Y second
  const x2 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  x = x2;
  z = z1;

  // Rotate X last
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;
  y = y2;
  z = z2;

  // Find dominant world axis
  const ax = Math.abs(x),
    ay = Math.abs(y),
    az = Math.abs(z);
  if (ax >= ay && ax >= az) return "X";
  if (ay >= ax && ay >= az) return "Y";
  return "Z";
}

describe("localAxisToWorldAxis", () => {
  describe("no rotation", () => {
    it("X axis maps to X axis", () => {
      expect(localAxisToWorldAxis("X", [0, 0, 0])).toBe("X");
    });

    it("Y axis maps to Y axis", () => {
      expect(localAxisToWorldAxis("Y", [0, 0, 0])).toBe("Y");
    });

    it("Z axis maps to Z axis", () => {
      expect(localAxisToWorldAxis("Z", [0, 0, 0])).toBe("Z");
    });
  });

  describe("90 degree Z rotation", () => {
    const zRot90 = [0, 0, Math.PI / 2] as [number, number, number];

    it("local X maps to world Y", () => {
      expect(localAxisToWorldAxis("X", zRot90)).toBe("Y");
    });

    it("local Y maps to world X", () => {
      expect(localAxisToWorldAxis("Y", zRot90)).toBe("X");
    });

    it("local Z stays world Z", () => {
      expect(localAxisToWorldAxis("Z", zRot90)).toBe("Z");
    });
  });

  describe("90 degree Y rotation", () => {
    const yRot90 = [0, Math.PI / 2, 0] as [number, number, number];

    it("local X maps to world Z", () => {
      expect(localAxisToWorldAxis("X", yRot90)).toBe("Z");
    });

    it("local Y stays world Y", () => {
      expect(localAxisToWorldAxis("Y", yRot90)).toBe("Y");
    });

    it("local Z maps to world X", () => {
      expect(localAxisToWorldAxis("Z", yRot90)).toBe("X");
    });
  });

  describe("90 degree X rotation (lying flat)", () => {
    const xRot90 = [-Math.PI / 2, 0, 0] as [number, number, number];

    it("local X stays world X", () => {
      expect(localAxisToWorldAxis("X", xRot90)).toBe("X");
    });

    it("local Y maps to world Z", () => {
      expect(localAxisToWorldAxis("Y", xRot90)).toBe("Z");
    });

    it("local Z maps to world Y", () => {
      expect(localAxisToWorldAxis("Z", xRot90)).toBe("Y");
    });
  });

  describe("compound rotation (X -90, Z -90)", () => {
    // This is the user's reported problem case
    const compoundRot = [-Math.PI / 2, 0, -Math.PI / 2] as [number, number, number];

    it("local Y maps to world X (the fix for the original bug)", () => {
      // User was dragging on X but TransformControls reported Y
      // This is because local Y axis after compound rotation points in world X direction
      expect(localAxisToWorldAxis("Y", compoundRot)).toBe("X");
    });
  });

  describe("180 degree Z rotation", () => {
    const zRot180 = [0, 0, Math.PI] as [number, number, number];

    it("local X maps to world X (opposite direction but same axis)", () => {
      expect(localAxisToWorldAxis("X", zRot180)).toBe("X");
    });

    it("local Y maps to world Y (opposite direction but same axis)", () => {
      expect(localAxisToWorldAxis("Y", zRot180)).toBe("Y");
    });
  });

  describe("-90 degree Z rotation", () => {
    const zRotNeg90 = [0, 0, -Math.PI / 2] as [number, number, number];

    it("local X maps to world Y (negative direction)", () => {
      expect(localAxisToWorldAxis("X", zRotNeg90)).toBe("Y");
    });

    it("local Y maps to world X (negative direction)", () => {
      expect(localAxisToWorldAxis("Y", zRotNeg90)).toBe("X");
    });
  });
});
