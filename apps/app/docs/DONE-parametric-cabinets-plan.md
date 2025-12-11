# Implementation Plan: Parametric Cabinets Feature

## Executive Summary

This plan details the implementation of parametric cabinet functionality for the Meblarz 3D furniture design application. Users will be able to create pre-configured cabinet templates (Kitchen, Wardrobe, Bookshelf, Drawer) with editable parameters, dual material selection (body + front), and flexible editing capabilities.

**Key Features:**
- 4 cabinet templates with configurable parameters
- Dual material system: body material (structure) + front material (doors/drawers)
- Smart selection: single click = entire cabinet, double click = individual part
- Parts remain editable after creation (with regeneration option)
- Full integration with existing Part/Material system

---

## User Requirements

### Cabinet Types
1. **Kitchen Cabinet** (Szafka kuchenna)
   - Parameters: width, height, depth, shelf count (0-5), hasDoors (boolean)
   - Components: bottom, top, left side, right side, shelves, optional doors

2. **Wardrobe** (Szafa ubraniowa)
   - Parameters: width, height, depth, shelf count (0-10), door count (1-4)
   - Components: bottom, top, sides, shelves, multiple doors

3. **Bookshelf** (Regał/Biblioteczka)
   - Parameters: width, height, depth, shelf count (1-10), hasBack (boolean)
   - Components: bottom, top, sides, shelves, optional back panel

4. **Drawer Cabinet** (Szafka z szufladami)
   - Parameters: width, height, depth, drawer count (2-8)
   - Components: bottom, top, sides, drawer fronts, drawer boxes

### Material System
- **Body Material**: Used for structure (sides, bottom, top, shelves, back panel)
- **Front Material**: Used for visible fronts (doors, drawer fronts)
- Materials are independent and can be changed separately

### Interaction Model
- **Single Click**: Selects entire cabinet (all parts move/rotate together)
- **Double Click**: Selects individual part for detailed editing
- **Editing**: Parts can be edited independently (with warning about regeneration)
- **Regeneration**: Updating cabinet parameters recreates parts (with confirmation)

---

## Architecture Overview

### Design Philosophy

Cabinets are **metadata containers** that generate and manage collections of standard `Part` objects:

1. **Cabinet Object**: Stores configuration (type, params, materials, partIds)
2. **Part Objects**: Standard parts with optional `cabinetMetadata` field
3. **Generators**: Functions that create part arrays based on cabinet parameters
4. **Selection Logic**: Store tracks both selectedPartId and selectedCabinetId
5. **Flexibility**: Parts remain editable, but regeneration overwrites changes (with confirmation)

### Benefits
- ✅ Minimal changes to existing Part system
- ✅ Parts remain standard objects (backward compatible)
- ✅ Easy to extend with new cabinet types
- ✅ Clear separation of concerns (metadata vs. actual parts)
- ✅ Natural persistence (cabinets + parts both stored in Zustand)

---

## Type System Changes

### File: `apps/app/src/types/index.ts`

#### New Types to Add

```typescript
// ============================================================================
// Cabinet Types
// ============================================================================

/**
 * Available cabinet template types
 */
export type CabinetType = 'KITCHEN' | 'WARDROBE' | 'BOOKSHELF' | 'DRAWER';

/**
 * Cabinet material configuration
 * Cabinets use two materials: body (structure) and front (visible surfaces)
 */
export interface CabinetMaterials {
  bodyMaterialId: string;   // For sides, bottom, top, shelves, back
  frontMaterialId: string;  // For doors, drawer fronts
}

/**
 * Base parameters shared by all cabinets
 */
export interface CabinetBaseParams {
  width: number;   // Overall width (mm)
  height: number;  // Overall height (mm)
  depth: number;   // Overall depth (mm)
}

/**
 * Kitchen cabinet specific parameters
 */
export interface KitchenCabinetParams extends CabinetBaseParams {
  type: 'KITCHEN';
  shelfCount: number;  // Number of internal shelves (0-5)
  hasDoors: boolean;   // Whether to add doors
}

/**
 * Wardrobe cabinet specific parameters
 */
export interface WardrobeCabinetParams extends CabinetBaseParams {
  type: 'WARDROBE';
  shelfCount: number;  // Number of internal shelves (0-10)
  doorCount: number;   // Number of doors (1-4)
}

/**
 * Bookshelf cabinet specific parameters
 */
export interface BookshelfCabinetParams extends CabinetBaseParams {
  type: 'BOOKSHELF';
  shelfCount: number;  // Number of shelves (1-10)
  hasBack: boolean;    // Whether to add back panel
}

/**
 * Drawer cabinet specific parameters
 */
export interface DrawerCabinetParams extends CabinetBaseParams {
  type: 'DRAWER';
  drawerCount: number; // Number of drawers (2-8)
}

/**
 * Discriminated union of all cabinet parameter types
 */
export type CabinetParams =
  | KitchenCabinetParams
  | WardrobeCabinetParams
  | BookshelfCabinetParams
  | DrawerCabinetParams;

/**
 * Cabinet metadata - stored separately from parts
 * References parts via cabinetId field in Part.cabinetMetadata
 */
export interface Cabinet {
  id: string;
  name: string;
  furnitureId: string;
  type: CabinetType;
  params: CabinetParams;
  materials: CabinetMaterials;
  partIds: string[];  // Array of part IDs that belong to this cabinet
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Part role within a cabinet
 * Used to identify what each part represents for material assignment
 */
export type CabinetPartRole =
  | 'BOTTOM'
  | 'TOP'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE'
  | 'BACK'
  | 'SHELF'
  | 'DOOR'
  | 'DRAWER_FRONT'
  | 'DRAWER_SIDE'
  | 'DRAWER_BACK'
  | 'DRAWER_BOTTOM';

/**
 * Extended metadata for parts that belong to cabinets
 */
export interface CabinetPartMetadata {
  cabinetId: string;
  role: CabinetPartRole;
  index?: number; // For shelves, doors, drawers (0-based)
}
```

#### Extend Existing Part Interface

```typescript
export interface Part {
  // ... existing fields ...

  /**
   * NEW: Cabinet membership metadata (optional)
   * If set, this part belongs to a cabinet and may be regenerated
   * when cabinet parameters change
   */
  cabinetMetadata?: CabinetPartMetadata;
}
```

#### Extend ProjectState Interface

