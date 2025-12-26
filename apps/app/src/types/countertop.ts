/**
 * Countertop type definitions
 *
 * Kitchen countertop configuration module supporting:
 * - Multiple layout types (I, L, U shapes)
 * - Joint connections between segments
 * - Edge banding per edge
 * - CNC operations (cutouts, holes)
 * - Corner treatments
 */

// ============================================================================
// Layout & Connection Types
// ============================================================================

/**
 * Countertop layout types based on cabinet arrangement
 */
export type CountertopLayoutType =
  | "STRAIGHT" // Single straight countertop (I-shape)
  | "L_SHAPE" // Two countertops meeting at 90° (L-shape)
  | "U_SHAPE" // Three countertops forming U
  | "ISLAND" // Standalone island countertop
  | "PENINSULA"; // Attached to wall on one end

/**
 * Joint connection types between countertop segments
 * Based on industry standards
 */
export type CountertopJointType =
  | "MITER_45" // 45° miter joint (most common for L-shapes)
  | "BUTT" // Straight butt joint
  | "EUROPEAN_MITER" // Hybrid: starts miter, ends butt
  | "PUZZLE"; // Decorative puzzle joint (premium)

/**
 * Hardware types for joining countertop segments
 */
export type JointHardwareType =
  | "MITER_BOLT" // Standard miter bolt
  | "FLIP_BOLT" // FlipBolt connector
  | "DOMINO" // Festool Domino
  | "BISCUIT"; // Biscuit joiner

// ============================================================================
// Corner & Edge Types
// ============================================================================

/**
 * Corner treatment options for CNC processing
 */
export type CornerTreatment =
  | "STRAIGHT" // Narożnik prosty - 90° corner
  | "CHAMFER" // Ścięcie pod kątem - angled cut
  | "RADIUS" // Zaokrąglenie - rounded corner
  | "CLIP"; // Ścięcie narożnika - corner clip

/**
 * Corner positions (matching industry standard for L-shape layouts)
 * Corners are numbered 1-6 for L-shape, up to 8 for U-shape
 */
export type CornerPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Edge banding options per edge
 */
export type EdgeBandingOption =
  | "NONE" // No edge banding
  | "STANDARD" // Standard edge banding (same material)
  | "CONTRAST" // Contrasting color
  | "ABS_2MM" // ABS 2mm
  | "ABS_1MM" // ABS 1mm
  | "PVC"; // PVC edge

/**
 * Edge identifiers for a countertop segment
 * Following industry standard labeling (a, b, c, d)
 */
export type EdgeId = "a" | "b" | "c" | "d";

// ============================================================================
// CNC Operations
// ============================================================================

/**
 * CNC operation types for countertops
 */
export type CncOperationType =
  | "RECTANGULAR_CUTOUT" // Wcięcie prostokątne (sink, cooktop)
  | "CIRCULAR_HOLE" // Otwór okrągły (faucet, accessories)
  | "RECTANGULAR_HOLE" // Otwór prostokątny
  | "EDGE_NOTCH"; // Wcięcie w krawędzi

/**
 * Cutout preset types for common appliances
 */
export type CutoutPresetType =
  | "NONE"
  | "SINK_STANDARD" // Standard sink ~780x480mm
  | "SINK_SMALL" // Small sink ~580x430mm
  | "SINK_ROUND" // Round sink
  | "COOKTOP_60" // 60cm cooktop
  | "COOKTOP_80" // 80cm cooktop
  | "FAUCET_HOLE" // Standard faucet hole 35mm
  | "SOAP_DISPENSER" // Soap dispenser hole 28mm
  | "CUSTOM"; // Custom cutout with user-defined dimensions

/**
 * Single CNC operation definition
 */
export interface CncOperation {
  id: string;
  type: CncOperationType;
  /** Position relative to countertop segment (mm from left-front corner) */
  position: {
    x: number; // Distance from left edge
    y: number; // Distance from front edge
  };
  /** Dimensions based on operation type */
  dimensions: {
    width?: number; // For rectangular operations
    height?: number; // For rectangular operations
    diameter?: number; // For circular holes
    depth?: number; // Depth of cut (undefined = through)
    radius?: number; // Corner radius for rectangular cutouts
  };
  /** Optional preset that generated this operation */
  preset?: CutoutPresetType;
  /** Additional notes for production */
  notes?: string;
}

