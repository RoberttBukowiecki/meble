# PLAN: Corner Cabinet Generator Refactor (v2)

## Executive Summary

Full refactor of L-shaped corner cabinet generator with:
- New coordinate system (origin at external front corner)
- L-shape panel support with DXF export
- Proper top/bottom mounting options (inset/overlay)
- Front rail (wieniec przedni) support
- Extended door types (single, bifold, double, angled)

**Breaking change** - no backward compatibility required.

---

## 1. Current State Analysis

### Existing Implementation
- **Origin**: Center of bounding box
- **Bottom/Top**: Two separate rectangles (arm A + arm B)
- **Sides**: Full armB length for side A
- **Door types**: SINGLE_STRAIGHT, SINGLE_DIAGONAL only
- **No front rail support**
- **No DXF export**
- **Edge banding**: Only RECT type (4 edges)

### Target Implementation
- **Origin**: External front corner (0,0,0)
- **Bottom/Top**: User choice - two rectangles OR single L-shape
- **Sides**: Each side has only `bodyDepth` dimension
- **Door types**: SINGLE, BIFOLD, DOUBLE, ANGLED
- **Front rail with inset/overlay options**
- **DXF export for L-shape geometry**
- **Edge banding**: New L_SHAPE type (6 edges)

---

## 2. New Type Definitions

### 2.1 Dimension Terminology

```
┌─────────────────────────────────────────────────────────────┐
│  DIMENSION GLOSSARY                                         │
├─────────────────────────────────────────────────────────────┤
│  W         = External width of cabinet (left arm span)      │
│  D         = External depth of cabinet (right arm span)     │
│  H         = External height of cabinet                     │
│  t         = Body material thickness (e.g., 18mm)           │
│  tf        = Front material thickness (e.g., 18mm)          │
│  bodyDepth = Depth of cabinet body panels (e.g., 560mm)     │
│              This is how deep shelves/sides extend          │
│              NOT the same as D!                             │
└─────────────────────────────────────────────────────────────┘

Visual representation (TOP VIEW, LEFT orientation):

        ◄────────────── W ──────────────►

    ┌───────────────────────────────────┐  ▲
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
    │░░░░░░░░░░ ARM A (main) ░░░░░░░░░░░│  │ bodyDepth
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
    ├───────────────────┬───────────────┘  ▼
    │░░░░░░░░░░░░░░░░░░░│
    │░░░ ARM B ░░░░░░░░░│ ◄─ bodyDepth
    │░░░░░░░░░░░░░░░░░░░│                  ▲
    │░░░░░░░░░░░░░░░░░░░│                  │
    │░░░░░░░░░░░░░░░░░░░│                  │ D - bodyDepth
    │░░░░░░░░░░░░░░░░░░░│                  │
    └───────────────────┘                  ▼

    ▲
    │
   (0,0,0) = Origin at external front corner
```

### 2.2 CornerConfig (Breaking Change)

```typescript
// apps/app/src/types/corner.ts

export interface CornerConfig {
  cornerType: InternalCornerType;
  cornerOrientation: CornerOrientation; // LEFT | RIGHT

  // External dimensions
  W: number;         // External width (mm) - full span of left arm
  D: number;         // External depth (mm) - full span of right arm
  bodyDepth: number; // Body panel depth (mm) - how deep panels/shelves extend

  // Mounting options (separate for top and bottom)
  bottomMount: 'overlay' | 'inset';
  topMount: 'overlay' | 'inset';

  // Panel geometry choice
  panelGeometry: 'TWO_RECT' | 'L_SHAPE';

  // Front rail (wieniec przedni)
  frontRail: boolean;
  frontRailMount?: 'overlay' | 'inset';
  frontRailWidth?: number; // Default 100mm

  // Door/front configuration
  frontType: CornerFrontType;
  hingeSide?: 'left' | 'right';  // For SINGLE/BIFOLD
  frontAngle?: number;           // For ANGLED (default 45)
  doorGap?: number;              // Gap between door and frame (default 2mm)

  // Wall sharing (unchanged from current)
  wallSharingMode: WallSharingMode;
}

export type CornerFrontType =
  | 'NONE'     // No front (open shelving)
  | 'SINGLE'   // Single door parallel to X axis
  | 'BIFOLD'   // Bi-fold (2 panels with hinge between)
  | 'DOUBLE'   // Two separate doors (one per arm)
  | 'ANGLED';  // Single diagonal door at angle

// REMOVED fields (breaking change):
// - armA, armB (replaced by W, D)
// - depth (replaced by bodyDepth in config)
// - dimensionMode (always asymmetric now - W and D can differ)
// - cornerAngle (always 90° for L-shaped)
// - diagonalWidth (auto-calculated from dead zone)
// - deadZonePreset, deadZoneWidth, deadZoneDepth (simplified - calculated from geometry)
```

