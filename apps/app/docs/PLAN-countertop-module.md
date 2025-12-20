# Kitchen Countertop Module Implementation Plan

## Overview

This document outlines the implementation plan for a comprehensive kitchen countertop configuration module that integrates with the existing cabinet system. The module will enable users to:

1. Configure countertops for kitchen cabinets with automatic detection of adjacent cabinets
2. Support various layout types (I, L, U shapes) with proper connections
3. Configure edge banding for individual edges
4. Apply CNC operations (corner treatments, cutouts, holes)
5. Generate production-ready files for CNC manufacturing

## Architecture Decision

### Option A: Extend Cabinet Domain (Recommended)
Countertops as a property of cabinet groups with automatic generation based on adjacent cabinets.

**Pros:**
- Natural integration with cabinet workflow
- Automatic countertop updates when cabinets change
- Shared positioning/transform system
- UX: User configures cabinet → countertop follows automatically

**Cons:**
- Slightly more complex cabinet model

### Option B: Separate Countertop Entity
Countertops as independent entities that reference cabinets.

**Pros:**
- Clean separation of concerns
- Independent countertop editing

**Cons:**
- Manual synchronization with cabinets
- More complex UI for linking

### Decision: Hybrid Approach

We will use a **hybrid approach**:
1. **CountertopGroup** - A separate entity that tracks adjacent cabinets and their shared countertop
2. **CountertopConfig** - Configuration stored on individual cabinets (optional)
3. **Automatic Detection** - System automatically detects adjacent cabinets and suggests countertop groupings
4. **Manual Override** - User can manually adjust groups and configurations

---

## Domain Model

### 1. Core Types (`types/countertop.ts`)

