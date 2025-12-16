# Plan: Wall-Mounted Kitchen Cabinet (Szafka Wisząca)

## Overview

Wall-mounted kitchen cabinet designed for wall installation. The cabinet is intended for storing dishes and kitchen accessories. It is mounted using furniture hangers (zawieszki meblowe) on a wall rail. The cabinet does NOT have legs - it is a hanging element mounted directly to the wall.

## Key Features

1. **No legs** - wall-mounted cabinet, `legs.enabled = false` by default
2. **Mounting cutouts** - back panel has cutouts in top corners (left and right) for hanger installation
3. **Standard equipment options** - shelves, interior configuration
4. **Folding front (front łamany)** - option for a 2-section front that opens upward

---

## Implementation Steps

### Phase 1: Type Definitions

#### 1.1 Add New Cabinet Type

**File:** `apps/app/src/types/cabinet.ts`

```typescript
// Add to CabinetType union
export type CabinetType =
  | 'KITCHEN'
  | 'WARDROBE'
  | 'BOOKSHELF'
  | 'DRAWER'
  | 'WALL'  // NEW: Wall-mounted cabinet
  | 'CORNER_INTERNAL'
  | 'CORNER_EXTERNAL';
```

#### 1.2 Add Wall Cabinet Parameters Interface

**File:** `apps/app/src/types/cabinet.ts`

```typescript
/**
 * Mounting hanger cutout configuration
 * Cutouts on the back panel for furniture hangers (zawieszki meblowe)
 */
export interface HangerCutoutConfig {
  enabled: boolean;
  /** Width of the cutout (mm) - typically 40-60mm */
  width: number;
  /** Height of the cutout (mm) - typically 30-50mm */
  height: number;
  /** Horizontal inset from cabinet edge (mm) */
  horizontalInset: number;
  /** Vertical inset from top edge (mm) */
  verticalInset: number;
}

/**
 * Folding door (front łamany) configuration
 * A door split into 2 sections that fold together when opening upward
 */
export interface FoldingDoorConfig {
  enabled: boolean;
  /** Split ratio - fraction of height for bottom section (0.3-0.7, default 0.5) */
  splitRatio: number;
  /** Gap between sections (mm) */
  sectionGap: number;
}

/**
 * Wall-mounted cabinet specific parameters
 */
export interface WallCabinetParams extends CabinetBaseParams {
  type: 'WALL';
  /** Number of internal shelves (0-5) */
  shelfCount: number;
  /** Whether to add doors */
  hasDoors: boolean;
  /** Door configuration */
  doorConfig?: DoorConfig;
  /** Handle configuration for doors */
  handleConfig?: HandleConfig;
  /** Folding door configuration (front łamany) */
  foldingDoorConfig?: FoldingDoorConfig;
  /** Mounting hanger cutouts on back panel */
  hangerCutouts?: HangerCutoutConfig;
  /** Mounting height from floor (mm) - informational only, affects room placement */
  mountingHeight?: number;
}
```

#### 1.3 Update CabinetParams Union

**File:** `apps/app/src/types/cabinet.ts`

```typescript
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams
  | WallCabinetParams  // NEW
  | CornerInternalCabinetParams
  | CornerExternalCabinetParams;
```

#### 1.4 Add New Part Roles

**File:** `apps/app/src/types/cabinet.ts`

```typescript
export type CabinetPartRole =
  // ... existing roles
  | 'DOOR_UPPER'         // Upper section of folding door
  | 'DOOR_LOWER';        // Lower section of folding door
```

---

### Phase 2: Configuration Defaults

#### 2.1 Add Wall Cabinet Preset

**File:** `apps/app/src/lib/config.ts`

