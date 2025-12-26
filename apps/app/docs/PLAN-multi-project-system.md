# Plan: Multi-Project System

## Overview

Enable users to save, load, and switch between multiple furniture design projects stored in Supabase database.

## Current State

- Project data stored only in localStorage (`e-meble-storage`)
- No `projects` table in database
- No project metadata (name, description, timestamps)
- No user-project relationship

## Target Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   localStorage  │ ←── │   Zustand Store  │ ──→ │    Supabase     │
│  (offline/fast) │     │  (current state) │     │   (persistent)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               ↑
                               │
                        ┌──────┴──────┐
                        │  Project    │
                        │  Switcher   │
                        └─────────────┘
```

---

## Phase 1: Database Schema

### 1.1 Create `projects` table

```sql
CREATE TABLE public.projects (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL DEFAULT 'Nowy projekt',
    description     text,
    thumbnail_url   text,
    project_data    jsonb NOT NULL DEFAULT '{}',
    schema_version  integer NOT NULL DEFAULT 1,    -- Data schema version (for migrations)
    revision        integer NOT NULL DEFAULT 1,    -- Incremented on each save (optimistic locking)
    data_size_bytes integer GENERATED ALWAYS AS (octet_length(project_data::text)) STORED,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    last_opened_at  timestamptz DEFAULT now(),
    is_archived     boolean DEFAULT false,

    -- Soft limit: warn at 5MB, hard limit at 10MB
    CONSTRAINT project_data_size_limit CHECK (octet_length(project_data::text) < 10485760)
);

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects"
    ON public.projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-increment revision on update
CREATE OR REPLACE FUNCTION increment_project_revision()
RETURNS TRIGGER AS $$
BEGIN
    NEW.revision := OLD.revision + 1;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_revision_trigger
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION increment_project_revision();
```

### 1.2 Create `project_local_backup` table (crash recovery - single snapshot per project)

> **Note:** This is NOT version history - it's a single backup slot per project for crash recovery.
> For full version history, consider a separate `project_versions` table in the future.

```sql
CREATE TABLE public.project_local_backup (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    project_data    jsonb NOT NULL,
    source          text NOT NULL DEFAULT 'autosave',  -- 'autosave' | 'offline_sync' | 'conflict_backup'
    created_at      timestamptz DEFAULT now(),
    UNIQUE(project_id)  -- Only ONE backup per project (overwritten on each autosave)
);

-- RLS
ALTER TABLE public.project_local_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own backups"
    ON public.project_local_backup FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_local_backup.project_id
            AND user_id = auth.uid()
        )
    );
```

---

## Data Separation Strategy

### Three-tier data model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────┐ │
│  │   PROJECT DATA      │  │  USER PREFERENCES   │  │  TRANSIENT  │ │
│  │   (→ Supabase)      │  │  (→ localStorage)   │  │  (memory)   │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────┤ │
│  │ parts               │  │ snapSettings        │  │ selectedId  │ │
│  │ materials           │  │ dimensionSettings   │  │ isTransform │ │
│  │ furnitures          │  │ graphicsSettings    │  │ collisions  │ │
│  │ cabinets            │  │ cabinetPreferences  │  │ hiddenParts │ │
│  │ rooms               │  │ materialPreferences │  │ undoStack   │ │
│  │ walls               │  │ transformMode       │  │ redoStack   │ │
│  │ openings            │  │ featureFlags        │  │             │ │
│  │ lights              │  │                     │  │             │ │
│  │ countertopGroups    │  │                     │  │             │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why this separation?

| Category             | Storage      | Reason                                             |
| -------------------- | ------------ | -------------------------------------------------- |
| **Project Data**     | Supabase     | Core design - must sync across devices, shareable  |
| **User Preferences** | localStorage | Personal settings - same across all projects       |
| **Transient**        | Memory only  | Session-specific, can be regenerated, too volatile |

### Flexibility for evolving model

1. **JSONB is schemaless** - new fields added to `Part`, `Cabinet`, etc. just work
2. **schema_version** column - enables migrations when breaking changes needed
3. **No over-engineering** - we don't validate JSONB structure in DB (only in app)
4. **Forward compatibility** - old projects load fine, missing fields get defaults

```typescript
// Example: Loading old project that doesn't have new field
function loadProject(data: ProjectData): void {
  const parts = data.parts.map((part) => ({
    ...getDefaultPart(), // Fill in any new fields with defaults
    ...part, // Override with saved values
  }));
  // ...
}
```

---

## User Authentication Paths

### Path A: Guest User (not logged in)

```
┌─────────────────────────────────────────────────────────────────────┐
│  GUEST USER - Current behavior unchanged                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐      ┌──────────────┐                            │
│  │   Zustand    │ ───→ │ localStorage │  (single project)          │
│  │    Store     │ ←─── │  e-meble-*   │                            │
│  └──────────────┘      └──────────────┘                            │
│                                                                     │
│  Features:                                                          │
│  ✓ Full app functionality                                          │
│  ✓ Auto-save to localStorage                                       │
│  ✓ Undo/redo works                                                 │
│  ✗ Only ONE project (overwrites on new)                            │
│  ✗ No cloud sync                                                   │
│  ✗ No project list                                                 │
│                                                                     │
│  UI Changes: NONE (current behavior preserved)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Path B: Authenticated User (logged in)

