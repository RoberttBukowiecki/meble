# Plan: Wymiary obiektów (Object Dimensions)

## Cel
Rozszerzenie funkcjonalności wymiarowania o wyświetlanie 3 wymiarów (szerokość, wysokość, głębokość) obiektów w stylu AutoCAD z następującymi trybami:
- **Wymiary zaznaczenia** - tylko zaznaczone obiekty
- **Wymiary wszystkich** - wszystkie obiekty na scenie
- **Granularność** - wybór między wymiarami szafek/grup a pojedynczymi częściami

---

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
5. **getPartBoundingBox, getCabinetBoundingBox** - obliczanie bounding boxów

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
├── object-dimensions-calculator.ts     # Obliczanie wymiarów obiektu/obiektów

src/components/canvas/
└── ObjectDimensionRenderer.tsx         # Renderer wymiarów obiektów

src/components/layout/
└── ObjectDimensionControlPanel.tsx     # Panel sterowania (oddzielny od distance dimensions)
```

### Modyfikowane pliki

```
src/lib/config.ts                       # Nowy skrót klawiszowy
src/types/transform.ts                  # Nowe typy
src/lib/store/slices/dimensionSlice.ts  # Rozszerzenie o objectDimensionSettings
src/components/GlobalKeyboardListener.tsx  # Obsługa skrótu
src/components/canvas/Scene.tsx         # Dodanie renderera
```

---

## Szczegółowy plan implementacji

### Faza 1: Typy i konfiguracja

#### 1.1 Rozszerzenie typów (`src/types/transform.ts`)

```typescript
/**
 * Tryb wyświetlania wymiarów obiektów
 */
export type ObjectDimensionMode =
  | 'selection'  // Tylko zaznaczone obiekty
  | 'all';       // Wszystkie obiekty

/**
 * Granularność wyświetlania wymiarów
 */
export type ObjectDimensionGranularity =
  | 'group'      // Szafki/grupy (bounding box całej szafki)
  | 'part';      // Pojedyncze części

/**
 * Wymiar obiektu do wyświetlenia
 */
export interface ObjectDimension {
  id: string;
  objectId: string;              // ID obiektu (part/cabinet/countertop)
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
  axis: 'X' | 'Y' | 'Z';
  label: 'W' | 'H' | 'D';        // Width, Height, Depth
  /** Punkt początkowy linii wymiarowej */
  startPoint: [number, number, number];
  /** Punkt końcowy linii wymiarowej */
  endPoint: [number, number, number];
  /** Długość w mm */
  length: number;
  /** Pozycja etykiety */
  labelPosition: [number, number, number];
}

/**
 * Komplet wymiarów dla obiektu
 */
export interface ObjectDimensionSet {
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
 * Ustawienia wymiarów obiektów
 */
export interface ObjectDimensionSettings {
  /** Włączone/wyłączone */
  enabled: boolean;
  /** Tryb: tylko zaznaczone vs wszystkie */
  mode: ObjectDimensionMode;
  /** Granularność: szafki/grupy vs pojedyncze części */
  granularity: ObjectDimensionGranularity;
  /** Pokaż etykiety W/H/D */
  showLabels: boolean;
  /** Kolory według osi */
  showAxisColors: boolean;
  /** Pokaż tylko gdy zaznaczono (dla mode='selection') */
  hideWhenNoSelection: boolean;
}
```

#### 1.2 Rozszerzenie konfiguracji (`src/lib/config.ts`)

```typescript
export const KEYBOARD_SHORTCUTS = {
  // ... existing
  TOGGLE_OBJECT_DIMENSIONS: 'b',  // 'b' dla "box/bounding dimensions"
} as const;
```

#### 1.3 Rozszerzenie dimensionSlice (`src/lib/store/slices/dimensionSlice.ts`)

```typescript
export interface DimensionSlice {
  // Existing - distance dimensions (during drag)
  dimensionSettings: DimensionSettings;
  updateDimensionSettings: (settings: Partial<DimensionSettings>) => void;

