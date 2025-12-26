# Multi-Project System - UI Design Specification

## Design Direction: Industrial Precision (on shadcn/ui base)

**Aesthetic**: CAD-inspired accents on clean shadcn/ui foundation
**Base**: Existing `@meble/ui` components + Lucide icons
**Theme**: Uses existing CSS variables (`--primary`, `--muted`, `--destructive`)

**CAD-like touches (project components only)**:

- Monospace font for project names and stats (`font-mono` - Tailwind built-in)
- Blueprint grid overlay on project card hover
- Technical, geometric card layouts
- Subtle depth with existing shadow utilities

**Consistency rules**:

- Use existing Button, Dialog, DropdownMenu from `@meble/ui`
- Use existing color tokens (no new CSS variables for colors)
- Icons from Lucide React only
- Animations: CSS only, subtle, purposeful

---

## Color Mapping (use existing tokens)

| Sync State | Existing Token   | Tailwind Class          |
| ---------- | ---------------- | ----------------------- |
| synced     | green (custom)   | `text-green-500`        |
| local_only | yellow (custom)  | `text-yellow-500`       |
| syncing    | primary          | `text-primary`          |
| error      | destructive      | `text-destructive`      |
| conflict   | orange (custom)  | `text-orange-500`       |
| offline    | muted-foreground | `text-muted-foreground` |

> Note: green/yellow/orange are Tailwind defaults, already available.

---

## CAD-like Design Principles

### What makes it "industrial/CAD"

| Element      | Standard shadcn         | CAD-like version                    |
| ------------ | ----------------------- | ----------------------------------- |
| Project name | `text-sm font-medium`   | `font-mono uppercase tracking-wide` |
| Stats/counts | `text-muted-foreground` | `font-mono text-muted-foreground`   |
| Thumbnails   | Plain image             | Blueprint grid overlay on hover     |
| Cards        | Simple hover:bg         | Shadow elevation + grid effect      |

### Typography Pattern

```tsx
// CAD-like project name
<span className="font-mono text-sm uppercase tracking-wide">
  KUCHNIA-NOWOCZESNA
</span>

// CAD-like stats
<span className="font-mono text-xs text-muted-foreground">
  24 części · 6 szafek
</span>

// Regular UI text (unchanged)
<span className="text-sm text-muted-foreground">
  Ostatnio modyfikowano 2 godz. temu
</span>
```

### Blueprint Grid Pattern

```tsx
// Reusable blueprint grid overlay
const blueprintGridStyle = {
  backgroundImage: `
    linear-gradient(to right, hsl(var(--primary) / 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--primary) / 0.08) 1px, transparent 1px)
  `,
  backgroundSize: "12px 12px",
};

// Usage on hover
<div
  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
  style={blueprintGridStyle}
/>;
```

### Where to apply CAD styling

| Component               | CAD styling? | Why                                    |
| ----------------------- | ------------ | -------------------------------------- |
| Project name in header  | ✅ Yes       | Main identifier, should feel technical |
| Project cards           | ✅ Yes       | Visual distinction for project browser |
| Stats (parts, cabinets) | ✅ Yes       | Technical data                         |
| Dialogs content         | ❌ No        | Standard UI, should be readable        |
| Buttons                 | ❌ No        | Use standard shadcn                    |
| Form inputs             | ❌ No        | Use standard shadcn                    |

---

## 1. SyncStatusIndicator

Compact badge showing sync state. Core building block used in ProjectHeader.

### Visual States

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ● Zapisano              - green dot, subtle glow          │
│  ○ Niezapisane zmiany    - yellow dot, pulse animation     │
│  ◐ Synchronizowanie...   - cyan spinner                    │
│  ☁ Offline               - grey cloud icon                 │
│  ⚠ Konflikt wersji       - orange warning, attention pulse │
│  ✕ Błąd zapisu           - red x, shake on appear          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Spec

```tsx
// Size variants
type SyncStatusSize = "sm" | "md";

// sm: Just dot/icon (for tight spaces)
// md: Dot/icon + label text

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  size?: SyncStatusSize;
  showLabel?: boolean;
  className?: string;
}
```

### Animations

- **synced**: Static green dot with subtle glow
- **local_only**: Yellow dot with slow pulse (2s cycle)
- **syncing**: Rotating arc spinner (cyan)
- **offline**: Static grey, no animation
- **conflict**: Orange warning with attention pulse
- **error**: Red X, subtle shake on mount, then static

---

## 2. ProjectHeader

