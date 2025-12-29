# Plan: Dark Mode dla apps/app i sceny 3D

## Decyzje użytkownika

- **Styl 3D dark mode:** Ciemny pokój (ściany ciemnoszare, podłoga prawie czarna)
- **Kolory semantyczne:** Tak, dodać od razu (success, warning, info)

---

## Status obecny

### Co już jest gotowe (90% infrastruktury):

- ✅ CSS variables dla light i dark mode w `globals.css` (15 zmiennych)
- ✅ Tailwind skonfigurowany z `darkMode: ["class"]`
- ✅ Pakiet `next-themes` v0.4.6 zainstalowany
- ✅ ~83% komponentów UI używa zmiennych theme poprawnie

### Co brakuje:

- ❌ ThemeProvider wrapper w layout.tsx
- ❌ Przycisk toggle theme w UI
- ❌ Kolory sceny 3D są hardcoded (walls, floor, ceiling, grid, lighting)

---

## Fazy implementacji

### Faza 1: Infrastruktura ThemeProvider

**1.1 Utworzenie ThemeProvider**

- Plik: `apps/app/src/providers/ThemeProvider.tsx`
- Wrapper dla `next-themes` z konfiguracją: `attribute="class"`, `defaultTheme="system"`

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

**1.2 Aktualizacja layout.tsx**

- Plik: `apps/app/src/app/layout.tsx`
- Dodanie `suppressHydrationWarning` do `<html>`
- Owinięcie dzieci w `<ThemeProvider>`

```tsx
import { ThemeProvider } from "@/providers/ThemeProvider";

// ...

<html lang={locale} suppressHydrationWarning>
  <body>
    <ThemeProvider>{/* existing providers */}</ThemeProvider>
  </body>
</html>;
```

---

### Faza 2: Przycisk Theme Toggle

**2.1 Komponent ThemeToggle**

- Plik: `apps/app/src/components/ui/ThemeToggle.tsx`
- Dropdown z opcjami: Jasny, Ciemny, Systemowy
- Ikony: Sun, Moon, Monitor z lucide-react

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@meble/ui";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@meble/ui";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="sr-only">Zmień motyw</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          Jasny
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          Ciemny
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          Systemowy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**2.2 Integracja z TopBar**

- Plik: `apps/app/src/components/ui/TopBar.tsx`
- Dodanie `<ThemeToggle />` w prawej sekcji

---

### Faza 3: Theme dla sceny 3D

**3.1 Konfiguracja kolorów sceny**

- Plik: `apps/app/src/lib/config.ts`
- Dodanie `SCENE_THEME_CONFIG` z wariantami light/dark:

```typescript
export const SCENE_THEME_CONFIG = {
  light: {
    // Room colors
    WALL_COLOR: "#e5e7eb",
    FLOOR_COLOR: "#eeeeee",
    CEILING_COLOR: "#ffffff",

    // Grid colors
    GRID_CELL_COLOR: "#6b7280",
    GRID_SECTION_COLOR: "#374151",

    // Lighting
    AMBIENT_INTENSITY: 0.7,
    AMBIENT_COLOR: "#ffffff",
    HEMISPHERE_SKY: "#ffffff",
    HEMISPHERE_GROUND: "#bbbbbb",
    HEMISPHERE_INTENSITY: 0.5,

    // Simulation mode
    SIMULATION_AMBIENT_INTENSITY: 0.1,
    SIMULATION_HEMISPHERE_GROUND: "#444444",
    SIMULATION_HEMISPHERE_INTENSITY: 0.2,

    // AO
    AO_COLOR: "#000000",
  },
  dark: {
    // Room colors - ciemny pokój
    WALL_COLOR: "#374151", // gray-700
    FLOOR_COLOR: "#1f2937", // gray-800
    CEILING_COLOR: "#111827", // gray-900

    // Grid colors - jaśniejsze dla kontrastu
    GRID_CELL_COLOR: "#4b5563", // gray-600
    GRID_SECTION_COLOR: "#6b7280", // gray-500

    // Lighting - zredukowane dla dark mode
    AMBIENT_INTENSITY: 0.5,
    AMBIENT_COLOR: "#e5e7eb",
    HEMISPHERE_SKY: "#e5e7eb",
    HEMISPHERE_GROUND: "#374151",
    HEMISPHERE_INTENSITY: 0.4,

    // Simulation mode
    SIMULATION_AMBIENT_INTENSITY: 0.15,
    SIMULATION_HEMISPHERE_GROUND: "#1f2937",
    SIMULATION_HEMISPHERE_INTENSITY: 0.25,

    // AO
    AO_COLOR: "#1a1a1a",
  },
} as const;

export type SceneTheme = keyof typeof SCENE_THEME_CONFIG;
```

**3.2 Hook useSceneTheme**

- Plik: `apps/app/src/hooks/useSceneTheme.ts`