  // New - object dimensions (W/H/D)
  objectDimensionSettings: ObjectDimensionSettings;
  updateObjectDimensionSettings: (settings: Partial<ObjectDimensionSettings>) => void;
  toggleObjectDimensions: () => void;
  setObjectDimensionMode: (mode: ObjectDimensionMode) => void;
  setObjectDimensionGranularity: (granularity: ObjectDimensionGranularity) => void;
}

// Default settings
const DEFAULT_OBJECT_DIMENSION_SETTINGS: ObjectDimensionSettings = {
  enabled: false,
  mode: 'selection',           // Domyślnie tylko zaznaczone
  granularity: 'group',        // Domyślnie szafki/grupy
  showLabels: true,
  showAxisColors: false,
  hideWhenNoSelection: true,
};
```

---

### Faza 2: Kalkulator wymiarów

#### 2.1 Nowy plik: `src/lib/object-dimensions-calculator.ts`

```typescript
/**
 * Kalkulator wymiarów dla obiektów
 *
 * Obsługuje:
 * - Tryb 'selection': wymiary tylko zaznaczonych obiektów
 * - Tryb 'all': wymiary wszystkich obiektów
 * - Granularność 'group': bounding box szafek/grup
 * - Granularność 'part': każda część osobno
 */

import * as THREE from 'three';
import type { Part, Cabinet, CountertopGroup } from '@/types';
import type {
  ObjectDimension,
  ObjectDimensionSet,
  ObjectDimensionMode,
  ObjectDimensionGranularity
} from '@/types/transform';
import {
  getPartBoundingBox,
  getCabinetBoundingBox,
  getMultiselectBoundingBox,
  calculateCountertopBoundingBox,
} from './bounding-box-utils';

/**
 * Konfiguracja offsetów dla linii wymiarowych
 */
const DIMENSION_CONFIG = {
  EDGE_OFFSET: 30,           // Offset linii od krawędzi obiektu (mm)
  STACKING_OFFSET: 25,       // Dodatkowy offset dla czytelności
  MIN_DIMENSION_SIZE: 10,    // Minimalna wielkość do wyświetlenia wymiaru (mm)
};

/**
 * Oblicza wymiary dla pojedynczego obiektu
 */
export function calculateObjectDimensions(
  objectId: string,
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect',
  boundingBox: { min: [number, number, number]; max: [number, number, number] },
  cameraPosition: THREE.Vector3,
): ObjectDimensionSet {
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
  const useMaxX = cameraPosition.x > center[0];
  const useMaxY = cameraPosition.y > center[1];
  const useMaxZ = cameraPosition.z > center[2];

  const offset = DIMENSION_CONFIG.EDGE_OFFSET;
  const dimensions: ObjectDimension[] = [];

  // WIDTH (oś X)
  if (width >= DIMENSION_CONFIG.MIN_DIMENSION_SIZE) {
    const widthY = useMaxY ? maxY + offset : minY - offset;
    const widthZ = useMaxZ ? maxZ + offset : minZ - offset;
    dimensions.push({
      id: `${objectId}-width`,
      objectId,
      objectType,
      axis: 'X',
      label: 'W',
      startPoint: [minX, widthY, widthZ],
      endPoint: [maxX, widthY, widthZ],
      length: width,
      labelPosition: [center[0], widthY, widthZ],
    });
  }

  // HEIGHT (oś Y)
  if (height >= DIMENSION_CONFIG.MIN_DIMENSION_SIZE) {
    const heightX = useMaxX ? maxX + offset : minX - offset;
    const heightZ = useMaxZ ? maxZ + offset + DIMENSION_CONFIG.STACKING_OFFSET : minZ - offset - DIMENSION_CONFIG.STACKING_OFFSET;
    dimensions.push({
      id: `${objectId}-height`,
      objectId,
      objectType,
      axis: 'Y',
      label: 'H',
      startPoint: [heightX, minY, heightZ],
      endPoint: [heightX, maxY, heightZ],
      length: height,
      labelPosition: [heightX, center[1], heightZ],
    });
  }

  // DEPTH (oś Z)
  if (depth >= DIMENSION_CONFIG.MIN_DIMENSION_SIZE) {
    const depthX = useMaxX ? maxX + offset + DIMENSION_CONFIG.STACKING_OFFSET : minX - offset - DIMENSION_CONFIG.STACKING_OFFSET;
    const depthY = useMaxY ? maxY + offset : minY - offset;
    dimensions.push({
      id: `${objectId}-depth`,
      objectId,
      objectType,
      axis: 'Z',
      label: 'D',
      startPoint: [depthX, depthY, minZ],
      endPoint: [depthX, depthY, maxZ],
      length: depth,
      labelPosition: [depthX, depthY, center[2]],
    });
  }

  return {
    objectId,
    objectType,
    boundingBox: { min: boundingBox.min, max: boundingBox.max, center, size: [width, height, depth] },
    dimensions,
  };
}

/**
 * Pobiera obiekty do wymiarowania w zależności od trybu i granularności
 */
export function getObjectsForDimensioning(
  mode: ObjectDimensionMode,
  granularity: ObjectDimensionGranularity,
  parts: Part[],
  cabinets: Cabinet[],
  countertopGroups: CountertopGroup[],
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  selectedFurnitureId: string,
): Array<{
  objectId: string;
  objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
}> {
  const results: Array<{
    objectId: string;
    objectType: 'part' | 'cabinet' | 'countertop' | 'multiselect';
    boundingBox: { min: [number, number, number]; max: [number, number, number] };
  }> = [];

  // Filtruj części do aktualnego mebla
  const furnitureParts = parts.filter(p => p.furnitureId === selectedFurnitureId && !p.hidden);
  const furnitureCabinets = cabinets.filter(c => c.furnitureId === selectedFurnitureId);
  const furnitureCountertops = countertopGroups.filter(ct => ct.furnitureId === selectedFurnitureId);

  if (mode === 'selection') {
    // ===== TRYB: TYLKO ZAZNACZONE =====

    if (granularity === 'group') {
      // Szafki/grupy
      if (selectedCabinetId) {
        const bbox = getCabinetBoundingBox(selectedCabinetId, parts);
        if (bbox) {
          results.push({ objectId: selectedCabinetId, objectType: 'cabinet', boundingBox: bbox });
        }
      } else if (selectedPartIds.size > 1) {
        const bbox = getMultiselectBoundingBox(selectedPartIds, parts);
        if (bbox) {
          results.push({ objectId: 'multiselect', objectType: 'multiselect', boundingBox: bbox });
        }
      } else if (selectedCountertopGroupId) {
        const group = countertopGroups.find(g => g.id === selectedCountertopGroupId);
        if (group) {
          const bbox = calculateCountertopBoundingBox(group);
          if (bbox) {
            results.push({ objectId: selectedCountertopGroupId, objectType: 'countertop', boundingBox: bbox });
          }
        }
      } else if (selectedPartId) {
        // Pojedyncza część - znajdź jej szafkę jeśli należy
        const part = parts.find(p => p.id === selectedPartId);
        if (part?.cabinetMetadata?.cabinetId) {
          const bbox = getCabinetBoundingBox(part.cabinetMetadata.cabinetId, parts);
          if (bbox) {
            results.push({ objectId: part.cabinetMetadata.cabinetId, objectType: 'cabinet', boundingBox: bbox });
          }
        } else if (part) {
          // Część bez szafki - pokaż jej wymiary
          const bbox = getPartBoundingBox(part);
          results.push({ objectId: selectedPartId, objectType: 'part', boundingBox: bbox });
        }
      }
    } else {
      // Pojedyncze części
      if (selectedCabinetId) {
        // Pokaż wymiary każdej części w szafce
        const cabinet = cabinets.find(c => c.id === selectedCabinetId);
        if (cabinet) {
          for (const partId of cabinet.partIds) {
            const part = parts.find(p => p.id === partId && !p.hidden);
            if (part) {
              const bbox = getPartBoundingBox(part);
              results.push({ objectId: partId, objectType: 'part', boundingBox: bbox });
            }
          }
        }
      } else if (selectedPartIds.size > 0) {
        for (const partId of selectedPartIds) {
          const part = parts.find(p => p.id === partId && !p.hidden);
          if (part) {
            const bbox = getPartBoundingBox(part);
            results.push({ objectId: partId, objectType: 'part', boundingBox: bbox });
          }
        }
      } else if (selectedPartId) {
        const part = parts.find(p => p.id === selectedPartId);
        if (part) {
          const bbox = getPartBoundingBox(part);
          results.push({ objectId: selectedPartId, objectType: 'part', boundingBox: bbox });
        }
      }
      // Countertop w trybie 'part' - traktujemy jako jeden obiekt
      if (selectedCountertopGroupId) {
        const group = countertopGroups.find(g => g.id === selectedCountertopGroupId);
        if (group) {
          const bbox = calculateCountertopBoundingBox(group);
          if (bbox) {
            results.push({ objectId: selectedCountertopGroupId, objectType: 'countertop', boundingBox: bbox });
          }
        }
      }
    }
  } else {
    // ===== TRYB: WSZYSTKIE =====

    if (granularity === 'group') {
      // Wszystkie szafki
      for (const cabinet of furnitureCabinets) {
        const bbox = getCabinetBoundingBox(cabinet.id, parts);
        if (bbox) {
          results.push({ objectId: cabinet.id, objectType: 'cabinet', boundingBox: bbox });
        }
      }
      // Części bez szafki
      const partsWithoutCabinet = furnitureParts.filter(p => !p.cabinetMetadata?.cabinetId);
      for (const part of partsWithoutCabinet) {
        const bbox = getPartBoundingBox(part);
        results.push({ objectId: part.id, objectType: 'part', boundingBox: bbox });
      }
      // Wszystkie blaty
      for (const group of furnitureCountertops) {
        const bbox = calculateCountertopBoundingBox(group);
        if (bbox) {
          results.push({ objectId: group.id, objectType: 'countertop', boundingBox: bbox });
        }
      }
    } else {
      // Wszystkie pojedyncze części
      for (const part of furnitureParts) {
        const bbox = getPartBoundingBox(part);
        results.push({ objectId: part.id, objectType: 'part', boundingBox: bbox });
      }
      // Wszystkie blaty
      for (const group of furnitureCountertops) {
        const bbox = calculateCountertopBoundingBox(group);
        if (bbox) {
          results.push({ objectId: group.id, objectType: 'countertop', boundingBox: bbox });
        }
      }
    }
  }

  return results;
}

/**
 * Główna funkcja: oblicz wszystkie wymiary do wyświetlenia
 */
export function calculateAllObjectDimensions(
  mode: ObjectDimensionMode,
  granularity: ObjectDimensionGranularity,
  parts: Part[],
  cabinets: Cabinet[],
  countertopGroups: CountertopGroup[],
  selectedPartId: string | null,
  selectedCabinetId: string | null,
  selectedPartIds: Set<string>,
  selectedCountertopGroupId: string | null,
  selectedFurnitureId: string,
  cameraPosition: THREE.Vector3,
): ObjectDimensionSet[] {
  const objects = getObjectsForDimensioning(
    mode,
    granularity,
    parts,
    cabinets,
    countertopGroups,
    selectedPartId,
    selectedCabinetId,
    selectedPartIds,
    selectedCountertopGroupId,
    selectedFurnitureId,
  );

  return objects.map(obj =>
    calculateObjectDimensions(obj.objectId, obj.objectType, obj.boundingBox, cameraPosition)
  );
}
```

#### 2.2 Helper: `calculateCountertopBoundingBox` (do dodania w `bounding-box-utils.ts`)

```typescript
/**
 * Oblicza bounding box dla grupy blatów
 */
export function calculateCountertopBoundingBox(
  group: CountertopGroup
): { min: [number, number, number]; max: [number, number, number] } | null {
  if (!group.segments || group.segments.length === 0) return null;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const segment of group.segments) {
    const { position, dimensions } = segment;
    const halfW = dimensions.width / 2;
    const halfH = dimensions.thickness / 2;
    const halfD = dimensions.depth / 2;

    // Uwzględnij rotację segmentu jeśli istnieje
    // Dla uproszczenia: AABB bez rotacji
    minX = Math.min(minX, position[0] - halfW);
    maxX = Math.max(maxX, position[0] + halfW);
    minY = Math.min(minY, position[1] - halfH);
    maxY = Math.max(maxY, position[1] + halfH);
    minZ = Math.min(minZ, position[2] - halfD);
    maxZ = Math.max(maxZ, position[2] + halfD);
  }

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}
```

---

### Faza 3: Renderer

#### 3.1 Renderer: `src/components/canvas/ObjectDimensionRenderer.tsx`

```typescript
/**
 * ObjectDimensionRenderer
 *
 * Renderuje wymiary (W, H, D) obiektów.
 * Obsługuje tryby: selection/all i granularność: group/part.
 * Aktualizuje pozycje w useFrame żeby śledzić kamerę.
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { calculateAllObjectDimensions } from '@/lib/object-dimensions-calculator';
import type { ObjectDimension, ObjectDimensionSet } from '@/types/transform';

// Konfiguracja wizualna - współdzielona z DimensionRenderer
const CONFIG = {
  LINE_COLOR: 0x16a34a,        // Green-600
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
 */
