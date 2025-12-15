/**
 * Zone Domain Module
 *
 * Handles recursive zone tree operations for cabinet interior configuration.
 * Supports:
 * - Creating zones with different content types (EMPTY, SHELVES, DRAWERS, NESTED)
 * - Managing nested zone hierarchies (max 3 levels)
 * - Calculating zone bounds recursively
 * - Distributing widths with mixed FIXED + PROPORTIONAL modes
 * - Managing partitions between vertical columns
 * - Validating zone configurations
 */

import type {
  InteriorZone,
  ZoneContentType,
  ZoneDivisionDirection,
  ZoneHeightConfig,
  ZoneWidthConfig,
  PartitionConfig,
  ShelvesConfiguration,
  DrawerConfiguration,
  PartitionDepthPreset,
} from '@/types';
import {
  generateZoneId,
  generatePartitionId,
  DEFAULT_ZONE_HEIGHT_CONFIG,
  DEFAULT_ZONE_WIDTH_CONFIG,
  DEFAULT_PARTITION_CONFIG,
  DEFAULT_SHELVES_CONFIG,
} from '@/types';
import { createDefaultDrawerConfig, INTERIOR_CONFIG, SHELF_CONFIG } from '@/lib/config';
import type { ValidationResult } from './types';
import { validResult, invalidResult, mergeValidations } from './types';
import { clamp, distributeByRatio } from './utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Bounds information for a single zone
 */
export interface ZoneBounds {
  zone: InteriorZone;
  startX: number;
  startY: number;
  width: number;
  height: number;
  depth: number; // Tree depth (0 = root)
}

/**
 * Bounds information for a partition
 */
export interface PartitionBounds {
  partition: PartitionConfig;
  x: number;
  startY: number;
  height: number;
  depthMm: number; // Partition depth in mm
}

/**
 * Complete tree information with all bounds
 */
export interface ZoneTreeInfo {
  /** All leaf zone bounds (zones with content, not NESTED) */
  leafZoneBounds: ZoneBounds[];
  /** All partition bounds */
  partitionBounds: PartitionBounds[];
  /** Total zone count in tree */
  totalZoneCount: number;
  /** Maximum depth in tree */
  maxDepth: number;
}

/**
 * Parent bounds for recursive calculation
 */
export interface ParentBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

// ============================================================================
// Zone Domain Module
// ============================================================================

