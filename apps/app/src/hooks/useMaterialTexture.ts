/**
 * useMaterialTexture Hook
 *
 * Loads and caches material textures from remote URLs.
 * Supports diffuse textures and normal maps for PBR rendering.
 * Implements LRU cache with automatic cleanup to prevent memory leaks.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import type { Material, MaterialTexture } from "@/types";

// ============================================================================
// LRU Texture Cache Configuration
// ============================================================================

/** Maximum number of textures to keep in cache */
const TEXTURE_CACHE_MAX_SIZE = 30;

/** Minimum cache size after cleanup (keeps most recently used) */
const TEXTURE_CACHE_MIN_SIZE = 20;

// ============================================================================
// LRU Texture Cache Implementation
// ============================================================================

interface CachedTexture {
  texture: THREE.Texture;
  lastAccessed: number;
  refCount: number;
}

// Global texture cache with LRU tracking
const textureCache = new Map<string, CachedTexture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

/**
 * Update last accessed time for a cached texture
 */
function touchTexture(url: string): void {
  const cached = textureCache.get(url);
  if (cached) {
    cached.lastAccessed = Date.now();
  }
}

/**
 * Increment reference count for a texture
 */
function acquireTexture(url: string): void {
  const cached = textureCache.get(url);
  if (cached) {
    cached.refCount++;
    cached.lastAccessed = Date.now();
  }
}

/**
 * Decrement reference count for a texture
 */
function releaseTexture(url: string): void {
  const cached = textureCache.get(url);
  if (cached) {
    cached.refCount = Math.max(0, cached.refCount - 1);
  }
}

/**
 * Clean up least recently used textures when cache exceeds max size
 * Only removes textures with refCount === 0 (not actively used)
 */
function cleanupCache(): void {
  if (textureCache.size <= TEXTURE_CACHE_MAX_SIZE) {
    return;
  }

  // Get all entries sorted by last accessed time (oldest first)
  const entries = Array.from(textureCache.entries())
    .filter(([, cached]) => cached.refCount === 0) // Only consider unused textures
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

  // Calculate how many to remove
  const toRemove = textureCache.size - TEXTURE_CACHE_MIN_SIZE;
  let removed = 0;

  for (const [url, cached] of entries) {
    if (removed >= toRemove) break;

    // Dispose the Three.js texture to free GPU memory
    cached.texture.dispose();
    textureCache.delete(url);
    removed++;
  }

  if (removed > 0) {
    console.debug(
      `[TextureCache] Cleaned up ${removed} unused textures. Cache size: ${textureCache.size}`
    );
  }
}

/**
 * Load a texture from URL with LRU caching
 */
async function loadTexture(url: string): Promise<THREE.Texture> {
  // Return from cache if available
  const cached = textureCache.get(url);
  if (cached) {
    touchTexture(url);
    return cached.texture;
  }

  // Wait for existing loading promise if in progress
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Clean up cache before adding new texture
  cleanupCache();

  // Start new loading
  const loader = new THREE.TextureLoader();
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        // Configure texture for better quality
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 16;

        // Store in cache with metadata
        textureCache.set(url, {
          texture,
          lastAccessed: Date.now(),
          refCount: 0,
        });
        loadingPromises.delete(url);
        resolve(texture);
      },
      undefined,
      (error) => {
        loadingPromises.delete(url);
        reject(error);
      }
    );
  });

  loadingPromises.set(url, promise);
  return promise;
}

/**
 * Configure texture repeat and rotation based on material settings
 */
function configureTexture(texture: THREE.Texture, config: MaterialTexture): THREE.Texture {
  const clonedTexture = texture.clone();
  clonedTexture.needsUpdate = true;

  // Apply repeat
  const repeatX = config.repeatX ?? 1;
  const repeatY = config.repeatY ?? 1;
  clonedTexture.repeat.set(repeatX, repeatY);

  // Apply rotation
  if (config.rotation) {
    clonedTexture.rotation = config.rotation;
    clonedTexture.center.set(0.5, 0.5);
  }

  return clonedTexture;
}

export interface MaterialTextureResult {
  /** The loaded diffuse texture (or null if not available/loading) */
  diffuseMap: THREE.Texture | null;
  /** The loaded normal map (or null if not available/loading) */
  normalMap: THREE.Texture | null;
  /** True while textures are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** PBR roughness value */
  roughness: number;
  /** PBR metalness value */
  metalness: number;
}

/**
 * Hook to load material textures from remote URLs
 *
 * @param material - The material object with optional texture configuration
 * @returns Texture maps and loading state
 *
 * @example
 * ```tsx
 * function Part3D({ part }) {
 *   const material = useMaterial(part.materialId);
 *   const { diffuseMap, normalMap, roughness, metalness, isLoading } = useMaterialTexture(material);
 *
 *   return (
 *     <mesh>
 *       <boxGeometry args={[part.width, part.height, part.depth]} />
 *       <meshStandardMaterial
 *         color={material?.color || '#808080'}
 *         map={diffuseMap}
 *         normalMap={normalMap}
 *         roughness={roughness}
 *         metalness={metalness}
 *       />
 *     </mesh>
 *   );
 * }
 * ```
 */