```typescript
export interface ProjectState {
  // ... existing fields ...

  // NEW: Cabinet management
  cabinets: Cabinet[];
  selectedCabinetId: string | null;

  // NEW: Cabinet actions
  addCabinet: (
    furnitureId: string,
    type: CabinetType,
    params: CabinetParams,
    materials: CabinetMaterials
  ) => void;
  updateCabinet: (
    id: string,
    patch: Partial<Omit<Cabinet, 'id' | 'furnitureId' | 'createdAt'>>
  ) => void;
  updateCabinetParams: (id: string, params: CabinetParams) => void;
  removeCabinet: (id: string) => void;
  duplicateCabinet: (id: string) => void;
  selectCabinet: (id: string | null) => void;
}
```

---

## Store Implementation

### File: `apps/app/src/lib/store.ts`

#### State Changes

**Add to initial state:**
```typescript
cabinets: [],
selectedCabinetId: null,
```

**Update persist configuration:**
```typescript
{
  name: 'meblarz-storage',
  version: 2, // Increment from 1 to 2
  migrate: (persistedState: any, version: number) => {
    if (version === 1) {
      // Migration from v1 to v2: add cabinet fields
      return {
        ...persistedState,
        cabinets: [],
        selectedCabinetId: null,
      };
    }
    return persistedState;
  }
}
```

#### Action Implementations

**1. addCabinet**
```typescript
addCabinet: (furnitureId, type, params, materials) => {
  const cabinetId = uuidv4();
  const now = new Date();

  // Get body material for thickness reference
  const bodyMaterial = get().materials.find(m => m.id === materials.bodyMaterialId);
  if (!bodyMaterial) {
    console.error('Body material not found');
    return;
  }

  // Generate parts using appropriate generator
  const generator = getGeneratorForType(type);
  const generatedParts = generator(cabinetId, furnitureId, params, materials, bodyMaterial);

  // Add IDs and timestamps to parts
  const parts = generatedParts.map(part => ({
    ...part,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }));

  // Create cabinet object
  const cabinet: Cabinet = {
    id: cabinetId,
    name: `${getCabinetTypeName(type)} ${get().cabinets.length + 1}`,
    furnitureId,
    type,
    params,
    materials,
    partIds: parts.map(p => p.id),
    createdAt: now,
    updatedAt: now,
  };

  // Update store
  set(state => ({
    cabinets: [...state.cabinets, cabinet],
    parts: [...state.parts, ...parts],
    selectedCabinetId: cabinetId,
    selectedPartId: null,
  }));
}
```

**2. updateCabinet**
```typescript
updateCabinet: (id, patch) => {
  set(state => {
    const cabinetIndex = state.cabinets.findIndex(c => c.id === id);
    if (cabinetIndex === -1) return state;

    const cabinet = state.cabinets[cabinetIndex];
    const updatedPatch = { ...patch, updatedAt: new Date() };

    // If materials changed, update relevant parts
    let updatedParts = state.parts;
    if (patch.materials) {
      updatedParts = state.parts.map(part => {
        if (part.cabinetMetadata?.cabinetId !== id) return part;

        const isBodyPart = ['BOTTOM', 'TOP', 'LEFT_SIDE', 'RIGHT_SIDE', 'BACK', 'SHELF'].includes(
          part.cabinetMetadata.role
        );
        const isFrontPart = ['DOOR', 'DRAWER_FRONT'].includes(part.cabinetMetadata.role);

        if (isBodyPart && patch.materials.bodyMaterialId) {
          const newMaterial = state.materials.find(m => m.id === patch.materials.bodyMaterialId);
          return {
            ...part,
            materialId: patch.materials.bodyMaterialId,
            depth: newMaterial?.thickness ?? part.depth,
          };
        }
        if (isFrontPart && patch.materials.frontMaterialId) {
          const newMaterial = state.materials.find(m => m.id === patch.materials.frontMaterialId);
          return {
            ...part,
            materialId: patch.materials.frontMaterialId,
            depth: newMaterial?.thickness ?? part.depth,
          };
        }
        return part;
      });
    }

    const newCabinets = [...state.cabinets];
    newCabinets[cabinetIndex] = { ...cabinet, ...updatedPatch };

    return { cabinets: newCabinets, parts: updatedParts };
  });
}
```

**3. updateCabinetParams** (with regeneration)
```typescript
updateCabinetParams: (id, params) => {
  // This should be called AFTER user confirms regeneration dialog
  set(state => {
    const cabinet = state.cabinets.find(c => c.id === id);
    if (!cabinet) return state;

    const bodyMaterial = state.materials.find(m => m.id === cabinet.materials.bodyMaterialId);
    if (!bodyMaterial) return state;

    // Remove old parts
    const oldPartIds = new Set(cabinet.partIds);
    const remainingParts = state.parts.filter(p => !oldPartIds.has(p.id));

    // Generate new parts
    const generator = getGeneratorForType(params.type);
    const generatedParts = generator(id, cabinet.furnitureId, params, cabinet.materials, bodyMaterial);

    const now = new Date();
    const newParts = generatedParts.map(part => ({
      ...part,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));

    // Update cabinet
    const updatedCabinet = {
      ...cabinet,
      params,
      partIds: newParts.map(p => p.id),
      updatedAt: now,
    };

    return {
      cabinets: state.cabinets.map(c => c.id === id ? updatedCabinet : c),
      parts: [...remainingParts, ...newParts],
    };
  });
}
```

**4. removeCabinet**
```typescript
removeCabinet: (id) => {
  set(state => {
    const cabinet = state.cabinets.find(c => c.id === id);
    if (!cabinet) return state;

    return {
      cabinets: state.cabinets.filter(c => c.id !== id),
      parts: state.parts.filter(p => !cabinet.partIds.includes(p.id)),
      selectedCabinetId: state.selectedCabinetId === id ? null : state.selectedCabinetId,
    };
  });
}
```

