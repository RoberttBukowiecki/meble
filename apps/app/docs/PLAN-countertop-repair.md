# Plan naprawy funkcjonalności Countertop

## Stan aktualny

### Co jest zaimplementowane:

- ✅ Typy i model danych (`types/countertop.ts` - 460+ linii)
- ✅ Logika domenowa (`lib/domain/countertop/index.ts` - 796 linii)
- ✅ Store slice z CRUD, historią, eksportem CSV
- ✅ Renderowanie 3D (`CountertopPart3D.tsx`)
- ✅ Detekcja przyległych szafek i layoutu
- ✅ Obsługa gap (BRIDGE/SPLIT)
- ✅ Panel UI (CountertopPanel z SegmentTable, CncOperationsSection, CornerTreatmentSection, GapSection)
- ✅ Podstawowy diagram 2D (CountertopLayoutDiagram)

### KRYTYCZNE PROBLEMY ARCHITEKTONICZNE (wykryte w głębokiej analizie):

#### 🔴 KRYTYCZNY: 3D ignoruje wymiary z domeny

**Plik:** `CountertopPart3D.tsx:170-197`

- Komponent 3D **NIE używa** `segment.length` i `segment.width`
- Zamiast tego **PRZELICZA** wymiary z parametrów szafek
- **Bridge gaps są ignorowane** w 3D
- **Efekt:** Użytkownik edytuje wymiary w UI, ale wizualizacja 3D tego nie pokazuje!

#### 🔴 KRYTYCZNY: Usunięcie szafki nie regeneruje blatów

**Plik:** `cabinetSlice.ts:527-560`

- Gdy usuniesz szafkę z grupy, blat NIE jest regenerowany
- Pozostałe szafki mogą nie być przyległe, ale wciąż są w jednej grupie

#### 🟠 WAŻNY: Hardcoded wartości w UI

**Plik:** `CountertopPanel.tsx:237-245`

- Grubości 28/38/40 mm hardcoded zamiast z `config.ts`
- Brak walidacji materiału przed aktualizacją

#### 🟠 WAŻNY: Brak obsługi błędów

- Eksport CSV nie pokazuje błędu gdy się nie powiedzie
- Silent failures przy walidacji CNC operations

### Co wymaga naprawy/uzupełnienia:

- ❌ **[KRYTYCZNE]** 3D musi używać `segment.length/width` zamiast przeliczać
- ❌ **[KRYTYCZNE]** Regeneracja po usunięciu szafki
- ❌ Brak synchronizacji z ruchami szafek (powiadomienia)
- ❌ Diagram 2D niekompletny (brak miter cuts, joint lines, interaktywności)
- ❌ Brak wizualnego pickera pozycji dla CNC
- ❌ Niespójność między cabinet-level config a group-level config
- ❌ Brak UI do wyboru typu połączenia (joint)
- ❌ Hardcoded wartości w UI

---

## Założenia biznesowe do dopracowania

### 1. Tryb pracy: Hybrydowy

- Auto-detekcja przy dodaniu szafki kuchennej
- Możliwość ręcznej korekty grup
- Możliwość separacji pojedynczej szafki od grupy (`excludeFromGroup`)

### 2. Obsługiwane layouty: I, L, U (+ ISLAND/PENINSULA pozostają)

- **STRAIGHT** (I): Pojedyncza linia szafek
- **L_SHAPE**: Dwa segmenty pod kątem 90°
- **U_SHAPE**: Trzy segmenty tworzące U
- **ISLAND/PENINSULA** - pozostają w typach (mogą być użyte w przyszłości)

### 3. Synchronizacja z szafkami: Powiadomienie

- Gdy szafka w grupie zostanie przesunięta/zmieniona → alert w UI
- Przycisk "Aktualizuj blat" do ręcznego odświeżenia
- Nie auto-regeneracja (może nadpisać ręczne zmiany)

### 4. Priorytet UI: Interaktywny diagram 2D

- Schematyczny widok z góry (SVG)
- Klikalne segmenty, narożniki, operacje CNC
- Wizualizacja miter cuts dla L/U-shape
- Linie połączeń (joints) z możliwością zmiany typu

---

## Krytyczne problemy do naprawy

### 🔴 Problem 1: 3D ignoruje wymiary segmentu (NAJWAŻNIEJSZY!)