```
┌─────────────────────────────────────────────────────────────────────┐
│  AUTHENTICATED USER - New features enabled                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      │
│  │   Zustand    │ ───→ │ localStorage │ ───→ │   Supabase   │      │
│  │    Store     │ ←─── │  (cache)     │ ←─── │  (projects)  │      │
│  └──────────────┘      └──────────────┘      └──────────────┘      │
│                                                                     │
│  Features:                                                          │
│  ✓ Multiple projects                                               │
│  ✓ Project list with thumbnails                                    │
│  ✓ Cloud sync (with conflict resolution)                           │
│  ✓ Access from any device                                          │
│  ✓ Auto-save to cloud                                              │
│                                                                     │
│  UI Changes:                                                        │
│  + Project name in header                                          │
│  + Sync status indicator                                           │
│  + "My Projects" button/dialog                                     │
│  + "Save As" / "New Project" options                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Migration: Guest → Authenticated

When guest logs in with existing localStorage data:

```typescript
async function onUserLogin(userId: string): Promise<void> {
  const localData = loadFromLocalStorage();

  if (localData && hasAnyContent(localData)) {
    // Ask user what to do with their work
    const choice = await showMigrationDialog();

    switch (choice) {
      case "save_as_project":
        // Create new project in Supabase
        await createProject({
          name: "Mój projekt",
          projectData: localData,
        });
        break;

      case "discard":
        // Just clear localStorage
        clearLocalStorage();
        break;

      case "keep_local":
        // Keep working locally, don't sync yet
        break;
    }
  }
}

function hasAnyContent(data: ProjectData): boolean {
  return data.parts.length > 0 || data.cabinets.length > 0 || data.rooms.length > 0;
}
```

---

## Phase 2: Type Definitions

### 2.1 Add project types (`apps/app/src/types/project.ts`)

```typescript
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  schemaVersion: number; // Data schema version (for migrations)
  revision: number; // Incremented on each save (for optimistic locking)
  dataSizeBytes: number; // Computed column from DB
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  isArchived: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
  lastOpenedAt: string;
  // Computed from project_data (for list display without loading full data)
  partsCount?: number;
  cabinetsCount?: number;
}

/**
 * ONLY project-specific design data goes to Supabase.
 * User preferences, UI state, and history stay in localStorage.
 *
 * This is intentionally minimal and flexible - as the app evolves,
 * we can add new fields without breaking existing projects (JSONB is schemaless).
 */
export interface ProjectData {
  // Core design data - ONLY these go to database
  parts: Part[];
  materials: Material[];
  furnitures: Furniture[];
  cabinets: Cabinet[];
  rooms: Room[];
  walls: WallSegment[];
  openings: Opening[];
  lights: LightSource[];
  countertopGroups: CountertopGroup[];

  // NOTE: The following are EXCLUDED from ProjectData (stay in localStorage):
  // - snapSettings, dimensionSettings, graphicsSettings (user preferences)
  // - interiorMaterialPreferences, cabinetPreferences (user preferences)
  // - selectedPartId, selectedCabinetId, etc. (session state)
  // - undoStack, redoStack (history - too large, not needed)
  // - collisions (can be regenerated)
}
```

---

## Phase 3: Supabase Client Functions

### 3.1 Create project service (`apps/app/src/lib/supabase/projects.ts`)

```typescript
// List user's projects
export async function listProjects(options?: {
  includeArchived?: boolean;
  orderBy?: "updated_at" | "created_at" | "name";
}): Promise<ProjectListItem[]>;

