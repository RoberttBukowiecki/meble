/**
 * Countertop Domain Helper Functions
 *
 * Private utility functions for countertop calculations
 */

import { Euler, Quaternion, Vector3 } from 'three';
import type { Cabinet, Part } from '@/types';

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Calculate distance between two 3D points
 */
export const distance3D = (
  a: [number, number, number],
  b: [number, number, number]
): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Cabinet bounding box result
 */
export interface CabinetBounds {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
}

/**
 * Get cabinet bounding box from its parts
 * Uses part rotation quaternion to properly calculate world-space bounds
 */
export const getCabinetBounds = (cabinet: Cabinet, parts: Part[]): CabinetBounds => {
  const cabinetParts = parts.filter(p => cabinet.partIds.includes(p.id));

  if (cabinetParts.length === 0) {
    // Fallback to cabinet worldTransform and params if no parts
    const pos = cabinet.worldTransform?.position || [0, 0, 0];
    const params = cabinet.params as { width?: number; height?: number; depth?: number };
    const w = (params.width || 600) / 2;
    const h = (params.height || 720) / 2;
    const d = (params.depth || 560) / 2;
    return {
      min: [pos[0] - w, pos[1] - h, pos[2] - d],
      max: [pos[0] + w, pos[1] + h, pos[2] + d],
      center: pos as [number, number, number],
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const part of cabinetParts) {
    const [px, py, pz] = part.position;
    const { width, height, depth, rotation } = part;

    // Create rotation quaternion from part's Euler rotation
    const rotationQuat = new Quaternion().setFromEuler(
      new Euler(rotation[0], rotation[1], rotation[2])
    );

    // Half dimensions in local space
    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;

    // Transform extent vectors by part's rotation to get world-space extents
    const extentX = new Vector3(halfW, 0, 0).applyQuaternion(rotationQuat);
    const extentY = new Vector3(0, halfH, 0).applyQuaternion(rotationQuat);
    const extentZ = new Vector3(0, 0, halfD).applyQuaternion(rotationQuat);

    // Calculate world-space half dimensions (max extent in each axis)
    const worldHalfW = Math.abs(extentX.x) + Math.abs(extentY.x) + Math.abs(extentZ.x);
    const worldHalfH = Math.abs(extentX.y) + Math.abs(extentY.y) + Math.abs(extentZ.y);
    const worldHalfD = Math.abs(extentX.z) + Math.abs(extentY.z) + Math.abs(extentZ.z);

    minX = Math.min(minX, px - worldHalfW);
    minY = Math.min(minY, py - worldHalfH);
    minZ = Math.min(minZ, pz - worldHalfD);
    maxX = Math.max(maxX, px + worldHalfW);
    maxY = Math.max(maxY, py + worldHalfH);
    maxZ = Math.max(maxZ, pz + worldHalfD);
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
  };
};

/**
 * Check if two cabinets are adjacent (close enough to share a countertop)
 */
export const areCabinetsAdjacent = (
  boundsA: CabinetBounds,
  boundsB: CabinetBounds,
  threshold: number
): boolean => {
  // Check if bounding boxes are within threshold distance
  // We check X and Z axes (horizontal plane) - Y is height

  const gapX = Math.max(0, Math.max(boundsA.min[0], boundsB.min[0]) - Math.min(boundsA.max[0], boundsB.max[0]));
  const gapZ = Math.max(0, Math.max(boundsA.min[2], boundsB.min[2]) - Math.min(boundsA.max[2], boundsB.max[2]));

  // Cabinets must be adjacent (small gap) in one direction and overlapping in the other
  const adjacentInX = gapX <= threshold && gapZ === 0;
  const adjacentInZ = gapZ <= threshold && gapX === 0;

  // Also check if top surfaces are at similar height (within threshold)
  const heightDiff = Math.abs(boundsA.max[1] - boundsB.max[1]);
  const similarHeight = heightDiff <= threshold;

  return (adjacentInX || adjacentInZ) && similarHeight;
};

/**
 * Find connected components in adjacency graph using DFS
 */
export const findConnectedComponents = <T extends { id: string }>(
  items: T[],
  adjacency: Map<string, Set<string>>
): T[][] => {
  const visited = new Set<string>();
  const components: T[][] = [];
  const itemMap = new Map(items.map(item => [item.id, item]));

  const dfs = (itemId: string, component: T[]) => {
    if (visited.has(itemId)) return;
    visited.add(itemId);

    const item = itemMap.get(itemId);
    if (item) {
      component.push(item);
    }

    const neighbors = adjacency.get(itemId);
    if (neighbors) {
      Array.from(neighbors).forEach(neighborId => {
        dfs(neighborId, component);
      });
    }
  };

  for (const item of items) {
    if (!visited.has(item.id)) {
      const component: T[] = [];
      dfs(item.id, component);
      if (component.length > 0) {
        components.push(component);
      }
    }
  }

  return components;
};
