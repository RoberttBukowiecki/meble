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
  CabinetGap,
  CabinetGapMode,
} from "@/types/countertop";
import type { Cabinet, Part, Material, KitchenCabinetParams } from "@/types";
import { CountertopDomain } from "@/lib/domain/countertop";
import { getCabinetBounds } from "@/lib/domain/countertop/helpers";
import type { StoreSlice } from "../types";
import { HISTORY_LABELS } from "../history/constants";
import { generateId, inferKindFromType } from "../history/utils";

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
    patch: Partial<Omit<CountertopGroup, "id" | "createdAt">>,
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
    patch: Partial<Omit<CountertopSegment, "id">>,
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
  updateSegmentGrain: (groupId: string, segmentId: string, grainAlongLength: boolean) => void;

  // CNC operations
  addCncOperation: (
    groupId: string,
    segmentId: string,
    type: CncOperationType,
    position: { x: number; y: number },
    dimensions: CncOperation["dimensions"],
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
    updates: Partial<Omit<CncOperation, "id">>,
    skipHistory?: boolean
  ) => void;
  removeCncOperation: (
    groupId: string,
    segmentId: string,
    operationId: string,
    skipHistory?: boolean
  ) => void;

  // Corner operations
  updateCornerTreatment: (
    groupId: string,
    position: CornerPosition,
    treatment: CornerTreatment,
    params?: { chamferAngle?: number; radius?: number; clipSize?: number },
    skipHistory?: boolean
  ) => void;

  // Joint operations
  updateJointType: (
    groupId: string,
    jointId: string,
    type: CountertopJointType,
    skipHistory?: boolean
  ) => void;

  // Export
  exportCountertopGroupCsv: (groupId: string) => string | null;
  getCountertopProductionData: (groupId: string) => CountertopProductionData | null;

  // Queries
  getCountertopGroupsForFurniture: (furnitureId: string) => CountertopGroup[];
  getCountertopGroupForCabinet: (cabinetId: string) => CountertopGroup | undefined;

  // Material sync operations
  /** Update countertop group material and sync to all cabinets in the group */
  updateCountertopGroupMaterial: (
    groupId: string,
    materialId: string,
    skipHistory?: boolean
  ) => void;

  /** Separate a cabinet from its countertop group (sets excludeFromGroup and regenerates) */
  separateCabinetFromGroup: (cabinetId: string, skipHistory?: boolean) => void;

  // Batch operations
  /** Apply countertop config to all kitchen cabinets in a furniture */
  applyCountertopConfigToAllKitchenCabinets: (
    furnitureId: string,
    config: CabinetCountertopConfig,
    skipHistory?: boolean
  ) => void;

  /** Get count of kitchen cabinets in a furniture (excluding specified cabinet) */
  getOtherKitchenCabinetsCount: (furnitureId: string, excludeCabinetId?: string) => number;

  // Gap operations
  /** Update gap mode (BRIDGE or SPLIT) and regenerate segments accordingly */
  updateGapMode: (
    groupId: string,
    gapId: string,
    mode: CabinetGapMode,
    skipHistory?: boolean
  ) => void;
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
    const cabinets = get().cabinets.filter((c) => cabinetIds.includes(c.id));
    const parts = get().parts;

    if (cabinets.length === 0) {
      console.warn("No cabinets found for countertop group");
      return;
    }

    const group = CountertopDomain.createGroup(furnitureId, cabinets, parts, materialId, options);

    const index = get().countertopGroups.length;

    set((state) => ({
      countertopGroups: [...state.countertopGroups, group],
      selectedCountertopGroupId: group.id,
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: "ADD_COUNTERTOP_GROUP",
        targetId: group.id,
        furnitureId,
        before: null,
        after: { group: { ...group, _index: index } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_COUNTERTOP_GROUP,
          kind: inferKindFromType("ADD_COUNTERTOP_GROUP"),
        },
      });
    }
  },

  updateCountertopGroup: (
    id: string,
    patch: Partial<Omit<CountertopGroup, "id" | "createdAt">>,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === id);
    if (!group) return;

    const beforeSnapshot = { group: { ...group } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === id ? { ...g, ...patch, updatedAt: new Date() } : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === id);
      get().pushEntry({
        type: "UPDATE_COUNTERTOP_GROUP",
        targetId: id,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: { group: { ...updatedGroup! } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.UPDATE_COUNTERTOP_GROUP,
          kind: inferKindFromType("UPDATE_COUNTERTOP_GROUP"),
        },
      });
    }
  },

  removeCountertopGroup: (id: string, skipHistory = false) => {
    const group = get().countertopGroups.find((g) => g.id === id);
    if (!group) return;

    const index = get().countertopGroups.findIndex((g) => g.id === id);
    const beforeSnapshot = { group: { ...group, _index: index } };

    set((state) => ({
      countertopGroups: state.countertopGroups.filter((g) => g.id !== id),
      selectedCountertopGroupId:
        state.selectedCountertopGroupId === id ? null : state.selectedCountertopGroupId,
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: "REMOVE_COUNTERTOP_GROUP",
        targetId: id,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: null,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_COUNTERTOP_GROUP,
          kind: inferKindFromType("REMOVE_COUNTERTOP_GROUP"),
        },
      });
    }
  },

  // ==========================================================================
  // Auto-generation
  // ==========================================================================

  generateCountertopsForFurniture: (furnitureId: string, materialId: string) => {
    // Only include cabinets that have countertop enabled
    const allCabinets = get().cabinets.filter((c) => c.furnitureId === furnitureId);
    // Include kitchen and corner cabinet types for countertop generation
    const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
    const cabinetsWithCountertop = allCabinets.filter((c) => {
      if (!eligibleTypes.includes(c.type)) return false;
      return c.params.countertopConfig?.hasCountertop === true;
    });

    // Separate cabinets that should be excluded from grouping
    const groupableCabinets = cabinetsWithCountertop.filter((c) => {
      const kitchenParams = c.params as KitchenCabinetParams;
      return !kitchenParams.countertopConfig?.excludeFromGroup;
    });
    const excludedCabinets = cabinetsWithCountertop.filter((c) => {
      const kitchenParams = c.params as KitchenCabinetParams;
      return kitchenParams.countertopConfig?.excludeFromGroup === true;
    });

    const parts = get().parts;

    // Preserve existing gaps with user-set modes
    const existingGroups = get().countertopGroups.filter((g) => g.furnitureId === furnitureId);
    const existingGaps: CabinetGap[] = existingGroups.flatMap((g) => g.gaps || []);

    // Remove existing countertop groups for this furniture
    set((state) => ({
      countertopGroups: state.countertopGroups.filter((g) => g.furnitureId !== furnitureId),
    }));

    // Detect adjacent cabinet groups (only among cabinets that are NOT excluded from grouping)
    const adjacentGroups = CountertopDomain.detectAdjacentCabinets(groupableCabinets, parts);

    // Create a countertop group for each adjacent group
    const newGroups: CountertopGroup[] = adjacentGroups.map((cabinetGroup, index) => {
      const group = CountertopDomain.createGroup(
        furnitureId,
        cabinetGroup,
        parts,
        materialId,
        { name: `Blat ${index + 1}` },
        existingGaps // Pass existing gaps to preserve user choices
      );

      // Sync cutout presets from cabinet configs to CNC operations
      const updatedSegments = group.segments.map((segment) => {
        // Find cabinets in this segment that have cutout presets
        const segmentCabinets = cabinetGroup.filter((c) => segment.cabinetIds.includes(c.id));
        const cncOperations: CncOperation[] = [];

        // Calculate segment bounds from all cabinets
        const allBounds = segmentCabinets.map((c) => getCabinetBounds(c, parts));
        const segmentBounds = {
          minX: Math.min(...allBounds.map((b) => b.min[0])),
          maxX: Math.max(...allBounds.map((b) => b.max[0])),
          minZ: Math.min(...allBounds.map((b) => b.min[2])), // Back (away from camera)
          maxZ: Math.max(...allBounds.map((b) => b.max[2])), // Front (towards camera)
        };

        // Segment left-front corner with overhang
        const segmentLeftEdge = segmentBounds.minX - segment.overhang.left;
        const segmentFrontEdge = segmentBounds.maxZ + segment.overhang.front;

        for (const cabinet of segmentCabinets) {
          const kitchenParams = cabinet.params as KitchenCabinetParams;
          const cutoutPreset = kitchenParams.countertopConfig?.cutoutPreset;

          if (cutoutPreset && cutoutPreset !== "NONE") {
            // Calculate center position of cabinet within segment
            const cabinetBounds = getCabinetBounds(cabinet, parts);

            // Position relative to segment's left-front corner
            // X: distance from left edge (increases to the right)
            // Y: distance from front edge (increases towards back)
            // Note: In world space, Z+ is back, Z- is front, so:
            //   - Front edge of segment = maxZ + overhang.front
            //   - Distance from front = frontEdge - cabinetCenter.z
            const posX = cabinetBounds.center[0] - segmentLeftEdge;
            const posY = segmentFrontEdge - cabinetBounds.center[2];

            let operation: CncOperation | null = null;

            if (cutoutPreset === "CUSTOM" && kitchenParams.countertopConfig?.customCutout) {
              // Custom cutout with user-defined dimensions
              const custom = kitchenParams.countertopConfig.customCutout;
              operation = CountertopDomain.createCncOperation(
                "RECTANGULAR_CUTOUT",
                { x: posX, y: posY },
                {
                  width: custom.width,
                  height: custom.height,
                  radius: custom.radius ?? 10,
                },
                "CUSTOM"
              );
            } else {
              // Standard preset
              operation = CountertopDomain.createCncOperationFromPreset(cutoutPreset, {
                x: posX,
                y: posY,
              });
            }

            if (operation) {
              // Validate that cutout fits within segment bounds
              const cutoutWidth = operation.dimensions.width ?? operation.dimensions.diameter ?? 0;
              const cutoutHeight =
                operation.dimensions.height ?? operation.dimensions.diameter ?? 0;
              const halfW = cutoutWidth / 2;
              const halfH = cutoutHeight / 2;

              // Clamp position to keep cutout within segment
              const minEdgeDist = 50; // Minimum distance from edge
              const clampedX = Math.max(
                minEdgeDist + halfW,
                Math.min(segment.length - minEdgeDist - halfW, posX)
              );
              const clampedY = Math.max(
                minEdgeDist + halfH,
                Math.min(segment.width - minEdgeDist - halfH, posY)
              );

              // Update position if clamped
              if (clampedX !== posX || clampedY !== posY) {
                operation = {
                  ...operation,
                  position: { x: clampedX, y: clampedY },
                };
              }

              cncOperations.push(operation);
            }
          }
        }

        return {
          ...segment,
          cncOperations: [...segment.cncOperations, ...cncOperations],
        };
      });

      return {
        ...group,
        segments: updatedSegments,
      };
    });

    // Create separate countertop groups for each excluded cabinet
    const excludedGroups: CountertopGroup[] = excludedCabinets.map((cabinet, index) => {
      const kitchenParams = cabinet.params as KitchenCabinetParams;
      const cabinetMaterialId = kitchenParams.countertopConfig?.materialId || materialId;

      const group = CountertopDomain.createGroup(furnitureId, [cabinet], parts, cabinetMaterialId, {
        name: `Blat ${adjacentGroups.length + index + 1} (oddzielny)`,
      });

      // Sync cutout presets from cabinet config to CNC operations
      if (
        kitchenParams.countertopConfig?.cutoutPreset &&
        kitchenParams.countertopConfig.cutoutPreset !== "NONE" &&
        group.segments.length > 0
      ) {
        const segment = group.segments[0];
        const cabinetBounds = getCabinetBounds(cabinet, parts);

        // Calculate center position within segment
        const segmentLeftEdge = cabinetBounds.min[0] - segment.overhang.left;
        const segmentFrontEdge = cabinetBounds.max[2] + segment.overhang.front;

        const posX = cabinetBounds.center[0] - segmentLeftEdge;
        const posY = segmentFrontEdge - cabinetBounds.center[2];

        let operation: CncOperation | null = null;
        const cutoutPreset = kitchenParams.countertopConfig.cutoutPreset;

        if (cutoutPreset === "CUSTOM" && kitchenParams.countertopConfig.customCutout) {
          const custom = kitchenParams.countertopConfig.customCutout;
          operation = CountertopDomain.createCncOperation(
            "RECTANGULAR_CUTOUT",
            { x: posX, y: posY },
            {
              width: custom.width,
              height: custom.height,
              radius: custom.radius ?? 10,
            },
            "CUSTOM"
          );
        } else {
          operation = CountertopDomain.createCncOperationFromPreset(cutoutPreset, {
            x: posX,
            y: posY,
          });
        }

        if (operation) {
          group.segments[0] = {
            ...segment,
            cncOperations: [operation],
          };
        }
      }

      return group;
    });

    const allNewGroups = [...newGroups, ...excludedGroups];

    set((state) => ({
      countertopGroups: [...state.countertopGroups, ...allNewGroups],
      selectedCountertopGroupId: allNewGroups.length > 0 ? allNewGroups[0].id : null,
    }));
  },

  regenerateCountertopGroup: (groupId: string) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const cabinetIds = group.segments.flatMap((s) => s.cabinetIds);
    const cabinets = get().cabinets.filter((c) => cabinetIds.includes(c.id));
    const parts = get().parts;

    const newSegments = CountertopDomain.generateSegmentsFromCabinets(cabinets, parts, {
      thickness: group.thickness,
    });

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
    patch: Partial<Omit<CountertopSegment, "id">>,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const beforeSnapshot = { groupId, segment: { ...segment } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId ? CountertopDomain.updateSegmentInGroup(g, segmentId, patch) : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      const updatedSegment = updatedGroup?.segments.find(
        (s: CountertopSegment) => s.id === segmentId
      );
      if (updatedSegment) {
        get().pushEntry({
          type: "UPDATE_COUNTERTOP_SEGMENT",
          targetId: segmentId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, segment: { ...updatedSegment } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_SEGMENT,
            kind: inferKindFromType("UPDATE_COUNTERTOP_SEGMENT"),
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
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const segment = group.segments.find((s: CountertopSegment) => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = CountertopDomain.updateSegmentEdgeBanding(segment, edge, option);
    // Delegate to updateSegment for history tracking
    get().updateSegment(groupId, segmentId, updatedSegment);
  },

  updateSegmentGrain: (groupId: string, segmentId: string, grainAlongLength: boolean) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
    dimensions: CncOperation["dimensions"],
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
        type: "ADD_CNC_OPERATION",
        targetId: operation.id,
        furnitureId: group.furnitureId,
        before: null,
        after: { groupId, segmentId, operation: { ...operation } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_CNC_OPERATION,
          kind: inferKindFromType("ADD_CNC_OPERATION"),
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

    const group = get().countertopGroups.find((g) => g.id === groupId);
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
        type: "ADD_CNC_OPERATION",
        targetId: operation.id,
        furnitureId: group.furnitureId,
        before: null,
        after: { groupId, segmentId, operation: { ...operation } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_CNC_OPERATION,
          kind: inferKindFromType("ADD_CNC_OPERATION"),
        },
      });
    }
  },

  updateCncOperation: (
    groupId: string,
    segmentId: string,
    operationId: string,
    updates: Partial<Omit<CncOperation, "id">>,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      const updatedSegment = updatedGroup?.segments.find(
        (s: CountertopSegment) => s.id === segmentId
      );
      const updatedOp = updatedSegment?.cncOperations.find(
        (o: CncOperation) => o.id === operationId
      );
      if (updatedOp) {
        get().pushEntry({
          type: "UPDATE_CNC_OPERATION",
          targetId: operationId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, segmentId, operation: { ...updatedOp } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_CNC_OPERATION,
            kind: inferKindFromType("UPDATE_CNC_OPERATION"),
          },
        });
      }
    }
  },

  removeCncOperation: (
    groupId: string,
    segmentId: string,
    operationId: string,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
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
        type: "REMOVE_CNC_OPERATION",
        targetId: operationId,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: null,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_CNC_OPERATION,
          kind: inferKindFromType("REMOVE_CNC_OPERATION"),
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
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const corner = group.corners.find((c) => c.position === position);
    const beforeSnapshot = corner
      ? { groupId, corner: { ...corner } }
      : { groupId, corner: { position, treatment: "SQUARE" as CornerTreatment } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId ? CountertopDomain.updateCorner(g, position, treatment, params) : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      const updatedCorner = updatedGroup?.corners.find((c) => c.position === position);
      if (updatedCorner) {
        get().pushEntry({
          type: "UPDATE_COUNTERTOP_CORNER",
          targetId: `${groupId}-corner-${position}`,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, corner: { ...updatedCorner } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_CORNER,
            kind: inferKindFromType("UPDATE_COUNTERTOP_CORNER"),
          },
        });
      }
    }
  },

  // ==========================================================================
  // Joint Operations
  // ==========================================================================

  updateJointType: (
    groupId: string,
    jointId: string,
    type: CountertopJointType,
    skipHistory = false
  ) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const joint = group.joints.find((j: CountertopJoint) => j.id === jointId);
    if (!joint) return;

    const beforeSnapshot = { groupId, joint: { ...joint } };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId ? CountertopDomain.updateJointType(g, jointId, type) : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      const updatedJoint = updatedGroup?.joints.find((j: CountertopJoint) => j.id === jointId);
      if (updatedJoint) {
        get().pushEntry({
          type: "UPDATE_COUNTERTOP_JOINT",
          targetId: jointId,
          furnitureId: group.furnitureId,
          before: beforeSnapshot,
          after: { groupId, joint: { ...updatedJoint } },
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: HISTORY_LABELS.UPDATE_COUNTERTOP_JOINT,
            kind: inferKindFromType("UPDATE_COUNTERTOP_JOINT"),
          },
        });
      }
    }
  },

  // ==========================================================================
  // Export
  // ==========================================================================

  exportCountertopGroupCsv: (groupId: string): string | null => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return null;

    const material = get().materials.find((m) => m.id === group.materialId);
    if (!material) return null;

    return CountertopDomain.generateCuttingListCsv(group, material);
  },

  getCountertopProductionData: (groupId: string) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return null;

    const material = get().materials.find((m) => m.id === group.materialId);
    if (!material) return null;

    return CountertopDomain.generateProductionData(group, material);
  },

  // ==========================================================================
  // Queries
  // ==========================================================================

  getCountertopGroupsForFurniture: (furnitureId: string) => {
    return get().countertopGroups.filter((g) => g.furnitureId === furnitureId);
  },

  getCountertopGroupForCabinet: (cabinetId: string) => {
    return get().countertopGroups.find((g) =>
      g.segments.some((s) => s.cabinetIds.includes(cabinetId))
    );
  },

  // ==========================================================================
  // Material Sync Operations
  // ==========================================================================

  updateCountertopGroupMaterial: (groupId: string, materialId: string, skipHistory = false) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    // Get all cabinet IDs in this group
    const cabinetIds = group.segments.flatMap((s) => s.cabinetIds);

    // Update the group material
    const beforeGroup = { ...group };

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId ? { ...g, materialId, updatedAt: new Date() } : g
      ),
      // Also update all cabinet configs to keep them in sync
      cabinets: state.cabinets.map((cabinet) => {
        if (!cabinetIds.includes(cabinet.id)) return cabinet;
        // Support kitchen and corner cabinet types
        const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
        if (!eligibleTypes.includes(cabinet.type)) return cabinet;

        const params = cabinet.params;
        return {
          ...cabinet,
          params: {
            ...params,
            countertopConfig: {
              ...params.countertopConfig,
              hasCountertop: params.countertopConfig?.hasCountertop ?? true,
              materialId,
            },
          },
          updatedAt: new Date(),
        };
      }),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      get().pushEntry({
        type: "UPDATE_COUNTERTOP_GROUP",
        targetId: groupId,
        furnitureId: group.furnitureId,
        before: { group: beforeGroup },
        after: { group: { ...updatedGroup! } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: "Zmiana materiału blatu",
          kind: inferKindFromType("UPDATE_COUNTERTOP_GROUP"),
        },
      });
    }
  },

  separateCabinetFromGroup: (cabinetId: string, skipHistory = false) => {
    const cabinet = get().cabinets.find((c) => c.id === cabinetId);
    // Support kitchen and corner cabinet types
    const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
    if (!cabinet || !eligibleTypes.includes(cabinet.type)) return;

    const params = cabinet.params;

    // Set excludeFromGroup on the cabinet
    set((state) => ({
      cabinets: state.cabinets.map((c) =>
        c.id === cabinetId
          ? {
              ...c,
              params: {
                ...c.params,
                countertopConfig: {
                  ...params.countertopConfig,
                  hasCountertop: params.countertopConfig?.hasCountertop ?? true,
                  excludeFromGroup: true,
                },
              },
              updatedAt: new Date(),
            }
          : c
      ),
    }));

    // Regenerate countertops for this furniture to create separate group
    const materialId =
      params.countertopConfig?.materialId ||
      get().materials.find((m) => m.category === "countertop")?.id ||
      "";
    get().generateCountertopsForFurniture(cabinet.furnitureId, materialId);

    if (!skipHistory) {
      get().pushEntry({
        type: "UPDATE_CABINET",
        targetId: cabinetId,
        furnitureId: cabinet.furnitureId,
        before: { cabinet: { ...cabinet } },
        after: { cabinet: { ...get().cabinets.find((c) => c.id === cabinetId)! } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: "Oddzielenie blatu szafki",
          kind: inferKindFromType("UPDATE_CABINET"),
        },
      });
    }
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
    // Include kitchen and corner cabinet types
    const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
    const eligibleCabinets = state.cabinets.filter(
      (c) => c.furnitureId === furnitureId && eligibleTypes.includes(c.type)
    );

    if (eligibleCabinets.length === 0) return;

    // Capture before state for history
    const beforeConfigs = eligibleCabinets.map((cabinet) => ({
      cabinetId: cabinet.id,
      config: cabinet.params.countertopConfig,
    }));

    const now = new Date();
    set((s) => ({
      cabinets: s.cabinets.map((cabinet) => {
        if (cabinet.furnitureId !== furnitureId || !eligibleTypes.includes(cabinet.type)) {
          return cabinet;
        }

        // Update params with new countertop config
        const updatedParams = {
          ...cabinet.params,
          countertopConfig: config,
        };

        return {
          ...cabinet,
          params: updatedParams,
          updatedAt: now,
        };
      }),
    }));

    if (!skipHistory) {
      // Capture after state
      const afterConfigs = eligibleCabinets.map((cabinet) => ({
        cabinetId: cabinet.id,
        config,
      }));

      get().pushEntry({
        type: "BATCH_UPDATE_COUNTERTOP_CONFIG",
        targetIds: eligibleCabinets.map((c) => c.id),
        furnitureId,
        before: { furnitureId, cabinetConfigs: beforeConfigs },
        after: { furnitureId, cabinetConfigs: afterConfigs },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.BATCH_UPDATE_COUNTERTOP_CONFIG,
          kind: inferKindFromType("BATCH_UPDATE_COUNTERTOP_CONFIG"),
        },
      });
    }
  },

  getOtherKitchenCabinetsCount: (furnitureId: string, excludeCabinetId?: string) => {
    // Include kitchen and corner cabinet types
    const eligibleTypes = ["KITCHEN", "CORNER_INTERNAL", "CORNER_EXTERNAL"];
    const eligibleCabinets = get().cabinets.filter(
      (c) => c.furnitureId === furnitureId && eligibleTypes.includes(c.type)
    );

    if (excludeCabinetId) {
      return eligibleCabinets.filter((c) => c.id !== excludeCabinetId).length;
    }

    return eligibleCabinets.length;
  },

  // ==========================================================================
  // Gap Operations
  // ==========================================================================

  updateGapMode: (groupId: string, gapId: string, mode: CabinetGapMode, skipHistory = false) => {
    const group = get().countertopGroups.find((g) => g.id === groupId);
    if (!group) return;

    const gap = group.gaps.find((g) => g.id === gapId);
    if (!gap) return;

    const beforeSnapshot = { group: { ...group } };

    // Update gap mode
    const updatedGaps = group.gaps.map((g) => (g.id === gapId ? { ...g, mode } : g));

    // Get all cabinet IDs from the group
    const cabinetIds = group.segments.flatMap((s) => s.cabinetIds);
    const cabinets = get().cabinets.filter((c) => cabinetIds.includes(c.id));
    const parts = get().parts;

    // Regenerate segments with updated gaps
    const newSegments = CountertopDomain.generateSegmentsFromCabinets(
      cabinets,
      parts,
      { thickness: group.thickness },
      updatedGaps
    );

    const layoutType = CountertopDomain.detectLayoutType(cabinets, parts);
    const newJoints = CountertopDomain.generateJointsForLayout(newSegments, layoutType);

    set((state) => ({
      countertopGroups: state.countertopGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              gaps: updatedGaps,
              segments: newSegments,
              joints: newJoints,
              layoutType,
              updatedAt: new Date(),
            }
          : g
      ),
    }));

    if (!skipHistory) {
      const updatedGroup = get().countertopGroups.find((g) => g.id === groupId);
      get().pushEntry({
        type: "UPDATE_COUNTERTOP_GROUP",
        targetId: groupId,
        furnitureId: group.furnitureId,
        before: beforeSnapshot,
        after: { group: { ...updatedGroup! } },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label:
            mode === "BRIDGE" ? "Połączenie blatu nad przerwą" : "Rozdzielenie blatu w przerwie",
          kind: inferKindFromType("UPDATE_COUNTERTOP_GROUP"),
        },
      });
    }
  },
});