// Get single project with full data
export async function getProject(
  projectId: string
): Promise<Project & { projectData: ProjectData }>;

// Create new project
export async function createProject(data: {
  name: string;
  description?: string;
  projectData: ProjectData;
}): Promise<Project>;

// Update project with OPTIMISTIC LOCKING
export async function updateProject(
  projectId: string,
  expectedRevision: number, // Must match current DB revision
  data: {
    name?: string;
    description?: string;
    projectData?: ProjectData;
  }
): Promise<SaveResult>;

type SaveResult =
  | { success: true; project: Project }
  | { success: false; error: "CONFLICT"; serverRevision: number; serverData: ProjectData }
  | { success: false; error: "NOT_FOUND" | "SIZE_LIMIT" | "UNKNOWN" };

// Save project data only (for autosave) - with revision check
export async function saveProjectData(
  projectId: string,
  expectedRevision: number,
  projectData: ProjectData
): Promise<SaveResult>;

// Delete project (soft delete = archive)
export async function archiveProject(projectId: string): Promise<void>;

// Hard delete
export async function deleteProject(projectId: string): Promise<void>;

// Duplicate project
export async function duplicateProject(projectId: string, newName: string): Promise<Project>;

// Generate and upload thumbnail
export async function updateProjectThumbnail(
  projectId: string,
  canvas: HTMLCanvasElement
): Promise<string>;

// Check project size before save (client-side validation)
export function estimateProjectSize(projectData: ProjectData): {
  bytes: number;
  isOverSoftLimit: boolean; // > 5MB
  isOverHardLimit: boolean; // > 10MB
};
```

### 3.2 Optimistic locking implementation

```typescript
async function saveProjectData(
  projectId: string,
  expectedRevision: number,
  projectData: ProjectData
): Promise<SaveResult> {
  // 1. Attempt update with revision check
  const { data, error } = await supabase
    .from("projects")
    .update({ project_data: projectData })
    .eq("id", projectId)
    .eq("revision", expectedRevision) // Only update if revision matches
    .select()
    .single();

  if (error?.code === "PGRST116") {
    // No rows updated = revision mismatch (conflict)
    const { data: serverProject } = await supabase
      .from("projects")
      .select("revision, project_data")
      .eq("id", projectId)
      .single();

    return {
      success: false,
      error: "CONFLICT",
      serverRevision: serverProject.revision,
      serverData: serverProject.project_data,
    };
  }

  if (error) {
    return { success: false, error: "UNKNOWN" };
  }

  return { success: true, project: data };
}
```

---

## Phase 4: Store Integration

### 4.1 Create project slice (`apps/app/src/lib/store/slices/projectSlice.ts`)

```typescript
export interface ProjectSlice {
  // Current project state
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectDescription: string | null;
  currentProjectRevision: number; // For optimistic locking

  // Sync state
  syncState: SyncState;
  isLoading: boolean;

  // Actions - Metadata
  setCurrentProject: (project: Project | null) => void;
  markAsDirty: () => void;
  markAsSaved: (revision: number) => void;
  setSyncStatus: (status: SyncStatus) => void;

  // Actions - Project CRUD
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<SaveResult>;
  saveProjectAs: (name: string) => Promise<string>; // Returns new project ID
  createNewProject: (name?: string) => Promise<string>;

  // Actions - Conflict resolution
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;

  // Serialization
  getProjectData: () => ProjectData;
  setProjectData: (data: ProjectData) => void;

