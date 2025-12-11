# Historia edycji w `apps/app`

## Jak teraz działa store
- Zustand z `persist` (`meblarz-storage`, version 2, localStorage) składa się z wielu sliców w `src/lib/store/slices` (selection/materials/furniture/parts/cabinet/collision) spiętych w `src/lib/store/index.ts`; każdy `set` zapisuje cały store.
- Mutacje na częściach: `addPart`, `updatePart` (używana też przy transformach), `removePart`, `duplicatePart`; na szafkach: `addCabinet`, `updateCabinet`, `updateCabinetParams`, `removeCabinet`, `duplicateCabinet`.
- `updatePart` leci także per-frame podczas drag/rotate (dużo `set` + zapisów `persist`), kolizje uruchamiane debounced po mutacjach.
- `setIsTransforming` i `setTransformMode` sterują OrbitControls.
- Brak historii; undo/redo muszą być lekkie, serializowalne i nie mogą znacząco zwiększyć kosztu `persist`.

## Założenia
- Historia zapisuje **transakcje/delty**, nie snapshoty całego store.
- Jedno realne działanie użytkownika = jeden wpis (np. cały drag/rotate, cały add, cały delete).
- Transform/rotate/scale zapisywane tylko na **commit** po zakończeniu przeciągania (mouseup/touchend) – żadnych wpisów per frame.
- Undo/redo ma działać zarówno na pojedynczych częściach, jak i szafkach (regenerowanych).
- Stosy powinny mieć limit (liczba wpisów lub szacowany rozmiar w bajtach) i czyszczenie redo po nowej akcji.
- Dla wydajności historia może być persisted, ale z twardym limitem (100 kroków) i kompaktowaniem wpisów, żeby nie zalewać localStorage przy każdym `set`.
- Chcemy móc wyświetlić timeline: lista operacji z typem, opisem i datą (godzina, jeśli dziś), pozwalając na skok do konkretnego wpisu lub przesuwanie suwaka.
- Poza 100 ostatnimi krokami trzymamy do 10 **milestones** (większe zmiany) z przyszłości/odległej przeszłości, żeby dało się cofnąć się do ważnych punktów mimo obcięcia zwykłych kroków.

## Architektura: `historySlice` w `src/lib/store`
- Dodaj osobny slice `createHistorySlice` w `src/lib/store/slices/historySlice.ts` i podepnij w `src/lib/store/index.ts` obok pozostałych sliców (`StateCreator<StoreState, StoreMutators, [], HistorySlice>`).
- Stan slice: `undoStack`, `redoStack`, `milestoneStack`, `inFlightBatch`, `limit` (100), `milestoneLimit` (10), `approxByteSize`; pochodne selektory `canUndo`, `canRedo`.
- Akcje publiczne: `beginBatch(type, meta)`, `commitBatch(afterState)`, `cancelBatch()`, `undo()`, `redo()`, `pushEntry(entry)` (dla akcji atomowych), `clearHistory()`, `jumpTo(entryId)` (dla timeline), `setTimelineCursor(entryId|null)` (opcjonalnie w UI). Dodaj helper `runWithHistory(entryBuilder, mutator)` żeby inne slicy mogły nagrywać wpisy bez duplikacji logiki.
- Persist: wersja store v3 + `partialize`, która usuwa funkcje, ale **zostawia** stosy (dzięki limitom). Migracja v2→v3 startuje z pustą historią. Stosy skracane po każdym dopisie; milestoneStack trzyma tylko wpisy z flagą `isMilestone`.
- Konfiguracja w constants, np. `src/lib/store/history/constants.ts`: `HISTORY_MAX_LENGTH = 100`, `HISTORY_MAX_MILESTONES = 10`, `HISTORY_MAX_SIZE_BYTES = 10_000_000` (opcjonalny twardy limit), `HISTORY_PERSIST_VERSION = 3`.

## Model wpisu (serializowalny)
- `type`: `'ADD_PART' | 'REMOVE_PART' | 'UPDATE_PART' | 'TRANSFORM_PART' | 'DUPLICATE_PART' | 'ADD_CABINET' | 'REMOVE_CABINET' | 'UPDATE_CABINET' | 'REGENERATE_CABINET' | 'SELECTION' | 'MILESTONE' | ...'`.
- `targetId`/`targetIds`, `furnitureId`/`cabinetId` dla kontekstu.
- `before` / `after`: **tylko zmienione pola**; dla add/delete pełny obiekt + pozycja w tablicy, dla update/transform minimalne pola (pozycja, rotacja, wymiary, materiał).
- `meta`: `id`, `timestamp`, `label` (do listy operacji), `batchingId`, `isMilestone?`, `kind` (np. `'geometry' | 'material' | 'cabinet' | 'selection' | 'misc'`) do grupowania na timeline.

## Flow transakcji
- **Akcje atomowe** (add/delete/duplicate/cabinet add/remove): po wykonaniu mutacji budujemy wpis `before/after` i wrzucamy na `undoStack`, czyścimy `redoStack`.
- **Transform/rotate/scale**:  
  - `beginBatch('TRANSFORM_PART', { partId, before: pickTransform(part) })` wywoływane przy `pointerdown`; trzymamy `inFlightBatch`.
  - UI nadal wywołuje `updatePart` na każdy frame bez dotykania historii.  
  - Na `pointerup` pobieramy aktualny part, `commitBatch({ after: pickTransform(part) })` → 1 wpis w `undoStack`. Jeśli brak zmiany, batch jest pomijany.