```typescript
// Default hanger cutout configuration
export const DEFAULT_HANGER_CUTOUT_CONFIG: HangerCutoutConfig = {
  enabled: true,
  width: 50,       // mm
  height: 40,      // mm
  horizontalInset: 50,  // mm from side edge
  verticalInset: 30,    // mm from top edge
};

// Default folding door configuration
export const DEFAULT_FOLDING_DOOR_CONFIG: FoldingDoorConfig = {
  enabled: false,
  splitRatio: 0.5,  // Equal split
  sectionGap: 3,    // mm
};

// Add to CABINET_PRESETS
WALL: {
  type: 'WALL',
  width: 800,
  height: 720,
  depth: 350,  // Wall cabinets are typically shallower
  shelfCount: 1,
  hasDoors: true,
  topBottomPlacement: 'inset',
  hasBack: true,
  backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
  backMountType: 'overlap',
  doorConfig: {
    layout: 'DOUBLE',
    openingDirection: 'LIFT_UP',  // Wall cabinets often open upward
  },
  hangerCutouts: DEFAULT_HANGER_CUTOUT_CONFIG,
  // legs is intentionally NOT included - wall cabinets don't have legs
},
```

#### 2.2 Add Hanger Cutout Constants

**File:** `apps/app/src/lib/cabinetGenerators/constants.ts`

```typescript
// Hanger cutout limits
export const HANGER_CUTOUT_MIN_WIDTH = 30;   // mm
export const HANGER_CUTOUT_MAX_WIDTH = 100;  // mm
export const HANGER_CUTOUT_MIN_HEIGHT = 20;  // mm
export const HANGER_CUTOUT_MAX_HEIGHT = 80;  // mm
export const HANGER_CUTOUT_MIN_INSET = 20;   // mm
```

---

### Phase 3: Generator Implementation

#### 3.1 Create Wall Cabinet Generator

**File:** `apps/app/src/lib/cabinetGenerators/wallCabinet.ts` (NEW)

