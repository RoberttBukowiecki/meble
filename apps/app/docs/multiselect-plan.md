# Multi-select plan

## Goals
- Enable shift-based multi-select for parts, manual groups, and cabinets without introducing unnecessary rerenders.
- Keep cabinet-first selection semantics: single-click selects the group (cabinet/manual group), double-click drills into individual part selection; Shift+click toggles parts within the active scope.
- Support batch actions on selections: delete, duplicate, move, rotate, and grouping selected parts into a new manual group.
- Maintain production-grade UX: predictable selection rules, keyboard shortcuts, and robust undo/redo coverage.

## Scope & guardrails
- Scope: selection state, grouping model, canvas interactions, parts list UI, history entries, collision recalculation, keyboard shortcuts.
- Guardrails: no mixed-furniture selections; block mixed cabinet + loose part selection. Selection updates must be O(affected items) and selector-based to avoid global rerenders.

## Data model changes
- Selection slice:
  - Add `selectedPartIds: string[]`, `activeGroupId: string | null`, `selectedCabinetId`, `selectionMode: 'none' | 'cabinet' | 'group' | 'parts'`, `lastSelectedId: string | null`.
  - Keep `selectedPartId` for backward compatibility, mirroring first item of `selectedPartIds` when applicable.
  - Helper actions: `selectGroup(groupId)`, `selectCabinet(id|null)`, `togglePart(id, withRange?)`, `clearSelection()`, `selectParts(ids)`.
  - Derived selectors: `useSelectedParts()`, `useIsSelected(id)`, `useActiveGroupParts()` using `subscribeWithSelector` to limit rerenders.
- Group model:
  - Introduce `manualGroups` entity `{id, name, furnitureId, partIds, createdAt, updatedAt}`.
  - Parts carry `groupId?: string` (replace `group?: string`). Migration: when `part.group` exists, create/merge manual group per furniture+name.
- History:
  - Add batch-friendly entries with `targetIds` for multi-delete/duplicate/transform/group/ungroup.
  - Wrap drag transforms in `beginBatch/commitBatch` for selections (cabinet or multi-part).

## Interaction rules
- Single click:
  - Cabinet group row/mesh -> select cabinet (clears part selection).
  - Manual group row -> set `activeGroupId` and highlight its parts.
  - Ungrouped part row -> select part (single).
- Double click:
  - Part in cabinet/manual group -> select part (sets `selectionMode: 'parts'`, `selectedPartIds=[id]`, keeps `activeGroupId`).
- Shift+click:
  - If a group is active and clicked part belongs to it -> toggle in `selectedPartIds`.
  - If no active group -> start multi-select scoped to clicked part’s group/furniture; set `activeGroupId` accordingly (or null for ungrouped/furniture scope).
- Canvas background click -> `clearSelection()`.
- Keyboard shortcuts:
  - `Shift + click` for multi-select.
  - Existing translate (`T`), rotate (`R`), delete (`Del/Backspace`), duplicate (`Cmd/Ctrl+D`) act on current selection scope.
  - Escape clears selection.

## Actions per scope
- Cabinet selection:
  - Delete -> existing `removeCabinet`.
  - Duplicate -> existing `duplicateCabinet`.
  - Move/rotate -> existing `CabinetGroupTransform`.
  - Rename -> inline on list.
- Manual group selection:
  - Delete -> ungroup parts by default (keep parts). Make destructive delete optional flag (future).
  - Duplicate -> clone parts + group with offset from centroid; rewire `groupId`.
  - Move/rotate -> new `PartsGroupTransform` using bounding box of group parts.
  - Rename -> inline on list.
- Multi-part selection (same furniture/group constraint):
  - Delete -> remove selected parts.
  - Duplicate -> clone selected parts with positional offset; clear cabinet metadata unless cabinet-selected path used.
  - Move/rotate -> multi-part transform gizmo; commit as one history entry.
  - Group -> create manual group from selection; set activeGroupId to new group.

## UI work
- Parts list:
  - Virtualize rows to avoid rerenders; memoized group builders.
  - Distinguish group-click vs part double-click; Shift+click toggles.
  - Selection highlighting synced with store selectors (no full-store subscriptions).
- Canvas:
  - Part click handler updated to respect Shift and group rules.
  - Multi-part transform controls component with batch updates and throttled history snapshots.
  - Collision highlighting remains per-part/group, using `useIsSelected`.

## Performance considerations
- Normalize state (IDs in `manualGroups`), avoid storing arrays of parts in UI state.
- Selector-based hooks (`useStore(selector, shallow)`), avoid inline object creation inside render loops.
- Memoize derived `partsByCabinet`, `partsByGroup`, `selectedSet` to O(1) lookups.
- Limit history size impact by storing deltas, not full arrays, for multi-operations.

## Migration steps
1) Add selection slice fields + helpers; update types.
2) Add manual groups store + migration from `part.group`.
3) Update selectors/hooks (`useSelectedParts`, `useActiveGroupParts`).
4) Update canvas interactions and transform controls.
5) Update parts list interactions + virtualization and inline rename entry points.
6) Wire keyboard shortcuts (Shift+click already native, doc update; ensure Escape clears).
7) Tests: selection rules, grouping actions, history entries, migration of legacy `group`.

