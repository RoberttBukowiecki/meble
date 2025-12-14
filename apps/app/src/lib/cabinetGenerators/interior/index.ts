/**
 * Cabinet Interior Generator
 *
 * Generates shelves, drawers, and partitions based on recursive zone configuration.
 * Supports nested zones with HORIZONTAL and VERTICAL divisions.
 */

import type { CabinetInteriorConfig, InteriorZone } from '@/types';
import type { GeneratedPart } from '../types';
import { generateDrawers } from '../drawers';
import { DEFAULT_SHELF_EDGE_BANDING } from '@/lib/config';
import { Zone, Shelf } from '@/lib/domain';
import type { ZoneBounds, PartitionBounds } from '@/lib/domain/zone';

// ============================================================================
// Types
// ============================================================================

export interface InteriorGeneratorConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  bodyMaterialId: string;
  frontMaterialId: string;
  bodyThickness: number;
  frontThickness: number;
  interiorConfig: CabinetInteriorConfig | undefined;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate cabinet interior parts based on zone configuration
 */
export function generateInterior(config: InteriorGeneratorConfig): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { interiorConfig, cabinetWidth, cabinetHeight, cabinetDepth, bodyThickness } = config;

  if (!interiorConfig || !interiorConfig.rootZone) {
    return parts;
  }

  // Calculate interior bounds (inside the cabinet body)
  const interiorWidth = cabinetWidth - bodyThickness * 2;
  const interiorHeight = cabinetHeight - bodyThickness * 2;

  const parentBounds = {
    startX: -interiorWidth / 2,
    startY: bodyThickness,
    width: interiorWidth,
    height: interiorHeight,
  };

  // Calculate all zone and partition bounds recursively
  const treeInfo = Zone.calculateBounds(
    interiorConfig.rootZone,
    parentBounds,
    bodyThickness,
    cabinetDepth
  );

  // Generate parts for each leaf zone (zones with actual content)
  for (const zoneBounds of treeInfo.leafZoneBounds) {
    const zoneParts = generateZoneParts(config, zoneBounds);
    parts.push(...zoneParts);
  }

  // Generate partition parts
  for (const partitionBounds of treeInfo.partitionBounds) {
    const partitionPart = generatePartition(config, partitionBounds);
    parts.push(partitionPart);
  }

  return parts;
}

// ============================================================================
// Zone Content Generation
// ============================================================================

/**
 * Generate parts for a single zone based on its content type
 */
function generateZoneParts(
  config: InteriorGeneratorConfig,
  bounds: ZoneBounds
): GeneratedPart[] {
  const { zone } = bounds;

  switch (zone.contentType) {
    case 'SHELVES':
      if (zone.shelvesConfig) {
        return generateZoneShelves(config, bounds);
      }
      break;
    case 'DRAWERS':
      if (zone.drawerConfig) {
        return generateZoneDrawers(config, bounds);
      }
      break;
    case 'EMPTY':
    case 'NESTED':
      // No direct content - NESTED zones have children which are processed separately
      break;
  }

  return [];
}

/**
 * Generate shelves within a zone
 */
