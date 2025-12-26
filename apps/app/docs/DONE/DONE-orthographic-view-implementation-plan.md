# Plan Implementacji: Rzut Ortograficzny z Edycją 2D

## Podsumowanie

Implementacja systemu widoku ortograficznego z pełną edycją (translate, rotate, resize) i snappingiem. 6 widoków: TOP, BOTTOM, FRONT, BACK, LEFT, RIGHT. Natychmiastowe przełączanie między 3D a 2D.

---

## Architektura Rozwiązania

### Zasada Działania

```
┌─────────────────────────────────────────────────────────────┐
│                      Scene.tsx                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  cameraMode === 'perspective'                           ││
│  │  → PerspectiveCamera + OrbitControls (full 3D)         ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  cameraMode === 'orthographic'                          ││
│  │  → OrthographicCamera + limited controls                ││
│  │  → Transform axes constrained to 2D plane               ││
│  │  → Rotation only around perpendicular axis              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Mapowanie Widoków na Osie

| Widok  | Kierunek kamery       | Oś "do ekranu" | Osie edycji (2D) | Oś rotacji |
| ------ | --------------------- | -------------- | ---------------- | ---------- |
| TOP    | -Y (patrzy w dół)     | Y              | X, Z             | Y          |
| BOTTOM | +Y (patrzy w górę)    | Y              | X, Z             | Y          |
| FRONT  | -Z (patrzy do środka) | Z              | X, Y             | Z          |
| BACK   | +Z (patrzy na tył)    | Z              | X, Y             | Z          |
| LEFT   | +X (patrzy z lewej)   | X              | Z, Y             | X          |
| RIGHT  | -X (patrzy z prawej)  | X              | Z, Y             | X          |

---

## Fazy Implementacji

### Faza 1: Store i Typy (Podstawa)

**Pliki do utworzenia/modyfikacji:**

- `apps/app/src/types/camera.ts` - nowy plik
- `apps/app/src/lib/store/slices/viewSlice.ts` - nowy plik
- `apps/app/src/lib/store/types.ts` - rozszerzenie
- `apps/app/src/lib/store/index.ts` - integracja slice

**Implementacja:**

```typescript
// types/camera.ts
export type CameraMode = "perspective" | "orthographic";

export type OrthographicView =
  | "TOP" // -Y axis (looking down)
  | "BOTTOM" // +Y axis (looking up)
  | "FRONT" // -Z axis (looking forward)
  | "BACK" // +Z axis (looking backward)
  | "LEFT" // +X axis (looking from left)
  | "RIGHT"; // -X axis (looking from right)

export interface ViewState {
  cameraMode: CameraMode;
  orthographicView: OrthographicView;
  orthographicZoom: number; // zoom level for ortho camera
}

// Pre-calculated camera positions per view
export const ORTHOGRAPHIC_CAMERA_POSITIONS: Record<
  OrthographicView,
  {
    position: [number, number, number];
    up: [number, number, number];
    editableAxes: ("x" | "y" | "z")[];
    rotationAxis: "x" | "y" | "z";
  }
>;
```

```typescript
// store/slices/viewSlice.ts
export interface ViewSlice {
  cameraMode: CameraMode;
  orthographicView: OrthographicView;
  orthographicZoom: number;

