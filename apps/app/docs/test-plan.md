# apps/app Test Coverage Plan

## 1. App structure in brief
- `src/app` wires the `<Scene />`, `<Sidebar />`, `<HistoryPanel />`, and the global layout (`layout.tsx`) with the persisted store + internationalization providers.
- `src/components` groups: `ui/*` (panels, dialogs, controls), `layout/*` (panels/drawers), `canvas/*` (R3F scene, lighting, transforms), and `room-editor/*` (2D room editor).
- `src/lib` hosts the business rules: `store` with many slices, `cabinetGenerators/*`, `snapping.ts`, `resize.ts`, `binding-box-utils.ts`, `dimension-calculator.ts`, `config.ts`, utility helpers, CSV export, and keyboard configuration.
- `src/hooks`, `src/actions`, and the `docs` folder document workflows; `hooks/useHistoryKeyboard.ts` and the server action `actions/locale.ts` are the only custom hooks/actions outside React components.

## 2. Current test surface (all files under `apps/app/src` with `.test` suffix)
1. Components:
   - `components/ui/InlineEditableText.test.tsx` (interaction with text inputs, commit/cancel logic).
2. Libraries:
   - `lib/csv.test.ts` (CSV row formatting + `validateParts`).
   - `lib/collisionDetection.test.ts` (collision detection + helpers like `isPartColliding`).
   - `lib/utils.test.ts` (only the `cn` helper).
3. Store slices:
   - Selection, materials, furniture, parts, cabinets, collisions, dimensions, history, UI, snap slices each have a dedicated `.test.ts` file under `lib/store/slices`.

## 3. Coverage gaps and focus areas
The rest of the app still lacks automated coverage. Break the backlog into digestible swaths:

### 3.1 UI shell & sidebar flow (`components/ui/*.tsx`)
- `Sidebar.tsx` orchestrates tabs, `handleAddPart`, CSV validation, dialogs (`CabinetTemplateDialog`, `ExportDialog`). Verify: tab switching (`properties`, `list`, optional `room`), `validateParts` error dialog triggers, and disabling the export button when no parts exist.
- `PropertiesPanel.tsx`, `PartsTable.tsx`, `RoomPanel.tsx`, `HistoryButtons.tsx`, `SettingsDropdown.tsx`, `AssemblyConfig.tsx`, `DimensionsConfig.tsx`, `HandlesConfig.tsx`, `SnapControlPanel.tsx`, `GraphicsSettingsPanel.tsx`, `DimensionControlPanel.tsx`, `KeyboardShortcutsHelp.tsx`, etc., all read from the store and drive dialogs/buttons. Add tests that render the component with mocked store slices and assert key callbacks (`updateCabinet`, `toggleSnap`, etc.).
- `InlineEditableText` already has coverage, so use it as a model for dialog/field-focused tests.

### 3.2 Canvas + layout shell (`components/canvas`, `components/layout`)
- `Scene.tsx` hosts many controls, including transform mode toggles, camera reset, delete/duplicate handlers, the `Canvas` + `SnapProvider`/`DimensionProvider`, and renders overlays (`CollisionWarning`, `KeyboardShortcutsHelp`). Tests should:
  * Mock `useStore` selectors (`shallow` hook) to verify mode buttons call the right setters and `handleDelete` branches.
  * Simulate the camera-reset custom event and ensure `controlsRef.current.reset()` is invoked.
  * Assert the presence/absence of suppliers like `CabinetResizeControls` depending on state (e.g., `selectedCabinetId`, `transformMode`).
- `GlobalKeyboardListener.tsx` manages many shortcuts. Target a test that fires `keydown` events and ensures the right store methods (`selectAll`, `undo`, `toggleGrid`, `setTransformMode`, etc.) are invoked while respecting `isInput` guards.
- Layout components (`HistoryPanel.tsx`, `HistoryDrawer.tsx`, `SnapControlPanel`, `GraphicsSettingsPanel`, `DimensionControlPanel`) all keep UI state with store selectors. Add tests per panel verifying their key buttons, toggles, and conditional rendering (e.g., history drawer open/close).

### 3.3 Room editor + room store (`components/room-editor/Room2DEditor.tsx`, `lib/store/slices/roomSlice.ts`)
- Room editor handles templates, wall drawing, lights, keyboard shortcuts, and stateful drag logic. At minimum, cover the deterministic parts: template application (`handleApplyTemplate` should call `setRoomWalls` and close the menu), adding lights (`activeTool` logic), and wheel zoom.
- `roomSlice.ts` lacks tests: validate `addRoom`, `removeRoom` (cascade deletes walls/openings), `setRoomWalls`, and `updateWalls` rulings. Unit tests should instantiate the slice (`const slice = createRoomSlice(set)` style) and assert state after actions.

