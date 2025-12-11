import type { Part, ShapeParams, EdgeBanding, PartSnapshot } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultMaterials, triggerDebouncedCollisionDetection } from '../utils';
import type { PartsSlice, StoreSlice } from '../types';
import { HISTORY_LABELS } from '../history/constants';
import { generateId, inferKindFromType, pickFields, getUpdatePartLabel } from '../history/utils';
import { sanitizeName, NAME_MAX_LENGTH } from '@/lib/naming';
import { buildManualGroupId, parseManualGroupId } from '@/lib/groups';

export const createPartsSlice: StoreSlice<PartsSlice> = (set, get) => ({
  parts: [],

  addPart: (furnitureId: string, skipHistory = false) => {
    const materials = get().materials;
    const { default_material } = getDefaultMaterials(materials);
    const defaultMaterial =
      materials.find((m) => m.id === default_material) ?? materials[0];
    if (!defaultMaterial) {
      console.error('No materials available');
      return;
    }

    const now = new Date();

    const defaultShapeParams: ShapeParams = {
      type: 'RECT',
      x: 600,
      y: 400,
    };

    const defaultEdgeBanding: EdgeBanding = {
      type: 'RECT',
      top: false,
      bottom: false,
      left: false,
      right: false,
    };

    const defaultPosition: [number, number, number] = [0, defaultMaterial.thickness / 2, 0];
    const defaultRotation: [number, number, number] = [-Math.PI / 2, 0, 0];

    const newPart: Part = {
      id: uuidv4(),
      name: `Część ${get().parts.length + 1}`,
      furnitureId,
      group: undefined,
      shapeType: 'RECT',
      shapeParams: defaultShapeParams,
      width: 600,
      height: 400,
      depth: defaultMaterial.thickness,
      position: defaultPosition,
      rotation: defaultRotation,
      materialId: defaultMaterial.id,
      edgeBanding: defaultEdgeBanding,
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      parts: [...state.parts, newPart],
      selectedPartId: newPart.id,
    }));

    // Record history
    if (!skipHistory) {
      get().pushEntry({
        type: 'ADD_PART',
        targetId: newPart.id,
        furnitureId,
        after: { ...newPart },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_PART,
          kind: 'geometry',
        },
      });
    }

    // Avoid collision spam during live transforms; they will be recalculated after the transform ends.
    const isTransforming = get().isTransforming;
    if (!isTransforming || !skipHistory) {
      triggerDebouncedCollisionDetection(get);
    }
  },

  updatePart: (id: string, patch: Partial<Part>, skipHistory = false) => {
    const part = get().parts.find((p) => p.id === id);
    if (!part) return;

    // Capture before state - only fields that will change
    const patchKeys = Object.keys(patch) as (keyof Part)[];
    const beforeState = pickFields(part, patchKeys);

    set((state) => {
      const partIndex = state.parts.findIndex((p) => p.id === id);
      if (partIndex === -1) return state;

      const currentPart = state.parts[partIndex];
      let updatedPatch = { ...patch };

      if (patch.materialId && patch.materialId !== currentPart.materialId) {
        const newMaterial = state.materials.find((m) => m.id === patch.materialId);
        if (newMaterial) {
          updatedPatch.depth = newMaterial.thickness;
        }
      }

      if (patch.shapeParams) {
        const params = patch.shapeParams;
        switch (params.type) {
          case 'RECT':
            updatedPatch.width = params.x;
            updatedPatch.height = params.y;
            break;
          case 'TRAPEZOID':
            updatedPatch.width = Math.max(params.frontX, params.backX);
            updatedPatch.height = params.y;
            break;
          case 'L_SHAPE':
            updatedPatch.width = params.x;
            updatedPatch.height = params.y;
            break;
          case 'POLYGON': {
            const xs = params.points.map((p) => p[0]);
            const ys = params.points.map((p) => p[1]);
            updatedPatch.width = Math.max(...xs) - Math.min(...xs);
            updatedPatch.height = Math.max(...ys) - Math.min(...ys);
            break;
          }
        }
      }

      updatedPatch.updatedAt = new Date();

      const newParts = [...state.parts];
      newParts[partIndex] = { ...currentPart, ...updatedPatch };

      return { parts: newParts };
    });

    // Record history after state update
    if (!skipHistory) {
      const updatedPart = get().parts.find((p) => p.id === id);
      if (updatedPart) {
        // Capture after state - include derived fields if they changed
        let afterKeys = [...patchKeys];
        if ('materialId' in patch) {
          afterKeys.push('depth');
        }
        if ('shapeParams' in patch) {
          afterKeys.push('width', 'height');
        }
        const afterState = pickFields(updatedPart, afterKeys as (keyof Part)[]);

        get().pushEntry({
          type: 'UPDATE_PART',
          targetId: id,
          furnitureId: part.furnitureId,
          before: beforeState,
          after: afterState,
          meta: {
            id: generateId(),
            timestamp: Date.now(),
            label: getUpdatePartLabel(patch),
            kind: 'geometry',
          },
        });
      }
    }

    triggerDebouncedCollisionDetection(get);
  },

  /**
   * Batch update multiple parts in a single store update for better performance
   * This prevents multiple re-renders when updating many parts at once
   */
  updatePartsBatch: (updates: Array<{ id: string; patch: Partial<Part> }>) => {
    if (updates.length === 0) return;

    const now = new Date();

    set((state) => {
      const updateMap = new Map(updates.map(u => [u.id, u.patch]));

      const newParts = state.parts.map((part) => {
        const patch = updateMap.get(part.id);
        if (!patch) return part;

        let updatedPatch = { ...patch };

        // Handle material change
        if (patch.materialId && patch.materialId !== part.materialId) {
          const newMaterial = state.materials.find((m) => m.id === patch.materialId);
          if (newMaterial) {
            updatedPatch.depth = newMaterial.thickness;
          }
        }

        // Handle shape params change
        if (patch.shapeParams) {
          const params = patch.shapeParams;
          switch (params.type) {
            case 'RECT':
              updatedPatch.width = params.x;
              updatedPatch.height = params.y;
              break;
            case 'TRAPEZOID':
              updatedPatch.width = Math.max(params.frontX, params.backX);
              updatedPatch.height = params.y;
              break;
            case 'L_SHAPE':
              updatedPatch.width = params.x;
              updatedPatch.height = params.y;
              break;
            case 'POLYGON': {
              const xs = params.points.map((p) => p[0]);
              const ys = params.points.map((p) => p[1]);
              updatedPatch.width = Math.max(...xs) - Math.min(...xs);
              updatedPatch.height = Math.max(...ys) - Math.min(...ys);
              break;
            }
          }
        }

        updatedPatch.updatedAt = now;

        return { ...part, ...updatedPatch };
      });

      return { parts: newParts };
    });

    // Skip collision detection during live transforms to avoid flickering
    // It will be triggered after transform ends in handleTransformEnd
    const isTransforming = get().isTransforming;
    if (!isTransforming) {
      triggerDebouncedCollisionDetection(get);
    }
  },

  renamePart: (id: string, name: string, skipHistory = false) => {
    const part = get().parts.find((p) => p.id === id);
    const normalized = sanitizeName(name, NAME_MAX_LENGTH);
    if (!part || !normalized) return;

    const currentName = part.name;
    if (currentName === normalized) return;

    const now = new Date();
    set((state) => ({
      parts: state.parts.map((p) =>
        p.id === id ? { ...p, name: normalized, updatedAt: now } : p
      ),
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'UPDATE_PART',
        targetId: id,
        furnitureId: part.furnitureId,
        before: { name: currentName },
        after: { name: normalized },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: getUpdatePartLabel({ name: normalized }),
          kind: inferKindFromType('UPDATE_PART'),
        },
      });
    }
  },

  renameManualGroup: (groupId: string, name: string, skipHistory = false) => {
    const parsed = parseManualGroupId(groupId);
    const normalized = sanitizeName(name, NAME_MAX_LENGTH);
    if (!parsed || !normalized) return;

    const currentName = parsed.name;
    const targetParts = get().parts.filter(
      (p) =>
        !p.cabinetMetadata &&
        sanitizeName(p.group ?? '', NAME_MAX_LENGTH) === currentName &&
        p.furnitureId === parsed.furnitureId
    );

    if (targetParts.length === 0 || currentName === normalized) return;

    const partIds = targetParts.map((p) => p.id);
    const idSet = new Set(partIds);
    const now = new Date();

    set((state) => ({
      parts: state.parts.map((part) =>
        idSet.has(part.id) ? { ...part, group: normalized, updatedAt: now } : part
      ),
    }));

    if (!skipHistory) {
      const nextId = buildManualGroupId(parsed.furnitureId, normalized);
      get().pushEntry({
        type: 'UPDATE_GROUP',
        targetId: groupId,
        targetIds: partIds,
        furnitureId: parsed.furnitureId,
        before: {
          id: groupId,
          furnitureId: parsed.furnitureId,
          name: currentName,
          partIds,
        },
        after: {
          id: nextId,
          furnitureId: parsed.furnitureId,
          name: normalized,
          partIds,
        },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.UPDATE_GROUP,
          kind: inferKindFromType('UPDATE_GROUP'),
        },
      });
    }
  },

  removePart: (id: string, skipHistory = false) => {
    const part = get().parts.find((p) => p.id === id);
    if (!part) return;

    const partIndex = get().parts.findIndex((p) => p.id === id);

    // Record history before removal
    if (!skipHistory) {
      const partSnapshot: PartSnapshot = {
        ...part,
        _index: partIndex,
      };

      get().pushEntry({
        type: 'REMOVE_PART',
        targetId: id,
        furnitureId: part.furnitureId,
        before: partSnapshot,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_PART,
          kind: 'geometry',
        },
      });
    }

    set((state) => {
      let updatedCabinets = state.cabinets;
      if (part.cabinetMetadata) {
        updatedCabinets = state.cabinets.map((cabinet) => {
          if (cabinet.id === part.cabinetMetadata?.cabinetId) {
            return {
              ...cabinet,
              partIds: cabinet.partIds.filter((pid) => pid !== id),
              updatedAt: new Date(),
            };
          }
          return cabinet;
        });
      }

      return {
        parts: state.parts.filter((p) => p.id !== id),
        cabinets: updatedCabinets,
        selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
      };
    });

    triggerDebouncedCollisionDetection(get);
  },

  duplicatePart: (id: string, skipHistory = false) => {
    const state = get();
    const partToDuplicate = state.parts.find((p) => p.id === id);
    if (!partToDuplicate) {
      console.error('Part not found for duplication');
      return;
    }

    const now = new Date();
    const newPart: Part = {
      ...partToDuplicate,
      id: uuidv4(),
      name: `${partToDuplicate.name} (kopia)`,
      position: [
        partToDuplicate.position[0] + 50,
        partToDuplicate.position[1],
        partToDuplicate.position[2],
      ] as [number, number, number],
      createdAt: now,
      updatedAt: now,
      cabinetMetadata: undefined, // Remove cabinet metadata from duplicate
    };

    set((state) => ({
      parts: [...state.parts, newPart],
      selectedPartId: newPart.id,
    }));

    // Record history
    if (!skipHistory) {
      get().pushEntry({
        type: 'DUPLICATE_PART',
        targetId: newPart.id,
        furnitureId: newPart.furnitureId,
        after: { ...newPart },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.DUPLICATE_PART,
          kind: 'geometry',
        },
      });
    }

    triggerDebouncedCollisionDetection(get);
  },
});