  // Local storage sync
  syncToLocalStorage: () => void;
  loadFromLocalStorage: () => ProjectData | null;
}
```

### 4.2 Modify store persistence

Current: All data persisted to localStorage
New:

- localStorage = current working state (for offline/fast access)
- Supabase = source of truth for logged-in users
- Sync on: load, save, periodic autosave

---

## Phase 5: UI Components

> **Design Specification**: See `docs/design/DESIGN-project-components.md` for detailed
> visual specs, animations, layouts, and accessibility requirements.

### 5.1 Project List Dialog (`components/projects/ProjectListDialog.tsx`)

Features:

- Grid/list view of user's projects
- Thumbnail preview
- Last modified date
- Quick actions: Open, Duplicate, Archive, Delete
- Search/filter
- Sort by: name, date modified, date created
- "New Project" button

### 5.2 Project Header (`components/projects/ProjectHeader.tsx`)

Shows in main app header:

- Project name (editable inline)
- Save status indicator (Saved / Unsaved changes)
- Save button
- Project menu dropdown:
  - Save
  - Save as...
  - Rename
  - Open another project
  - Export project (JSON)
  - Import project (JSON)

### 5.3 New Project Dialog (`components/projects/NewProjectDialog.tsx`)

- Name input
- Description (optional)
- Template selection (empty, kitchen, wardrobe, etc.)

### 5.4 Unsaved Changes Dialog

When switching projects or closing:

- "You have unsaved changes"
- Options: Save & Continue, Discard, Cancel

---

## Phase 6: Auto-save System

### 6.1 Auto-save logic

```typescript
// Debounced auto-save (e.g., 30 seconds after last change)
const AUTOSAVE_DELAY = 30_000;

// Auto-save to localStorage immediately (for crash recovery)
// Auto-save to Supabase with debounce (for cloud sync)

useEffect(() => {
  if (!isProjectDirty || !currentProjectId || !isAuthenticated) return;

  const timer = setTimeout(() => {
    saveProject();
  }, AUTOSAVE_DELAY);

  return () => clearTimeout(timer);
}, [isProjectDirty, currentProjectId]);
```

### 6.2 Offline support & Sync Status

- Always save to localStorage first (immediate)
- Queue Supabase saves when offline
- Sync when back online
- Track and display sync status

### 6.3 Sync Status Types

```typescript
type SyncStatus =
  | "synced" // All changes saved to cloud
  | "local_only" // Changes saved locally, pending cloud sync
  | "syncing" // Currently uploading to cloud
  | "offline" // No internet connection
  | "conflict" // Server has newer version
  | "error"; // Save failed (retry pending)

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  lastLocalSaveAt: Date | null;
  pendingChanges: boolean;
  conflictData?: ProjectData; // Server version if conflict
  errorMessage?: string;
}
```

### 6.4 UI Sync Indicators

```
┌─────────────────────────────────────────────────────┐
│  📁 Mój projekt kuchenny                            │
│  ─────────────────────────────────────────────────  │
│  ● Zapisano (synced)           - green dot          │
│  ○ Niezapisane zmiany (local)  - yellow dot         │
│  ↻ Synchronizowanie... (sync)  - spinning           │
│  ⚠ Konflikt wersji (conflict)  - orange warning     │
│  ✕ Błąd zapisu (error)         - red, retry btn     │
│  ☁ Offline (offline)           - grey cloud icon    │
└─────────────────────────────────────────────────────┘
```

---

## Phase 6.5: Conflict Resolution

### Conflict Detection

Conflict occurs when:

1. User A opens project (revision 5)
2. User B opens same project (revision 5)
3. User B saves (revision → 6)
4. User A tries to save (expects revision 5, but DB has 6) → **CONFLICT**

### Resolution Strategies

```typescript
type ConflictResolution =
  | "keep_local" // Overwrite server with local (force save)
  | "keep_server" // Discard local, load server version
  | "keep_both"; // Save local as new project, keep server

async function resolveConflict(
  projectId: string,
  resolution: ConflictResolution,
  localData: ProjectData,
  serverData: ProjectData
): Promise<void> {
  switch (resolution) {
    case "keep_local":
      // Force save - get current revision and save
      const { data } = await supabase
        .from("projects")
        .select("revision")
        .eq("id", projectId)
        .single();

      await saveProjectData(projectId, data.revision, localData);
      break;

    case "keep_server":
      // Load server version into store
      setProjectData(serverData);
      break;

    case "keep_both":
      // Create new project with local data
      await createProject({
        name: `${currentProjectName} (kopia lokalna)`,
        projectData: localData,
      });
      // Then load server version
      setProjectData(serverData);
      break;
  }
}
```

### Conflict Resolution Dialog

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Konflikt wersji                                 │
│  ─────────────────────────────────────────────────  │
│  Ten projekt został zmodyfikowany na innym          │
│  urządzeniu. Wybierz którą wersję zachować:         │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ 📱 Wersja       │  │ ☁️ Wersja       │          │
│  │    lokalna      │  │    z serwera    │          │
│  │                 │  │                 │          │
│  │ 24 części       │  │ 22 części       │          │
│  │ Zmieniono: teraz│  │ Zmieniono: 5min │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  [Zachowaj lokalną]  [Zachowaj z serwera]          │
│              [Zachowaj obie jako osobne]            │
└─────────────────────────────────────────────────────┘
```