- **UpdateCabinet/Regeneracja**: przed regeneracją zachować stare `parts` (pełne) + `cabinet`; po commitcie zapisać `after` (nowe partIds + params/materials). Undo powinno przywracać stare części i ID szafki (lub mapę staryId→nowyId).
- **Redo/undo efekt uboczny**: po każdej operacji zawołać `triggerDebouncedCollisionDetection`.

## Integracje w store (slicy)
- PartsSlice: wewnątrz `addPart/removePart/duplicatePart` i finalnych update'ów wołać helper z historii; `updatePart` używane per-frame nie zapisuje historii, historię transformu zamykamy tylko przy `commitBatch`.
- CabinetSlice: `add/update/updateCabinetParams/remove/duplicate` pakują delty do historii; przy regeneracji trzymać mapę staryId→nowyId oraz pełne części potrzebne do odtworzenia.
- Selection/transform: komponent drag/rotate wywołuje `beginBatch`/`commitBatch`; `setIsTransforming` i flagi transformu pozostają bez wpisów.
- CollisionSlice: po `undo/redo` wołać `triggerDebouncedCollisionDetection`; kolizji nie zapisujemy w historii.
- Unikamy zależności wstecznych między slicami: każdy slice korzysta z API historii przez `get()` lub eksportowany helper, bez importowania innych sliców.
- Dla `duplicatePart`/`addPart` zapisujemy cały obiekt nowej części; dla `removePart` pełen obiekt i indeks w kolekcji + ewentualne `cabinetMetadata`. Przy zmianach materiałów/cabinet params przechować parametry i listę wygenerowanych `partIds`; przy undo/redo zrekonstruować deterministycznie (można zapisać pełne części, bo to mały zbiór).

## Skróty klawiszowe
- `mod+z` (cmd/ctrl) → `undo`, `mod+shift+z` i `mod+y` → `redo`. Blokować w polach tekstowych, ignorować auto-repeat. Dodać globalny listener w warstwie UI lub dedykowany hook.
- Toolbar/menu: przyciski Undo/Redo z disabled na podstawie `canUndo`/`canRedo`.

## Performance i limity
- Limity: `undoStack` max 100, `milestoneStack` max 10, opcjonalnie twardy limit rozmiaru JSON (np. 10MB). Przy overflow: najpierw drop najstarsze zwykłe wpisy, milestone’y przesuwaj do osobnego stosu lub dropuj najstarsze milestone’y po przekroczeniu limitu 10.
- Transformy zapisują tylko wektory `position`/`rotation`/`scale` jako tablice liczb (runtime może trzymać `Float32Array`, ale do persist plain array). Nie kopiować całych parts/cabinets przy zwykłych update'ach.
- Minimalizacja transakcji: pickuj tylko zmienione pola (`pickTransform`, `pickMaterialChange`, `pickCabinetParamsDelta`), unikaj `structuredClone` na całym obiekcie; dla parts wybieraj subset (`position`, `rotation`, `scale?`, `materialId`, `shapeParams`), dla cabinet params trzymaj tylko `params/materials/topBottomPlacement` i mapę `oldPartId→newPartId` przy regeneracji.
- Persist: mimo włączenia, utrzymuj małe wpisy; rozważ kompresję dat do ISO string i integer timestamp, bez funkcji/klas. Przy `set` stale skracaj stosy przed zapisaniem do storage.
- Timeline: przechowuj `meta.timestamp` i `meta.label` do renderu; formatowanie czasu (HH:MM dla dzisiaj, data dla wcześniejszych) po stronie UI.
- UI selektory (`canUndo`/`canRedo`, `historyEntries`) korzystają z płytkich selektorów, żeby nie rerenderować reszty sceny.

## Kroki implementacji
1) Rozszerzyć `ProjectState` o pola historii i typ `HistoryEntry`; dodać `HistorySlice` do `store/types.ts` i `ProjectState`.  
2) Podnieść wersję `persist` do v3 z migracją (puste stosy) i `partialize` wyrzucającym funkcje, ale zostawiając stosy; dodać constants z limitami (100/10).  
3) Dodać `createHistorySlice` z API batch/atom/undo/redo/jumpTo + helper `runWithHistory`; wpiąć do `create` w `src/lib/store/index.ts`.  
4) Owinąć akcje w `partsSlice` i `cabinetSlice` w nagrywanie historii; dodać hooki dla komponentu drag/rotate (`beginBatch`/`commitBatch`).  
5) Dodać skróty klawiszowe oraz UI do Undo/Redo i timeline (lista + slider) na bazie `meta.label/kind/timestamp`; selektory `canUndo/canRedo/historyEntries`.  
6) Testy jednostkowe: transform batching, delete->undo->redo, regeneracja szafki (części i parametry), overflow limit (100/10), redo po nowej akcji, migracja v2→v3 (historia czyszczona), jumpTo po timeline.  
7) (Opcja) Log UI na bazie `meta` z historii i wyróżnienie milestone’ów.
