/**
 * Project thumbnail generation and upload utilities
 *
 * Captures the 3D scene from TOP view and uploads to Supabase Storage as WebP
 */

import * as THREE from "three";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Thumbnail dimensions (16:10 aspect ratio to match ProjectCard)
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 200;
const THUMBNAIL_QUALITY = 0.75;

// Storage bucket name
const BUCKET_NAME = "project-thumbnails";

export interface ThumbnailResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface SceneBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

/**
 * Compute bounding box of all visible objects in the scene
 */
function computeSceneBounds(scene: THREE.Scene): SceneBounds {
  const box = new THREE.Box3();
  let hasObjects = false;

  scene.traverse((object) => {
    // Skip non-mesh objects, helpers, and invisible objects
    if (!(object instanceof THREE.Mesh)) return;
    if (!object.visible) return;
    if (object.userData?.isHelper) return;

    // Expand bounding box
    const objectBox = new THREE.Box3().setFromObject(object);
    if (!objectBox.isEmpty()) {
      box.expandByObject(object);
      hasObjects = true;
    }
  });

  // Default bounds if scene is empty
  if (!hasObjects || box.isEmpty()) {
    return {
      minX: -1000,
      maxX: 1000,
      minZ: -1000,
      maxZ: 1000,
      centerX: 0,
      centerZ: 0,
      width: 2000,
      depth: 2000,
    };
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  return {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
    centerX: center.x,
    centerZ: center.z,
    width: box.max.x - box.min.x,
    depth: box.max.z - box.min.z,
  };
}

/**
 * Capture the 3D scene as a WebP blob from TOP view
 */
export async function captureSceneAsWebP(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene
): Promise<Blob | null> {
  // Compute scene bounds for camera framing
  const bounds = computeSceneBounds(scene);

  // Add padding around the scene (10%)
  const padding = Math.max(bounds.width, bounds.depth) * 0.1;
  const viewWidth = bounds.width + padding * 2;
  const viewDepth = bounds.depth + padding * 2;

  // Calculate aspect-correct frustum
  const aspectRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
  let frustumWidth: number;
  let frustumHeight: number;

  if (viewWidth / viewDepth > aspectRatio) {
    // Scene is wider than thumbnail aspect
    frustumWidth = viewWidth;
    frustumHeight = viewWidth / aspectRatio;
  } else {
    // Scene is taller than thumbnail aspect
    frustumHeight = viewDepth;
    frustumWidth = viewDepth * aspectRatio;
  }

  // Create orthographic camera for TOP view
  const orthoCamera = new THREE.OrthographicCamera(
    -frustumWidth / 2,
    frustumWidth / 2,
    frustumHeight / 2,
    -frustumHeight / 2,
    0.1,
    100000
  );

  // Position camera above the scene center, looking down
  orthoCamera.position.set(bounds.centerX, 10000, bounds.centerZ);
  orthoCamera.up.set(0, 0, -1); // Z-axis points "up" in top view
  orthoCamera.lookAt(bounds.centerX, 0, bounds.centerZ);
  orthoCamera.updateProjectionMatrix();

  // Create offscreen render target
  const renderTarget = new THREE.WebGLRenderTarget(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });

  // Store current renderer state
  const currentRenderTarget = gl.getRenderTarget();
  const currentPixelRatio = gl.getPixelRatio();

  try {
    // Render to offscreen target
    gl.setPixelRatio(1);
    gl.setRenderTarget(renderTarget);
    gl.clear();
    gl.render(scene, orthoCamera);

    // Read pixels from render target
    const pixels = new Uint8Array(THUMBNAIL_WIDTH * THUMBNAIL_HEIGHT * 4);
    gl.readRenderTargetPixels(renderTarget, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, pixels);

    // Create 2D canvas for conversion
    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Failed to get 2D canvas context for thumbnail");
      return null;
    }

    // Create ImageData and flip Y axis (WebGL is bottom-up)
    const imageData = ctx.createImageData(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    for (let y = 0; y < THUMBNAIL_HEIGHT; y++) {
      for (let x = 0; x < THUMBNAIL_WIDTH; x++) {
        const srcIdx = ((THUMBNAIL_HEIGHT - 1 - y) * THUMBNAIL_WIDTH + x) * 4;
        const dstIdx = (y * THUMBNAIL_WIDTH + x) * 4;
        imageData.data[dstIdx] = pixels[srcIdx]; // R
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1]; // G
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2]; // B
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3]; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert to WebP blob
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", THUMBNAIL_QUALITY);
    });
  } finally {
    // Restore renderer state
    gl.setRenderTarget(currentRenderTarget);
    gl.setPixelRatio(currentPixelRatio);
    renderTarget.dispose();
  }
}

/**
 * Upload thumbnail to Supabase Storage
 * Uses upsert to overwrite existing thumbnail for the project
 */
export async function uploadThumbnail(
  userId: string,
  projectId: string,
  blob: Blob
): Promise<ThumbnailResult> {
  const supabase = getSupabaseBrowserClient();
  const filePath = `${userId}/${projectId}.webp`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, blob, {
    contentType: "image/webp",
    upsert: true, // Overwrite existing file
    cacheControl: "3600", // Cache for 1 hour
  });

  if (error) {
    console.error("Failed to upload thumbnail:", error);
    return { success: false, error: error.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  // Add cache-busting timestamp to URL
  const url = `${urlData.publicUrl}?v=${Date.now()}`;

  return { success: true, url };
}

/**
 * Generate and upload project thumbnail
 * Combines capture and upload into a single operation
 */
export async function generateAndUploadThumbnail(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  userId: string,
  projectId: string
): Promise<ThumbnailResult> {
  try {
    // Capture scene as WebP
    const blob = await captureSceneAsWebP(gl, scene);

    if (!blob) {
      return { success: false, error: "Failed to capture scene" };
    }

    // Upload to storage
    return await uploadThumbnail(userId, projectId, blob);
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