### 2.3 Updated CornerInternalCabinetParams

```typescript
export interface CornerInternalCabinetParams {
  type: 'CORNER_INTERNAL';

  // These mirror cornerConfig for CabinetBaseParams compatibility
  width: number;   // = W
  height: number;  // = H
  depth: number;   // = bodyDepth (NOT D!)

  cornerConfig: CornerConfig;

  // Standard options (unchanged)
  hasBack: boolean;
  backOverlapRatio: number;
  backMountType: BackMountType;
  legs?: LegsConfig;

  // DEPRECATED - use cornerConfig.bottomMount/topMount instead
  topBottomPlacement?: TopBottomPlacement;
}
```

### 2.4 EdgeBandingLShape (NEW)

```typescript
// apps/app/src/types/edge.ts

/**
 * Edge banding for L-shaped parts (6 edges)
 *
 * Edge numbering (TOP VIEW, counterclockwise from front-left):
 *
 *       edge5 (back-left)
 *    ┌──────────────────────┐
 *    │                      │
 * e6 │                      │ edge4 (inner-vertical)
 *    │          ┌───────────┤
 *    │          │           │ edge3 (inner-horizontal)
 *    │          │           │
 *    └──────────┴───────────┘
 *       edge1        edge2
 *    (front-left)  (front-right)
 */
export interface EdgeBandingLShape {
  type: 'L_SHAPE';
  edge1: boolean; // Front-left (outer front of arm A)
  edge2: boolean; // Front-right (outer side of arm A, facing front)
  edge3: boolean; // Inner-horizontal (step going inward)
  edge4: boolean; // Inner-vertical (step going back)
  edge5: boolean; // Back-left (back of arm B)
  edge6: boolean; // Outer-left (outer side of arm B)
}

// Update EdgeBanding union
export type EdgeBanding =
  | EdgeBandingRect
  | EdgeBandingLShape
  | EdgeBandingTrapezoid;
```

---

## 3. Coordinate System

### 3.1 Origin Definition

```
Origin (0,0,0) = External front corner at floor level

For LEFT orientation:
- X axis: Points RIGHT (along arm A width)
- Y axis: Points UP (height)
- Z axis: Points BACK (into the corner)

         +Z (back)
          ↑
          │
          │      ┌─────────────────┐
          │      │                 │
          │      │    ARM A        │
          │      │                 │
          │      └────────┬────────┘
          │               │
          │      ┌────────┘
          │      │ ARM B
          │      │
          │      │
          └──────┴─────────────────→ +X (right)
         (0,0,0)

          Y axis points UP (out of screen)
```

### 3.2 Position Calculations (Origin at Front Corner)

All positions are **offsets from (0,0,0)** at the external front corner.

#### Bottom Panel (Dno)

| Mount Type | Position X | Position Y | Position Z |
|------------|-----------|------------|------------|
| overlay | W/2 | t/2 + legOffset | D/2 |
| inset | W/2 | t/2 + legOffset | D/2 |

Note: For overlay, panel sits under sides. For inset, panel is between sides.
The X/Z center is the same, but panel dimensions differ.

**Dimensions:**
- overlay: `W × D` (full L-shape)
- inset: `(W - 2t) × (D - 2t)` (reduced by side thickness)

#### Side Panels (Boki)

| Panel | Position X | Position Y | Position Z |
|-------|-----------|------------|------------|
| Left Side | t/2 | H/2 + legOffset | bodyDepth/2 |
| Right Side | W - bodyDepth/2 | H/2 + legOffset | t/2 |

**Key insight:** Each side has only `bodyDepth` dimension, NOT full W or D!

- Left Side dimensions: `bodyDepth × sideHeight`
- Right Side dimensions: `bodyDepth × sideHeight`
- Left Side rotation: `[0, π/2, 0]` (faces inward along X)
- Right Side rotation: `[0, 0, 0]` (faces inward along Z)

#### Top Panel (Góra)

| Mount Type | Position X | Position Y | Position Z |
|------------|-----------|------------|------------|
| overlay | W/2 | H - t/2 + legOffset | D/2 |
| inset | W/2 | H - t/2 + legOffset | D/2 |

Same logic as bottom - dimensions differ based on mount type.

#### Front Rail (Wieniec Przedni)

```typescript
// Front rail is a HORIZONTAL panel near the TOP, at the FRONT
const frontRailPosition = {
  x: (t + (W - bodyDepth)) / 2,  // Centered in opening
  y: H - t/2 + legOffset,        // At top (same Y as top panel)
  z: frontRailWidth / 2,         // Near front (small Z value)
};

// Dimensions based on mount type:
// - overlay: spans from left side outer edge to inner corner
// - inset: spans between sides (reduced by 2t)
const frontRailLength = frontRailMount === 'overlay'
  ? W - bodyDepth
  : W - bodyDepth - 2*t;
```