export const Zone = {
  // ==========================================================================
  // CREATORS - Functions that create new zone objects
  // ==========================================================================

  /**
   * Create a new zone with specified content type
   */
  create: (contentType: ZoneContentType, depth: number): InteriorZone => {
    const zone: InteriorZone = {
      id: generateZoneId(),
      contentType,
      heightConfig: { ...DEFAULT_ZONE_HEIGHT_CONFIG },
      depth,
    };

    if (contentType === 'SHELVES') {
      zone.shelvesConfig = { ...DEFAULT_SHELVES_CONFIG, shelves: [] };
    } else if (contentType === 'DRAWERS') {
      zone.drawerConfig = createDefaultDrawerConfig(3, true);
    } else if (contentType === 'NESTED') {
      zone.divisionDirection = 'HORIZONTAL';
      zone.children = [Zone.createEmpty(depth + 1)];
    }

    return zone;
  },

  /**
   * Create an empty zone
   */
  createEmpty: (depth: number): InteriorZone => Zone.create('EMPTY', depth),

  /**
   * Create a zone with shelves
   */
  createWithShelves: (count: number, depth: number): InteriorZone => {
    const zone = Zone.create('SHELVES', depth);
    if (zone.shelvesConfig) {
      zone.shelvesConfig.count = clamp(count, 0, INTERIOR_CONFIG.MAX_SHELVES_PER_ZONE);
    }
    return zone;
  },

  /**
   * Create a zone with drawers
   */
  createWithDrawers: (zoneCount: number, depth: number): InteriorZone => {
    const zone = Zone.create('DRAWERS', depth);
    zone.drawerConfig = createDefaultDrawerConfig(
      clamp(zoneCount, 1, INTERIOR_CONFIG.MAX_DRAWER_ZONES_PER_ZONE),
      true
    );
    return zone;
  },

  /**
   * Create a nested zone with specified direction
   */
  createNested: (
    direction: ZoneDivisionDirection,
    depth: number,
    childCount: number = 2
  ): InteriorZone => {
    if (depth >= INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1) {
      // Cannot nest beyond max depth, return empty zone instead
      return Zone.createEmpty(depth);
    }

    const children: InteriorZone[] = [];
    for (let i = 0; i < clamp(childCount, 1, INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE); i++) {
      children.push(Zone.createEmpty(depth + 1));
    }

    return {
      id: generateZoneId(),
      contentType: 'NESTED',
      divisionDirection: direction,
      children,
      heightConfig: { ...DEFAULT_ZONE_HEIGHT_CONFIG },
      depth,
    };
  },

  /**
   * Create a partition configuration
   */
  createPartition: (depthPreset: PartitionDepthPreset = 'FULL', enabled = false): PartitionConfig => ({
    id: generatePartitionId(),
    enabled,
    depthPreset,
  }),

  /**
   * Clone a zone with new IDs (deep clone)
   */
  clone: (zone: InteriorZone): InteriorZone => ({
    ...zone,
    id: generateZoneId(),
    shelvesConfig: zone.shelvesConfig
      ? { ...zone.shelvesConfig, shelves: [...zone.shelvesConfig.shelves] }
      : undefined,
    drawerConfig: zone.drawerConfig
      ? {
          ...zone.drawerConfig,
          zones: zone.drawerConfig.zones.map((z) => ({
            ...z,
            boxes: [...z.boxes],
          })),
        }
      : undefined,
    children: zone.children?.map((child) => Zone.clone(child)),
    partitions: zone.partitions?.map((p) => ({ ...p, id: generatePartitionId() })),
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies of zones
  // ==========================================================================

  /**
   * Update zone content type
   */
  updateContentType: (zone: InteriorZone, contentType: ZoneContentType): InteriorZone => {
    if (zone.contentType === contentType) return zone;

    const updated: InteriorZone = {
      ...zone,
      contentType,
      // Clear previous content configs
      shelvesConfig: undefined,
      drawerConfig: undefined,
      divisionDirection: undefined,
      children: undefined,
      partitions: undefined,
    };

    if (contentType === 'SHELVES') {
      updated.shelvesConfig = { ...DEFAULT_SHELVES_CONFIG, shelves: [] };
    } else if (contentType === 'DRAWERS') {
      updated.drawerConfig = createDefaultDrawerConfig(3, true);
    } else if (contentType === 'NESTED') {
      if (zone.depth >= INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1) {
        // Cannot nest beyond max depth
        return zone;
      }
      updated.divisionDirection = 'HORIZONTAL';
      updated.children = [Zone.createEmpty(zone.depth + 1)];
    }

    return updated;
  },

  /**
   * Set division direction for nested zone
   */
  setDivisionDirection: (
    zone: InteriorZone,
    direction: ZoneDivisionDirection
  ): InteriorZone => {
    if (zone.contentType !== 'NESTED') return zone;
    return { ...zone, divisionDirection: direction };
  },

  /**
   * Add a child zone
   */
  addChild: (zone: InteriorZone, child?: InteriorZone): InteriorZone => {
    if (zone.contentType !== 'NESTED') return zone;
    if ((zone.children?.length ?? 0) >= INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE) return zone;

    const newChild = child ?? Zone.createEmpty(zone.depth + 1);
    return {
      ...zone,
      children: [...(zone.children ?? []), newChild],
    };
  },

  /**
   * Remove a child zone by ID
   */
  removeChild: (zone: InteriorZone, childId: string): InteriorZone => {
    if (zone.contentType !== 'NESTED' || !zone.children) return zone;
    if (zone.children.length <= 1) return zone; // Keep at least one child

    const newChildren = zone.children.filter((c) => c.id !== childId);
    return {
      ...zone,
      children: newChildren,
      // Also remove partition if needed (partitions are between children)
      partitions: zone.partitions?.slice(0, Math.max(0, newChildren.length - 1)),
    };
  },

  /**
   * Update a child zone by ID
   */
  updateChild: (
    zone: InteriorZone,
    childId: string,
    updater: (child: InteriorZone) => InteriorZone
  ): InteriorZone => {
    if (zone.contentType !== 'NESTED' || !zone.children) return zone;

    return {
      ...zone,
      children: zone.children.map((c) => (c.id === childId ? updater(c) : c)),
    };
  },

  /**
   * Move a child zone up or down in the list
   */
  moveChild: (
    zone: InteriorZone,
    childId: string,
    direction: 'up' | 'down'
  ): InteriorZone => {
    if (zone.contentType !== 'NESTED' || !zone.children) return zone;

    const children = [...zone.children];
    const index = children.findIndex((c) => c.id === childId);
    if (index === -1) return zone;

    // For HORIZONTAL direction: 'up' = higher index (toward top)
    // For VERTICAL direction: 'up' = lower index (toward left)
    const isHorizontal = zone.divisionDirection === 'HORIZONTAL';
    const newIndex = isHorizontal
      ? direction === 'up'
        ? index + 1
        : index - 1
      : direction === 'up'
        ? index - 1
        : index + 1;

    if (newIndex < 0 || newIndex >= children.length) return zone;

    [children[index], children[newIndex]] = [children[newIndex], children[index]];
    return { ...zone, children };
  },

  /**
   * Set height configuration
   */
  setHeightConfig: (zone: InteriorZone, config: ZoneHeightConfig): InteriorZone => ({
    ...zone,
    heightConfig: config,
  }),

  /**
   * Set width configuration
   */
  setWidthConfig: (zone: InteriorZone, config: ZoneWidthConfig): InteriorZone => ({
    ...zone,
    widthConfig: config,
  }),

  /**
   * Update shelves configuration
   */
  updateShelvesConfig: (
    zone: InteriorZone,
    config: Partial<ShelvesConfiguration>
  ): InteriorZone => {
    if (zone.contentType !== 'SHELVES' || !zone.shelvesConfig) return zone;
    return {
      ...zone,
      shelvesConfig: { ...zone.shelvesConfig, ...config },
    };
  },

  /**
   * Update drawer configuration
   */
  updateDrawerConfig: (
    zone: InteriorZone,
    config: Partial<DrawerConfiguration>
  ): InteriorZone => {
    if (zone.contentType !== 'DRAWERS' || !zone.drawerConfig) return zone;
    return {
      ...zone,
      drawerConfig: { ...zone.drawerConfig, ...config },
    };
  },

  /**
   * Add a partition after specified index
   */
  addPartition: (zone: InteriorZone, afterIndex: number): InteriorZone => {
    if (zone.contentType !== 'NESTED' || zone.divisionDirection !== 'VERTICAL') return zone;

    const partitions = zone.partitions ?? [];
    const maxPartitions = (zone.children?.length ?? 1) - 1;
    if (partitions.length >= maxPartitions) return zone;

    const newPartitions = [...partitions];
    newPartitions.splice(afterIndex, 0, Zone.createPartition());
    return { ...zone, partitions: newPartitions };
  },

  /**
   * Update a partition by ID
   */
  updatePartition: (
    zone: InteriorZone,
    partitionId: string,
    patch: Partial<Omit<PartitionConfig, 'id'>>
  ): InteriorZone => {
    if (!zone.partitions) return zone;
    return {
      ...zone,
      partitions: zone.partitions.map((p) =>
        p.id === partitionId ? { ...p, ...patch } : p
      ),
    };
  },

  /**
   * Remove a partition by ID
   */
  removePartition: (zone: InteriorZone, partitionId: string): InteriorZone => {
    if (!zone.partitions) return zone;
    return {
      ...zone,
      partitions: zone.partitions.filter((p) => p.id !== partitionId),
    };
  },

  /**
   * Recursively update a zone by path
   */
  updateAtPath: (
    zone: InteriorZone,
    path: string[],
    updater: (zone: InteriorZone) => InteriorZone
  ): InteriorZone => {
    if (path.length === 0) return updater(zone);
    if (zone.contentType !== 'NESTED' || !zone.children) return zone;

    const [nextId, ...rest] = path;
    return {
      ...zone,
      children: zone.children.map((c) =>
        c.id === nextId ? Zone.updateAtPath(c, rest, updater) : c
      ),
    };
  },

  // ==========================================================================
  // CALCULATORS - Pure functions for calculating dimensions and bounds
  // ==========================================================================

  /**
   * Distribute widths among children with mixed FIXED + PROPORTIONAL modes
   */
  distributeWidths: (
    children: InteriorZone[],
    totalWidth: number,
    partitionThickness: number
  ): number[] => {
    if (children.length === 0) return [];

    const partitionsTotalWidth = partitionThickness * Math.max(0, children.length - 1);
    const availableWidth = totalWidth - partitionsTotalWidth;

    // First pass: calculate fixed widths
    let fixedTotal = 0;
    const fixedWidths: (number | null)[] = children.map((c) => {
      if (c.widthConfig?.mode === 'FIXED' && c.widthConfig.fixedMm) {
        const width = Math.min(c.widthConfig.fixedMm, availableWidth);
        fixedTotal += width;
        return width;
      }
      return null;
    });

    // Second pass: distribute remaining width proportionally
    const remainingWidth = Math.max(0, availableWidth - fixedTotal);
    const proportionalChildren = children.filter(
      (c) => c.widthConfig?.mode !== 'FIXED' || !c.widthConfig.fixedMm
    );

    const totalRatio = proportionalChildren.reduce(
      (sum, c) => sum + (c.widthConfig?.ratio ?? 1),
      0
    );

    return children.map((c, i) => {
      if (fixedWidths[i] !== null) return fixedWidths[i]!;
      const ratio = c.widthConfig?.ratio ?? 1;
      return totalRatio > 0 ? (ratio / totalRatio) * remainingWidth : remainingWidth / proportionalChildren.length;
    });
  },

  /**
   * Distribute heights among children with mixed RATIO + EXACT modes
   */
  distributeHeights: (children: InteriorZone[], totalHeight: number): number[] => {
    if (children.length === 0) return [];

    // First pass: calculate exact heights
    let exactTotal = 0;
    const exactHeights: (number | null)[] = children.map((c) => {
      if (c.heightConfig.mode === 'EXACT' && c.heightConfig.exactMm) {
        const height = Math.min(c.heightConfig.exactMm, totalHeight);
        exactTotal += height;
        return height;
      }
      return null;
    });

    // Second pass: distribute remaining height by ratio
    const remainingHeight = Math.max(0, totalHeight - exactTotal);
    const ratioChildren = children.filter(
      (c) => c.heightConfig.mode !== 'EXACT' || !c.heightConfig.exactMm
    );

    const totalRatio = ratioChildren.reduce(
      (sum, c) => sum + (c.heightConfig.ratio ?? 1),
      0
    );

    return children.map((c, i) => {
      if (exactHeights[i] !== null) return exactHeights[i]!;
      const ratio = c.heightConfig.ratio ?? 1;
      return totalRatio > 0 ? (ratio / totalRatio) * remainingHeight : remainingHeight / ratioChildren.length;
    });
  },

  /**
   * Calculate partition depth in mm
   */
  calculatePartitionDepth: (
    partition: PartitionConfig,
    cabinetDepth: number
  ): number => {
    const maxDepth = cabinetDepth - SHELF_CONFIG.SETBACK;

    switch (partition.depthPreset) {
      case 'FULL':
        return maxDepth;
      case 'HALF':
        return Math.round(maxDepth / 2);
      case 'CUSTOM':
        return clamp(
          partition.customDepth ?? maxDepth / 2,
          INTERIOR_CONFIG.PARTITION_DEPTH_MIN,
          maxDepth
        );
    }
  },

  /**
   * Calculate all bounds recursively for the zone tree
   */
  calculateBounds: (
    zone: InteriorZone,
    parentBounds: ParentBounds,
    bodyThickness: number,
    cabinetDepth: number
  ): ZoneTreeInfo => {
    const leafZoneBounds: ZoneBounds[] = [];
    const partitionBounds: PartitionBounds[] = [];
    let totalZoneCount = 1;
    let maxDepth = zone.depth;

    const processZone = (z: InteriorZone, bounds: ParentBounds) => {
      totalZoneCount++;
      maxDepth = Math.max(maxDepth, z.depth);

      if (z.contentType !== 'NESTED' || !z.children || z.children.length === 0) {
        // Leaf zone - add to bounds list
        leafZoneBounds.push({
          zone: z,
          startX: bounds.startX,
          startY: bounds.startY,
          width: bounds.width,
          height: bounds.height,
          depth: z.depth,
        });
        return;
      }

      // Nested zone - calculate child bounds
      const isVertical = z.divisionDirection === 'VERTICAL';

      if (isVertical) {
        // Vertical division - distribute widths
        const widths = Zone.distributeWidths(z.children, bounds.width, bodyThickness);

        let currentX = bounds.startX;
        z.children.forEach((child, i) => {
          const childBounds: ParentBounds = {
            startX: currentX,
            startY: bounds.startY,
            width: widths[i],
            height: bounds.height,
          };

          processZone(child, childBounds);

          currentX += widths[i];

          // Add partition after this child (except for last)
          if (i < z.children!.length - 1) {
            const partition = z.partitions?.[i] ?? Zone.createPartition();
            partitionBounds.push({
              partition,
              x: currentX + bodyThickness / 2,
              startY: bounds.startY,
              height: bounds.height,
              depthMm: Zone.calculatePartitionDepth(partition, cabinetDepth),
            });
            currentX += bodyThickness;
          }
        });
      } else {
        // Horizontal division - distribute heights
        const heights = Zone.distributeHeights(z.children, bounds.height);

        let currentY = bounds.startY;
        z.children.forEach((child, i) => {
          const childBounds: ParentBounds = {
            startX: bounds.startX,
            startY: currentY,
            width: bounds.width,
            height: heights[i],
          };

          processZone(child, childBounds);

          currentY += heights[i];
        });
      }
    };

    // Start processing from root zone with parent bounds
    if (zone.contentType !== 'NESTED' || !zone.children || zone.children.length === 0) {
      // Root is a leaf zone
      leafZoneBounds.push({
        zone,
        startX: parentBounds.startX,
        startY: parentBounds.startY,
        width: parentBounds.width,
        height: parentBounds.height,
        depth: zone.depth,
      });
    } else {
      processZone(zone, parentBounds);
      totalZoneCount--; // Correct for initial increment
    }

    return {
      leafZoneBounds,
      partitionBounds,
      totalZoneCount,
      maxDepth,
    };
  },

  // ==========================================================================
  // VALIDATORS - Functions that validate zone configurations
  // ==========================================================================

  /**
   * Validate a single zone
   */
  validate: (zone: InteriorZone): ValidationResult => {
    const errors: string[] = [];

    // Check depth limit
    if (zone.depth >= INTERIOR_CONFIG.MAX_ZONE_DEPTH) {
      errors.push(`Zone depth ${zone.depth} exceeds maximum ${INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1}`);
    }

    // Check height config
    if (zone.heightConfig.mode === 'RATIO' && (zone.heightConfig.ratio ?? 0) <= 0) {
      errors.push('Height ratio must be positive');
    }
    if (zone.heightConfig.mode === 'EXACT' && (zone.heightConfig.exactMm ?? 0) < INTERIOR_CONFIG.MIN_ZONE_HEIGHT_MM) {
      errors.push(`Exact height must be at least ${INTERIOR_CONFIG.MIN_ZONE_HEIGHT_MM}mm`);
    }

    // Check width config
    if (zone.widthConfig?.mode === 'FIXED' && (zone.widthConfig.fixedMm ?? 0) < INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM) {
      errors.push(`Fixed width must be at least ${INTERIOR_CONFIG.MIN_ZONE_WIDTH_MM}mm`);
    }

    // Check nested zone
    if (zone.contentType === 'NESTED') {
      if (!zone.children || zone.children.length === 0) {
        errors.push('Nested zone must have at least one child');
      }
      if (zone.children && zone.children.length > INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE) {
        errors.push(`Zone has ${zone.children.length} children, max is ${INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE}`);
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate entire zone tree recursively
   */
  validateTree: (zone: InteriorZone): ValidationResult => {
    const zoneResult = Zone.validate(zone);

    if (zone.contentType === 'NESTED' && zone.children) {
      const childResults = zone.children.map((c) => Zone.validateTree(c));
      return mergeValidations(zoneResult, ...childResults);
    }

    return zoneResult;
  },

  // ==========================================================================
  // QUERIES - Functions that extract information from zones
  // ==========================================================================

  /**
   * Find a zone by ID recursively
   */
  findZoneById: (zone: InteriorZone, zoneId: string): InteriorZone | null => {
    if (zone.id === zoneId) return zone;

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        const found = Zone.findZoneById(child, zoneId);
        if (found) return found;
      }
    }

    return null;
  },

  /**
   * Find the path of IDs from root to target zone
   */
  findZonePath: (zone: InteriorZone, targetId: string): string[] | null => {
    if (zone.id === targetId) return [];

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        const childPath = Zone.findZonePath(child, targetId);
        if (childPath !== null) {
          return [child.id, ...childPath];
        }
      }
    }

    return null;
  },

  /**
   * Get parent zone of a child
   */
  findParentZone: (zone: InteriorZone, childId: string): InteriorZone | null => {
    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        if (child.id === childId) return zone;
        const found = Zone.findParentZone(child, childId);
        if (found) return found;
      }
    }
    return null;
  },

  /**
   * Get all zones flattened
   */
  getAllZones: (zone: InteriorZone): InteriorZone[] => {
    const zones: InteriorZone[] = [zone];

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        zones.push(...Zone.getAllZones(child));
      }
    }

    return zones;
  },

  /**
   * Get all partitions in tree
   */
  getAllPartitions: (zone: InteriorZone): PartitionConfig[] => {
    const partitions: PartitionConfig[] = zone.partitions ?? [];

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        partitions.push(...Zone.getAllPartitions(child));
      }
    }

    return partitions;
  },

  /**
   * Count total zones in tree
   */
  countZones: (zone: InteriorZone): number => {
    let count = 1;

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        count += Zone.countZones(child);
      }
    }

    return count;
  },

  /**
   * Get maximum depth in tree
   */
  getMaxDepth: (zone: InteriorZone): number => {
    let maxDepth = zone.depth;

    if (zone.contentType === 'NESTED' && zone.children) {
      for (const child of zone.children) {
        maxDepth = Math.max(maxDepth, Zone.getMaxDepth(child));
      }
    }

    return maxDepth;
  },

  /**
   * Check if zone has nested zones
   */
  hasNestedZones: (zone: InteriorZone): boolean => {
    if (zone.contentType === 'NESTED') return true;

    if (zone.children) {
      for (const child of zone.children) {
        if (Zone.hasNestedZones(child)) return true;
      }
    }

    return false;
  },

  /**
   * Check if a child can be added to zone
   */
  canAddChild: (zone: InteriorZone): boolean => {
    if (zone.contentType !== 'NESTED') return false;
    return (zone.children?.length ?? 0) < INTERIOR_CONFIG.MAX_CHILDREN_PER_ZONE;
  },

  /**
   * Check if zone can be converted to nested
   */
  canNest: (zone: InteriorZone): boolean => {
    return zone.depth < INTERIOR_CONFIG.MAX_ZONE_DEPTH - 1;
  },

  /**
   * Get summary text for zone (Polish)
   */
  getSummary: (zone: InteriorZone): string => {
    switch (zone.contentType) {
      case 'EMPTY':
        return 'Pusta';
      case 'SHELVES':
        return `Półki (${zone.shelvesConfig?.count ?? 0})`;
      case 'DRAWERS':
        return `Szuflady (${zone.drawerConfig?.zones.length ?? 0})`;
      case 'NESTED':
        const childCount = zone.children?.length ?? 0;
        const direction = zone.divisionDirection === 'VERTICAL' ? 'kolumny' : 'sekcje';
        return `${childCount} ${direction}`;
    }
  },
} as const;