```typescript
/**
 * Wall cabinet generator
 * Similar to kitchen cabinet but:
 * - No legs support
 * - Back panel with hanger cutouts
 * - Support for folding doors
 */

import {
  CabinetParams,
  CabinetMaterials,
  Material,
  WallCabinetParams,
} from '@/types';
import { GeneratedPart } from './types';
import { DEFAULT_DOOR_CONFIG, DEFAULT_HANGER_CUTOUT_CONFIG } from '../config';
import { generateBackPanelWithCutouts } from './backPanel';
import { generateDoors } from './doors';
import { generateFoldingDoors } from './foldingDoors';  // NEW
import { generateSideFronts } from './sideFronts';
import { generateDecorativePanels } from './decorativePanels';
import { generateInterior, hasInteriorContent } from './interior';

export function generateWallCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material,
  backMaterial?: Material
): GeneratedPart[] {
  if (params.type !== 'WALL') throw new Error('Invalid params type');

  const parts: GeneratedPart[] = [];
  const {
    width, height, depth,
    shelfCount, hasDoors,
    topBottomPlacement, hasBack,
    backOverlapRatio, backMountType,
    hangerCutouts,
    foldingDoorConfig,
  } = params;
  const thickness = bodyMaterial.thickness;

  // NO leg offset for wall cabinets - they are wall-mounted
  const legOffset = 0;

  const isInset = topBottomPlacement === 'inset';
  const sideHeight = isInset ? height : Math.max(height - thickness * 2, 0);
  const sideCenterY = height / 2 + legOffset;
  const topPanelY = height - thickness / 2 + legOffset;
  const bottomPanelY = thickness / 2 + legOffset;

  const topBottomPanelWidth = isInset ? width - thickness * 2 : width;
  const shelfWidth = width - thickness * 2;

  // 1. BOTTOM panel
  parts.push({
    name: 'Dno',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: topBottomPanelWidth, y: depth },
    width: topBottomPanelWidth,
    height: depth,
    depth: thickness,
    position: [0, bottomPanelY, 0],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel
  parts.push({
    name: 'Bok lewy',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: depth, y: sideHeight },
    width: depth,
    height: sideHeight,
    depth: thickness,
    position: [-width / 2 + thickness / 2, sideCenterY, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel
  parts.push({
    name: 'Bok prawy',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: depth, y: sideHeight },
    width: depth,
    height: sideHeight,
    depth: thickness,
    position: [width / 2 - thickness / 2, sideCenterY, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
    name: 'Góra',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: topBottomPanelWidth, y: depth },
    width: topBottomPanelWidth,
    height: depth,
    depth: thickness,
    position: [0, topPanelY, 0],
    rotation: [-Math.PI / 2, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. INTERIOR
  if (hasInteriorContent(params.interiorConfig)) {
    const interiorParts = generateInterior({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialId: materials.bodyMaterialId,
      frontMaterialId: materials.frontMaterialId,
      bodyThickness: thickness,
      frontThickness: thickness,
      interiorConfig: params.interiorConfig,
    });
    parts.push(...interiorParts);
  } else {
    // Legacy: SHELVES
    const interiorHeight = Math.max(height - thickness * 2, 0);
    const shelfSpacing = interiorHeight / (shelfCount + 1);

    for (let i = 0; i < shelfCount; i++) {
      const shelfY = thickness + shelfSpacing * (i + 1) + legOffset;
      parts.push({
        name: `Półka ${i + 1}`,
        furnitureId,
        group: cabinetId,
        shapeType: 'RECT',
        shapeParams: { type: 'RECT', x: shelfWidth, y: depth - 10 },
        width: shelfWidth,
        height: depth - 10,
        depth: thickness,
        position: [0, shelfY, -5],
        rotation: [-Math.PI / 2, 0, 0],
        materialId: materials.bodyMaterialId,
        edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
        cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
      });
    }
  }

  // 6. DOORS
  if (hasDoors) {
    const doorConfig = params.doorConfig ?? DEFAULT_DOOR_CONFIG;
    const handleConfig = params.handleConfig;

    // Check if folding doors are enabled
    if (foldingDoorConfig?.enabled) {
      const foldingDoorParts = generateFoldingDoors({
        cabinetId,
        furnitureId,
        cabinetWidth: width,
        cabinetHeight: height,
        cabinetDepth: depth,
        thickness,
        frontMaterialId: materials.frontMaterialId,
        doorConfig,
        handleConfig,
        foldingDoorConfig,
        legOffset,
      });
      parts.push(...foldingDoorParts);
    } else {
      // Standard doors
      const doorParts = generateDoors({
        cabinetId,
        furnitureId,
        cabinetWidth: width,
        cabinetHeight: height,
        cabinetDepth: depth,
        thickness,
        frontMaterialId: materials.frontMaterialId,
        doorConfig,
        handleConfig,
        legOffset,
      });
      parts.push(...doorParts);
    }
  }

  // 7. BACK PANEL (with hanger cutouts)
  if (hasBack && backMaterial) {
    const cutoutConfig = hangerCutouts ?? DEFAULT_HANGER_CUTOUT_CONFIG;

    const backPanel = generateBackPanelWithCutouts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      backMaterialId: materials.backMaterialId || backMaterial.id,
      backMaterialThickness: backMaterial.thickness,
      overlapRatio: backOverlapRatio ?? 0.667,
      mountType: backMountType ?? 'overlap',
      topBottomPlacement,
      legOffset,
      hangerCutouts: cutoutConfig,
    });
    parts.push(backPanel);
  }

  // 8. SIDE FRONTS (if configured)
  if (params.sideFronts && (params.sideFronts.left?.enabled || params.sideFronts.right?.enabled)) {
    const sideFrontParts = generateSideFronts({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      bodyMaterialThickness: thickness,
      frontMaterialThickness: thickness,
      sideFrontsConfig: params.sideFronts,
      defaultFrontMaterialId: materials.frontMaterialId,
      legOffset,
    });
    parts.push(...sideFrontParts);
  }

  // 9. DECORATIVE PANELS (if configured)
  if (params.decorativePanels && (params.decorativePanels.top?.enabled || params.decorativePanels.bottom?.enabled)) {
    const decorativeParts = generateDecorativePanels({
      cabinetId,
      furnitureId,
      cabinetWidth: width,
      cabinetHeight: height,
      cabinetDepth: depth,
      frontMaterialId: materials.frontMaterialId,
      frontThickness: thickness,
      bodyThickness: thickness,
      decorativePanels: params.decorativePanels,
      legOffset,
    });
    parts.push(...decorativeParts);
  }

  // NOTE: Wall cabinets do NOT have legs

  return parts;
}
```