  setCameraMode: (mode: CameraMode) => void;
  setOrthographicView: (view: OrthographicView) => void;
  setOrthographicZoom: (zoom: number) => void;
  toggleCameraMode: () => void;
}
```

---

### Faza 2: Kamera Ortograficzna

**Pliki do utworzenia/modyfikacji:**

- `apps/app/src/components/canvas/OrthographicCameraController.tsx` - nowy
- `apps/app/src/components/canvas/Scene.tsx` - modyfikacja

**Komponent OrthographicCameraController:**

```typescript
interface OrthographicCameraControllerProps {
  view: OrthographicView;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  target: [number, number, number]; // pivot point
}
```

**Funkcjonalność:**

- OrthographicCamera z @react-three/drei
- Pozycja kamery obliczana na podstawie `view` i `target`
- Pan (przesuwanie widoku) - mouse drag
- Zoom - scroll wheel → aktualizuje `orthographicZoom` w store
- Brak rotacji (locked orientation)
- Użycie MapControls z ograniczeniami zamiast OrbitControls

**Modyfikacja Scene.tsx:**

```tsx
// Conditional camera rendering
{cameraMode === 'perspective' ? (
  <PerspectiveCamera makeDefault position={[500, 500, 500]} fov={50} />
  <OrbitControls ref={controlsRef} ... />
) : (
  <OrthographicCameraController
    view={orthographicView}
    zoom={orthographicZoom}
    onZoomChange={setOrthographicZoom}
    target={sceneCenter}
  />
)}
```

---

### Faza 3: UI do Przełączania Widoków

**Pliki do utworzenia/modyfikacji:**

- `apps/app/src/components/canvas/ViewModePanel.tsx` - nowy
- `apps/app/src/components/canvas/Scene.tsx` - integracja
- `apps/app/src/lib/config.ts` - keyboard shortcuts

**ViewModePanel - Dropdown z widokami:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="h-8 gap-1 bg-background/80 backdrop-blur-sm">
      {cameraMode === "perspective" ? <Box className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
      <span className="hidden md:inline">
        {cameraMode === "perspective" ? "3D" : orthographicView}
      </span>
      <ChevronDown className="h-3 w-3" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setCameraMode("perspective")}>
      <Box className="h-4 w-4 mr-2" /> Widok 3D
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuLabel>Widoki ortograficzne</DropdownMenuLabel>
    {ORTHO_VIEWS.map((view) => (
      <DropdownMenuItem
        key={view}
        onClick={() => {
          setCameraMode("orthographic");
          setOrthographicView(view);
        }}
      >
        {getViewIcon(view)} {getViewLabel(view)}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

**Keyboard Shortcuts (config.ts):**

```typescript
// View mode shortcuts
VIEW_PERSPECTIVE: '1',    // lub 'p'
VIEW_TOP: '2',            // numpad też
VIEW_FRONT: '3',
VIEW_RIGHT: '4',
VIEW_BACK: '5',           // opcjonalnie
VIEW_LEFT: '6',           // opcjonalnie
VIEW_BOTTOM: '7',         // opcjonalnie
```

---

### Faza 4: Transform Controls 2D

**Pliki do utworzenia/modyfikacji:**

- `apps/app/src/components/canvas/Ortho2DTransformControls.tsx` - nowy
- `apps/app/src/components/canvas/PartTransformControls.tsx` - modyfikacja
- `apps/app/src/components/canvas/CabinetGroupTransform.tsx` - modyfikacja
- `apps/app/src/components/canvas/MultiSelectTransformControls.tsx` - modyfikacja

**Ortho2DTransformControls - Warstwa abstrakcji:**

Zamiast modyfikować wszystkie istniejące komponenty transform, stworzymy wrapper:

```tsx
interface Ortho2DTransformControlsProps {
  mode: "translate" | "rotate";
  view: OrthographicView;
  children: React.ReactNode; // wrapped TransformControls
}

// Logika:
// 1. Pobiera editableAxes dla danego view
// 2. Przekazuje do TransformControls showX/showY/showZ
// 3. Dla rotate - showX/Y/Z = tylko oś rotacji
```

**Modyfikacja TransformControls props:**

```tsx
// W widoku ortograficznym
<TransformControls
  mode={mode}
  showX={editableAxes.includes("x")}
  showY={editableAxes.includes("y")}
  showZ={editableAxes.includes("z")}
  // ...rest
/>
```

**Dla rotacji w 2D:**

- TOP/BOTTOM view: tylko rotacja wokół Y
- FRONT/BACK view: tylko rotacja wokół Z
- LEFT/RIGHT view: tylko rotacja wokół X

---

### Faza 5: Resize Controls 2D

**Pliki do modyfikacji:**

- `apps/app/src/components/canvas/PartResizeControls.tsx`
- `apps/app/src/components/canvas/CabinetResizeControls.tsx`
- `apps/app/src/components/canvas/MultiSelectResizeControls.tsx`

**Logika:**

- Ukryj handlej resize dla osi "do ekranu"
- TOP view: ukryj height+/height- (Y axis handles)
- FRONT view: ukryj depth+/depth- (Z axis handles)
- LEFT/RIGHT view: ukryj width+/width- (X axis handles)

```tsx
// W resize controls
const hiddenHandles = useMemo(() => {
  if (cameraMode !== 'orthographic') return [];

  switch (orthographicView) {
    case 'TOP':
    case 'BOTTOM':
      return ['height+', 'height-'];
    case 'FRONT':
    case 'BACK':
      return ['depth+', 'depth-'];
    case 'LEFT':
    case 'RIGHT':
      return ['width+', 'width-'];
  }
}, [cameraMode, orthographicView]);

