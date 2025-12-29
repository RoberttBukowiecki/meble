/**
 * Countertop Domain Module
 *
 * Re-exports the unified CountertopDomain from separate modules
 */

import type {
  CountertopGroup,
  CountertopSegment,
  CountertopJoint,
  CountertopLayoutType,
  CountertopJointType,
  CountertopOverhang,
  SegmentEdgeBanding,
  EdgeBandingOption,
  CncOperation,
  CncOperationType,
  CountertopCornerConfig,
  CornerPosition,
  CornerTreatment,
  CutoutPresetType,
  CountertopGroupOptions,
  EdgeId,
  CabinetGap,
  CabinetGapMode,
} from "@/types/countertop";
import {
  generateCountertopGroupId,
  generateSegmentId,
  generateJointId,
  generateCncOperationId,
  generateCornerId,
  generateGapId,
} from "@/types/countertop";
import type { Cabinet, Part, Material } from "@/types";
import {
  COUNTERTOP_DEFAULTS,
  COUNTERTOP_LIMITS,
  JOINT_HARDWARE_PRESETS,
  CUTOUT_PRESETS,
  CABINET_ADJACENCY_THRESHOLD,
  CABINET_GAP_CONFIG,
} from "@/lib/config";

// Import from split modules
import {
  clamp,
  getCabinetBounds,
  areCabinetsAdjacent,
  getCabinetGapInfo,
  findConnectedComponents,
  findDirectionChangeIndices,
} from "./helpers";
import { validateSegment, validateCncOperation, validateGroup } from "./validation";
import {
  calculateTotalArea,
  calculateTotalAreaM2,
  calculateEdgeBandingLength,
  generateProductionData,
  generateCuttingListCsv,
} from "./export";

/**
 * Unified CountertopDomain module
 */
