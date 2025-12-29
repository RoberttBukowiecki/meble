# Countertop 2D Editor - Implementation Plan

## Overview

This document outlines the implementation plan for missing countertop features, primarily the interactive 2D layout diagram editor and enhanced CNC operation UI.

## Current State

### Already Implemented

**Core functionality:**

- Core types and domain logic (`types/countertop.ts`)
- Store with all CRUD operations (`countertopSlice.ts`)
- Basic CountertopPanel with SegmentTable
- CornerTreatmentSection (dropdowns)
- CncOperationsSection (basic list + preset dialog)
- CountertopPart3D (3D visualization with cutouts)
- Auto-detection of adjacent cabinets
- CSV export

**Gap detection and handling (recently added):**

- `CabinetGap` and `CabinetGapMode` types (`BRIDGE` | `SPLIT`)
- `detectGapsInCabinets()` - detects gaps between cabinets
- `getCabinetGapInfo()` - returns gap distance and axis
- `CABINET_GAP_CONFIG` with configurable thresholds:
  - `TOUCH_THRESHOLD`: 5mm (considered touching)
  - `AUTO_SPLIT_THRESHOLD`: 200mm (auto-split if gap > this)
  - `MAX_BRIDGE_GAP`: 500mm (max gap that can be bridged)
- Gap mode preservation via `existingGaps` parameter
- `updateGapMode()` store action

**Direction change detection (recently added):**

- `findDirectionChangeIndices()` - detects where cabinet direction changes >45°
- Support for `CORNER_INTERNAL` and `CORNER_EXTERNAL` cabinet types
- Automatic segment splitting at direction change points
- Proper L-shape and U-shape segment generation

### Missing Features

1. **CountertopLayoutDiagram** - Interactive 2D SVG editor
2. **Enhanced CncOperationModal** - Visual position picker
3. **Joint Type Selector UI** - Choose between MITER_45, BUTT, etc.
4. **Gap Mode UI** - Toggle between BRIDGE/SPLIT in 2D diagram
5. **Visual dimension editing** - Drag handles for overhang
6. **DXF Export** (optional, future)

---

## Feature 1: CountertopLayoutDiagram

### Description

Interactive SVG-based 2D schematic view of the countertop layout. Not a 3D view - a clean, technical diagram similar to what CNC software uses.

### Visual Reference

#### STRAIGHT Layout (single segment)

```
┌─────────────────────────────────────────┐
│  BLAT I                                 │
│  ┌─────────────────────────────────┐    │
│  │    ┌─────────┐                  │ A  │
│  │    │ SINK    │                  │    │
│  │ D  │ CUTOUT  │               B  │    │
│  │    └─────────┘                  │    │
│  │              C                  │    │
│  └─────────────────────────────────┘    │
│  1200 x 600 mm                          │
│                                         │
│  ○ Corner 1    ○ Corner 2               │
│  ○ Corner 3    ○ Corner 4               │
└─────────────────────────────────────────┘
```

#### L-SHAPE Layout (two segments with miter joint)

```
                    ┌──────────────┐
                    │   BLAT II    │
                    │      B       │
              ╱─────┼──────────────┤
           ╱        │              │ 6
        ╱     JOINT │     5        │
    ┌──╱    (45° miter)            │
    │ A             │              │
    │               │   ┌──────┐   │
    │    BLAT I     │   │COOKTOP   │
    │               │   └──────┘   │
    │ 1      C      │              │ 2
    └───────────────┴──────────────┘
      3       D            4

    JOINT DETAIL (45° miter):
    ══════════╲
               ╲
                ╲══════════
```

#### U-SHAPE Layout (three segments)

```
    ┌────────────┬────────────────────┬────────────┐
    │  BLAT III  │                    │  BLAT II   │
    │     ╲      │                    │      ╱     │
    │      ╲ JOINT 2            JOINT 1 ╱          │
    │       ╲    │                    │╱           │
    ├────────────┤                    ├────────────┤
    │            │                    │            │
    │            │      BLAT I        │            │
    │            │                    │            │
    └────────────┴────────────────────┴────────────┘
```

### Component Structure

```
CountertopLayoutDiagram/
├── CountertopLayoutDiagram.tsx    # Main container
├── SegmentShape.tsx               # Single segment polygon (with miter cuts)
├── EdgeLabel.tsx                  # A, B, C, D labels
├── CornerMarker.tsx               # Numbered corner circles
├── CncOperationMarker.tsx         # Cutout/hole indicators
├── DimensionAnnotation.tsx        # Length/width labels
├── JointLine.tsx                  # Joint between segments (miter, butt, etc.)
├── JointDetailPopover.tsx         # Popover showing joint type details
├── MiterCutPath.tsx               # SVG path for 45° miter cut visualization
├── GapIndicator.tsx               # Gap between cabinets (BRIDGE/SPLIT toggle)
├── GapModePopover.tsx             # Popover for changing gap mode
└── types.ts                       # Local types
```

---

## Feature 1b: Joint & Miter Cut Visualization

### Joint Types Visualization

The diagram must clearly show how segments connect, especially for L-shape and U-shape layouts.

#### 1. MITER_45 (45° Miter Joint)

Most common for L-shape countertops. Both segments are cut at 45°.

```
Segment I                 Segment II
┌────────────────╲        ╱────────────┐
│                 ╲      ╱             │
│                  ╲    ╱              │
│                   ╲  ╱               │
│                    ╲╱                │
│                    ╱╲                │
│                   ╱  ╲               │
│                  ╱    ╲              │
└─────────────────╱      ╲─────────────┘

SVG Implementation:
- Each segment is a polygon, NOT a rectangle
- The miter cut is part of the segment's path
```

#### 2. BUTT Joint (Straight)

One segment butts against the side of another.

```
Segment I
┌─────────────────────────┐
│                         │
│                         ├────────────┐
│                         │ Segment II │
│                         │            │
│                         ├────────────┘
│                         │
└─────────────────────────┘
```

#### 3. EUROPEAN_MITER

Hybrid - starts as miter, ends as butt. Common in Europe.

```
Segment I
┌────────────────╲
│                 ╲────────────┐
│                              │ Segment II
│                              │
│                 ╱────────────┘
└────────────────╱
```

### Segment Shape with Miter Cut