**5. duplicateCabinet**
```typescript
duplicateCabinet: (id) => {
  const state = get();
  const cabinet = state.cabinets.find(c => c.id === id);
  if (!cabinet) return;

  const newCabinetId = uuidv4();
  const now = new Date();

  // Duplicate parts with new cabinet ID
  const oldParts = state.parts.filter(p => cabinet.partIds.includes(p.id));
  const newParts = oldParts.map(part => ({
    ...part,
    id: uuidv4(),
    name: part.name, // Keep same name
    position: [
      part.position[0] + 100, // Offset by 100mm on X
      part.position[1],
      part.position[2],
    ] as [number, number, number],
    cabinetMetadata: part.cabinetMetadata
      ? { ...part.cabinetMetadata, cabinetId: newCabinetId }
      : undefined,
    createdAt: now,
    updatedAt: now,
  }));

  // Create new cabinet
  const newCabinet: Cabinet = {
    ...cabinet,
    id: newCabinetId,
    name: `${cabinet.name} (kopia)`,
    partIds: newParts.map(p => p.id),
    createdAt: now,
    updatedAt: now,
  };

  set(state => ({
    cabinets: [...state.cabinets, newCabinet],
    parts: [...state.parts, ...newParts],
    selectedCabinetId: newCabinetId,
    selectedPartId: null,
  }));
}
```

**6. selectCabinet**
```typescript
selectCabinet: (id) => {
  set({ selectedCabinetId: id, selectedPartId: null });
}
```

**7. Modify removePart** (handle cabinet cleanup)
```typescript
removePart: (id) => {
  set(state => {
    const part = state.parts.find(p => p.id === id);

    // If part belongs to cabinet, remove from cabinet's partIds
    let updatedCabinets = state.cabinets;
    if (part?.cabinetMetadata) {
      updatedCabinets = state.cabinets.map(cabinet => {
        if (cabinet.id === part.cabinetMetadata.cabinetId) {
          return {
            ...cabinet,
            partIds: cabinet.partIds.filter(pid => pid !== id),
            updatedAt: new Date(),
          };
        }
        return cabinet;
      });
    }

    return {
      parts: state.parts.filter(p => p.id !== id),
      cabinets: updatedCabinets,
      selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
    };
  });
}
```

#### New Selectors

```typescript
/**
 * Get parts for a specific cabinet
 */
export const useCabinetParts = (cabinetId: string) => {
  return useStore(
    state => state.parts.filter(p => p.cabinetMetadata?.cabinetId === cabinetId)
  );
};

/**
 * Get the currently selected cabinet
 */
export const useSelectedCabinet = () => {
  const cabinets = useStore(state => state.cabinets);
  const selectedCabinetId = useStore(state => state.selectedCabinetId);
  return cabinets.find(c => c.id === selectedCabinetId);
};

/**
 * Get cabinet by ID
 */
export const useCabinet = (id: string | undefined) => {
  return useStore(state => state.cabinets.find(c => c.id === id));
};
```

---

## Cabinet Generators

### File: `apps/app/src/lib/cabinetGenerators.ts` (NEW)

#### Generator Interface

```typescript
/**
 * Generator function type
 * Returns array of parts WITHOUT id, createdAt, updatedAt (store adds these)
 */
export type CabinetGenerator = (
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material
) => Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[];

/**
 * Get appropriate generator for cabinet type
 */
export function getGeneratorForType(type: CabinetType): CabinetGenerator {
  switch (type) {
    case 'KITCHEN':
      return generateKitchenCabinet;
    case 'WARDROBE':
      return generateWardrobe;
    case 'BOOKSHELF':
      return generateBookshelf;
    case 'DRAWER':
      return generateDrawerCabinet;
  }
}
```

#### Kitchen Cabinet Generator

```typescript
export function generateKitchenCabinet(
  cabinetId: string,
  furnitureId: string,
  params: CabinetParams,
  materials: CabinetMaterials,
  bodyMaterial: Material
): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  if (params.type !== 'KITCHEN') throw new Error('Invalid params type');

  const parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const { width, height, depth, shelfCount, hasDoors } = params;
  const thickness = bodyMaterial.thickness;

  // 1. BOTTOM panel (sitting on ground, Y = thickness/2)
  parts.push({
    name: 'Dno',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: width, y: depth },
    width,
    height: depth,
    depth: thickness,
    position: [0, thickness / 2, 0],
    rotation: [0, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'BOTTOM' },
  });

  // 2. LEFT side panel (vertical, rotated 90° around Y)
  parts.push({
    name: 'Bok lewy',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: depth, y: height },
    width: depth,
    height: height,
    depth: thickness,
    position: [-width / 2 + thickness / 2, height / 2 + thickness, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'LEFT_SIDE' },
  });

  // 3. RIGHT side panel (mirror of left)
  parts.push({
    name: 'Bok prawy',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: depth, y: height },
    width: depth,
    height: height,
    depth: thickness,
    position: [width / 2 - thickness / 2, height / 2 + thickness, 0],
    rotation: [0, Math.PI / 2, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'RIGHT_SIDE' },
  });

  // 4. TOP panel
  parts.push({
    name: 'Góra',
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: width, y: depth },
    width,
    height: depth,
    depth: thickness,
    position: [0, height + thickness * 1.5, 0],
    rotation: [0, 0, 0],
    materialId: materials.bodyMaterialId,
    edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
    cabinetMetadata: { cabinetId, role: 'TOP' },
  });

  // 5. SHELVES (evenly spaced)
  const interiorHeight = height - thickness;
  const shelfSpacing = interiorHeight / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    const shelfY = thickness + shelfSpacing * (i + 1);
    parts.push({
      name: `Półka ${i + 1}`,
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: width - thickness * 2, y: depth - 10 },
      width: width - thickness * 2,
      height: depth - 10,
      depth: thickness,
      position: [0, shelfY, -5],
      rotation: [0, 0, 0],
      materialId: materials.bodyMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
      cabinetMetadata: { cabinetId, role: 'SHELF', index: i },
    });
  }

  // 6. DOORS (if enabled, two doors with 3mm gap)
  if (hasDoors) {
    const doorWidth = (width - thickness * 2 - 3) / 2;  // 3mm gap between doors
    const doorHeight = height - 2;

    parts.push({
      name: 'Front lewy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [-doorWidth / 2 - 1.5, height / 2 + thickness, depth / 2 + thickness + 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DOOR', index: 0 },
    });

    parts.push({
      name: 'Front prawy',
      furnitureId,
      group: cabinetId,
      shapeType: 'RECT',
      shapeParams: { type: 'RECT', x: doorWidth, y: doorHeight },
      width: doorWidth,
      height: doorHeight,
      depth: thickness,
      position: [doorWidth / 2 + 1.5, height / 2 + thickness, depth / 2 + thickness + 2],
      rotation: [0, 0, 0],
      materialId: materials.frontMaterialId,
      edgeBanding: { type: 'RECT', top: true, bottom: true, left: true, right: true },
      cabinetMetadata: { cabinetId, role: 'DOOR', index: 1 },
    });
  }

  return parts;
}
```

