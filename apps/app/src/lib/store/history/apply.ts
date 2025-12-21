import type {
  HistoryEntry,
  Part,
  TransformSnapshot,
  CabinetRegenerationSnapshot,
  PartSnapshot,
  CabinetSnapshot,
  Cabinet,
  GroupRenameSnapshot,
} from '@/types';
import type { StoreState } from '../types';
import {
  applyAddCountertopGroup,
  applyRemoveCountertopGroup,
  applyUpdateCountertopGroup,
  applyUpdateCountertopSegment,
  applyAddCncOperation,
  applyRemoveCncOperation,
  applyUpdateCncOperation,
  applyUpdateCountertopCorner,
  applyUpdateCountertopJoint,
  applyBatchUpdateCountertopConfig,
} from './applyCountertop';

type PartTransformMap = Record<string, Pick<Part, 'position' | 'rotation'>>;

/**
 * Apply a history entry in the specified direction (undo or redo)
 * This is the core function that reverses or re-applies changes
 *
 * @param entry - History entry to apply
 * @param direction - Whether to undo or redo the operation
 * @param get - Zustand get function to access current state
 * @param set - Zustand set function to update state
 */
export function applyHistoryEntry(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void
): void {
  const state = direction === 'undo' ? entry.before : entry.after;

  switch (entry.type) {
    case 'ADD_PART':
      applyAddPart(entry, direction, get, set, state);
      break;

    case 'REMOVE_PART':
      applyRemovePart(entry, direction, get, set, state);
      break;

    case 'TRANSFORM_PART':
    case 'UPDATE_PART':
      applyUpdatePart(entry, direction, get, set, state);
      break;

    case 'TRANSFORM_CABINET':
      applyTransformCabinet(entry, direction, get, set, state);
      break;

    case 'DUPLICATE_PART':
      applyDuplicatePart(entry, direction, get, set, state);
      break;

    case 'ADD_CABINET':
      applyAddCabinet(entry, direction, get, set, state);
      break;

    case 'REMOVE_CABINET':
      applyRemoveCabinet(entry, direction, get, set, state);
      break;

    case 'DUPLICATE_CABINET':
      applyDuplicateCabinet(entry, direction, get, set, state);
      break;

    case 'UPDATE_CABINET':
    case 'REGENERATE_CABINET':
      applyCabinetUpdate(entry, direction, get, set, state);
      break;

    case 'UPDATE_GROUP':
      applyGroupRename(entry, direction, get, set, state);
      break;

    // Multiselect operations
    case 'TRANSFORM_MULTISELECT':
      applyTransformMultiselect(entry, direction, get, set, state);
      break;

    case 'DELETE_MULTISELECT':
      applyDeleteMultiselect(entry, direction, get, set, state);
      break;

    case 'DUPLICATE_MULTISELECT':
      applyDuplicateMultiselect(entry, direction, get, set, state);
      break;

    // Countertop operations
    case 'ADD_COUNTERTOP_GROUP':
      applyAddCountertopGroup(entry, direction, get, set, state);
      break;

    case 'REMOVE_COUNTERTOP_GROUP':
      applyRemoveCountertopGroup(entry, direction, get, set, state);
      break;

    case 'UPDATE_COUNTERTOP_GROUP':
      applyUpdateCountertopGroup(entry, direction, get, set, state);
      break;

    case 'UPDATE_COUNTERTOP_SEGMENT':
      applyUpdateCountertopSegment(entry, direction, get, set, state);
      break;

    case 'ADD_CNC_OPERATION':
      applyAddCncOperation(entry, direction, get, set, state);
      break;

    case 'REMOVE_CNC_OPERATION':
      applyRemoveCncOperation(entry, direction, get, set, state);
      break;

    case 'UPDATE_CNC_OPERATION':
      applyUpdateCncOperation(entry, direction, get, set, state);
      break;

    case 'UPDATE_COUNTERTOP_CORNER':
      applyUpdateCountertopCorner(entry, direction, get, set, state);
      break;

    case 'UPDATE_COUNTERTOP_JOINT':
      applyUpdateCountertopJoint(entry, direction, get, set, state);
      break;

    case 'BATCH_UPDATE_COUNTERTOP_CONFIG':
      applyBatchUpdateCountertopConfig(entry, direction, get, set, state);
      break;

    default:
      console.warn(`Unknown history entry type: ${entry.type}`);
  }
}