export function useMaterialTexture(material: Material | undefined | null): MaterialTextureResult {
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null);
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track textures for cleanup
  const diffuseMapRef = useRef<THREE.Texture | null>(null);
  const normalMapRef = useRef<THREE.Texture | null>(null);

  const textureConfig = material?.texture;

  // Track which URLs this component is using for reference counting
  const activeUrlsRef = useRef<{ diffuse: string | null; normal: string | null }>({
    diffuse: null,
    normal: null,
  });

  useEffect(() => {
    // Release previous texture references
    if (activeUrlsRef.current.diffuse) {
      releaseTexture(activeUrlsRef.current.diffuse);
    }
    if (activeUrlsRef.current.normal) {
      releaseTexture(activeUrlsRef.current.normal);
    }

    // Dispose previous cloned textures before loading new ones
    if (diffuseMapRef.current) {
      diffuseMapRef.current.dispose();
      diffuseMapRef.current = null;
    }
    if (normalMapRef.current) {
      normalMapRef.current.dispose();
      normalMapRef.current = null;
    }

    // Reset state when material changes
    setDiffuseMap(null);
    setNormalMap(null);
    setError(null);
    activeUrlsRef.current = { diffuse: null, normal: null };

    if (!textureConfig?.url) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadTextures = async () => {
      try {
        // Load diffuse texture
        const baseTexture = await loadTexture(textureConfig.url);
        acquireTexture(textureConfig.url);
        activeUrlsRef.current.diffuse = textureConfig.url;

        const configuredDiffuse = configureTexture(baseTexture, textureConfig);
        diffuseMapRef.current = configuredDiffuse;
        setDiffuseMap(configuredDiffuse);

        // Load normal map if available
        if (textureConfig.normalMapUrl) {
          const normalTexture = await loadTexture(textureConfig.normalMapUrl);
          acquireTexture(textureConfig.normalMapUrl);
          activeUrlsRef.current.normal = textureConfig.normalMapUrl;

          const configuredNormal = configureTexture(normalTexture, textureConfig);
          normalMapRef.current = configuredNormal;
          setNormalMap(configuredNormal);
        }

        setError(null);
      } catch (err) {
        console.error("Failed to load material texture:", err);
        setError(err instanceof Error ? err.message : "Failed to load texture");
      } finally {
        setIsLoading(false);
      }
    };

    loadTextures();

    // Cleanup: dispose cloned textures and release references on unmount
    return () => {
      if (activeUrlsRef.current.diffuse) {
        releaseTexture(activeUrlsRef.current.diffuse);
      }
      if (activeUrlsRef.current.normal) {
        releaseTexture(activeUrlsRef.current.normal);
      }
      if (diffuseMapRef.current) {
        diffuseMapRef.current.dispose();
        diffuseMapRef.current = null;
      }
      if (normalMapRef.current) {
        normalMapRef.current.dispose();
        normalMapRef.current = null;
      }
    };
    // textureConfig is intentionally not in deps - we only reload when URLs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureConfig?.url, textureConfig?.normalMapUrl]);

  // PBR properties with defaults
  const roughness = material?.pbr?.roughness ?? 0.7;
  const metalness = material?.pbr?.metalness ?? 0;

  return {
    diffuseMap,
    normalMap,
    isLoading,
    error,
    roughness,
    metalness,
  };
}

/**
 * Preload textures for a list of materials
 * Call this early to avoid loading delays when materials are used
 */
export async function preloadMaterialTextures(materials: Material[]): Promise<void> {
  const textureUrls: string[] = [];

  for (const material of materials) {
    if (material.texture?.url) {
      textureUrls.push(material.texture.url);
    }
    if (material.texture?.normalMapUrl) {
      textureUrls.push(material.texture.normalMapUrl);
    }
  }

  await Promise.allSettled(textureUrls.map(loadTexture));
}

/**
 * Clear the texture cache (useful for memory management)
 * Only clears textures with refCount === 0 by default
 * @param force - If true, clears ALL textures regardless of refCount
 */
export function clearTextureCache(force = false): void {
  if (force) {
    Array.from(textureCache.values()).forEach((cached) => {
      cached.texture.dispose();
    });
    textureCache.clear();
    console.debug("[TextureCache] Force cleared all textures");
  } else {
    // Only clear unused textures
    const toDelete: string[] = [];
    textureCache.forEach((cached, url) => {
      if (cached.refCount === 0) {
        cached.texture.dispose();
        toDelete.push(url);
      }
    });
    toDelete.forEach((url) => textureCache.delete(url));
    console.debug(
      `[TextureCache] Cleared ${toDelete.length} unused textures. ${textureCache.size} still in use.`
    );
  }
}

/**
 * Get texture cache statistics
 */
export function getTextureCacheStats(): {
  count: number;
  activeCount: number;
  urls: string[];
  totalRefCount: number;
} {
  let totalRefCount = 0;
  let activeCount = 0;
  textureCache.forEach((cached) => {
    totalRefCount += cached.refCount;
    if (cached.refCount > 0) activeCount++;
  });

  return {
    count: textureCache.size,
    activeCount,
    urls: Array.from(textureCache.keys()),
    totalRefCount,
  };
}

/**
 * Force cleanup of LRU cache (for manual memory management)
 */
export function forceCleanupTextureCache(): void {
  cleanupCache();
}