```typescript
"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { SCENE_THEME_CONFIG, type SceneTheme } from "@/lib/config";

export function useSceneTheme() {
  const { resolvedTheme } = useTheme();

  const sceneTheme = useMemo(() => {
    const theme: SceneTheme = resolvedTheme === "dark" ? "dark" : "light";
    return SCENE_THEME_CONFIG[theme];
  }, [resolvedTheme]);

  const isDark = resolvedTheme === "dark";

  return { sceneTheme, isDark };
}
```

**3.3 Aktualizacja komponentów 3D**

| Komponent            | Zmiany                                                   |
| -------------------- | -------------------------------------------------------- |
| `Room3D.tsx`         | `color={sceneTheme.WALL_COLOR}`                          |
| `FloorCeiling3D.tsx` | `color={sceneTheme.FLOOR_COLOR}`, `CEILING_COLOR`        |
| `Scene.tsx`          | `cellColor={sceneTheme.GRID_CELL_COLOR}`, `sectionColor` |
| `RoomLighting.tsx`   | Intensity i kolory z `sceneTheme`                        |
| `SceneEffects.tsx`   | `color={sceneTheme.AO_COLOR}`                            |

---

### Faza 4: Kolory semantyczne

**4.1 Dodanie zmiennych CSS**

- Plik: `apps/app/src/styles/globals.css`

```css
@layer base {
  :root {
    /* ... existing variables ... */

    /* Semantic colors */
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;

    --warning: 45 93% 47%;
    --warning-foreground: 0 0% 0%;

    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
  }

  .dark {
    /* ... existing variables ... */

    /* Semantic colors - dark mode */
    --success: 142 69% 58%;
    --success-foreground: 142 76% 10%;

    --warning: 45 93% 58%;
    --warning-foreground: 45 93% 10%;

    --info: 217 91% 70%;
    --info-foreground: 217 91% 10%;
  }
}
```

**4.2 Aktualizacja Tailwind**

- Plik: `packages/ui/tailwind.config.ts`

```typescript
colors: {
  // ... existing colors ...
  success: {
    DEFAULT: "hsl(var(--success))",
    foreground: "hsl(var(--success-foreground))",
  },
  warning: {
    DEFAULT: "hsl(var(--warning))",
    foreground: "hsl(var(--warning-foreground))",
  },
  info: {
    DEFAULT: "hsl(var(--info))",
    foreground: "hsl(var(--info-foreground))",
  },
},
```

**4.3 Pliki z hardcoded kolorami do poprawienia**

| Plik                       | Problem                                 | Rozwiązanie                           |
| -------------------------- | --------------------------------------- | ------------------------------------- |
| `TopBar.tsx`               | `text-yellow-500`                       | `text-warning`                        |
| `ExportDialog.tsx`         | `bg-blue-*`, `bg-amber-*`, `bg-green-*` | `bg-info`, `bg-warning`, `bg-success` |
| `CreditsPurchaseModal.tsx` | `text-amber-500`, `text-green-500`      | `text-warning`, `text-success`        |
| `PropertiesPanel.tsx`      | `text-amber-*`                          | `text-warning`                        |
| `Sidebar.tsx`              | `text-red-*`                            | `text-destructive` (już jest)         |

---

## Pliki do modyfikacji

| Plik                                                | Akcja  |
| --------------------------------------------------- | ------ |
| `apps/app/src/providers/ThemeProvider.tsx`          | NOWY   |
| `apps/app/src/app/layout.tsx`                       | EDYCJA |
| `apps/app/src/components/ui/ThemeToggle.tsx`        | NOWY   |
| `apps/app/src/components/ui/TopBar.tsx`             | EDYCJA |
| `apps/app/src/lib/config.ts`                        | EDYCJA |
| `apps/app/src/hooks/useSceneTheme.ts`               | NOWY   |
| `apps/app/src/components/canvas/Room3D.tsx`         | EDYCJA |
| `apps/app/src/components/canvas/FloorCeiling3D.tsx` | EDYCJA |
| `apps/app/src/components/canvas/Scene.tsx`          | EDYCJA |
| `apps/app/src/components/canvas/RoomLighting.tsx`   | EDYCJA |
| `apps/app/src/components/canvas/SceneEffects.tsx`   | EDYCJA |
| `apps/app/src/styles/globals.css`                   | EDYCJA |
| `packages/ui/tailwind.config.ts`                    | EDYCJA |

---

## Checklist testowania

- [ ] Theme persystuje po odświeżeniu strony
- [ ] System theme jest respektowany przy pierwszym ładowaniu
- [ ] Brak warningów hydration w konsoli
- [ ] Kolory sceny 3D aktualizują się przy zmianie theme
- [ ] Grid jest widoczny w obu theme
- [ ] Pokój (ściany, podłoga, sufit) ma odpowiednie kolory
- [ ] Oświetlenie wygląda naturalnie w obu theme
- [ ] Wszystkie komponenty UI pozostają czytelne
- [ ] Dialogi i modals mają poprawne tła

---

## Kolejność implementacji

1. **Faza 1**: ThemeProvider - fundament
2. **Faza 2**: Toggle button - użytkownik może przełączać
3. **Faza 3**: Scena 3D - najbardziej widoczna zmiana
4. **Faza 4**: Kolory semantyczne + poprawa hardcoded kolorów w UI
