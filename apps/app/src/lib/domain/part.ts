/**
 * Part Domain Module
 *
 * Handles part-level operations including:
 * - Creating parts from generated data
 * - Updating part transforms
 * - Calculating bounding boxes
 * - Querying part properties
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Part,
  CabinetPartRole,
  CabinetPartMetadata,
  EdgeBanding,
  ShapeType,
  ShapeParams,
} from '@/types';
import type { ValidationResult, Position, Rotation, BoundingBox, Dimensions } from './types';
import { validResult, invalidResult } from './types';
import { roundTo } from './utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Generated part data (before adding ID and timestamps)
 */
export interface GeneratedPartData {
  name: string;
  furnitureId: string;
  group?: string;
  shapeType: ShapeType;
  shapeParams: ShapeParams;
  width: number;
  height: number;
  depth: number;
  position: Position;
  rotation: Rotation;
  materialId: string;
  edgeBanding: EdgeBanding;
  cabinetMetadata?: CabinetPartMetadata;
  notes?: string;
}

// ============================================================================
// Part Domain Module
// ============================================================================

export const PartDomain = {
  // ==========================================================================
  // CREATORS - Functions that create new parts
  // ==========================================================================

  /**
   * Create a full Part from generated data
   */
  fromGenerated: (data: GeneratedPartData, now?: Date): Part => {
    const timestamp = now ?? new Date();
    return {
      ...data,
      id: uuidv4(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  /**
   * Create multiple parts from generated data
   */
  fromGeneratedBatch: (dataArray: GeneratedPartData[], now?: Date): Part[] => {
    const timestamp = now ?? new Date();
    return dataArray.map((data) => PartDomain.fromGenerated(data, timestamp));
  },

  /**
   * Clone a part with new ID
   */
  clone: (part: Part, positionOffset?: Position): Part => {
    const now = new Date();
    return {
      ...part,
      id: uuidv4(),
      position: positionOffset
        ? [
            part.position[0] + positionOffset[0],
            part.position[1] + positionOffset[1],
            part.position[2] + positionOffset[2],
          ]
        : [...part.position],
      rotation: [...part.rotation] as Rotation,
      createdAt: now,
      updatedAt: now,
    };
  },

  // ==========================================================================
  // UPDATERS - Functions that return modified copies
  // ==========================================================================

  /**
   * Update part position
   */
  updatePosition: (part: Part, position: Position): Part => ({
    ...part,
    position: [
      roundTo(position[0], 2),
      roundTo(position[1], 2),
      roundTo(position[2], 2),
    ],
    updatedAt: new Date(),
  }),

  /**
   * Update part rotation
   */
  updateRotation: (part: Part, rotation: Rotation): Part => ({
    ...part,
    rotation: [
      roundTo(rotation[0], 4),
      roundTo(rotation[1], 4),
      roundTo(rotation[2], 4),
    ],
    updatedAt: new Date(),
  }),

  /**
   * Update part transform (position and/or rotation)
   */
  updateTransform: (
    part: Part,
    transform: { position?: Position; rotation?: Rotation }
  ): Part => {
    let updated = part;

    if (transform.position) {
      updated = PartDomain.updatePosition(updated, transform.position);
    }

    if (transform.rotation) {
      updated = PartDomain.updateRotation(updated, transform.rotation);
    }

    return updated;
  },

  /**
   * Update part material
   */
  updateMaterial: (part: Part, materialId: string): Part => ({
    ...part,
    materialId,
    updatedAt: new Date(),
  }),

  /**
   * Update part dimensions
   */
  updateDimensions: (part: Part, dimensions: Partial<Dimensions>): Part => ({
    ...part,
    width: dimensions.width ?? part.width,
    height: dimensions.height ?? part.height,
    depth: dimensions.depth ?? part.depth,
    shapeParams: PartDomain.updateShapeParams(part.shapeParams, dimensions),
    updatedAt: new Date(),
  }),

  /**
   * Update shape params based on new dimensions
   */
  updateShapeParams: (params: ShapeParams, dimensions: Partial<Dimensions>): ShapeParams => {
    if (params.type === 'RECT') {
      return {
        ...params,
        x: dimensions.width ?? params.x,
        y: dimensions.height ?? params.y,
      };
    }
    // For other shape types, return as-is (they have more complex params)
    return params;
  },

  /**
   * Update part edge banding
   */
  updateEdgeBanding: (part: Part, edgeBanding: EdgeBanding): Part => ({
    ...part,
    edgeBanding,
    updatedAt: new Date(),
  }),

  /**
   * Update part name
   */
  updateName: (part: Part, name: string): Part => ({
    ...part,
    name,
    updatedAt: new Date(),
  }),

  /**
   * Update part notes
   */
  updateNotes: (part: Part, notes: string | undefined): Part => ({
    ...part,
    notes,
    updatedAt: new Date(),
  }),

  /**
   * Update cabinet metadata
   */
  updateCabinetMetadata: (
    part: Part,
    metadata: CabinetPartMetadata | undefined
  ): Part => ({
    ...part,
    cabinetMetadata: metadata,
    updatedAt: new Date(),
  }),

  /**
   * Offset part position
   */
  offsetPosition: (part: Part, offset: Position): Part =>
    PartDomain.updatePosition(part, [
      part.position[0] + offset[0],
      part.position[1] + offset[1],
      part.position[2] + offset[2],
    ]),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate axis-aligned bounding box (ignoring rotation)
   */
  calculateBoundingBox: (part: Part): BoundingBox => {
    const halfWidth = part.width / 2;
    const halfHeight = part.height / 2;
    const halfDepth = part.depth / 2;

    return {
      min: [
        part.position[0] - halfWidth,
        part.position[1] - halfHeight,
        part.position[2] - halfDepth,
      ],
      max: [
        part.position[0] + halfWidth,
        part.position[1] + halfHeight,
        part.position[2] + halfDepth,
      ],
      center: [...part.position] as Position,
      size: {
        width: part.width,
        height: part.height,
        depth: part.depth,
      },
    };
  },

  /**
   * Calculate bounding box for multiple parts
   */
  calculateGroupBoundingBox: (parts: Part[]): BoundingBox | null => {
    if (parts.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const part of parts) {
      const bbox = PartDomain.calculateBoundingBox(part);
      minX = Math.min(minX, bbox.min[0]);
      minY = Math.min(minY, bbox.min[1]);
      minZ = Math.min(minZ, bbox.min[2]);
      maxX = Math.max(maxX, bbox.max[0]);
      maxY = Math.max(maxY, bbox.max[1]);
      maxZ = Math.max(maxZ, bbox.max[2]);
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
      size: {
        width: maxX - minX,
        height: maxY - minY,
        depth: maxZ - minZ,
      },
    };
  },

  /**
   * Calculate center point of multiple parts
   */
  calculateGroupCenter: (parts: Part[]): Position | null => {
    const bbox = PartDomain.calculateGroupBoundingBox(parts);
    return bbox?.center ?? null;
  },

  /**
   * Calculate surface area of part
   */
  calculateSurfaceArea: (part: Part): number => {
    // For rectangular parts: 2 * (w*h + w*d + h*d)
    if (part.shapeType === 'RECT') {
      const w = part.width;
      const h = part.height;
      const d = part.depth;
      return 2 * (w * h + w * d + h * d);
    }
    // For other shapes, approximate with bounding box
    return 2 * (part.width * part.height + part.width * part.depth + part.height * part.depth);
  },

  /**
   * Calculate volume of part
   */
  calculateVolume: (part: Part): number =>
    part.width * part.height * part.depth,

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate a part
   */
  validate: (part: Part): ValidationResult => {
    const errors: string[] = [];

    if (!part.id) {
      errors.push('Part must have an ID');
    }

    if (!part.name) {
      errors.push('Part must have a name');
    }

    if (!part.furnitureId) {
      errors.push('Part must belong to a furniture');
    }

    if (part.width <= 0 || part.height <= 0 || part.depth <= 0) {
      errors.push('Part dimensions must be positive');
    }

    if (!part.materialId) {
      errors.push('Part must have a material');
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if part belongs to a cabinet
   */
  belongsToCabinet: (part: Part, cabinetId: string): boolean =>
    part.cabinetMetadata?.cabinetId === cabinetId,

  /**
   * Check if part is a cabinet part
   */
  isCabinetPart: (part: Part): boolean => part.cabinetMetadata !== undefined,

  /**
   * Get part role within cabinet
   */
  getRole: (part: Part): CabinetPartRole | undefined =>
    part.cabinetMetadata?.role,

  /**
   * Check if part is a structural part (side, top, bottom)
   */
  isStructuralPart: (part: Part): boolean => {
    const role = PartDomain.getRole(part);
    return role === 'LEFT_SIDE' || role === 'RIGHT_SIDE' || role === 'TOP' || role === 'BOTTOM';
  },

  /**
   * Check if part is a front part (door, drawer front)
   */
  isFrontPart: (part: Part): boolean => {
    const role = PartDomain.getRole(part);
    return role === 'DOOR' || role === 'DRAWER_FRONT';
  },

  /**
   * Check if part is a drawer part
   */
  isDrawerPart: (part: Part): boolean => {
    const role = PartDomain.getRole(part);
    if (!role) return false;
    return role.startsWith('DRAWER_');
  },

  /**
   * Check if part is a shelf
   */
  isShelf: (part: Part): boolean => PartDomain.getRole(part) === 'SHELF',

  /**
   * Check if part is a back panel
   */
  isBackPanel: (part: Part): boolean => PartDomain.getRole(part) === 'BACK',

  /**
   * Check if part is decorative
   */
  isDecorativePart: (part: Part): boolean => {
    const role = PartDomain.getRole(part);
    return (
      role === 'SIDE_FRONT_LEFT' ||
      role === 'SIDE_FRONT_RIGHT' ||
      role === 'DECORATIVE_TOP' ||
      role === 'DECORATIVE_BOTTOM'
    );
  },

  /**
   * Get drawer index for drawer parts
   */
  getDrawerIndex: (part: Part): number | undefined =>
    part.cabinetMetadata?.drawerIndex,

  /**
   * Get part index (for shelves, doors, etc.)
   */
  getPartIndex: (part: Part): number | undefined =>
    part.cabinetMetadata?.index,

  /**
   * Get part dimensions
   */
  getDimensions: (part: Part): Dimensions => ({
    width: part.width,
    height: part.height,
    depth: part.depth,
  }),

  /**
   * Get part position
   */
  getPosition: (part: Part): Position => [...part.position] as Position,

  /**
   * Get part rotation
   */
  getRotation: (part: Part): Rotation => [...part.rotation] as Rotation,

  /**
   * Filter parts by cabinet ID
   */
  filterByCabinet: (parts: Part[], cabinetId: string): Part[] =>
    parts.filter((p) => PartDomain.belongsToCabinet(p, cabinetId)),

  /**
   * Filter parts by role
   */
  filterByRole: (parts: Part[], role: CabinetPartRole): Part[] =>
    parts.filter((p) => PartDomain.getRole(p) === role),

  /**
   * Filter parts by furniture ID
   */
  filterByFurniture: (parts: Part[], furnitureId: string): Part[] =>
    parts.filter((p) => p.furnitureId === furnitureId),

  /**
   * Filter parts by group
   */
  filterByGroup: (parts: Part[], group: string): Part[] =>
    parts.filter((p) => p.group === group),

  /**
   * Get role label in Polish
   */
  getRoleLabel: (role: CabinetPartRole): string => {
    const labels: Record<CabinetPartRole, string> = {
      BOTTOM: 'Spód',
      TOP: 'Góra',
      LEFT_SIDE: 'Bok lewy',
      RIGHT_SIDE: 'Bok prawy',
      BACK: 'Tył',
      SHELF: 'Półka',
      DOOR: 'Drzwi',
      DRAWER_FRONT: 'Front szuflady',
      DRAWER_BOX_FRONT: 'Przód korpusu szuflady',
      DRAWER_SIDE: 'Bok szuflady',
      DRAWER_SIDE_LEFT: 'Bok lewy szuflady',
      DRAWER_SIDE_RIGHT: 'Bok prawy szuflady',
      DRAWER_BACK: 'Tył szuflady',
      DRAWER_BOTTOM: 'Dno szuflady',
      SIDE_FRONT_LEFT: 'Panel dekoracyjny lewy',
      SIDE_FRONT_RIGHT: 'Panel dekoracyjny prawy',
      DECORATIVE_TOP: 'Blenda górna',
      DECORATIVE_BOTTOM: 'Cokół',
      PARTITION: 'Przegroda',
      LEG: 'Nóżka',
    };
    return labels[role] ?? role;
  },
} as const;
