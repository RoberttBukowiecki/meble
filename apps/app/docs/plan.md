# Meblarz 3D - MVP Implementation Plan

## Project Overview

**Application:** Meblarz 3D - Web-based 3D furniture modeling tool
**Technology Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Three Fiber (R3F) + @react-three/drei
- Zustand (with localStorage persist)

**Core Features:**
- 3D furniture part modeling (rectangular and complex shapes)
- Material and thickness management
- Edge banding configuration
- CSV export for manufacturing
- Local storage persistence

---

## Phase 0: Project Initialization & Configuration

### Task 0.1: Initialize Next.js Project ✅
- [x] Create new Next.js 14+ project with App Router
- [x] Enable TypeScript configuration
- [x] Set up Tailwind CSS
- [x] Clean up default styles in `globals.css`
- [x] Remove unnecessary default components

**Files affected:**
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `app/globals.css`

---

### Task 0.2: Install Dependencies ✅
- [x] Install 3D libraries:
    - `three`
    - `@types/three`
    - `@react-three/fiber`
    - `@react-three/drei`
- [x] Install state management:
    - `zustand`
- [x] Install utilities:
    - `clsx`
    - `tailwind-merge`
    - `lucide-react`
    - `uuid`
    - `@types/uuid`

**Command:**
```bash
pnpm install three @types/three @react-three/fiber @react-three/drei zustand clsx tailwind-merge lucide-react uuid @types/uuid
```

---

### Task 0.3: Configure shadcn/ui & Theme ✅
- [x] Initialize shadcn/ui in project
- [x] Configure Tailwind theme with CSS variables (NOT hardcoded colors)
- [x] Set up color scheme in `globals.css`:
    - `--primary`, `--secondary`, `--accent`
    - `--background`, `--foreground`
    - `--muted`, `--muted-foreground`
    - `--border`, `--input`, `--ring`
- [x] Update `tailwind.config.ts` to use CSS variables:
  ```ts
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    // ... etc
  }
  ```
- [x] Add required shadcn/ui components:
    - `button`, `input`, `label`, `card`
    - `slider`, `switch`, `table`
    - `dialog`, `select`, `badge`
- [x] **IMPORTANT:** Always use theme colors (e.g., `bg-primary`, `text-foreground`) instead of hardcoded colors (e.g., `bg-blue-500`)

