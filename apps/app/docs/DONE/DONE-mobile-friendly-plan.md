# Plan Dostosowania Aplikacji do Urządzeń Mobilnych

## Spis treści
1. [Przegląd](#przegląd)
2. [Breakpointy](#breakpointy)
3. [Dialog powitalny - rekomendacja większego ekranu](#dialog-powitalny)
4. [Prawy panel (Sidebar) - wysuwany na mobile](#prawy-panel-sidebar)
5. [Przycisk Reset widoku](#przycisk-reset-widoku)
6. [Dialogi - dostosowanie do mobile](#dialogi)
7. [Konfiguratory i panele właściwości](#konfiguratory)
8. [Toolbar sceny 3D](#toolbar-sceny-3d)
9. [Tabele i listy](#tabele-i-listy)
10. [Pozostałe elementy](#pozostałe-elementy)
11. [Kolejność implementacji](#kolejność-implementacji)

---

## Przegląd

Aplikacja obecnie jest zaprojektowana wyłącznie pod urządzenia desktopowe z:
- Stałym układem 75%/25% (canvas/sidebar)
- Dialogami o stałych szerokościach (`max-w-3xl`, `max-w-4xl`)
- Małymi przyciskami i gęsto upakowanymi kontrolkami
- Brakiem responsywnych breakpointów

**Cel:** Dostosować UI do urządzeń mobilnych (< 768px) bez zmiany wyglądu na większych ekranach.

---

## Breakpointy

Wykorzystamy standardowe breakpointy Tailwind:
- **Mobile:** < 768px (`default`)
- **Tablet/Desktop:** >= 768px (`md:`)

**Główna zasada:** Mobile-first dla nowych zmian, ale zachowujemy istniejący desktop UI poprzez `md:` prefix.

---

## Dialog powitalny

### Opis
Przy otwarciu aplikacji na urządzeniu mobilnym wyświetl dialog informacyjny z rekomendacją używania szerszego ekranu.

### Lokalizacja
`apps/app/src/components/ui/MobileWarningDialog.tsx` (nowy komponent)

### Implementacja

```tsx
// MobileWarningDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@meble/ui";
import { Button } from "@meble/ui";
import { Monitor, Smartphone } from "lucide-react";

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = "mobile-warning-dismissed";

export function MobileWarningDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Sprawdź czy to mobile i czy dialog nie był już zamknięty w tej sesji
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const wasDismissed = sessionStorage.getItem(STORAGE_KEY);

    if (isMobile && !wasDismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Smartphone className="h-12 w-12 text-muted-foreground" />
              <Monitor className="h-16 w-16 text-primary absolute -right-6 -top-2" />
            </div>
          </div>
          <DialogTitle className="text-center">
            Zalecamy większy ekran
          </DialogTitle>
          <DialogDescription className="text-center">
            Dla wyższego komfortu i łatwiejszej obsługi projektanta mebli
            zalecamy używanie szerszych ekranów lub komputera.
            <br /><br />
            Aplikacja działa na urządzeniach mobilnych, ale niektóre funkcje
            mogą być trudniejsze w obsłudze.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleDismiss} className="w-full">
            Rozumiem, kontynuuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Integracja
Dodać do `apps/app/src/app/page.tsx`:
```tsx
import { MobileWarningDialog } from "@/components/ui/MobileWarningDialog";

// W komponencie Page:
<>
  <MobileWarningDialog />
  {/* reszta layoutu */}
</>
```

---

## Prawy panel (Sidebar)

### Obecny stan
- Stała szerokość `w-1/4` (25%)
- Zawsze widoczny obok canvasa
- Brak możliwości schowania

### Docelowy stan na mobile
- Panel schowany domyślnie
- Wysuwa się z prawej strony (Drawer)
- Przycisk toggle w toolbarze sceny
- Pełna szerokość lub ~85% szerokości ekranu

### Lokalizacja
- `apps/app/src/app/page.tsx` - główny layout
- `apps/app/src/components/ui/Sidebar.tsx` - komponent sidebara
- `apps/app/src/components/ui/MobileSidebarTrigger.tsx` (nowy)

### Implementacja

#### 1. Hook do wykrywania mobile
```tsx
// hooks/useIsMobile.ts
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
```

#### 2. Przycisk toggle dla mobile
```tsx
// MobileSidebarTrigger.tsx
import { Button } from "@meble/ui";
import { PanelRight } from "lucide-react";

interface MobileSidebarTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export function MobileSidebarTrigger({ onClick, isOpen }: MobileSidebarTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="md:hidden bg-background/80 backdrop-blur-sm"
      title="Panel właściwości"
    >
      <PanelRight className={`h-4 w-4 ${isOpen ? "text-primary" : ""}`} />
    </Button>
  );
}
```

#### 3. Zmodyfikowany layout w page.tsx
```tsx
// page.tsx
"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Drawer } from "@meble/ui";

export default function Page() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Canvas - pełna szerokość na mobile, 75% na desktop */}
      <div className="w-full md:w-3/4 bg-muted relative">
        <Scene
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          isMobile={isMobile}
        />
      </div>

      {/* Desktop Sidebar - ukryty na mobile */}
      {!isMobile && (
        <div className="w-1/4 border-l border-border bg-background">
          <Sidebar />
        </div>
      )}

      {/* Mobile Sidebar - Drawer z prawej strony */}
      {isMobile && (
        <Drawer
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          side="right"
          className="w-[85vw] max-w-sm"
        >
          <div className="pt-12 h-full">
            <Sidebar />
          </div>
        </Drawer>
      )}
    </div>
  );
}
```

#### 4. Modyfikacja Sidebar.tsx
Dodać prop `onClose` i przycisk zamknięcia dla mobile:
```tsx
interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        {/* Istniejący header */}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Reszta sidebara */}
    </div>
  );
}
```

---

## Przycisk Reset widoku

### Obecny stan
```tsx
<Button variant="outline" size="sm" ...>
  <Camera className="mr-2 h-4 w-4" />
  Reset widoku
</Button>
```

### Docelowy stan
- Na mobile: tylko ikona (bez tekstu)
- Na desktop: z tekstem (bez zmian)

### Lokalizacja
`apps/app/src/components/canvas/Scene.tsx` (linia ~182-192)

### Implementacja
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleResetCamera}
  className="bg-background/80 backdrop-blur-sm"
  title={`Reset widoku (${formatShortcutLabel(KEYBOARD_SHORTCUTS.RESET_CAMERA)})`}
>
  <Camera className="h-4 w-4 md:mr-2" />
  <span className="hidden md:inline">Reset widoku</span>
</Button>
```

---

## Dialogi

### Ogólne zasady dla wszystkich dialogów
1. Na mobile: pełna szerokość z marginesem (`w-full mx-4` lub `max-w-[calc(100vw-2rem)]`)
2. Maksymalna wysokość: `max-h-[85vh]` z scrollowaniem
3. Większe przyciski i inputy na dotyk
4. Stos pionowy zamiast siatek poziomych

### CabinetTemplateDialog.tsx

#### Zmiany
```tsx
// Obecne:
<DialogContent className="max-w-3xl max-h-[90vh]">

// Docelowe:
<DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[85vh] md:max-h-[90vh]">
```

#### Grid z typami szafek
```tsx
// Obecne:
<div className="grid grid-cols-2 gap-4">

// Docelowe:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
```

#### Przyciski nawigacji kroków
```tsx
// Docelowe - większe na mobile:
<DialogFooter className="flex-col gap-2 sm:flex-row">
  <Button className="w-full sm:w-auto">...</Button>
</DialogFooter>
```

### ExportDialog.tsx

#### Grid z kolumnami
```tsx
// Obecne:
<div className="grid grid-cols-2 md:grid-cols-4 gap-2">

// Docelowe:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
```

#### Tabela z podglądem
Na mobile: ukryć tabelę lub pokazać uproszczoną wersję (tylko kluczowe kolumny)

### DrawerConfigDialog.tsx

#### Layout stref
```tsx
// Na mobile: stos pionowy zamiast flex row
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">...</div>
  <div className="w-full md:w-1/2">...</div>
</div>
```

### HandlesConfigDialog.tsx

#### Grid z uchwytami
```tsx
// Docelowe:
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
```

### FrontsConfigDialog.tsx

#### Presety układów
```tsx
// Docelowe - mniejsze karty na mobile:
<div className="grid grid-cols-2 gap-2 md:gap-3">
```

### InteriorConfigDialog

#### Layout główny
```tsx
// Docelowe - edytor i podgląd jako tabs na mobile:
<Tabs defaultValue="editor" className="md:hidden">
  <TabsList>
    <TabsTrigger value="editor">Edytor</TabsTrigger>
    <TabsTrigger value="preview">Podgląd</TabsTrigger>
  </TabsList>
  <TabsContent value="editor">
    <SectionEditor />
  </TabsContent>
  <TabsContent value="preview">
    <InteriorPreview />
  </TabsContent>
</Tabs>

{/* Desktop - side by side */}
<div className="hidden md:flex gap-4">
  <SectionEditor />
  <InteriorPreview />
</div>
```

---

## Konfiguratory

### PropertiesPanel.tsx

#### Inputs - większe na mobile
```tsx
// Docelowe - większa wysokość inputów:
<Input className="h-10 md:h-8" />
<NumberInput className="h-10 md:h-8" />
```

#### Etykiety i pola
```tsx
// Obecne (inline):
<div className="flex items-center gap-2">
  <Label>Szerokość</Label>
  <Input />
</div>

// Docelowe (stack na mobile):
<div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
  <Label className="text-xs md:text-sm">Szerokość</Label>
  <Input className="w-full md:w-auto" />
</div>
```

#### Akcordiony - większe nagłówki
```tsx
<AccordionTrigger className="py-3 md:py-2 text-sm">
```

#### Przyciski akcji
```tsx
// Większe na mobile:
<Button className="h-10 md:h-8 text-sm">
  Zastosuj zmiany
</Button>
```

### DimensionsConfig i inne sub-komponenty

#### Layout wymiarów W×H×D
```tsx
// Obecne:
<div className="grid grid-cols-3 gap-2">

// Docelowe - 1 kolumna na bardzo małych ekranach:
<div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
```

Lub zachować 3 kolumny ale z mniejszymi labelkami:
```tsx
<div className="grid grid-cols-3 gap-1 md:gap-2">
  <div>
    <Label className="text-[10px] md:text-xs">Szer.</Label>
    <NumberInput />
  </div>
</div>
```

---

## Toolbar sceny 3D

### Obecny stan
- Przyciski w prawym górnym rogu
- Małe (`size="sm"`)
- Gęsto upakowane

### Lokalizacja
`apps/app/src/components/canvas/Scene.tsx`

### Zmiany

#### 1. Większe przyciski na mobile
```tsx
// Przyciski transform mode:
<Button
  variant={transformMode === "translate" ? "default" : "outline"}
  size="sm"
  className="h-10 w-10 md:h-8 md:w-8 p-0"
>
  <Move className="h-5 w-5 md:h-4 md:w-4" />
</Button>
```

#### 2. Grupowanie w jeden kontener z lepszym paddingiem
```tsx
<div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-wrap gap-1 md:gap-2 max-w-[calc(100%-1rem)]">
```

#### 3. Ukrycie mniej ważnych przycisków na mobile
```tsx
{/* Pokaż tylko na desktop */}
<div className="hidden md:flex gap-2">
  <GraphicsSettingsPanel />
  <KeyboardShortcutsHelp />
</div>
```

#### 4. Przycisk toggle sidebara (dodać do toolbara)
Na mobile dodać przycisk otwierający sidebar (z sekcji o Sidebarze).

---

## Tabele i listy

### PartsTable.tsx

#### Obecny stan
- Pełna tabela z wieloma kolumnami
- Hierarchiczna struktura (drzewo)

#### Zmiany na mobile

**Opcja 1: Uproszczona lista**
```tsx
{/* Mobile - lista kart */}
<div className="md:hidden space-y-2">
  {parts.map(part => (
    <Card key={part.id} className="p-3">
      <div className="flex justify-between items-center">
        <span className="font-medium truncate">{part.name}</span>
        <Badge>{part.type}</Badge>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {part.width} × {part.height} × {part.depth}
      </div>
    </Card>
  ))}
</div>

{/* Desktop - pełna tabela */}
<div className="hidden md:block">
  <Table>...</Table>
</div>
```

**Opcja 2: Tabela z horizontal scroll**
```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <Table className="min-w-[600px]">...</Table>
</div>
```

---

## Pozostałe elementy

### 1. Header Sidebara

#### Przyciski undo/redo
```tsx
// Większe na mobile:
<Button size="icon" className="h-9 w-9 md:h-8 md:w-8">
  <Undo className="h-5 w-5 md:h-4 md:w-4" />
</Button>
```

#### Dropdown menu ustawień
```tsx
// Szersze na mobile:
<DropdownMenuContent className="w-56 md:w-48">
```

### 2. Przyciski akcji (Add Part, Add Cabinet, Export)

```tsx
// Na mobile - tylko ikony:
<Button variant="outline" size="sm" className="h-10 md:h-8">
  <Plus className="h-4 w-4 md:mr-2" />
  <span className="hidden md:inline">Dodaj część</span>
</Button>
```

### 3. Tabs w Sidebarze

```tsx
// Większe tabs na mobile:
<TabsList className="h-12 md:h-10">
  <TabsTrigger className="text-sm md:text-xs px-4 md:px-3">
    Właściwości
  </TabsTrigger>
</TabsList>
```

### 4. Select i Dropdown

```tsx
// Większa wysokość trigger:
<SelectTrigger className="h-10 md:h-8">
```

### 5. Switch/Toggle

```tsx
// Większy rozmiar na mobile:
<Switch className="scale-125 md:scale-100" />
```

### 6. Slider

```tsx
// Większy track na mobile dla łatwiejszego dotykania:
<Slider className="py-4 md:py-2" />
```

### 7. Tooltips

Na mobile tooltips mogą nie działać (brak hover). Rozważ:
- Ukrycie tooltipów na mobile
- Zamiana na long-press behavior
- Dodanie info ikon z popoverami

```tsx
<TooltipProvider delayDuration={0} skipDelayDuration={0}>
  {/* Na mobile tooltip może nie zadziałać - dodać aria-label */}
  <Button aria-label="Reset widoku">
    <Tooltip>
      <TooltipTrigger asChild>
        <Camera />
      </TooltipTrigger>
      <TooltipContent className="hidden md:block">
        Reset widoku
      </TooltipContent>
    </Tooltip>
  </Button>
</TooltipProvider>
```

### 8. Modals/Popovers kontrolek

Snap, Dimensions, Graphics settings używają Popoverów. Na mobile:
```tsx
// Popover zamiast być pozycjonowany, może być drawer:
{isMobile ? (
  <Drawer side="bottom">
    {content}
  </Drawer>
) : (
  <Popover>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent>{content}</PopoverContent>
  </Popover>
)}
```

---

## Kolejność implementacji

### Faza 1: Fundamenty (Priorytet: Wysoki)
1. [ ] Hook `useIsMobile`
2. [ ] `MobileWarningDialog` - dialog powitalny
3. [x] Modyfikacja layoutu w `page.tsx` - sidebar jako Drawer na mobile
4. [ ] `MobileSidebarTrigger` - przycisk toggle

### Faza 2: Toolbar i podstawowe kontrolki (Priorytet: Wysoki)
5. [ ] Przycisk Reset widoku - ukrycie tekstu na mobile
6. [ ] Toolbar sceny - większe przyciski, reorganizacja
7. [ ] Przyciski transform mode - większe touch targets

### Faza 3: Dialogi (Priorytet: Średni)
8. [ ] `CabinetTemplateDialog` - responsywne gridy
9. [ ] `ExportDialog` - uproszczenie na mobile
10. [ ] `DrawerConfigDialog` - layout pionowy
11. [ ] `FrontsConfigDialog` - responsywne presety
12. [ ] `HandlesConfigDialog` - responsywny grid
13. [ ] `InteriorConfigDialog` - tabs zamiast side-by-side
14. [ ] Pozostałe dialogi (DecorativePanels, SideFronts)

### Faza 4: Konfiguratory (Priorytet: Średni)
15. [ ] `PropertiesPanel` - większe inputy, lepszy spacing
16. [ ] Sub-komponenty config - responsywne layouty
17. [ ] Accordion triggers - większe na mobile

### Faza 5: Listy i tabele (Priorytet: Niski)
18. [ ] `PartsTable` - widok listy/kart na mobile
19. [ ] `RoomPanel` - dostosowanie jeśli potrzebne

### Faza 6: Dopracowanie (Priorytet: Niski)
20. [ ] Popovery → Drawer na mobile
21. [ ] Tooltips → aria-labels
22. [ ] Testy na różnych urządzeniach
23. [ ] Optymalizacja touch targets (min 44×44px)

---

## Uwagi techniczne

### CSS Custom Properties dla breakpointów
Można dodać do `globals.css`:
```css
:root {
  --mobile-input-height: 2.5rem; /* 40px */
  --desktop-input-height: 2rem; /* 32px */
  --mobile-button-min-size: 2.75rem; /* 44px - Apple HIG */
}
```

### Testowanie
- Chrome DevTools Device Mode
- Rzeczywiste urządzenia (iOS Safari, Android Chrome)
- Testy touch events
- Testy z różnymi orientacjami (portrait/landscape)

### Komponent Drawer z @meble/ui
Pakiet `@meble/ui` zawiera komponent `Drawer` do wysuwanych paneli.

### Performance
- Używać `useIsMobile` z debounce dla resize
- Lazy loading dla ciężkich komponentów mobile-only
- Unikać re-renderów przy resize

---

## Podsumowanie

Plan zakłada stopniowe wprowadzanie responsywności bez zmiany istniejącego UI desktop. Główne zmiany:

1. **Dialog powitalny** - informacja o rekomendacji szerokiego ekranu
2. **Sidebar jako Drawer** - wysuwany panel zamiast stałego na mobile
3. **Większe touch targets** - min 44×44px (h-11) dla przycisków
4. **Responsywne dialogi** - pełna szerokość, pionowe layouty
5. **Uproszczone widoki** - ukrycie mniej ważnych elementów na mobile

Wszystkie zmiany wykorzystują Tailwind CSS breakpointy z podejściem mobile-first dla nowego kodu, zachowując kompatybilność z istniejącym desktop UI poprzez klasy `md:`.

---

## Status implementacji (zaktualizowano)

Wszystkie główne elementy zostały zaimplementowane:
- [x] Hook `useIsMobile` z debounce
- [x] `MobileWarningDialog` z poprawnym zapisywaniem stanu
- [x] Layout z Drawer na mobile
- [x] Touch targets 44px (h-11)
- [x] Responsywne dialogi
- [x] Responsywne konfiguratory