#### Back Panels (Plecy)

| Panel | Position X | Position Y | Position Z |
|-------|-----------|------------|------------|
| Back A (arm A) | W/2 | H/2 + legOffset | D - backT/2 |
| Back B (arm B) | backT/2 | H/2 + legOffset | (D - bodyDepth)/2 + bodyDepth |

---

## 4. Panel Generation Logic

### 4.1 Bottom Panel (Dno)

```typescript
function generateBottomPanel(
  config: CornerConfig,
  t: number,
  legOffset: number
): GeneratedPart[] {
  const { W, D, bodyDepth, bottomMount, panelGeometry, cornerOrientation } = config;

  // Calculate dimensions based on mount type
  const isInset = bottomMount === 'inset';
  const panelW = isInset ? W - 2*t : W;
  const panelD = isInset ? D - 2*t : D;

  // Position (center of panel, offset from origin)
  const posX = W / 2;
  const posY = t/2 + legOffset;
  const posZ = D / 2;

  if (panelGeometry === 'L_SHAPE') {
    // Single L-shaped panel
    // Cut dimensions: the "missing" inner corner
    const cutX = panelW - bodyDepth + (isInset ? t : 0);
    const cutY = panelD - bodyDepth + (isInset ? t : 0);

    return [{
      name: 'Dno',
      shapeType: 'L_SHAPE',
      shapeParams: {
        type: 'L_SHAPE',
        x: panelW,
        y: panelD,
        cutX: cutX,  // Width of cut-out
        cutY: cutY,  // Depth of cut-out
      },
      width: panelW,
      height: panelD,
      depth: t,
      position: [posX, posY, posZ],
      rotation: [-Math.PI/2, 0, 0],
      edgeBanding: {
        type: 'L_SHAPE',
        edge1: true,  // Front visible
        edge2: true,  // Side visible
        edge3: true,  // Inner step visible
        edge4: true,  // Inner step visible
        edge5: false, // Back hidden
        edge6: false, // Back hidden
      },
      cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
    }];
  } else {
    // TWO_RECT: Two separate rectangular panels
    return [
      generateBottomArmA(config, t, legOffset, isInset),
      generateBottomArmB(config, t, legOffset, isInset),
    ];
  }
}

function generateBottomArmA(
  config: CornerConfig,
  t: number,
  legOffset: number,
  isInset: boolean
): GeneratedPart {
  const { W, D, bodyDepth } = config;

  // Arm A: main panel spanning width W
  const panelW = isInset ? W - 2*t : W;
  const panelDepth = bodyDepth - t; // Depth minus back panel space

  return {
    name: 'Dno (ramie A)',
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: panelW, y: panelDepth },
    width: panelW,
    height: panelDepth,
    depth: t,
    position: [
      W/2,
      t/2 + legOffset,
      D - bodyDepth/2,
    ],
    rotation: [-Math.PI/2, 0, 0],
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
  };
}

function generateBottomArmB(
  config: CornerConfig,
  t: number,
  legOffset: number,
  isInset: boolean
): GeneratedPart {
  const { W, D, bodyDepth } = config;

  // Arm B: extends from inner corner toward front
  const armBLength = D - bodyDepth; // How far arm B extends
  if (armBLength <= 0) return null; // No arm B if D <= bodyDepth

  const panelW = bodyDepth - t;
  const panelDepth = armBLength;

  return {
    name: 'Dno (ramie B)',
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: panelW, y: panelDepth },
    width: panelW,
    height: panelDepth,
    depth: t,
    position: [
      t + panelW/2,  // Offset from left side
      t/2 + legOffset,
      bodyDepth + panelDepth/2,
    ],
    rotation: [-Math.PI/2, 0, 0],
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'CORNER_BOTTOM' },
  };
}
```

### 4.2 Side Panels (Boki)

