# Room Builder Plan

## Context & Objectives
- Extend the current Next.js + TS + R3F + Zustand stack with room authoring to complement 3D furniture placement.
- Deliver parameterized ready-made room shapes plus freeform wall drawing in 2D.
- Allow placing two window types (standard, floor-to-ceiling) and doors on walls.
- Generate a 3D room (walls, floor, ceiling, openings) from the 2D plan with appropriate lighting (window light + artificial).
- Keep undo/redo history, snapping, and UX patterns consistent with existing editors.

## Data Model (new types)
- **Room**: `id`, `name`, `heightMm`, `wallThicknessMm`, `floorThicknessMm`, `defaultCeiling` (on/off), material refs (`wallMaterialId`, `floorMaterialId`, `ceilingMaterialId`), lighting preset, origin (0,0) in 2D.
- **WallSegment**: `id`, `roomId`, `start: [x, z]`, `end: [x, z]`, `thicknessMm?`, `heightMm?`, `normal: [nx, nz]` (derived), `lengthMm` (derived), `join` type (`MITER`/`BUTT`), optional `openingIds`.
- **Opening** (attached to wall): `id`, `wallId`, `type: 'WINDOW' | 'DOOR'`, `variant` (for windows: `'STANDARD' | 'FLOOR_TO_CEILING'`), `widthMm`, `heightMm`, `sillHeightMm` (0 for floor-to-ceiling), `offsetFromStartMm`, `swing` (`LEFT`/`RIGHT` for doors), `depthMm?` (frame thickness), `insetMm` (how deep into wall), `label` for UI.
- **RoomTemplate**: descriptor with `id`, `label`, `params` schema, and generator returning ordered `WallSegment` definitions closing the loop.
- **Selectors**: helpers to compute floor polygon, bounding boxes, area, and to validate non-self-intersecting outlines.

## Milestones & Tasks
### 1) Store & Types Foundation
- Add room-related interfaces to `src/types` and expand Zustand slices with `rooms`, `walls`, `openings`.
- Actions: `createRoom`, `applyTemplate(roomId, templateId, params)`, `addWall`, `updateWall`, `deleteWall`, `addOpening`, `updateOpening`, `deleteOpening`, `setActiveRoom`.
- History integration: batch updates for drag interactions; persist in localStorage alongside furniture.
- Derived selectors: wall normals/lengths, floor outline, total area, opening bounds.

### 2) Ready-Made Room Shapes (parameterized)
- Templates: Rectangle (width, depth), L-shape (width, depth, legWidth, legDepth), T-shape (stem width/depth), Corridor (length, width), Custom polygon (manual).
- UI: Template picker with number inputs; preview diagram; “Użyj szablonu” action populating walls around origin.
- Guardrails: disallow negative/zero params; auto-orient clockwise and snap first corner to (0,0).

### 3) 2D Wall Editor & Snapping
- Fullscreen/large dialog similar to 2D shape editor: SVG/canvas with grid in mm, zoom/pan, snap toggles (grid + 90°/45° angles).
- Tools: add wall (click to extend from last point), move vertices, insert/delete vertices, straighten collinear segments, close loop.
- Wall properties sidebar: length, thickness, height override, lock angle, join type; validation for minimum lengths and closed polygon check.
- Visual aids: dimension labels on hover, indicators for open outline, warnings for self-intersections.

### 4) Openings Placement (windows & doors)
- Opening palette: `Okno` (standard), `Okno do podłogi`, `Drzwi` with presets for width/height/sill.
- Placement flow: select wall → drag handle along wall axis → snap offset to grid; clamp so opening fits inside wall length; prevent overlap between openings.
- Properties panel: width, height, sillHeight (auto 0 for floor-to-ceiling), offset, swing (for doors), inset/frame depth; live preview on 2D plan (different icons per type).
- Validation: ensure opening top ≤ wall height; maintain minimum margins near corners; auto-relayout openings when wall endpoints move.

### 5) 3D Room Generation
- New `Room3D` component rendered in `Scene` before furniture; coordinate mapping: 2D X→world X, 2D Z→world Z, Y is vertical.
- Walls: extrude per-segment geometry along length with thickness centered on wall line; carve openings via `THREE.Shape` holes to avoid heavy CSG; UVs aligned vertically for materials.
- Floor/Ceiling: build `THREE.Shape` from closed outline; extrude floor thickness downward, ceiling as thin plane at room height (optional toggle).
- Openings geometry: insert simple frame + glass for windows; door leaf + frame with slight open angle for visual; floor-to-ceiling windows use sillHeight=0 and taller glass.
- Group everything under room root for easy transforms/cleanup; expose bounding box for collision/snapping with furniture later.

### 6) Lighting Strategy
- Natural light: per-window `RectAreaLight` facing inward sized to opening; intensity scaled by area; optional global sun `DirectionalLight` with time-of-day/azimuth controls.
- Artificial: room-level ambient/hemisphere light; auto place ceiling lights (point/spot) at center or grid based on room size; controls for intensity/color temperature and toggles.
- Performance: reuse materials/lights where possible; debounce light re-creation on drag; allow disabling real-time window lights on low-end devices.

### 7) UI Integration & Flows
- Sidebar tab “Pomieszczenie”: sections for template, walls list, openings list, lighting; actions for duplicate/delete room.
- Toolbar buttons: “Edytuj rzut 2D”, “Dodaj okno”, “Dodaj drzwi”, “Reset widoku”; keep keyboard shortcuts consistent with existing snap/transform logic.
- i18n: add PL strings to `messages/pl.json` (and keys ready for `en.json`); labels/tooltips for wall/opening tools and lighting controls.
- Persist active room selection; debounce autosave of 2D edits to avoid history spam.

### 8) Testing & Validation
- Unit: template generators produce correct wall counts/lengths; opening bounds/overlap detection; outline validation (closed, non-intersecting).
- Integration: store actions update derived selectors; 2D editor drag does not break history; 3D component renders without errors for each template + openings mix.
- Visual/manual checklist: apply each template, add both window types + doors, verify 3D holes alignment, check lighting changes on window size edits, performance on large rooms.

## Deliverables
- New documentation-complete plan (this file).
- Room data structures and store slice design.
- UX blueprint for 2D editor with openings.
- 3D rendering + lighting strategy aligned with current R3F scene.