**Stan**: `CountertopPart3D.tsx` nie używa `segment.length` i `segment.width`. Przelicza wymiary od nowa z parametrów szafek, ignorując:

- Ręczne edycje wymiarów użytkownika
- Bridge gaps (przerwy między szafkami)

**Dowód** (`CountertopPart3D.tsx:170-197`):

```typescript
// OBECNY KOD - ŹLE!
let totalLocalWidth = 0;
for (const cabinet of segmentCabinets) {
  totalLocalWidth += params.width; // Przelicza zamiast użyć segment.length
}
```

**Rozwiązanie**:

```typescript
// POPRAWNY KOD
const countertopWidth = segment.length; // Użyj zapisanych wymiarów
const countertopDepth = segment.width; // z modelu domeny
```

**Pliki**:

- `components/canvas/CountertopPart3D.tsx` - użyć segment.length/width bezpośrednio

### 🔴 Problem 2: Usunięcie szafki nie regeneruje blatów

**Stan**: `cabinetSlice.ts:527-560` - gdy usuwasz szafkę, blat jest tylko "przycinany" (filtrowane segmenty), ale pozostałe szafki NIE są sprawdzane czy są nadal przyległe.

**Efekt**: Jeśli masz szafki A-B-C w jednej grupie i usuniesz B, zostają A i C ale wciąż w jednej grupie mimo że nie są przyległe!

**Rozwiązanie**:

- Po usunięciu szafki wywołać `generateCountertopsForFurniture()` dla furniture
- To wykryje nowe grupy przyległości

**Pliki**:

- `lib/store/slices/cabinetSlice.ts` - w `removeCabinet()` dodać regenerację

### 🟠 Problem 3: Brak reakcji na zmiany w szafkach

**Stan**: Gdy użytkownik przesuwa szafkę, blat regeneruje się z debounce, ALE:

- Użytkownik nie wie że blat jest "nieaktualny"
- Regeneracja może nadpisać ręczne zmiany wymiarów

**Rozwiązanie**:

- Dodać flagę `isOutdated: boolean` do `CountertopGroup`
- Alert "Blat wymaga aktualizacji" zamiast auto-regeneracji
- Przycisk "Odśwież" z ostrzeżeniem że nadpisze ręczne zmiany

**Pliki**:

- `lib/store/slices/countertopSlice.ts` - dodać `isOutdated`
- `components/panels/CountertopPanel/CountertopPanel.tsx` - alert UI

### 🟠 Problem 4: Hardcoded wartości w UI

**Stan**: Grubości 28/38/40 mm są hardcoded w JSX.

**Rozwiązanie**:

- Użyć `COUNTERTOP_THICKNESS_OPTIONS` z `config.ts:1197-1204`
- Dodać walidację materiału przed aktualizacją

**Pliki**:

- `components/panels/CountertopPanel/CountertopPanel.tsx` - import z config

### 🟠 Problem 5: Niekompletny diagram 2D

**Stan**: Podstawowy diagram bez miter cuts, joint visualization, interaktywności.

**Rozwiązanie** (fazy z PLAN-countertop-2d-editor.md):

1. Miter cut visualization - segment jako polygon, nie rectangle
2. Joint lines między segmentami z ikonami typów
3. Interaktywność - click handlers dla segmentów, narożników, CNC

**Pliki**:

- `components/countertop/CountertopLayoutDiagram/SegmentShape.tsx` - polygon path
- `components/countertop/CountertopLayoutDiagram/JointLine.tsx` - nowy komponent

### 🟡 Problem 6: Brak obsługi błędów

**Stan**: Silent failures gdy:

- Export CSV się nie powiedzie
- Walidacja CNC position fails

**Rozwiązanie**:

- Dodać toast notifications dla błędów
- Walidować przed wywołaniem store actions

**Pliki**:

- `components/panels/CountertopPanel/CountertopPanel.tsx`
- `components/panels/CountertopPanel/CncOperationsSection.tsx`

---

## Plan implementacji (priorytety)

### 🔴 Faza 1: Naprawić 3D rendering (KRYTYCZNE - bez tego UX jest zepsuty)

1. **CountertopPart3D.tsx** - użyć `segment.length` i `segment.width` bezpośrednio
2. Usunąć logikę przeliczania wymiarów z parametrów szafek
3. Pozycjonowanie pozostaje na podstawie cabinet bounds (to jest OK)
4. Przetestować z bridge gaps - powinny być widoczne

