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

### Task 0.1: Initialize Next.js Project
- [ ] Create new Next.js 14+ project with App Router
- [ ] Enable TypeScript configuration
- [ ] Set up Tailwind CSS
- [ ] Clean up default styles in `globals.css`
- [ ] Remove unnecessary default components

**Files affected:**
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `app/globals.css`

---

### Task 0.2: Install Dependencies
- [ ] Install 3D libraries:
    - `three`
    - `@types/three`
    - `@react-three/fiber`
    - `@react-three/drei`
- [ ] Install state management:
    - `zustand`
- [ ] Install utilities:
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

### Task 0.3: Configure shadcn/ui & Theme
- [ ] Initialize shadcn/ui in project
- [ ] Configure Tailwind theme with CSS variables (NOT hardcoded colors)
- [ ] Set up color scheme in `globals.css`:
    - `--primary`, `--secondary`, `--accent`
    - `--background`, `--foreground`
    - `--muted`, `--muted-foreground`
    - `--border`, `--input`, `--ring`
- [ ] Update `tailwind.config.ts` to use CSS variables:
  ```ts
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    // ... etc
  }
  ```
- [ ] Add required shadcn/ui components:
    - `button`, `input`, `label`, `card`
    - `slider`, `switch`, `table`
    - `dialog`, `select`, `badge`
- [ ] **IMPORTANT:** Always use theme colors (e.g., `bg-primary`, `text-foreground`) instead of hardcoded colors (e.g., `bg-blue-500`)

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

### Task 1.1: Define TypeScript Types
- [ ] Create `src/types/index.ts`
- [ ] Define shape types: `RECT`, `TRAPEZOID`, `L_SHAPE`, `POLYGON`
- [ ] Define `Material` interface (id, name, color, thickness)
- [ ] Define `Furniture` interface (id, name, projectId)
- [ ] Define shape parameter interfaces:
    - `ShapeParamsRect`
    - `ShapeParamsTrapezoid`
    - `ShapeParamsLShape`
    - `ShapeParamsPolygon`
- [ ] Define discriminated union `ShapeParams`
- [ ] Define edge banding interfaces:
    - `EdgeBandingRect` (top, bottom, left, right)
    - `EdgeBandingGeneric` (edges array)
    - `EdgeBanding` discriminated union
- [ ] Define `Part` interface with all properties:
    - Basic info (id, name, furnitureId, group)
    - Geometry (shapeType, shapeParams)
    - 3D dimensions (width, height, depth)
    - Transformations (position, rotation)
    - Material and edge banding
- [ ] Define `ProjectState` interface

**File:** `src/types/index.ts`

---

### Task 1.2: Create Zustand Store
- [ ] Create `src/lib/store.ts`
- [ ] Set up Zustand store with persist middleware
- [ ] Initialize default state:
    - Empty `parts` array
    - Default furniture ("Domyślny mebel")
    - Sample materials (Biały 12mm, Dąb 12mm, Antracyt 12mm)
    - Selected IDs (null for part, default furniture ID)
- [ ] Implement furniture actions:
    - `addFurniture(name: string)`
    - `removeFurniture(id: string)` - cascade delete related parts
    - `setSelectedFurniture(id: string)`
- [ ] Implement part actions:
    - `addPart(furnitureId: string)` - generate UUID, default dimensions (600x400x12), RECT shape
    - `updatePart(id: string, patch: Partial<Part>)`
    - `removePart(id: string)`
    - `selectPart(id: string | null)`
- [ ] Ensure immutable updates (spread operators)
- [ ] Auto-sync `depth` with material `thickness` when material changes

**File:** `src/lib/store.ts`

---

## Phase 2: 3D Fundamentals

### Task 2.1: Create Application Layout
- [ ] Create main page layout (`app/page.tsx` or `app/editor/page.tsx`)
- [ ] Set up full-height layout (`min-h-screen`)
- [ ] Create left panel (75% width) for 3D Canvas (gray background)
- [ ] Create right sidebar (25% width) (white background)
- [ ] Add placeholder content

**Files:**
- `src/app/page.tsx`

---

### Task 2.2: Set Up 3D Scene
- [ ] Create `src/components/canvas/Scene.tsx` with `use client`
- [ ] Render `<Canvas>` from R3F
- [ ] Add scene elements:
    - `<OrbitControls makeDefault />`
    - `<gridHelper args={[2000, 20]} />` (grid in mm)
    - `<ambientLight />`
    - `<directionalLight position={[300, 400, 200]} />`
- [ ] Configure camera position `[200, 200, 200]` looking at `[0, 0, 0]`
- [ ] Create ref to OrbitControls for future camera reset

**File:** `src/components/canvas/Scene.tsx`

---