---

## Phase 7: Guest User Flow

### 7.1 Anonymous users

- Can work on ONE project in localStorage
- On register/login: prompt to save current work to account
- Migration flow: localStorage → new project in database

### 7.2 Migration on login

```typescript
async function migrateGuestProject(userId: string) {
  const localData = loadFromLocalStorage();
  if (!localData || isEmpty(localData)) return;

  const project = await createProject({
    name: "Mój pierwszy projekt",
    projectData: localData,
  });

  // Clear localStorage after successful migration
  clearLocalStorage();

  return project;
}
```

---

## Phase 8: Data Versioning

### 8.1 Schema versioning

```typescript
interface ProjectData {
  _schemaVersion: number; // e.g., 1
  // ... rest of data
}

// Migration functions
const migrations: Record<number, (data: any) => any> = {
  1: (data) => data, // Initial version
  2: (data) => ({ ...data, newField: defaultValue }),
};

function migrateProjectData(data: ProjectData): ProjectData {
  let current = data._schemaVersion || 1;
  while (current < CURRENT_SCHEMA_VERSION) {
    data = migrations[current + 1](data);
    current++;
  }
  return { ...data, _schemaVersion: CURRENT_SCHEMA_VERSION };
}
```

---

## Implementation Order

### Sprint 1: Foundation

1. [ ] Create database migration (Phase 1)
2. [ ] Add TypeScript types (Phase 2)
3. [ ] Implement Supabase client functions (Phase 3)

### Sprint 2: Store & Core Logic

4. [ ] Create projectSlice (Phase 4.1)
5. [ ] Modify store persistence (Phase 4.2)
6. [ ] Implement getProjectData/setProjectData serialization

### Sprint 3: Basic UI

7. [ ] ProjectHeader component with save indicator
8. [ ] ProjectListDialog (basic version)
9. [ ] Save/Load functionality working end-to-end

### Sprint 4: Polish

10. [ ] NewProjectDialog with templates
11. [ ] Unsaved changes dialog
12. [ ] Auto-save system (Phase 6)

### Sprint 5: Advanced Features

13. [ ] Guest user migration (Phase 7)
14. [ ] Thumbnail generation
15. [ ] Offline support
16. [ ] Data versioning (Phase 8)

---

## Files to Create/Modify

### New Files

- `apps/app/src/types/project.ts` - Project, ProjectData, SyncState types
- `apps/app/src/lib/supabase/projects.ts` - CRUD functions with optimistic locking
- `apps/app/src/lib/store/slices/projectSlice.ts` - Project & sync state management
- `apps/app/src/components/projects/ProjectListDialog.tsx` - Project browser
- `apps/app/src/components/projects/ProjectHeader.tsx` - Name + sync status indicator
- `apps/app/src/components/projects/NewProjectDialog.tsx` - Create project form
- `apps/app/src/components/projects/UnsavedChangesDialog.tsx` - Save/Discard prompt
- `apps/app/src/components/projects/ConflictResolutionDialog.tsx` - Version conflict UI
- `apps/app/src/components/projects/SyncStatusIndicator.tsx` - Reusable sync status badge

### Modified Files

- `apps/app/src/lib/store/index.ts` - add projectSlice
- `apps/app/src/lib/store/types.ts` - add ProjectSlice, SyncState types
- `apps/app/src/types/index.ts` - export project types
- `apps/app/src/components/layout/Header.tsx` - integrate ProjectHeader

---

## Database Migration Name

```
20251225_add_projects_table
```

---

## Known Risks & Mitigations

| Risk                         | Impact                       | Mitigation                                                           |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| Large `project_data` JSONB   | Slow queries, high bandwidth | Hard limit 10MB, soft warn at 5MB, consider compression (pako) later |
| Conflict on concurrent edits | Data loss, user frustration  | Optimistic locking with revision check, clear UI for resolution      |
| Offline sync conflicts       | Complex state management     | localStorage as primary, queue sync ops, clear status indicators     |
| Schema migrations            | Breaking old projects        | `schema_version` column + migration functions on load                |
| Partial save failures        | Corrupted state              | Atomic transactions, backup before save, rollback on error           |

