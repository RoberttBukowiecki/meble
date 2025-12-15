# Interior Configuration - Business Logic

## Overview

The interior configuration system is a recursive zone-based architecture for defining cabinet layouts. It supports up to 4 levels of nesting depth (0-3) and enables complex configurations combining shelves, drawers, and partitions in hierarchical structures.

---

## 1. Zone Types and Hierarchy

### Zone Content Types

| Type | Description |
|------|-------------|
| `EMPTY` | Placeholder zone with no content |
| `SHELVES` | Contains shelf configuration |
| `DRAWERS` | Contains drawer zones with boxes and fronts |
| `NESTED` | Contains child zones (recursive container) |

### Zone Tree Structure

- **Root Zone (depth = 0)**: Top-level zone containing entire interior
- **Level 1 (depth = 1)**: First-level child zones (e.g., main sections)
- **Level 2 (depth = 2)**: Second-level child zones (e.g., columns within section)
- **Level 3 (depth = 3)**: Third-level child zones (deepest level)
- **Maximum Depth**: 4 levels (depths 0, 1, 2, 3)

---

## 2. Division Directions

### HORIZONTAL Division
- Children are stacked **vertically** (bottom to top)
- Heights are distributed among children
- Used for: shelf sections, horizontal partitions

### VERTICAL Division
- Children are placed **side-by-side** (left to right)
- Widths are distributed among children
- Partitions (vertical dividers) separate children
- Used for: columns, vertical compartments

---

## 3. Size Configuration

### Height Configuration (`ZoneHeightConfig`)

| Mode | Description |
|------|-------------|
| `RATIO` | Proportional height based on ratio value (default: 1) |
| `EXACT` | Fixed height in mm |

### Width Configuration (`ZoneWidthConfig`) - VERTICAL divisions only

| Mode | Description |
|------|-------------|
| `PROPORTIONAL` | Proportional width based on ratio value (default: 1) |
| `FIXED` | Fixed width in mm |

### Distribution Algorithm

**Width (VERTICAL):**
1. Calculate partition total width: `thickness × (children - 1)`
2. Sum all FIXED widths first
3. Distribute remaining width by PROPORTIONAL ratios

**Height (HORIZONTAL):**
1. Sum all EXACT heights first
2. Distribute remaining height by RATIO values

---

## 4. Partition Configuration

Partitions are dividers between zones in NESTED zones (both HORIZONTAL and VERTICAL).

### Properties

| Property | Description |
|----------|-------------|
| `enabled` | Boolean - generates physical part if true |
| `depthPreset` | `FULL` / `HALF` / `CUSTOM` |
| `customDepth` | mm value when preset is CUSTOM |
| `materialId` | Optional, defaults to bodyMaterialId |

### Depth Calculation

| Preset | Calculation |
|--------|-------------|
| `FULL` | `cabinetDepth - 10mm` |
| `HALF` | `(cabinetDepth - 10mm) / 2` |
| `CUSTOM` | User value clamped to [50mm, 500mm] |

### Partition Count

- One partition per gap between children: `children.length - 1`
- Each can be individually enabled/disabled

---

## 5. Shelf Configuration

### Modes

| Mode | Description |
|------|-------------|
| `UNIFORM` | All shelves use same depth preset |
| `MANUAL` | Individual depth per shelf |

### Properties

| Property | Description |
|----------|-------------|
| `count` | Number of shelves (0-10) |
| `depthPreset` | `FULL` / `HALF` / `CUSTOM` |
| `customDepth` | mm for CUSTOM preset |
| `materialId` | Optional material override |

### Shelf Positioning

- First shelf at bottom of zone (0%)
- Additional shelves distributed proportionally upward
- Formula: `position = (shelfIndex / totalShelves) × 100%`

### Depth Calculation

| Preset | Calculation |
|--------|-------------|
| `FULL` | `cabinetDepth - 10mm` |
| `HALF` | `(cabinetDepth - 10mm) / 2` |
| `CUSTOM` | User value clamped to [50mm, 500mm] |

---

## 6. Drawer Configuration

### Drawer Zone System

Each drawer zone represents a vertical section with:
- `heightRatio`: Relative height to other zones
- `front`: External front (`{}`) or internal (`null`)
- `boxes`: Array of drawer boxes (drawer-in-drawer)
- `boxToFrontRatio`: Box height vs front height (0.1-1.0)
- `aboveBoxContent`: Shelves above drawer box

### Front Types

| Type | Description |
|------|-------------|
| External (`front: {}`) | Visible decorative panel with handle |
| Internal (`front: null`) | No visible front, for drawer-in-drawer |

### Box-to-Front Ratio

When `boxToFrontRatio < 1.0`:
- Drawer box is smaller than front panel
- Space above can contain shelves
- Range: 10% to 100%

### Slide Types

| Type | Side Offset | Depth Offset |
|------|-------------|--------------|
| `SIDE_MOUNT` | 13mm | 50mm |
| `UNDERMOUNT` | 21mm | 50mm |
| `BOTTOM_MOUNT` | 13mm | 50mm |
| `CENTER_MOUNT` | 0mm | 50mm |

### Drawer Dimensions

```
boxWidth = cabinetWidth - 2×bodyThickness - 2×slideOffset
boxDepth = cabinetDepth - depthOffset
boxSideHeight = max(zoneHeight × boxToFrontRatio - 30mm, 50mm)
```

---