#### 3.2 Create Folding Doors Generator

**File:** `apps/app/src/lib/cabinetGenerators/foldingDoors.ts` (NEW)

```typescript
/**
 * Folding door (front łamany) generation for wall cabinets
 * Creates a door split into 2 sections for upward folding motion
 */

import { GeneratedPart } from './types';
import { FRONT_MARGIN, DOOR_GAP } from './constants';
import { generateHandleMetadata, DoorType } from '../handlePresets';
import { DoorConfig, HandleConfig, FoldingDoorConfig } from '@/types';

export interface FoldingDoorGenerationConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  thickness: number;
  frontMaterialId: string;
  doorConfig: DoorConfig;
  handleConfig?: HandleConfig;
  foldingDoorConfig: FoldingDoorConfig;
  legOffset?: number;
}

/**
 * Generate folding door parts
 * Creates upper and lower door sections with gap between them
 */
export function generateFoldingDoors(config: FoldingDoorGenerationConfig): GeneratedPart[] {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    thickness,
    frontMaterialId,
    doorConfig,
    handleConfig,
    foldingDoorConfig,
    legOffset = 0,
  } = config;

  const parts: GeneratedPart[] = [];

  const availableWidth = cabinetWidth - FRONT_MARGIN * 2;
  const totalDoorHeight = cabinetHeight - FRONT_MARGIN * 2;

  // Calculate section heights based on split ratio
  const { splitRatio, sectionGap } = foldingDoorConfig;
  const availableDoorHeight = totalDoorHeight - sectionGap;
  const lowerSectionHeight = availableDoorHeight * splitRatio;
  const upperSectionHeight = availableDoorHeight * (1 - splitRatio);

  // Calculate Y positions
  const lowerSectionCenterY = FRONT_MARGIN + lowerSectionHeight / 2 + legOffset;
  const upperSectionCenterY = FRONT_MARGIN + lowerSectionHeight + sectionGap + upperSectionHeight / 2 + legOffset;

  const doorZPosition = cabinetDepth / 2 + thickness / 2;

  if (doorConfig.layout === 'SINGLE') {
    // Single folding door (full width, 2 vertical sections)
    const doorWidth = availableWidth;

    // Lower section
    parts.push({
      name: 'Front dolny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: lowerSectionHeight },
      width: doorWidth,
      height: lowerSectionHeight,
      depth: thickness,
      position: [0, lowerSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_LOWER',
        index: 0,
        doorMetadata: {
          hingeSide: undefined,
          openingDirection: 'LIFT_UP',
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, lowerSectionHeight, 'FOLDING_LOWER')
          : undefined,
      },
    });

    // Upper section
    parts.push({
      name: 'Front górny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: upperSectionHeight },
      width: doorWidth,
      height: upperSectionHeight,
      depth: thickness,
      position: [0, upperSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_UPPER',
        index: 0,
        doorMetadata: {
          hingeSide: undefined,
          openingDirection: 'LIFT_UP',
        },
      },
    });
  } else {
    // Double folding doors (2 columns × 2 rows = 4 sections)
    const doorWidth = (availableWidth - DOOR_GAP) / 2;

    // Left lower section
    parts.push({
      name: 'Front lewy dolny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: lowerSectionHeight },
      width: doorWidth,
      height: lowerSectionHeight,
      depth: thickness,
      position: [-doorWidth / 2 - DOOR_GAP / 2, lowerSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_LOWER',
        index: 0,
        doorMetadata: {
          hingeSide: 'LEFT',
          openingDirection: 'LIFT_UP',
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, lowerSectionHeight, 'FOLDING_LOWER')
          : undefined,
      },
    });

    // Left upper section
    parts.push({
      name: 'Front lewy górny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: upperSectionHeight },
      width: doorWidth,
      height: upperSectionHeight,
      depth: thickness,
      position: [-doorWidth / 2 - DOOR_GAP / 2, upperSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_UPPER',
        index: 0,
        doorMetadata: {
          hingeSide: 'LEFT',
          openingDirection: 'LIFT_UP',
        },
      },
    });

    // Right lower section
    parts.push({
      name: 'Front prawy dolny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: lowerSectionHeight },
      width: doorWidth,
      height: lowerSectionHeight,
      depth: thickness,
      position: [doorWidth / 2 + DOOR_GAP / 2, lowerSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_LOWER',
        index: 1,
        doorMetadata: {
          hingeSide: 'RIGHT',
          openingDirection: 'LIFT_UP',
        },
        handleMetadata: handleConfig
          ? generateHandleMetadata(handleConfig, doorWidth, lowerSectionHeight, 'FOLDING_LOWER')
          : undefined,
      },
    });

    // Right upper section
    parts.push({
      name: 'Front prawy górny',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: upperSectionHeight },
      width: doorWidth,
      height: upperSectionHeight,
      depth: thickness,
      position: [doorWidth / 2 + DOOR_GAP / 2, upperSectionCenterY, doorZPosition],
      rotation: [0, 0, 0],
      materialId: frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'DOOR_UPPER',
        index: 1,
        doorMetadata: {
          hingeSide: 'RIGHT',
          openingDirection: 'LIFT_UP',
        },
      },
    });
  }

  return parts;
}
```