```typescript
interface SegmentShapeProps {
  segment: CountertopSegment;
  index: number;
  group: CountertopGroup;
  isSelected: boolean;
  onSelect: () => void;
}

function SegmentShape({ segment, index, group, isSelected, onSelect }: SegmentShapeProps) {
  // Calculate polygon points based on:
  // 1. Base rectangle (length x width)
  // 2. Joint cuts at connection points
  // 3. Corner treatments

  const polygonPoints = useMemo(() => {
    const points: [number, number][] = [];
    const { length, width } = segment;

    // Find joints that affect this segment
    const jointsForSegment = group.joints.filter(
      j => j.segmentAId === segment.id || j.segmentBId === segment.id
    );

    // Start with basic rectangle corners
    // Modify corners based on joint type and position

    if (jointsForSegment.length === 0) {
      // Simple rectangle
      return [
        [0, 0],
        [length, 0],
        [length, width],
        [0, width],
      ];
    }

    // For L-shape with MITER_45
    const joint = jointsForSegment[0];
    const isSegmentA = joint.segmentAId === segment.id;
    const miterDepth = joint.notchDepth ?? 650; // Standard miter notch

    if (joint.type === 'MITER_45') {
      if (isSegmentA) {
        // Segment A: miter cut on right side
        return [
          [0, 0],
          [length, 0],
          [length - miterDepth, width], // Miter cut
          [0, width],
        ];
      } else {
        // Segment B: miter cut on bottom
        return [
          [miterDepth, 0], // Miter cut start
          [length, 0],
          [length, width],
          [0, width],
        ];
      }
    }

    // ... handle other joint types

    return points;
  }, [segment, group.joints]);

  return (
    <polygon
      points={polygonPoints.map(p => p.join(',')).join(' ')}
      className={cn(
        'fill-muted stroke-border stroke-2 cursor-pointer transition-colors',
        isSelected && 'fill-primary/10 stroke-primary'
      )}
      onClick={onSelect}
    />
  );
}
```

### Joint Line Component

```typescript
interface JointLineProps {
  joint: CountertopJoint;
  segments: CountertopSegment[];
  isSelected: boolean;
  onSelect: () => void;
}

function JointLine({ joint, segments, isSelected, onSelect }: JointLineProps) {
  const segmentA = segments.find(s => s.id === joint.segmentAId);
  const segmentB = segments.find(s => s.id === joint.segmentBId);

  if (!segmentA || !segmentB) return null;

  // Calculate joint line position based on segment positions
  const jointPath = calculateJointPath(joint, segmentA, segmentB);

  return (
    <g className="cursor-pointer" onClick={onSelect}>
      {/* Joint line */}
      <path
        d={jointPath}
        className={cn(
          'fill-none stroke-2',
          isSelected ? 'stroke-primary' : 'stroke-amber-500',
          joint.type === 'MITER_45' && 'stroke-dasharray-none',
          joint.type === 'BUTT' && 'stroke-dasharray-4'
        )}
      />

      {/* Joint type indicator icon */}
      <JointTypeIcon
        type={joint.type}
        position={getJointMidpoint(jointPath)}
        size={16}
      />

      {/* Hardware count badge */}
      <circle
        cx={...}
        cy={...}
        r={8}
        className="fill-background stroke-border"
      />
      <text className="text-[8px] fill-foreground">
        {joint.hardware.count}×
      </text>
    </g>
  );
}
```

### Miter Cut Calculation

```typescript
/**
 * Calculate miter cut geometry for L-shape joints
 *
 * Standard miter notch depth is 650mm from corner
 * This creates a 45° cut that allows segments to meet cleanly
 */
function calculateMiterCut(
  segmentLength: number,
  segmentWidth: number,
  jointPosition: "start" | "end",
  jointType: CountertopJointType
): MiterCutGeometry {
  const notchDepth = 650; // Standard value, could be configurable

  if (jointType === "MITER_45") {
    // 45° miter: cut goes from corner at 45° angle
    // Cut depth = segment width (so it spans full depth)
    return {
      type: "miter45",
      startPoint: jointPosition === "end" ? { x: segmentLength, y: 0 } : { x: 0, y: 0 },
      endPoint:
        jointPosition === "end"
          ? { x: segmentLength - segmentWidth, y: segmentWidth }
          : { x: segmentWidth, y: segmentWidth },
      notchDepth,
    };
  }

  if (jointType === "BUTT") {
    // Butt joint: no cut on this segment, straight edge
    return {
      type: "butt",
      startPoint: { x: segmentLength, y: 0 },
      endPoint: { x: segmentLength, y: segmentWidth },
      notchDepth: 0,
    };
  }

  if (jointType === "EUROPEAN_MITER") {
    // European miter: angled at top, straight at bottom
    return {
      type: "european",
      startPoint: { x: segmentLength, y: 0 },
      midPoint: { x: segmentLength - notchDepth / 2, y: segmentWidth / 2 },
      endPoint: { x: segmentLength - notchDepth, y: segmentWidth },
      notchDepth,
    };
  }

  // PUZZLE joint would require more complex path
  return { type: "straight" };
}
```

### Visual Indicators for Joints

```typescript
const JOINT_VISUAL_CONFIG = {
  MITER_45: {
    lineStyle: "solid",
    color: "hsl(var(--amber-500))",
    icon: "miter-45-icon",
    label: "Uciosowe 45°",
    description: "Oba blaty ścięte pod kątem 45°",
  },
  BUTT: {
    lineStyle: "dashed",
    color: "hsl(var(--blue-500))",
    icon: "butt-joint-icon",
    label: "Czołowe",
    description: "Prosty styk blatów",
  },
  EUROPEAN_MITER: {
    lineStyle: "dotted",
    color: "hsl(var(--green-500))",
    icon: "euro-miter-icon",
    label: "Europejskie",
    description: "Hybrydowe: ucios + czołowe",
  },
  PUZZLE: {
    lineStyle: "solid",
    color: "hsl(var(--purple-500))",
    icon: "puzzle-icon",
    label: "Puzzle",
    description: "Dekoracyjne połączenie",
  },
};
```

---

## Feature 1c: CNC Cutout Visualization

### Cutout Types on Diagram

Each CNC operation is visualized on the segment with appropriate shape and style:

#### Rectangular Cutouts (Sinks, Cooktops)

```
┌─────────────────────────────────────┐
│                                     │
│    ┌───────────────────┐            │
│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│            │
│    │▓▓  SINK 780×480 ▓▓│            │
│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│            │
│    └───────────────────┘            │
│                                     │
└─────────────────────────────────────┘

- Filled with semi-transparent pattern
- Dashed stroke
- Corner radius visible
- Label with dimensions
- Drag handle for repositioning
```

#### Circular Holes (Faucet, Accessories)

```
┌─────────────────────────────────────┐
│                                     │
│         ●────── Ø35mm               │
│        (○)                          │
│                                     │
└─────────────────────────────────────┘

- Small filled circle
- Diameter annotation
- Click to select/move
```

### CncOperationMarker Component

