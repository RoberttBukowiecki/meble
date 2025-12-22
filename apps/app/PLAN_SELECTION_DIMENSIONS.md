# Plan: Wymiary zaznaczonych obiektów (Selection Dimensions)

## Cel
Rozszerzenie funkcjonalności wymiarowania o wyświetlanie 3 wymiarów (szerokość, wysokość, głębokość) zaznaczonych szafek, części i blatów w stylu AutoCAD.

## Stan obecny

### Istniejąca implementacja wymiarów
- **Cel**: Pokazywanie odległości między przesuwanymi obiektami a innymi obiektami podczas drag
- **Pliki**:
  - `src/lib/store/slices/dimensionSlice.ts` - ustawienia (enabled, maxVisible, threshold)
  - `src/lib/dimension-context.tsx` - kontekst z refs dla wydajności
  - `src/lib/dimension-calculator.ts` - obliczanie linii wymiarowych
  - `src/components/canvas/DimensionRenderer.tsx` - renderowanie linii (CAD-style)
  - `src/components/layout/DimensionControlPanel.tsx` - UI toggle + ustawienia
  - `src/lib/bounding-box-utils.ts` - obliczanie AABB

### Istniejące komponenty do reużycia
1. **DimensionLineDisplay** - renderowanie pojedynczej linii wymiarowej z extension lines, strzałkami, etykietą
2. **CONFIG** z DimensionRenderer - kolory, grubości, offsety
3. **formatDistance()** - formatowanie odległości
4. **getPerpendicularDirection()** - kierunek prostopadły do linii

### Stan selekcji
- `selectedPartId` - pojedyncza część
- `selectedCabinetId` - szafka (wszystkie części)
- `selectedPartIds` (Set) - multiselect
- `selectedCountertopGroupId` - blat

---

## Architektura rozwiązania

### Nowe pliki

```
src/lib/
├── selection-dimensions-context.tsx    # Kontekst dla wymiarów selekcji
└── selection-dimensions-calculator.ts  # Obliczanie wymiarów obiektu

src/components/canvas/
└── SelectionDimensionRenderer.tsx      # Renderer wymiarów selekcji

src/lib/store/slices/
└── dimensionSlice.ts                   # Rozszerzenie o selectionDimensionsEnabled
```

### Modyfikowane pliki

```
src/lib/config.ts                       # Nowy skrót klawiszowy (np. 'b' dla "box dimensions")
src/types/transform.ts                  # Nowe typy
src/components/layout/DimensionControlPanel.tsx  # Przycisk toggle dla wymiarów selekcji
src/components/GlobalKeyboardListener.tsx        # Obsługa skrótu
src/components/canvas/Scene.tsx                  # Dodanie renderera
```

---

## Szczegółowy plan implementacji

### Faza 1: Typy i konfiguracja

#### 1.1 Rozszerzenie typów (`src/types/transform.ts`)

```typescript
/**
 * Wymiar obiektu do wyświetlenia
 */
export interface ObjectDimension {
  id: string;
  axis: 'X' | 'Y' | 'Z';
  label: 'W' | 'H' | 'D';  // Width, Height, Depth
  /** Punkt początkowy linii wymiarowej */
  startPoint: [number, number, number];
  /** Punkt końcowy linii wymiarowej */
  endPoint: [number, number, number];
  /** Długość w mm */
  length: number;
  /** Pozycja etykiety (środek linii + offset) */
  labelPosition: [number, number, number];
}

/**
 * Komplet wymiarów dla zaznaczonego obiektu
 */
export interface SelectionDimensions {
  objectId: string;
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
  dimensions: ObjectDimension[];
}

/**
 * Ustawienia wymiarów selekcji
 */
export interface SelectionDimensionSettings {
  enabled: boolean;
  showLabels: boolean;       // W, H, D labels
  labelPosition: 'edge' | 'center';  // przy krawędzi lub na środku
}
```

#### 1.2 Rozszerzenie konfiguracji (`src/lib/config.ts`)

```typescript
export const KEYBOARD_SHORTCUTS = {
  // ... existing
  TOGGLE_SELECTION_DIMENSIONS: 'b',  // 'b' dla "box/bounding dimensions"
} as const;
```

#### 1.3 Rozszerzenie dimensionSlice (`src/lib/store/slices/dimensionSlice.ts`)