export const CountertopDomain = {
  // ==========================================================================
  // CREATORS
  // ==========================================================================

  createSegment: (
    name: string,
    cabinetIds: string[],
    dimensions: { length: number; width: number },
    options?: Partial<Omit<CountertopSegment, "id" | "name" | "cabinetIds" | "length" | "width">>
  ): CountertopSegment => ({
    id: generateSegmentId(),
    name,
    cabinetIds,
    length: clamp(dimensions.length, COUNTERTOP_LIMITS.LENGTH.min, COUNTERTOP_LIMITS.LENGTH.max),
    width: clamp(dimensions.width, COUNTERTOP_LIMITS.WIDTH.min, COUNTERTOP_LIMITS.WIDTH.max),
    thickness: options?.thickness ?? COUNTERTOP_DEFAULTS.THICKNESS,
    overhang: options?.overhang ?? { ...COUNTERTOP_DEFAULTS.OVERHANG },
    edgeBanding: options?.edgeBanding ?? { ...COUNTERTOP_DEFAULTS.EDGE_BANDING },
    grainAlongLength: options?.grainAlongLength ?? COUNTERTOP_DEFAULTS.GRAIN_ALONG_LENGTH,
    cncOperations: options?.cncOperations ?? [],
    notes: options?.notes,
  }),

  createJoint: (
    segmentAId: string,
    segmentBId: string,
    type: CountertopJointType = "MITER_45",
    angle: number = 90
  ): CountertopJoint => ({
    id: generateJointId(),
    type,
    segmentAId,
    segmentBId,
    angle,
    hardware: { ...JOINT_HARDWARE_PRESETS[type] },
    notchDepth: type === "MITER_45" || type === "EUROPEAN_MITER" ? 650 : undefined,
  }),

  createCorner: (
    position: CornerPosition,
    treatment: CornerTreatment = "STRAIGHT",
    params?: { chamferAngle?: number; radius?: number; clipSize?: number }
  ): CountertopCornerConfig => ({
    id: generateCornerId(),
    position,
    treatment,
    chamferAngle: treatment === "CHAMFER" ? (params?.chamferAngle ?? 45) : undefined,
    radius: treatment === "RADIUS" ? (params?.radius ?? 30) : undefined,
    clipSize: treatment === "CLIP" ? (params?.clipSize ?? 30) : undefined,
  }),

  createCncOperation: (
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation["dimensions"],
    preset?: CutoutPresetType
  ): CncOperation => ({
    id: generateCncOperationId(),
    type,
    position,
    dimensions,
    preset,
  }),

  createCncOperationFromPreset: (
    preset: CutoutPresetType,
    position: { x: number; y: number }
  ): CncOperation | null => {
    if (preset === "NONE") return null;

    const presetConfig = CUTOUT_PRESETS[preset];
    const { dimensions } = presetConfig;

    const type: CncOperationType = dimensions.diameter ? "CIRCULAR_HOLE" : "RECTANGULAR_CUTOUT";

    return CountertopDomain.createCncOperation(type, position, dimensions, preset);
  },

  createGroup: (
    furnitureId: string,
    cabinets: Cabinet[],
    parts: Part[],
    materialId: string,
    options?: CountertopGroupOptions,
    existingGaps?: CabinetGap[]
  ): CountertopGroup => {
    const layoutType = CountertopDomain.detectLayoutType(cabinets, parts);
    // Detect gaps between cabinets, preserving existing user choices if provided
    const gaps = CountertopDomain.detectGapsInCabinets(cabinets, parts, existingGaps);
    const segments = CountertopDomain.generateSegmentsFromCabinets(cabinets, parts, options, gaps);
    const joints = CountertopDomain.generateJointsForLayout(segments, layoutType);
    const corners = CountertopDomain.generateCornersForLayout(layoutType);

    return {
      id: generateCountertopGroupId(),
      name:
        options?.name ??
        `Blat ${layoutType === "STRAIGHT" ? "prosty" : layoutType === "L_SHAPE" ? "L" : layoutType}`,
      furnitureId,
      layoutType,
      materialId,
      segments,
      joints,
      corners,
      gaps,
      thickness: options?.thickness ?? COUNTERTOP_DEFAULTS.THICKNESS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  // ==========================================================================
  // UPDATERS
  // ==========================================================================

  updateSegmentDimensions: (
    segment: CountertopSegment,
    dimensions: Partial<{ length: number; width: number; thickness: number }>
  ): CountertopSegment => ({
    ...segment,
    length:
      dimensions.length !== undefined
        ? clamp(dimensions.length, COUNTERTOP_LIMITS.LENGTH.min, COUNTERTOP_LIMITS.LENGTH.max)
        : segment.length,
    width:
      dimensions.width !== undefined
        ? clamp(dimensions.width, COUNTERTOP_LIMITS.WIDTH.min, COUNTERTOP_LIMITS.WIDTH.max)
        : segment.width,
    thickness:
      dimensions.thickness !== undefined
        ? clamp(
            dimensions.thickness,
            COUNTERTOP_LIMITS.THICKNESS.min,
            COUNTERTOP_LIMITS.THICKNESS.max
          )
        : segment.thickness,
  }),

  updateSegmentOverhang: (
    segment: CountertopSegment,
    overhang: Partial<CountertopOverhang>
  ): CountertopSegment => ({
    ...segment,
    overhang: {
      front:
        overhang.front !== undefined
          ? clamp(overhang.front, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
          : segment.overhang.front,
      back:
        overhang.back !== undefined
          ? clamp(overhang.back, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
          : segment.overhang.back,
      left:
        overhang.left !== undefined
          ? clamp(overhang.left, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
          : segment.overhang.left,
      right:
        overhang.right !== undefined
          ? clamp(overhang.right, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
          : segment.overhang.right,
    },
  }),

  updateSegmentEdgeBanding: (
    segment: CountertopSegment,
    edge: EdgeId,
    option: EdgeBandingOption
  ): CountertopSegment => ({
    ...segment,
    edgeBanding: {
      ...segment.edgeBanding,
      [edge]: option,
    },
  }),

  updateAllEdgeBanding: (
    segment: CountertopSegment,
    edgeBanding: Partial<SegmentEdgeBanding>
  ): CountertopSegment => ({
    ...segment,
    edgeBanding: {
      ...segment.edgeBanding,
      ...edgeBanding,
    },
  }),

  updateSegmentGrain: (
    segment: CountertopSegment,
    grainAlongLength: boolean
  ): CountertopSegment => ({
    ...segment,
    grainAlongLength,
  }),

  addCncOperation: (segment: CountertopSegment, operation: CncOperation): CountertopSegment => ({
    ...segment,
    cncOperations: [...segment.cncOperations, operation],
  }),

  removeCncOperation: (segment: CountertopSegment, operationId: string): CountertopSegment => ({
    ...segment,
    cncOperations: segment.cncOperations.filter((op) => op.id !== operationId),
  }),

  updateCncOperation: (
    segment: CountertopSegment,
    operationId: string,
    updates: Partial<Omit<CncOperation, "id">>
  ): CountertopSegment => ({
    ...segment,
    cncOperations: segment.cncOperations.map((op) =>
      op.id === operationId ? { ...op, ...updates } : op
    ),
  }),

  updateCorner: (
    group: CountertopGroup,
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: { chamferAngle?: number; radius?: number; clipSize?: number }
  ): CountertopGroup => ({
    ...group,
    corners: group.corners.map((corner) =>
      corner.position === position
        ? {
            ...corner,
            treatment,
            chamferAngle: treatment === "CHAMFER" ? (params?.chamferAngle ?? 45) : undefined,
            radius: treatment === "RADIUS" ? (params?.radius ?? 30) : undefined,
            clipSize: treatment === "CLIP" ? (params?.clipSize ?? 30) : undefined,
          }
        : corner
    ),
    updatedAt: new Date(),
  }),

  updateJointType: (
    group: CountertopGroup,
    jointId: string,
    type: CountertopJointType
  ): CountertopGroup => ({
    ...group,
    joints: group.joints.map((joint) =>
      joint.id === jointId
        ? {
            ...joint,
            type,
            hardware: { ...JOINT_HARDWARE_PRESETS[type] },
            notchDepth: type === "MITER_45" || type === "EUROPEAN_MITER" ? 650 : undefined,
          }
        : joint
    ),
    updatedAt: new Date(),
  }),

  updateSegmentInGroup: (
    group: CountertopGroup,
    segmentId: string,
    updates: Partial<Omit<CountertopSegment, "id">>
  ): CountertopGroup => ({
    ...group,
    segments: group.segments.map((segment) =>
      segment.id === segmentId ? { ...segment, ...updates } : segment
    ),
    updatedAt: new Date(),
  }),

  // ==========================================================================
  // DETECTION & GENERATION
  // ==========================================================================

  detectAdjacentCabinets: (
    cabinets: Cabinet[],
    parts: Part[],
    threshold: number = CABINET_GAP_CONFIG.MAX_BRIDGE_GAP
  ): Cabinet[][] => {
    const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
    const eligible = cabinets.filter((c) => eligibleTypes.includes(c.type));

    if (eligible.length === 0) return [];
    if (eligible.length === 1) return [eligible];

    const adjacency = new Map<string, Set<string>>();
    const boundsMap = new Map<string, ReturnType<typeof getCabinetBounds>>();

    for (const cabinet of eligible) {
      boundsMap.set(cabinet.id, getCabinetBounds(cabinet, parts));
    }

    for (let i = 0; i < eligible.length; i++) {
      for (let j = i + 1; j < eligible.length; j++) {
        const boundsA = boundsMap.get(eligible[i].id)!;
        const boundsB = boundsMap.get(eligible[j].id)!;

        // Use MAX_BRIDGE_GAP to group cabinets that can potentially share a countertop
        if (areCabinetsAdjacent(boundsA, boundsB, threshold)) {
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

    return findConnectedComponents(eligible, adjacency);
  },

  /**
   * Detect gaps between cabinets in a group
   * Returns array of gaps with their distances and default modes
   * IMPORTANT: Only detects gaps between ADJACENT cabinets (consecutive in sorted order)
   * This prevents creating gaps between cabinets that have other cabinets between them
   */
  detectGapsInCabinets: (
    cabinets: Cabinet[],
    parts: Part[],
    existingGaps?: CabinetGap[]
  ): CabinetGap[] => {
    if (cabinets.length < 2) return [];

    const gaps: CabinetGap[] = [];
    const boundsMap = new Map<string, ReturnType<typeof getCabinetBounds>>();

    // Build bounds map
    for (const cabinet of cabinets) {
      boundsMap.set(cabinet.id, getCabinetBounds(cabinet, parts));
    }

    // Sort cabinets by position (X then Z) to find adjacent pairs
    const sortedCabinets = [...cabinets].sort((a, b) => {
      const boundsA = boundsMap.get(a.id)!;
      const boundsB = boundsMap.get(b.id)!;
      const xDiff = boundsA.center[0] - boundsB.center[0];
      // Use small threshold to handle floating point precision
      if (Math.abs(xDiff) > 10) return xDiff;
      return boundsA.center[2] - boundsB.center[2];
    });

    // Only check CONSECUTIVE pairs in sorted order (adjacent cabinets)
    for (let i = 0; i < sortedCabinets.length - 1; i++) {
      const cabinetA = sortedCabinets[i];
      const cabinetB = sortedCabinets[i + 1];
      const boundsA = boundsMap.get(cabinetA.id)!;
      const boundsB = boundsMap.get(cabinetB.id)!;

      const gapInfo = getCabinetGapInfo(boundsA, boundsB, CABINET_GAP_CONFIG.MAX_BRIDGE_GAP);

      if (gapInfo && gapInfo.gap > CABINET_GAP_CONFIG.TOUCH_THRESHOLD) {
        // Check if there's an existing gap with user-set mode
        const existingGap = existingGaps?.find(
          (g) =>
            (g.cabinetAId === cabinetA.id && g.cabinetBId === cabinetB.id) ||
            (g.cabinetAId === cabinetB.id && g.cabinetBId === cabinetA.id)
        );

        // Determine default mode based on gap size
        const defaultMode: CabinetGapMode =
          gapInfo.gap > CABINET_GAP_CONFIG.AUTO_SPLIT_THRESHOLD ? "SPLIT" : "BRIDGE";

        gaps.push({
          id: existingGap?.id ?? generateGapId(),
          cabinetAId: cabinetA.id,
          cabinetBId: cabinetB.id,
          distance: Math.round(gapInfo.gap),
          axis: gapInfo.axis,
          mode: existingGap?.mode ?? defaultMode,
        });
      }
    }

    return gaps;
  },

  detectLayoutType: (cabinets: Cabinet[], parts: Part[]): CountertopLayoutType => {
    if (cabinets.length === 0) return "STRAIGHT";
    if (cabinets.length === 1) {
      if (cabinets[0].type === "CORNER_INTERNAL" || cabinets[0].type === "CORNER_EXTERNAL") {
        return "L_SHAPE";
      }
      return "STRAIGHT";
    }

    const centers = cabinets.map((c) => getCabinetBounds(c, parts).center);
    const directions: [number, number][] = [];

    for (let i = 1; i < centers.length; i++) {
      const dx = centers[i][0] - centers[i - 1][0];
      const dz = centers[i][2] - centers[i - 1][2];
      const mag = Math.sqrt(dx * dx + dz * dz);
      if (mag > 0) {
        directions.push([dx / mag, dz / mag]);
      }
    }

    if (directions.length === 0) return "STRAIGHT";

    let angleChanges = 0;
    for (let i = 1; i < directions.length; i++) {
      const dot = directions[i][0] * directions[i - 1][0] + directions[i][1] * directions[i - 1][1];
      const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      if (angle > 45) {
        angleChanges++;
      }
    }

    const hasCornerCabinet = cabinets.some(
      (c) => c.type === "CORNER_INTERNAL" || c.type === "CORNER_EXTERNAL"
    );

    if (angleChanges === 0 && !hasCornerCabinet) return "STRAIGHT";
    if (angleChanges === 1 || hasCornerCabinet) return "L_SHAPE";
    if (angleChanges >= 2) return "U_SHAPE";

    return "STRAIGHT";
  },

  generateSegmentsFromCabinets: (
    cabinets: Cabinet[],
    parts: Part[],
    options?: CountertopGroupOptions,
    gaps?: CabinetGap[]
  ): CountertopSegment[] => {
    if (cabinets.length === 0) return [];

    // IMPORTANT: Sort cabinets by position first!
    // This ensures consistent ordering for layout detection and segment generation.
    // Without sorting, cabinets might be in arbitrary order (e.g., order of creation),
    // which breaks direction detection and causes wrong layout types.
    const boundsMap = new Map(cabinets.map((c) => [c.id, getCabinetBounds(c, parts)]));
    const sortedCabinets = [...cabinets].sort((a, b) => {
      const boundsA = boundsMap.get(a.id)!;
      const boundsB = boundsMap.get(b.id)!;
      const xDiff = boundsA.center[0] - boundsB.center[0];
      if (Math.abs(xDiff) > 10) return xDiff;
      return boundsA.center[2] - boundsB.center[2];
    });

    const layoutType = CountertopDomain.detectLayoutType(sortedCabinets, parts);
    const defaultOverhang = options?.defaultOverhang
      ? { ...COUNTERTOP_DEFAULTS.OVERHANG, ...options.defaultOverhang }
      : { ...COUNTERTOP_DEFAULTS.OVERHANG };
    const defaultEdgeBanding = options?.defaultEdgeBanding
      ? { ...COUNTERTOP_DEFAULTS.EDGE_BANDING, ...options.defaultEdgeBanding }
      : { ...COUNTERTOP_DEFAULTS.EDGE_BANDING };

    /**
     * Calculate segment dimensions from cabinet LOCAL params (not world bounds)
     * This ensures countertop dimensions don't change when cabinets are rotated
     */
    const createSegmentFromCabinets = (
      name: string,
      group: Cabinet[],
      overhang: CountertopOverhang,
      bridgeGaps?: CabinetGap[]
    ) => {
      // Calculate LOCAL dimensions from cabinet params (rotation-invariant!)
      let totalWidth = 0;
      let maxDepth = 0;

      for (const cabinet of group) {
        const params = cabinet.params as {
          width?: number;
          depth?: number;
          cornerConfig?: { W: number; D: number };
        };

        // Handle corner cabinets
        if (cabinet.type === "CORNER_INTERNAL" || cabinet.type === "CORNER_EXTERNAL") {
          const cc = params.cornerConfig;
          if (cc) {
            // For corner cabinets, use both W and D as they form an L-shape
            // The countertop for corner cabinet itself is handled by splitting
            totalWidth += cc.W;
            maxDepth = Math.max(maxDepth, cc.D);
          }
        } else {
          // Regular cabinets
          totalWidth += params.width || 600;
          maxDepth = Math.max(maxDepth, params.depth || 560);
        }
      }

      // Add BRIDGE gap distances to the total width
      // This ensures the countertop spans over the gaps
      if (bridgeGaps && bridgeGaps.length > 0) {
        const groupCabinetIds = new Set(group.map((c) => c.id));
        for (const gap of bridgeGaps) {
          // Only include gaps where both cabinets are in this group
          if (groupCabinetIds.has(gap.cabinetAId) && groupCabinetIds.has(gap.cabinetBId)) {
            totalWidth += gap.distance;
          }
        }
      }

      return CountertopDomain.createSegment(
        name,
        group.map((c) => c.id),
        {
          length: totalWidth + overhang.left + overhang.right,
          width: maxDepth + overhang.front + overhang.back,
        },
        {
          thickness: options?.thickness,
          overhang: defaultOverhang,
          edgeBanding: defaultEdgeBanding,
        }
      );
    };

    // Separate SPLIT and BRIDGE gaps
    const splitGaps = gaps?.filter((g) => g.mode === "SPLIT") ?? [];
    const bridgeGaps = gaps?.filter((g) => g.mode === "BRIDGE") ?? [];

    // If there are SPLIT gaps, we need to split cabinets into sub-groups
    if (splitGaps.length > 0 && sortedCabinets.length > 1) {
      // Build sub-groups by finding cabinets that are NOT separated by SPLIT gaps
      // Note: sortedCabinets is already sorted at the beginning of the function
      const subGroups: Cabinet[][] = [];
      let currentGroup: Cabinet[] = [sortedCabinets[0]];

      for (let i = 1; i < sortedCabinets.length; i++) {
        const prevCabinet = sortedCabinets[i - 1];
        const currentCabinet = sortedCabinets[i];

        // Check if there's a SPLIT gap between these cabinets
        const hasSplitGap = splitGaps.some(
          (g) =>
            (g.cabinetAId === prevCabinet.id && g.cabinetBId === currentCabinet.id) ||
            (g.cabinetAId === currentCabinet.id && g.cabinetBId === prevCabinet.id)
        );

        if (hasSplitGap) {
          // End current group and start new one
          subGroups.push(currentGroup);
          currentGroup = [currentCabinet];
        } else {
          // Add to current group
          currentGroup.push(currentCabinet);
        }
      }
      // Don't forget the last group
      subGroups.push(currentGroup);

      // Generate segment for each sub-group, passing BRIDGE gaps for width calculation
      const segmentNames = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
      return subGroups.map((group, i) =>
        createSegmentFromCabinets(
          `Blat ${segmentNames[i] || i + 1}`,
          group,
          defaultOverhang,
          bridgeGaps
        )
      );
    }

    // For STRAIGHT layout with no SPLIT gaps, use single segment
    if (layoutType === "STRAIGHT") {
      return [createSegmentFromCabinets("Blat I", sortedCabinets, defaultOverhang, bridgeGaps)];
    }

    // Find actual direction change points for L_SHAPE and U_SHAPE
    const changeIndices = findDirectionChangeIndices(sortedCabinets, parts);

    if (layoutType === "L_SHAPE") {
      // L-shape should have 1 direction change
      if (changeIndices.length === 0) {
        // No direction change detected - treat as single segment
        // This can happen if cabinets are detected as L but actually aligned
        return [createSegmentFromCabinets("Blat I", sortedCabinets, defaultOverhang, bridgeGaps)];
      }

      // Use first direction change point to split
      const splitIndex = changeIndices[0];
      const group1 = sortedCabinets.slice(0, splitIndex);
      const group2 = sortedCabinets.slice(splitIndex);

      const segments: CountertopSegment[] = [];
      if (group1.length > 0) {
        segments.push(createSegmentFromCabinets("Blat I", group1, defaultOverhang, bridgeGaps));
      }
      if (group2.length > 0) {
        segments.push(createSegmentFromCabinets("Blat II", group2, defaultOverhang, bridgeGaps));
      }

      // Ensure we have at least one segment
      if (segments.length === 0) {
        return [createSegmentFromCabinets("Blat I", sortedCabinets, defaultOverhang, bridgeGaps)];
      }

      return segments;
    }

    if (layoutType === "U_SHAPE") {
      // U-shape should have 2 direction changes
      if (changeIndices.length < 2) {
        // Not enough direction changes - fall back to L or straight logic
        if (changeIndices.length === 1) {
          const splitIndex = changeIndices[0];
          const group1 = sortedCabinets.slice(0, splitIndex);
          const group2 = sortedCabinets.slice(splitIndex);

          const segments: CountertopSegment[] = [];
          if (group1.length > 0) {
            segments.push(createSegmentFromCabinets("Blat I", group1, defaultOverhang, bridgeGaps));
          }
          if (group2.length > 0) {
            segments.push(
              createSegmentFromCabinets("Blat II", group2, defaultOverhang, bridgeGaps)
            );
          }
          return segments.length > 0
            ? segments
            : [createSegmentFromCabinets("Blat I", sortedCabinets, defaultOverhang, bridgeGaps)];
        }
        return [createSegmentFromCabinets("Blat I", sortedCabinets, defaultOverhang, bridgeGaps)];
      }

      // Use first two direction change points to create 3 segments
      const split1 = changeIndices[0];
      const split2 = changeIndices[1];

      const groups = [
        sortedCabinets.slice(0, split1),
        sortedCabinets.slice(split1, split2),
        sortedCabinets.slice(split2),
      ];
      const names = ["Blat I", "Blat II", "Blat III"];

      return groups
        .filter((g) => g.length > 0)
        .map((g, i) => createSegmentFromCabinets(names[i], g, defaultOverhang, bridgeGaps));
    }

    return [];
  },

  generateJointsForLayout: (
    segments: CountertopSegment[],
    layoutType: CountertopLayoutType
  ): CountertopJoint[] => {
    if (segments.length < 2) return [];

    return segments
      .slice(0, -1)
      .map((segment, i) =>
        CountertopDomain.createJoint(segment.id, segments[i + 1].id, "MITER_45", 90)
      );
  },

  generateCornersForLayout: (layoutType: CountertopLayoutType): CountertopCornerConfig[] => {
    const cornerCount =
      layoutType === "STRAIGHT"
        ? 4
        : layoutType === "L_SHAPE"
          ? 6
          : layoutType === "U_SHAPE"
            ? 8
            : 4;

    return Array.from({ length: cornerCount }, (_, i) =>
      CountertopDomain.createCorner((i + 1) as CornerPosition, "STRAIGHT")
    );
  },

  // ==========================================================================
  // CALCULATORS - delegated to export module
  // ==========================================================================

  calculateTotalArea,
  calculateTotalAreaM2,
  calculateEdgeBandingLength,

  // ==========================================================================
  // VALIDATORS - delegated to validation module
  // ==========================================================================

  validateSegment,
  validateCncOperation,
  validateGroup,

  // ==========================================================================
  // PRODUCTION DATA - delegated to export module
  // ==========================================================================

  generateProductionData,
  generateCuttingListCsv,

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getSegmentById: (group: CountertopGroup, segmentId: string): CountertopSegment | undefined => {
    return group.segments.find((s) => s.id === segmentId);
  },

  getJointById: (group: CountertopGroup, jointId: string): CountertopJoint | undefined => {
    return group.joints.find((j) => j.id === jointId);
  },

  getCornerByPosition: (
    group: CountertopGroup,
    position: CornerPosition
  ): CountertopCornerConfig | undefined => {
    return group.corners.find((c) => c.position === position);
  },

  segmentHasCncOperations: (segment: CountertopSegment): boolean => {
    return segment.cncOperations.length > 0;
  },

  segmentHasEdgeBanding: (segment: CountertopSegment): boolean => {
    return Object.values(segment.edgeBanding).some((v) => v !== "NONE");
  },

  getLayoutTypeLabel: (layoutType: CountertopLayoutType): string => {
    const labels: Record<CountertopLayoutType, string> = {
      STRAIGHT: "Prosty",
      L_SHAPE: "Kształt L",
      U_SHAPE: "Kształt U",
      ISLAND: "Wyspa",
      PENINSULA: "Półwysep",
    };
    return labels[layoutType] ?? layoutType;
  },

  getJointTypeLabel: (jointType: CountertopJointType): string => {
    const labels: Record<CountertopJointType, string> = {
      MITER_45: "Uciosowe 45°",
      BUTT: "Czołowe",
      EUROPEAN_MITER: "Europejskie",
      PUZZLE: "Puzzle",
    };
    return labels[jointType] ?? jointType;
  },

  getCornerTreatmentLabel: (treatment: CornerTreatment): string => {
    const labels: Record<CornerTreatment, string> = {
      STRAIGHT: "Narożnik prosty",
      CHAMFER: "Ścięcie pod kątem",
      RADIUS: "Zaokrąglenie",
      CLIP: "Ścięcie narożnika",
    };
    return labels[treatment] ?? treatment;
  },

  getSummary: (group: CountertopGroup): string => {
    const segmentCount = group.segments.length;
    const totalArea = calculateTotalAreaM2(group);
    const layout = CountertopDomain.getLayoutTypeLabel(group.layoutType);

    return `${layout}, ${segmentCount} ${segmentCount === 1 ? "segment" : "segmenty"}, ${totalArea.toFixed(2)} m²`;
  },
} as const;