```typescript
function generateSidePanels(
  config: CornerConfig,
  H: number,
  t: number,
  legOffset: number
): GeneratedPart[] {
  const { W, D, bodyDepth, bottomMount, topMount, wallSharingMode } = config;
  const parts: GeneratedPart[] = [];

  // Calculate side height based on mount types
  const bottomOffset = bottomMount === 'inset' ? 0 : t;
  const topOffset = topMount === 'inset' ? 0 : t;
  const sideHeight = H - bottomOffset - topOffset;

  const sideCenterY = bottomOffset + sideHeight/2 + legOffset;

  // Left Side (only if not shared)
  if (wallSharingMode !== 'SHARED_LEFT' && wallSharingMode !== 'SHARED_BOTH') {
    parts.push({
      name: 'Bok lewy',
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: bodyDepth, y: sideHeight },
      width: bodyDepth,
      height: sideHeight,
      depth: t,
      position: [t/2, sideCenterY, bodyDepth/2],
      rotation: [0, Math.PI/2, 0],
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'CORNER_LEFT_SIDE' },
    });
  }

  // Right Side (only if not shared)
  if (wallSharingMode !== 'SHARED_RIGHT' && wallSharingMode !== 'SHARED_BOTH') {
    parts.push({
      name: 'Bok prawy',
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: bodyDepth, y: sideHeight },
      width: bodyDepth,
      height: sideHeight,
      depth: t,
      position: [W - bodyDepth/2, sideCenterY, t/2],
      rotation: [0, 0, 0],
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'CORNER_RIGHT_SIDE' },
    });
  }

  return parts;
}
```

### 4.3 Front Rail (Wieniec Przedni)

```typescript
function generateFrontRail(
  config: CornerConfig,
  H: number,
  t: number,
  legOffset: number
): GeneratedPart | null {
  if (!config.frontRail) return null;

  const { W, bodyDepth, frontRailMount, wallSharingMode } = config;
  const railWidth = config.frontRailWidth || 100;

  // Rail spans the front opening (from left side to inner corner)
  const hasLeftSide = wallSharingMode !== 'SHARED_LEFT' && wallSharingMode !== 'SHARED_BOTH';

  // Calculate rail length based on mount type
  let railLength: number;
  let railX: number;

  if (frontRailMount === 'overlay') {
    // Sits on top of sides
    railLength = W - bodyDepth;
    railX = (hasLeftSide ? t : 0) + railLength/2;
  } else {
    // Between sides (inset)
    railLength = W - bodyDepth - (hasLeftSide ? t : 0);
    railX = (hasLeftSide ? t : 0) + railLength/2;
  }

  return {
    name: 'Wieniec przedni',
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: railLength, y: railWidth },
    width: railLength,
    height: railWidth,
    depth: t,
    position: [
      railX,
      H - t/2 + legOffset,  // At top
      railWidth/2,          // Near front
    ],
    rotation: [-Math.PI/2, 0, 0],
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
    cabinetMetadata: { cabinetId, role: 'CORNER_TOP' },
  };
}
```

### 4.4 Front Types (Phase 1: SINGLE + ANGLED)

```typescript
function generateFront(
  config: CornerConfig,
  H: number,
  t: number,
  tf: number,
  legOffset: number
): GeneratedPart | null {
  const { frontType, W, D, bodyDepth, hingeSide, frontAngle, doorGap = 2 } = config;

  if (frontType === 'NONE') return null;

  // Front height (full opening minus gaps)
  const frontHeight = H - t - doorGap * 2;
  const frontCenterY = t + doorGap + frontHeight/2 + legOffset;

  if (frontType === 'SINGLE') {
    // Single door parallel to X axis (covers arm A opening)
    const frontWidth = W - bodyDepth - doorGap * 2;

    // Hinge side determines X position offset
    const frontX = hingeSide === 'left'
      ? t + doorGap + frontWidth/2
      : W - bodyDepth - doorGap - frontWidth/2;

    return {
      name: 'Front',
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: frontWidth, y: frontHeight },
      width: frontWidth,
      height: frontHeight,
      depth: tf,
      position: [frontX, frontCenterY, -tf/2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: {
        cabinetId,
        role: 'CORNER_DIAGONAL_FRONT',
        doorMetadata: { hingeSide, doorIndex: 0 },
      },
    };
  }

  if (frontType === 'ANGLED') {
    // Diagonal door at specified angle (default 45°)
    const angle = frontAngle || 45;
    const angleRad = (angle * Math.PI) / 180;

    // Dead zone = inner corner area
    const deadZoneW = W - bodyDepth;
    const deadZoneD = D - bodyDepth;

    // Diagonal width (hypotenuse for 45°)
    const diagonalWidth = Math.sqrt(deadZoneW ** 2 + deadZoneD ** 2) - doorGap * 2;

    // Center of dead zone
    const centerX = bodyDepth + deadZoneW / 2;
    const centerZ = bodyDepth - deadZoneD / 2;

    return {
      name: 'Front skosny',
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: diagonalWidth, y: frontHeight },
      width: diagonalWidth,
      height: frontHeight,
      depth: tf,
      position: [centerX, frontCenterY, centerZ],
      rotation: [0, -angleRad, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'CORNER_DIAGONAL_FRONT' },
    };
  }

  return null;
}
```

---

## 5. Wall Sharing + L_SHAPE Interaction

### 5.1 Rules

