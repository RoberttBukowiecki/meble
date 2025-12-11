# Inline renaming plan (cabinets, groups, parts)

## Goals
- Allow renaming cabinets, manual groups, and parts directly from the list with minimal rerenders and consistent history coverage.
- Keep UX predictable: click-to-focus or edit icon; commit on Enter/blur; escape cancels to previous value.
- Prevent accidental global renders by scoping store updates and using controlled inputs sparingly.

## Scope
- UI: Parts list rows (cabinet headers, manual group headers, part rows).
- Store actions: update cabinet name, manual group name, part name.
- History: record rename operations with undo/redo.
- i18n: ensure labels/tooltips use existing locale strings where applicable.

## Interaction model
- Trigger: either dedicated edit icon or single-click on name area when not selected; entering edit mode should not toggle selection.
- Commit: Enter or blur saves; Escape cancels and restores previous value.
- Validation: trim whitespace; ignore no-op changes; optional max length (e.g., 120 chars).
- Selection behavior: editing should not clear current selection; keep highlight.

## Data/model requirements
- Actions:
  - `renameCabinet(id, name, skipHistory?)`
  - `renameManualGroup(id, name, skipHistory?)`
  - `renamePart(id, name, skipHistory?)`
- History entries: `UPDATE_CABINET`, `UPDATE_PART`, `UPDATE_GROUP` (new) with before/after name snapshots.
- Derived selectors: expose single-entity selectors to avoid rerendering entire list when one name changes.

## UI implementation plan
- Extract reusable inline input component with:
  - `value`, `onCommit`, `onCancel`, `disabled?`, `isDirty` indicator (optional).
  - Internal state synced to prop; debounced `onCommit` (150–250ms) to avoid rapid store writes while typing.
  - Prevent bubbling clicks to row selection; stop propagation on focus/click.
- Cabinets:
  - Replace static name in group header with inline editable; keep cabinet click handler on surrounding area.
- Manual groups:
  - Same inline editable in header; ensures double-click on parts still works.
- Parts:
  - Inline editable in row; retain double-click-to-select behavior—rename entry uses a small edit affordance to avoid conflict.

## Performance considerations
- Use `useStore(selector, shallow)` per row to fetch only the needed entity to limit list rerenders.
- Memoize row components; avoid passing new object literals each render.
- Debounce commits; guard against duplicate history entries for identical names.

## Testing
- Unit tests for rename actions (cabinet, group, part) and history entries.
- Interaction tests: commit on Enter/blur, cancel on Escape, ignore whitespace no-op, keeps selection state.
- Regression: ensure double-click selection still works when not in edit mode.