```typescript
/**
 * Countertop layout types based on cabinet arrangement
 */
export type CountertopLayoutType =
  | 'STRAIGHT'     // Single straight countertop (I-shape)
  | 'L_SHAPE'      // Two countertops meeting at 90° (L-shape)
  | 'U_SHAPE'      // Three countertops forming U
  | 'ISLAND'       // Standalone island countertop
  | 'PENINSULA';   // Attached to wall on one end

/**
 * Joint connection types between countertop segments
 * Based on industry standards (Miter, Butt, European Miter)
 */
export type CountertopJointType =
  | 'MITER_45'          // 45° miter joint (most common)
  | 'BUTT'              // Straight butt joint
  | 'EUROPEAN_MITER'    // Hybrid: starts miter, ends butt
  | 'PUZZLE';           // Decorative puzzle joint (premium)

/**
 * Corner treatment options for CNC processing
 */
export type CornerTreatment =
  | 'STRAIGHT'          // Narożnik prosty - 90° corner
  | 'CHAMFER'           // Ścięcie pod kątem - angled cut
  | 'RADIUS'            // Zaokrąglenie - rounded corner
  | 'CLIP';             // Ścięcie narożnika - corner clip

/**
 * Edge banding options per edge
 */
export type EdgeBandingOption =
  | 'NONE'              // No edge banding
  | 'STANDARD'          // Standard edge banding (same material)
  | 'CONTRAST'          // Contrasting color
  | 'ABS_2MM'           // ABS 2mm
  | 'ABS_1MM'           // ABS 1mm
  | 'PVC';              // PVC edge

/**
 * CNC operation types for countertops
 */
export type CncOperationType =
  | 'RECTANGULAR_CUTOUT'    // Wcięcie prostokątne (sink, cooktop)
  | 'CIRCULAR_HOLE'         // Otwór okrągły (faucet, accessories)
  | 'RECTANGULAR_HOLE'      // Otwór prostokątny
  | 'EDGE_PROFILE'          // Profil krawędzi
  | 'DRAIN_GROOVE';         // Rowek ociekowy

/**
 * Single CNC operation definition
 */
export interface CncOperation {
  id: string;
  type: CncOperationType;
  // Position relative to countertop segment (mm from corner)
  position: {
    x: number;        // Distance from left edge
    y: number;        // Distance from front edge
  };
  // Dimensions based on operation type
  dimensions: {
    width?: number;   // For rectangular operations
    height?: number;  // For rectangular operations
    diameter?: number; // For circular holes
    depth?: number;   // Depth of cut (default: through)
    radius?: number;  // Corner radius for rectangular
  };
  // Additional parameters
  notes?: string;
}

/**
 * Corner configuration (6 possible corners in L-shape)
 */
export interface CornerConfig {
  id: string;                    // e.g., "corner_1", "corner_2"
  position: CornerPosition;      // Which corner (1-6 as in reference image)
  treatment: CornerTreatment;
  // Treatment-specific parameters
  chamferAngle?: number;         // For CHAMFER (default 45°)
  radius?: number;               // For RADIUS (mm)
  clipSize?: number;             // For CLIP (mm x mm)
}

/**
 * Corner positions (matching competitor reference)
 * Corners are numbered 1-6 for L-shape layouts
 */
export type CornerPosition = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Single countertop segment (one piece of material)
 */
export interface CountertopSegment {
  id: string;
  // Reference to cabinets this segment covers
  cabinetIds: string[];
  // Dimensions
  length: number;               // Długość (mm)
  width: number;                // Szerokość/głębokość (mm)
  thickness: number;            // Grubość (mm) - typically 28, 38, or 40
  // Overhang beyond cabinet edges
  overhang: {
    front: number;              // Default 30-50mm
    back: number;               // Usually 0 (against wall)
    left: number;               // Side overhang
    right: number;              // Side overhang
  };
  // Edge banding configuration (a, b, c, d as in reference)
  edgeBanding: {
    a: EdgeBandingOption;       // Edge A (as labeled in diagram)
    b: EdgeBandingOption;       // Edge B
    c: EdgeBandingOption;       // Edge C
    d: EdgeBandingOption;       // Edge D
  };
  // Grain direction (uslojenie)
  grainAlongLength: boolean;    // true = grain runs along length
  // CNC operations on this segment
  cncOperations: CncOperation[];
  // Notes for production
  notes?: string;
}

/**
 * Joint between two countertop segments
 */
export interface CountertopJoint {
  id: string;
  type: CountertopJointType;
  // IDs of segments being joined
  segmentA: string;
  segmentB: string;
  // Joint angle (90° for L-shape, 180° for straight extension)
  angle: number;
  // Hardware specification
  hardware: {
    type: 'MITER_BOLT' | 'FLIP_BOLT' | 'DOMINO' | 'BISCUIT';
    count: number;
  };
  // Notch depth for angled joints (głębokość wcięcia)
  notchDepth?: number;
}

/**
 * Complete countertop group (covers one or more adjacent cabinets)
 */
export interface CountertopGroup {
  id: string;
  name: string;
  furnitureId: string;
  // Layout type determined by cabinet arrangement
  layoutType: CountertopLayoutType;
  // Material for the countertop
  materialId: string;
  // All segments in this group
  segments: CountertopSegment[];
  // Joints between segments
  joints: CountertopJoint[];
  // Corner configurations
  corners: CornerConfig[];
  // Global thickness (can be overridden per segment)
  thickness: number;
  // Created/updated timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cabinet-level countertop configuration (optional override)
 */
export interface CabinetCountertopConfig {
  // Whether this cabinet should have a countertop
  hasCountertop: boolean;
  // Overhang overrides for this cabinet
  overhangOverride?: Partial<CountertopSegment['overhang']>;
  // Exclude from automatic grouping
  excludeFromGroup?: boolean;
  // Cutout presets for this cabinet (e.g., sink cabinet)
  cutoutPreset?: 'SINK' | 'COOKTOP' | 'NONE';
}
```

### 2. Domain Module (`lib/domain/countertop.ts`)

