/**
 * useMaterialTexture Hook
 *
 * Loads and caches material textures from remote URLs.
 * Supports diffuse textures and normal maps for PBR rendering.
 */

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Material, MaterialTexture } from '@/types';

// Global texture cache to avoid re-loading same textures
const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a texture from URL with caching
 */
async function loadTexture(url: string): Promise<THREE.Texture> {
  // Return from cache if available
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }

  // Wait for existing loading promise if in progress
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

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

        textureCache.set(url, texture);
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
function configureTexture(
  texture: THREE.Texture,
  config: MaterialTexture
): THREE.Texture {
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
export function useMaterialTexture(
  material: Material | undefined | null
): MaterialTextureResult {
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null);
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track textures for cleanup
  const diffuseMapRef = useRef<THREE.Texture | null>(null);
  const normalMapRef = useRef<THREE.Texture | null>(null);

  const textureConfig = material?.texture;

  useEffect(() => {
    // Dispose previous textures before loading new ones
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

    if (!textureConfig?.url) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadTextures = async () => {
      try {
        // Load diffuse texture
        const baseTexture = await loadTexture(textureConfig.url);
        const configuredDiffuse = configureTexture(baseTexture, textureConfig);
        diffuseMapRef.current = configuredDiffuse;
        setDiffuseMap(configuredDiffuse);

        // Load normal map if available
        if (textureConfig.normalMapUrl) {
          const normalTexture = await loadTexture(textureConfig.normalMapUrl);
          const configuredNormal = configureTexture(normalTexture, textureConfig);
          normalMapRef.current = configuredNormal;
          setNormalMap(configuredNormal);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load material texture:', err);
        setError(err instanceof Error ? err.message : 'Failed to load texture');
      } finally {
        setIsLoading(false);
      }
    };

    loadTextures();

    // Cleanup: dispose cloned textures on unmount
    return () => {
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
export async function preloadMaterialTextures(
  materials: Material[]
): Promise<void> {
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
 */
export function clearTextureCache(): void {
  Array.from(textureCache.values()).forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
}

/**
 * Get texture cache statistics
 */
export function getTextureCacheStats(): { count: number; urls: string[] } {
  return {
    count: textureCache.size,
    urls: Array.from(textureCache.keys()),
  };
}
