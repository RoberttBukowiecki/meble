# Brakujące akcje w systemie historii

## Podsumowanie

System historii został zaimplementowany, ale **wiele kluczowych operacji nie jest zapisywanych**. Poniżej lista wszystkich brakujących akcji wraz z ich priorytetem.

---

## ❌ Operacje na częściach (Parts)

### 🔴 KRYTYCZNE - `updatePart` nie zapisuje historii!

**Problem:** Metoda `updatePart` przyjmuje parametr `skipHistory` ale **w ogóle nie zapisuje historii**, nawet gdy `skipHistory=false`!

**Dotyczy:**
- ✅ Zmiana nazwy części
- ✅ Zmiana materiału
- ✅ Zmiana wymiarów (shape parameters)
- ✅ Zmiana edge banding
- ✅ Ręczna zmiana pozycji (przez input)
- ✅ Zmiana grupy (jeśli istnieje w UI)
- ✅ Zmiana notatek

**Aktualny kod:**
```typescript
updatePart: (id: string, patch: Partial<Part>, skipHistory = false) => {
  set((state) => {
    // ... zmiana stanu
    return { parts: newParts };
  });

  // ❌ BRAK ZAPISU HISTORII!
  triggerDebouncedCollisionDetection(get);
}
```

**Co powinno być:**
```typescript
updatePart: (id: string, patch: Partial<Part>, skipHistory = false) => {
  const part = get().parts.find(p => p.id === id);
  if (!part) return;

  // Zapisz before state
  const before = { ...patch }; // lub pickRelevantFields(part, patch)

  set((state) => {
    // ... zmiana stanu
    return { parts: newParts };
  });

  // Zapisz do historii jeśli nie skipHistory
  if (!skipHistory) {
    const after = get().parts.find(p => p.id === id);
    get().pushEntry({
      type: 'UPDATE_PART',
      targetId: id,
      before: pickRelevantFields(part, Object.keys(patch)),
      after: pickRelevantFields(after, Object.keys(patch)),
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: getUpdateLabel(patch), // różne labele dla różnych zmian
        kind: 'geometry',
      },
    });
  }

  triggerDebouncedCollisionDetection(get);
}
```

**Wpływ:** Wszystkie ręczne edycje właściwości części nie są undo-able! ❌

---

## ❌ Operacje na szafkach (Cabinets)

### 🔴 KRYTYCZNE

#### 1. `addCabinet` - brak historii
**Status:** NIE ZAIMPLEMENTOWANE

**Co się dzieje:**
- Tworzona jest nowa szafka z częściami
- **BRAK zapisu w historii**

**Powinno być:**
```typescript
addCabinet: (furnitureId, type, params, materials, skipHistory = false) => {
  // ... tworzenie szafki i części

  if (!skipHistory) {
    get().pushEntry({
      type: 'ADD_CABINET',
      targetId: cabinetId,
      furnitureId,
      after: {
        cabinet: { ...cabinet },
        parts: [...parts],
      },
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.ADD_CABINET,
        kind: 'cabinet',
        isMilestone: true, // duża operacja
      },
    });
  }
}
```

**Wpływ:** Dodanie szafki nie jest undo-able! ❌

---

#### 2. `removeCabinet` - brak historii
**Status:** NIE ZAIMPLEMENTOWANE

**Co się dzieje:**
- Usuwana jest szafka wraz z wszystkimi częściami
- **BRAK zapisu w historii**

**Powinno być:**
```typescript
removeCabinet: (id: string, skipHistory = false) => {
  const cabinet = get().cabinets.find(c => c.id === id);
  if (!cabinet) return;

  const parts = get().parts.filter(p => cabinet.partIds.includes(p.id));
  const cabinetIndex = get().cabinets.findIndex(c => c.id === id);

  if (!skipHistory) {
    get().pushEntry({
      type: 'REMOVE_CABINET',
      targetId: id,
      furnitureId: cabinet.furnitureId,
      before: {
        cabinet: { ...cabinet, _index: cabinetIndex },
        parts: parts.map(p => ({ ...p })),
      },
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: HISTORY_LABELS.REMOVE_CABINET,
        kind: 'cabinet',
        isMilestone: true,
      },
    });
  }

  // ... usuwanie
}
```

**Wpływ:** Usunięcie szafki nie jest undo-able! ❌

---

#### 3. `duplicateCabinet` - brak historii
**Status:** NIE ZAIMPLEMENTOWANE

**Co się dzieje:**
- Duplikowana jest szafka z częściami
- **BRAK zapisu w historii**

**Powinno być:**
```typescript
duplicateCabinet: (id: string, skipHistory = false) => {
  // ... duplikacja

  if (!skipHistory) {
    get().pushEntry({
      type: 'DUPLICATE_CABINET', // nowy typ!
      targetId: newCabinetId,
      furnitureId: cabinet.furnitureId,
      after: {
        cabinet: { ...newCabinet },
        parts: newParts.map(p => ({ ...p })),
      },
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: 'Powielono szafkę',
        kind: 'cabinet',
      },
    });
  }
}
```