/**
 * Apply TRANSFORM_CABINET history entry
 */
function applyTransformCabinet(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  // Get the correct state based on direction
  const targetState = direction === 'undo' ? entry.before : entry.after;
  const transforms = targetState as PartTransformMap;

  if (!transforms || typeof transforms !== 'object') {
    console.warn('Invalid transform data for TRANSFORM_CABINET');
    return;
  }

  // Apply transforms to all parts in the cabinet
  Object.entries(transforms).forEach(([partId, transform]) => {
    get().updatePart(partId, transform, true); // skipHistory=true to avoid recursion
  });
}

/**
 * Apply ADD_PART history entry
 */
function applyAddPart(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove the added part
    if (!entry.targetId) return;
    set((s) => ({
      parts: s.parts.filter((p) => p.id !== entry.targetId),
      selectedPartId: s.selectedPartId === entry.targetId ? null : s.selectedPartId,
    }));
  } else {
    // Re-add the part
    const partSnapshot = state as PartSnapshot;
    if (!partSnapshot) return;

    const { _index, ...partData } = partSnapshot;
    set((s) => ({
      parts: [...s.parts, partData as Part],
    }));
  }
}

/**
 * Apply REMOVE_PART history entry
 */
function applyRemovePart(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Restore the removed part
    const partSnapshot = state as PartSnapshot;
    if (!partSnapshot) return;

    const { _index, ...partData } = partSnapshot;
    const part = partData as Part;

    set((s) => {
      const newParts = [...s.parts];
      // Try to restore at original index if available
      if (_index !== undefined && _index >= 0 && _index <= newParts.length) {
        newParts.splice(_index, 0, part);
      } else {
        newParts.push(part);
      }
      return { parts: newParts };
    });
  } else {
    // Remove the part again
    if (!entry.targetId) return;
    set((s) => ({
      parts: s.parts.filter((p) => p.id !== entry.targetId),
      selectedPartId: s.selectedPartId === entry.targetId ? null : s.selectedPartId,
    }));
  }
}

/**
 * Apply UPDATE_PART or TRANSFORM_PART history entry
 */
function applyUpdatePart(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (!entry.targetId) return;
  const updates = state as Partial<Part> | TransformSnapshot;

  set((s) => ({
    parts: s.parts.map((p) =>
      p.id === entry.targetId
        ? { ...p, ...updates, updatedAt: new Date() }
        : p
    ),
  }));
}

/**
 * Apply DUPLICATE_PART history entry
 */
function applyDuplicatePart(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove the duplicated part
    if (!entry.targetId) return;
    set((s) => ({
      parts: s.parts.filter((p) => p.id !== entry.targetId),
      selectedPartId: s.selectedPartId === entry.targetId ? null : s.selectedPartId,
    }));
  } else {
    // Re-add the duplicated part
    const partSnapshot = state as PartSnapshot;
    if (!partSnapshot) return;

    const { _index, ...partData } = partSnapshot;
    set((s) => ({
      parts: [...s.parts, partData as Part],
    }));
  }
}

/**
 * Apply ADD_CABINET history entry
 */