```typescript
export const CountertopDomain = {
  // ============ CREATORS ============

  /**
   * Create a new countertop segment from cabinet dimensions
   */
  createSegment: (
    cabinetIds: string[],
    dimensions: { length: number; width: number },
    options?: Partial<CountertopSegment>
  ): CountertopSegment => {...},

  /**
   * Create a countertop group from adjacent cabinets
   */
  createGroup: (
    cabinets: Cabinet[],
    materialId: string,
    options?: CountertopGroupOptions
  ): CountertopGroup => {...},

  /**
   * Create a CNC operation
   */
  createCncOperation: (
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation['dimensions']
  ): CncOperation => {...},

  /**
   * Create corner configuration
   */
  createCorner: (
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: Partial<CornerConfig>
  ): CornerConfig => {...},

  // ============ UPDATERS ============

  /**
   * Update segment dimensions
   */
  updateSegmentDimensions: (
    segment: CountertopSegment,
    dimensions: Partial<{ length: number; width: number; thickness: number }>
  ): CountertopSegment => {...},

  /**
   * Update edge banding for a segment
   */
  updateEdgeBanding: (
    segment: CountertopSegment,
    edge: 'a' | 'b' | 'c' | 'd',
    option: EdgeBandingOption
  ): CountertopSegment => {...},

  /**
   * Update overhang values
   */
  updateOverhang: (
    segment: CountertopSegment,
    overhang: Partial<CountertopSegment['overhang']>
  ): CountertopSegment => {...},

  /**
   * Add CNC operation to segment
   */
  addCncOperation: (
    segment: CountertopSegment,
    operation: CncOperation
  ): CountertopSegment => {...},

  /**
   * Update corner treatment
   */
  updateCorner: (
    group: CountertopGroup,
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: Partial<CornerConfig>
  ): CountertopGroup => {...},

  /**
   * Update joint type
   */
  updateJoint: (
    group: CountertopGroup,
    jointId: string,
    jointType: CountertopJointType
  ): CountertopGroup => {...},

  // ============ CALCULATORS ============

  /**
   * Detect adjacent cabinets that should share a countertop
   * Uses proximity detection (cabinets within threshold distance)
   */
  detectAdjacentCabinets: (
    cabinets: Cabinet[],
    parts: Part[],
    threshold?: number // Default 50mm
  ): Cabinet[][] => {...},

  /**
   * Determine layout type from cabinet positions
   */
  detectLayoutType: (
    cabinets: Cabinet[],
    parts: Part[]
  ): CountertopLayoutType => {...},

  /**
   * Calculate segment dimensions from cabinet group
   */
  calculateSegmentDimensions: (
    cabinets: Cabinet[],
    parts: Part[],
    overhang: CountertopSegment['overhang']
  ): { length: number; width: number } => {...},

  /**
   * Calculate corner positions for L/U shape layouts
   */
  calculateCornerPositions: (
    segments: CountertopSegment[],
    joints: CountertopJoint[]
  ): CornerPosition[] => {...},

  /**
   * Calculate total material area (for pricing)
   */
  calculateTotalArea: (group: CountertopGroup): number => {...},

  /**
   * Calculate edge length requiring banding
   */
  calculateEdgeBandingLength: (
    group: CountertopGroup,
    option: EdgeBandingOption
  ): number => {...},

  // ============ VALIDATORS ============

  /**
   * Validate segment configuration
   */
  validateSegment: (segment: CountertopSegment): ValidationResult => {...},

  /**
   * Validate group configuration
   */
  validateGroup: (group: CountertopGroup): ValidationResult => {...},

  /**
   * Validate CNC operation placement
   * (min distances from edges, joints, other operations)
   */
  validateCncOperation: (
    operation: CncOperation,
    segment: CountertopSegment,
    minEdgeDistance?: number
  ): ValidationResult => {...},

  // ============ GENERATORS ============

  /**
   * Generate 3D parts for countertop (for visualization)
   */
  generateParts: (group: CountertopGroup): GeneratedPart[] => {...},

  /**
   * Generate production data for CNC
   */
  generateProductionData: (group: CountertopGroup): CountertopProductionData => {...},

  /**
   * Generate CSV export for cutting list
   */
  generateCuttingList: (group: CountertopGroup): string => {...},
};
```