**Command:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label card slider switch table dialog select badge
```

**Files:**
- `tailwind.config.ts`
- `src/app/globals.css`

---

### Task 0.4: Development Tools Setup
- [ ] Configure Prettier for code formatting
    - Create `.prettierrc` with project standards
    - Add format script to package.json: `"format": "prettier --write ."`
- [ ] Enhance ESLint configuration
    - Add React hooks rules
    - Add TypeScript strict rules
    - Enable `strict` mode in `tsconfig.json`
- [ ] Set up Git hooks with Husky (optional but recommended)
    - Pre-commit: lint and format
    - Commit message: conventional commits format
- [ ] Create `.env.local.example` template for environment variables
- [ ] Add `.vscode/settings.json` with recommended settings

**Files:**
- `.prettierrc`
- `.eslintrc.json` (or eslint.config.js)
- `tsconfig.json`
- `.env.local.example`
- `.vscode/settings.json`

---

### Task 0.5: Project Documentation
- [ ] Update `README.md` with:
    - Project description
    - Tech stack overview
    - Getting started instructions (pnpm install, pnpm dev)
    - Project structure
    - Coding conventions (use theme colors!)
- [ ] Create `CHANGELOG.md` for version tracking
- [ ] Create `docs/CONTRIBUTING.md` (optional for MVP)

**Files:**
- `README.md`
- `CHANGELOG.md`

---

## Phase 1: Business Logic (Types & Store)

### Task 1.1: Define TypeScript Types ✅
- [x] Create `src/types/index.ts`
- [x] Define shape types: `RECT`, `TRAPEZOID`, `L_SHAPE`, `POLYGON`
- [x] Define `Material` interface (id, name, color, thickness)
- [x] Define `Furniture` interface (id, name, projectId)
- [x] Define shape parameter interfaces:
    - `ShapeParamsRect`
    - `ShapeParamsTrapezoid`
    - `ShapeParamsLShape`
    - `ShapeParamsPolygon`
- [x] Define discriminated union `ShapeParams`
- [x] Define edge banding interfaces:
    - `EdgeBandingRect` (top, bottom, left, right)
    - `EdgeBandingGeneric` (edges array)
    - `EdgeBanding` discriminated union
- [x] Define `Part` interface with all properties:
    - Basic info (id, name, furnitureId, group)
    - Geometry (shapeType, shapeParams)
    - 3D dimensions (width, height, depth)
    - Transformations (position, rotation)
    - Material and edge banding
- [x] Define `ProjectState` interface

**File:** `src/types/index.ts`

---

### Task 1.2: Create Zustand Store ✅
- [x] Create `src/lib/store.ts`
- [x] Set up Zustand store with persist middleware
- [x] Initialize default state:
    - Empty `parts` array
    - Default furniture ("Domyślny mebel")
    - Sample materials (Biały 18mm, Dąb 18mm, Antracyt 18mm)
    - Selected IDs (null for part, default furniture ID)
- [x] Implement furniture actions:
    - `addFurniture(name: string)`
    - `removeFurniture(id: string)` - cascade delete related parts
    - `setSelectedFurniture(id: string)`
- [x] Implement part actions:
    - `addPart(furnitureId: string)` - generate UUID, default dimensions (600x400x18), RECT shape
    - `updatePart(id: string, patch: Partial<Part>)`
    - `removePart(id: string)`
    - `selectPart(id: string | null)`
- [x] Ensure immutable updates (spread operators)
- [x] Auto-sync `depth` with material `thickness` when material changes

**File:** `src/lib/store.ts`

---

## Phase 2: 3D Fundamentals

### Task 2.1: Create Application Layout ✅
- [x] Create main page layout (`app/[locale]/page.tsx`)
- [x] Set up full-height layout (`min-h-screen`)
- [x] Create left panel (75% width) for 3D Canvas
- [x] Create right sidebar (25% width)
- [x] Add placeholder content

**Files:**
- `src/app/page.tsx`

---

### Task 2.2: Set Up 3D Scene ✅
- [x] Create `src/components/canvas/Scene.tsx` with `use client`
- [x] Render `<Canvas>` from R3F
- [x] Add scene elements:
    - `<OrbitControls makeDefault />`
    - `<Grid>` (infinite grid with 100mm cells)
    - `<ambientLight />`
    - `<directionalLight position={[300, 400, 200]} />`
- [x] Configure camera position `[500, 500, 500]` looking at scene
- [x] Enable shadows on directionalLight

**File:** `src/components/canvas/Scene.tsx`

---

### Task 2.3: Create Basic Part3D Component (RECT only) ✅
- [x] Create `src/components/canvas/Part3D.tsx`
- [x] Accept `part: Part` as props
- [x] Handle `RECT` shape type initially
- [x] Render `<mesh>` with `<boxGeometry args={[width, depth, height]} />`
- [x] Apply position and rotation from part data
- [x] Get material from store by `materialId` (reactive - updates when material changes)
- [x] Apply material color using `<meshStandardMaterial color={material.color} />`
- [x] Fallback to gray (#808080) if material not found
- [x] Ensure component re-renders when material color or part dimensions change

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 2.4: Render Parts List & Add Button ✅
- [x] Connect Scene to Zustand store
- [x] Get `parts` and `selectedFurnitureId` from store
- [x] Filter and render parts belonging to selected furniture
- [x] Create "Add Part" button in Sidebar component
- [x] Wire button to call `addPart(selectedFurnitureId)`
- [x] Verify new parts appear in 3D scene

**Files:**
- `src/components/canvas/Scene.tsx`
- `src/components/ui/AddPartButton.tsx`

---

## Phase 3: Interaction & Editing

### Task 3.1: Implement Part Selection ✅
- [x] Add `onClick` handler to mesh in `Part3D`
- [x] Call `selectPart(part.id)` from store
- [x] Use `event.stopPropagation()` to prevent click-through
- [x] Highlight selected part:
    - Add `<Edges />` from drei
    - Change material `emissive` property to blue when selected
- [x] Compare part ID with `selectedPartId` from store

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 3.2: Add Transform Controls (Translation) ✅
- [x] Import `TransformControls` from `@react-three/drei`
- [x] Show controls ONLY for selected part
- [x] Set mode to `'translate'`
- [x] Create mesh ref
- [x] Handle `onMouseUp` event:
    - Get new position from `meshRef.current.position`
    - Call `updatePart(id, { position: [x, y, z] })`
- [x] Track isTransforming state
- [x] Ensure bidirectional sync between store and 3D position

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 3.3: Add Translation Snapping (Optional) ✅
- [x] Configure `TransformControls` with `translationSnap={10}`
- [x] Test 10mm snap increment for easier positioning

**File:** `src/components/canvas/Part3D.tsx`

---

## Phase 3.5: Support Multiple Shape Types

### Task 3.5: Extend Part3D for All Shapes ✅
- [x] Keep `boxGeometry` for `RECT` shape
- [x] For `TRAPEZOID`, `L_SHAPE`, `POLYGON`:
    - Create `THREE.Shape()` in X-Y plane
    - Build 2D outline from `shapeParams`
    - Use `ExtrudeGeometry` with depth as Z-axis extrusion
    - Set `extrudeSettings: { depth, bevelEnabled: false }`
- [x] Ensure consistent pivot point (center or corner)
- [x] Test shape updates when `shapeParams` changes in store
- [x] Handle geometry recreation on shape change

**File:** `src/components/canvas/Part3D.tsx`

---

## Phase 4: User Interface (Sidebar)

### Task 4.1: Create Properties Panel ✅
- [x] Create `src/components/ui/PropertiesPanel.tsx`
- [x] Connect to Zustand store
- [x] Show panel only when `selectedPartId` is not null
- [x] Find selected part in `parts` array
- [x] Create form inputs:
    - Name (text input)
    - Width X (number input, mm) - for RECT shape
    - Height Y (number input, mm) - for RECT shape
    - Depth Z (tied to material thickness)
    - Position X, Y, Z (number inputs, mm)
    - Group (text input)
    - Notes (textarea)
- [x] Update store immediately on input change
- [x] Validate: prevent negative values (`min={1}`)
- [x] Sync with 3D preview

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.2: Add Material Selector ✅
- [x] Add `<Select>` component from shadcn/ui
- [x] Populate options from `materials` array in store
- [x] On material change:
    - Update `materialId`
    - Update `depth` to match `material.thickness`
- [x] Display material name and thickness in dropdown

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.3: Add Shape Editor ✅
- [x] Add "Shape" section to properties panel
- [x] Create `shapeType` selector: RECT / TRAPEZOID / L_SHAPE / POLYGON
- [x] Show conditional inputs based on selected shape:
    - **RECT:** X (length), Y (width)
    - **TRAPEZOID:** frontX, backX, y, skosSide (select: left/right)
    - **L_SHAPE:** x, y, cutX, cutY
    - **POLYGON:** JSON text input for points array `[[x1,y1], [x2,y2], ...]`
- [x] On input change, call `updatePart` with new `shapeParams`
- [x] Auto-update `width` and `height` based on shape (handled in store)
    - RECT: width = x, height = y
    - TRAPEZOID: width = max(frontX, backX), height = y
    - L_SHAPE/POLYGON: width/height = bounding box dimensions
- [x] Add validation:
    - All values > 0 (via min={1} on inputs)
    - L_SHAPE: cutX < x, cutY < y (handled in store)
    - POLYGON: minimum 3 points (handled in Part3D)

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.4: Add Edge Banding Editor ✅
- [x] Add "Edge Banding" section to properties panel
- [x] For `RECT` shape:
    - Show 4 switches: Top (Y+), Bottom (Y-), Left (X-), Right (X+)
    - Map to `edgeBanding.type === 'RECT'` with data: `{ top, bottom, left, right }`
    - Initialize all to `false` if undefined
- [ ] For other shapes (TRAPEZOID/L_SHAPE/POLYGON):
    - Not implemented in MVP - only RECT shapes have edge banding UI
- [x] On toggle change, call `updatePart` with new `edgeBanding`

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.5: Add Part Management Actions ✅
- [x] Add "Delete" button:
    - Call `removePart(part.id)`
    - Call `selectPart(null)` to deselect
- [x] Add "Duplicate" button:
    - Call `duplicatePart(part.id)` to create copy with all properties
    - Offset position by +50mm on X-axis
    - Append " (kopia)" to name

**File:** `src/components/ui/PropertiesPanel.tsx`

---

## Phase 5: Parts List & CSV Export

### Task 5.1: Create Parts Table ✅
- [x] Create `src/components/ui/PartsTable.tsx`
- [x] Use shadcn/ui `<Table>` component
- [x] Display all parts (or filter by selected furniture)
- [x] Table columns:
    - Furniture name
    - Group
    - Part name
    - Length X (mm)
    - Width Y (mm)
    - Thickness (mm)
    - Material
    - Shape type
    - Edge banding summary (e.g., "G,D,L,P")
- [x] Click row to select part in 3D (`selectPart`)
- [x] Integrated into Sidebar with tabs (Properties / Lista)

**File:** `src/components/ui/PartsTable.tsx`

---

### Task 5.2: Implement CSV Generator ✅
- [x] Create `src/lib/csv.ts`
- [x] Implement `generateCSV(parts, materials, furnitures): string`
- [x] Use semicolon (`;`) as separator
- [x] CSV header format:
  ```
  project;furniture;group;part_id;part_name;material;thickness_mm;length_x_mm;width_y_mm;shape;shape_params;edge_top;edge_bottom;edge_left;edge_right;notes
  ```
- [x] Map each part to CSV row:
    - project: constant value or empty
    - furniture: lookup name by furnitureId
    - material: lookup name by materialId
    - shape_params: JSON string format
    - edge columns: `1` or `0` for RECT type, handle others appropriately
- [x] Create "Export CSV" button in Sidebar
- [x] On click:
    - Get data from store
    - Call `generateCSV`
    - Create Blob
    - Trigger download as `meblarz_export_{date}.csv`

**Files:**
- `src/lib/csv.ts`
- UI button component

---

### Task 5.3: Add Pre-Export Validation ✅
- [x] Create validation function `validateParts(parts, materials): string[]`
- [x] Check each part:
    - Has valid `materialId`
    - Positive dimensions: width, height, depth > 0
    - `depth === material.thickness`
- [x] On validation failure:
    - Prevent CSV generation
    - Show error list in Dialog (shadcn/ui)
- [x] Run validation before CSV generation

**Files:**
- `src/lib/csv.ts` or `src/lib/validation.ts`
- Export button component

---

## Phase 6: Optimization & Polish

### Task 6.0: Version Display & Error Boundary
- [ ] Add version number display in app corner (bottom-right or footer)
    - Read version from `package.json`
    - Display format: `v0.1.0` or `v0.1.0-beta`
    - Style with muted colors (`text-muted-foreground`)
    - Small, non-intrusive (text-xs)
- [ ] Create Error Boundary component
    - Catch React errors gracefully
    - Show user-friendly error message
    - Include version number in error display
    - Log errors to console in development
- [ ] Add version to CSV export (optional)
    - Include in CSV header or metadata comment
    - Format: `# Generated by Meblarz 3D v0.1.0`