function ObjectDimensionLine({
  dimension,
  showAxisColors,
  showLabel,
}: {
  dimension: ObjectDimension;
  showAxisColors: boolean;
  showLabel: boolean;
}) {
  const color = showAxisColors ? CONFIG.AXIS_COLORS[dimension.axis] : CONFIG.LINE_COLOR;
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;

  // Geometry calculations (similar to DimensionLineDisplay)
  const start = new THREE.Vector3(...dimension.startPoint);
  const end = new THREE.Vector3(...dimension.endPoint);

  // ... extension lines, main line, arrows (reuse from DimensionRenderer)

  return (
    <group renderOrder={2000}>
      {/* Main dimension line */}
      <Line
        points={[[start.x, start.y, start.z], [end.x, end.y, end.z]]}
        color={colorHex}
        lineWidth={CONFIG.LINE_WIDTH}
        transparent
        opacity={0.9}
        depthTest={false}
      />

      {/* Arrows at ends */}
      <mesh position={[start.x, start.y, start.z]} renderOrder={2001}>
        <sphereGeometry args={[CONFIG.ARROW_SIZE, 8, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <mesh position={[end.x, end.y, end.z]} renderOrder={2001}>
        <sphereGeometry args={[CONFIG.ARROW_SIZE, 8, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Label */}
      <Html
        position={dimension.labelPosition}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className="whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: colorHex,
            border: `1px solid ${colorHex}`,
          }}
        >
          {showLabel && <span className="mr-1 opacity-70">{dimension.label}:</span>}
          {Math.round(dimension.length)} mm
        </div>
      </Html>
    </group>
  );
}

export function ObjectDimensionRenderer() {
  const { camera } = useThree();

  // Settings
  const settings = useStore((state) => state.objectDimensionSettings);

  // Selection state
  const selectedPartId = useStore((state) => state.selectedPartId);
  const selectedCabinetId = useStore((state) => state.selectedCabinetId);
  const selectedPartIds = useStore((state) => state.selectedPartIds);
  const selectedCountertopGroupId = useStore((state) => state.selectedCountertopGroupId);
  const selectedFurnitureId = useStore((state) => state.selectedFurnitureId);

  // Data
  const parts = useStore((state) => state.parts);
  const cabinets = useStore((state) => state.cabinets);
  const countertopGroups = useStore((state) => state.countertopGroups);

  const [dimensionSets, setDimensionSets] = useState<ObjectDimensionSet[]>([]);
  const lastCameraPositionRef = useRef(new THREE.Vector3());
  const lastUpdateRef = useRef(0);

  // Throttle: max 30 updates per second
  const THROTTLE_MS = 33;

  useFrame(() => {
    if (!settings?.enabled) return;

    // Check if camera moved (with throttle)
    const now = Date.now();
    const cameraMoved = !lastCameraPositionRef.current.equals(camera.position);

    if (!cameraMoved && dimensionSets.length > 0) return;
    if (now - lastUpdateRef.current < THROTTLE_MS) return;

    lastCameraPositionRef.current.copy(camera.position);
    lastUpdateRef.current = now;

    // Check if we should hide when no selection
    const hasSelection = selectedPartId || selectedCabinetId || selectedPartIds.size > 0 || selectedCountertopGroupId;
    if (settings.mode === 'selection' && settings.hideWhenNoSelection && !hasSelection) {
      setDimensionSets([]);
      return;
    }

    // Calculate dimensions
    const newDimensions = calculateAllObjectDimensions(
      settings.mode,
      settings.granularity,
      parts,
      cabinets,
      countertopGroups,
      selectedPartId,
      selectedCabinetId,
      selectedPartIds,
      selectedCountertopGroupId,
      selectedFurnitureId,
      camera.position,
    );

    setDimensionSets(newDimensions);
  });

  if (!settings?.enabled || dimensionSets.length === 0) return null;

  return (
    <group>
      {dimensionSets.flatMap((set) =>
        set.dimensions.map((dim) => (
          <ObjectDimensionLine
            key={dim.id}
            dimension={dim}
            showAxisColors={settings.showAxisColors}
            showLabel={settings.showLabels}
          />
        ))
      )}
    </group>
  );
}
```

---

### Faza 4: Panel sterowania UI

#### 4.1 Nowy plik: `src/components/layout/ObjectDimensionControlPanel.tsx`

```typescript
/**
 * ObjectDimensionControlPanel
 *
 * Panel sterowania wymiarami obiektów:
 * - Toggle włącz/wyłącz
 * - Tryb: tylko zaznaczone / wszystkie
 * - Granularność: szafki/grupy / pojedyncze części
 * - Ustawienia wizualne
 */

'use client';

import { useCallback } from 'react';
import { Box, Layers, Component, Settings2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { KEYBOARD_SHORTCUTS, formatShortcutLabel } from '@/lib/config';
import type { ObjectDimensionMode, ObjectDimensionGranularity } from '@/types/transform';

export function ObjectDimensionControlPanel() {
  const {
    objectDimensionSettings,
    updateObjectDimensionSettings,
    toggleObjectDimensions,
  } = useStore(
    useShallow((state) => ({
      objectDimensionSettings: state.objectDimensionSettings,
      updateObjectDimensionSettings: state.updateObjectDimensionSettings,
      toggleObjectDimensions: state.toggleObjectDimensions,
    }))
  );

  const handleModeChange = useCallback(
    (mode: string) => {
      updateObjectDimensionSettings({ mode: mode as ObjectDimensionMode });
    },
    [updateObjectDimensionSettings]
  );

  const handleGranularityChange = useCallback(
    (granularity: string) => {
      updateObjectDimensionSettings({ granularity: granularity as ObjectDimensionGranularity });
    },
    [updateObjectDimensionSettings]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      {/* Main Toggle Button */}
      <Button
        variant={objectDimensionSettings?.enabled ? 'default' : 'ghost'}
        size="sm"
        onClick={toggleObjectDimensions}
        className="h-8 px-2"
        title={`Wymiary obiektów (${formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS)})`}
      >
        <Box className="h-4 w-4" />
      </Button>

      {/* Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ustawienia wymiarów obiektów"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Wymiary obiektów</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Mode Selection */}
          <div className="px-2 py-1.5">
            <div className="mb-1.5 text-sm font-medium">Tryb wyświetlania</div>
            <DropdownMenuRadioGroup
              value={objectDimensionSettings?.mode || 'selection'}
              onValueChange={handleModeChange}
            >
              <DropdownMenuRadioItem value="selection" className="text-sm">
                <Layers className="mr-2 h-4 w-4" />
                Tylko zaznaczone
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all" className="text-sm">
                <Component className="mr-2 h-4 w-4" />
                Wszystkie obiekty
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          {/* Granularity Selection */}
          <div className="px-2 py-1.5">
            <div className="mb-1.5 text-sm font-medium">Poziom szczegółowości</div>
            <DropdownMenuRadioGroup
              value={objectDimensionSettings?.granularity || 'group'}
              onValueChange={handleGranularityChange}
            >
              <DropdownMenuRadioItem value="group" className="text-sm">
                Szafki / grupy
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="part" className="text-sm">
                Pojedyncze części
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          {/* Visual Options */}
          <DropdownMenuCheckboxItem
            checked={objectDimensionSettings?.showLabels ?? true}
            onCheckedChange={(checked) => updateObjectDimensionSettings({ showLabels: checked })}
          >
            Pokaż etykiety (W/H/D)
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={objectDimensionSettings?.showAxisColors ?? false}
            onCheckedChange={(checked) => updateObjectDimensionSettings({ showAxisColors: checked })}
          >
            Kolory według osi
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

### Faza 5: Integracja

#### 5.1 GlobalKeyboardListener.tsx

```typescript
// Dodaj obsługę skrótu 'b'
if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS, key)) {
  event.preventDefault();
  useStore.getState().toggleObjectDimensions();
  return;
}
```

#### 5.2 Scene.tsx

```typescript
// Import
import { ObjectDimensionRenderer } from './ObjectDimensionRenderer';
import { ObjectDimensionControlPanel } from '@/components/layout/ObjectDimensionControlPanel';

// W toolbarze (obok SnapControlPanel i DimensionControlPanel)
<ObjectDimensionControlPanel />

// W Canvas
{objectDimensionSettings?.enabled && <ObjectDimensionRenderer />}
```

---

## Podsumowanie zmian

### Nowe możliwości:

| Funkcja | Opis |
|---------|------|
| **Tryb: Selection** | Wymiary tylko zaznaczonych obiektów (domyślny) |
| **Tryb: All** | Wymiary wszystkich obiektów w meblu |
| **Granularność: Group** | Wymiary całych szafek/grup (domyślny) |
| **Granularność: Part** | Wymiary każdej pojedynczej części |
| **Skrót klawiszowy** | `B` - toggle wymiarów obiektów |

### UI Panel:

```
┌─────────────────────────────────┐
│ [📦] Wymiary obiektów  [⚙️]    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Wymiary obiektów                │
├─────────────────────────────────┤
│ Tryb wyświetlania:              │
│ ○ Tylko zaznaczone              │
│ ○ Wszystkie obiekty             │
├─────────────────────────────────┤
│ Poziom szczegółowości:          │
│ ○ Szafki / grupy                │
│ ○ Pojedyncze części             │
├─────────────────────────────────┤
│ ☑ Pokaż etykiety (W/H/D)        │
│ ☐ Kolory według osi             │
└─────────────────────────────────┘
```

### Zachowania w trybach:

| Tryb | Granularność | Co pokazuje |
|------|--------------|-------------|
| Selection | Group | Wymiary zaznaczonej szafki (lub części jeśli nie w szafce) |
| Selection | Part | Wymiary każdej części w zaznaczonej szafce |
| All | Group | Wymiary wszystkich szafek + luźnych części |
| All | Part | Wymiary każdej pojedynczej części w meblu |

---

## Kolejność implementacji

### Sprint 1: Fundament
1. [ ] Rozszerzyć typy w `transform.ts`
2. [ ] Rozszerzyć `dimensionSlice.ts` o objectDimensionSettings
3. [ ] Dodać skrót w `config.ts`

### Sprint 2: Logika
4. [ ] Stworzyć `object-dimensions-calculator.ts`
5. [ ] Funkcje dla różnych trybów i granularności
6. [ ] Dodać `calculateCountertopBoundingBox` do `bounding-box-utils.ts`

### Sprint 3: Rendering
7. [ ] Stworzyć `ObjectDimensionRenderer.tsx`
8. [ ] Wyodrębnić wspólne komponenty do reużycia

### Sprint 4: UI
9. [ ] Stworzyć `ObjectDimensionControlPanel.tsx`
10. [ ] Dodać obsługę skrótu w `GlobalKeyboardListener.tsx`

### Sprint 5: Integracja i testy
11. [ ] Zintegrować w `Scene.tsx`
12. [ ] Testy: różne kombinacje trybów
13. [ ] Optymalizacja wydajności (tryb "all" z wieloma obiektami)

---

## Rozważania techniczne

### Wydajność dla trybu "all"
- Wiele obiektów = wiele linii wymiarowych
- Throttling aktualizacji (max 30/s)
- Możliwość dodania max liczby wymiarów do pokazania
- Lazy rendering poza widokiem kamery (future)

### Konflikty wizualne
- Wymiary obiektów (zielone) vs wymiary odległości (niebieskie)
- W trybie "all" z granularity "part" może być dużo linii
- Rozwiązanie: transparentność, mniejsza grubość dla nieaktywnych

### Priorytet wyświetlania
W trybie "selection" z granularity "group":
1. Zaznaczona szafka → pokaż wymiary szafki
2. Zaznaczona część w szafce → pokaż wymiary szafki (nie części)
3. Zaznaczona część bez szafki → pokaż wymiary części
4. Multiselect → pokaż wymiary bounding box selekcji
