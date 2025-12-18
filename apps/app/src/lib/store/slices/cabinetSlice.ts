import { v4 as uuidv4 } from 'uuid';
import { Euler, Quaternion, Vector3 } from 'three';
import type {
  Cabinet,
  CabinetMaterials,
  CabinetParams,
  CabinetType,
  CabinetRegenerationSnapshot,
  LegData,
} from '@/types';
import { getGeneratorForType } from '../../cabinetGenerators';
import { generateLegs } from '../../cabinetGenerators/legs';
import {
  applyCabinetTransform,
  getCabinetTransform,
  getDefaultBackMaterial,
  triggerDebouncedCollisionDetection,
} from '../utils';
import type { CabinetSlice, StoreSlice } from '../types';
import { HISTORY_LABELS } from '../history/constants';
import { generateId, createPartIdMap, inferKindFromType } from '../history/utils';
import { sanitizeName, NAME_MAX_LENGTH } from '@/lib/naming';
import { roundPosition, roundRotation } from '@/lib/utils';

export const createCabinetSlice: StoreSlice<CabinetSlice> = (set, get) => ({
  cabinets: [],

  addCabinet: (furnitureId: string, type: CabinetType, params: CabinetParams, materials: CabinetMaterials, skipHistory = false) => {
    const cabinetId = uuidv4();
    const now = new Date();

    const bodyMaterial = get().materials.find((m) => m.id === materials.bodyMaterialId);
    if (!bodyMaterial) {
      console.error('Body material not found');
      return;
    }

    // Get back material - use specified backMaterialId or default HDF
    const backMaterial = materials.backMaterialId
      ? get().materials.find((m) => m.id === materials.backMaterialId)
      : getDefaultBackMaterial(get().materials);

    const generator = getGeneratorForType(type);
    const generatedParts = generator(cabinetId, furnitureId, params, materials, bodyMaterial, backMaterial);

    const parts = generatedParts.map((part) => ({
      ...part,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));

    // Generate legs separately (they are accessories, not cut parts)
    let legs: LegData[] | undefined;
    if (params.legs?.enabled) {
      legs = generateLegs(params.legs, params.width, params.depth);
    }

    const cabinet: Cabinet = {
      id: cabinetId,
      name: `Szafka ${get().cabinets.length + 1}`,
      furnitureId,
      type,
      params,
      materials,
      topBottomPlacement: params.topBottomPlacement,
      partIds: parts.map((p) => p.id),
      legs,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      cabinets: [...state.cabinets, cabinet],
      parts: [...state.parts, ...parts],
      selectedCabinetId: cabinetId,
      selectedPartId: null,
    }));

    // Record history
    if (!skipHistory) {
      get().pushEntry({
        type: 'ADD_CABINET',
        targetId: cabinetId,
        furnitureId,
        after: {
          cabinet: { ...cabinet },
          parts: parts.map((p) => ({ ...p })),
        },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.ADD_CABINET,
          kind: 'cabinet',
          isMilestone: true,
        },
      });
    }

    triggerDebouncedCollisionDetection(get);
  },

  updateCabinet: (
    id,
    patch: Partial<Omit<Cabinet, 'id' | 'furnitureId' | 'createdAt'>>,
    _skipHistory = false
  ) => {
    set((state) => {
      const cabinetIndex = state.cabinets.findIndex((c) => c.id === id);
      if (cabinetIndex === -1) return state;

      const cabinet = state.cabinets[cabinetIndex];
      const cabinetParts = state.parts.filter((p) => cabinet.partIds.includes(p.id));
      const { center, rotation } = getCabinetTransform(cabinetParts);

      const materials = patch.materials
        ? { ...cabinet.materials, ...patch.materials }
        : cabinet.materials;

      const params = patch.topBottomPlacement
        ? { ...cabinet.params, topBottomPlacement: patch.topBottomPlacement }
        : cabinet.params;

      const shouldRegenerate =
        Boolean(patch.materials) ||
        (patch.topBottomPlacement && patch.topBottomPlacement !== cabinet.topBottomPlacement);

      if (shouldRegenerate) {
        const bodyMaterial = state.materials.find((m) => m.id === materials.bodyMaterialId);
        if (!bodyMaterial) return state;

        // Get back material
        const backMaterial = materials.backMaterialId
          ? state.materials.find((m) => m.id === materials.backMaterialId)
          : getDefaultBackMaterial(state.materials);

        const generator = getGeneratorForType(cabinet.type);
        const generatedParts = generator(id, cabinet.furnitureId, params, materials, bodyMaterial, backMaterial);
        const transformedParts = applyCabinetTransform(generatedParts, center, rotation);

        const now = new Date();
        const newParts = transformedParts.map((part) => ({
          ...part,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        }));

        // Regenerate legs
        let legs: LegData[] | undefined;
        if (params.legs?.enabled) {
          legs = generateLegs(params.legs, params.width, params.depth);
        }

        const remainingParts = state.parts.filter((p) => !cabinet.partIds.includes(p.id));

        const updatedCabinet = {
          ...cabinet,
          ...patch,
          params,
          materials,
          topBottomPlacement: params.topBottomPlacement,
          partIds: newParts.map((p) => p.id),
          legs,
          updatedAt: now,
        };

        return {
          cabinets: state.cabinets.map((c) => (c.id === id ? updatedCabinet : c)),
          parts: [...remainingParts, ...newParts],
        };
      }

      const updatedPatch = { ...patch, updatedAt: new Date() };

      const newCabinets = [...state.cabinets];
      newCabinets[cabinetIndex] = { ...cabinet, ...updatedPatch };

      return { cabinets: newCabinets };
    });

    triggerDebouncedCollisionDetection(get);
  },

  renameCabinet: (id: string, name: string, skipHistory = false) => {
    const cabinet = get().cabinets.find((c) => c.id === id);
    const normalized = sanitizeName(name, NAME_MAX_LENGTH);
    if (!cabinet || !normalized) return;

    const currentName = cabinet.name;
    if (currentName === normalized) return;

    const now = new Date();
    set((state) => ({
      cabinets: state.cabinets.map((c) =>
        c.id === id ? { ...c, name: normalized, updatedAt: now } : c
      ),
    }));

    if (!skipHistory) {
      get().pushEntry({
        type: 'UPDATE_CABINET',
        targetId: id,
        furnitureId: cabinet.furnitureId,
        before: { name: currentName },
        after: { name: normalized },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.UPDATE_CABINET,
          kind: inferKindFromType('UPDATE_CABINET'),
        },
      });
    }
  },

  updateCabinetParams: (id: string, params: CabinetParams, skipHistory = false, centerOffset?: [number, number, number]) => {
    const state = get();
    const cabinet = state.cabinets.find((c) => c.id === id);
    if (!cabinet) return;

    const bodyMaterial = state.materials.find((m) => m.id === cabinet.materials.bodyMaterialId);
    if (!bodyMaterial) return;

    // Get back material
    const backMaterial = cabinet.materials.backMaterialId
      ? state.materials.find((m) => m.id === cabinet.materials.backMaterialId)
      : getDefaultBackMaterial(state.materials);

    const oldParts = state.parts.filter((p) => cabinet.partIds.includes(p.id));
    const { center, rotation } = getCabinetTransform(oldParts);

    // Apply center offset if provided (for resize with fixed edge)
    const targetCenter = centerOffset
      ? center.clone().add(new Vector3().fromArray(centerOffset))
      : center;

    const generator = getGeneratorForType(params.type);
    const generatedParts = generator(id, cabinet.furnitureId, params, cabinet.materials, bodyMaterial, backMaterial);
    const transformedParts = applyCabinetTransform(generatedParts, targetCenter, rotation);

    const now = new Date();
    const newParts = transformedParts.map((part) => ({
      ...part,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));

    // Regenerate legs
    let legs: LegData[] | undefined;
    if (params.legs?.enabled) {
      legs = generateLegs(params.legs, params.width, params.depth);
    }

    // Record history before making changes
    if (!skipHistory) {
      const beforeSnapshot: CabinetRegenerationSnapshot = {
        cabinetParams: { ...cabinet },
        partIds: [...cabinet.partIds],
        parts: oldParts.map((p) => ({ ...p })),
      };

      const afterSnapshot: CabinetRegenerationSnapshot = {
        cabinetParams: { params, type: params.type, topBottomPlacement: params.topBottomPlacement },
        partIds: newParts.map((p) => p.id),
        parts: newParts.map((p) => ({ ...p })),
        partIdMap: createPartIdMap(oldParts, newParts),
      };

      get().pushEntry({
        type: 'REGENERATE_CABINET',
        targetId: id,
        cabinetId: id,
        furnitureId: cabinet.furnitureId,
        before: beforeSnapshot,
        after: afterSnapshot,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REGENERATE_CABINET,
          kind: 'cabinet',
          isMilestone: true, // Mark cabinet regeneration as milestone
        },
      });
    }

    set((state) => {
      const oldPartIds = new Set(cabinet.partIds);
      const remainingParts = state.parts.filter((p) => !oldPartIds.has(p.id));

      const updatedCabinet = {
        ...cabinet,
        params,
        type: params.type,
        topBottomPlacement: params.topBottomPlacement,
        partIds: newParts.map((p) => p.id),
        legs,
        updatedAt: now,
      };

      return {
        cabinets: state.cabinets.map((c) => (c.id === id ? updatedCabinet : c)),
        parts: [...remainingParts, ...newParts],
      };
    });

    triggerDebouncedCollisionDetection(get);
  },

  updateCabinetTransform: (
    id: string,
    transform: {
      position?: [number, number, number];
      rotation?: [number, number, number];
    },
    _skipHistory = false
  ) => {
    const state = get();
    const cabinet = state.cabinets.find((c) => c.id === id);
    if (!cabinet) return;

    const cabinetParts = state.parts.filter((p) => cabinet.partIds.includes(p.id));
    if (cabinetParts.length === 0) return;

    // Get current cabinet transform
    const { center: currentCenter, rotation: currentRotation } = getCabinetTransform(cabinetParts);

    // Calculate new center if position is provided
    const newCenter = transform.position
      ? new Vector3().fromArray(transform.position)
      : currentCenter;

    // Calculate new rotation if rotation is provided
    const newRotation = transform.rotation
      ? new Quaternion().setFromEuler(new Euler().fromArray(transform.rotation))
      : currentRotation;

    // Calculate position offset
    const positionOffset = newCenter.clone().sub(currentCenter);

    // Calculate rotation delta
    const rotationDelta = newRotation.clone().multiply(currentRotation.clone().invert());

    const now = new Date();

    // Calculate final world transform to store on cabinet
    const finalWorldTransform = {
      position: roundPosition(newCenter.toArray() as [number, number, number]),
      rotation: transform.rotation
        ? (transform.rotation as [number, number, number])
        : (cabinet.worldTransform?.rotation ?? [0, 0, 0]),
    };

    set((state) => {
      const updatedParts = state.parts.map((part) => {
        if (!cabinet.partIds.includes(part.id)) return part;

        // Apply position offset
        let finalPosition = new Vector3().fromArray(part.position);

        // If rotation changed, rotate part around cabinet center
        if (transform.rotation) {
          // Move to origin relative to cabinet center
          finalPosition.sub(currentCenter);
          // Apply rotation
          finalPosition.applyQuaternion(rotationDelta);
          // Move back
          finalPosition.add(currentCenter);
        }

        // Apply position offset
        finalPosition.add(positionOffset);

        // Calculate new part rotation
        let finalRotation = part.rotation;
        if (transform.rotation) {
          const partQuat = new Quaternion().setFromEuler(new Euler().fromArray(part.rotation));
          const newPartQuat = rotationDelta.clone().multiply(partQuat);
          const newPartEuler = new Euler().setFromQuaternion(newPartQuat);
          finalRotation = [newPartEuler.x, newPartEuler.y, newPartEuler.z] as [number, number, number];
        }

        return {
          ...part,
          position: roundPosition(finalPosition.toArray() as [number, number, number]),
          rotation: roundRotation(finalRotation),
          updatedAt: now,
        };
      });

      // Update cabinet with worldTransform
      const updatedCabinets = state.cabinets.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          worldTransform: finalWorldTransform,
          updatedAt: now,
        };
      });

      return { parts: updatedParts, cabinets: updatedCabinets };
    });

    triggerDebouncedCollisionDetection(get);
  },

  removeCabinet: (id: string, skipHistory = false) => {
    const cabinet = get().cabinets.find((c) => c.id === id);
    if (!cabinet) return;

    const parts = get().parts.filter((p) => cabinet.partIds.includes(p.id));
    const cabinetIndex = get().cabinets.findIndex((c) => c.id === id);

    // Record history before removal
    if (!skipHistory) {
      get().pushEntry({
        type: 'REMOVE_CABINET',
        targetId: id,
        furnitureId: cabinet.furnitureId,
        before: {
          cabinet: { ...cabinet, _index: cabinetIndex },
          parts: parts.map((p) => ({ ...p })),
        },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.REMOVE_CABINET,
          kind: 'cabinet',
          isMilestone: true,
        },
      });
    }

    set((state) => {
      const cabinet = state.cabinets.find((c) => c.id === id);
      if (!cabinet) return state;

      return {
        cabinets: state.cabinets.filter((c) => c.id !== id),
        parts: state.parts.filter((p) => !cabinet.partIds.includes(p.id)),
        selectedCabinetId: state.selectedCabinetId === id ? null : state.selectedCabinetId,
      };
    });

    triggerDebouncedCollisionDetection(get);
  },

  duplicateCabinet: (id: string, skipHistory = false) => {
    const state = get();
    const cabinet = state.cabinets.find((c) => c.id === id);
    if (!cabinet) return;

    const newCabinetId = uuidv4();
    const now = new Date();

    const oldParts = state.parts.filter((p) => cabinet.partIds.includes(p.id));
    const newParts = oldParts.map((part) => ({
      ...part,
      id: uuidv4(),
      name: part.name,
      position: [
        part.position[0] + 100,
        part.position[1],
        part.position[2],
      ] as [number, number, number],
      cabinetMetadata: part.cabinetMetadata
        ? { ...part.cabinetMetadata, cabinetId: newCabinetId }
        : undefined,
      createdAt: now,
      updatedAt: now,
    }));

    const newCabinet: Cabinet = {
      ...cabinet,
      id: newCabinetId,
      name: `${cabinet.name} (kopia)`,
      partIds: newParts.map((p) => p.id),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      cabinets: [...state.cabinets, newCabinet],
      parts: [...state.parts, ...newParts],
      selectedCabinetId: newCabinetId,
      selectedPartId: null,
    }));

    // Record history
    if (!skipHistory) {
      get().pushEntry({
        type: 'DUPLICATE_CABINET',
        targetId: newCabinetId,
        furnitureId: cabinet.furnitureId,
        after: {
          cabinet: { ...newCabinet },
          parts: newParts.map((p) => ({ ...p })),
        },
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.DUPLICATE_CABINET,
          kind: 'cabinet',
        },
      });
    }

    triggerDebouncedCollisionDetection(get);
  },
});