When `wallSharingMode !== 'FULL_ISOLATION'` (side is shared with adjacent cabinet):

| Wall Sharing Mode | L_SHAPE Allowed? | Behavior |
|-------------------|------------------|----------|
| FULL_ISOLATION | Yes | Normal L-shape generation |
| SHARED_LEFT | Yes | L-shape generated, left side panel skipped |
| SHARED_RIGHT | Yes | L-shape generated, right side panel skipped |
| SHARED_BOTH | **No** | Falls back to TWO_RECT (L-shape edge banding would be wrong) |

### 5.2 Implementation

```typescript
function shouldUseLShape(config: CornerConfig): boolean {
  // User wants L-shape AND wall sharing allows it
  if (config.panelGeometry !== 'L_SHAPE') return false;

  // SHARED_BOTH makes L-shape edge banding incorrect
  // (can't hide proper edges when both sides are missing)
  if (config.wallSharingMode === 'SHARED_BOTH') {
    console.warn('L_SHAPE not supported with SHARED_BOTH, falling back to TWO_RECT');
    return false;
  }

  return true;
}

function generateBottomPanel(config: CornerConfig, ...): GeneratedPart[] {
  const useLShape = shouldUseLShape(config);

  if (useLShape) {
    // Adjust edge banding based on wall sharing
    const edgeBanding = getEdgeBandingForLShape(config);
    return [generateLShapePanel(config, edgeBanding)];
  } else {
    return generateTwoRectPanels(config);
  }
}

function getEdgeBandingForLShape(config: CornerConfig): EdgeBandingLShape {
  const { wallSharingMode } = config;

  return {
    type: 'L_SHAPE',
    edge1: true,  // Front always visible
    edge2: true,  // Front-right always visible
    edge3: true,  // Inner step always visible
    edge4: true,  // Inner step always visible
    edge5: wallSharingMode !== 'SHARED_LEFT',  // Back-left hidden if shared
    edge6: wallSharingMode !== 'SHARED_RIGHT', // Outer-left hidden if shared
  };
}
```

---

## 6. DXF Export System

### 6.1 Library Recommendation

Use **`@tarikjabiri/dxf`** (modern, TypeScript-friendly) or **`dxf-writer`** for DXF generation.

```bash
pnpm add @tarikjabiri/dxf
```

### 6.2 DXF Export Module

Create `apps/app/src/lib/export/dxf.ts`:

```typescript
import { DxfWriter, Units } from '@tarikjabiri/dxf';
import type { Part, ShapeParamsLShape, ShapeParamsPolygon, ShapeParamsTrapezoid } from '@/types';

export interface DXFExportResult {
  filename: string;
  content: string;
}

/**
 * Generate DXF file for non-rectangular part
 */
export function generatePartDXF(part: Part): DXFExportResult | null {
  if (part.shapeType === 'RECT') {
    return null; // Rectangles don't need DXF
  }

  const dxf = new DxfWriter();
  dxf.setUnits(Units.Millimeters);

  switch (part.shapeType) {
    case 'L_SHAPE':
      addLShapeToDoc(dxf, part.shapeParams as ShapeParamsLShape);
      break;
    case 'POLYGON':
      addPolygonToDoc(dxf, part.shapeParams as ShapeParamsPolygon);
      break;
    case 'TRAPEZOID':
      addTrapezoidToDoc(dxf, part.shapeParams as ShapeParamsTrapezoid);
      break;
  }

  return {
    filename: `${part.id}.dxf`,
    content: dxf.stringify(),
  };
}

function addLShapeToDoc(dxf: DxfWriter, params: ShapeParamsLShape): void {
  const { x, y, cutX, cutY } = params;

  // L-shape vertices (counterclockwise from origin)
  const points: [number, number][] = [
    [0, 0],           // Bottom-left (origin)
    [x, 0],           // Bottom-right
    [x, y - cutY],    // Right side before cut
    [x - cutX, y - cutY], // Inner corner (horizontal)
    [x - cutX, y],    // Inner corner (vertical)
    [0, y],           // Top-left
  ];

  // Add closed polyline
  dxf.addLWPolyline(
    points.map(([px, py]) => ({ x: px, y: py })),
    { isClosed: true }
  );
}

function addPolygonToDoc(dxf: DxfWriter, params: ShapeParamsPolygon): void {
  const { points } = params;

  dxf.addLWPolyline(
    points.map(([px, py]) => ({ x: px, y: py })),
    { isClosed: true }
  );
}

function addTrapezoidToDoc(dxf: DxfWriter, params: ShapeParamsTrapezoid): void {
  const { frontX, backX, y, skosSide } = params;

  let points: [number, number][];

  if (skosSide === 'left') {
    const offset = backX - frontX;
    points = [
      [offset, 0],
      [offset + frontX, 0],
      [backX, y],
      [0, y],
    ];
  } else {
    const offset = backX - frontX;
    points = [
      [0, 0],
      [frontX, 0],
      [backX, y],
      [offset, y],
    ];
  }

  dxf.addLWPolyline(
    points.map(([px, py]) => ({ x: px, y: py })),
    { isClosed: true }
  );
}
```

