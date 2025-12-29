## Ogólne zasady implementacji

### Language & Internationalization

- **Code & Comments:** ALWAYS use English
  - Variable names, function names, class names - English only
  - Code comments, documentation - English only
  - Type definitions, interfaces - English only
  - Git commit messages - English only
  - Example: `calculateTotalArea()`, `interface Material`, `// Calculate dimensions`
- **UI Text:** Use Polish (PL) by default
  - All user-facing text: buttons, labels, messages - Polish
  - Validation and error messages - Polish
  - Placeholders and tooltips - Polish
  - Example: "Zapisz", "Usuń", "Nazwa materiału"
- **Translation Updates:**
  - **DO NOT** translate after every feature - only before releasing a new version
  - Reason: saves AI tokens, avoids translating experimental/invalid features
  - Update translations in batch before each release
  - Prepare i18n system for future multi-language support

### Styling i Theme

- **WAŻNE:** Używaj Tailwind CSS z zdefiniowanym theme (colors, spacing, etc.)
- **NIE** stosuj hardcoded kolorów typu `#ffffff`, `bg-blue-500` - zawsze używaj zmiennych theme
- Przykład: zamiast `bg-blue-500` użyj `bg-primary`, zamiast `text-gray-900` użyj `text-foreground`
- Wszystkie kolory powinny być definiowane w `tailwind.config.ts` jako CSS variables
- To pozwoli łatwo zmienić cały wygląd aplikacji w przyszłości (np. dark mode)

### Konfiguracja kolorów (przykład do tailwind.config.ts):

```ts
theme: {
  extend: {
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      accent: 'hsl(var(--accent))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      muted: 'hsl(var(--muted))',
      'muted-foreground': 'hsl(var(--muted-foreground))',
      border: 'hsl(var(--border))',
      // ... etc
    }
  }
}
```

### Architektura projektu (Turborepo)

```
meble/                   # Monorepo root
├── apps/
│   ├── app/            # Main furniture design app (port 3000)
│   ├── landing/        # Marketing landing page (port 3001)
│   └── payments/       # Subscription & payments (port 3002, requires Supabase/Stripe)
├── packages/
│   ├── ui/             # Shared UI components (@meble/ui)
│   ├── i18n/           # Shared i18n config (@meble/i18n)
│   └── tsconfig/       # Shared TypeScript configs
├── package.json        # Root workspace
├── pnpm-workspace.yaml # pnpm workspaces
└── turbo.json          # Turborepo config
```

**Build commands:**

- `pnpm dev` - Run all apps
- `pnpm build` - Build all apps (use `--filter=!@meble/payments` to skip payments if not configured)
- `pnpm build --filter=@meble/app` - Build specific app

### Internationalization (i18n)

- **System:** next-intl with shared `@meble/i18n` package
- **Supported locales:** `pl` (default), `en`
- **Translation files:** `apps/*/src/messages/{locale}.json`
- **Shared translations:** `packages/i18n/src/locales/{locale}/common.json`
- **Usage in components:**
  ```tsx
  import { useTranslations } from "next-intl";
  const t = useTranslations("namespace");
  return <h1>{t("key")}</h1>;
  ```
- **Locale routing:** `/pl/page`, `/en/page` (pl shows as `/page` with `localePrefix: 'as-needed'`)
- **IMPORTANT:** DO NOT add translations for every feature - batch update before releases only

### Struktura aplikacji (legacy - do refaktoryzacji)

```
apps/app/src/
├── app/[locale]/       # Next.js App Router with i18n
├── components/
│   ├── canvas/         # Komponenty 3D (Scene, Part3D, etc.)
│   ├── ui/             # shadcn/ui components + custom UI
│   └── layout/         # Layout components
├── lib/
│   ├── store.ts        # Zustand store
│   ├── csv.ts          # CSV generation
│   └── utils.ts        # Utilities (cn, etc.)
├── types/
│   └── index.ts        # TypeScript type definitions
└── styles/
    └── globals.css     # Global styles + CSS variables
```

### Flow

- Nie odpalaj sam serwera (robie to recznie)
- Zrealizowany plan oznaczaj jako DONE-nazwa-planu.md i przenoś do foldernu app/apps/docs/DONE
- Jesli chcesz dodac input typu number to dodaj NumberInput
- !Aplikacja nie jest jeszcze produkcjna, nie musisz robic migracji starych wersji, api, backward compability itp.
- !Podczsa implementacji jesli uznasz ze jakas zmienna powinna byc w globalnym configu to dodaj ja tam.

### Business Logic Documentation

Detailed business logic documentation for key subsystems:

| System                 | Documentation                                     |
| ---------------------- | ------------------------------------------------- |
| **Project System**     | `apps/app/docs/PROJECT-SYSTEM.md`                 |
| Interior Configuration | `apps/app/docs/interior-config-business-logic.md` |
| Interior Tests         | `apps/app/docs/interior-config-test-plan.md`      |
| **Database Structure** | `apps/app/docs/DATABASE-STRUCTURE.md`             |