```typescript
interface CncOperationMarkerProps {
  operation: CncOperation;
  segmentTransform: { x: number; y: number; rotation: number };
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDrag?: (newPosition: { x: number; y: number }) => void;
  onDragEnd?: () => void;
}

function CncOperationMarker({
  operation,
  segmentTransform,
  isSelected,
  isDragging,
  onSelect,
  onDrag,
}: CncOperationMarkerProps) {
  const { position, dimensions, type, preset } = operation;

  // Transform position to diagram coordinates
  const diagramPos = transformToSegmentSpace(position, segmentTransform);

  if (type === 'RECTANGULAR_CUTOUT') {
    const { width, height, radius = 10 } = dimensions;

    return (
      <g
        transform={`translate(${diagramPos.x - width/2}, ${diagramPos.y - height/2})`}
        className={cn(
          'cursor-move',
          isSelected && 'filter drop-shadow-md'
        )}
        onClick={onSelect}
      >
        {/* Cutout shape with rounded corners */}
        <rect
          width={width}
          height={height}
          rx={radius}
          ry={radius}
          className={cn(
            'stroke-2 stroke-dashed',
            isSelected
              ? 'fill-destructive/30 stroke-destructive'
              : 'fill-destructive/10 stroke-destructive/50'
          )}
        />

        {/* Hatch pattern for cutout area */}
        <rect
          width={width}
          height={height}
          rx={radius}
          ry={radius}
          fill="url(#cutout-hatch-pattern)"
          className="pointer-events-none"
        />

        {/* Label */}
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] fill-destructive font-medium pointer-events-none"
        >
          {preset || `${width}×${height}`}
        </text>

        {/* Drag handle (visible when selected) */}
        {isSelected && (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={8}
            className="fill-destructive stroke-white stroke-2 cursor-grab"
          />
        )}
      </g>
    );
  }

  if (type === 'CIRCULAR_HOLE') {
    const { diameter } = dimensions;
    const r = diameter / 2;

    return (
      <g
        transform={`translate(${diagramPos.x}, ${diagramPos.y})`}
        className="cursor-move"
        onClick={onSelect}
      >
        {/* Hole circle */}
        <circle
          r={r}
          className={cn(
            'stroke-2',
            isSelected
              ? 'fill-primary/30 stroke-primary'
              : 'fill-primary/10 stroke-primary/50'
          )}
        />

        {/* Center dot */}
        <circle r={2} className="fill-primary" />

        {/* Diameter annotation */}
        <text
          x={r + 5}
          y={0}
          dominantBaseline="middle"
          className="text-[8px] fill-primary"
        >
          Ø{diameter}
        </text>
      </g>
    );
  }

  return null;
}
```

### SVG Pattern Definitions

```typescript
function DiagramPatternDefs() {
  return (
    <defs>
      {/* Hatch pattern for cutouts */}
      <pattern
        id="cutout-hatch-pattern"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line
          x1="0" y1="0"
          x2="0" y2="8"
          stroke="hsl(var(--destructive))"
          strokeWidth="1"
          strokeOpacity="0.3"
        />
      </pattern>

      {/* Grid pattern for background */}
      <pattern
        id="grid-pattern"
        patternUnits="userSpaceOnUse"
        width="50"
        height="50"
      >
        <path
          d="M 50 0 L 0 0 0 50"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          strokeOpacity="0.5"
        />
      </pattern>
    </defs>
  );
}
```

### Cutout Interaction States

```typescript
const CUTOUT_STATES = {
  default: {
    fill: "hsl(var(--destructive) / 0.1)",
    stroke: "hsl(var(--destructive) / 0.5)",
    strokeWidth: 2,
    strokeDasharray: "4 4",
  },
  hover: {
    fill: "hsl(var(--destructive) / 0.2)",
    stroke: "hsl(var(--destructive))",
    strokeWidth: 2,
    strokeDasharray: "4 4",
  },
  selected: {
    fill: "hsl(var(--destructive) / 0.3)",
    stroke: "hsl(var(--destructive))",
    strokeWidth: 3,
    strokeDasharray: "none",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
  },
  dragging: {
    fill: "hsl(var(--destructive) / 0.4)",
    stroke: "hsl(var(--destructive))",
    strokeWidth: 3,
    strokeDasharray: "none",
    opacity: 0.8,
  },
  invalid: {
    fill: "hsl(var(--destructive) / 0.5)",
    stroke: "hsl(var(--destructive))",
    strokeWidth: 3,
    strokeDasharray: "none",
    animation: "pulse 1s infinite",
  },
};
```

### Edge Distance Visualization

When cutout is selected or being dragged, show distance from edges:

```typescript
function EdgeDistanceIndicators({
  operation,
  segment,
}: {
  operation: CncOperation;
  segment: CountertopSegment;
}) {
  const { x, y } = operation.position;
  const width = operation.dimensions.width ?? operation.dimensions.diameter ?? 0;
  const height = operation.dimensions.height ?? operation.dimensions.diameter ?? 0;

  const leftDist = x - width / 2;
  const rightDist = segment.length - x - width / 2;
  const frontDist = y - height / 2;
  const backDist = segment.width - y - height / 2;

  const minDist = 50;
  const isValid = (dist: number) => dist >= minDist;

  return (
    <g className="pointer-events-none">
      {/* Left distance line */}
      <DistanceLine
        from={{ x: 0, y }}
        to={{ x: x - width/2, y }}
        value={leftDist}
        isValid={isValid(leftDist)}
        position="left"
      />

      {/* Right distance line */}
      <DistanceLine
        from={{ x: x + width/2, y }}
        to={{ x: segment.length, y }}
        value={rightDist}
        isValid={isValid(rightDist)}
        position="right"
      />

      {/* Front distance line */}
      <DistanceLine
        from={{ x, y: segment.width }}
        to={{ x, y: y + height/2 }}
        value={frontDist}
        isValid={isValid(frontDist)}
        position="bottom"
      />

      {/* Back distance line */}
      <DistanceLine
        from={{ x, y: 0 }}
        to={{ x, y: y - height/2 }}
        value={backDist}
        isValid={isValid(backDist)}
        position="top"
      />
    </g>
  );
}

function DistanceLine({
  from,
  to,
  value,
  isValid,
  position,
}: DistanceLineProps) {
  return (
    <g>
      {/* Line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        className={cn(
          'stroke-1',
          isValid ? 'stroke-muted-foreground' : 'stroke-destructive'
        )}
        strokeDasharray="2 2"
      />

      {/* Value label */}
      <text
        x={(from.x + to.x) / 2}
        y={(from.y + to.y) / 2}
        className={cn(
          'text-[8px]',
          isValid ? 'fill-muted-foreground' : 'fill-destructive font-bold'
        )}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {Math.round(value)}mm
        {!isValid && ' ⚠️'}
      </text>
    </g>
  );
}
```