- [ ] Set up version bumping workflow
    - Use semantic versioning (MAJOR.MINOR.PATCH)
    - Update CHANGELOG.md with each version
    - Tag releases in git

**Files:**
- `src/components/layout/VersionDisplay.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/lib/version.ts` (helper to read version from package.json)
- `CHANGELOG.md`

**Version Strategy:**
- `0.x.x` - MVP development
- `1.0.0` - First stable release with all MVP features
- `1.x.x` - Post-MVP enhancements

---

### Task 6.1: Add Camera Reset ✅
- [x] Add "Reset Camera" button (top-right corner of canvas)
- [x] Create ref to OrbitControls
- [x] On click:
    - Reset OrbitControls to initial state
    - Camera returns to `[500, 500, 500]`
    - Semi-transparent background with blur effect

**File:** `src/components/canvas/Scene.tsx`

---

### Task 6.2: Enhance Input Validation
- [ ] Set `min={1}` on all dimension number inputs
- [ ] Handle edge cases:
    - If user enters `0` or empty, set to `1` on blur
    - Prevent negative values
- [ ] Add visual feedback for invalid inputs

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 6.3: Fix Camera Movement During Transform ✅
- [x] Add `isTransforming` flag (global state in store)
- [x] Set flag to `true` when TransformControls is active
- [x] Pass to OrbitControls: `enabled={!isTransforming}`
- [x] Prevent camera orbit during object dragging
- [x] Reset flag when transformation ends