**Wpływ:** Duplikacja szafki nie jest undo-able! ❌

---

### 🟡 WAŻNE

#### 4. `updateCabinet` - brak historii dla prostych zmian
**Status:** CZĘŚCIOWO ZAIMPLEMENTOWANE

**Problem:**
- `updateCabinet` zapisuje historię TYLKO gdy następuje regeneracja (zmiana materiałów lub topBottomPlacement)
- **NIE zapisuje historii** dla prostych zmian (np. nazwa)

**Dotyczy:**
- ✅ Zmiana nazwy szafki
- ❌ Zmiana materiałów (obecnie przez updateCabinet z regeneracją - wymaga refaktoryzacji)

**Powinno być:**
```typescript
updateCabinet: (id, patch, skipHistory = false) => {
  const cabinet = get().cabinets.find(c => c.id === id);
  if (!cabinet) return;

  const shouldRegenerate = Boolean(patch.materials) ||
    (patch.topBottomPlacement && patch.topBottomPlacement !== cabinet.topBottomPlacement);

  if (shouldRegenerate) {
    // ... logika regeneracji z historią (JEST)
  } else {
    // Prosta zmiana (np. nazwa)
    if (!skipHistory) {
      get().pushEntry({
        type: 'UPDATE_CABINET',
        targetId: id,
        before: pickCabinetFields(cabinet, Object.keys(patch)),
        after: patch,
        meta: {
          id: generateId(),
          timestamp: Date.now(),
          label: HISTORY_LABELS.UPDATE_CABINET,
          kind: 'cabinet',
        },
      });
    }

    // ... zmiana stanu
  }
}
```

**Wpływ:** Zmiana nazwy szafki nie jest undo-able! ⚠️

---

## ✅ Co już działa

### Parts
- ✅ `addPart` - zapisuje historię
- ✅ `removePart` - zapisuje historię z indeksem
- ✅ `duplicatePart` - zapisuje historię
- ✅ `TRANSFORM_PART` - przez batch w `PartTransformControls`

### Cabinets
- ✅ `updateCabinetParams` - zapisuje historię regeneracji
- ✅ `TRANSFORM_CABINET` - przez batch w `CabinetGroupTransform`

---

## 🔵 Operacje które prawdopodobnie NIE POTRZEBUJĄ historii

### Materials
- ❌ `addMaterial` - dodawanie materiału
- ❌ `updateMaterial` - zmiana nazwy/koloru/grubości materiału
- ❌ `removeMaterial` - usuwanie materiału

**Uzasadnienie:** Materiały są globalne i rzadko zmieniane. Usunięcie materiału który jest używany powinno być blokowane, więc undo nie jest krytyczne.

**Opcjonalnie:** Można dodać historię dla `removeMaterial` jako zabezpieczenie.

---

### Furniture (Projects)
- ❌ `addFurniture` - tworzenie nowego projektu
- ❌ `removeFurniture` - usuwanie projektu (usuwa wszystkie części!)

**Uzasadnienie:** Operacje na poziomie projektów są rzadkie i destrukcyjne. Lepiej użyć dialogu potwierdzenia niż undo.

**UWAGA:** `removeFurniture` usuwa WSZYSTKIE części i szafki - może warto dodać historię jako zabezpieczenie!

---

### Selection
- ❌ `selectPart` - zmiana wybranej części
- ❌ `selectCabinet` - zmiana wybranej szafki
- ❌ `setSelectedFurniture` - zmiana projektu

**Uzasadnienie:** Selekcja nie zmienia danych, tylko stan UI. Nie wymaga undo.

---

## 📊 Priorytety implementacji

### P0 - KRYTYCZNE (musi być przed release)
1. ✅ **`updatePart` - dodać historię**
   - Najbardziej używana operacja
   - Dotyczy: nazwa, materiał, wymiary, edge banding
   - Wpływ: WYSOKI

2. ✅ **`removeCabinet` - dodać historię**
   - Destrukcyjna operacja
   - Wpływ: WYSOKI

3. ✅ **`addCabinet` - dodać historię**
   - Często używana operacja
   - Wpływ: WYSOKI

### P1 - WAŻNE (warto dodać)
4. ⚠️ **`duplicateCabinet` - dodać historię**
   - Często używana operacja
   - Wpływ: ŚREDNI

5. ⚠️ **`updateCabinet` (prosta zmiana) - dodać historię**
   - Głównie nazwa
   - Wpływ: NISKI (nazwa to drobna zmiana)

### P2 - OPCJONALNE
6. ❓ **`removeMaterial` - dodać historię jako zabezpieczenie**
7. ❓ **`removeFurniture` - dodać historię jako zabezpieczenie**

---

## 🔧 Rekomendowane zmiany w typach

