/**
 * Countertop Store Slice
 *
 * Manages countertop groups for kitchen cabinet configurations.
 * Handles creation, updates, and management of countertop segments,
 * joints, corners, and CNC operations.
 */

import type {
  CountertopGroup,
  CountertopSegment,
  CountertopJoint,
  CountertopJointType,
  CornerPosition,
  CornerTreatment,
  CncOperation,
  CncOperationType,
  EdgeBandingOption,
  EdgeId,
  CountertopOverhang,
  CountertopGroupOptions,
  CutoutPresetType,
  CountertopProductionData,
  CabinetCountertopConfig,
} from '@/types/countertop';
import type { Cabinet, Part, Material, KitchenCabinetParams } from '@/types';
import { CountertopDomain } from '@/lib/domain/countertop';
import type { StoreSlice } from '../types';
import { HISTORY_LABELS } from '../history/constants';
import { generateId, inferKindFromType } from '../history/utils';

/**
 * Countertop slice interface
 */
export interface CountertopSlice {
  // State
  countertopGroups: CountertopGroup[];
  selectedCountertopGroupId: string | null;

  // Selection
  selectCountertopGroup: (id: string | null) => void;

  // Group CRUD
  addCountertopGroup: (
    furnitureId: string,
    cabinetIds: string[],
    materialId: string,
    options?: CountertopGroupOptions,
    skipHistory?: boolean
  ) => void;
  updateCountertopGroup: (
    id: string,
    patch: Partial<Omit<CountertopGroup, 'id' | 'createdAt'>>,
    skipHistory?: boolean
  ) => void;
  removeCountertopGroup: (id: string, skipHistory?: boolean) => void;

  // Auto-generation
  generateCountertopsForFurniture: (furnitureId: string, materialId: string) => void;
  regenerateCountertopGroup: (groupId: string) => void;

  // Segment operations
  updateSegment: (
    groupId: string,
    segmentId: string,
    patch: Partial<Omit<CountertopSegment, 'id'>>,
    skipHistory?: boolean
  ) => void;
  updateSegmentDimensions: (
    groupId: string,
    segmentId: string,
    dimensions: { length?: number; width?: number; thickness?: number }
  ) => void;
  updateSegmentOverhang: (
    groupId: string,
    segmentId: string,
    overhang: Partial<CountertopOverhang>
  ) => void;
  updateSegmentEdgeBanding: (
    groupId: string,
    segmentId: string,
    edge: EdgeId,
    option: EdgeBandingOption
  ) => void;
  updateSegmentGrain: (
    groupId: string,
    segmentId: string,
    grainAlongLength: boolean
  ) => void;

  // CNC operations
  addCncOperation: (
    groupId: string,
    segmentId: string,
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation['dimensions'],
    skipHistory?: boolean
  ) => void;
  addCncOperationFromPreset: (
    groupId: string,
    segmentId: string,
    preset: CutoutPresetType,
    position: { x: number; y: number },
    skipHistory?: boolean
  ) => void;
  updateCncOperation: (
    groupId: string,
    segmentId: string,
    operationId: string,
    updates: Partial<Omit<CncOperation, 'id'>>,
    skipHistory?: boolean
  ) => void;
  removeCncOperation: (groupId: string, segmentId: string, operationId: string, skipHistory?: boolean) => void;

  // Corner operations
  updateCornerTreatment: (
    groupId: string,
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: { chamferAngle?: number; radius?: number; clipSize?: number },
    skipHistory?: boolean
  ) => void;

  // Joint operations
  updateJointType: (groupId: string, jointId: string, type: CountertopJointType, skipHistory?: boolean) => void;

  // Export
  exportCountertopGroupCsv: (groupId: string) => string | null;
  getCountertopProductionData: (groupId: string) => CountertopProductionData | null;

  // Queries
  getCountertopGroupsForFurniture: (furnitureId: string) => CountertopGroup[];
  getCountertopGroupForCabinet: (cabinetId: string) => CountertopGroup | undefined;