**Files:**
- `src/components/canvas/Part3D.tsx`
- `src/components/canvas/Scene.tsx`

---

---

## Recent Implementation Summary (2025-12-09)

### Completed Features ✅
1. **3D Scene Performance** - Fixed grid flickering, increased fadeDistance to 100000mm, large grid (20000x20000mm)
2. **Edge Banding Editor** - Complete UI with 4 toggle switches for RECT shapes (Top, Bottom, Left, Right)
3. **Parts Table Component** - New component with clickable rows, integrated into Sidebar with tabs
4. **Complex Shape Geometries** - Full implementation of TRAPEZOID, L_SHAPE, and POLYGON shapes using ExtrudeGeometry
5. **Shape Editor UI** - Conditional inputs for all shape types with proper validation
6. **Duplicate Functionality** - Now copies all properties, offsets +50mm, adds "(kopia)" suffix
7. **Camera Reset Button** - Floating button in top-right corner with semi-transparent background
8. **Transform Controls UX** - OrbitControls disabled during part transformation for smooth experience

### Files Created
- `src/components/ui/PartsTable.tsx` - Comprehensive parts list component

### Files Modified
- `src/components/canvas/Scene.tsx` - Grid optimization + camera reset + isTransforming integration
- `src/components/canvas/Part3D.tsx` - Complex shape geometries implementation
- `src/components/ui/PropertiesPanel.tsx` - Edge banding + shape editor UI
- `src/components/ui/Sidebar.tsx` - Tabs integration (Properties / Lista)
- `src/lib/store.ts` - duplicatePart + setIsTransforming actions + isTransforming state
- `src/types/index.ts` - Updated ProjectState interface with new actions