// ============================================================================
// Corner Configuration
// ============================================================================

/**
 * Corner configuration for CNC processing of countertops
 */
export interface CountertopCornerConfig {
  id: string;
  /** Corner position number (1-8) */
  position: CornerPosition;
  /** Treatment type */
  treatment: CornerTreatment;
  /** Chamfer angle in degrees (for CHAMFER treatment, default 45°) */
  chamferAngle?: number;
  /** Radius in mm (for RADIUS treatment) */
  radius?: number;
  /** Clip size in mm (for CLIP treatment, creates 45° cut) */
  clipSize?: number;
}

// ============================================================================
// Edge Banding Configuration
// ============================================================================

/**
 * Edge banding configuration for a segment
 * Uses industry-standard edge labeling (a, b, c, d)
 */
export interface SegmentEdgeBanding {
  /** Edge A - typically back edge */
  a: EdgeBandingOption;
  /** Edge B - typically right edge */
  b: EdgeBandingOption;
  /** Edge C - typically front edge */
  c: EdgeBandingOption;
  /** Edge D - typically left edge */
  d: EdgeBandingOption;
}

// ============================================================================
// Overhang Configuration
// ============================================================================

/**
 * Countertop overhang beyond cabinet edges
 */
export interface CountertopOverhang {
  /** Front overhang (typically 30-50mm) */
  front: number;
  /** Back overhang (typically 0, against wall) */
  back: number;
  /** Left side overhang */
  left: number;
  /** Right side overhang */
  right: number;
}

// ============================================================================
// Countertop Segment
// ============================================================================

/**
 * Single countertop segment (one piece of material)
 * A countertop group may have multiple segments joined together
 */
export interface CountertopSegment {
  id: string;
  /** Display name (e.g., "Blat I", "Blat II") */
  name: string;
  /** Reference to cabinets this segment covers */
  cabinetIds: string[];
  /** Length in mm (Długość) */
  length: number;
  /** Width/depth in mm (Szerokość) */
  width: number;
  /** Thickness in mm (typically 28, 38, or 40) */
  thickness: number;
  /** Overhang beyond cabinet edges */
  overhang: CountertopOverhang;
  /** Edge banding configuration */
  edgeBanding: SegmentEdgeBanding;
  /** Grain direction - true = grain runs along length (Uslojenie) */
  grainAlongLength: boolean;
  /** CNC operations on this segment */
  cncOperations: CncOperation[];
  /** Production notes */
  notes?: string;
}

// ============================================================================
// Joint Configuration
// ============================================================================

/**
 * Joint hardware specification
 */
export interface JointHardware {
  type: JointHardwareType;
  count: number;
}

/**
 * Joint between two countertop segments
 */
export interface CountertopJoint {
  id: string;
  /** Joint connection type */
  type: CountertopJointType;
  /** ID of first segment */
  segmentAId: string;
  /** ID of second segment */
  segmentBId: string;
  /** Joint angle in degrees (90° for L-shape, 180° for straight extension) */
  angle: number;
  /** Hardware specification */
  hardware: JointHardware;
  /** Notch depth for angled joints in mm (głębokość wcięcia) */
  notchDepth?: number;
}

// ============================================================================
// Cabinet Gap Configuration
// ============================================================================

/**
 * Gap handling mode between adjacent cabinets
 * - BRIDGE: Single countertop spans over the gap (empty space underneath)
 * - SPLIT: Separate countertops for cabinets on each side of the gap
 */
export type CabinetGapMode = "BRIDGE" | "SPLIT";

/**
 * Detected gap between two cabinets in a countertop group
 */
export interface CabinetGap {
  id: string;
  /** First cabinet ID */
  cabinetAId: string;
  /** Second cabinet ID */
  cabinetBId: string;
  /** Gap distance in mm */
  distance: number;
  /** Axis of the gap: 'X' (side-by-side) or 'Z' (front-back) */
  axis: "X" | "Z";
  /** User-selected mode (defaults based on distance) */
  mode: CabinetGapMode;
}