```typescript
export interface DimensionSlice {
  // Existing
  dimensionSettings: DimensionSettings;
  updateDimensionSettings: (settings: Partial<DimensionSettings>) => void;

  // New
  selectionDimensionSettings: SelectionDimensionSettings;
  updateSelectionDimensionSettings: (settings: Partial<SelectionDimensionSettings>) => void;
  toggleSelectionDimensions: () => void;
}
```

---

### Faza 2: Kalkulator wymiarów

#### 2.1 Nowy plik: `src/lib/selection-dimensions-calculator.ts`

```typescript
/**
 * Kalkulator wymiarów dla zaznaczonych obiektów
 *
 * Oblicza pozycje 3 linii wymiarowych (W, H, D) dla obiektu
 * tak, aby były widoczne niezależnie od kąta kamery.
 */

import * as THREE from 'three';
import type { Part } from '@/types';
import type { ObjectDimension, SelectionDimensions } from '@/types/transform';
import { getPartBoundingBox, getCabinetBoundingBox, getMultiselectBoundingBox } from './bounding-box-utils';

/**
 * Konfiguracja offsetów dla linii wymiarowych
 */
const DIMENSION_CONFIG = {
  /** Offset linii od krawędzi obiektu (mm) */
  EDGE_OFFSET: 30,
  /** Dodatkowy offset dla czytelności przy nakładaniu */
  STACKING_OFFSET: 25,
};

/**
 * Oblicza optymalne pozycje wymiarów względem kamery
 * Wymiary są umieszczane przy krawędziach najbliższych kamerze
 */
export function calculateSelectionDimensions(
  objectId: string,
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect',
  boundingBox: { min: [number, number, number]; max: [number, number, number] },
  cameraPosition: THREE.Vector3,
): SelectionDimensions {
  const [minX, minY, minZ] = boundingBox.min;
  const [maxX, maxY, maxZ] = boundingBox.max;

  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;

  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];

  // Określ które krawędzie są bliżej kamery
  const camX = cameraPosition.x;
  const camY = cameraPosition.y;
  const camZ = cameraPosition.z;

  // Dla każdej osi wybierz stronę bliższą kamerze
  const useMaxX = camX > center[0];
  const useMaxY = camY > center[1];
  const useMaxZ = camZ > center[2];

  const offset = DIMENSION_CONFIG.EDGE_OFFSET;

  const dimensions: ObjectDimension[] = [];

  // WIDTH (oś X) - pozioma linia na dole lub górze, z przodu lub z tyłu
  const widthY = useMaxY ? maxY + offset : minY - offset;
  const widthZ = useMaxZ ? maxZ + offset : minZ - offset;
  dimensions.push({
    id: `${objectId}-width`,
    axis: 'X',
    label: 'W',
    startPoint: [minX, widthY, widthZ],
    endPoint: [maxX, widthY, widthZ],
    length: width,
    labelPosition: [center[0], widthY, widthZ],
  });

  // HEIGHT (oś Y) - pionowa linia z lewej lub prawej, z przodu lub z tyłu
  const heightX = useMaxX ? maxX + offset : minX - offset;
  const heightZ = useMaxZ ? maxZ + offset + DIMENSION_CONFIG.STACKING_OFFSET : minZ - offset - DIMENSION_CONFIG.STACKING_OFFSET;
  dimensions.push({
    id: `${objectId}-height`,
    axis: 'Y',
    label: 'H',
    startPoint: [heightX, minY, heightZ],
    endPoint: [heightX, maxY, heightZ],
    length: height,
    labelPosition: [heightX, center[1], heightZ],
  });

  // DEPTH (oś Z) - linia głębokości na dole lub górze, z lewej lub prawej
  const depthX = useMaxX ? maxX + offset + DIMENSION_CONFIG.STACKING_OFFSET : minX - offset - DIMENSION_CONFIG.STACKING_OFFSET;
  const depthY = useMaxY ? maxY + offset : minY - offset;
  dimensions.push({
    id: `${objectId}-depth`,
    axis: 'Z',
    label: 'D',
    startPoint: [depthX, depthY, minZ],
    endPoint: [depthX, depthY, maxZ],
    length: depth,
    labelPosition: [depthX, depthY, center[2]],
  });

  return {
    objectId,
    objectType,
    boundingBox: {
      min: boundingBox.min,
      max: boundingBox.max,
      center,
      size: [width, height, depth],
    },
    dimensions,
  };
}

/**
 * Helper: Pobierz bounding box dla dowolnego typu selekcji
 */
export function getSelectionBoundingBox(
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  parts: Part[],
  countertopGroups: CountertopGroup[],
): {
  objectId: string;
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
  boundingBox: { min: [number, number, number]; max: [number, number, number] }
} | null {
  // Priorytet: cabinet > multiselect > countertop > single part

  if (selectedCabinetId) {
    const bbox = getCabinetBoundingBox(selectedCabinetId, parts);
    if (bbox) {
      return { objectId: selectedCabinetId, objectType: 'cabinet', boundingBox: bbox };
    }
  }

  if (selectedPartIds.size > 1) {
    const bbox = getMultiselectBoundingBox(selectedPartIds, parts);
    if (bbox) {
      return { objectId: 'multiselect', objectType: 'multiselect', boundingBox: bbox };
    }
  }

  if (selectedCountertopGroupId) {
    const group = countertopGroups.find(g => g.id === selectedCountertopGroupId);
    if (group) {
      // Oblicz bbox dla blatu
      const bbox = calculateCountertopBoundingBox(group);
      if (bbox) {
        return { objectId: selectedCountertopGroupId, objectType: 'countertop', boundingBox: bbox };
      }
    }
  }

  if (selectedPartId) {
    const part = parts.find(p => p.id === selectedPartId);
    if (part) {
      const bbox = getPartBoundingBox(part);
      return { objectId: selectedPartId, objectType: 'part', boundingBox: bbox };
    }
  }

  return null;
}
```