---

## MVP Completion Checklist

### Core Functionality
- [x] Create multiple furniture items
- [x] Add parts with different shapes (RECT, TRAPEZOID, L_SHAPE, POLYGON)
- [x] Position and rotate parts in 3D space (translation with TransformControls)
- [x] Assign materials with thickness and color
- [x] Configure edge banding for rectangular parts
- [x] Group parts logically
- [x] View parts list in table format
- [x] Export parts list to CSV with all details
- [x] Validate data before export

### Data Persistence
- [x] All data saves to localStorage automatically
- [x] State persists across browser sessions

### User Experience
- [x] Intuitive 3D manipulation with mouse
- [x] Real-time sync between 3D view and properties panel
- [x] Visual feedback for selected parts
- [x] Clear validation messages
- [x] Camera reset functionality
- [x] OrbitControls disabled during transformation

---

## Testing & Deployment

### Manual Testing Checklist
- [ ] Create a simple cabinet with 5-10 parts
- [ ] Test all shape types (RECT, TRAPEZOID, L_SHAPE)
- [ ] Verify material assignment and thickness sync
- [ ] Test edge banding configuration
- [ ] Export to CSV and verify format
- [ ] Test data persistence (refresh browser)
- [ ] Test delete and duplicate functions
- [ ] Verify validation catches invalid data

### Build & Deploy
- [ ] Run `pnpm build` successfully
- [ ] Test production build locally with `pnpm start`
- [ ] Deploy to hosting platform (Vercel recommended)

---

## Internationalization (i18n)

### Language Support Strategy
**IMPORTANT:** The application must support multi-language functionality from the beginning to avoid costly refactoring later.

### Implementation Guidelines
- **Code & Comments:** Always use English
    - Variable names, function names, types, interfaces - English only
    - Code comments and documentation - English only
    - Git commit messages - English only