#### Other Generators (Similar Implementation)

```typescript
export function generateWardrobe(...): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Similar to kitchen but:
  // - Taller proportions
  // - Multiple doors (1-4 based on doorCount)
  // - More shelves allowed (0-10)
}

export function generateBookshelf(...): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Similar structure but:
  // - No doors (open front)
  // - Optional back panel (if hasBack)
  // - Focus on shelves (1-10)
}

export function generateDrawerCabinet(...): Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[] {
  // More complex:
  // - Drawer fronts (evenly spaced based on drawerCount)
  // - Optional: drawer boxes (sides, back, bottom per drawer)
  // - For MVP: just drawer fronts
}
```

#### Edge Banding Logic

**Standard edge banding rules:**
- **Shelves**: Top edge only (visible edge)
- **Sides**: Top + front + back edges (bottom sits on bottom panel)
- **Bottom/Top**: All edges (fully visible)
- **Doors/Drawer fronts**: All edges (fully visible)

---

## UI Components

### 1. New Component: CabinetTemplateDialog

**File:** `apps/app/src/components/ui/CabinetTemplateDialog.tsx`

Multi-step dialog for cabinet creation:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@meble/ui';
import { Button, Input, Label, Select } from '@meble/ui';
import { useStore } from '@/lib/store';

interface CabinetTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  furnitureId: string;
}

type Step = 'select' | 'configure' | 'materials';