Shows in main app header for authenticated users. CAD-like styling for project name.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────────────────────┐  ┌─────────────────┐  ┌───┐  ┌─────┐ │
│  │ 📁 KUCHNIA-NOWOCZESNA       ▼│  │ ● Zapisano      │  │ 💾│  │  ⋮  │ │
│  │    (font-mono, uppercase)    │  │   (sync status) │  │   │  │     │ │
│  └──────────────────────────────┘  └─────────────────┘  └───┘  └─────┘ │
│        Project name dropdown         Status badge       Save   Menu    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
<div className="flex items-center gap-2">
  {/* Project name - CAD style */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="gap-2 font-mono uppercase tracking-wide">
        <FolderOpen className="h-4 w-4" />
        <span className="max-w-[200px] truncate">{projectName}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    {/* ... dropdown content ... */}
  </DropdownMenu>

  {/* Sync status */}
  <SyncStatusIndicator status={syncState.status} size="sm" />

  {/* Save button */}
  <Button
    variant="ghost"
    size="icon"
    disabled={syncState.status === "synced"}
    className={cn(syncState.status === "local_only" && "text-yellow-500")}
  >
    <Save className="h-4 w-4" />
  </Button>

  {/* Menu */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    {/* ... menu content ... */}
  </DropdownMenu>
</div>
```

### Component Spec

```tsx
interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  syncState: SyncState;
  onSave: () => void;
  onOpenProjects: () => void;
  onSaveAs: () => void;
  onRename: (newName: string) => void;
  onExport: () => void;
  onImport: () => void;
}
```

### Interaction Details

**Project Name (Dropdown Trigger)**:

- Click: Opens dropdown with recent projects + "Wszystkie projekty..."
- Shows folder icon + name + chevron
- Truncate long names with ellipsis (max 200px)

**Inline Edit Mode**:

- Double-click name to edit
- Press Enter to save, Escape to cancel
- Auto-select all text on edit start

**Save Button**:

- Disabled when synced
- Subtle pulse animation when there are unsaved changes
- Shows spinner when saving

**Menu Dropdown**:

```
┌─────────────────────────┐
│ 💾 Zapisz          ⌘S   │
│ 📄 Zapisz jako...       │
│ ✏️ Zmień nazwę          │
│ ─────────────────────── │
│ 📁 Moje projekty...     │
│ ─────────────────────── │
│ ⬇️ Eksportuj JSON       │
│ ⬆️ Importuj JSON        │
└─────────────────────────┘
```

---

## 3. ProjectListDialog

Modal to browse and manage user's projects.

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                    ✕    │
│  Moje projekty                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌────────────────────────────────────┐  Sortuj: [Ostatnio otwarte ▼]  │
│  │ 🔍 Szukaj projektów...             │           [+ Nowy projekt]     │
│  └────────────────────────────────────┘                                 │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │         │
│  │ │             │ │  │ │             │ │  │ │             │ │         │
│  │ │  Thumbnail  │ │  │ │  Thumbnail  │ │  │ │  Thumbnail  │ │         │
│  │ │             │ │  │ │             │ │  │ │             │ │         │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │         │
│  │                 │  │                 │  │                 │         │
│  │ Kuchnia Modern  │  │ Szafa Przesuwna │  │ Regał Biurowy   │         │
│  │ 24 części       │  │ 18 części       │  │ 12 części       │         │
│  │ 2 godz. temu    │  │ wczoraj         │  │ 3 dni temu      │         │
│  │           ⋮     │  │           ⋮     │  │           ⋮     │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │                              │
│  │ │             │ │  │ │      +      │ │  ← Empty slot style          │
│  │ │  Thumbnail  │ │  │ │   Nowy      │ │                              │
│  │ │             │ │  │ │  projekt    │ │                              │
│  │ └─────────────┘ │  │ └─────────────┘ │                              │
│  │ ...             │  │                 │                              │
│  └─────────────────┘  └─────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Project Card Component

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │  Thumbnail: 16:10 aspect ratio
│ │         3D Preview              │ │  Placeholder: Blueprint grid pattern
│ │         or Placeholder          │ │  Hover: Blueprint grid overlay
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ KUCHNIA-NOWOCZESNA                  │  Name: font-mono, uppercase, truncate
│ ─────────────────────────────────── │
│ 24 części · 6 szafek                │  Stats: font-mono, text-muted-foreground
│ 2 godz. temu                        │  Time: text-xs, relative format
│                                 ⋮   │  Menu: opacity-0 → opacity-100 on hover
└─────────────────────────────────────┘
```

### CAD-like Card Styling

```tsx
// Project card with industrial aesthetic
<div
  className="group relative rounded-lg border bg-card overflow-hidden
                hover:shadow-lg transition-shadow"
>
  {/* Thumbnail with blueprint grid on hover */}
  <div className="relative aspect-[16/10] bg-muted">
    {thumbnail ? (
      <img src={thumbnail} className="object-cover" />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
      </div>
    )}

    {/* Blueprint grid overlay - visible on hover */}
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100
                    transition-opacity pointer-events-none"
      style={{
        backgroundImage: `
             linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
             linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
           `,
        backgroundSize: "12px 12px",
      }}
    />
  </div>

  {/* Project info - CAD style */}
  <div className="p-3 space-y-1">
    <h3 className="font-mono text-sm font-medium uppercase tracking-wide truncate">
      {projectName}
    </h3>
    <p className="font-mono text-xs text-muted-foreground">
      {partsCount} części · {cabinetsCount} szafek
    </p>
    <p className="text-xs text-muted-foreground">{relativeTime}</p>
  </div>

  {/* Quick action button - appears on hover */}
  <Button
    variant="ghost"
    size="icon"
    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100
               transition-opacity bg-background/80 backdrop-blur-sm"
  >
    <MoreVertical className="h-4 w-4" />
  </Button>
</div>
```

### Card Hover Effects

1. Shadow elevation (`hover:shadow-lg`)
2. Blueprint grid overlay fades in (opacity transition)
3. Quick action menu button appears
4. No scale transform (keeps it subtle)

### Card Context Menu

```
┌─────────────────────────┐
│ ▶️ Otwórz               │
│ 📋 Duplikuj             │
│ ─────────────────────── │
│ 📦 Archiwizuj           │
│ 🗑️ Usuń                 │
└─────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        ┌─────────────────────┐                         │
│                        │                     │                         │
│                        │    📐               │  Blueprint icon          │
│                        │                     │                         │
│                        └─────────────────────┘                         │
│                                                                         │
│                   Nie masz jeszcze żadnych projektów                   │
│                                                                         │
│              Utwórz swój pierwszy projekt meblowy i zacznij            │
│                      projektować w 3D.                                  │
│                                                                         │
│                       [+ Utwórz pierwszy projekt]                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sort Options Dropdown

```
┌─────────────────────────┐
│ ✓ Ostatnio otwarte      │
│   Ostatnio modyfikowane │
│   Nazwa (A-Z)           │
│   Nazwa (Z-A)           │
│   Data utworzenia       │
└─────────────────────────┘
```

---

## 4. NewProjectDialog

Simple, focused dialog for creating a new project.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                        ✕    │
│  Nowy projekt                                               │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  Nazwa projektu *                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Moja nowa kuchnia                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Opis (opcjonalnie)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Nowoczesna kuchnia w kształcie litery L...          │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Anuluj]   [Utwórz projekt]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Validation

- Name: Required, min 1 char, max 100 chars
- Description: Optional, max 500 chars
- Submit button disabled until valid

### Behavior

- Auto-focus name input on open
- Enter key submits (if valid)
- Escape closes

---

## 5. UnsavedChangesDialog

Confirmation when switching projects with unsaved changes.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️  Niezapisane zmiany                                     │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  Masz niezapisane zmiany w projekcie                        │
│  "Kuchnia Nowoczesna".                                      │
│                                                             │
│  Co chcesz zrobić?                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Zapisz i kontynuuj]                              │   │  Primary
│  │                                                     │   │
│  │  [Odrzuć zmiany]              [Anuluj]             │   │  Destructive / Ghost
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Button Hierarchy

1. **Zapisz i kontynuuj** - Primary (blue/cyan), full width
2. **Odrzuć zmiany** - Destructive variant (red tint)
3. **Anuluj** - Ghost/secondary

---

## 6. ConflictResolutionDialog

Modal for resolving version conflicts between local and server.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ⚠️  Konflikt wersji                                                    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Ten projekt został zmodyfikowany na innym urządzeniu.                  │
│  Wybierz, którą wersję chcesz zachować:                                 │
│                                                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐    │
│  │                             │    │                             │    │
│  │  📱 Wersja lokalna          │    │  ☁️ Wersja z serwera        │    │
│  │  ─────────────────────────  │    │  ─────────────────────────  │    │
│  │                             │    │                             │    │
│  │  Części:     24             │    │  Części:     22             │    │
│  │  Szafki:     6              │    │  Szafki:     5              │    │
│  │  Modyfikacja: teraz         │    │  Modyfikacja: 5 min temu    │    │
│  │                             │    │                             │    │
│  │  [Zachowaj lokalną]         │    │  [Zachowaj z serwera]       │    │
│  │                             │    │                             │    │
│  └─────────────────────────────┘    └─────────────────────────────┘    │
│                                                                         │
│  ───────────────────────── lub ─────────────────────────────────────── │
│                                                                         │
│                    [Zachowaj obie jako osobne projekty]                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  ℹ️  Wybór "Zachowaj obie" utworzy kopię lokalnej wersji jako nowy     │
│     projekt i załaduje wersję z serwera do bieżącego projektu.         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Visual Details

- Two cards side by side with subtle competition styling
- Local card: Slight blue tint (your version)
- Server card: Slight grey tint (remote version)
- Stats in monospace font for alignment
- Winner/loser metaphor in button placement

### Data Display

```tsx
interface VersionSummary {
  partsCount: number;
  cabinetsCount: number;
  lastModified: Date;
  source: "local" | "server";
}
```

---

## 7. GuestMigrationDialog

Shown when a guest user logs in and has existing work in localStorage.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎉  Witaj w aplikacji!                                     │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  Zalogowałeś się pomyślnie. Zauważyliśmy, że masz          │
│  niezapisany projekt w przeglądarce:                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📐 Projekt lokalny                                  │   │
│  │    24 części · 6 szafek · utworzono dzisiaj        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Co chcesz z nim zrobić?                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [💾 Zapisz jako nowy projekt]                     │   │  Primary
│  │                                                     │   │
│  │  [🗑️ Odrzuć i zacznij od nowa]                     │   │  Destructive
│  │                                                     │   │
│  │  [📝 Kontynuuj bez zapisywania]                    │   │  Ghost
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️  Jeśli zapiszesz projekt, będzie dostępny na           │
│     wszystkich Twoich urządzeniach.                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Local Project Preview Card

Shows a compact summary of the local project:

- Blueprint icon
- Part count (monospace)
- Cabinet count (monospace)
- Relative creation time

### Button Hierarchy

1. **Zapisz jako nowy projekt** - Primary, recommended action
2. **Odrzuć i zacznij od nowa** - Destructive, requires confirmation
3. **Kontynuuj bez zapisywania** - Ghost, keep working locally

---

## Component File Structure

```
apps/app/src/components/projects/
├── ProjectHeader.tsx
├── ProjectNameEditor.tsx          # Inline edit subcomponent
├── ProjectListDialog.tsx
├── ProjectCard.tsx                # Individual project card
├── ProjectCardMenu.tsx            # Context menu for card
├── ProjectEmptyState.tsx          # No projects view
├── NewProjectDialog.tsx
├── UnsavedChangesDialog.tsx
├── ConflictResolutionDialog.tsx
├── GuestMigrationDialog.tsx
├── SyncStatusIndicator.tsx
└── index.ts                       # Barrel export
```

---

## Animation Specs

### SyncStatusIndicator (Tailwind classes only)

| State      | Animation                 | Tailwind Class  |
| ---------- | ------------------------- | --------------- |
| synced     | None (static)             | -               |
| local_only | Pulse                     | `animate-pulse` |
| syncing    | Spin                      | `animate-spin`  |
| offline    | None                      | -               |
| conflict   | Pulse                     | `animate-pulse` |
| error      | None (static after mount) | -               |

> All animations use Tailwind built-in `animate-*` classes. No custom keyframes needed.

### Project Card Hover (Tailwind only)

```tsx
// All hover effects via Tailwind utilities
<div
  className="
  group
  transition-shadow
  hover:shadow-lg
"
>
  {/* Blueprint grid overlay */}
  <div
    className="
    opacity-0
    group-hover:opacity-100
    transition-opacity
  "
  />
</div>
```

### Dialog Animations

Use existing Radix Dialog animations from shadcn/ui - no custom CSS needed.
The `Dialog` component from `@meble/ui` already has enter/exit animations.

---

## Responsive Behavior

### ProjectListDialog

| Breakpoint | Columns | Card Size  |
| ---------- | ------- | ---------- |
| < 640px    | 1       | Full width |
| 640-1024px | 2       | ~280px     |
| > 1024px   | 3       | ~280px     |

### ProjectHeader

| Breakpoint | Behavior                               |
| ---------- | -------------------------------------- |
| < 640px    | Project name truncated, menu icon only |
| > 640px    | Full layout with all elements          |

---

## Accessibility

- All dialogs trap focus
- Escape closes dialogs
- Arrow keys navigate project grid
- Enter opens selected project
- Screen reader announces sync status changes
- Color is never the only indicator (icons + text)

---

## Integration Notes

### Conditional Rendering

```tsx
// Only show ProjectHeader for authenticated users
function AppHeader() {
  const { user } = useAuth();

  return (
    <header>
      {/* ... existing header content ... */}

      {user && <ProjectHeader />}
    </header>
  );
}
```

### Sync Status Updates

```tsx
// Listen to sync state changes
useEffect(() => {
  // Announce to screen readers
  if (syncState.status === "error") {
    announceToScreenReader("Błąd zapisu projektu");
  }
}, [syncState.status]);
```