### 🔴 Faza 2: Naprawić usuwanie szafek

1. **cabinetSlice.ts** - w `removeCabinet()` po usunięciu szafki:
   - Sprawdzić czy była w grupie countertop
   - Jeśli tak: `generateCountertopsForFurniture()` dla furniture
2. To automatycznie rozwiąże problem rozłączonych grup

### 🟠 Faza 3: Synchronizacja z szafkami (powiadomienia) - WYŁĄCZYĆ AUTO-REGEN

1. Dodać `isOutdated: boolean` do `CountertopGroup` type
2. **USUNĄĆ** `triggerDebouncedCountertopRegeneration()` z cabinetSlice
3. Zamiast auto-regeneracji: `markGroupAsOutdated(groupId)`
4. Alert "Blat wymaga aktualizacji" w CountertopPanel (żółty banner z ikoną warning)
5. Przycisk "Odśwież wymiary" który:
   - Pokazuje warning modal: "Ręczne zmiany wymiarów zostaną nadpisane"
   - Wywołuje `regenerateCountertopGroup()`
6. Przy regeneracji zachowywać: CNC operations (positions recalculated proportionally), edge banding, corner treatments

### 🟠 Faza 4: Usprawnienie diagramu 2D (priorytet user)

1. SegmentShape z polygon path (miter cuts)
2. JointLine component z joint type icons
3. Click handlers na wszystkich elementach
4. Gap indicators w diagramie
5. Integracja z panel state (selected segment syncs)

### 🟡 Faza 5: UI cleanup

1. Użyć `COUNTERTOP_THICKNESS_OPTIONS` z config.ts
2. Dodać walidację materiału
3. Toast notifications dla błędów (CSV export, CNC validation)
4. Joint Type UI (dropdown w panelu gdy >1 segment)

### 🟡 Faza 6: Czyszczenie kodu countertop

**Cel:** Optymalizacja rozmiaru plików, logiczny podział kodu, usunięcie nieużywanych fragmentów

1. **`lib/domain/countertop/index.ts` (796 linii!)** - za duży plik:
   - Wydzielić creators do `creators.ts`
   - Wydzielić updaters do `updaters.ts`
   - Wydzielić calculators do `calculators.ts`
   - Zostawić w index.ts tylko reeksporty

2. **`CountertopPart3D.tsx` (348 linii)** - po naprawie sprawdzić:
   - Usunąć zduplikowaną logikę wymiarów (już niepotrzebna po Fazie 1)
   - Wydzielić `createCountertopShape()` do osobnego pliku `countertopGeometry.ts`

3. **Usunięcie nieużywanego kodu:**
   - Przejrzeć wszystkie countertop-related pliki
   - Usunąć zakomentowany kod
   - Usunąć nieużywane importy
   - Usunąć funkcje bez referencji

4. **`types/countertop.ts` (460 linii)** - przejrzeć:
   - Czy wszystkie typy są używane?
   - Usunąć nieużywane interfejsy
   - Dodać JSDoc komentarze do głównych typów

5. **Konsolidacja helpers:**
   - `lib/domain/countertop/helpers.ts` - upewnić się że nie ma duplikatów z `index.ts`
   - Sprawdzić czy `getCabinetBounds()` jest w jednym miejscu

6. **Panel components** - przejrzeć rozmiary:
   - `CountertopPanel.tsx` - czy nie jest za duży? Czy można wydzielić sekcje?
   - Sprawdzić czy każdy subkomponent ma sens

---

## Pliki do modyfikacji

### Faza 1 (KRYTYCZNE)

| Plik                                     | Zmiana                                         |
| ---------------------------------------- | ---------------------------------------------- |
| `components/canvas/CountertopPart3D.tsx` | Użyć `segment.length/width` zamiast przeliczać |

### Faza 2 (KRYTYCZNE)

| Plik                               | Zmiana                                       |
| ---------------------------------- | -------------------------------------------- |
| `lib/store/slices/cabinetSlice.ts` | W `removeCabinet()` dodać regenerację blatów |

### Faza 3 (Synchronizacja - wyłączyć auto-regen)