### Task 2.3: Create Basic Part3D Component (RECT only)
- [ ] Create `src/components/canvas/Part3D.tsx`
- [ ] Accept `part: Part` as props
- [ ] Handle `RECT` shape type initially
- [ ] Render `<mesh>` with `<boxGeometry args={[width, height, depth]} />`
- [ ] Apply position and rotation from part data
- [ ] Get material from store by `materialId` (reactive - updates when material changes)
- [ ] Apply material color using `<meshStandardMaterial color={material.color} />`
- [ ] Fallback to gray (#808080) if material not found
- [ ] Ensure component re-renders when material color or part dimensions change

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 2.4: Render Parts List & Add Button
- [ ] Connect Scene to Zustand store
- [ ] Get `parts` and `selectedFurnitureId` from store
- [ ] Filter and render parts belonging to selected furniture
- [ ] Create "Add Part" button component
- [ ] Wire button to call `addPart(selectedFurnitureId)`
- [ ] Verify new parts appear in 3D scene

**Files:**
- `src/components/canvas/Scene.tsx`
- `src/components/ui/AddPartButton.tsx`

---

## Phase 3: Interaction & Editing

### Task 3.1: Implement Part Selection
- [ ] Add `onClick` handler to mesh in `Part3D`
- [ ] Call `selectPart(part.id)` from store
- [ ] Use `event.stopPropagation()` to prevent click-through
- [ ] Highlight selected part:
    - Add `<Edges />` from drei, OR
    - Change material `emissive` property
- [ ] Compare part ID with `selectedPartId` from store

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 3.2: Add Transform Controls (Translation)
- [ ] Import `TransformControls` from `@react-three/drei`
- [ ] Show controls ONLY for selected part
- [ ] Set mode to `'translate'`
- [ ] Create mesh ref
- [ ] Handle `onObjectChange` or `onMouseUp` event:
    - Get new position from `meshRef.current.position`
    - Call `updatePart(id, { position: [x, y, z] })`
- [ ] Disable OrbitControls during transformation
- [ ] Ensure bidirectional sync between store and 3D position

**File:** `src/components/canvas/Part3D.tsx`

---

### Task 3.3: Add Translation Snapping (Optional)
- [ ] Configure `TransformControls` with `translationSnap={10}`
- [ ] Test 10mm snap increment for easier positioning

**File:** `src/components/canvas/Part3D.tsx`

---

## Phase 3.5: Support Multiple Shape Types

### Task 3.5: Extend Part3D for All Shapes
- [ ] Keep `boxGeometry` for `RECT` shape
- [ ] For `TRAPEZOID`, `L_SHAPE`, `POLYGON`:
    - Create `THREE.Shape()` in X-Y plane
    - Build 2D outline from `shapeParams`
    - Use `ExtrudeGeometry` with depth as Z-axis extrusion
    - Set `extrudeSettings: { depth, bevelEnabled: false }`
- [ ] Ensure consistent pivot point (center or corner)
- [ ] Test shape updates when `shapeParams` changes in store
- [ ] Handle geometry recreation on shape change

**File:** `src/components/canvas/Part3D.tsx`

---

## Phase 4: User Interface (Sidebar)

### Task 4.1: Create Properties Panel
- [ ] Create `src/components/ui/PropertiesPanel.tsx`
- [ ] Connect to Zustand store
- [ ] Show panel only when `selectedPartId` is not null
- [ ] Find selected part in `parts` array
- [ ] Create form inputs:
    - Name (text input)
    - Width X (number input, mm)
    - Height Y (number input, mm)
    - Depth Z (read-only or tied to material)
    - Position X, Y, Z (number inputs, mm)
    - Notes (textarea)
- [ ] Update store immediately on input change
- [ ] Validate: prevent negative values (`min={1}`)
- [ ] Sync with 3D preview

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.2: Add Material Selector
- [ ] Add `<Select>` component from shadcn/ui
- [ ] Populate options from `materials` array in store
- [ ] On material change:
    - Update `materialId`
    - Update `depth` to match `material.thickness`
- [ ] Display material name and thickness in dropdown

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.3: Add Shape Editor
- [ ] Add "Shape" section to properties panel
- [ ] Create `shapeType` selector: RECT / TRAPEZOID / L_SHAPE / POLYGON
- [ ] Show conditional inputs based on selected shape:
    - **RECT:** X (length), Y (width)
    - **TRAPEZOID:** frontX, backX, y, skosSide (select: left/right)
    - **L_SHAPE:** x, y, cutX, cutY
    - **POLYGON:** JSON text input for points array `[[x1,y1], [x2,y2], ...]`
- [ ] On input change, call `updatePart` with new `shapeParams`
- [ ] Auto-update `width` and `height` based on shape:
    - RECT: width = x, height = y
    - TRAPEZOID: width = max(frontX, backX), height = y
    - L_SHAPE/POLYGON: width/height = bounding box dimensions
- [ ] Add validation:
    - All values > 0
    - L_SHAPE: cutX < x, cutY < y
    - POLYGON: minimum 3 points

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.4: Add Edge Banding Editor
- [ ] Add "Edge Banding" section to properties panel
- [ ] For `RECT` shape:
    - Show 4 switches/checkboxes: Top (Y+), Bottom (Y-), Left (X-), Right (X+)
    - Map to `edgeBanding.type === 'RECT'` with data: `{ top, bottom, left, right }`
    - Initialize all to `false` if undefined
- [ ] For other shapes (TRAPEZOID/L_SHAPE/POLYGON):
    - MVP: show JSON text input for edges array, OR
    - Show "Coming soon" message
    - Use `EdgeBandingGeneric` structure
- [ ] On toggle change, call `updatePart` with new `edgeBanding`

**File:** `src/components/ui/PropertiesPanel.tsx`

---

### Task 4.5: Add Part Management Actions
- [ ] Add "Delete" button:
    - Call `removePart(part.id)`
    - Call `selectPart(null)` to deselect
- [ ] Add "Duplicate" button:
    - Call `addPart(furnitureId)` to create new part
    - Call `updatePart` on new ID with copied properties
    - Offset position by +50mm on X-axis

**File:** `src/components/ui/PropertiesPanel.tsx`

---

## Phase 5: Parts List & CSV Export

### Task 5.1: Create Parts Table
- [ ] Create `src/components/ui/PartsTable.tsx`
- [ ] Use shadcn/ui `<Table>` component
- [ ] Display all parts (or filter by selected furniture)
- [ ] Table columns:
    - Furniture name
    - Group
    - Part name
    - Length X (mm)
    - Width Y (mm)
    - Thickness (mm)
    - Material
    - Shape type
    - Edge banding summary (e.g., "L,R,T,B")
- [ ] Optional: click row to select part in 3D (`selectPart`)

**File:** `src/components/ui/PartsTable.tsx`

---

### Task 5.2: Implement CSV Generator
- [ ] Create `src/lib/csv.ts`
- [ ] Implement `generateCSV(parts, materials, furnitures): string`
- [ ] Use semicolon (`;`) as separator
- [ ] CSV header format:
  ```
  project;furniture;group;part_id;part_name;material;thickness_mm;length_x_mm;width_y_mm;shape;shape_params;edge_top;edge_bottom;edge_left;edge_right;notes
  ```
- [ ] Map each part to CSV row:
    - project: constant value or empty
    - furniture: lookup name by furnitureId
    - material: lookup name by materialId
    - shape_params: JSON string or key=value format
    - edge columns: `1` or `0` for RECT type, handle others appropriately
- [ ] Create "Export CSV" button in app header
- [ ] On click:
    - Get data from store
    - Call `generateCSV`
    - Create Blob
    - Trigger download as `meblarz_export.csv`

**Files:**
- `src/lib/csv.ts`
- UI button component

---

### Task 5.3: Add Pre-Export Validation
- [ ] Create validation function `validateParts(parts, materials): string[]`
- [ ] Check each part:
    - Has valid `materialId`
    - Positive dimensions: width, height, depth > 0
    - `depth === material.thickness`
- [ ] On validation failure:
    - Prevent CSV generation
    - Show error list in Dialog (shadcn/ui)
- [ ] Run validation before CSV generation

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

### Task 6.1: Add Camera Reset
- [ ] Add "Reset Camera" button (corner of canvas or toolbar)
- [ ] Create ref to OrbitControls
- [ ] On click:
    - Set camera position to initial `[200, 200, 200]`
    - Set target to `[0, 0, 0]`
    - Update controls

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

### Task 6.3: Fix Camera Movement During Transform
- [ ] Add `isTransforming` flag (store or local state)
- [ ] Set flag to `true` when TransformControls is active
- [ ] Pass to OrbitControls: `enabled={!isTransforming}`
- [ ] Prevent camera orbit during object dragging
- [ ] Reset flag when transformation ends

**Files:**
- `src/components/canvas/Part3D.tsx`
- `src/components/canvas/Scene.tsx`

---

## MVP Completion Checklist

### Core Functionality
- [ ] Create multiple furniture items
- [ ] Add parts with different shapes (RECT, TRAPEZOID, L_SHAPE, POLYGON)
- [ ] Position and rotate parts in 3D space
- [ ] Assign materials with thickness and color
- [ ] Configure edge banding for rectangular parts
- [ ] Group parts logically
- [ ] View parts list in table format
- [ ] Export parts list to CSV with all details
- [ ] Validate data before export

### Data Persistence
- [ ] All data saves to localStorage automatically
- [ ] State persists across browser sessions

### User Experience
- [ ] Intuitive 3D manipulation with mouse
- [ ] Real-time sync between 3D view and properties panel
- [ ] Visual feedback for selected parts
- [ ] Clear validation messages

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