## 7. Limits and Constraints

### Zone Limits

| Limit | Value |
|-------|-------|
| `MAX_ZONE_DEPTH` | 4 (depths 0, 1, 2, 3) |
| `MAX_CHILDREN_PER_ZONE` | 6 |
| `MAX_TOTAL_ZONES` | 20 |
| `MIN_ZONE_HEIGHT_MM` | 50mm |
| `MIN_ZONE_WIDTH_MM` | 100mm |

### Shelf Limits

| Limit | Value |
|-------|-------|
| `MAX_SHELVES_PER_ZONE` | 10 |
| `CUSTOM_SHELF_DEPTH_MIN` | 50mm |
| `CUSTOM_SHELF_DEPTH_MAX` | 500mm |

### Drawer Limits

| Limit | Value |
|-------|-------|
| `MAX_DRAWER_ZONES_PER_ZONE` | 8 |
| `MAX_BOXES_PER_DRAWER_ZONE` | 4 |
| `MAX_SHELVES_ABOVE_DRAWER` | 4 |

### Partition Limits

| Limit | Value |
|-------|-------|
| `PARTITION_DEPTH_MIN` | 50mm |
| `PARTITION_DEPTH_MAX` | 500mm |

---

## 8. Business Rules

### Zone Rules

1. Zone depth cannot exceed `MAX_ZONE_DEPTH - 1`
2. NESTED zones must have at least 1 child
3. Cannot add children beyond `MAX_CHILDREN_PER_ZONE`
4. Width config only applies to zones in VERTICAL parent

### Partition Rules

1. Created for both HORIZONTAL and VERTICAL divisions
2. Each partition defaults to `enabled: false`
3. When enabled, generates a physical divider panel
4. Partition count = `children.length - 1`

### Shelf Rules

1. Count must be 0-10
2. MANUAL mode requires matching shelves array
3. Positioning starts from bottom
4. Material defaults to bodyMaterialId if not specified

### Drawer Rules

1. Minimum 1 zone, maximum 8 zones
2. Each zone must have at least 1 box
3. Maximum 4 boxes per zone
4. `boxToFrontRatio` clamped to [0.1, 1.0]
5. Above-box shelves only when `boxToFrontRatio < 1`

---

## 9. Part Generation

### Generation Flow

1. Validate interior config tree
2. Calculate zone bounds recursively
3. For each leaf zone:
   - SHELVES: Generate shelf parts
   - DRAWERS: Generate drawer boxes and fronts
4. For each enabled partition:
   - Generate partition panel

### Generated Parts

| Zone Type | Generated Parts |
|-----------|-----------------|
| SHELVES | Shelf panels (horizontal) |
| DRAWERS | Box sides, front, back, bottom + external front |
| PARTITION | Vertical divider panel |

### Edge Banding

**Shelves:** Top (front), left, right edges banded

**Drawer boxes:** All 4 edges banded

**Partitions:** All 4 edges banded

---

## 10. Domain Modules

### Zone Module (`lib/domain/zone.ts`)

- `create()` - Create zone with content type
- `createNested()` - Create nested zone with children
- `distributeWidths()` - Calculate child widths
- `distributeHeights()` - Calculate child heights
- `calculateBounds()` - Recursive bounds calculation
- `validate()` - Validate zone configuration

### Shelf Module (`lib/domain/shelf.ts`)

- `createConfig()` - Create shelf configuration
- `calculateDepth()` - Calculate effective depth
- `calculatePositions()` - Calculate shelf positions
- `validate()` - Validate shelf config

### Drawer Module (`lib/domain/drawer.ts`)

- `createConfig()` - Create drawer configuration
- `calculateZoneBounds()` - Calculate zone positions
- `calculateBoxDimensions()` - Calculate box sizes
- `getFrontCount()` - Count external fronts
- `getTotalBoxCount()` - Count all boxes
- `validate()` - Validate drawer config

---

## 11. Type Hierarchy

```
InteriorZone
├── contentType: 'EMPTY' | 'SHELVES' | 'DRAWERS' | 'NESTED'
├── heightConfig: ZoneHeightConfig
├── widthConfig?: ZoneWidthConfig (VERTICAL parent only)
├── shelvesConfig?: ShelvesConfiguration
│   ├── mode: 'UNIFORM' | 'MANUAL'
│   ├── count, depthPreset, shelves[]
├── drawerConfig?: DrawerConfiguration
│   ├── zones: DrawerZone[]
│   │   ├── heightRatio, front, boxes[], boxToFrontRatio
│   │   └── aboveBoxContent.shelves[]
│   └── slideType
├── divisionDirection?: 'HORIZONTAL' | 'VERTICAL'
├── children?: InteriorZone[]
└── partitions?: PartitionConfig[]
    ├── enabled, depthPreset, customDepth
```

---

## 12. Files Reference

| File | Purpose |
|------|---------|
| `types/cabinetInterior.ts` | Zone, partition, shelf types |
| `types/drawer.ts` | Drawer types |
| `lib/config.ts` | Constants (INTERIOR_CONFIG, DRAWER_CONFIG) |
| `lib/domain/zone.ts` | Zone domain logic |
| `lib/domain/shelf.ts` | Shelf domain logic |
| `lib/domain/drawer.ts` | Drawer domain logic |
| `lib/cabinetGenerators/interior/` | Part generation |
| `components/ui/InteriorConfigDialog/` | UI components |