### 6.3 Export Integration

Update `apps/app/src/lib/csv.ts`:

```typescript
import { generatePartDXF, DXFExportResult } from './export/dxf';
import JSZip from 'jszip';

// Add geometry_file column
export const AVAILABLE_COLUMNS: CSVColumn[] = [
  // ... existing columns ...
  {
    id: 'geometry_file',
    label: 'geometryFile',
    accessor: (part) => part.shapeType !== 'RECT' ? `${part.id}.dxf` : '',
  },
];

/**
 * Export parts as ZIP containing CSV + DXF files
 */
export async function exportPartsWithGeometry(
  parts: Part[],
  materials: Material[],
  furnitures: Furniture[],
  columns: CSVColumn[] = DEFAULT_COLUMNS
): Promise<Blob> {
  const zip = new JSZip();

  // Add CSV
  const csv = generateCSV(parts, materials, furnitures, columns);
  zip.file('parts.csv', csv);

  // Add DXF files for non-rectangular parts
  const dxfFolder = zip.folder('geometry');
  parts.forEach(part => {
    const dxf = generatePartDXF(part);
    if (dxf) {
      dxfFolder.file(dxf.filename, dxf.content);
    }
  });

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Download parts as ZIP with geometry
 */
export async function downloadPartsWithGeometry(
  parts: Part[],
  materials: Material[],
  furnitures: Furniture[],
  filename: string = 'e-meble_export.zip'
): Promise<void> {
  const blob = await exportPartsWithGeometry(parts, materials, furnitures);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

---

## 7. 3D Rendering Updates

### 7.1 Part3D Component

Update `apps/app/src/components/canvas/Part3D.tsx`:

```typescript
import * as THREE from 'three';
import { ExtrudeGeometry, Shape } from 'three';

function createGeometryForPart(part: Part): THREE.BufferGeometry {
  switch (part.shapeType) {
    case 'RECT':
      return new THREE.BoxGeometry(part.width, part.height, part.depth);

    case 'L_SHAPE':
      return createLShapeGeometry(part.shapeParams as ShapeParamsLShape, part.depth);

    case 'TRAPEZOID':
      return createTrapezoidGeometry(part.shapeParams as ShapeParamsTrapezoid, part.depth);

    case 'POLYGON':
      return createPolygonGeometry(part.shapeParams as ShapeParamsPolygon, part.depth);

    default:
      return new THREE.BoxGeometry(part.width, part.height, part.depth);
  }
}

function createLShapeGeometry(params: ShapeParamsLShape, depth: number): THREE.BufferGeometry {
  const { x, y, cutX, cutY } = params;

  // Create 2D shape
  const shape = new THREE.Shape();
  shape.moveTo(-x/2, -y/2);           // Start at bottom-left (centered)
  shape.lineTo(x/2, -y/2);            // Bottom edge
  shape.lineTo(x/2, y/2 - cutY);      // Right edge (partial)
  shape.lineTo(x/2 - cutX, y/2 - cutY); // Inner horizontal
  shape.lineTo(x/2 - cutX, y/2);      // Inner vertical
  shape.lineTo(-x/2, y/2);            // Top edge
  shape.closePath();

  // Extrude to 3D
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });

  // Center the geometry (ExtrudeGeometry extrudes along +Z)
  geometry.translate(0, 0, -depth/2);

  return geometry;
}

function createTrapezoidGeometry(params: ShapeParamsTrapezoid, depth: number): THREE.BufferGeometry {
  const { frontX, backX, y, skosSide } = params;

  const shape = new THREE.Shape();
  const halfY = y / 2;

  if (skosSide === 'left') {
    const offset = (backX - frontX);
    shape.moveTo(-frontX/2, -halfY);
    shape.lineTo(frontX/2, -halfY);
    shape.lineTo(backX/2, halfY);
    shape.lineTo(-backX/2, halfY);
  } else {
    shape.moveTo(-frontX/2, -halfY);
    shape.lineTo(frontX/2, -halfY);
    shape.lineTo(backX/2, halfY);
    shape.lineTo(-backX/2, halfY);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth/2);

  return geometry;
}