### 3.4 Hooks & global listeners
- `hooks/useHistoryKeyboard.ts` and `components/GlobalKeyboardListener.tsx` both react to keyboard events. Tests should mount them with mocked `useStore` to verify: shortcuts prevent propagation when inputs focused, undo/redo calls happen only when `canUndo`/`canRedo` are true, shift tracking toggles state, and `delete`/`duplicate` invoke the correct store functions.
- Document the expectation that `GlobalKeyboardListener` also ignores repeated keys and respects the confirm flow for cabinet deletion.

### 3.5 Library logic (pure utils + domain calculations)
Most complex behavior lives here but is untested beyond `csv`, `collisionDetection`, and `cn`:
- `lib/utils.ts`: add tests for `roundToDecimals`, `roundPosition`, `roundRotation`, `roundDimension` to ensure rounding behavior is consistent.
- `lib/config.ts`: test `normalizeShortcutKeys`/`formatShortcutLabel` and maybe other small helpers.
- `lib/snapping.ts` / `lib/resize.ts` / `lib/dimension-calculator.ts` / `lib/bounding-box-utils.ts`: cover edge/face candidate generation, score logic, simple snap axis restraint, `calculateResize`, `getHandlePosition`, `calculateDimensions`, `getOtherBoundingBoxes`, `quickDistanceCheck`, etc., verifying expected outputs for straightforward scenarios (axis-aligned parts, rotated parts, axis constraints). Start with pure functions (e.g., `getPartEdges`, `getPartFaces`, `calculateSnapSimple`), mocking `Part` inputs.
- `lib/cabinetGenerators/*.ts`: each cabinet generator returns a defined set of parts. Add snapshot-like tests that assert the number of parts, presence of back panels, or key parameter propagation for sample params.
- `lib/handlePresets.ts`, `lib/naming.ts`, `lib/cabinetHelpers.ts`: these helpers can be validated via unit tests (e.g., `calculateHandlePosition`/`generateHandleMetadata` honor preset logic, `getDefaultHandlePositionPreset` reflects door configurations, `sanitizeName` trims+clamps correctly, `getCabinetTypeLabel` returns the localized label). These files are purely deterministic and should be included in the ``lib`` test suite.
- `lib/store/history`: functions such as `applyHistoryEntry` are critical. Tests could instantiate fake entries (add/remove part) and ensure the correct part list is restored.

### 3.6 Store slices missing coverage
Only `graphicsSlice.ts`, `roomSlice.ts`, and `materialPreferencesSlice.ts` are untested. Write slice-level tests that instantiate each slice and mutate state via the exported functions, asserting the persisted shape (`graphicsSettings`, `rooms`, `interiorMaterialPreferences`). This is low-effort and guards future regressions.

### 3.7 Actions & server API
`actions/locale.ts` is the only server action. Add a test that calls `setLocale` with valid and invalid locales (mock `locales` from `@meble/i18n`) and observes that invalid input throws while valid input calls `cookies().set` with the expected options.

## 4. Suggested rollout
1. **Pure functions first.** Start with `lib/utils`, `lib/config`, and the deterministic parts of `snapping/resize/dimension/bounding-box` because they are easiest to unit test and provide quick confidence.
2. **Store slices + helpers.** Fill missing slices and the `roomSlice` logic while the pure functions are still fresh; this gives more stable building blocks for component tests.
3. **Hooks/listeners.** Move to `useHistoryKeyboard`/`GlobalKeyboardListener` and `Room2DEditor` keyboard interactions, as they can reuse mocked slices and helpers from step 2.
4. **Components.** Finish with `Scene`, `Sidebar`, `PropertiesPanel`, and layout components; these will likely be the most involved because they mix providers, refs, and optional modals. Target key behavior paths (tab switching, mode toggles, window confirm handling, dialogs opening/closing) rather than trying to render the full 3D canvas.

## 5. Next steps
- Draft unit tests for the first block (pure libs) and document any helpers/mocks needed (e.g., simple `Part` fixtures).
- Track each area in separate test suites (e.g., `lib/snapping.test.ts`, `lib/resize.test.ts`, `components/scene.test.ts`, `lib/store/slices/graphicsSlice.test.ts`).
- Revisit this plan after the initial tests land to adjust priorities (e.g., once `snapping` is covered, focus on `Scene` integration or room editor keyboard flows).