- **UI Text:** Use Polish (PL) language by default
    - All user-facing text, labels, buttons, messages - Polish
    - Error messages, validation messages - Polish
    - Help text and tooltips - Polish
- **Translation System:** Prepare for future localization
    - Store all UI strings in a centralized location (e.g., `src/i18n/pl.ts`)
    - Use translation keys/IDs instead of hardcoded strings in components
    - Example: `t('common.save')` instead of `"Zapisz"`
    - Prepare structure for additional languages (e.g., `en.ts`, `de.ts`)

### Translation Update Policy
- **DO NOT** update translations after every feature implementation
- **DO** update all translations before releasing a new version
- **Rationale:**
    - During development, features may be experimental or subject to change
    - Translating incomplete/invalid features wastes AI tokens and human time
    - Complete translation review before release ensures consistency and quality
    - Allows batch translation of multiple features at once

### Files Structure (i18n)
```
src/
├── i18n/
│   ├── pl.ts           # Polish translations (default)
│   ├── en.ts           # English translations (future)
│   └── index.ts        # Translation utility functions
```

### Pre-Release Checklist (i18n)
- [ ] All UI strings use translation system (no hardcoded text)
- [ ] All translation keys are defined in `pl.ts`
- [ ] Validation messages are translated
- [ ] Error messages are user-friendly and translated
- [ ] CSV export headers/metadata are in appropriate language
- [ ] Version display and error boundaries have translated text

---

## Future Enhancements (Post-MVP)

### Core Features
- Rotation controls (not just translation)
- Advanced edge banding editor for complex shapes
- Project-level metadata and naming
- Multiple projects management
- Import CSV functionality
- Undo/redo functionality
- Keyboard shortcuts
- Advanced snapping (part-to-part)
- Measurements display in 3D view
- Print-friendly cutting list view
- Material optimization suggestions

### Developer Experience
- Dark mode support (leveraging CSS variables theme)
- Automated testing (Vitest + React Testing Library)
- E2E testing (Playwright)
- Storybook for component documentation
- GitHub Actions CI/CD pipeline
- Lighthouse performance monitoring
- Bundle size analysis
- Automated dependency updates (Dependabot)

### User Experience
- Onboarding tutorial
- Keyboard shortcuts overlay
- Command palette (Cmd+K)
- Additional language support (EN, DE, etc.) - base i18n system required in MVP
- Export to different formats (PDF, DXF)
- 3D model export (GLTF, OBJ)
- Collaboration features (share links)
- Cloud storage integration

---

## Development Best Practices

### Code Quality
- **Always use theme colors** - never hardcode colors
- TypeScript strict mode enabled
- ESLint + Prettier for consistent formatting
- Meaningful component and variable names
- Single responsibility principle for components
- DRY (Don't Repeat Yourself) - extract reusable logic

### Git Workflow
- Conventional commits format:
    - `feat:` - new feature
    - `fix:` - bug fix
    - `refactor:` - code refactoring
    - `docs:` - documentation changes
    - `style:` - formatting, no code change
    - `test:` - adding tests
    - `chore:` - maintenance tasks
- Example: `feat: add material selector to properties panel`
- Small, focused commits
- Descriptive commit messages

### Performance Considerations
- Lazy load heavy 3D components
- Memoize expensive calculations
- Use Zustand selectors to avoid unnecessary re-renders
- Optimize Three.js geometries (buffer geometry reuse)
- Monitor bundle size (keep under 500KB initial load)

### Accessibility
- Semantic HTML
- Keyboard navigation support
- ARIA labels for interactive elements
- Focus management in modals
- Color contrast ratios (WCAG AA compliance)

---

## Recommended VS Code Extensions

For optimal development experience:
- **ESLint** - linting
- **Prettier** - formatting
- **Tailwind CSS IntelliSense** - autocomplete for classes
- **TypeScript Error Translator** - better TS error messages
- **Error Lens** - inline error display
- **GitLens** - enhanced Git integration
- **Auto Rename Tag** - HTML/JSX tag renaming
- **ES7+ React/Redux/React-Native snippets** - code snippets