import type * as THREE from "three";
import { captureSceneAsWebP, uploadThumbnail, generateAndUploadThumbnail } from "./thumbnail";

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: jest.fn(),
}));

// Mock THREE.js completely
jest.mock("three", () => {
  const mockBox3 = {
    isEmpty: jest.fn().mockReturnValue(false),
    expandByObject: jest.fn(),
    setFromObject: jest.fn().mockReturnThis(),
    getCenter: jest.fn((target: { x: number; y: number; z: number }) => {
      target.x = 0;
      target.y = 50;
      target.z = 0;
      return target;
    }),
    min: { x: -50, y: 0, z: -50 },
    max: { x: 50, y: 100, z: 50 },
  };

  return {
    Box3: jest.fn().mockImplementation(() => mockBox3),
    Vector3: jest.fn().mockImplementation(() => ({
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn().mockReturnThis(),
    })),
    OrthographicCamera: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      up: { set: jest.fn() },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderTarget: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    LinearFilter: 1,
    RGBAFormat: 1,
    UnsignedByteType: 1,
    Scene: jest.fn().mockImplementation(() => ({
      traverse: jest.fn((callback) => {
        // Simulate one mesh in scene
        const mockMesh = {
          visible: true,
          userData: {},
        };
        // Mark as mesh for instanceof check
        Object.defineProperty(mockMesh, "constructor", { value: { name: "Mesh" } });
        callback(mockMesh);
      }),
    })),
    Mesh: jest.fn(),
  };
});

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Helper to create mock WebGL renderer
function createMockRenderer() {
  return {
    getRenderTarget: jest.fn().mockReturnValue(null),
    getPixelRatio: jest.fn().mockReturnValue(1),
    setPixelRatio: jest.fn(),
    setRenderTarget: jest.fn(),
    clear: jest.fn(),
    render: jest.fn(),
    readRenderTargetPixels: jest.fn(
      (
        _target: unknown,
        _x: number,
        _y: number,
        width: number,
        height: number,
        buffer: Uint8Array
      ) => {
        // Fill buffer with white pixels (RGBA)
        for (let i = 0; i < width * height * 4; i += 4) {
          buffer[i] = 255; // R
          buffer[i + 1] = 255; // G
          buffer[i + 2] = 255; // B
          buffer[i + 3] = 255; // A
        }
      }
    ),
  } as unknown as THREE.WebGLRenderer;
}

// Helper to create mock scene
function createMockScene(withObjects = true): THREE.Scene {
  return {
    traverse: jest.fn((callback) => {
      if (withObjects) {
        // Simulate mesh in scene for bounds calculation
        const mockMesh = { visible: true, userData: {} };
        callback(mockMesh);
      }
      // Empty scene when withObjects=false
    }),
  } as unknown as THREE.Scene;
}

// Mock canvas.toBlob and getContext
const mockToBlob = jest.fn((callback: BlobCallback, _type?: string, _quality?: number) => {
  const blob = new Blob(["mock-image-data"], { type: "image/webp" });
  callback(blob);
});

const mockPutImageData = jest.fn();
const mockCreateImageData = jest.fn().mockReturnValue({
  data: new Uint8ClampedArray(320 * 200 * 4),
  width: 320,
  height: 200,
});

// Store original createElement
const originalCreateElement = document.createElement.bind(document);

describe("thumbnail", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock canvas element with toBlob and getContext
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas") as HTMLCanvasElement;
        canvas.toBlob = mockToBlob;
        // Mock getContext to return a valid 2D context
        canvas.getContext = jest.fn().mockReturnValue({
          createImageData: mockCreateImageData,
          putImageData: mockPutImageData,
        });
        return canvas;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("captureSceneAsWebP", () => {
    it("returns a WebP blob from scene capture", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      const blob = await captureSceneAsWebP(renderer, scene);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe("image/webp");
    });

    it("renders scene with orthographic camera from TOP view", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      await captureSceneAsWebP(renderer, scene);

      // Verify render was called
      expect(renderer.render).toHaveBeenCalled();

      // Verify offscreen render target was used
      expect(renderer.setRenderTarget).toHaveBeenCalledTimes(2); // Set and restore
    });

    it("restores renderer state after capture", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      await captureSceneAsWebP(renderer, scene);

      // setRenderTarget should be called twice: once to set, once to restore (null)
      expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(null);
      expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
    });

    it("handles empty scene with default bounds", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene(false); // Empty scene

      const blob = await captureSceneAsWebP(renderer, scene);

      // Should still produce a valid blob
      expect(blob).toBeInstanceOf(Blob);
    });

    it("converts canvas to WebP with quality setting", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      await captureSceneAsWebP(renderer, scene);

      // Verify toBlob was called with webp and quality
      expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.75);
    });
  });

  describe("uploadThumbnail", () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();

    beforeEach(() => {
      mockUpload.mockReset();
      mockGetPublicUrl.mockReset();

      (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          }),
        },
      });
    });

    it("uploads blob to correct path", async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://storage.example.com/thumbnails/user123/project456.webp" },
      });

      const blob = new Blob(["test"], { type: "image/webp" });
      const result = await uploadThumbnail("user123", "project456", blob);

      expect(mockUpload).toHaveBeenCalledWith("user123/project456.webp", blob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      });
      expect(result.success).toBe(true);
      expect(result.url).toContain(
        "https://storage.example.com/thumbnails/user123/project456.webp"
      );
    });

    it("returns error on upload failure", async () => {
      mockUpload.mockResolvedValue({ error: { message: "Upload failed" } });

      const blob = new Blob(["test"], { type: "image/webp" });
      const result = await uploadThumbnail("user123", "project456", blob);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload failed");
    });

    it("adds cache-busting timestamp to URL", async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://storage.example.com/thumb.webp" },
      });

      const blob = new Blob(["test"], { type: "image/webp" });
      const result = await uploadThumbnail("user123", "project456", blob);

      expect(result.url).toMatch(/\?v=\d+$/);
    });
  });

  describe("generateAndUploadThumbnail", () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();

    beforeEach(() => {
      mockUpload.mockReset();
      mockGetPublicUrl.mockReset();

      (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          }),
        },
      });
    });

    it("captures and uploads in one operation", async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://storage.example.com/thumb.webp" },
      });

      const renderer = createMockRenderer();
      const scene = createMockScene();

      const result = await generateAndUploadThumbnail(renderer, scene, "user123", "project456");

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(mockUpload).toHaveBeenCalled();
    });

    it("returns error if capture fails", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      // Make toBlob return null
      mockToBlob.mockImplementationOnce((callback: BlobCallback) => {
        callback(null);
      });

      const result = await generateAndUploadThumbnail(renderer, scene, "user123", "project456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to capture scene");
    });

    it("returns error if upload fails", async () => {
      mockUpload.mockResolvedValue({ error: { message: "Storage error" } });

      const renderer = createMockRenderer();
      const scene = createMockScene();

      const result = await generateAndUploadThumbnail(renderer, scene, "user123", "project456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles exceptions gracefully", async () => {
      const renderer = createMockRenderer();
      const scene = createMockScene();

      // Make render throw an error
      (renderer.render as jest.Mock).mockImplementationOnce(() => {
        throw new Error("WebGL context lost");
      });

      const result = await generateAndUploadThumbnail(renderer, scene, "user123", "project456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("WebGL context lost");
    });
  });
});