#### 3.3 Update Back Panel Generator for Cutouts

**File:** `apps/app/src/lib/cabinetGenerators/backPanel.ts`

Add new function for back panel with hanger cutouts:

```typescript
import { HangerCutoutConfig } from '@/types';

export interface BackPanelWithCutoutsConfig extends BackPanelConfig {
  hangerCutouts: HangerCutoutConfig;
}

/**
 * Generate back panel with hanger cutouts for wall-mounted cabinets
 * Uses POLYGON shape to create rectangular cutouts in top corners
 */
export function generateBackPanelWithCutouts(config: BackPanelWithCutoutsConfig): GeneratedPart {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    bodyMaterialThickness,
    backMaterialId,
    backMaterialThickness,
    overlapRatio,
    topBottomPlacement,
    legOffset = 0,
    hangerCutouts,
  } = config;

  // Calculate base dimensions (same as standard back panel)
  const overlapDepth = Math.max(
    bodyMaterialThickness * overlapRatio,
    MIN_BACK_OVERLAP
  );
  const edgeInset = bodyMaterialThickness - overlapDepth;

  let backWidth = cabinetWidth - 2 * edgeInset;
  let backHeight = cabinetHeight - 2 * edgeInset;

  backWidth = Math.max(backWidth, BACK_PANEL_CONFIG.MIN_WIDTH);
  backHeight = Math.max(backHeight, BACK_PANEL_CONFIG.MIN_HEIGHT);

  const backZPosition = -cabinetDepth / 2 - backMaterialThickness / 2;
  const backYPosition = cabinetHeight / 2 + legOffset;

  // If cutouts are disabled, return standard rectangular back
  if (!hangerCutouts.enabled) {
    return generateBackPanel(config);
  }

  // Create polygon points for back panel with cutouts
  // Coordinate system: (0,0) is bottom-left of the panel
  const { width: cutW, height: cutH, horizontalInset, verticalInset } = hangerCutouts;

  const halfW = backWidth / 2;
  const halfH = backHeight / 2;

  // Polygon points (clockwise from bottom-left)
  // Standard rectangle with notches cut from top corners
  const points: [number, number][] = [
    // Bottom edge
    [-halfW, -halfH],
    [halfW, -halfH],
    // Right edge up to cutout
    [halfW, halfH - verticalInset - cutH],
    // Right cutout (going into the panel)
    [halfW - horizontalInset, halfH - verticalInset - cutH],
    [halfW - horizontalInset, halfH - verticalInset],
    [halfW - horizontalInset - cutW, halfH - verticalInset],
    [halfW - horizontalInset - cutW, halfH],
    // Top edge between cutouts
    [-halfW + horizontalInset + cutW, halfH],
    // Left cutout
    [-halfW + horizontalInset + cutW, halfH - verticalInset],
    [-halfW + horizontalInset, halfH - verticalInset],
    [-halfW + horizontalInset, halfH - verticalInset - cutH],
    [-halfW, halfH - verticalInset - cutH],
    // Close polygon
  ];

  return {
    name: 'Plecy',
    furnitureId,
    group: cabinetId,
    shapeType: 'POLYGON',
    shapeParams: {
      type: 'POLYGON',
      points,
    },
    width: backWidth,
    height: backHeight,
    depth: backMaterialThickness,
    position: [0, backYPosition, backZPosition],
    rotation: [0, 0, 0],
    materialId: backMaterialId,
    edgeBanding: {
      type: 'RECT',  // Edge banding still uses RECT type for simplicity
      top: false,
      bottom: false,
      left: false,
      right: false,
    },
    cabinetMetadata: {
      cabinetId,
      role: 'BACK',
    },
  };
}
```