### Nowe typy historii do dodania:
```typescript
export type HistoryEntryType =
  | 'ADD_PART'
  | 'REMOVE_PART'
  | 'UPDATE_PART'           // ✅ już jest
  | 'TRANSFORM_PART'        // ✅ już jest
  | 'DUPLICATE_PART'        // ✅ już jest
  | 'TRANSFORM_CABINET'     // ✅ już jest
  | 'ADD_CABINET'           // ❌ trzeba dodać obsługę w apply.ts
  | 'REMOVE_CABINET'        // ❌ trzeba dodać obsługę w apply.ts
  | 'UPDATE_CABINET'        // ✅ już jest (ale nie używane)
  | 'DUPLICATE_CABINET'     // ❌ NOWY TYP - trzeba dodać
  | 'REGENERATE_CABINET'    // ✅ już jest
  | 'SELECTION'             // ✅ już jest (nie używane)
  | 'MILESTONE';            // ✅ już jest
```

### Nowe labele:
```typescript
export const HISTORY_LABELS = {
  // ... existing
  DUPLICATE_CABINET: 'Powielono szafkę',
};
```

---

## 📝 Plan implementacji

### Krok 1: Napraw `updatePart` (KRYTYCZNE)
1. Dodaj logikę zapisu historii w `updatePart`
2. Dodaj helper `pickRelevantFields` żeby zapisywać tylko zmienione pola
3. Dodaj smart labeling (różne labele dla różnych zmian):
   - Zmiana nazwy: "Zmieniono nazwę części"
   - Zmiana materiału: "Zmieniono materiał części"
   - Zmiana wymiarów: "Zmieniono wymiary części"
   - Zmiana edge banding: "Zmieniono okleinowanie"

### Krok 2: Dodaj historię dla operacji cabinet
1. `addCabinet` - zapisz pełny snapshot
2. `removeCabinet` - zapisz pełny snapshot z indeksem
3. `duplicateCabinet` - zapisz pełny snapshot

### Krok 3: Uzupełnij `apply.ts`
1. Dodaj obsługę `ADD_CABINET` w `applyHistoryEntry`
2. Dodaj obsługę `REMOVE_CABINET` w `applyHistoryEntry`
3. Dodaj obsługę `DUPLICATE_CABINET` w `applyHistoryEntry`

### Krok 4: Testy
1. Test: zmiana nazwy części → undo → redo
2. Test: zmiana materiału części → undo → redo
3. Test: zmiana wymiarów → undo → redo
4. Test: dodanie szafki → undo → redo
5. Test: usunięcie szafki → undo → redo
6. Test: duplikacja szafki → undo → redo

---

## ⚠️ Uwagi techniczne

### 1. Wydajność
- `updatePart` jest wywoływana BARDZO często (przy każdej zmianie wymiarów w input)
- Rozważyć debouncing dla zmian wymiarów:
  ```typescript
  // Opcja 1: Debounce w komponencie (lepsze)
  const debouncedUpdate = useMemo(() =>
    debounce((id, patch) => updatePart(id, patch), 500),
    []
  );

  // Opcja 2: Batch dla related changes
  // Np. zmiana x, y, cutX, cutY w L_SHAPE to jedna operacja
  ```

### 2. Rozmiar historii
- Cabinet operations tworzą duże snapshoty (cabinet + wszystkie części)
- Rozważyć kompresję lub referencje zamiast pełnych kopii
- Zwiększyć limit milestones dla cabinet operations?

### 3. Labele
- Obecnie labele są hardcoded po polsku
- Przed release przenieść do systemu i18n
- Dodać kontekst do labeli (np. "Zmieniono nazwę części: Drzwiczki")

---

## 📋 Checklist przed uznaniem za kompletne

### Funkcjonalność
- [ ] `updatePart` zapisuje historię dla wszystkich zmian
- [ ] `addCabinet` zapisuje historię
- [ ] `removeCabinet` zapisuje historię
- [ ] `duplicateCabinet` zapisuje historię
- [ ] `updateCabinet` zapisuje historię dla prostych zmian
- [ ] Wszystkie operacje mają odpowiedniki w `apply.ts`

### Testy
- [ ] Testy jednostkowe dla każdej operacji
- [ ] Testy undo/redo dla każdej operacji
- [ ] Testy edge cases (np. undo po page refresh)
- [ ] Testy wydajnościowe (100+ operacji w historii)

### UX
- [ ] Smart labeling dla różnych typów zmian
- [ ] Debouncing dla częstych zmian (opcjonalne)
- [ ] Labele przeniesione do i18n
- [ ] UI buttons undo/redo (opcjonalne)
- [ ] Timeline panel (opcjonalne)

---

## 🎯 Podsumowanie

**Obecnie brakuje historii dla:**
1. ❌ Wszystkie ręczne edycje części przez `updatePart` (KRYTYCZNE!)
2. ❌ Dodawanie szafki (`addCabinet`)
3. ❌ Usuwanie szafki (`removeCabinet`)
4. ❌ Duplikacja szafki (`duplicateCabinet`)
5. ⚠️ Prosta aktualizacja szafki - nazwa (`updateCabinet`)

**Szacowany czas implementacji:**
- P0 (krytyczne): ~4-6h
- P1 (ważne): ~2-3h
- Testy: ~3-4h
- **RAZEM: ~10-13h**

**Status ogólny:** System historii działa dla transformacji, ale **większość operacji edycji nie jest undo-able**. Wymaga uzupełnienia przed production use.
