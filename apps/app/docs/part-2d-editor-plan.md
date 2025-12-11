# Plan: edytor przekrojów 2D dla części

## Kontekst aplikacji
- Tech: Next.js (App Router), TS, Tailwind/shadcn (`@meble/ui`), R3F (`Scene`, `Part3D`), Zustand z `persist`.
- Dane: `Part` ma `shapeType` + `shapeParams`, a `partsSlice.updatePart` przelicza `width/height` z `shapeParams`; `depth` = grubość materiału.
- Render 3D: `Part3D.tsx` używa obecnie `boxGeometry` niezależnie od kształtu → brak realnego odwzorowania formy w 3D.
- UI: lista części w `PartsTable`, edycja pól liczbowych w `PropertiesPanel`; brak edytora 2D ani wejścia z listy; teksty w `messages/*.json`.

## Cele i zakres
- Każda część ma ikonę „edytuj przekrój 2D” w liście (oraz przycisk w panelu właściwości).
- Pełnoekranowy dialog z edytorem 2D (siatka, snapping, manipulacja wierzchołkami, lokalne undo/redo) przykrywający resztę aplikacji.
- Po zapisie: aktualizacja `shapeParams` → nowa geometria 3D, historia/kolizje zachowane, eksport CSV nadal poprawny.
- Obsługa wszystkich `shapeType`: `RECT`, `TRAPEZOID`, `L_SHAPE`, `POLYGON` z walidacją kształtu.

## Wymagania UX
- Dialog blokuje tło, focus trap, zamykanie: Zapisz/Anuluj/ESC (z potwierdzeniem przy braku zapisu).
- Widok 2D (SVG/canvas) z siatką w mm, zoom/pan, narzędzia: zaznacz, przesuwanie wierzchołków, dodawanie/usuwanie punktów (polygon), reset widoku.
- Panel właściwości: pola liczbowe dla wymiarów/skosu, podgląd materiału/grubości (extrude depth), informacje o wymiarach bounding box.
- Ostrzeżenie dla części z `cabinetMetadata` (regeneracja może nadpisać); opcja „odłącz od szafki” przed edycją lub edytuj mimo ostrzeżenia.

## Plan implementacji
### 1) Model i utils geometrii
- Dodać `apps/app/src/lib/geometry/shape2d.ts`: konwersja `ShapeParams -> THREE.Shape`, generowanie punktów do SVG, obliczanie bounding box (origin w (0,0), oś X w prawo, Y w górę), normalizacja (translacja do 0,0).
- Walidacja: dodatnie wymiary, min. 3 punkty dla polygon, zamknięta pętla, wykrywanie samoprzecięć (prosta funkcja przecięcia odcinków z tolerancją ~0.1mm).
- Mapper piksele↔mm dla canvasa (scale, pan), helper do snapowania do siatki.

### 2) Store i historia
- W `partsSlice.updatePart` upewnić się, że nowe `shapeParams` z utili zawsze aktualizują `width/height`; dla nierect w razie potrzeby ustaw `edgeBanding` na `GENERIC`.
- Dodać slice/UI state (np. `shapeEditorSlice`): `shapeEditorPartId`, `draftShapeParams`, akcje `openShapeEditor(id)`, `closeShapeEditor()`, `setShapeDraft(...)`.
- Historia: edycje z dialogu zapisane jako pojedynczy `UPDATE_PART` (`meta.kind='geometry'`) via `beginBatch/commitBatch` żeby drag wielu punktów nie spamował historii.

### 3) Render 3D z geometrii 2D
- W `Part3D.tsx` użyć utila `shapeParams -> Shape` + `ExtrudeGeometry` (depth = `part.depth`, bevel=0); fallback do box gdy walidacja się nie powiedzie.
- Ustalić orientację: shape leży w płaszczyźnie XY, extrude na Z; istniejące `rotation` definiuje ustawienie w scenie. Wycentrować geometrię względem środka bounding box (dopasować do `position`).
- Zachować podświetlenia/`Edges` na nowej geometrii; dodać memo key zależny od `shapeType`/`shapeParams`/`depth`.

### 4) Punkty wejścia UI
- `PartsTable`: przy każdym wierszu części dodać ikonę (np. `PencilLine`) otwierającą edytor; `stopPropagation` by nie zmieniać selekcji; tooltip „Edytuj przekrój 2D”.
- `PropertiesPanel`: przy sekcji kształtu dodać przycisk „Edytuj w 2D”; disabled gdy brak części.
- Zapewnienie, że otwarcie ustawia/utrzymuje `selectedPartId` dla spójności z edycją.

### 5) Komponent dialogu edytora 2D
- Nowy `apps/app/src/components/shape-editor/ShapeEditorDialog.tsx` montowany w `app/page.tsx` (poziom root, wysoki `z-index`). Wykorzystać `Dialog` z `@meble/ui` w wariancie pełnoekranowym.
- Layout: lewa kolumna canvas (SVG + overlay uchwyty), prawa kolumna panel narzędzi (shape type, lista punktów z polami X/Y, toggle siatka/snap, lokalne undo/redo, CTA `Zapisz`/`Anuluj`).
- Interakcje: drag punktów z throttlingiem, dodawanie/usuwanie punktów (polygon), reset widoku, `Shift` = snap do siatki, scroll = zoom, drag tła = pan. Podgląd wymiarów i aktualnej grubości materiału.
- Kształty parametryczne: RECT/TRAPEZOID/L_SHAPE mogą mieć szybkie suwaki/inputs; przycisk „Konwertuj do wielokąta” dla niestandardowych wycięć.

### 6) Walidacja i zapis
- Na `Zapisz`: walidacja utili; błędy jako lista w dialogu (np. „Kształt musi być zamknięty”, „Samoprzecięcie między punktami 2-3”).
- Sukces: `updatePart(part.id, { shapeType, shapeParams: normalized })` + `closeShapeEditor`; kolizje wywoływane przez `updatePart`. Dla `cabinetMetadata` pokazać confirm „edytuj mimo / odłącz od szafki (clear metadata)”.
- Zachować `edgeBanding` jeśli kompatybilne, inaczej wymusić `GENERIC` i poinformować użytkownika w dialogu.

### 7) I18n i dostępność
- Dodać teksty do `apps/app/src/messages/pl.json` i `en.json` (etykiety narzędzi, komunikaty walidacji, tooltipy).
- Focus trap i aria-labele dla przycisków ikonowych; Escape zamyka tylko po potwierdzeniu utraty zmian.

### 8) Testy i QA
- Unit: konwersja/normalizacja/validacja w `shape2d`, aktualizacja `width/height` w `updatePart`, fallback dla niepoprawnej geometrii.
- Integration: render `Part3D` dla wszystkich `shapeType` (extrude), sprawdzenie że `PartsTable` otwiera dialog bez utraty selekcji, zapisy w historii są pojedyncze.
- Manual: edycja polygonu z wieloma punktami, cofnij/powtórz, część z `cabinetMetadata` (odłącz vs edytuj mimo), eksport CSV po zmianach `shapeParams`.

## Ryzyka i mitigacje
- Wydajność: throttling drag events + memoization canvasa; unikać zapisu w store na każdy pixel (przechowywać draft lokalnie).
- Precyzja: operować w mm, w walidacji tolerancja 0.1mm dla porównań.
- Kolizje: bounding box pozostaje uproszczeniem dla nietypowych kształtów; akceptowalne na start, później można obliczać obwiednię z geometrii.