---

## Open Questions

1. **Thumbnail generation** - Canvas screenshot vs. server-side rendering?
   - Recommendation: Client-side canvas.toDataURL() + upload to Supabase Storage

2. **Project templates** - Prebuilt starting points (empty room, kitchen layout)?
   - Defer to Phase 2, start with empty project only

3. **Sharing** - Future: share project link with others (read-only)?
   - Not in scope for initial release, but schema supports it (add `is_public`, `share_token`)

4. **Collaboration** - Future: real-time multi-user editing?
   - Requires major architecture change (CRDT/OT), not planned

5. **Storage limits** - Max projects per user? Max size per project?
   - ✅ Resolved: 10MB hard limit per project, no limit on project count (monitor usage)

6. **Compression** - Should we compress project_data?
   - Defer: Monitor average project sizes first, add pako compression if needed

---

## Success Criteria

- [ ] User can create new project with name
- [ ] User can save current project to database
- [ ] User can see list of their projects
- [ ] User can open/switch between projects
- [ ] User can duplicate a project
- [ ] User can delete/archive a project
- [ ] Unsaved changes warning works correctly
- [ ] Auto-save prevents data loss
- [ ] Guest work migrates on login
- [ ] Offline editing works with sync on reconnect
- [ ] Conflict resolution dialog works correctly
- [ ] Sync status indicator shows correct state

---

## Revision History

### v1.1 (2025-12-25) - Post-Review Updates

Based on review feedback (8.5/10), added:

1. **Optimistic Locking**
   - Added `revision` column with auto-increment trigger
   - `saveProject()` now checks expected revision
   - `SaveResult` type with conflict detection

2. **Size Limits**
   - Added `data_size_bytes` computed column
   - Hard limit: 10MB (DB constraint)
   - Soft limit: 5MB (client-side warning)
   - `estimateProjectSize()` utility function

3. **Schema Versioning in DB**
   - Added `schema_version` column (not just in JSON)
   - Enables DB-level queries by version

4. **Conflict Resolution**
   - New Phase 6.5 with full conflict handling
   - `ConflictResolutionDialog` component
   - Three strategies: keep_local, keep_server, keep_both

5. **Sync Status UI**
   - `SyncState` type with 6 statuses
   - `SyncStatusIndicator` component
   - Clear visual indicators in header

6. **Renamed Tables**
   - `project_autosaves` → `project_local_backup` (clearer intent)
   - Added `source` field for backup origin tracking

7. **Risks Section**
   - Added "Known Risks & Mitigations" table
   - Documented mitigation strategies

### v1.2 (2025-12-25) - Data Separation & Guest Flow

Based on additional review, clarified:

1. **Three-tier Data Model**
   - Project Data → Supabase (only design data)
   - User Preferences → localStorage (settings across all projects)
   - Transient → Memory only (selection, undo/redo, collisions)

2. **Flexibility for Evolving Model**
   - JSONB is schemaless - new fields just work
   - Load with defaults pattern for forward compatibility
   - No DB-level validation (only app-level)

3. **Guest User Path**
   - UNCHANGED behavior for non-logged-in users
   - Same localStorage-only single project
   - No new UI elements shown

4. **Authenticated User Path**
   - New features only visible when logged in
   - Project header, sync status, project list

5. **Migration Dialog**
   - When guest logs in with existing work
   - Options: save as project, discard, keep local

### v1.3 (2025-12-25) - UI Design Specification

Added detailed design document `docs/design/DESIGN-project-components.md`:

1. **Design Direction**: Industrial Precision (CAD-inspired)
2. **7 Component Designs** with ASCII wireframes:
   - SyncStatusIndicator (6 states with animations)
   - ProjectHeader (name, sync status, menu)
   - ProjectListDialog (grid with cards, search, sort)
   - NewProjectDialog (simple form)
   - UnsavedChangesDialog (3 action buttons)
   - ConflictResolutionDialog (side-by-side comparison)
   - GuestMigrationDialog (migration options)
3. **Animation Specs**: CSS keyframes for sync states, card hovers
4. **Responsive Behavior**: Breakpoints for mobile/desktop
5. **Accessibility**: Focus trapping, keyboard nav, screen reader support
6. **Color Tokens**: Sync status colors to add to theme