---

## Store Integration

### New Store Slice: `countertopSlice.ts`

```typescript
interface CountertopSlice {
  // State
  countertopGroups: CountertopGroup[];
  selectedCountertopGroupId: string | null;

  // Actions
  addCountertopGroup: (group: Omit<CountertopGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCountertopGroup: (id: string, patch: Partial<CountertopGroup>) => void;
  removeCountertopGroup: (id: string) => void;
  selectCountertopGroup: (id: string | null) => void;

  // Auto-generation
  generateCountertopsForFurniture: (furnitureId: string) => void;
  regenerateCountertopGroup: (groupId: string) => void;

  // Segment operations
  updateSegment: (groupId: string, segmentId: string, patch: Partial<CountertopSegment>) => void;
  addCncOperation: (groupId: string, segmentId: string, operation: Omit<CncOperation, 'id'>) => void;
  removeCncOperation: (groupId: string, segmentId: string, operationId: string) => void;

  // Corner operations
  updateCornerTreatment: (groupId: string, position: CornerPosition, treatment: CornerTreatment) => void;

  // Joint operations
  updateJointType: (groupId: string, jointId: string, type: CountertopJointType) => void;
}
```

### Cabinet Slice Extension

Add `countertopConfig` to cabinet params:

```typescript
interface CabinetBaseParams {
  // ... existing fields
  countertopConfig?: CabinetCountertopConfig;
}
```

---

## UI Components

### 1. Cabinet Creation Flow Integration

```
CabinetCreationWizard
├── Step 1: Type & Dimensions (existing)
├── Step 2: Interior Configuration (existing)
├── Step 3: Doors & Handles (existing)
└── Step 4: Countertop Configuration (NEW)
    ├── Toggle: "Dodaj blat" (Add countertop)
    ├── Material selector
    ├── Thickness selector (28/38/40mm)
    ├── Overhang inputs (front, back, left, right)
    └── Cutout preset (None/Sink/Cooktop)
```

### 2. Countertop Management Panel

```
CountertopPanel (sidebar tab)
├── CountertopGroupList
│   ├── Group preview card (mini diagram)
│   └── Group name, layout type badge
├── CountertopGroupEditor (when group selected)
│   ├── LayoutDiagram (interactive SVG)
│   │   ├── Segment outlines with labels (I, II, III)
│   │   ├── Dimension annotations (A, B, C, D edges)
│   │   ├── Corner markers (1-6)
│   │   └── CNC operation markers
│   ├── SegmentList (table format)
│   │   ├── Name | Długość | Szerokość | Uslojenie | Edges (a,b,c,d) | Notes
│   │   └── Row per segment
│   ├── CornerTreatmentGrid
│   │   └── 6 dropdowns for corner treatments
│   └── CncOperationsManager
│       ├── Operation list with edit/delete
│       └── Add operation button
└── AutoDetectButton
    └── "Wykryj połączone szafki" (Detect connected cabinets)
```

### 3. Interactive Layout Diagram Component

```typescript
// CountertopLayoutDiagram.tsx
// Visual representation matching competitor reference

interface Props {
  group: CountertopGroup;
  selectedSegmentId?: string;
  selectedCornerId?: CornerPosition;
  onSegmentSelect: (id: string) => void;
  onCornerSelect: (position: CornerPosition) => void;
  onCncOperationSelect: (operationId: string) => void;
}

// Features:
// - SVG-based schematic view (not 3D)
// - Edge labels (A, B, C, D)
// - Dimension annotations
// - Corner numbers (1-6)
// - Clickable regions for selection
// - CNC operation indicators
// - Drag handles for overhang adjustment
```

### 4. CNC Operation Modal

