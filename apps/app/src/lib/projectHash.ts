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
      name: p.name,
      materialId: p.materialId,
      width: p.width,
      height: p.height,
      depth: p.depth,
      position: p.position,
      rotation: p.rotation,
      shapeType: p.shapeType,
      shapeParams: stableValue(p.shapeParams),
      edgeBanding: normalizeEdgeBanding(p.edgeBanding),
    }));

  // Sort and normalize cabinets
  const cabinets = [...data.cabinets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      params: stableValue(c.params),
      materials: stableValue(c.materials),
      topBottomPlacement: c.topBottomPlacement,
      partIds: [...c.partIds].sort(),
    }));

  // Normalize room (only structural properties matter for export)
  const room = stableValue({
    id: data.room.id,
    name: data.room.name,
    heightMm: data.room.heightMm,
    wallThicknessMm: data.room.wallThicknessMm,
    floorThicknessMm: data.room.floorThicknessMm,
    defaultCeiling: data.room.defaultCeiling,
    wallMaterialId: data.room.wallMaterialId,
    floorMaterialId: data.room.floorMaterialId,
    ceilingMaterialId: data.room.ceilingMaterialId,
    origin: data.room.origin,
  });

  const materials = [...data.materials]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      thickness: m.thickness,
      isDefault: m.isDefault ?? false,
      category: m.category,
    }));

  const furnitures = [...data.furnitures]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => ({
      id: f.id,
      name: f.name,
      projectId: f.projectId ?? null,
    }));

  // Create JSON string
  return JSON.stringify({ parts, cabinets, room, materials, furnitures });
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
    .map((p) => {
      const edgeBanding = normalizeEdgeBanding(p.edgeBanding);
      const shapeHash = JSON.stringify(stableValue(p.shapeParams));
      return `${p.id}:${p.width}x${p.height}x${p.depth}:${p.materialId}:${edgeBanding}:${p.shapeType}:${shapeHash}`;
    })
    .join('|');

  const hash = cyrb53(normalized);
  return `parts_${hash.toString(36)}`;
}

/**
 * Normalize edge banding config to a stable string
 */
function normalizeEdgeBanding(edgeBanding: Part['edgeBanding']): string {
  if (edgeBanding.type === 'RECT') {
    const { top, bottom, left, right } = edgeBanding;
    return `RECT:${Number(top)}${Number(bottom)}${Number(left)}${Number(right)}`;
  }

  return `GENERIC:${[...edgeBanding.edges].sort((a, b) => a - b).join(',')}`;
}

/**
 * Deep-sort object keys to make JSON stringify stable
 */
function stableValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stableValue(v)) as unknown as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, stableValue(v)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}