#### 3.4 Update Generator Index

**File:** `apps/app/src/lib/cabinetGenerators/index.ts`

```typescript
export * from './wallCabinet';
export * from './foldingDoors';
export { generateBackPanelWithCutouts } from './backPanel';
```

---

### Phase 4: UI Implementation

#### 4.1 Add Wall Cabinet Template Card

**File:** `apps/app/src/components/ui/CabinetTemplateDialog.tsx`

Add to template selection step:

```tsx
<TemplateCard
  type="WALL"
  title="Szafka wisząca"
  description="Szafka kuchenna wisząca montowana na ścianie przy użyciu zawieszek meblowych"
  icon={<PanelTop className="h-5 w-5" />}  // or appropriate icon
  onClick={() => handleSelectTemplate('WALL')}
/>
```

#### 4.2 Add Wall Cabinet Parameter Form Section

**File:** `apps/app/src/components/ui/CabinetTemplateDialog.tsx`

Add new section in `ParameterForm` for wall cabinet specific options:

```tsx
{/* Wall Cabinet Specific Options */}
{type === 'WALL' && (
  <>
    <Separator className="my-4" />
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Opcje szafki wiszącej</h3>

      {/* Hanger Cutouts Toggle */}
      <ConfigRow
        title="Wycięcia na zawieszki"
        description="Wycięcia w plecach na zawieszki meblowe"
        icon={<Grip className="h-4 w-4" />}
        action={
          <Switch
            checked={getHangerCutoutsEnabled()}
            onCheckedChange={(checked) => updateHangerCutouts({ enabled: checked })}
          />
        }
      />

      {getHangerCutoutsEnabled() && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          <div>
            <Label className="text-xs">Szerokość (mm)</Label>
            <NumberInput
              value={getHangerCutoutWidth()}
              onChange={(v) => updateHangerCutouts({ width: v })}
              min={30}
              max={100}
            />
          </div>
          <div>
            <Label className="text-xs">Wysokość (mm)</Label>
            <NumberInput
              value={getHangerCutoutHeight()}
              onChange={(v) => updateHangerCutouts({ height: v })}
              min={20}
              max={80}
            />
          </div>
          <div>
            <Label className="text-xs">Wcięcie poziome (mm)</Label>
            <NumberInput
              value={getHangerCutoutHorizontalInset()}
              onChange={(v) => updateHangerCutouts({ horizontalInset: v })}
              min={20}
              max={200}
            />
          </div>
          <div>
            <Label className="text-xs">Wcięcie pionowe (mm)</Label>
            <NumberInput
              value={getHangerCutoutVerticalInset()}
              onChange={(v) => updateHangerCutouts({ verticalInset: v })}
              min={20}
              max={200}
            />
          </div>
        </div>
      )}

      {/* Folding Door Option */}
      <ConfigRow
        title="Front łamany"
        description="Front podzielony na 2 sekcje, otwierany do góry"
        icon={<ArrowLeftRight className="h-4 w-4 rotate-90" />}
        action={
          <Switch
            checked={getFoldingDoorEnabled()}
            onCheckedChange={(checked) => updateFoldingDoor({ enabled: checked })}
            disabled={!getHasDoors()}
          />
        }
      />

      {getFoldingDoorEnabled() && getHasDoors() && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          <div>
            <Label className="text-xs">Proporcja podziału</Label>
            <Slider
              value={[getFoldingSplitRatio() * 100]}
              onValueChange={([v]) => updateFoldingDoor({ splitRatio: v / 100 })}
              min={30}
              max={70}
              step={5}
            />
            <div className="text-xs text-muted-foreground mt-1">
              Dolna sekcja: {Math.round(getFoldingSplitRatio() * 100)}%
            </div>
          </div>
          <div>
            <Label className="text-xs">Przerwa między sekcjami (mm)</Label>
            <NumberInput
              value={getFoldingSectionGap()}
              onChange={(v) => updateFoldingDoor({ sectionGap: v })}
              min={2}
              max={10}
            />
          </div>
        </div>
      )}
    </div>
  </>
)}
```