| Plik                                                    | Zmiana                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `types/countertop.ts`                                   | Dodać `isOutdated: boolean` do CountertopGroup                                          |
| `lib/store/slices/countertopSlice.ts`                   | Dodać `markGroupAsOutdated()`, `clearOutdatedFlag()`                                    |
| `lib/store/slices/cabinetSlice.ts`                      | USUNĄĆ `triggerDebouncedCountertopRegeneration()`, zamiast tego `markGroupAsOutdated()` |
| `lib/store/utils.ts`                                    | Usunąć `COUNTERTOP_REGENERATION_DEBOUNCE_MS` i debounce funkcję                         |
| `components/panels/CountertopPanel/CountertopPanel.tsx` | Alert banner "Wymaga aktualizacji", przycisk "Odśwież wymiary" z warning modal          |

### Faza 4 (Diagram 2D)

| Plik                                                                        | Zmiana                    |
| --------------------------------------------------------------------------- | ------------------------- |
| `components/countertop/CountertopLayoutDiagram/SegmentShape.tsx`            | Polygon path z miter cuts |
| `components/countertop/CountertopLayoutDiagram/JointLine.tsx`               | Nowy komponent            |
| `components/countertop/CountertopLayoutDiagram/utils.ts`                    | calculateMiterCut()       |
| `components/countertop/CountertopLayoutDiagram/CountertopLayoutDiagram.tsx` | Click handlers            |

### Faza 5 (UI cleanup)

| Plik                                                         | Zmiana                                          |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `components/panels/CountertopPanel/CountertopPanel.tsx`      | Użyć COUNTERTOP_THICKNESS_OPTIONS, toast errors |
| `components/panels/CountertopPanel/CncOperationsSection.tsx` | Validation feedback                             |
| `components/panels/CountertopPanel/JointTypeSection.tsx`     | Nowy komponent (opcjonalnie)                    |

### Faza 6 (Czyszczenie kodu)

| Plik                                     | Zmiana                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/domain/countertop/index.ts`         | Rozbić na: creators.ts, updaters.ts, calculators.ts                              |
| `lib/domain/countertop/creators.ts`      | NOWY - createSegment, createGroup, createCncOperation, createCorner, createJoint |
| `lib/domain/countertop/updaters.ts`      | NOWY - update\* funkcje                                                          |
| `lib/domain/countertop/calculators.ts`   | NOWY - detect*, calculate* funkcje                                               |
| `components/canvas/CountertopPart3D.tsx` | Wydzielić createCountertopShape do countertopGeometry.ts                         |
| `lib/countertopGeometry.ts`              | NOWY - createCountertopShape, createRoundedRectPath                              |
| `types/countertop.ts`                    | Usunąć nieużywane typy, dodać JSDoc                                              |
| Wszystkie countertop pliki               | Usunąć zakomentowany kod, nieużywane importy                                     |

---

## Definicja sukcesu

### Po Fazie 1-2 (KRYTYCZNE):

1. ✅ Edycja wymiarów segmentu w UI zmienia wizualizację 3D
2. ✅ Bridge gaps są widoczne w 3D (blat jest szerszy gdy gaps są w trybie BRIDGE)
3. ✅ Usunięcie szafki ze środka grupy A-B-C tworzy dwie osobne grupy (A i C)

### Po Fazie 3:

4. ✅ Użytkownik widzi alert "Blat wymaga aktualizacji" gdy przesunie szafkę
5. ✅ Przycisk "Odśwież" regeneruje blat zachowując CNC/edge banding

### Po Fazie 4:

6. ✅ Diagram 2D pokazuje miter cuts dla L-shape
7. ✅ Kliknięcie w diagram wybiera element w panelu
8. ✅ Gap indicators widoczne w diagramie z możliwością zmiany trybu

### Po Fazie 5:

9. ✅ Toast pokazuje błąd gdy eksport CSV się nie powiedzie
10. ✅ Grubości blatów pobierane z config, nie hardcoded

### Po Fazie 6 (Czyszczenie):

11. ✅ `lib/domain/countertop/index.ts` < 100 linii (tylko reeksporty)
12. ✅ Brak zduplikowanej logiki między domain a 3D component
13. ✅ Brak zakomentowanego kodu w plikach countertop
14. ✅ Wszystkie główne typy mają JSDoc komentarze
15. ✅ Brak nieużywanych funkcji/typów (można sprawdzić przez IDE)