---

### Faza 3: Kontekst i renderer

#### 3.1 Kontekst: `src/lib/selection-dimensions-context.tsx`

```typescript
/**
 * Kontekst dla wymiarów selekcji
 * Używa refs dla wydajności (bez rerenderów przy zmianie kamery)
 */

import { createContext, useContext, useRef, useCallback, type ReactNode, type MutableRefObject } from 'react';
import type { SelectionDimensions } from '@/types/transform';

interface SelectionDimensionsContextValue {
  dimensionsRef: MutableRefObject<SelectionDimensions | null>;
  versionRef: MutableRefObject<number>;
  setDimensions: (dims: SelectionDimensions | null) => void;
}

const SelectionDimensionsContext = createContext<SelectionDimensionsContextValue | null>(null);

export function SelectionDimensionsProvider({ children }: { children: ReactNode }) {
  const dimensionsRef = useRef<SelectionDimensions | null>(null);
  const versionRef = useRef(0);

  const setDimensions = useCallback((dims: SelectionDimensions | null) => {
    dimensionsRef.current = dims;
    versionRef.current += 1;
  }, []);

  return (
    <SelectionDimensionsContext.Provider value={{ dimensionsRef, versionRef, setDimensions }}>
      {children}
    </SelectionDimensionsContext.Provider>
  );
}

export function useSelectionDimensionsRef() {
  const ctx = useContext(SelectionDimensionsContext);
  if (!ctx) throw new Error('useSelectionDimensionsRef must be used within SelectionDimensionsProvider');
  return { dimensionsRef: ctx.dimensionsRef, versionRef: ctx.versionRef };
}

export function useSetSelectionDimensions() {
  const ctx = useContext(SelectionDimensionsContext);
  if (!ctx) throw new Error('useSetSelectionDimensions must be used within SelectionDimensionsProvider');
  return ctx.setDimensions;
}
```

#### 3.2 Renderer: `src/components/canvas/SelectionDimensionRenderer.tsx`