#### 4.3 Add Helper Functions for Wall Cabinet Params

```tsx
// Hanger cutout accessors
const getHangerCutoutsEnabled = (): boolean => {
  if (params.type !== 'WALL') return false;
  return params.hangerCutouts?.enabled ?? DEFAULT_HANGER_CUTOUT_CONFIG.enabled;
};

const getHangerCutoutWidth = (): number => {
  if (params.type !== 'WALL') return DEFAULT_HANGER_CUTOUT_CONFIG.width;
  return params.hangerCutouts?.width ?? DEFAULT_HANGER_CUTOUT_CONFIG.width;
};

// ... similar getters for height, horizontalInset, verticalInset

const updateHangerCutouts = (updates: Partial<HangerCutoutConfig>) => {
  if (params.type !== 'WALL') return;
  const currentConfig = params.hangerCutouts ?? DEFAULT_HANGER_CUTOUT_CONFIG;
  updateParams({
    hangerCutouts: { ...currentConfig, ...updates },
  });
};

// Folding door accessors
const getFoldingDoorEnabled = (): boolean => {
  if (params.type !== 'WALL') return false;
  return params.foldingDoorConfig?.enabled ?? false;
};

const getFoldingSplitRatio = (): number => {
  if (params.type !== 'WALL') return 0.5;
  return params.foldingDoorConfig?.splitRatio ?? 0.5;
};

const getFoldingSectionGap = (): number => {
  if (params.type !== 'WALL') return 3;
  return params.foldingDoorConfig?.sectionGap ?? 3;
};

const updateFoldingDoor = (updates: Partial<FoldingDoorConfig>) => {
  if (params.type !== 'WALL') return;
  const currentConfig = params.foldingDoorConfig ?? DEFAULT_FOLDING_DOOR_CONFIG;
  updateParams({
    foldingDoorConfig: { ...currentConfig, ...updates },
  });
};
```

---

### Phase 5: Integration

#### 5.1 Update Main Generator Index

**File:** `apps/app/src/lib/cabinetGenerators/index.ts`

```typescript
import { generateWallCabinet } from './wallCabinet';

export function getCabinetGenerator(type: CabinetType): CabinetGenerator {
  switch (type) {
    case 'KITCHEN':
      return generateKitchenCabinet;
    case 'WARDROBE':
      return generateWardrobe;
    case 'BOOKSHELF':
      return generateBookshelf;
    case 'DRAWER':
      return generateDrawerCabinet;
    case 'WALL':
      return generateWallCabinet;  // NEW
    case 'CORNER_INTERNAL':
      return generateCornerInternal;
    case 'CORNER_EXTERNAL':
      throw new Error('Corner external cabinet not yet implemented');
    default:
      throw new Error(`Unknown cabinet type: ${type}`);
  }
}
```

#### 5.2 Update Handle Presets for Folding Doors

**File:** `apps/app/src/lib/handlePresets.ts`

```typescript
export type DoorType =
  | 'SINGLE'
  | 'DOUBLE_LEFT'
  | 'DOUBLE_RIGHT'
  | 'FOLDING_LOWER'   // NEW
  | 'FOLDING_UPPER';  // NEW

// Add handle positioning logic for folding door sections
```