export function CabinetTemplateDialog({ open, onOpenChange, furnitureId }: CabinetTemplateDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<CabinetType | null>(null);
  const [params, setParams] = useState<Partial<CabinetParams>>({});
  const [materials, setMaterials] = useState<CabinetMaterials | null>(null);

  const { addCabinet, materials: availableMaterials } = useStore();

  const handleCreate = () => {
    if (!selectedType || !params || !materials) return;
    addCabinet(furnitureId, selectedType, params as CabinetParams, materials);
    onOpenChange(false);
    // Reset state
    setStep('select');
    setSelectedType(null);
    setParams({});
    setMaterials(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dodaj szafkę</DialogTitle>
        </DialogHeader>

        {/* Step 1: Template Selection */}
        {step === 'select' && (
          <div className="grid grid-cols-2 gap-4">
            <TemplateCard
              type="KITCHEN"
              title="Szafka kuchenna"
              description="Podstawowa szafka z półkami i frontami"
              onClick={() => { setSelectedType('KITCHEN'); setStep('configure'); }}
            />
            <TemplateCard
              type="WARDROBE"
              title="Szafa ubraniowa"
              description="Wysoka szafa z drzwiami i półkami"
              onClick={() => { setSelectedType('WARDROBE'); setStep('configure'); }}
            />
            <TemplateCard
              type="BOOKSHELF"
              title="Regał/Biblioteczka"
              description="Otwarty regał z półkami"
              onClick={() => { setSelectedType('BOOKSHELF'); setStep('configure'); }}
            />
            <TemplateCard
              type="DRAWER"
              title="Szafka z szufladami"
              description="Szafka z frontami szufladowymi"
              onClick={() => { setSelectedType('DRAWER'); setStep('configure'); }}
            />
          </div>
        )}

        {/* Step 2: Parameter Configuration */}
        {step === 'configure' && selectedType && (
          <div className="space-y-4">
            <ParameterForm
              type={selectedType}
              params={params}
              onChange={setParams}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select')}>
                Wstecz
              </Button>
              <Button onClick={() => setStep('materials')}>
                Dalej: Materiały
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Material Selection */}
        {step === 'materials' && (
          <div className="space-y-4">
            <div>
              <Label>Materiał korpusu (boki, dno, góra, półki)</Label>
              <Select
                value={materials?.bodyMaterialId}
                onValueChange={(id) => setMaterials({ ...materials, bodyMaterialId: id })}
              >
                {availableMaterials.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.thickness}mm)
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Label>Materiał frontu (drzwi, szuflady)</Label>
              <Select
                value={materials?.frontMaterialId}
                onValueChange={(id) => setMaterials({ ...materials, frontMaterialId: id })}
              >
                {availableMaterials.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.thickness}mm)
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('configure')}>
                Wstecz
              </Button>
              <Button onClick={handleCreate} disabled={!materials?.bodyMaterialId || !materials?.frontMaterialId}>
                Utwórz szafkę
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Modify Sidebar

**File:** `apps/app/src/components/ui/Sidebar.tsx`

Add "Dodaj szafkę" button below "Dodaj część":

```typescript
import { Package } from 'lucide-react'; // Add icon import

// Inside component:
const [cabinetDialogOpen, setCabinetDialogOpen] = useState(false);

// In render (after "Dodaj część" button, around line 66):
<Button onClick={handleAddPart} className="w-full" size="sm">
  <Plus className="mr-2 h-4 w-4" />
  Dodaj część
</Button>

{/* NEW: Add cabinet button */}
<Button
  onClick={() => setCabinetDialogOpen(true)}
  variant="outline"
  className="w-full"
  size="sm"
>
  <Package className="mr-2 h-4 w-4" />
  Dodaj szafkę
</Button>

{/* Cabinet template dialog */}
<CabinetTemplateDialog
  open={cabinetDialogOpen}
  onOpenChange={setCabinetDialogOpen}
  furnitureId={selectedFurnitureId}
/>
```

### 3. Modify PropertiesPanel

**File:** `apps/app/src/components/ui/PropertiesPanel.tsx`

Add two modes: Cabinet mode and Part mode (enhanced).

**Cabinet Mode** (when selectedCabinetId !== null):
```typescript
const selectedCabinet = useSelectedCabinet();
const { updateCabinet, updateCabinetParams, removeCabinet, duplicateCabinet } = useStore();

if (selectedCabinet) {
  return (
    <div className="space-y-4 p-4">
      {/* Cabinet header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline">{getCabinetTypeLabel(selectedCabinet.type)}</Badge>
        <div className="space-x-2">
          <Button size="sm" variant="outline" onClick={() => duplicateCabinet(selectedCabinet.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDeleteCabinet()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Name */}
      <div>
        <Label>Nazwa szafki</Label>
        <Input
          value={selectedCabinet.name}
          onChange={(e) => updateCabinet(selectedCabinet.id, { name: e.target.value })}
        />
      </div>

      {/* Parameters (editable with warning) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Parametry
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Dynamic parameter inputs based on cabinet type */}
          <CabinetParameterEditor
            type={selectedCabinet.type}
            params={selectedCabinet.params}
            onChange={(newParams) => handleParamsChange(selectedCabinet.id, newParams)}
          />
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle>Materiały</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label>Korpus</Label>
            <Select
              value={selectedCabinet.materials.bodyMaterialId}
              onValueChange={(id) => updateCabinet(selectedCabinet.id, {
                materials: { ...selectedCabinet.materials, bodyMaterialId: id }
              })}
            >
              {/* Material options */}
            </Select>
          </div>
          <div>
            <Label>Front</Label>
            <Select
              value={selectedCabinet.materials.frontMaterialId}
              onValueChange={(id) => updateCabinet(selectedCabinet.id, {
                materials: { ...selectedCabinet.materials, frontMaterialId: id }
              })}
            >
              {/* Material options */}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parts list (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger>
          Części ({selectedCabinet.partIds.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* List of part names with click to select */}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

**Part Mode** (enhanced with cabinet info):
```typescript
const selectedPart = useSelectedPart();
const cabinet = selectedPart?.cabinetMetadata
  ? useCabinet(selectedPart.cabinetMetadata.cabinetId)
  : null;

// Add at top of existing PropertiesPanel:
{cabinet && (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Część szafki: {cabinet.name}</AlertTitle>
    <AlertDescription>
      Zmiany mogą być nadpisane przy aktualizacji parametrów szafki.
      <Button
        variant="link"
        size="sm"
        onClick={() => selectCabinet(cabinet.id)}
      >
        Przejdź do szafki
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 4. Modify PartsTable

**File:** `apps/app/src/components/ui/PartsTable.tsx`

Add "Szafka" column before "Grupa":

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Mebel</TableHead>
      <TableHead>Szafka</TableHead> {/* NEW */}
      <TableHead>Grupa</TableHead>
      {/* ... other columns */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {parts.map(part => {
      const cabinet = part.cabinetMetadata
        ? cabinets.find(c => c.id === part.cabinetMetadata.cabinetId)
        : null;

      return (
        <TableRow key={part.id} onClick={() => selectPart(part.id)}>
          <TableCell>{furniture?.name}</TableCell>
          <TableCell>
            {cabinet ? (
              <CabinetBadge
                cabinet={cabinet}
                onClick={(e) => {
                  e.stopPropagation();
                  selectCabinet(cabinet.id);
                }}
              />
            ) : (
              '-'
            )}
          </TableCell>
          {/* ... other cells */}
        </TableRow>
      );
    })}
  </TableBody>
</Table>
```

### 5. New Component: CabinetBadge

**File:** `apps/app/src/components/ui/CabinetBadge.tsx`

```typescript
'use client';

import { Badge } from '@meble/ui';
import { ChefHat, Shirt, BookOpen, Package } from 'lucide-react';
import type { Cabinet } from '@/types';

interface CabinetBadgeProps {
  cabinet: Cabinet;
  onClick?: (e: React.MouseEvent) => void;
}

function getCabinetIcon(type: CabinetType) {
  switch (type) {
    case 'KITCHEN': return <ChefHat className="h-3 w-3" />;
    case 'WARDROBE': return <Shirt className="h-3 w-3" />;
    case 'BOOKSHELF': return <BookOpen className="h-3 w-3" />;
    case 'DRAWER': return <Package className="h-3 w-3" />;
  }
}

export function CabinetBadge({ cabinet, onClick }: CabinetBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-muted"
      onClick={onClick}
    >
      {getCabinetIcon(cabinet.type)}
      <span className="ml-1">{cabinet.name}</span>
    </Badge>
  );
}
```

---

## 3D Interaction Changes

### Modify Part3D Component

**File:** `apps/app/src/components/canvas/Part3D.tsx`

Implement single/double click detection:

```typescript
'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store';

export function Part3D({ part }: { part: Part }) {
  const clickTimeRef = useRef<number>(0);
  const { selectPart, selectCabinet } = useStore();

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    const now = Date.now();
    const lastClick = clickTimeRef.current;
    clickTimeRef.current = now;

    const isDoubleClick = now - lastClick < 300;

    if (isDoubleClick) {
      // DOUBLE CLICK: Select individual part
      selectPart(part.id);
      selectCabinet(null);
    } else {
      // SINGLE CLICK: Wait to confirm it's not a double click
      setTimeout(() => {
        if (Date.now() - clickTimeRef.current >= 300) {
          // Confirmed single click
          if (part.cabinetMetadata) {
            // Part belongs to cabinet → select entire cabinet
            selectCabinet(part.cabinetMetadata.cabinetId);
            selectPart(null);
          } else {
            // Standalone part → select part
            selectPart(part.id);
            selectCabinet(null);
          }
        }
      }, 300);
    }
  };

  // Visual indicator: check if part's cabinet is selected
  const selectedCabinetId = useStore(state => state.selectedCabinetId);
  const selectedPartId = useStore(state => state.selectedPartId);

  const isPartSelected = selectedPartId === part.id;
  const isCabinetSelected = part.cabinetMetadata?.cabinetId === selectedCabinetId;

  return (
    <mesh onClick={handleClick} {...otherProps}>
      <meshStandardMaterial
        color={materialColor}
        emissive={isPartSelected ? '#4444ff' : (isCabinetSelected ? '#2222aa' : '#000000')}
        emissiveIntensity={isPartSelected ? 0.4 : (isCabinetSelected ? 0.2 : 0)}
      />
      {(isPartSelected || isCabinetSelected) && (
        <Edges color={isPartSelected ? '#4444ff' : '#2222aa'} />
      )}
    </mesh>
  );
}
```

### New Component: CabinetGroupTransform

**File:** `apps/app/src/components/canvas/CabinetGroupTransform.tsx`

Transform controls for entire cabinet:

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore, useCabinetParts } from '@/lib/store';
import * as THREE from 'three';

export function CabinetGroupTransform({ cabinetId }: { cabinetId: string }) {
  const parts = useCabinetParts(cabinetId);
  const { updatePart, transformMode, setIsTransforming } = useStore();
  const groupRef = useRef<THREE.Group>(null);
  const initialPositionsRef = useRef<Map<string, [number, number, number]>>(new Map());

  // Calculate cabinet center (bounding box center)
  const center = useMemo(() => {
    if (parts.length === 0) return [0, 0, 0] as [number, number, number];

    const positions = parts.map(p => p.position);
    const avgX = positions.reduce((sum, p) => sum + p[0], 0) / parts.length;
    const avgY = positions.reduce((sum, p) => sum + p[1], 0) / parts.length;
    const avgZ = positions.reduce((sum, p) => sum + p[2], 0) / parts.length;

    return [avgX, avgY, avgZ] as [number, number, number];
  }, [parts]);

  useEffect(() => {
    // Store initial positions relative to center
    parts.forEach(part => {
      initialPositionsRef.current.set(part.id, [
        part.position[0] - center[0],
        part.position[1] - center[1],
        part.position[2] - center[2],
      ]);
    });
  }, [parts, center]);

  const handleTransformEnd = () => {
    if (!groupRef.current) return;

    const newCenter = groupRef.current.position.toArray() as [number, number, number];
    const rotation = groupRef.current.rotation.toArray().slice(0, 3) as [number, number, number];

    // Update all parts
    parts.forEach(part => {
      const relativePos = initialPositionsRef.current.get(part.id) || [0, 0, 0];

      if (transformMode === 'translate') {
        updatePart(part.id, {
          position: [
            newCenter[0] + relativePos[0],
            newCenter[1] + relativePos[1],
            newCenter[2] + relativePos[2],
          ],
        });
      } else if (transformMode === 'rotate') {
        // Apply rotation to relative position
        const rotatedPos = applyRotation(relativePos, rotation);
        updatePart(part.id, {
          position: [
            newCenter[0] + rotatedPos[0],
            newCenter[1] + rotatedPos[1],
            newCenter[2] + rotatedPos[2],
          ],
          rotation: [
            part.rotation[0] + rotation[0],
            part.rotation[1] + rotation[1],
            part.rotation[2] + rotation[2],
          ],
        });
      }
    });

    setIsTransforming(false);
  };

  return (
    <group ref={groupRef} position={center}>
      <TransformControls
        mode={transformMode}
        onMouseDown={() => setIsTransforming(true)}
        onMouseUp={handleTransformEnd}
      />
    </group>
  );
}
```

### Modify Scene Component

**File:** `apps/app/src/components/canvas/Scene.tsx`

Conditionally render group transform:

```typescript
const selectedCabinetId = useStore(state => state.selectedCabinetId);

// In Scene JSX:
{selectedCabinetId && <CabinetGroupTransform cabinetId={selectedCabinetId} />}
```

---

## Implementation Phases

### Phase 1: Foundation (2-3 hours)
**Goal:** Set up type system and store infrastructure

- [ ] Add all new types to `types/index.ts`
- [ ] Extend Part interface with cabinetMetadata
- [ ] Add Cabinet state fields to store
- [ ] Update persist version to 2 with migration
- [ ] Implement basic store actions (addCabinet, removeCabinet, selectCabinet)
- [ ] Add cabinet selectors (useCabinetParts, useSelectedCabinet)
- [ ] Test: Create cabinet object manually in store, verify persistence

### Phase 2: Generators (3-4 hours)
**Goal:** Implement cabinet part generation logic

- [ ] Create `lib/cabinetGenerators.ts` file
- [ ] Implement `generateKitchenCabinet()` with full logic
- [ ] Implement `generateWardrobe()` with multiple door support
- [ ] Implement `generateBookshelf()` with optional back panel
- [ ] Implement `generateDrawerCabinet()` with drawer fronts
- [ ] Implement `getGeneratorForType()` dispatcher
- [ ] Test: Generate parts array, verify positions/dimensions/edge banding

### Phase 3: UI - Dialog & Sidebar (3-4 hours)
**Goal:** Create cabinet creation flow

- [ ] Create `CabinetTemplateDialog.tsx` component
- [ ] Implement Step 1: Template selection (4 cards with icons)
- [ ] Implement Step 2: Parameter form (dynamic based on type)
- [ ] Implement Step 3: Material selection (body + front)
- [ ] Wire up to store.addCabinet() action
- [ ] Add "Dodaj szafkę" button to Sidebar
- [ ] Test: Full cabinet creation flow, verify parts appear in 3D

### Phase 4: UI - Properties & Table (2-3 hours)
**Goal:** Enable cabinet editing and visualization

- [ ] Create `CabinetBadge.tsx` component
- [ ] Add cabinet mode to PropertiesPanel
- [ ] Add cabinet name/type display
- [ ] Add parameter editing UI with warning icon
- [ ] Add material selectors (body + front)
- [ ] Add duplicate/delete buttons
- [ ] Add "Szafka" column to PartsTable
- [ ] Make cabinet badges clickable
- [ ] Test: Edit cabinet, verify parts update

### Phase 5: 3D Interaction (3-4 hours)
**Goal:** Implement smart selection and group transform

- [ ] Modify Part3D click handler for single/double click
- [ ] Add visual indicators (emissive colors for selection states)
- [ ] Create `CabinetGroupTransform.tsx` component
- [ ] Calculate cabinet bounding box center
- [ ] Implement group translate logic
- [ ] Implement group rotate logic (maintain relative positions)
- [ ] Update Scene to render group controls conditionally
- [ ] Test: Single click → cabinet selected, double click → part selected

### Phase 6: Regeneration & Edge Cases (2-3 hours)
**Goal:** Handle parameter updates and edge cases

- [ ] Implement `updateCabinetParams()` with regeneration
- [ ] Add confirmation dialog for regeneration
- [ ] Modify `removePart()` to update cabinet.partIds
- [ ] Add warning in PropertiesPanel for cabinet parts
- [ ] Implement material sync when cabinet materials change
- [ ] Test: Delete part → verify cabinet.partIds updated
- [ ] Test: Change params → confirm → verify regeneration
- [ ] Test: Change materials → verify parts updated

### Phase 7: Polish & Testing (2-3 hours)
**Goal:** Final refinements and comprehensive testing

- [ ] Add loading states to dialog
- [ ] Add tooltips and help text
- [ ] Add keyboard shortcuts (optional)
- [ ] Comprehensive testing of all cabinet types
- [ ] Test persistence and reload
- [ ] Test CSV export with cabinet parts
- [ ] Fix any visual/UX issues
- [ ] Add Polish UI translations before release

**Total Estimated Time:** 17-24 hours

---

## Edge Cases & Error Handling

### 1. Part Deletion from Cabinet
**Scenario:** User deletes one part of a cabinet

**Behavior:**
- Part removed from parts array
- PartId removed from cabinet.partIds
- Cabinet remains valid (partial cabinet allowed)
- Show warning badge on cabinet in UI: "⚠️ Niepełna" or part count display

**Implementation:**
```typescript
// In removePart action:
if (part?.cabinetMetadata) {
  updatedCabinets = state.cabinets.map(cabinet => {
    if (cabinet.id === part.cabinetMetadata.cabinetId) {
      return {
        ...cabinet,
        partIds: cabinet.partIds.filter(pid => pid !== id),
      };
    }
    return cabinet;
  });
}
```

### 2. Manual Part Editing
**Scenario:** User manually edits a part that belongs to a cabinet

**Behavior:**
- Part updates normally via existing updatePart logic
- PropertiesPanel shows alert: "⚠️ Ta część należy do szafki. Zmiany mogą być nadpisane przy aktualizacji parametrów szafki."
- Part retains cabinetMetadata (still tracked)
- If cabinet params are later updated → regeneration → manual changes lost (with confirmation)

### 3. Cabinet Parameter Update
**Scenario:** User changes cabinet width/height/depth or shelf count

**Behavior:**
1. Show confirmation dialog:
   - Title: "Aktualizacja parametrów szafki"
   - Message: "Wygeneruje nowe części. Wszystkie manualne zmiany w częściach zostaną utracone. Czy kontynuować?"
   - Actions: "Anuluj" | "Zaktualizuj"
2. If confirmed:
   - Delete old parts (matching cabinetMetadata.cabinetId)
   - Generate new parts with new parameters
   - Preserve cabinet center position
   - Update cabinet object
3. If canceled: No changes

### 4. Material Changes
**Scenario:** User changes cabinet body material or front material

**Behavior:**
- Body material change → update materialId for all body-role parts (BOTTOM, TOP, SIDES, BACK, SHELF)
- Front material change → update materialId for front-role parts (DOOR, DRAWER_FRONT)
- Parts auto-update depth via existing store logic (depth = material.thickness)
- No regeneration needed (just material swap)

### 5. Cabinet Duplication
**Scenario:** User duplicates a cabinet

**Behavior:**
- Create new Cabinet object with new ID
- Duplicate all parts with new IDs
- Update cabinetMetadata.cabinetId in cloned parts
- Offset entire cabinet by +100mm on X-axis
- Append " (kopia)" to cabinet name
- Select new cabinet

### 6. Cabinet Deletion
**Scenario:** User deletes entire cabinet

**Behavior:**
1. Show confirmation dialog: "Usunąć szafkę '{name}' i wszystkie jej części ({count})?"
2. If confirmed:
   - Remove all parts where part.cabinetMetadata.cabinetId === cabinetId
   - Remove cabinet from cabinets array
   - Clear selection if deleted cabinet was selected
3. If canceled: No changes

### 7. Invalid Material References
**Scenario:** Cabinet references material that was deleted

**Behavior:**
- On cabinet load, validate material IDs exist
- If missing, show error badge: "⚠️ Brakujący materiał"
- Prevent editing until valid materials assigned
- Offer quick fix: "Wybierz nowy materiał"

### 8. CSV Export with Cabinets
**Scenario:** User exports CSV with cabinet parts

**Behavior:**
- Include cabinet name in "group" column or add new "cabinet" column
- Add cabinet metadata to notes: "Część szafki: {cabinetName}"
- No special handling needed (parts export normally)

---

## Testing Checklist

### Unit Tests (Optional for MVP)
- [ ] Cabinet generators produce correct number of parts
- [ ] Part positions are calculated correctly
- [ ] Edge banding is applied correctly per role
- [ ] Material assignment respects body vs. front roles

### Integration Tests
- [ ] Create each cabinet type (Kitchen, Wardrobe, Bookshelf, Drawer)
- [ ] Edit cabinet parameters and verify regeneration
- [ ] Delete cabinet and verify all parts removed
- [ ] Delete single part and verify cabinet.partIds updated
- [ ] Edit part manually and verify warning shows
- [ ] Change cabinet materials and verify parts update
- [ ] Single click selection (entire cabinet)
- [ ] Double click selection (individual part)
- [ ] Transform cabinet (all parts move together)
- [ ] Duplicate cabinet (verify independence)
- [ ] Save and reload (verify persistence)
- [ ] CSV export (verify cabinet parts included)

### Manual Test Scenarios

**Scenario 1: Create Kitchen Cabinet**
1. Click "Dodaj szafkę"
2. Select "Szafka kuchenna"
3. Set: width=800mm, height=900mm, depth=600mm, shelfCount=2, hasDoors=true
4. Select body material: Biały (18mm)
5. Select front material: Dąb (18mm)
6. Click "Utwórz szafkę"
7. Verify: 9 parts created (bottom, top, 2 sides, 2 shelves, 2 doors, expected count)
8. Verify: All parts visible in 3D scene
9. Verify: Cabinet appears in PartsTable with badge

**Scenario 2: Edit Cabinet Parameters**
1. Select kitchen cabinet created above
2. PropertiesPanel shows cabinet mode
3. Change shelfCount from 2 to 3
4. Confirmation dialog appears
5. Confirm regeneration
6. Verify: 10 parts now (added 1 shelf)
7. Verify: All parts repositioned correctly

**Scenario 3: Material Change**
1. Select cabinet
2. Change body material to Antracyt
3. Verify: All structural parts change color in 3D
4. Verify: Door material unchanged (still Dąb)
5. Change front material to Biały
6. Verify: Doors change color to white

**Scenario 4: Selection Modes**
1. Single click on cabinet part
2. Verify: All cabinet parts have blue outline
3. Verify: Transform controls show at cabinet center
4. Double click same part
5. Verify: Only that part has brighter outline
6. Verify: Transform controls show at part center

**Scenario 5: Part Deletion**
1. Select individual shelf part (double click)
2. Delete part
3. Verify: Part removed from 3D
4. Verify: Cabinet still exists
5. Select cabinet
6. Verify: Parts count decreased in PropertiesPanel

---

## Success Criteria

✅ Users can create 4 types of cabinets via intuitive template dialog
✅ Cabinets have configurable parameters (dimensions, shelf/door/drawer counts)
✅ Body and front materials are separate and independently editable
✅ Single click selects entire cabinet for group operations
✅ Double click selects individual part for detailed editing
✅ Parts remain fully editable after creation (with warning about regeneration)
✅ Cabinet parameter regeneration works with clear confirmation dialog
✅ UI clearly indicates cabinet membership (badges, alerts)
✅ All data persists correctly to localStorage
✅ CSV export includes cabinet parts without errors
✅ Follows project conventions:
  - English code/comments
  - Polish UI text
  - Theme colors (no hardcoded colors)
  - TypeScript strict mode (no `any`)

---

## Critical Files Summary

### New Files (7)
1. `apps/app/src/lib/cabinetGenerators.ts` - Generator functions for all cabinet types
2. `apps/app/src/components/ui/CabinetTemplateDialog.tsx` - Multi-step creation dialog
3. `apps/app/src/components/ui/CabinetBadge.tsx` - Cabinet badge component
4. `apps/app/src/components/ui/CabinetParameterEditor.tsx` - Dynamic parameter form
5. `apps/app/src/components/canvas/CabinetGroupTransform.tsx` - Group transform controls
6. `apps/app/src/lib/cabinetHelpers.ts` - Utility functions (type labels, icons, etc.)
7. `apps/app/docs/parametric-cabinets-plan.md` - This implementation plan

### Modified Files (7)
1. `apps/app/src/types/index.ts` - Add Cabinet types, extend Part & ProjectState
2. `apps/app/src/lib/store.ts` - Add cabinet state/actions, update persist version
3. `apps/app/src/components/ui/Sidebar.tsx` - Add "Dodaj szafkę" button
4. `apps/app/src/components/ui/PropertiesPanel.tsx` - Add cabinet edit mode
5. `apps/app/src/components/ui/PartsTable.tsx` - Add "Szafka" column
6. `apps/app/src/components/canvas/Part3D.tsx` - Single/double click handling
7. `apps/app/src/components/canvas/Scene.tsx` - Render cabinet group transform

---

## Future Enhancements (Post-MVP)

### Cabinet Features
- [ ] Custom cabinet templates (save user-created configurations)
- [ ] Cabinet library (industry-standard dimensions)
- [ ] Advanced parameters (custom shelf positions, adjustable drawer heights)
- [ ] Hardware visualization (hinges, handles, slides)
- [ ] Assembly instructions generation
- [ ] Exploded view for cabinets
- [ ] Cabinet nesting/stacking (multiple cabinets in row)
- [ ] Automatic cut list optimization per cabinet

### Developer Experience
- [ ] Unit tests for generator functions
- [ ] Integration tests for cabinet CRUD operations
- [ ] Visual regression tests for cabinet types
- [ ] Performance profiling (large cabinets with many parts)
- [ ] Generator function documentation with diagrams

### User Experience
- [ ] 3D preview in template dialog (before creation)
- [ ] Drag-and-drop cabinet positioning
- [ ] Snap-to-grid for cabinet placement
- [ ] Cabinet collision detection
- [ ] Batch cabinet creation (multiple similar cabinets)
- [ ] Cabinet variants (corner cabinets, wall-mounted, etc.)
- [ ] Import cabinet from template file (JSON)
- [ ] Export cabinet as reusable template

---

## Development Best Practices

### Code Organization
- Keep generator functions pure (no side effects)
- Use discriminated unions for type safety
- Validate inputs at boundaries (dialog form, store actions)
- Centralize cabinet-related constants (min/max dimensions, counts)

### Performance
- Memoize cabinet part filtering (useCabinetParts selector)
- Batch part updates during regeneration
- Use Three.js groups for transform efficiency
- Avoid unnecessary re-renders (specific selectors)

### Error Handling
- Validate material IDs before cabinet creation
- Handle missing materials gracefully
- Provide clear error messages in Polish
- Log errors to console in development

### Testing
- Test each cabinet type with edge parameters (min/max values)
- Test with deleted materials
- Test with partial cabinets (missing parts)
- Test persistence across browser sessions

---

## Notes for Implementation

### Polish UI Text Examples
```typescript
const translations = {
  cabinetDialog: {
    title: 'Dodaj szafkę',
    templateSelect: 'Wybierz typ szafki',
    parameters: 'Parametry',
    materials: 'Materiały',
    bodyMaterial: 'Materiał korpusu',
    frontMaterial: 'Materiał frontu',
    create: 'Utwórz szafkę',
    back: 'Wstecz',
    next: 'Dalej',
  },
  cabinetTypes: {
    KITCHEN: 'Szafka kuchenna',
    WARDROBE: 'Szafa ubraniowa',
    BOOKSHELF: 'Regał/Biblioteczka',
    DRAWER: 'Szafka z szufladami',
  },
  warnings: {
    regeneration: 'Wygeneruje nowe części. Manualne zmiany zostaną utracone. Czy kontynuować?',
    cabinetPart: 'Ta część należy do szafki. Zmiany mogą być nadpisane.',
    deleteCabinet: 'Usunąć szafkę "{name}" i wszystkie jej części ({count})?',
  },
};
```

### Dimension Constraints
```typescript
const CABINET_CONSTRAINTS = {
  width: { min: 200, max: 3000 },    // mm
  height: { min: 200, max: 3000 },   // mm
  depth: { min: 200, max: 800 },     // mm
  shelfCount: { min: 0, max: 10 },
  doorCount: { min: 1, max: 4 },
  drawerCount: { min: 2, max: 8 },
};
```

### Generator Helper Functions
```typescript
// Calculate evenly spaced shelf positions
function calculateShelfPositions(
  interiorHeight: number,
  shelfCount: number,
  bottomOffset: number = 0
): number[] {
  const spacing = interiorHeight / (shelfCount + 1);
  return Array.from({ length: shelfCount }, (_, i) => bottomOffset + spacing * (i + 1));
}

// Calculate door widths with gaps
function calculateDoorWidths(
  totalWidth: number,
  doorCount: number,
  thickness: number,
  gap: number = 3
): number[] {
  const availableWidth = totalWidth - thickness * 2 - gap * (doorCount - 1);
  const doorWidth = availableWidth / doorCount;
  return Array(doorCount).fill(doorWidth);
}
```

---

## Conclusion

This implementation plan provides a complete roadmap for adding parametric cabinet functionality to the Meblarz 3D application. The architecture is designed to be:

- **Flexible**: Parts remain editable, cabinets can be customized
- **Scalable**: Easy to add new cabinet types
- **User-friendly**: Intuitive UI with clear warnings
- **Maintainable**: Clean separation of concerns, type-safe code

By following this plan phase by phase, the feature can be implemented incrementally with testing at each step, ensuring a robust and production-ready result.