---

## Feature 1d: Gap Mode UI

### Description

When cabinets have gaps between them, users need to decide whether the countertop should:

- **BRIDGE**: Single countertop spans over the gap (empty space underneath)
- **SPLIT**: Separate countertops for cabinets on each side of the gap

This UI allows users to toggle the gap mode visually in the 2D diagram.

### Visual Reference

```
BRIDGE Mode (default for gaps < 200mm):
┌─────────────┐   ┌─────────────┐
│  Cabinet A  │◄──►│  Cabinet B  │
└─────────────┘ 80mm └─────────────┘
        ↓                ↓
┌─────────────────────────────────┐
│      Single Countertop          │  ← Countertop bridges the gap
│      (with unsupported area)    │
└─────────────────────────────────┘

SPLIT Mode (default for gaps > 200mm):
┌─────────────┐       ┌─────────────┐
│  Cabinet A  │       │  Cabinet B  │
└─────────────┘ 300mm └─────────────┘
        ↓                   ↓
┌─────────────┐       ┌─────────────┐
│ Countertop I│       │Countertop II│  ← Separate countertops
└─────────────┘       └─────────────┘
```

### Gap Indicator Component

```typescript
interface GapIndicatorProps {
  gap: CabinetGap;
  isSelected: boolean;
  onSelect: () => void;
  onModeChange: (mode: CabinetGapMode) => void;
}

function GapIndicator({
  gap,
  isSelected,
  onSelect,
  onModeChange,
}: GapIndicatorProps) {
  const isBridge = gap.mode === "BRIDGE";

  return (
    <g
      className={cn("cursor-pointer", isSelected && "filter drop-shadow-md")}
      onClick={onSelect}
    >
      {/* Gap area visualization */}
      <rect
        x={gap.position.x}
        y={gap.position.y}
        width={gap.distance}
        height={gap.axis === "X" ? segmentWidth : gap.distance}
        className={cn(
          "stroke-2 stroke-dashed",
          isBridge
            ? "fill-amber-100/50 stroke-amber-500"
            : "fill-destructive/20 stroke-destructive"
        )}
      />

      {/* Gap distance label */}
      <text
        x={gap.position.x + gap.distance / 2}
        y={gap.position.y + 10}
        textAnchor="middle"
        className="text-[10px] fill-muted-foreground"
      >
        {gap.distance}mm
      </text>

      {/* Mode indicator icon */}
      <g transform={`translate(${gap.position.x + gap.distance / 2}, ${gap.position.y + 30})`}>
        {isBridge ? (
          <BridgeIcon className="h-4 w-4 text-amber-500" />
        ) : (
          <SplitIcon className="h-4 w-4 text-destructive" />
        )}
      </g>

      {/* Click area for mode toggle */}
      {isSelected && (
        <GapModePopover gap={gap} onModeChange={onModeChange} />
      )}
    </g>
  );
}
```

### Gap Mode Popover

```typescript
function GapModePopover({
  gap,
  onModeChange,
}: {
  gap: CabinetGap;
  onModeChange: (mode: CabinetGapMode) => void;
}) {
  return (
    <Popover>
      <PopoverContent className="w-56">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Obsługa przerwy</h4>
          <p className="text-xs text-muted-foreground">
            Odległość: {gap.distance}mm
          </p>

          <RadioGroup
            value={gap.mode}
            onValueChange={(value) => onModeChange(value as CabinetGapMode)}
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="BRIDGE" id="bridge" />
              <div>
                <Label htmlFor="bridge" className="text-sm">Mostek</Label>
                <p className="text-xs text-muted-foreground">
                  Jeden blat przechodzi nad przerwą
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <RadioGroupItem value="SPLIT" id="split" />
              <div>
                <Label htmlFor="split" className="text-sm">Podział</Label>
                <p className="text-xs text-muted-foreground">
                  Osobne blaty po obu stronach
                </p>
              </div>
            </div>
          </RadioGroup>

          {gap.distance > 200 && gap.mode === "BRIDGE" && (
            <Alert variant="warning" className="text-xs">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription>
                Duża przerwa ({gap.distance}mm) może wymagać dodatkowego wsparcia
              </AlertDescription>
            </Alert>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Gap Visual Styles

```typescript
const GAP_STYLES = {
  BRIDGE: {
    fill: "hsl(var(--amber-100) / 0.5)",
    stroke: "hsl(var(--amber-500))",
    strokeDasharray: "4 4",
    icon: "bridge-icon",
    label: "Mostek",
    description: "Blat przechodzi nad przerwą",
  },
  SPLIT: {
    fill: "hsl(var(--destructive) / 0.2)",
    stroke: "hsl(var(--destructive))",
    strokeDasharray: "8 4",
    icon: "split-icon",
    label: "Podział",
    description: "Osobne blaty",
  },
};

