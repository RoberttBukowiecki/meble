/**
 * Countertop History Apply Handlers
 *
 * Functions to apply countertop-related history entries (undo/redo)
 */

import type {
  HistoryEntry,
  CountertopGroupSnapshot,
  CountertopSegmentSnapshot,
  CncOperationSnapshot,
  CountertopCornerSnapshot,
  CountertopJointSnapshot,
  BatchCountertopConfigSnapshot,
  CountertopGroup,
  KitchenCabinetParams,
} from '@/types';
import type { StoreState } from '../types';

type SetFn = (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void;

/**
 * Apply ADD_COUNTERTOP_GROUP history entry
 */
export function applyAddCountertopGroup(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  if (direction === 'undo') {
    // Remove the added group
    if (!entry.targetId) return;
    set((s) => ({
      countertopGroups: s.countertopGroups.filter((g) => g.id !== entry.targetId),
      selectedCountertopGroupId:
        s.selectedCountertopGroupId === entry.targetId ? null : s.selectedCountertopGroupId,
    }));
  } else {
    // Re-add the group
    const snapshot = state as CountertopGroupSnapshot;
    if (!snapshot?.group) return;

    const { _index, ...groupData } = snapshot.group;
    set((s) => {
      const newGroups = [...s.countertopGroups];
      if (_index !== undefined && _index >= 0 && _index <= newGroups.length) {
        newGroups.splice(_index, 0, groupData as CountertopGroup);
      } else {
        newGroups.push(groupData as CountertopGroup);
      }
      return { countertopGroups: newGroups };
    });
  }
}

/**
 * Apply REMOVE_COUNTERTOP_GROUP history entry
 */
export function applyRemoveCountertopGroup(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  if (direction === 'undo') {
    // Restore the removed group
    const snapshot = state as CountertopGroupSnapshot;
    if (!snapshot?.group) return;

    const { _index, ...groupData } = snapshot.group;
    set((s) => {
      const newGroups = [...s.countertopGroups];
      if (_index !== undefined && _index >= 0 && _index <= newGroups.length) {
        newGroups.splice(_index, 0, groupData as CountertopGroup);
      } else {
        newGroups.push(groupData as CountertopGroup);
      }
      return { countertopGroups: newGroups };
    });
  } else {
    // Remove the group again
    if (!entry.targetId) return;
    set((s) => ({
      countertopGroups: s.countertopGroups.filter((g) => g.id !== entry.targetId),
      selectedCountertopGroupId:
        s.selectedCountertopGroupId === entry.targetId ? null : s.selectedCountertopGroupId,
    }));
  }
}

/**
 * Apply UPDATE_COUNTERTOP_GROUP history entry
 */
export function applyUpdateCountertopGroup(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as CountertopGroupSnapshot;
  if (!snapshot?.group) return;

  const { _index, ...groupData } = snapshot.group;
  set((s) => ({
    countertopGroups: s.countertopGroups.map((g) =>
      g.id === groupData.id ? (groupData as CountertopGroup) : g
    ),
  }));
}

/**
 * Apply UPDATE_COUNTERTOP_SEGMENT history entry
 */
export function applyUpdateCountertopSegment(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as CountertopSegmentSnapshot;
  if (!snapshot?.groupId || !snapshot?.segment) return;

  set((s) => ({
    countertopGroups: s.countertopGroups.map((group) => {
      if (group.id !== snapshot.groupId) return group;
      return {
        ...group,
        segments: group.segments.map((seg) =>
          seg.id === snapshot.segment.id ? snapshot.segment : seg
        ),
        updatedAt: new Date(),
      };
    }),
  }));
}

/**
 * Apply ADD_CNC_OPERATION history entry
 */
export function applyAddCncOperation(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = entry.after as CncOperationSnapshot;
  if (!snapshot?.groupId || !snapshot?.segmentId || !snapshot?.operation) return;

  if (direction === 'undo') {
    // Remove the added operation
    set((s) => ({
      countertopGroups: s.countertopGroups.map((group) => {
        if (group.id !== snapshot.groupId) return group;
        return {
          ...group,
          segments: group.segments.map((seg) => {
            if (seg.id !== snapshot.segmentId) return seg;
            return {
              ...seg,
              cncOperations: seg.cncOperations.filter((op) => op.id !== snapshot.operation.id),
            };
          }),
          updatedAt: new Date(),
        };
      }),
    }));
  } else {
    // Re-add the operation
    set((s) => ({
      countertopGroups: s.countertopGroups.map((group) => {
        if (group.id !== snapshot.groupId) return group;
        return {
          ...group,
          segments: group.segments.map((seg) => {
            if (seg.id !== snapshot.segmentId) return seg;
            return {
              ...seg,
              cncOperations: [...seg.cncOperations, snapshot.operation],
            };
          }),
          updatedAt: new Date(),
        };
      }),
    }));
  }
}

/**
 * Apply REMOVE_CNC_OPERATION history entry
 */
export function applyRemoveCncOperation(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = entry.before as CncOperationSnapshot;
  if (!snapshot?.groupId || !snapshot?.segmentId || !snapshot?.operation) return;

  if (direction === 'undo') {
    // Restore the removed operation
    set((s) => ({
      countertopGroups: s.countertopGroups.map((group) => {
        if (group.id !== snapshot.groupId) return group;
        return {
          ...group,
          segments: group.segments.map((seg) => {
            if (seg.id !== snapshot.segmentId) return seg;
            return {
              ...seg,
              cncOperations: [...seg.cncOperations, snapshot.operation],
            };
          }),
          updatedAt: new Date(),
        };
      }),
    }));
  } else {
    // Remove the operation again
    set((s) => ({
      countertopGroups: s.countertopGroups.map((group) => {
        if (group.id !== snapshot.groupId) return group;
        return {
          ...group,
          segments: group.segments.map((seg) => {
            if (seg.id !== snapshot.segmentId) return seg;
            return {
              ...seg,
              cncOperations: seg.cncOperations.filter((op) => op.id !== snapshot.operation.id),
            };
          }),
          updatedAt: new Date(),
        };
      }),
    }));
  }
}

/**
 * Apply UPDATE_CNC_OPERATION history entry
 */
export function applyUpdateCncOperation(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as CncOperationSnapshot;
  if (!snapshot?.groupId || !snapshot?.segmentId || !snapshot?.operation) return;

  set((s) => ({
    countertopGroups: s.countertopGroups.map((group) => {
      if (group.id !== snapshot.groupId) return group;
      return {
        ...group,
        segments: group.segments.map((seg) => {
          if (seg.id !== snapshot.segmentId) return seg;
          return {
            ...seg,
            cncOperations: seg.cncOperations.map((op) =>
              op.id === snapshot.operation.id ? snapshot.operation : op
            ),
          };
        }),
        updatedAt: new Date(),
      };
    }),
  }));
}

/**
 * Apply UPDATE_COUNTERTOP_CORNER history entry
 */
export function applyUpdateCountertopCorner(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as CountertopCornerSnapshot;
  if (!snapshot?.groupId || !snapshot?.corner) return;

  set((s) => ({
    countertopGroups: s.countertopGroups.map((group) => {
      if (group.id !== snapshot.groupId) return group;
      return {
        ...group,
        corners: group.corners.map((corner) =>
          corner.position === snapshot.corner.position ? snapshot.corner : corner
        ),
        updatedAt: new Date(),
      };
    }),
  }));
}

/**
 * Apply UPDATE_COUNTERTOP_JOINT history entry
 */
export function applyUpdateCountertopJoint(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as CountertopJointSnapshot;
  if (!snapshot?.groupId || !snapshot?.joint) return;

  set((s) => ({
    countertopGroups: s.countertopGroups.map((group) => {
      if (group.id !== snapshot.groupId) return group;
      return {
        ...group,
        joints: group.joints.map((joint) =>
          joint.id === snapshot.joint.id ? snapshot.joint : joint
        ),
        updatedAt: new Date(),
      };
    }),
  }));
}

/**
 * Apply BATCH_UPDATE_COUNTERTOP_CONFIG history entry
 */
export function applyBatchUpdateCountertopConfig(
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
  get: () => StoreState,
  set: SetFn,
  state: unknown
): void {
  const snapshot = state as BatchCountertopConfigSnapshot;
  if (!snapshot?.furnitureId || !snapshot?.cabinetConfigs) return;

  const configMap = new Map(
    snapshot.cabinetConfigs.map((c) => [c.cabinetId, c.config])
  );

  set((s) => ({
    cabinets: s.cabinets.map((cabinet) => {
      if (!configMap.has(cabinet.id)) return cabinet;
      const newConfig = configMap.get(cabinet.id);
      return {
        ...cabinet,
        params: {
          ...cabinet.params,
          countertopConfig: newConfig,
        } as KitchenCabinetParams,
        updatedAt: new Date(),
      };
    }),
  }));
}