function generateZoneShelves(
  config: InteriorGeneratorConfig,
  bounds: ZoneBounds
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { zone } = bounds;
  const { shelvesConfig } = zone;

  if (!shelvesConfig || shelvesConfig.count === 0) return parts;

  const {
    cabinetId,
    furnitureId,
    cabinetDepth,
    bodyMaterialId,
    bodyThickness,
  } = config;

  // Use zone width instead of full cabinet width
  const shelfWidth = bounds.width;

  // Calculate shelf positions within zone bounds
  const shelfPositions = Shelf.calculatePositions(shelvesConfig, bounds.startY, bounds.height);

  for (let i = 0; i < shelvesConfig.count; i++) {
    const shelfY = shelfPositions[i];
    const shelfIndex = i;

    // Get depth using domain module
    const individualShelf = shelvesConfig.mode === 'MANUAL' ? shelvesConfig.shelves[i] : undefined;
    const shelfDepth = Shelf.calculateEffectiveDepth(individualShelf, shelvesConfig, cabinetDepth);

    // Z offset for recessed shelves
    const shelfZ = -Shelf.calculateZOffset(shelfDepth, cabinetDepth);

    // X position: center of zone
    const shelfX = bounds.startX + bounds.width / 2;

    // Material: individual shelf > global shelves config > body material
    const shelfMaterialId = individualShelf?.materialId
      ?? shelvesConfig.materialId
      ?? bodyMaterialId;

    parts.push({
      name: `Półka ${shelfIndex + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: shelfWidth, y: shelfDepth },
      width: shelfWidth,
      height: shelfDepth,
      depth: bodyThickness,
      position: [shelfX, shelfY, shelfZ],
      rotation: [-Math.PI / 2, 0, 0],
      materialId: shelfMaterialId,
      edgeBanding: DEFAULT_SHELF_EDGE_BANDING,
      cabinetMetadata: {
        cabinetId,
        role: 'SHELF',
        index: shelfIndex,
      },
    });
  }

  return parts;
}

/**
 * Generate drawers within a zone
 */
function generateZoneDrawers(
  config: InteriorGeneratorConfig,
  bounds: ZoneBounds
): GeneratedPart[] {
  const { zone } = bounds;
  const { drawerConfig } = zone;

  if (!drawerConfig || drawerConfig.zones.length === 0) return [];

  const {
    cabinetId,
    furnitureId,
    cabinetDepth,
    bodyMaterialId,
    frontMaterialId,
    bodyThickness,
    frontThickness,
  } = config;

  // Use custom materials from drawer config if specified
  const boxMaterialId = drawerConfig.boxMaterialId ?? bodyMaterialId;
  const bottomMaterialId = drawerConfig.bottomMaterialId;

  // Generate drawers using existing drawer generator
  // We simulate a cabinet with zone dimensions
  const drawerParts = generateDrawers({
    cabinetId,
    furnitureId,
    cabinetWidth: bounds.width + bodyThickness * 2, // Add thickness back for drawer calculations
    cabinetHeight: bounds.height + bodyThickness * 2,
    cabinetDepth,
    bodyMaterialId: boxMaterialId,
    frontMaterialId,
    bottomMaterialId,
    bodyThickness,
    frontThickness,
    drawerConfig,
  });

  // Offset positions to zone location
  const zoneXCenter = bounds.startX + bounds.width / 2;

  return drawerParts.map((part) => ({
    ...part,
    position: [
      part.position[0] + zoneXCenter, // Offset X to zone center
      part.position[1] + bounds.startY - bodyThickness, // Offset Y to zone start
      part.position[2],
    ] as [number, number, number],
  }));
}

// ============================================================================
// Partition Generation
// ============================================================================

/**
 * Generate a vertical partition (divider) between columns
 */
function generatePartition(
  config: InteriorGeneratorConfig,
  bounds: PartitionBounds
): GeneratedPart {
  const { partition } = bounds;
  const {
    cabinetId,
    furnitureId,
    bodyMaterialId,
    bodyThickness,
  } = config;

  // Use partition material or default to body material
  const materialId = partition.materialId ?? bodyMaterialId;

  // Partition is rotated 90° to stand vertically
  // Width = depth of partition (in mm)
  // Height = height of zone
  // Depth = body thickness (material thickness)
  return {
    name: 'Przegroda',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: bounds.depthMm, y: bounds.height },
    width: bounds.depthMm,
    height: bounds.height,
    depth: bodyThickness,
    position: [bounds.x, bounds.startY + bounds.height / 2, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId,
    edgeBanding: DEFAULT_SHELF_EDGE_BANDING,
    cabinetMetadata: {
      cabinetId,
      role: 'PARTITION',
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if interior config has any content
 */
export function hasInteriorContent(config: CabinetInteriorConfig | undefined): boolean {
  if (!config || !config.rootZone) return false;

  const checkZone = (zone: InteriorZone): boolean => {
    if (zone.contentType === 'SHELVES' && zone.shelvesConfig && zone.shelvesConfig.count > 0) {
      return true;
    }
    if (zone.contentType === 'DRAWERS' && zone.drawerConfig && zone.drawerConfig.zones.length > 0) {
      return true;
    }
    if (zone.contentType === 'NESTED' && zone.children) {
      return zone.children.some(checkZone);
    }
    return false;
  };

  return checkZone(config.rootZone);
}

/**
 * Get summary text for interior config (Polish)
 */
export function getInteriorSummary(config: CabinetInteriorConfig | undefined): string {
  if (!config || !config.rootZone) return 'Brak konfiguracji';

  const zones = Zone.getAllZones(config.rootZone);
  const shelfCount = zones
    .filter((z) => z.contentType === 'SHELVES')
    .reduce((sum, z) => sum + (z.shelvesConfig?.count ?? 0), 0);
  const drawerCount = zones
    .filter((z) => z.contentType === 'DRAWERS')
    .reduce((sum, z) => sum + (z.drawerConfig?.zones.length ?? 0), 0);
  const partitionCount = Zone.getAllPartitions(config.rootZone).length;

  const parts: string[] = [];
  if (shelfCount > 0) parts.push(`${shelfCount} półek`);
  if (drawerCount > 0) parts.push(`${drawerCount} szuflad`);
  if (partitionCount > 0) parts.push(`${partitionCount} przegród`);

  return parts.length > 0 ? parts.join(', ') : 'Puste wnętrze';
}

/**
 * Create a default interior config with empty root zone
 */
export function createDefaultInteriorConfig(): CabinetInteriorConfig {
  return {
    rootZone: Zone.createEmpty(0),
  };
}

/**
 * Create an interior config with shelves
 */
export function createInteriorWithShelves(count: number): CabinetInteriorConfig {
  return {
    rootZone: Zone.createWithShelves(count, 0),
  };
}

/**
 * Create an interior config with drawers
 */
export function createInteriorWithDrawers(zoneCount: number): CabinetInteriorConfig {
  return {
    rootZone: Zone.createWithDrawers(zoneCount, 0),
  };
}