```typescript
/**
 * SelectionDimensionRenderer
 *
 * Renderuje wymiary (W, H, D) zaznaczonego obiektu.
 * Aktualizuje pozycje w useFrame żeby śledzić kamerę.
 *
 * Reużywa komponenty wizualne z DimensionRenderer.
 */

'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { useSelectionDimensionsRef } from '@/lib/selection-dimensions-context';
import { calculateSelectionDimensions, getSelectionBoundingBox } from '@/lib/selection-dimensions-calculator';
import type { ObjectDimension, SelectionDimensions } from '@/types/transform';

// Reużyj konfigurację z DimensionRenderer
const CONFIG = {
  LINE_COLOR: 0x16a34a,  // Green-600 (odróżnienie od wymiarów odległości - niebieskich)
  LINE_WIDTH: 2,
  EXTENSION_LENGTH: 15,
  EXTENSION_OFFSET: 5,
  ARROW_SIZE: 4,
  LABEL_OFFSET: 12,
  AXIS_COLORS: {
    X: 0xef4444,  // Red - Width
    Y: 0x22c55e,  // Green - Height
    Z: 0x3b82f6,  // Blue - Depth
  },
};

/**
 * Komponent pojedynczego wymiaru
 * Bazuje na DimensionLineDisplay z modyfikacjami
 */
function ObjectDimensionLine({ dimension, showAxisColors }: { dimension: ObjectDimension; showAxisColors: boolean }) {
  const color = showAxisColors ? CONFIG.AXIS_COLORS[dimension.axis] : CONFIG.LINE_COLOR;
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;

  // ... implementacja podobna do DimensionLineDisplay
  // Z dodatkową etykietą W/H/D
}

export function SelectionDimensionRenderer() {
  const { camera } = useThree();
  const selectionDimensionSettings = useStore((state) => state.selectionDimensionSettings);
  const selectedPartId = useStore((state) => state.selectedPartId);
  const selectedCabinetId = useStore((state) => state.selectedCabinetId);
  const selectedPartIds = useStore((state) => state.selectedPartIds);
  const selectedCountertopGroupId = useStore((state) => state.selectedCountertopGroupId);
  const parts = useStore((state) => state.parts);
  const countertopGroups = useStore((state) => state.countertopGroups);

  const [dimensions, setDimensions] = useState<SelectionDimensions | null>(null);
  const lastCameraPositionRef = useRef(new THREE.Vector3());

  // Aktualizuj wymiary w useFrame
  useFrame(() => {
    if (!selectionDimensionSettings?.enabled) return;

    // Sprawdź czy kamera się ruszyła (optymalizacja)
    const cameraMoved = !lastCameraPositionRef.current.equals(camera.position);
    if (!cameraMoved && dimensions) return;

    lastCameraPositionRef.current.copy(camera.position);

    // Pobierz bounding box selekcji
    const selection = getSelectionBoundingBox(
      selectedPartId,
      selectedCabinetId,
      selectedPartIds,
      selectedCountertopGroupId,
      parts,
      countertopGroups
    );

    if (!selection) {
      setDimensions(null);
      return;
    }

    // Oblicz wymiary
    const newDims = calculateSelectionDimensions(
      selection.objectId,
      selection.objectType,
      selection.boundingBox,
      camera.position
    );

    setDimensions(newDims);
  });

  if (!selectionDimensionSettings?.enabled || !dimensions) return null;

  return (
    <group>
      {dimensions.dimensions.map((dim) => (
        <ObjectDimensionLine
          key={dim.id}
          dimension={dim}
          showAxisColors={selectionDimensionSettings.showLabels}
        />
      ))}
    </group>
  );
}
```

---

### Faza 4: UI i skróty klawiszowe

#### 4.1 Rozszerzenie DimensionControlPanel

```typescript
// Dodaj drugi przycisk dla wymiarów selekcji
// Po obecnym przycisku Ruler

<Button
  variant={selectionDimensionSettings?.enabled ? 'default' : 'ghost'}
  size="sm"
  onClick={toggleSelectionDimensions}
  className="h-8 px-2"
  title={`Wymiary selekcji (${formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_SELECTION_DIMENSIONS)})`}
>
  <Box className="h-4 w-4" />  {/* lub BoxSelect z lucide */}
</Button>
```

#### 4.2 Rozszerzenie GlobalKeyboardListener

```typescript
// Dodaj obsługę skrótu 'b' dla wymiarów selekcji
if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_SELECTION_DIMENSIONS, key)) {
  event.preventDefault();
  useStore.getState().toggleSelectionDimensions();
  return;
}
```

---

### Faza 5: Integracja

#### 5.1 Scene.tsx

```typescript
// Dodaj provider i renderer
<SelectionDimensionsProvider>
  <Canvas ...>
    {/* ... existing content ... */}

    {/* Selection dimensions (object W/H/D) */}
    {selectionDimensionSettings?.enabled && <SelectionDimensionRenderer />}
  </Canvas>
</SelectionDimensionsProvider>
```

