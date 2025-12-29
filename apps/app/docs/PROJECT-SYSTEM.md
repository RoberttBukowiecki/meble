# Project System Documentation

## Overview

The project system handles multi-project management including:

- Project metadata (ID, name, description, revision)
- Sync state management (local changes, syncing, conflicts)
- CRUD operations (create, load, save, delete)
- Conflict resolution (local vs server version conflicts)
- Data serialization (converting store state to/from JSON)

## Architecture

### Modular Slice Structure

The project slice is split into smaller, focused sub-slices for better maintainability:

```
apps/app/src/lib/store/slices/project/
├── types.ts              # Type definitions for all sub-slices
├── metadataSlice.ts      # Project ID, name, description, revision
├── syncSlice.ts          # Sync state management (dirty, saved, syncing)
├── crudSlice.ts          # Load, save, create, update operations
├── conflictSlice.ts      # Conflict detection and resolution
├── serializationSlice.ts # getProjectData/setProjectData
└── index.ts              # Combines all sub-slices
```

### State Structure

```typescript
interface ProjectState {
  // Metadata
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectDescription: string | null;
  currentProjectRevision: number;

  // Sync state
  syncState: {
    status: "synced" | "local_only" | "syncing" | "offline" | "conflict" | "error";
    lastSyncedAt: Date | null;
    lastLocalSaveAt: Date | null;
    pendingChanges: boolean;
    conflictData?: ProjectData; // Server version if conflict
    errorMessage?: string;
  };
  isProjectLoading: boolean;
}
```

### Sync Status Flow

```
User makes changes
    ↓
markAsDirty() → status = "local_only"
    ↓
User clicks save
    ↓
saveProject() → status = "syncing"
    ↓
┌─────────┬──────────────┬────────────┐
│ Success │   Conflict   │   Error    │
└────┬────┴──────┬───────┴─────┬──────┘
     ↓           ↓             ↓
"synced"    "conflict"      "error"
```

## Key Features

### 1. Optimistic Locking

The system uses revision-based optimistic locking to prevent lost updates:

```typescript
// Client sends current revision with save
const result = await saveProjectData(projectId, currentRevision, data);

// Server rejects if revision mismatch
if (result.error === "CONFLICT") {
  // Show conflict resolution dialog
}
```

### 2. Network Resilience

Save operations use automatic retry with exponential backoff:

```typescript
const SAVE_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds max
  backoffMultiplier: 2, // Exponential backoff
};
```

### 3. Multi-Tab Sync

Uses BroadcastChannel API to sync between browser tabs:

```typescript
// When a tab saves, it broadcasts to other tabs
channel.postMessage({
  type: "PROJECT_SAVED",
  projectId,
  revision,
  timestamp: Date.now(),
});

// Other tabs can reload if no local changes
```

### 4. Conflict Resolution

Three strategies for resolving conflicts:

| Strategy      | Action                                         |
| ------------- | ---------------------------------------------- |
| `keep_local`  | Force-save local changes (overwrites server)   |
| `keep_server` | Discard local, load server version             |
| `keep_both`   | Save local as new project, load server version |

## UI Components

| Component                  | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `SyncStatusIndicator`      | Shows 6 visual sync states              |
| `ProjectLoadingOverlay`    | Full-screen loading during project load |
| `ConflictResolutionDialog` | User chooses conflict resolution        |
| `UnsavedChangesDialog`     | Warns before losing unsaved changes     |
| `ProjectListDialog`        | Browse and open projects                |

## Optimized Selectors

For performance, use these selectors instead of subscribing to full state:

```typescript
// ✅ Good - returns primitive, minimal re-renders
const status = useSyncStatus();
const hasUnsaved = useHasUnsavedChanges();
const hasConflict = useHasConflict();
const isSyncing = useIsSyncing();
const isLoading = useIsProjectLoading();

// ❌ Avoid - returns object, more re-renders
const { syncState } = useStore((state) => ({ syncState: state.syncState }));
```

## Testing

Test file: `apps/app/src/lib/store/slices/projectSlice.test.ts`

### Test Coverage

| Category      | Functions Tested                                                                       |
| ------------- | -------------------------------------------------------------------------------------- |
| Metadata      | `setCurrentProject`, `setProjectName`, `resetProjectState`                             |
| Sync State    | `markAsDirty`, `markAsSaved`, `setSyncStatus`                                          |
| CRUD          | `loadProject`, `saveProject`, `saveProjectAs`, `createNewProject`, `updateProjectName` |
| Conflict      | `resolveConflict`, `clearConflict`                                                     |
| Serialization | `getProjectData`, `setProjectData`                                                     |

### Running Tests

```bash
# Run project slice tests only
pnpm --filter @meble/app exec jest --testPathPattern="projectSlice"

# Run with coverage
pnpm --filter @meble/app exec jest --testPathPattern="projectSlice" --coverage
```

## Environment Utilities

Console logging is conditional using `lib/env.ts`:

```typescript
import { isDev, devLog, devError } from "@/lib/env";

// Only logs in development
devLog("[Project] Loading project:", projectId);

// Conditional code
if (isDev()) {
  console.log("Debug info");
}
```

## Database Schema

Projects are stored in Supabase:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  schema_version INTEGER DEFAULT 1,
  revision INTEGER DEFAULT 1,
  project_data JSONB NOT NULL,
  data_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_opened_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);
```

## Size Limits

| Limit      | Value | Action        |
| ---------- | ----- | ------------- |
| Soft limit | 5 MB  | Warning shown |
| Hard limit | 10 MB | Save blocked  |

## Related Files

- `lib/supabase/projects.ts` - Database operations
- `hooks/useProjectRestore.ts` - Restore project on page load
- `hooks/useMultiTabSync.ts` - Multi-tab synchronization
- `hooks/useUnsavedChangesWarning.ts` - beforeunload warning