```
CncOperationModal
├── Operation Type Selector
│   ├── Rectangular Cutout (wcięcie prostokątne)
│   ├── Circular Hole (otwór okrągły)
│   └── Rectangular Hole (otwór prostokątny)
├── Position Inputs
│   ├── X position (from left edge)
│   └── Y position (from front edge)
├── Dimension Inputs (contextual)
│   ├── Width × Height (rectangular)
│   ├── Diameter (circular)
│   └── Corner radius (rectangular holes)
├── Preset Buttons
│   ├── Common sink sizes
│   ├── Common cooktop sizes
│   └── Standard faucet hole
└── Preview SVG
```

---

## 3D Visualization

### CountertopPart3D Component

```typescript
// Extends existing Part3D pattern
// Renders countertop segments with:
// - Proper material/texture
// - CNC cutouts as CSG operations
// - Edge banding visualization
// - Corner treatments
// - Positioned relative to cabinets
```

### Visual Features

1. **Material Rendering**: Use countertop-specific materials (laminate, solid surface, stone)
2. **CNC Cutouts**: Boolean subtraction for sink/cooktop openings
3. **Edge Profile**: Visual indication of edge banding type
4. **Joint Visualization**: Show joint lines between segments
5. **Overhang Display**: Clear visual of countertop extending beyond cabinets

---

## Automatic Detection Algorithm

### Adjacent Cabinet Detection

```typescript
/**
 * Algorithm for detecting adjacent cabinets that should share a countertop
 *
 * 1. Get all KITCHEN and CORNER cabinets in furniture
 * 2. Calculate bounding boxes for each cabinet
 * 3. For each cabinet pair:
 *    a. Check if they are within proximity threshold (default 50mm)
 *    b. Check if they are roughly aligned (same Y position ±tolerance)
 *    c. Check if countertop heights would match
 * 4. Build adjacency graph
 * 5. Find connected components (groups of adjacent cabinets)
 * 6. For each group, determine layout type (I, L, U)
 */

function detectAdjacentCabinets(
  cabinets: Cabinet[],
  parts: Part[],
  threshold: number = 50
): Cabinet[][] {
  // Filter to countertop-eligible cabinets
  const eligible = cabinets.filter(c =>
    c.type === 'KITCHEN' ||
    c.type === 'CORNER_INTERNAL' ||
    c.type === 'CORNER_EXTERNAL'
  );

  // Build adjacency graph
  const adjacency = new Map<string, Set<string>>();

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const boundsA = getCabinetBounds(eligible[i], parts);
      const boundsB = getCabinetBounds(eligible[j], parts);

      if (areAdjacent(boundsA, boundsB, threshold)) {
        // Add to adjacency graph
        if (!adjacency.has(eligible[i].id)) {
          adjacency.set(eligible[i].id, new Set());
        }
        if (!adjacency.has(eligible[j].id)) {
          adjacency.set(eligible[j].id, new Set());
        }
        adjacency.get(eligible[i].id)!.add(eligible[j].id);
        adjacency.get(eligible[j].id)!.add(eligible[i].id);
      }
    }
  }

  // Find connected components
  return findConnectedComponents(eligible, adjacency);
}
```

### Layout Type Detection

```typescript
/**
 * Determine layout type from cabinet arrangement
 *
 * STRAIGHT: All cabinets in a line
 * L_SHAPE: Cabinets form 90° angle
 * U_SHAPE: Cabinets form U (three sides)
 */

function detectLayoutType(cabinets: Cabinet[], parts: Part[]): CountertopLayoutType {
  if (cabinets.length === 1) return 'STRAIGHT';

  // Calculate centroid and principal directions
  const positions = cabinets.map(c => getCabinetCenter(c, parts));

  // Check for angle changes between consecutive cabinets
  const directions = calculateDirections(positions);
  const angleChanges = calculateAngleChanges(directions);

  const significantAngleCount = angleChanges.filter(a => Math.abs(a) > 45).length;

  if (significantAngleCount === 0) return 'STRAIGHT';
  if (significantAngleCount === 1) return 'L_SHAPE';
  if (significantAngleCount === 2) return 'U_SHAPE';

  return 'STRAIGHT'; // Default fallback
}
```

