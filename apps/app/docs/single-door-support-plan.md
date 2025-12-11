# Plan: wsparcie pojedynczych drzwi i kierunku otwierania

## Stan obecny
- Tworzenie szafki odbywa się w `CabinetTemplateDialog` (Sidebar → "Dodaj szafkę"): wybór typu, wymiarów, `topBottomPlacement`, półek oraz boolean `hasDoors` (kuchnia) / `doorCount` (szafa).
- `addCabinet` (store/slices/cabinetSlice.ts) wywołuje generator z `cabinetGenerators.ts`; tylko `generateKitchenCabinet` jest zaimplementowany – tworzy zawsze parę frontów z 3 mm szczeliną (role `DOOR`, index 0/1), bez informacji o zawiasach/kierunku otwierania.
- Zakładka "Właściwości" (`PropertiesPanel` + `CabinetParameterEditor`) pozwala zmieniać te same parametry co kreator; zmiana parametrów wywołuje `updateCabinetParams` i regenerację części z zachowaniem transformacji.
- W modelu danych brak pola opisującego układ drzwi (pojedyncze/podwójne) i stronę otwierania; `CabinetPartMetadata` przechowuje tylko `role` i `index`.

## Cel
- Możliwość wyboru pojedynczych frontów oraz strony otwierania (lewe/prawe) już w kreatorze.
- Te same właściwości edytowalne po fakcie w zakładce "Właściwości".
- Generatory i historia/regeneracja muszą uwzględniać nowe parametry, zachowując obecne zachowanie domyślne (podwójne drzwi).

## Plan wdrożenia
- **Model danych**
  - Rozszerzyć `KitchenCabinetParams` (i docelowo `WardrobeCabinetParams`) o np. `doorLayout: 'single' | 'double'` oraz `hingeSide: 'LEFT' | 'RIGHT'` (dla pojedynczych); dodać opcjonalny `hingeSide?: 'LEFT' | 'RIGHT'` do `CabinetPartMetadata` dla przyszłych funkcji (animacje, raporty).
  - Ustawić wartości domyślne (double/LEFT) w presetach i ewentualnym migratorze persist, aby nie złamać istniejących zapisów.
- **Kreator szafki (dialog)**
  - W `CabinetTemplateDialog`/`ParameterForm` dodać pola sterujące układem drzwi, widoczne gdy `hasDoors` (kuchnia) lub `doorCount > 0` (szafa): przełącznik single/double oraz select "Strona otwierania" (aktywne tylko przy single).
  - Przekazać nowe parametry do `addCabinet`; zaktualizować `CABINET_PRESETS`.
- **Generatory części**
  - W `generateKitchenCabinet` rozgałęzić tworzenie frontów: single front = pełna szerokość (z `FRONT_MARGIN`, bez `DOOR_GAP`), pozycja przesunięta do zawiasu `hingeSide`; double front = dotychczasowe zachowanie; zapisywać `cabinetMetadata.index` i `hingeSide`.
  - Przy okazji zacząć implementację `generateWardrobe` z obsługą `doorLayout`/`doorCount` (np. 1 single lub N równych skrzydeł) i analogicznego metadanych.
- **Edycja w "Właściwości"**
  - Rozszerzyć `CabinetParameterEditor` o kontrolki układu drzwi i strony otwierania z potwierdzeniem regeneracji; ukrywać/wyłączać gdy brak drzwi.
  - Zapewnić, że `updateCabinetParams` otrzymuje pełne `CabinetParams` z nowymi polami (typy, tłumaczenia w `messages/pl.json`/`en.json`).
- **Historia/duplikacja**
  - Upewnić się, że snapshoty w historii (`CabinetRegenerationSnapshot`, `CabinetSnapshot`) zawierają nowe pola; duplikacja kopiuje `hingeSide` w `cabinetMetadata`.
- **Testy/weryfikacja**
  - Jednostkowe: generator single vs double (szerokości, pozycje, gap), poprawne `cabinetMetadata`; aktualizacja parametrów regeneruje z zachowaniem transformacji.
  - Manualne: ścieżka kreatora (wybór single + strona), edycja w "Właściwości", undo/redo po zmianie układu drzwi.