// ============================================================================
// Countertop Group
// ============================================================================

/**
 * Complete countertop group covering one or more adjacent cabinets
 * This is the main entity for countertop management
 */
export interface CountertopGroup {
  id: string;
  /** Display name */
  name: string;
  /** Parent furniture ID */
  furnitureId: string;
  /** Layout type determined by cabinet arrangement */
  layoutType: CountertopLayoutType;
  /** Material ID for the countertop */
  materialId: string;
  /** All segments in this group */
  segments: CountertopSegment[];
  /** Joints between segments */
  joints: CountertopJoint[];
  /** Corner configurations */
  corners: CountertopCornerConfig[];
  /** Detected gaps between cabinets with their handling modes */
  gaps: CabinetGap[];
  /** Default thickness for all segments (can be overridden per segment) */
  thickness: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Cabinet-Level Configuration
// ============================================================================

/**
 * Optional countertop configuration at cabinet level
 * Allows per-cabinet customization
 */
export interface CabinetCountertopConfig {
  /** Whether this cabinet should have a countertop */
  hasCountertop: boolean;
  /** Material ID for the countertop */
  materialId?: string;
  /** Overhang overrides for this specific cabinet */
  overhangOverride?: Partial<CountertopOverhang>;
  /** Exclude from automatic grouping with adjacent cabinets */
  excludeFromGroup?: boolean;
  /** Cutout preset for this cabinet (e.g., sink cabinet) */
  cutoutPreset?: CutoutPresetType;
  /** Custom cutout dimensions (used when cutoutPreset is 'CUSTOM') */
  customCutout?: {
    width: number;
    height: number;
    /** Corner radius in mm (default: 10mm, standard range: 5-25mm) */
    radius?: number;
  };
  /** Custom thickness override */
  thicknessOverride?: number;
}

// ============================================================================
// Production Export Types
// ============================================================================

/**
 * Cut list entry for production
 */
export interface CutListEntry {
  segmentId: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: "LENGTH" | "WIDTH";
  quantity: number;
  material: string;
}

/**
 * Edge banding list entry
 */
export interface EdgeBandingEntry {
  segmentId: string;
  segmentName: string;
  edge: EdgeId;
  type: EdgeBandingOption;
  length: number;
}

/**
 * Production data for countertop manufacturing
 */
export interface CountertopProductionData {
  /** Order/export date */
  exportDate: Date;
  /** Reference ID */
  referenceId: string;
  /** Material specification */
  material: {
    id: string;
    name: string;
    thickness: number;
    decor?: string;
  };
  /** Cut list entries */
  cutList: CutListEntry[];
  /** Edge banding requirements */
  edgeBanding: EdgeBandingEntry[];
  /** CNC operations grouped by segment */
  cncOperations: Array<{
    segmentId: string;
    segmentName: string;
    operations: CncOperation[];
  }>;
  /** Joint specifications */
  joints: Array<{
    jointId: string;
    type: CountertopJointType;
    angle: number;
    hardware: JointHardware;
    segmentAName: string;
    segmentBName: string;
  }>;
  /** Corner treatments */
  corners: CountertopCornerConfig[];
  /** Total area in m² */
  totalAreaM2: number;
  /** Total edge banding length in mm */
  totalEdgeBandingMm: number;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Options for creating a countertop group
 */
export interface CountertopGroupOptions {
  name?: string;
  thickness?: number;
  defaultOverhang?: Partial<CountertopOverhang>;
  defaultEdgeBanding?: Partial<SegmentEdgeBanding>;
}

/**
 * Result of adjacent cabinet detection
 */
export interface AdjacentCabinetGroup {
  cabinets: string[]; // Cabinet IDs
  layoutType: CountertopLayoutType;
  suggestedSegments: number;
}

/**
 * ID generators
 */
export const generateCountertopGroupId = (): string =>
  `ctg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateSegmentId = (): string =>
  `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateJointId = (): string =>
  `jnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateCncOperationId = (): string =>
  `cnc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateCornerId = (): string =>
  `cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateGapId = (): string =>
  `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