function applyAddCabinet(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove the cabinet and its parts
    if (!entry.targetId) return;
    const cabinet = get().cabinets.find((c) => c.id === entry.targetId);
    if (!cabinet) return;

    set((s) => ({
      cabinets: s.cabinets.filter((c) => c.id !== entry.targetId),
      parts: s.parts.filter((p) => !cabinet.partIds.includes(p.id)),
      selectedCabinetId: s.selectedCabinetId === entry.targetId ? null : s.selectedCabinetId,
    }));
  } else {
    // Re-add the cabinet and its parts
    const snapshot = state as CabinetSnapshot;
    if (!snapshot || !snapshot.cabinet || !snapshot.parts) return;

    const { cabinet, parts } = snapshot;

    set((s) => ({
      cabinets: [...s.cabinets, cabinet],
      parts: [...s.parts, ...parts],
    }));
  }
}

/**
 * Apply REMOVE_CABINET history entry
 */
function applyRemoveCabinet(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Restore the cabinet and its parts
    const snapshot = state as CabinetSnapshot;
    if (!snapshot || !snapshot.cabinet || !snapshot.parts) return;

    const { cabinet, parts } = snapshot;
    const { _index, ...cabinetData } = cabinet;

    set((s) => {
      const newCabinets = [...s.cabinets];
      // Try to restore at original index if available
      if (_index !== undefined && _index >= 0 && _index <= newCabinets.length) {
        newCabinets.splice(_index, 0, cabinetData as Cabinet);
      } else {
        newCabinets.push(cabinetData as Cabinet);
      }

      return {
        cabinets: newCabinets,
        parts: [...s.parts, ...parts],
      };
    });
  } else {
    // Remove the cabinet again
    if (!entry.targetId) return;
    const cabinet = get().cabinets.find((c) => c.id === entry.targetId);
    if (!cabinet) return;

    set((s) => ({
      cabinets: s.cabinets.filter((c) => c.id !== entry.targetId),
      parts: s.parts.filter((p) => !cabinet.partIds.includes(p.id)),
      selectedCabinetId: s.selectedCabinetId === entry.targetId ? null : s.selectedCabinetId,
    }));
  }
}

/**
 * Apply DUPLICATE_CABINET history entry
 */
function applyDuplicateCabinet(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove the duplicated cabinet and its parts
    if (!entry.targetId) return;
    const cabinet = get().cabinets.find((c) => c.id === entry.targetId);
    if (!cabinet) return;

    set((s) => ({
      cabinets: s.cabinets.filter((c) => c.id !== entry.targetId),
      parts: s.parts.filter((p) => !cabinet.partIds.includes(p.id)),
      selectedCabinetId: s.selectedCabinetId === entry.targetId ? null : s.selectedCabinetId,
    }));
  } else {
    // Re-add the duplicated cabinet and its parts
    const snapshot = state as CabinetSnapshot;
    if (!snapshot || !snapshot.cabinet || !snapshot.parts) return;

    const { cabinet, parts } = snapshot;

    set((s) => ({
      cabinets: [...s.cabinets, cabinet],
      parts: [...s.parts, ...parts],
    }));
  }
}

/**
 * Apply UPDATE_CABINET or REGENERATE_CABINET history entry
 */
function applyCabinetUpdate(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (!entry.targetId) return;
  const snapshot = state as CabinetRegenerationSnapshot | Partial<Cabinet>;
  if (!snapshot) return;

  const cabinet = get().cabinets.find((c) => c.id === entry.targetId);
  if (!cabinet) return;

  const isRegenerationSnapshot = Array.isArray((snapshot as CabinetRegenerationSnapshot).parts)
    && Array.isArray((snapshot as CabinetRegenerationSnapshot).partIds);

  // Simple cabinet field update (e.g., rename)
  if (!isRegenerationSnapshot) {
    const cabinetPatch = snapshot as Partial<Cabinet>;
    set((s) => ({
      cabinets: s.cabinets.map((c) =>
        c.id === entry.targetId
          ? { ...c, ...cabinetPatch, updatedAt: new Date() }
          : c
      ),
    }));
    return;
  }

  const { cabinetParams, partIds, parts } = snapshot as CabinetRegenerationSnapshot;

  // Remove old parts
  set((s) => {
    const remainingParts = s.parts.filter((p) => !cabinet.partIds.includes(p.id));

    return {
      parts: [...remainingParts, ...parts],
      cabinets: s.cabinets.map((c) =>
        c.id === entry.targetId
          ? {
              ...c,
              ...cabinetParams,
              partIds,
              updatedAt: new Date(),
            }
          : c
      ),
    };
  });
}