function createPolygonGeometry(params: ShapeParamsPolygon, depth: number): THREE.BufferGeometry {
  const { points } = params;

  // Calculate centroid for centering
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;

  const shape = new THREE.Shape();
  shape.moveTo(points[0][0] - cx, points[0][1] - cy);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0] - cx, points[i][1] - cy);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth/2);

  return geometry;
}
```

---

## 8. Implementation Tasks

### Phase 1: Types & Domain (Breaking Change)

| # | Task | File | Status |
|---|------|------|--------|
| 1.1 | Define new CornerConfig with W, D, bodyDepth | `types/corner.ts` | ☐ |
| 1.2 | Define CornerFrontType union | `types/corner.ts` | ☐ |
| 1.3 | Add EdgeBandingLShape type | `types/edge.ts` | ☐ |
| 1.4 | Update EdgeBanding union | `types/edge.ts` | ☐ |
| 1.5 | Update CornerInternalCabinetParams | `types/cabinet.ts` | ☐ |
| 1.6 | Refactor CornerDomain creators | `lib/domain/corner.ts` | ☐ |
| 1.7 | Update CornerDomain validators | `lib/domain/corner.ts` | ☐ |
| 1.8 | Add position calculation helpers | `lib/domain/corner.ts` | ☐ |

### Phase 2: Generator Refactor

| # | Task | File | Status |
|---|------|------|--------|
| 2.1 | Implement new coordinate system | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.2 | Implement generateBottomPanel (L_SHAPE + TWO_RECT) | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.3 | Implement generateTopPanel (L_SHAPE + TWO_RECT) | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.4 | Fix side panels (bodyDepth only) | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.5 | Implement generateFrontRail | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.6 | Implement SINGLE front type | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.7 | Implement ANGLED front type | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |
| 2.8 | Add wall sharing + L_SHAPE interaction | `lib/cabinetGenerators/corner/lShapedGenerator.ts` | ☐ |

### Phase 3: DXF Export

| # | Task | File | Status |
|---|------|------|--------|
| 3.1 | Install @tarikjabiri/dxf and jszip | `package.json` | ☐ |
| 3.2 | Create DXF export module | `lib/export/dxf.ts` | ☐ |
| 3.3 | Implement L_SHAPE DXF generation | `lib/export/dxf.ts` | ☐ |
| 3.4 | Implement TRAPEZOID DXF generation | `lib/export/dxf.ts` | ☐ |
| 3.5 | Implement POLYGON DXF generation | `lib/export/dxf.ts` | ☐ |
| 3.6 | Add geometry_file column to CSV | `lib/csv.ts` | ☐ |
| 3.7 | Implement ZIP export (CSV + DXF) | `lib/csv.ts` | ☐ |

### Phase 4: 3D Rendering

| # | Task | File | Status |
|---|------|------|--------|
| 4.1 | Implement createLShapeGeometry | `components/canvas/Part3D.tsx` | ☐ |
| 4.2 | Implement createTrapezoidGeometry | `components/canvas/Part3D.tsx` | ☐ |
| 4.3 | Implement createPolygonGeometry | `components/canvas/Part3D.tsx` | ☐ |
| 4.4 | Update geometry switch statement | `components/canvas/Part3D.tsx` | ☐ |
| 4.5 | Update edge visualization for L-shape | `components/canvas/Part3D.tsx` | ☐ |

### Phase 5: UI Updates

| # | Task | File | Status |
|---|------|------|--------|
| 5.1 | Update corner config panel | `components/ui/CornerConfigPanel.tsx` | ☐ |
| 5.2 | Add panelGeometry selector | `components/ui/CornerConfigPanel.tsx` | ☐ |
| 5.3 | Add front rail toggle | `components/ui/CornerConfigPanel.tsx` | ☐ |
| 5.4 | Add frontType selector | `components/ui/CornerConfigPanel.tsx` | ☐ |
| 5.5 | Update dimension inputs (W, D, bodyDepth) | `components/ui/CornerConfigPanel.tsx` | ☐ |

---

## 9. Unit Tests

### 9.1 Geometry Calculations

```typescript
// __tests__/corner/geometry.test.ts

describe('CornerDomain geometry calculations', () => {
  describe('calculatePanelPositions', () => {
    it('should place bottom panel at correct position for overlay mount', () => {
      const config = createTestConfig({ bottomMount: 'overlay' });
      const positions = CornerDomain.calculatePanelPositions(config, 720, 18, 0);

      expect(positions.bottom.y).toBe(9); // t/2
    });

    it('should place left side at X = t/2', () => {
      const config = createTestConfig();
      const positions = CornerDomain.calculatePanelPositions(config, 720, 18, 0);

      expect(positions.leftSide.x).toBe(9); // t/2
    });
  });

  describe('L_SHAPE cutout calculations', () => {
    it('should calculate correct cutX for W=900, bodyDepth=560', () => {
      const cut = CornerDomain.calculateLShapeCut(900, 900, 560, false);

      expect(cut.cutX).toBe(340); // W - bodyDepth
      expect(cut.cutY).toBe(340); // D - bodyDepth
    });

    it('should adjust cut for inset mount', () => {
      const cut = CornerDomain.calculateLShapeCut(900, 900, 560, true, 18);

      expect(cut.cutX).toBe(358); // W - bodyDepth + t
    });
  });
});
```

### 9.2 DXF Generation

```typescript
// __tests__/export/dxf.test.ts