const GAP_THRESHOLDS = {
  TOUCH: 5, // Gaps ≤5mm are ignored (touching)
  AUTO_SPLIT: 200, // Gaps >200mm default to SPLIT
  MAX_BRIDGE: 500, // Gaps >500mm cannot be bridged
};
```

---

### Interactive Joint Editing

When user clicks on a joint line:

```typescript
function JointDetailPopover({ joint, onUpdate }: JointDetailPopoverProps) {
  return (
    <Popover>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <h4 className="font-medium">Połączenie blatów</h4>

          {/* Joint type selector */}
          <div className="space-y-1">
            <Label className="text-xs">Typ połączenia</Label>
            <Select
              value={joint.type}
              onValueChange={(type) => onUpdate({ type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JOINT_VISUAL_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <JointIcon type={type} />
                      <div>
                        <div>{config.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hardware */}
          <div className="space-y-1">
            <Label className="text-xs">Okucia</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {joint.hardware.count}× {joint.hardware.type}
              </Badge>
            </div>
          </div>

          {/* Miter notch depth (for miter joints) */}
          {(joint.type === 'MITER_45' || joint.type === 'EUROPEAN_MITER') && (
            <div className="space-y-1">
              <Label className="text-xs">Głębokość wcięcia (mm)</Label>
              <NumberInput
                value={joint.notchDepth ?? 650}
                onChange={(val) => onUpdate({ notchDepth: val })}
                min={400}
                max={900}
                step={50}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Props Interface

```typescript
interface CountertopLayoutDiagramProps {
  group: CountertopGroup;

  // Selection state
  selectedSegmentId?: string;
  selectedCornerId?: CornerPosition;
  selectedCncOperationId?: string;

  // Interaction callbacks
  onSegmentSelect?: (segmentId: string) => void;
  onCornerSelect?: (position: CornerPosition) => void;
  onCncOperationSelect?: (operationId: string) => void;
  onCncOperationAdd?: (segmentId: string, position: { x: number; y: number }) => void;

  // Display options
  showDimensions?: boolean;
  showEdgeLabels?: boolean;
  showCornerNumbers?: boolean;
  showCncOperations?: boolean;
  interactive?: boolean;

  // Size
  width?: number;
  height?: number;
}
```

### Implementation Details

#### 1. Coordinate System

- SVG viewBox calculated from segment dimensions
- Padding for labels and annotations
- Scale factor to fit container while maintaining aspect ratio

```typescript
function calculateViewBox(group: CountertopGroup): ViewBox {
  // Get bounding box of all segments
  const allSegments = group.segments;

  // For L-shape: segments overlap at corner
  // Calculate combined bounds based on layout type

  const padding = 80; // For labels
  return {
    x: -padding,
    y: -padding,
    width: totalWidth + padding * 2,
    height: totalHeight + padding * 2,
  };
}
```

#### 2. Segment Positioning for L-Shape

```typescript
function getSegmentTransform(
  segment: CountertopSegment,
  index: number,
  layoutType: CountertopLayoutType,
  allSegments: CountertopSegment[]
): { x: number; y: number; rotation: number } {
  if (layoutType === "STRAIGHT") {
    return { x: 0, y: 0, rotation: 0 };
  }

  if (layoutType === "L_SHAPE") {
    if (index === 0) {
      // First segment horizontal
      return { x: 0, y: 0, rotation: 0 };
    } else {
      // Second segment vertical, starting from end of first
      const firstSegment = allSegments[0];
      return {
        x: firstSegment.length - segment.width, // Overlap at corner
        y: -segment.length + firstSegment.width,
        rotation: 90,
      };
    }
  }

  // ... U_SHAPE logic
}
```

#### 3. Edge Labeling Convention

```
For horizontal segment:
- A = back edge (top in SVG)
- B = right edge
- C = front edge (bottom in SVG)
- D = left edge

For rotated segment (L-shape second part):
- Labels rotate with segment
```

#### 4. Click-to-Add CNC Operation

```typescript
function handleSvgClick(event: React.MouseEvent<SVGSVGElement>) {
  if (!interactive || !onCncOperationAdd) return;

  const svgRect = svgRef.current.getBoundingClientRect();
  const point = {
    x: (event.clientX - svgRect.left) * scale,
    y: (event.clientY - svgRect.top) * scale,
  };

  // Find which segment was clicked
  const segment = findSegmentAtPoint(point, group.segments);
  if (segment) {
    // Convert to segment-local coordinates
    const localPos = worldToSegmentCoords(point, segment);
    onCncOperationAdd(segment.id, localPos);
  }
}
```

### Visual Styling

```typescript
const DIAGRAM_STYLES = {
  segment: {
    fill: "hsl(var(--muted))",
    stroke: "hsl(var(--border))",
    strokeWidth: 2,
    selectedFill: "hsl(var(--primary) / 0.1)",
    selectedStroke: "hsl(var(--primary))",
  },
  edge: {
    labelFontSize: 12,
    labelColor: "hsl(var(--muted-foreground))",
  },
  corner: {
    radius: 8,
    fill: "hsl(var(--background))",
    stroke: "hsl(var(--border))",
    numberFontSize: 10,
  },
  cncOperation: {
    cutoutFill: "hsl(var(--destructive) / 0.2)",
    cutoutStroke: "hsl(var(--destructive))",
    holeFill: "hsl(var(--primary) / 0.3)",
    holeStroke: "hsl(var(--primary))",
  },
  dimension: {
    lineColor: "hsl(var(--muted-foreground))",
    fontSize: 10,
    offset: 20,
  },
  joint: {
    lineColor: "hsl(var(--primary))",
    lineStyle: "dashed",
    lineWidth: 2,
  },
};
```

---

## Feature 2: Enhanced CncOperationModal

### Description

Improved dialog for adding/editing CNC operations with visual position preview.

### Current State

- Simple dialog with segment select, preset select, X/Y inputs
- No visual feedback of where operation will be placed

### Improvements

#### 2.1 Visual Position Picker

```
┌─────────────────────────────────────────────────┐
│  Dodaj operację CNC                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Segment: [Blat I ▼]                           │
│                                                 │
│  Typ: [Zlewozmywak standardowy ▼]              │
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │                                       │     │
│  │     [Click to place or drag]          │     │
│  │                                       │     │
│  │         ┌─────────┐                   │     │
│  │         │  ████   │ ← Preview         │     │
│  │         └─────────┘                   │     │
│  │                                       │     │
│  └───────────────────────────────────────┘     │
│                                                 │
│  Pozycja X: [450] mm    Pozycja Y: [280] mm    │
│                                                 │
│  Wymiary: 780 × 480 mm, R10                    │
│                                                 │
│  ⚠️ Min. 50mm od krawędzi                      │
│                                                 │
│              [Anuluj]  [Dodaj operację]        │
└─────────────────────────────────────────────────┘
```

#### 2.2 Component Structure

```typescript
interface EnhancedCncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CountertopGroup;
  initialSegmentId?: string;
  initialOperation?: CncOperation; // For editing
  onSave: (segmentId: string, operation: CncOperation) => void;
}
```

#### 2.3 Mini Segment Preview

```typescript
function SegmentPreview({
  segment,
  operation,
  onPositionChange
}: SegmentPreviewProps) {
  // Simplified SVG showing just this segment
  // With draggable operation marker

  return (
    <svg viewBox={`0 0 ${segment.length} ${segment.width}`}>
      {/* Segment outline */}
      <rect
        x={0} y={0}
        width={segment.length}
        height={segment.width}
        fill="var(--muted)"
        stroke="var(--border)"
      />

      {/* Existing operations (dimmed) */}
      {segment.cncOperations.map(op => (
        <CncOperationShape key={op.id} operation={op} dimmed />
      ))}

      {/* New operation (draggable) */}
      <DraggableOperation
        operation={operation}
        bounds={{ width: segment.length, height: segment.width }}
        onDrag={onPositionChange}
      />

      {/* Edge distance guides */}
      <EdgeDistanceGuides
        position={operation.position}
        segmentSize={{ width: segment.length, height: segment.width }}
        minDistance={50}
      />
    </svg>
  );
}
```

#### 2.4 Validation Feedback

```typescript
function useOperationValidation(
  operation: CncOperation,
  segment: CountertopSegment
): ValidationResult {
  return useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { x, y } = operation.position;
    const width = operation.dimensions.width ?? operation.dimensions.diameter ?? 0;
    const height = operation.dimensions.height ?? operation.dimensions.diameter ?? 0;

    // Check edge distances
    if (x - width / 2 < 50) {
      errors.push("Za blisko lewej krawędzi (min. 50mm)");
    }
    if (segment.length - x - width / 2 < 50) {
      errors.push("Za blisko prawej krawędzi (min. 50mm)");
    }
    if (y - height / 2 < 50) {
      errors.push("Za blisko przedniej krawędzi (min. 50mm)");
    }
    if (segment.width - y - height / 2 < 50) {
      errors.push("Za blisko tylnej krawędzi (min. 50mm)");
    }

    // Check if operation fits
    if (width > segment.length - 100) {
      warnings.push("Wycięcie zajmuje prawie całą długość blatu");
    }

    return { valid: errors.length === 0, errors, warnings };
  }, [operation, segment]);
}
```

---

## Feature 3: Joint Type Selector UI

### Description

UI for selecting joint type between countertop segments.

### Location

Add to CountertopPanel, visible when group has multiple segments.

### Component

```typescript
function JointTypeSection({ group }: { group: CountertopGroup }) {
  const { updateJointType } = useStore(useShallow(state => ({
    updateJointType: state.updateJointType,
  })));

  if (group.joints.length === 0) return null;

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">
        Połączenia segmentów
      </Label>

      {group.joints.map((joint, index) => {
        const segmentA = group.segments.find(s => s.id === joint.segmentAId);
        const segmentB = group.segments.find(s => s.id === joint.segmentBId);

        return (
          <div key={joint.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[80px]">
              {segmentA?.name} ↔ {segmentB?.name}
            </span>
            <Select
              value={joint.type}
              onValueChange={(value) =>
                updateJointType(group.id, joint.id, value as CountertopJointType)
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MITER_45">
                  <div className="flex items-center gap-2">
                    <MiterIcon className="h-4 w-4" />
                    <span>Uciosowe 45°</span>
                  </div>
                </SelectItem>
                <SelectItem value="BUTT">
                  <div className="flex items-center gap-2">
                    <ButtJointIcon className="h-4 w-4" />
                    <span>Czołowe</span>
                  </div>
                </SelectItem>
                <SelectItem value="EUROPEAN_MITER">
                  <div className="flex items-center gap-2">
                    <EuropeanMiterIcon className="h-4 w-4" />
                    <span>Europejskie</span>
                  </div>
                </SelectItem>
                <SelectItem value="PUZZLE">
                  <div className="flex items-center gap-2">
                    <PuzzleIcon className="h-4 w-4" />
                    <span>Puzzle (premium)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground">
        Uciosowe 45° - najpopularniejsze dla blatów L
      </p>
    </div>
  );
}
```

### Joint Type Icons

Create simple SVG icons showing cross-section of each joint type:

```typescript
// Simple line drawings showing joint profiles
const JOINT_ICONS = {
  MITER_45: (
    <svg viewBox="0 0 24 24">
      <path d="M2 22 L22 2" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="12" width="10" height="10" fill="currentColor" opacity="0.3" />
      <rect x="12" y="2" width="10" height="10" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  BUTT: (
    <svg viewBox="0 0 24 24">
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="8" width="10" height="8" fill="currentColor" opacity="0.3" />
      <rect x="12" y="8" width="10" height="8" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  // ...
};
```

---

## Feature 4: Overhang Drag Handles (Optional)

### Description

Visual handles on the 2D diagram to adjust overhang by dragging.

### Implementation

```typescript
function OverhangHandle({
  edge,
  value,
  maxValue,
  onChange,
}: OverhangHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Arrow-shaped handle that can be dragged
  // Shows current value in mm
  // Snaps to 5mm increments

  return (
    <g className="cursor-ew-resize">
      <line /* guide line */ />
      <polygon /* arrow shape */ />
      <text /* value label */ />
    </g>
  );
}
```

### Priority: Low

This is a nice-to-have feature. The SegmentTable already allows numeric input for overhang values.

---

## Feature 5: DXF Export (Future)

### Description

Export countertop segments as DXF files for direct CNC machine import.

### Scope

- One DXF file per segment
- Include:
  - Outer contour
  - Cutout contours
  - Hole centers
  - Edge banding indicators
  - Dimension annotations

### Library Options

- `dxf-writer` - Simple DXF generation
- `maker.js` - More features, CAD-like operations

### Priority: Low

CSV export covers most use cases. DXF is for advanced users with CNC machines.

---

## Implementation Order

> **IMPORTANT:** After completing each phase, verify correctness with tests before proceeding to the next phase. This ensures early bug detection and prevents cascading issues.

### Phase 1: CountertopLayoutDiagram (Core)

**Estimated: 2-3 days**

1. Create base SVG container with viewBox calculation
2. Implement SegmentShape for single segments (simple rectangles)
3. Add L-shape positioning logic (rotate second segment)
4. Add edge labels (A, B, C, D)
5. Add corner markers (1-6)
6. Add dimension annotations
7. Add CNC operation markers (rectangles, circles)
8. Add gap indicators between cabinets (using existing `gaps` data)

**✅ Phase 1 Tests (required before Phase 2):**

```
CountertopLayoutDiagram/
├── CountertopLayoutDiagram.test.tsx
│   ├── renders single segment for STRAIGHT layout
│   ├── renders two segments for L_SHAPE layout
│   ├── renders three segments for U_SHAPE layout
│   ├── calculates correct viewBox dimensions
│   ├── positions segments correctly for each layout type
│   ├── shows edge labels A, B, C, D in correct positions
│   ├── shows corner markers 1-4 for STRAIGHT, 1-6 for L_SHAPE
│   ├── renders CNC operations on correct segments
│   ├── renders gap indicators when group has gaps
│   ├── gap indicator shows correct distance
│   └── gap indicator shows correct mode (BRIDGE/SPLIT)
├── GapIndicator.test.tsx
│   ├── renders BRIDGE mode with amber styling
│   ├── renders SPLIT mode with destructive styling
│   ├── shows distance label in mm
│   ├── clicking gap calls onSelect
│   └── gap mode can be changed via popover
└── utils.test.ts
    ├── calculateViewBox returns correct bounds
    ├── getSegmentTransform returns correct position/rotation
    ├── transformToSegmentSpace converts coordinates correctly
    └── calculateGapPosition returns correct SVG coordinates
```

---

### Phase 2: Joint & Miter Visualization

**Estimated: 2 days**

1. Implement polygon-based SegmentShape (not just rectangles)
2. Add miter cut calculation for MITER_45 joints
3. Add JointLine component showing connection between segments
4. Implement joint type visual indicators (icons, colors)
5. Add BUTT and EUROPEAN_MITER cut visualizations
6. Show hardware count badges on joints

**✅ Phase 2 Tests (required before Phase 3):**

```
Joint & Miter Tests/
├── SegmentShape.test.tsx
│   ├── renders rectangle polygon for segment without joints
│   ├── renders polygon with miter cut for MITER_45 joint
│   ├── renders correct polygon for BUTT joint
│   ├── renders correct polygon for EUROPEAN_MITER joint
│   └── miter cut depth matches joint.notchDepth
├── JointLine.test.tsx
│   ├── renders joint line between two segments
│   ├── shows correct icon for each joint type
│   ├── displays hardware count badge
│   └── applies correct styling per joint type
└── miterCalculation.test.ts
    ├── calculateMiterCut returns correct geometry for MITER_45
    ├── calculateMiterCut returns correct geometry for BUTT
    ├── calculateMiterCut returns correct geometry for EUROPEAN_MITER
    ├── miter cut respects segment dimensions
    └── joint position (start/end) affects cut direction
```

---

### Phase 3: Diagram Interactivity

**Estimated: 1-2 days**

1. Segment selection (click)
2. Corner selection (click)
3. Joint selection (click) with JointDetailPopover
4. CNC operation selection (click)
5. Hover effects for all interactive elements
6. Integration with CountertopPanel state

**✅ Phase 3 Tests (required before Phase 4):**

```
Interactivity Tests/
├── CountertopLayoutDiagram.interaction.test.tsx
│   ├── clicking segment calls onSegmentSelect with correct id
│   ├── clicking corner calls onCornerSelect with correct position
│   ├── clicking joint opens JointDetailPopover
│   ├── clicking CNC operation calls onCncOperationSelect
│   ├── selected segment has correct visual styling
│   ├── hover state changes cursor and opacity
│   └── keyboard navigation works (Tab, Enter)
├── JointDetailPopover.test.tsx
│   ├── opens when joint is clicked
│   ├── displays current joint type
│   ├── changing joint type calls onUpdate
│   ├── shows notch depth input for miter joints
│   └── closes on outside click
└── integration.test.tsx
    ├── selecting segment in diagram updates CountertopPanel
    ├── selecting segment in panel highlights in diagram
    └── state sync between diagram and panel is bidirectional
```

---

### Phase 4: Enhanced CNC Modal

**Estimated: 1-2 days**

1. Add mini segment preview with current shape (including miter cuts)
2. Implement draggable operation marker
3. Add validation feedback (edge distances)
4. Add edge distance guides visualization
5. Connect position inputs with visual (two-way binding)
6. Show existing operations on preview (dimmed)

**✅ Phase 4 Tests (required before Phase 5):**

```
EnhancedCncModal Tests/
├── EnhancedCncModal.test.tsx
│   ├── renders segment preview with correct shape
│   ├── shows existing operations dimmed
│   ├── new operation marker is draggable
│   ├── dragging updates position inputs
│   ├── typing in position inputs updates marker position
│   └── preset selection updates dimensions
├── validation.test.tsx
│   ├── shows error when too close to left edge
│   ├── shows error when too close to right edge
│   ├── shows error when too close to front edge
│   ├── shows error when too close to back edge
│   ├── shows error when operation exceeds segment bounds
│   └── submit button disabled when validation fails
├── EdgeDistanceGuides.test.tsx
│   ├── shows 4 distance lines when operation selected
│   ├── distance values are correct
│   ├── invalid distances shown in red
│   └── valid distances shown in muted color
└── DraggableOperation.test.tsx
    ├── can be dragged within bounds
    ├── cannot be dragged outside segment
    ├── snaps to grid when enabled
    └── fires onDrag with correct coordinates
```

---

### Phase 5: Joint Type UI in Panel

**Estimated: 0.5 day**

1. Create JointTypeSection component for CountertopPanel
2. Create joint type icons (SVG)
3. Add notch depth control for miter joints
4. Show hardware recommendations per joint type

**✅ Phase 5 Tests (required before Phase 6):**

```
JointTypeSection Tests/
├── JointTypeSection.test.tsx
│   ├── renders only when group has joints
│   ├── shows all joints with segment names
│   ├── joint type can be changed via select
│   ├── changing type updates store
│   ├── shows notch depth input for MITER_45
│   ├── shows notch depth input for EUROPEAN_MITER
│   ├── hides notch depth input for BUTT
│   └── shows hardware recommendations
└── JointIcons.test.tsx
    ├── renders correct icon for each joint type
    └── icons have accessible labels
```

---

### Phase 6: Click-to-Add CNC

**Estimated: 1 day**

1. Implement click detection on diagram segments
2. Convert click coords to segment-local coords
3. Open CNC modal with pre-filled position
4. Add visual cursor feedback ("click to add cutout")
5. Validate position before allowing add

**✅ Phase 6 Tests (required before completion):**

```
Click-to-Add Tests/
├── clickToAdd.test.tsx
│   ├── clicking on segment in add mode opens CNC modal
│   ├── modal has pre-filled position from click coords
│   ├── position is correctly converted to segment-local
│   ├── clicking outside segments does nothing
│   ├── cursor changes to crosshair in add mode
│   └── ESC key exits add mode
├── coordinateConversion.test.ts
│   ├── worldToSegmentCoords handles STRAIGHT layout
│   ├── worldToSegmentCoords handles rotated L_SHAPE segment
│   ├── worldToSegmentCoords handles U_SHAPE segments
│   └── handles edge cases (click on joint line)
└── e2e/clickToAddFlow.test.tsx
    ├── full flow: click → modal → save → operation visible
    ├── operation appears at correct position
    └── undo removes the added operation
```

---

## Test Coverage Requirements

| Phase   | Unit Tests  | Integration Tests | Min Coverage |
| ------- | ----------- | ----------------- | ------------ |
| Phase 1 | ✅ Required | -                 | 80%          |
| Phase 2 | ✅ Required | -                 | 80%          |
| Phase 3 | ✅ Required | ✅ Required       | 75%          |
| Phase 4 | ✅ Required | ✅ Required       | 80%          |
| Phase 5 | ✅ Required | -                 | 80%          |
| Phase 6 | ✅ Required | ✅ E2E Required   | 75%          |

### Test Commands

```bash
# Run all countertop 2D editor tests
pnpm --filter @meble/app test -- --testPathPattern="CountertopLayoutDiagram|EnhancedCncModal|JointType"

# Run specific phase tests
pnpm --filter @meble/app test -- --testPathPattern="CountertopLayoutDiagram.test"

# Run with coverage
pnpm --filter @meble/app test -- --coverage --testPathPattern="countertop"
```

### Test Utilities

Create shared test utilities in `__tests__/utils/countertopTestUtils.ts`:

```typescript
export const createMockCountertopGroup = (
  overrides?: Partial<CountertopGroup>
): CountertopGroup => ({
  id: "test-group-1",
  name: "Test Countertop",
  furnitureId: "furniture-1",
  layoutType: "STRAIGHT",
  materialId: "material-1",
  segments: [createMockSegment()],
  joints: [],
  corners: [],
  gaps: [], // NEW: gap support
  thickness: 38,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSegment = (overrides?: Partial<CountertopSegment>): CountertopSegment => ({
  id: "segment-1",
  name: "Blat I",
  cabinetIds: ["cabinet-1"],
  length: 1200,
  width: 600,
  thickness: 38,
  overhang: { front: 30, back: 0, left: 0, right: 0 },
  edgeBanding: { a: "NONE", b: "NONE", c: "STANDARD", d: "NONE" },
  grainAlongLength: true,
  cncOperations: [],
  ...overrides,
});

export const createMockJoint = (overrides?: Partial<CountertopJoint>): CountertopJoint => ({
  id: "joint-1",
  type: "MITER_45",
  segmentAId: "segment-1",
  segmentBId: "segment-2",
  angle: 90,
  hardware: { type: "MITER_BOLT", count: 2 },
  notchDepth: 650,
  ...overrides,
});

// NEW: Gap mock utility
export const createMockGap = (overrides?: Partial<CabinetGap>): CabinetGap => ({
  id: "gap-1",
  cabinetAId: "cabinet-1",
  cabinetBId: "cabinet-2",
  distance: 100,
  axis: "X",
  mode: "BRIDGE",
  ...overrides,
});

// NEW: Create group with gaps
export const createGroupWithGaps = (
  gapDistance: number = 150,
  mode: CabinetGapMode = "BRIDGE"
): CountertopGroup =>
  createMockCountertopGroup({
    segments: [
      createMockSegment({ id: "segment-1", name: "Blat I", cabinetIds: ["cabinet-1"] }),
      ...(mode === "SPLIT"
        ? [createMockSegment({ id: "segment-2", name: "Blat II", cabinetIds: ["cabinet-2"] })]
        : []),
    ],
    gaps: [
      createMockGap({
        distance: gapDistance,
        mode,
      }),
    ],
  });

export const createLShapeGroup = (): CountertopGroup =>
  createMockCountertopGroup({
    layoutType: "L_SHAPE",
    segments: [
      createMockSegment({ id: "segment-1", name: "Blat I" }),
      createMockSegment({ id: "segment-2", name: "Blat II" }),
    ],
    joints: [createMockJoint()],
    corners: Array.from({ length: 6 }, (_, i) => ({
      id: `corner-${i + 1}`,
      position: (i + 1) as CornerPosition,
      treatment: "STRAIGHT" as CornerTreatment,
    })),
  });
```

---

## File Structure

```
apps/app/src/components/
├── countertop/
│   ├── CountertopLayoutDiagram/
│   │   ├── index.ts
│   │   ├── CountertopLayoutDiagram.tsx
│   │   ├── SegmentShape.tsx
│   │   ├── EdgeLabel.tsx
│   │   ├── CornerMarker.tsx
│   │   ├── CncOperationMarker.tsx
│   │   ├── DimensionAnnotation.tsx
│   │   ├── JointLine.tsx
│   │   ├── JointDetailPopover.tsx
│   │   ├── GapIndicator.tsx           # NEW: Gap visualization
│   │   ├── GapModePopover.tsx         # NEW: Gap mode selector
│   │   ├── OverhangHandle.tsx
│   │   ├── hooks.ts
│   │   ├── utils.ts
│   │   └── styles.ts
│   ├── EnhancedCncModal/
│   │   ├── index.ts
│   │   ├── EnhancedCncModal.tsx
│   │   ├── SegmentPreview.tsx
│   │   ├── DraggableOperation.tsx
│   │   ├── EdgeDistanceGuides.tsx
│   │   └── PresetSelector.tsx
│   └── JointTypeSection/
│       ├── index.ts
│       ├── JointTypeSection.tsx
│       └── JointIcons.tsx
└── panels/
    └── CountertopPanel/
        └── CountertopPanel.tsx  # Updated to include new components
```

---

## Testing Plan

### Unit Tests

- `CountertopLayoutDiagram.test.tsx`
  - Renders correct number of segments
  - Calculates viewBox correctly for each layout type
  - Positions L-shape segments correctly
  - Shows/hides elements based on props

- `EnhancedCncModal.test.tsx`
  - Validates position constraints
  - Updates position on drag
  - Shows correct preset dimensions

### Visual Tests (Storybook)

- All layout types: STRAIGHT, L_SHAPE, U_SHAPE
- With/without CNC operations
- With/without edge labels
- Selection states
- Interactive mode

### Integration Tests

- Add CNC operation via diagram click
- Select segment in diagram → highlights in panel
- Change corner treatment → updates diagram

---

## Acceptance Criteria

### CountertopLayoutDiagram

- [ ] Displays all segments with correct proportions
- [ ] Shows L-shape with proper overlap at corner
- [ ] Edge labels (A, B, C, D) correctly positioned
- [ ] Corner numbers (1-6) visible and clickable
- [ ] CNC operations shown as shapes on segments
- [ ] Dimensions displayed in mm
- [ ] Responsive to container size
- [ ] Segment selection works
- [ ] Corner selection works
- [ ] Gap indicators shown between cabinets with gaps
- [ ] Gap mode (BRIDGE/SPLIT) visually distinguishable
- [ ] Gap distance displayed in mm

### Gap Mode UI

- [ ] Gap indicators visible when group has gaps
- [ ] BRIDGE mode shown with amber/warning styling
- [ ] SPLIT mode shown with destructive/red styling
- [ ] Clicking gap opens mode selector popover
- [ ] Changing gap mode updates store and regenerates segments
- [ ] Warning shown for large gaps (>200mm) in BRIDGE mode
- [ ] Large gaps (>500mm) cannot be set to BRIDGE

### Enhanced CNC Modal

- [ ] Shows visual preview of segment
- [ ] Operation position can be set by clicking/dragging
- [ ] Position inputs sync with visual
- [ ] Validation errors shown visually
- [ ] Edge distance guides visible
- [ ] Preset dimensions shown

### Joint Type UI

- [ ] All joint types selectable
- [ ] Icons clearly show joint type
- [ ] Changes saved to store
- [ ] Only visible when multiple segments exist