---

### Phase 6: Validation & Testing

#### 6.1 Add Validation Rules

**File:** `apps/app/src/lib/validation/cabinet.ts` (if exists, or add to relevant validation)

```typescript
export function validateWallCabinetParams(params: WallCabinetParams): ValidationResult {
  const errors: string[] = [];

  // Standard dimension validation
  if (params.width < 300 || params.width > 1200) {
    errors.push('Szerokość szafki wiszącej musi być między 300 a 1200 mm');
  }
  if (params.height < 300 || params.height > 1000) {
    errors.push('Wysokość szafki wiszącej musi być między 300 a 1000 mm');
  }
  if (params.depth < 200 || params.depth > 400) {
    errors.push('Głębokość szafki wiszącej musi być między 200 a 400 mm');
  }

  // Hanger cutout validation
  if (params.hangerCutouts?.enabled) {
    const { width, height, horizontalInset, verticalInset } = params.hangerCutouts;
    const backWidth = params.width - 12; // approximate
    const backHeight = params.height - 12;

    // Ensure cutouts don't overlap
    if (horizontalInset * 2 + width * 2 > backWidth) {
      errors.push('Wycięcia na zawieszki są zbyt szerokie dla tej szafki');
    }
    if (verticalInset + height > backHeight / 2) {
      errors.push('Wycięcia na zawieszki są zbyt głębokie');
    }
  }

  // Folding door validation
  if (params.foldingDoorConfig?.enabled) {
    if (!params.hasDoors) {
      errors.push('Front łamany wymaga włączonych drzwi');
    }
    if (params.doorConfig?.openingDirection !== 'LIFT_UP') {
      errors.push('Front łamany wymaga kierunku otwierania do góry');
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Summary of Files to Create/Modify

### New Files:
1. `apps/app/src/lib/cabinetGenerators/wallCabinet.ts` - Main generator
2. `apps/app/src/lib/cabinetGenerators/foldingDoors.ts` - Folding door generator

### Modified Files:
1. `apps/app/src/types/cabinet.ts` - Add types (WallCabinetParams, HangerCutoutConfig, FoldingDoorConfig)
2. `apps/app/src/lib/config.ts` - Add presets and defaults
3. `apps/app/src/lib/cabinetGenerators/backPanel.ts` - Add generateBackPanelWithCutouts
4. `apps/app/src/lib/cabinetGenerators/index.ts` - Register new generator
5. `apps/app/src/lib/cabinetGenerators/constants.ts` - Add hanger cutout constants
6. `apps/app/src/lib/handlePresets.ts` - Add folding door handle types
7. `apps/app/src/components/ui/CabinetTemplateDialog.tsx` - Add UI for wall cabinet

---

## Technical Notes

### Back Panel Cutouts
- Uses POLYGON shape type instead of RECT to define the back panel with cutouts
- Cutouts are positioned relative to top corners of the back panel
- Polygon coordinates must be calculated to create "inverse notches" at top-left and top-right

### Folding Doors (Front Łamany)
- Split into 2 separate rectangular parts: DOOR_UPPER and DOOR_LOWER
- Both sections have `openingDirection: 'LIFT_UP'`
- Hinge mechanism (bifold hardware) is assumed but not modeled in detail
- Handle typically placed on lower section only

### Wall Cabinet Differences from Kitchen Cabinet
1. No leg support (`legs` is always undefined/disabled)
2. Shallower default depth (350mm vs 580mm)
3. Default door opening direction is LIFT_UP
4. Back panel includes mounting cutouts
5. Optional folding door configuration

---

## Implementation Order

1. **Phase 1** - Types (foundation, no breaking changes)
2. **Phase 2** - Config defaults (extends existing config)
3. **Phase 3** - Generators (core functionality)
4. **Phase 4** - UI (user-facing features)
5. **Phase 5** - Integration (connect everything)
6. **Phase 6** - Validation & testing (quality assurance)

Each phase can be tested independently before proceeding to the next.