---

## Production File Generation

### CNC Output Format

```typescript
interface CountertopProductionData {
  // Summary
  orderDate: Date;
  customerRef: string;

  // Material specification
  material: {
    id: string;
    name: string;
    thickness: number;
    color?: string;
    decor?: string;
  };

  // Cut list (one entry per segment)
  cutList: Array<{
    segmentId: string;
    name: string;           // "Blat I", "Blat II"
    length: number;
    width: number;
    thickness: number;
    grainDirection: 'LENGTH' | 'WIDTH';
    quantity: 1;
  }>;

  // Edge banding list
  edgeBanding: Array<{
    segmentId: string;
    edge: 'a' | 'b' | 'c' | 'd';
    type: EdgeBandingOption;
    length: number;
  }>;

  // CNC operations (per segment)
  cncOperations: Array<{
    segmentId: string;
    operations: CncOperation[];
  }>;

  // Joint specifications
  joints: Array<{
    jointId: string;
    type: CountertopJointType;
    angle: number;
    hardware: CountertopJoint['hardware'];
    segmentAName: string;
    segmentBName: string;
  }>;

  // Corner treatments
  corners: Array<{
    position: CornerPosition;
    treatment: CornerTreatment;
    parameters: Record<string, number>;
  }>;
}
```

### Export Formats

1. **CSV Cutting List**: For traditional cutting optimization (primary)
2. **DXF**: For CNC machine import - optional, per segment (future enhancement)

---

## Implementation Phases

### Phase 1: Core Domain & Types (Week 1-2)
- [ ] Create `types/countertop.ts` with all type definitions
- [ ] Implement `lib/domain/countertop.ts` with core functions
- [ ] Add tests for domain functions
- [ ] Create `countertopSlice.ts` for state management

### Phase 2: Automatic Detection (Week 2-3)
- [ ] Implement adjacent cabinet detection algorithm
- [ ] Implement layout type detection
- [ ] Add cabinet proximity utilities to `group-bounds.ts`
- [ ] Integrate with cabinet creation flow

### Phase 3: UI Components (Week 3-4)
- [ ] Create `CountertopPanel` sidebar component
- [ ] Create `CountertopLayoutDiagram` SVG component
- [ ] Create `SegmentEditor` table component
- [ ] Create `CornerTreatmentSelector` component
- [ ] Create `CncOperationModal` component
- [ ] Integrate with cabinet creation wizard

### Phase 4: 3D Visualization (Week 4-5)
- [ ] Create `CountertopPart3D` component
- [ ] Implement CSG for CNC cutouts
- [ ] Add edge banding visualization
- [ ] Add joint line visualization
- [ ] Integrate with existing 3D scene

### Phase 5: Production Export (Week 5-6)
- [ ] Implement production data generator
- [ ] Create CSV export function (cutting list + edge banding + CNC operations)
- [ ] Add export UI to countertop panel
- [ ] (Optional) Create DXF export function for CNC machines

### Phase 6: Polish & Testing (Week 6)
- [ ] Add translations (i18n)
- [ ] User testing and UX refinements
- [ ] Performance optimization
- [ ] Documentation

---

## Configuration Constants