describe('DXF export', () => {
  it('should generate valid DXF for L-shape', () => {
    const part = createLShapePart({ x: 900, y: 900, cutX: 340, cutY: 340 });
    const result = generatePartDXF(part);

    expect(result).not.toBeNull();
    expect(result.content).toContain('LWPOLYLINE');
    expect(result.content).toContain('EOF');
  });

  it('should return null for RECT parts', () => {
    const part = createRectPart({ x: 600, y: 400 });
    const result = generatePartDXF(part);

    expect(result).toBeNull();
  });
});
```

### 9.3 Wall Sharing Interaction

```typescript
// __tests__/corner/wallSharing.test.ts

describe('Wall sharing + L_SHAPE', () => {
  it('should allow L_SHAPE with SHARED_LEFT', () => {
    const config = createTestConfig({
      panelGeometry: 'L_SHAPE',
      wallSharingMode: 'SHARED_LEFT',
    });

    expect(shouldUseLShape(config)).toBe(true);
  });

  it('should fall back to TWO_RECT with SHARED_BOTH', () => {
    const config = createTestConfig({
      panelGeometry: 'L_SHAPE',
      wallSharingMode: 'SHARED_BOTH',
    });

    expect(shouldUseLShape(config)).toBe(false);
  });
});
```

---

## 10. Testing Checklist

### Geometry
- [ ] L-shape bottom panel generates with correct dimensions
- [ ] L-shape top panel generates with correct dimensions
- [ ] cutX/cutY calculations are correct for various W/D/bodyDepth combinations
- [ ] Side panels have bodyDepth dimension (not full W or D)
- [ ] Front rail positioned at top, near front
- [ ] Origin at (0,0,0) is external front corner

### Mounting Options
- [ ] bottomMount: overlay positions panel correctly
- [ ] bottomMount: inset reduces panel dimensions by 2t
- [ ] topMount: overlay/inset works independently from bottom
- [ ] frontRailMount: overlay/inset affects rail length

### Front Types
- [ ] SINGLE front spans arm A opening
- [ ] SINGLE front respects hingeSide
- [ ] ANGLED front rotates by frontAngle degrees
- [ ] ANGLED front centered on dead zone

### Wall Sharing
- [ ] SHARED_LEFT skips left side panel
- [ ] SHARED_RIGHT skips right side panel
- [ ] SHARED_BOTH forces TWO_RECT fallback
- [ ] Edge banding adjusted for shared walls

### Export
- [ ] DXF generated for L_SHAPE parts
- [ ] DXF generated for TRAPEZOID parts
- [ ] DXF contains valid LWPOLYLINE
- [ ] ZIP contains CSV + geometry folder
- [ ] geometry_file column in CSV references correct .dxf

### 3D Rendering
- [ ] L-shape renders correctly in 3D view
- [ ] Trapezoid renders correctly
- [ ] Polygon renders correctly
- [ ] Edge banding visualization works for L-shape

---

## 11. JSON Config Example (Corrected)

```json
{
  "type": "CORNER_INTERNAL",
  "width": 900,
  "height": 720,
  "depth": 560,
  "cornerConfig": {
    "cornerType": "L_SHAPED",
    "cornerOrientation": "LEFT",
    "W": 900,
    "D": 900,
    "bodyDepth": 560,
    "bottomMount": "inset",
    "topMount": "inset",
    "panelGeometry": "L_SHAPE",
    "frontRail": true,
    "frontRailMount": "inset",
    "frontRailWidth": 100,
    "frontType": "ANGLED",
    "frontAngle": 45,
    "doorGap": 2,
    "wallSharingMode": "FULL_ISOLATION"
  },
  "hasBack": true,
  "backOverlapRatio": 0.667,
  "backMountType": "overlap"
}
```

**Field clarification:**
- `width` = W (for CabinetBaseParams compatibility)
- `height` = H
- `depth` = bodyDepth (NOT D!)
- `cornerConfig.W` = external width
- `cornerConfig.D` = external depth
- `cornerConfig.bodyDepth` = cabinet body depth (how deep shelves extend)

---

## 12. Future Phases (Out of Scope)

- BIFOLD front type implementation
- DOUBLE front type implementation
- External corner cabinets
- Lazy Susan mechanism
- Pull-out shelves
- Non-90° corner angles
