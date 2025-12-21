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
} from '@/types/countertop';
import {
  generateCountertopGroupId,
  generateSegmentId,
  generateJointId,
  generateCncOperationId,
  generateCornerId,
} from '@/types/countertop';
import type { Cabinet, Part, Material } from '@/types';
import {
  COUNTERTOP_DEFAULTS,
  COUNTERTOP_LIMITS,
  JOINT_HARDWARE_PRESETS,
  CUTOUT_PRESETS,
  CABINET_ADJACENCY_THRESHOLD,
} from '@/lib/config';

// Import from split modules
import {
  clamp,
  getCabinetBounds,
  areCabinetsAdjacent,
  findConnectedComponents,
} from './helpers';
import {
  validateSegment,
  validateCncOperation,
  validateGroup,
} from './validation';
import {
  calculateTotalArea,
  calculateTotalAreaM2,
  calculateEdgeBandingLength,
  generateProductionData,
  generateCuttingListCsv,
} from './export';

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
    options?: Partial<Omit<CountertopSegment, 'id' | 'name' | 'cabinetIds' | 'length' | 'width'>>
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
    type: CountertopJointType = 'MITER_45',
    angle: number = 90
  ): CountertopJoint => ({
    id: generateJointId(),
    type,
    segmentAId,
    segmentBId,
    angle,
    hardware: { ...JOINT_HARDWARE_PRESETS[type] },
    notchDepth: type === 'MITER_45' || type === 'EUROPEAN_MITER' ? 650 : undefined,
  }),

  createCorner: (
    position: CornerPosition,
    treatment: CornerTreatment = 'STRAIGHT',
    params?: { chamferAngle?: number; radius?: number; clipSize?: number }
  ): CountertopCornerConfig => ({
    id: generateCornerId(),
    position,
    treatment,
    chamferAngle: treatment === 'CHAMFER' ? (params?.chamferAngle ?? 45) : undefined,
    radius: treatment === 'RADIUS' ? (params?.radius ?? 30) : undefined,
    clipSize: treatment === 'CLIP' ? (params?.clipSize ?? 30) : undefined,
  }),

  createCncOperation: (
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation['dimensions'],
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
    if (preset === 'NONE') return null;

    const presetConfig = CUTOUT_PRESETS[preset];
    const { dimensions } = presetConfig;

    const type: CncOperationType = dimensions.diameter
      ? 'CIRCULAR_HOLE'
      : 'RECTANGULAR_CUTOUT';

    return CountertopDomain.createCncOperation(type, position, dimensions, preset);
  },

  createGroup: (
    furnitureId: string,
    cabinets: Cabinet[],
    parts: Part[],
    materialId: string,
    options?: CountertopGroupOptions
  ): CountertopGroup => {
    const layoutType = CountertopDomain.detectLayoutType(cabinets, parts);
    const segments = CountertopDomain.generateSegmentsFromCabinets(cabinets, parts, options);
    const joints = CountertopDomain.generateJointsForLayout(segments, layoutType);
    const corners = CountertopDomain.generateCornersForLayout(layoutType);

    return {
      id: generateCountertopGroupId(),
      name: options?.name ?? `Blat ${layoutType === 'STRAIGHT' ? 'prosty' : layoutType === 'L_SHAPE' ? 'L' : layoutType}`,
      furnitureId,
      layoutType,
      materialId,
      segments,
      joints,
      corners,
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
    length: dimensions.length !== undefined
      ? clamp(dimensions.length, COUNTERTOP_LIMITS.LENGTH.min, COUNTERTOP_LIMITS.LENGTH.max)
      : segment.length,
    width: dimensions.width !== undefined
      ? clamp(dimensions.width, COUNTERTOP_LIMITS.WIDTH.min, COUNTERTOP_LIMITS.WIDTH.max)
      : segment.width,
    thickness: dimensions.thickness !== undefined
      ? clamp(dimensions.thickness, COUNTERTOP_LIMITS.THICKNESS.min, COUNTERTOP_LIMITS.THICKNESS.max)
      : segment.thickness,
  }),

  updateSegmentOverhang: (
    segment: CountertopSegment,
    overhang: Partial<CountertopOverhang>
  ): CountertopSegment => ({
    ...segment,
    overhang: {
      front: overhang.front !== undefined
        ? clamp(overhang.front, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
        : segment.overhang.front,
      back: overhang.back !== undefined
        ? clamp(overhang.back, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
        : segment.overhang.back,
      left: overhang.left !== undefined
        ? clamp(overhang.left, COUNTERTOP_LIMITS.OVERHANG.min, COUNTERTOP_LIMITS.OVERHANG.max)
        : segment.overhang.left,
      right: overhang.right !== undefined
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

  addCncOperation: (
    segment: CountertopSegment,
    operation: CncOperation
  ): CountertopSegment => ({
    ...segment,
    cncOperations: [...segment.cncOperations, operation],
  }),

  removeCncOperation: (
    segment: CountertopSegment,
    operationId: string
  ): CountertopSegment => ({
    ...segment,
    cncOperations: segment.cncOperations.filter(op => op.id !== operationId),
  }),

  updateCncOperation: (
    segment: CountertopSegment,
    operationId: string,
    updates: Partial<Omit<CncOperation, 'id'>>
  ): CountertopSegment => ({
    ...segment,
    cncOperations: segment.cncOperations.map(op =>
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
    corners: group.corners.map(corner =>
      corner.position === position
        ? {
            ...corner,
            treatment,
            chamferAngle: treatment === 'CHAMFER' ? (params?.chamferAngle ?? 45) : undefined,
            radius: treatment === 'RADIUS' ? (params?.radius ?? 30) : undefined,
            clipSize: treatment === 'CLIP' ? (params?.clipSize ?? 30) : undefined,
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
    joints: group.joints.map(joint =>
      joint.id === jointId
        ? {
            ...joint,
            type,
            hardware: { ...JOINT_HARDWARE_PRESETS[type] },
            notchDepth: type === 'MITER_45' || type === 'EUROPEAN_MITER' ? 650 : undefined,
          }
        : joint
    ),
    updatedAt: new Date(),
  }),

  updateSegmentInGroup: (
    group: CountertopGroup,
    segmentId: string,
    updates: Partial<Omit<CountertopSegment, 'id'>>
  ): CountertopGroup => ({
    ...group,
    segments: group.segments.map(segment =>
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
    threshold: number = CABINET_ADJACENCY_THRESHOLD
  ): Cabinet[][] => {
    const eligibleTypes = ['KITCHEN', 'CORNER_INTERNAL', 'CORNER_EXTERNAL'];
    const eligible = cabinets.filter(c => eligibleTypes.includes(c.type));

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

  detectLayoutType: (
    cabinets: Cabinet[],
    parts: Part[]
  ): CountertopLayoutType => {
    if (cabinets.length === 0) return 'STRAIGHT';
    if (cabinets.length === 1) {
      if (cabinets[0].type === 'CORNER_INTERNAL' || cabinets[0].type === 'CORNER_EXTERNAL') {
        return 'L_SHAPE';
      }
      return 'STRAIGHT';
    }

    const centers = cabinets.map(c => getCabinetBounds(c, parts).center);
    const directions: [number, number][] = [];

    for (let i = 1; i < centers.length; i++) {
      const dx = centers[i][0] - centers[i - 1][0];
      const dz = centers[i][2] - centers[i - 1][2];
      const mag = Math.sqrt(dx * dx + dz * dz);
      if (mag > 0) {
        directions.push([dx / mag, dz / mag]);
      }
    }

    if (directions.length === 0) return 'STRAIGHT';

    let angleChanges = 0;
    for (let i = 1; i < directions.length; i++) {
      const dot = directions[i][0] * directions[i - 1][0] + directions[i][1] * directions[i - 1][1];
      const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      if (angle > 45) {
        angleChanges++;
      }
    }

    const hasCornerCabinet = cabinets.some(
      c => c.type === 'CORNER_INTERNAL' || c.type === 'CORNER_EXTERNAL'
    );

    if (angleChanges === 0 && !hasCornerCabinet) return 'STRAIGHT';
    if (angleChanges === 1 || hasCornerCabinet) return 'L_SHAPE';
    if (angleChanges >= 2) return 'U_SHAPE';

    return 'STRAIGHT';
  },

  generateSegmentsFromCabinets: (
    cabinets: Cabinet[],
    parts: Part[],
    options?: CountertopGroupOptions
  ): CountertopSegment[] => {
    if (cabinets.length === 0) return [];

    const layoutType = CountertopDomain.detectLayoutType(cabinets, parts);
    const defaultOverhang = options?.defaultOverhang
      ? { ...COUNTERTOP_DEFAULTS.OVERHANG, ...options.defaultOverhang }
      : { ...COUNTERTOP_DEFAULTS.OVERHANG };
    const defaultEdgeBanding = options?.defaultEdgeBanding
      ? { ...COUNTERTOP_DEFAULTS.EDGE_BANDING, ...options.defaultEdgeBanding }
      : { ...COUNTERTOP_DEFAULTS.EDGE_BANDING };

    const createSegmentFromBounds = (
      name: string,
      group: Cabinet[],
      overhang: CountertopOverhang
    ) => {
      const bounds = group.map(c => getCabinetBounds(c, parts));
      const minX = Math.min(...bounds.map(b => b.min[0]));
      const maxX = Math.max(...bounds.map(b => b.max[0]));
      const minZ = Math.min(...bounds.map(b => b.min[2]));
      const maxZ = Math.max(...bounds.map(b => b.max[2]));

      return CountertopDomain.createSegment(
        name,
        group.map(c => c.id),
        {
          length: maxX - minX + overhang.left + overhang.right,
          width: maxZ - minZ + overhang.front + overhang.back,
        },
        {
          thickness: options?.thickness,
          overhang: defaultOverhang,
          edgeBanding: defaultEdgeBanding,
        }
      );
    };

    if (layoutType === 'STRAIGHT') {
      return [createSegmentFromBounds('Blat I', cabinets, defaultOverhang)];
    }

    if (layoutType === 'L_SHAPE') {
      const midIndex = Math.ceil(cabinets.length / 2);
      const group1 = cabinets.slice(0, midIndex);
      const group2 = cabinets.slice(midIndex);

      const segments = [createSegmentFromBounds('Blat I', group1, defaultOverhang)];
      if (group2.length > 0) {
        segments.push(createSegmentFromBounds('Blat II', group2, defaultOverhang));
      }
      return segments;
    }

    if (layoutType === 'U_SHAPE') {
      const third = Math.ceil(cabinets.length / 3);
      const groups = [
        cabinets.slice(0, third),
        cabinets.slice(third, third * 2),
        cabinets.slice(third * 2),
      ];
      const names = ['Blat I', 'Blat II', 'Blat III'];

      return groups
        .filter(g => g.length > 0)
        .map((g, i) => createSegmentFromBounds(names[i], g, defaultOverhang));
    }

    return [];
  },

  generateJointsForLayout: (
    segments: CountertopSegment[],
    layoutType: CountertopLayoutType
  ): CountertopJoint[] => {
    if (segments.length < 2) return [];

    return segments.slice(0, -1).map((segment, i) =>
      CountertopDomain.createJoint(segment.id, segments[i + 1].id, 'MITER_45', 90)
    );
  },

  generateCornersForLayout: (layoutType: CountertopLayoutType): CountertopCornerConfig[] => {
    const cornerCount = layoutType === 'STRAIGHT' ? 4 :
                        layoutType === 'L_SHAPE' ? 6 :
                        layoutType === 'U_SHAPE' ? 8 : 4;

    return Array.from({ length: cornerCount }, (_, i) =>
      CountertopDomain.createCorner((i + 1) as CornerPosition, 'STRAIGHT')
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
    return group.segments.find(s => s.id === segmentId);
  },

  getJointById: (group: CountertopGroup, jointId: string): CountertopJoint | undefined => {
    return group.joints.find(j => j.id === jointId);
  },

  getCornerByPosition: (group: CountertopGroup, position: CornerPosition): CountertopCornerConfig | undefined => {
    return group.corners.find(c => c.position === position);
  },

  segmentHasCncOperations: (segment: CountertopSegment): boolean => {
    return segment.cncOperations.length > 0;
  },

  segmentHasEdgeBanding: (segment: CountertopSegment): boolean => {
    return Object.values(segment.edgeBanding).some(v => v !== 'NONE');
  },

  getLayoutTypeLabel: (layoutType: CountertopLayoutType): string => {
    const labels: Record<CountertopLayoutType, string> = {
      STRAIGHT: 'Prosty',
      L_SHAPE: 'Kształt L',
      U_SHAPE: 'Kształt U',
      ISLAND: 'Wyspa',
      PENINSULA: 'Półwysep',
    };
    return labels[layoutType] ?? layoutType;
  },

  getJointTypeLabel: (jointType: CountertopJointType): string => {
    const labels: Record<CountertopJointType, string> = {
      MITER_45: 'Uciosowe 45°',
      BUTT: 'Czołowe',
      EUROPEAN_MITER: 'Europejskie',
      PUZZLE: 'Puzzle',
    };
    return labels[jointType] ?? jointType;
  },

  getCornerTreatmentLabel: (treatment: CornerTreatment): string => {
    const labels: Record<CornerTreatment, string> = {
      STRAIGHT: 'Narożnik prosty',
      CHAMFER: 'Ścięcie pod kątem',
      RADIUS: 'Zaokrąglenie',
      CLIP: 'Ścięcie narożnika',
    };
    return labels[treatment] ?? treatment;
  },

  getSummary: (group: CountertopGroup): string => {
    const segmentCount = group.segments.length;
    const totalArea = calculateTotalAreaM2(group);
    const layout = CountertopDomain.getLayoutTypeLabel(group.layoutType);

    return `${layout}, ${segmentCount} ${segmentCount === 1 ? 'segment' : 'segmenty'}, ${totalArea.toFixed(2)} m²`;
  },
} as const;