```typescript
// lib/config/countertop.ts

export const COUNTERTOP_DEFAULTS = {
  thickness: 38,                    // mm (common: 28, 38, 40)
  overhang: {
    front: 30,                      // mm
    back: 0,                        // mm (against wall)
    left: 0,                        // mm
    right: 0,                       // mm
  },
};

export const COUNTERTOP_LIMITS = {
  thickness: { min: 18, max: 60 },
  length: { min: 100, max: 4100 },  // Max standard panel length
  width: { min: 100, max: 1200 },   // Max standard panel width
  overhang: { min: 0, max: 100 },
};

export const CNC_OPERATION_LIMITS = {
  minEdgeDistance: 50,              // mm from edge
  minJointDistance: 100,            // mm from joint
  minOperationSpacing: 50,          // mm between operations
};

export const JOINT_HARDWARE_PRESETS = {
  MITER_45: { type: 'MITER_BOLT', count: 2 },
  BUTT: { type: 'FLIP_BOLT', count: 3 },
  EUROPEAN_MITER: { type: 'MITER_BOLT', count: 2 },
  PUZZLE: { type: 'DOMINO', count: 4 },
};

export const CUTOUT_PRESETS = {
  SINK_STANDARD: { width: 780, height: 480, radius: 10 },
  SINK_SMALL: { width: 580, height: 430, radius: 10 },
  COOKTOP_60: { width: 560, height: 490, radius: 5 },
  COOKTOP_80: { width: 760, height: 520, radius: 5 },
  FAUCET_HOLE: { diameter: 35 },
  SOAP_DISPENSER: { diameter: 28 },
};
```

---

## UX Considerations

### 1. Automatic vs Manual Mode

**Automatic Mode (Default)**:
- System detects adjacent cabinets
- Auto-generates countertop groups
- User refines configuration

**Manual Mode**:
- User explicitly adds countertops
- Full control over grouping
- For complex layouts

### 2. Visual Feedback

- **Adjacency Highlighting**: When placing cabinets, highlight which existing cabinets would be grouped
- **Preview**: Show countertop preview before confirming
- **Validation Warnings**: Visual indicators for issues (overlapping operations, edge distance)

### 3. Quick Actions

- **Apply to All**: Apply edge banding/treatment to all edges
- **Mirror**: Mirror configuration for symmetrical layouts
- **Presets**: Quick apply common configurations (standard L-shape kitchen)

### 4. Error Prevention

- Prevent CNC operations too close to edges/joints
- Warn when countertop extends beyond cabinet
- Validate joint compatibility with material thickness

---

## Related Files to Modify

### New Files
- `apps/app/src/types/countertop.ts`
- `apps/app/src/lib/domain/countertop.ts`
- `apps/app/src/lib/domain/countertop.test.ts`
- `apps/app/src/lib/store/slices/countertopSlice.ts`
- `apps/app/src/lib/config/countertop.ts`
- `apps/app/src/components/panels/CountertopPanel.tsx`
- `apps/app/src/components/countertop/CountertopLayoutDiagram.tsx`
- `apps/app/src/components/countertop/SegmentEditor.tsx`
- `apps/app/src/components/countertop/CornerTreatmentSelector.tsx`
- `apps/app/src/components/countertop/CncOperationModal.tsx`
- `apps/app/src/components/canvas/CountertopPart3D.tsx`

### Modified Files
- `apps/app/src/types/index.ts` - Export countertop types
- `apps/app/src/types/cabinet.ts` - Add countertopConfig to CabinetBaseParams
- `apps/app/src/lib/store/index.ts` - Add countertop slice
- `apps/app/src/lib/domain/index.ts` - Export CountertopDomain
- `apps/app/src/lib/csv.ts` - Add countertop export support
- `apps/app/src/components/panels/index.ts` - Add CountertopPanel export
- `apps/app/src/components/canvas/Scene.tsx` - Add countertop rendering

---

## References

### Industry Standards
- [Miter Joint Countertops](https://www.devoswoodworking.com/designing-wood-countertops/joints.html)
- [European Miter vs Butt Joint](https://quickquotecountertops.com/tips-tricks-assembled-miters-and-inside-diagonals/)
- [CNC Countertop Processing](https://www.swiatplyt.pl/uslugi-cnc/)

### Competitor Analysis
- [Nero Computing System - Countertop Creator](https://wiki.ncsit.pl/kreator-blatow-kuchennych-konfiguracja/)
- [IKEA Countertop Configurator](https://www.ikea.com/pl/pl/planners/custom-worktop-calculator/)
- [Formyca Countertop Configurator](https://formyca.pl/pl/i/Konfigurator-blatow-kuchennych/33)
