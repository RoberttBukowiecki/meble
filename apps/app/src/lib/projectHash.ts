/**
 * Project Hash Utility
 *
 * Generates a hash from project data for Smart Export sessions.
 * The hash is used to identify unique project states for 24h free re-export.
 */

import type { Part, Cabinet, Furniture, Room, Material } from '@/types';

interface ProjectData {
  parts: Part[];
  cabinets: Cabinet[];
  furnitures: Furniture[];
  room: Room;
  materials: Material[];
}

/**
 * Generate a deterministic hash from project data
 * Uses a simple but effective string-based hash function
 */
export function generateProjectHash(data: ProjectData): string {
  // Create a normalized string representation of relevant project data
  const normalized = normalizeProjectData(data);

  // Generate hash using cyrb53 algorithm (fast, good distribution)
  const hash = cyrb53(normalized);

  return `proj_${hash.toString(36)}`;
}

/**
 * Normalize project data to a consistent string for hashing
 * Only includes data that affects the export output
 */
function normalizeProjectData(data: ProjectData): string {
  // Sort and normalize parts
  const parts = [...data.parts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      depth: p.depth,
      name: p.name,
      materialId: p.materialId,
      edgebandingLeft: p.edgebandingLeft,
      edgebandingRight: p.edgebandingRight,
      edgebandingTop: p.edgebandingTop,
      edgebandingBottom: p.edgebandingBottom,
      quantity: p.quantity ?? 1,
    }));

  // Sort and normalize cabinets
  const cabinets = [...data.cabinets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      width: c.width,
      height: c.height,
      depth: c.depth,
    }));

  // Normalize room (only dimensions matter for export)
  const room = {
    width: data.room.width,
    height: data.room.height,
    depth: data.room.depth,
  };

  // Create JSON string
  const json = JSON.stringify({ parts, cabinets, room });

  return json;
}

/**
 * cyrb53 hash function
 * A fast, high-quality 53-bit hash function
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Simplified hash for parts array only
 * Used when full project data is not available
 */
export function generatePartsHash(parts: Part[]): string {
  const normalized = [...parts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${p.width}x${p.height}x${p.depth}:${p.materialId}:${p.quantity ?? 1}`)
    .join('|');

  const hash = cyrb53(normalized);
  return `parts_${hash.toString(36)}`;
}