---

## Szczegóły implementacji

### Widoczność wymiarów niezależnie od kamery

Kluczowy algorytm w `calculateSelectionDimensions`:

1. **Pobierz pozycję kamery** w świecie 3D
2. **Dla każdej osi** określ, która strona bounding boxa jest bliżej kamery:
   - Jeśli `camera.x > center.x` → użyj `maxX` jako bazy dla wymiaru
   - Analogicznie dla Y i Z
3. **Offset linie wymiarowe** od wybranej strony o `EDGE_OFFSET`
4. **Stackuj wymiary** z dodatkowym `STACKING_OFFSET` żeby się nie nakładały

### Współdzielenie kodu z DimensionRenderer

1. **CONFIG** - współdzielona konfiguracja kolorów, rozmiarów
2. **DimensionLineDisplay** - bazowy komponent linii wymiarowej (wyodrębniony do wspólnego pliku lub importowany)
3. **formatDistance()** - formatowanie wyświetlanej wartości
4. **Styl wizualny** - te same extension lines, strzałki (sfery), etykiety HTML

### Różnice od obecnych wymiarów

| Aspekt | Wymiary odległości (existing) | Wymiary selekcji (new) |
|--------|-------------------------------|------------------------|
| Kiedy widoczne | Podczas drag | Gdy obiekt zaznaczony |
| Co pokazuje | Odległość do innych obiektów | W, H, D obiektu |
| Kolor domyślny | Niebieski | Zielony |
| Aktualizacja | Na każdą zmianę pozycji drag | Na ruch kamery |
| Liczba linii | 1-9 (do innych obiektów) | Zawsze 3 (W, H, D) |

---

## Kolejność implementacji

### Sprint 1: Fundament
1. [ ] Rozszerzyć typy w `transform.ts`
2. [ ] Rozszerzyć `dimensionSlice.ts` o selectionDimensionSettings
3. [ ] Dodać skrót w `config.ts`
4. [ ] Dodać obsługę skrótu w `GlobalKeyboardListener.tsx`

### Sprint 2: Logika
5. [ ] Stworzyć `selection-dimensions-calculator.ts`
6. [ ] Stworzyć `selection-dimensions-context.tsx` (opcjonalnie, jeśli potrzebna optymalizacja)

### Sprint 3: Rendering
7. [ ] Stworzyć `SelectionDimensionRenderer.tsx`
8. [ ] Wyodrębnić wspólne komponenty z `DimensionRenderer.tsx` do shared file

### Sprint 4: UI i integracja
9. [ ] Rozszerzyć `DimensionControlPanel.tsx` o przycisk toggle
10. [ ] Zintegrować w `Scene.tsx`

### Sprint 5: Polish
11. [ ] Testowanie z różnymi typami obiektów (part, cabinet, multiselect, countertop)
12. [ ] Optymalizacja wydajności (throttling aktualizacji przy ruchu kamery)
13. [ ] Edge cases (bardzo małe obiekty, obrócone obiekty)

---

## Rozważania

### Obsługa obróconych obiektów
- Dla obróconych obiektów bounding box jest AABB (axis-aligned)
- Wymiary pokazują rozmiar AABB, nie rzeczywiste wymiary części
- Rozwiązanie: dla pojedynczych części można użyć OBB i pokazać rzeczywiste wymiary

### Wydajność
- useFrame aktualizuje na każdą klatkę, ale sprawdzamy czy kamera się ruszyła
- Można dodać throttling (np. max 10 aktualizacji/s)
- Refs zamiast state dla wewnętrznych danych kalkulacji

### Konflikty wizualne
- Wymiary selekcji (zielone) vs wymiary odległości (niebieskie) - różne kolory
- Wymiary selekcji wyłączają się podczas drag? Lub pozostają widoczne?
  - Rekomendacja: pozostają widoczne, dają kontekst rozmiaru przesuwanegoo biektu

---

## Podsumowanie

Plan zakłada:
1. **Maksymalne reużycie** istniejącego kodu (komponenty, style, utilities)
2. **Czytelny podział** na kalkulator, kontekst i renderer
3. **Spójny UX** z obecnymi wymiarami (ten sam styl CAD)
4. **Optymalna wydajność** przez refs i detekcję zmian kamery
5. **Prostą rozszerzalność** o dodatkowe funkcje w przyszłości