**Project System** (`apps/app/docs/PROJECT-SYSTEM.md`):

- Multi-project management with cloud sync
- Modular slice architecture (`lib/store/slices/project/`)
- Sync states: synced, local_only, syncing, offline, conflict, error
- Optimistic locking with revision-based conflict detection
- Network resilience with automatic retry (3 attempts, exponential backoff)
- Multi-tab sync via BroadcastChannel API
- Optimized selectors: `useSyncStatus()`, `useHasUnsavedChanges()`, etc.
- Tests: `projectSlice.test.ts` (35 tests)

**Database Domains** (Supabase - `lqwdhiyozxgtovecvxaw`):

- **Users**: `auth.users` + `profiles` (extended user data, tenant membership)
- **Credits**: `export_credits` (auth users), `guest_credits` (anonymous), `export_sessions` (24h re-exports)
- **Payments**: `payments` (unified - PayU, Przelewy24, Stripe, manual)
- **Shop**: `shop_products`, `shop_orders`, `cart_items` (mini e-commerce)
- **Producers**: `producers`, `producer_quotes`, `producer_orders`, `commissions` (cutting service marketplace)
- **Tenants (B2B)**: `tenants`, `tenant_users`, `tenant_materials`, `tenant_subscriptions` (white-label)
- **Admin**: `admin_users`, `audit_logs`, `analytics_daily`

**Interior Configuration System** (`apps/app/docs/interior-config-business-logic.md`):

- Recursive zone-based architecture (max 4 levels: depths 0-3)
- Zone types: EMPTY, SHELVES, DRAWERS, NESTED
- Division directions: HORIZONTAL (rows), VERTICAL (columns)
- Partition configuration with depth presets
- Shelf modes: UNIFORM, MANUAL with depth presets
- Drawer zones with boxes, fronts, slides, above-box shelves
- All limits and constraints documented
- Domain modules: `lib/domain/zone.ts`, `shelf.ts`, `drawer.ts`

### TypeScript

- Używaj **strict mode** w tsconfig.json
- Wszystkie typy powinny być zdefiniowane w `src/types/index.ts`
- Nigdy nie używaj `any` - zawsze definiuj dokładne typy
- Używaj discriminated unions dla shape types i edge banding

### State Management (Zustand)

- Jeden główny store w `src/lib/store.ts`
- Używaj `persist` middleware dla localStorage
- Immutable updates (spread operators, nie mutuj bezpośrednio)
- Akcje powinny być jasno nazwane i robić jedną rzecz

### Komponenty 3D (React Three Fiber)

- Wszystkie komponenty 3D w `src/components/canvas/`
- Używaj `use client` directive
- Reaktywne pobieranie danych ze store (hook `useStore`)
- Materiały muszą dynamicznie reagować na zmiany w store
- Geometrie powinny się przebudowywać gdy zmienią się parametry

### UI Components

- Używaj shadcn/ui jako podstawy
- Customowe komponenty w `src/components/ui/`
- Wszystkie inputy powinny mieć walidację
- Używaj controlled components (value + onChange)

### Nazewnictwo

- Pliki komponentów: PascalCase (np. `PropertiesPanel.tsx`)
- Funkcje/zmienne: camelCase (np. `addPart`, `selectedPartId`)
- Typy/Interfejsy: PascalCase (np. `Part`, `Material`)
- Stałe: UPPER_SNAKE_CASE (np. `DEFAULT_THICKNESS`)

### Walidacja

- Wszystkie wymiary muszą być > 0
- Materiał musi istnieć
- Grubość części = grubość materiału
- Przed eksportem CSV - pełna walidacja danych

### Performance

- Używaj React.memo dla komponentów 3D jeśli potrzeba
- Zustand selektory dla wydajności (pobieraj tylko potrzebne dane)
- Debounce/throttle dla kosztownych operacji
- Dbaj o jak najmniejsza liczbe rerender w React

### Error Handling

- Error boundaries dla części aplikacji
- Graceful fallbacks dla brakujących danych
- User-friendly komunikaty błędów

## Checklist przed commitowaniem

- [ ] Kod używa theme colors (nie hardcoded)
- [ ] Wszystkie typy są zdefiniowane (no `any`)
- [ ] Kod i komentarze w języku angielskim
- [ ] UI tekst w języku polskim
- [ ] Walidacja inputów działa
- [ ] Komponenty 3D reagują na zmiany w store
- [ ] Kod jest sformatowany (prettier)
- [ ] Brak console.log (oprócz dev debugowania)
- [ ] Error handling jest na miejscu

## Checklist przed wydaniem wersji

- [ ] Wszystkie UI stringi używają systemu tłumaczeń (nie hardcoded)
- [ ] Wszystkie tłumaczenia są zaktualizowane i kompletne
- [ ] Komunikaty błędów są user-friendly i przetłumaczone
- [ ] Dokumentacja jest aktualna
- Nie uzuwa sie czegos takiego jak useStore(useCallback!) NIGDY! Uzywaj useStore(useShallow)!