// Filtruj handlej
{RESIZE_HANDLES.filter(h => !hiddenHandles.includes(h)).map(handle => ...)}
```

---

### Faza 6: Snapping 2D

**Pliki do modyfikacji:**

- `apps/app/src/lib/snap/calculatePartSnapV3.ts`
- `apps/app/src/lib/snap/snapTypes.ts`

**Strategia:**
Snapping już działa na wszystkich osiach. W widoku ortograficznym:

1. Filtruj punkty snap do tych na widocznych osiach
2. Ignoruj snap na osi "do ekranu"

```typescript
// W calculatePartSnapV3
function filterSnapPointsFor2D(
  snapPoints: SnapPoint[],
  view: OrthographicView | null
): SnapPoint[] {
  if (!view) return snapPoints;

  const perpendicularAxis = getPerpendicularAxis(view);

  return snapPoints.filter((point) => {
    // Pomiń snap points na osi prostopadłej do ekranu
    // lub dostosuj ich priorytet
    return point.axis !== perpendicularAxis;
  });
}
```

**Alternatywnie:** Prostsze podejście - snapping działa normalnie, ale pozycja na osi "do ekranu" jest zablokowana (nie może się zmienić podczas drag).

---

### Faza 7: Grid i Helpers 2D

**Pliki do modyfikacji:**

- `apps/app/src/components/canvas/Scene.tsx`

**W widoku ortograficznym:**

- Grid na płaszczyźnie widoku (nie na podłodze)
- TOP: grid na XZ (jak teraz)
- FRONT/BACK: grid na XY
- LEFT/RIGHT: grid na YZ

```tsx
// Grid rotation based on view
const gridRotation = useMemo(() => {
  switch (orthographicView) {
    case "TOP":
    case "BOTTOM":
      return [0, 0, 0];
    case "FRONT":
    case "BACK":
      return [-Math.PI / 2, 0, 0];
    case "LEFT":
    case "RIGHT":
      return [0, 0, Math.PI / 2];
  }
}, [orthographicView]);
```

---

## Struktura Plików (Podsumowanie)

```
apps/app/src/
├── types/
│   └── camera.ts                    # NOWY - typy CameraMode, OrthographicView
├── lib/
│   ├── config.ts                    # MOD - keyboard shortcuts
│   └── store/
│       ├── slices/
│       │   └── viewSlice.ts         # NOWY - view state slice
│       ├── types.ts                 # MOD - ViewSlice interface
│       └── index.ts                 # MOD - integracja viewSlice
└── components/
    ├── canvas/
    │   ├── Scene.tsx                # MOD - conditional camera
    │   ├── OrthographicCameraController.tsx  # NOWY
    │   ├── ViewModePanel.tsx        # NOWY - UI dropdown
    │   ├── Ortho2DTransformControls.tsx      # NOWY - wrapper
    │   ├── PartTransformControls.tsx         # MOD - 2D support
    │   ├── PartResizeControls.tsx            # MOD - hide handles
    │   ├── CabinetGroupTransform.tsx         # MOD - 2D support
    │   ├── CabinetResizeControls.tsx         # MOD - hide handles
    │   ├── MultiSelectTransformControls.tsx  # MOD - 2D support
    │   └── MultiSelectResizeControls.tsx     # MOD - hide handles
    └── GlobalKeyboardListener.tsx   # MOD - view shortcuts
```

---

## Kolejność Implementacji (Dependency Order)

1. **types/camera.ts** - brak zależności
2. **store/slices/viewSlice.ts** - zależy od types
3. **store/index.ts** - integracja slice
4. **OrthographicCameraController.tsx** - zależy od store
5. **ViewModePanel.tsx** - zależy od store
6. **Scene.tsx** - integracja kamery i UI
7. **config.ts + GlobalKeyboardListener.tsx** - skróty
8. **Ortho2DTransformControls.tsx** - wrapper
9. **PartTransformControls.tsx** - modyfikacja dla 2D
10. **PartResizeControls.tsx** - ukrycie handles
11. **Cabinet/MultiSelect controls** - analogiczne modyfikacje
12. **Snapping modifications** - opcjonalne

---

## Ryzyka i Mitigacje

| Ryzyko                                        | Prawdopodobieństwo | Mitygacja                                  |
| --------------------------------------------- | ------------------ | ------------------------------------------ |
| TransformControls z drei nie wspiera hideAxis | Średnie            | Użyć showX/showY/showZ props               |
| Snapping nie działa dobrze w 2D               | Niskie             | Zablokować oś prostopadłą w drag handler   |
| Performance przy przełączaniu                 | Niskie             | Natychmiastowe przełączenie (bez animacji) |
| Grid źle się renderuje w różnych widokach     | Średnie            | Użyć oddzielnych komponentów Grid          |

---

## Testy (Sugerowane)

1. **Unit Tests:**
   - viewSlice actions
   - ORTHOGRAPHIC_CAMERA_POSITIONS mapping
   - getEditableAxes helper

2. **Integration Tests:**
   - Przełączanie perspective ↔ orthographic
   - Zachowanie pozycji obiektów przy zmianie widoku
   - Transform constraints w każdym widoku

3. **Manual Testing:**
   - Translate w każdym z 6 widoków
   - Rotate w każdym z 6 widoków
   - Resize w każdym z 6 widoków
   - Snapping behavior
   - Keyboard shortcuts

---

## Estymacja Złożoności

| Faza                     | Złożoność | Nowe pliki | Modyfikacje |
| ------------------------ | --------- | ---------- | ----------- |
| 1. Store i Typy          | Niska     | 2          | 2           |
| 2. Kamera Ortograficzna  | Średnia   | 1          | 1           |
| 3. UI do Przełączania    | Niska     | 1          | 2           |
| 4. Transform Controls 2D | Średnia   | 1          | 3           |
| 5. Resize Controls 2D    | Niska     | 0          | 3           |
| 6. Snapping 2D           | Niska     | 0          | 1-2         |
| 7. Grid i Helpers        | Niska     | 0          | 1           |

**Łącznie:** 5 nowych plików, ~12 modyfikacji