  // Batch operations
  /** Apply countertop config to all kitchen cabinets in a furniture */
  applyCountertopConfigToAllKitchenCabinets: (
    furnitureId: string,
    config: CabinetCountertopConfig,
    skipHistory?: boolean
  ) => void;

  /** Get count of kitchen cabinets in a furniture (excluding specified cabinet) */
  getOtherKitchenCabinetsCount: (furnitureId: string, excludeCabinetId?: string) => number;
}

export const createCountertopSlice: StoreSlice<CountertopSlice> = (set, get) => ({
  countertopGroups: [],
  selectedCountertopGroupId: null,

  // ==========================================================================
  // Selection
  // ==========================================================================

  selectCountertopGroup: (id: string | null) => {
    set({ selectedCountertopGroupId: id });
  },

  // ==========================================================================
  // Group CRUD Operations
  // ==========================================================================

  addCountertopGroup: (
    furnitureId: string,
    cabinetIds: string[],
    materialId: string,
    options?: CountertopGroupOptions,
    skipHistory = false
  ) => {
    const cabinets = get().cabinets.filter(c => cabinetIds.includes(c.id));
    const parts = get().parts;

    if (cabinets.length === 0) {
      console.warn('No cabinets found for countertop group');
      return;
    }

    const group = CountertopDomain.createGroup(
      furnitureId,
      cabinets,
      parts,
      materialId,
      options
    );

    const index = get().countertopGroups.length;

    set((state) => ({
      countertopGroups: [...state.countertopGroups, group],
      selectedCountertopGroupId: group.id,
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'ADD_COUNTERTOP_GROUP',
        targetId: group.id,
        furnitureId,
        before: null,
        after: { group: { ...group, _index: index } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_COUNTERTOP_GROUP,
          kind: inferKindFromType('ADD_COUNTERTOP_GROUP'),
        },
      });
    }
  },

  updateCountertopGroup: (id: string, patch: Partial<Omit<CountertopGroup, 'id' | 'createdAt'>>, skipHistory = false) => {
    const group = get().countertopGroups.find(g => g.id === id);
    if (!group) return;

    const beforeSnapshot = { group: { ...group } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === id
          ? { ...g, ...patch, updatedAt: new Date() }
          : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find(g => g.id === id);
      get().pushEntry({
        type: 'UPDATE_COUNTERTOP_GROUP',
        targetId: id,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: { group: { ...updatedGroup! } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.UPDATE_COUNTERTOP_GROUP,
          kind: inferKindFromType('UPDATE_COUNTERTOP_GROUP'),
        },
      });
    }
  },

  removeCountertopGroup: (id: string, skipHistory = false) => {
    const group = get().countertopGroups.find(g => g.id === id);
    if (!group) return;

    const index = get().countertopGroups.findIndex(g => g.id === id);
    const beforeSnapshot = { group: { ...group, _index: index } };

    set((state) => ({
      countertopGroups: state.countertopGroups.filter((g) => g.id !== id),
      selectedCountertopGroupId:
        state.selectedCountertopGroupId === id ? null : state.selectedCountertopGroupId,
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'REMOVE_COUNTERTOP_GROUP',
        targetId: id,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: null,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_COUNTERTOP_GROUP,
          kind: inferKindFromType('REMOVE_COUNTERTOP_GROUP'),
        },
      });
    }
  },

  // ==========================================================================
  // Auto-generation
  // ==========================================================================

  generateCountertopsForFurniture: (furnitureId: string, materialId: string) => {
    const cabinets = get().cabinets.filter(c => c.furnitureId === furnitureId);
    const parts = get().parts;

    // Remove existing countertop groups for this furniture
    set((state) => ({
      countertopGroups: state.countertopGroups.filter(g => g.furnitureId !== furnitureId),
    }));

    // Detect adjacent cabinet groups
    const adjacentGroups = CountertopDomain.detectAdjacentCabinets(cabinets, parts);

    // Create a countertop group for each adjacent group
    const newGroups: CountertopGroup[] = adjacentGroups.map((cabinetGroup, index) => {
      return CountertopDomain.createGroup(
        furnitureId,
        cabinetGroup,
        parts,
        materialId,
        { name: `Blat ${index + 1}` }
      );
    });

    set((state) => ({
      countertopGroups: [...state.countertopGroups, ...newGroups],
      selectedCountertopGroupId: newGroups.length > 0 ? newGroups[0].id : null,
    }));
  },

  regenerateCountertopGroup: (groupId: string) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const cabinetIds = group.segments.flatMap(s => s.cabinetIds);
    const cabinets = get().cabinets.filter(c => cabinetIds.includes(c.id));
    const parts = get().parts;

    const newSegments = CountertopDomain.generateSegmentsFromCabinets(
      cabinets,
      parts,
      { thickness: group.thickness }
    );

    const layoutType = CountertopDomain.detectLayoutType(cabinets, parts);
    const newJoints = CountertopDomain.generateJointsForLayout(newSegments, layoutType);
    const newCorners = CountertopDomain.generateCornersForLayout(layoutType);

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              layoutType,
              segments: newSegments,
              joints: newJoints,
              corners: newCorners,
              updatedAt: new Date(),
            }
          : g
      ),
    }));
  },

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  updateSegment: (
    groupId: string,
    segmentId: string,
    patch: Partial<Omit<CountertopSegment, 'id'>>,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const beforeSnapshot = { groupId, segment: { ...segment } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId
          ? CountertopDomain.updateSegmentInGroup(g, segmentId, patch)
          : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find(g => g.id === groupId);
      const updatedSegment = updatedGroup?.segments.find((s: CountertopSegment) => s.id === segmentId);
      if (updatedSegment) {
        get().pushEntry({
          type: 'UPDATE_COUNTERTOP_SEGMENT',
          targetId: segmentId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, segment: { ...updatedSegment } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_SEGMENT,
            kind: inferKindFromType('UPDATE_COUNTERTOP_SEGMENT'),
          },
        });
      }
    }
  },

  updateSegmentDimensions: (
    groupId: string,
    segmentId: string,
    dimensions: { length?: number; width?: number; thickness?: number }
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = CountertopDomain.updateSegmentDimensions(segment, dimensions);
    // Delegate to updateSegment for history tracking
    get().updateSegment(groupId, segmentId, updatedSegment);
  },

  updateSegmentOverhang: (
    groupId: string,
    segmentId: string,
    overhang: Partial<CountertopOverhang>
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = CountertopDomain.updateSegmentOverhang(segment, overhang);
    // Delegate to updateSegment for history tracking
    get().updateSegment(groupId, segmentId, updatedSegment);
  },

  updateSegmentEdgeBanding: (
    groupId: string,
    segmentId: string,
    edge: EdgeId,
    option: EdgeBandingOption
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = CountertopDomain.updateSegmentEdgeBanding(segment, edge, option);
    // Delegate to updateSegment for history tracking
    get().updateSegment(groupId, segmentId, updatedSegment);
  },

  updateSegmentGrain: (
    groupId: string,
    segmentId: string,
    grainAlongLength: boolean
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = CountertopDomain.updateSegmentGrain(segment, grainAlongLength);
    // Delegate to updateSegment for history tracking
    get().updateSegment(groupId, segmentId, updatedSegment);
  },

  // ==========================================================================
  // CNC Operations
  // ==========================================================================

  addCncOperation: (
    groupId: string,
    segmentId: string,
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation['dimensions'],
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const operation = CountertopDomain.createCncOperation(type, position, dimensions);

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) => {
        if (g.id !== groupId) return g;

        const seg = g.segments.find((s: CountertopSegment) => s.id === segmentId);
        if (!seg) return g;

        const updatedSegment = CountertopDomain.addCncOperation(seg, operation);
        return CountertopDomain.updateSegmentInGroup(g, segmentId, updatedSegment);
      }),
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'ADD_CNC_OPERATION',
        targetId: operation.id,
        furnitureId: group.furnitureId,
        before: null,
        after: { groupId, segmentId, operation: { ...operation } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_CNC_OPERATION,
          kind: inferKindFromType('ADD_CNC_OPERATION'),
        },
      });
    }
  },

  addCncOperationFromPreset: (
    groupId: string,
    segmentId: string,
    preset: CutoutPresetType,
    position: { x: number; y: number },
    skipHistory = false
  ) => {
    const operation = CountertopDomain.createCncOperationFromPreset(preset, position);
    if (!operation) return;

    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) => {
        if (g.id !== groupId) return g;

        const segment = g.segments.find((s: CountertopSegment) => s.id === segmentId);
        if (!segment) return g;

        const updatedSegment = CountertopDomain.addCncOperation(segment, operation);
        return CountertopDomain.updateSegmentInGroup(g, segmentId, updatedSegment);
      }),
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'ADD_CNC_OPERATION',
        targetId: operation.id,
        furnitureId: group.furnitureId,
        before: null,
        after: { groupId, segmentId, operation: { ...operation } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_CNC_OPERATION,
          kind: inferKindFromType('ADD_CNC_OPERATION'),
        },
      });
    }
  },

  updateCncOperation: (
    groupId: string,
    segmentId: string,
    operationId: string,
    updates: Partial<Omit<CncOperation, 'id'>>,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const operation = segment.cncOperations.find((o: CncOperation) => o.id === operationId);
    if (!operation) return;

    const beforeSnapshot = { groupId, segmentId, operation: { ...operation } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) => {
        if (g.id !== groupId) return g;

        const seg = g.segments.find((s: CountertopSegment) => s.id === segmentId);
        if (!seg) return g;

        const updatedSegment = CountertopDomain.updateCncOperation(seg, operationId, updates);
        return CountertopDomain.updateSegmentInGroup(g, segmentId, updatedSegment);
      }),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find(g => g.id === groupId);
      const updatedSegment = updatedGroup?.segments.find((s: CountertopSegment) => s.id === segmentId);
      const updatedOp = updatedSegment?.cncOperations.find((o: CncOperation) => o.id === operationId);
      if (updatedOp) {
        get().pushEntry({
          type: 'UPDATE_CNC_OPERATION',
          targetId: operationId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, segmentId, operation: { ...updatedOp } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_CNC_OPERATION,
            kind: inferKindFromType('UPDATE_CNC_OPERATION'),
          },
        });
      }
    }
  },

  removeCncOperation: (groupId: string, segmentId: string, operationId: string, skipHistory = false) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const operation = segment.cncOperations.find((o: CncOperation) => o.id === operationId);
    if (!operation) return;

    const beforeSnapshot = { groupId, segmentId, operation: { ...operation } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) => {
        if (g.id !== groupId) return g;

        const seg = g.segments.find((s: CountertopSegment) => s.id === segmentId);
        if (!seg) return g;

        const updatedSegment = CountertopDomain.removeCncOperation(seg, operationId);
        return CountertopDomain.updateSegmentInGroup(g, segmentId, updatedSegment);
      }),
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'REMOVE_CNC_OPERATION',
        targetId: operationId,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: null,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_CNC_OPERATION,
          kind: inferKindFromType('REMOVE_CNC_OPERATION'),
        },
      });
    }
  },

  // ==========================================================================
  // Corner Operations
  // ==========================================================================

  updateCornerTreatment: (
    groupId: string,
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: { chamferAngle?: number; radius?: number; clipSize?: number },
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const corner = group.corners.find(c => c.position === position);
    const beforeSnapshot = corner
      ? { groupId, corner: { ...corner } }
      : { groupId, corner: { position, treatment: 'SQUARE' as CornerTreatment } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId
          ? CountertopDomain.updateCorner(g, position, treatment, params)
          : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find(g => g.id === groupId);
      const updatedCorner = updatedGroup?.corners.find(c => c.position === position);
      if (updatedCorner) {
        get().pushEntry({
          type: 'UPDATE_COUNTERTOP_CORNER',
          targetId: `${groupId}-corner-${position}`,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, corner: { ...updatedCorner } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_CORNER,
            kind: inferKindFromType('UPDATE_COUNTERTOP_CORNER'),
          },
        });
      }
    }
  },

  // ==========================================================================
  // Joint Operations
  // ==========================================================================

  updateJointType: (groupId: string, jointId: string, type: CountertopJointType, skipHistory = false) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return;

    const joint = group.joints.find((j: CountertopJoint) => j.id === jointId);
    if (!joint) return;

    const beforeSnapshot = { groupId, joint: { ...joint } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId
          ? CountertopDomain.updateJointType(g, jointId, type)
          : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find(g => g.id === groupId);
      const updatedJoint = updatedGroup?.joints.find((j: CountertopJoint) => j.id === jointId);
      if (updatedJoint) {
        get().pushEntry({
          type: 'UPDATE_COUNTERTOP_JOINT',
          targetId: jointId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, joint: { ...updatedJoint } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_JOINT,
            kind: inferKindFromType('UPDATE_COUNTERTOP_JOINT'),
          },
        });
      }
    }
  },

  // ==========================================================================
  // Export
  // ==========================================================================

  exportCountertopGroupCsv: (groupId: string): string | null => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return null;

    const material = get().materials.find(m => m.id === group.materialId);
    if (!material) return null;

    return CountertopDomain.generateCuttingListCsv(group, material);
  },

  getCountertopProductionData: (groupId: string) => {
    const group = get().countertopGroups.find(g => g.id === groupId);
    if (!group) return null;

    const material = get().materials.find(m => m.id === group.materialId);
    if (!material) return null;

    return CountertopDomain.generateProductionData(group, material);
  },

  // ==========================================================================
  // Queries
  // ==========================================================================

  getCountertopGroupsForFurniture: (furnitureId: string) => {
    return get().countertopGroups.filter(g => g.furnitureId === furnitureId);
  },

  getCountertopGroupForCabinet: (cabinetId: string) => {
    return get().countertopGroups.find(g =>
      g.segments.some(s => s.cabinetIds.includes(cabinetId))
    );
  },

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  applyCountertopConfigToAllKitchenCabinets: (
    furnitureId: string,
    config: CabinetCountertopConfig,
    skipHistory = false
  ) => {
    const state = get();
    const kitchenCabinets = state.cabinets.filter(
      c => c.furnitureId === furnitureId && c.type === 'KITCHEN'
    );

    if (kitchenCabinets.length === 0) return;

    // Capture before state for history
    const beforeConfigs = kitchenCabinets.map(cabinet => ({
      cabinetId: cabinet.id,
      config: (cabinet.params as KitchenCabinetParams).countertopConfig,
    }));

    const now = new Date();
    set((s) => ({
      cabinets: s.cabinets.map((cabinet) => {
        if (cabinet.furnitureId !== furnitureId || cabinet.type !== 'KITCHEN') {
          return cabinet;
        }

        // Update params with new countertop config
        const updatedParams = {
          ...cabinet.params,
          countertopConfig: config,
        } as KitchenCabinetParams;

        return {
          ...cabinet,
          params: updatedParams,
          updatedAt: now,
        };
      }),
    }));

    if (!skipHistory) {
      // Capture after state
      const afterConfigs = kitchenCabinets.map(cabinet => ({
        cabinetId: cabinet.id,
        config,
      }));

      get().pushEntry({
        type: 'BATCH_UPDATE_COUNTERTOP_CONFIG',
        targetIds: kitchenCabinets.map(c => c.id),
        furnitureId,
        before: { furnitureId, cabinetConfigs: beforeConfigs },
        after: { furnitureId, cabinetConfigs: afterConfigs },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.BATCH_UPDATE_COUNTERTOP_CONFIG,
          kind: inferKindFromType('BATCH_UPDATE_COUNTERTOP_CONFIG'),
        },
      });
    }
  },

  getOtherKitchenCabinetsCount: (furnitureId: string, excludeCabinetId?: string) => {
    const kitchenCabinets = get().cabinets.filter(
      c => c.furnitureId === furnitureId && c.type === 'KITCHEN'
    );

    if (excludeCabinetId) {
      return kitchenCabinets.filter(c => c.id !== excludeCabinetId).length;
    }

    return kitchenCabinets.length;
  },
});