/**
 * Apply UPDATE_GROUP history entry (manual group rename)
 */
function applyGroupRename(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  const snapshot = state as GroupRenameSnapshot;
  if (!snapshot || !snapshot.partIds?.length) return;

  const nextName = snapshot.name;
  const partIdSet = new Set(snapshot.partIds);

  set((s) => {
    let changed = false;
    const now = new Date();
    const updatedParts = s.parts.map((part) => {
      if (!partIdSet.has(part.id)) return part;
      changed = true;
      return { ...part, group: nextName, updatedAt: now };
    });

    if (!changed) return s;
    return { parts: updatedParts };
  });
}

// ============================================================================
// Multiselect Operations
// ============================================================================

/**
 * Apply TRANSFORM_MULTISELECT history entry
 * Works the same as TRANSFORM_CABINET - applies transforms to multiple parts
 */
function applyTransformMultiselect(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  // Get the correct state based on direction
  const targetState = direction === 'undo' ? entry.before : entry.after;
  const transforms = targetState as PartTransformMap;

  if (!transforms || typeof transforms !== 'object') {
    console.warn('Invalid transform data for TRANSFORM_MULTISELECT');
    return;
  }

  // Apply transforms to all parts
  const now = new Date();
  set((s) => ({
    parts: s.parts.map((part) => {
      const transform = transforms[part.id];
      if (!transform) return part;
      return { ...part, ...transform, updatedAt: now };
    }),
  }));
}

/**
 * Apply DELETE_MULTISELECT history entry
 */
function applyDeleteMultiselect(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Restore deleted parts
    const snapshot = entry.before as { parts?: PartSnapshot[] };
    if (!snapshot?.parts?.length) return;

    set((s) => {
      const newParts = [...s.parts];
      // Restore each part at its original index if possible
      snapshot.parts!.forEach((partSnapshot) => {
        const { _index, ...partData } = partSnapshot;
        const part = partData as Part;
        if (_index !== undefined && _index >= 0 && _index <= newParts.length) {
          newParts.splice(_index, 0, part);
        } else {
          newParts.push(part);
        }
      });
      return { parts: newParts };
    });
  } else {
    // Delete parts again
    const snapshot = entry.before as { parts?: PartSnapshot[] };
    if (!snapshot?.parts?.length) return;

    const partIdsToDelete = new Set(snapshot.parts.map((p) => p.id));
    set((s) => ({
      parts: s.parts.filter((p) => !partIdsToDelete.has(p.id)),
      selectedPartId: partIdsToDelete.has(s.selectedPartId ?? '') ? null : s.selectedPartId,
      selectedPartIds: new Set<string>(),
    }));
  }
}

/**
 * Apply DUPLICATE_MULTISELECT history entry
 */
function applyDuplicateMultiselect(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove duplicated parts
    const snapshot = entry.after as { parts?: Part[] };
    if (!snapshot?.parts?.length) return;

    const partIdsToRemove = new Set(snapshot.parts.map((p) => p.id));
    set((s) => ({
      parts: s.parts.filter((p) => !partIdsToRemove.has(p.id)),
      selectedPartId: partIdsToRemove.has(s.selectedPartId ?? '') ? null : s.selectedPartId,
      selectedPartIds: new Set<string>(),
    }));
  } else {
    // Re-add duplicated parts
    const snapshot = entry.after as { parts?: Part[] };
    if (!snapshot?.parts?.length) return;

    set((s) => ({
      parts: [...s.parts, ...snapshot.parts!],
    }));
  }
}

