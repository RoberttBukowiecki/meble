/**
 * Zustand store for furniture design application state management
 * Uses persist middleware for localStorage synchronization
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ProjectState,
  Part,
  Material,
  Furniture,
  ShapeParams,
  EdgeBanding,
  Cabinet,
  CabinetType,
  CabinetParams,
  CabinetMaterials,
} from '@/types';
import { getGeneratorForType } from './cabinetGenerators';
import { Euler, Quaternion, Vector3 } from 'three';

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_FURNITURE_ID = uuidv4();

const initialMaterials: Material[] = [
  {
    id: uuidv4(),
    name: 'Biały',
    color: '#FFFFFF',
    thickness: 18,
  },
  {
    id: uuidv4(),
    name: 'Dąb',
    color: '#D4A574',
    thickness: 18,
  },
  {
    id: uuidv4(),
    name: 'Antracyt',
    color: '#2D2D2D',
    thickness: 18,
  },
];

const initialFurnitures: Furniture[] = [
  {
    id: DEFAULT_FURNITURE_ID,
    name: 'Domyślny mebel',
  },
];

// Helper: calculate cabinet transform (center + shared rotation) from existing parts
const getCabinetTransform = (parts: Part[]) => {
  const center = new Vector3();
  if (parts.length > 0) {
    parts.forEach((p) => center.add(new Vector3().fromArray(p.position)));
    center.divideScalar(parts.length);
  }

  // Prefer bottom panel as reference for rotation (it has zero base rotation)
  const referencePart =
    parts.find((p) => p.cabinetMetadata?.role === 'BOTTOM') ?? parts[0];

  const rotation = referencePart?.rotation
    ? new Quaternion().setFromEuler(new Euler().fromArray(referencePart.rotation))
    : new Quaternion(); // identity

  return { center, rotation };
};

// Helper: apply saved transform to freshly generated cabinet parts
const applyCabinetTransform = <T extends Omit<Part, 'id' | 'createdAt' | 'updatedAt'>>(
  generatedParts: T[],
  targetCenter: Vector3,
  rotation: Quaternion
) => {
  if (generatedParts.length === 0) return generatedParts;

  // Base center of newly generated (untransformed) parts
  const baseCenter = new Vector3();
  generatedParts.forEach((p) => baseCenter.add(new Vector3().fromArray(p.position)));
  baseCenter.divideScalar(generatedParts.length);

  const rotatedBaseCenter = baseCenter.clone().applyQuaternion(rotation);
  const offset = targetCenter.clone().sub(rotatedBaseCenter);

  return generatedParts.map((part) => {
    const finalPosition = new Vector3()
      .fromArray(part.position)
      .applyQuaternion(rotation)
      .add(offset);

    const partQuat = new Quaternion().setFromEuler(new Euler().fromArray(part.rotation));
    const finalQuat = partQuat.premultiply(rotation);
    const finalEuler = new Euler().setFromQuaternion(finalQuat);

    return {
      ...part,
      position: finalPosition.toArray() as [number, number, number],
      rotation: [finalEuler.x, finalEuler.y, finalEuler.z] as [number, number, number],
    };
  });
};

// ============================================================================
// Store
// ============================================================================

export const useStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // State
      // ========================================================================
      parts: [],
      materials: initialMaterials,
      furnitures: initialFurnitures,
      cabinets: [],
      selectedPartId: null,
      selectedCabinetId: null,
      selectedFurnitureId: DEFAULT_FURNITURE_ID,
      isTransforming: false,
      transformMode: 'translate',

      // ========================================================================
      // Furniture Actions
      // ========================================================================

      /**
       * Add a new furniture item
       */
      addFurniture: (name: string) => {
        const newFurniture: Furniture = {
          id: uuidv4(),
          name,
        };
        set((state) => ({
          furnitures: [...state.furnitures, newFurniture],
        }));
      },

      /**
       * Remove furniture and all associated parts
       */
      removeFurniture: (id: string) => {
        set((state) => ({
          furnitures: state.furnitures.filter((f) => f.id !== id),
          parts: state.parts.filter((p) => p.furnitureId !== id),
          selectedFurnitureId:
            state.selectedFurnitureId === id
              ? state.furnitures[0]?.id || DEFAULT_FURNITURE_ID
              : state.selectedFurnitureId,
          selectedPartId:
            state.parts.find((p) => p.id === state.selectedPartId)
              ?.furnitureId === id
              ? null
              : state.selectedPartId,
        }));
      },

      /**
       * Set the currently selected furniture
       */
      setSelectedFurniture: (id: string) => {
        set({ selectedFurnitureId: id, selectedPartId: null });
      },

      // ========================================================================
      // Part Actions
      // ========================================================================

      /**
       * Add a new part with default properties
       */
      addPart: (furnitureId: string) => {
        const defaultMaterial = get().materials[0];
        if (!defaultMaterial) {
          console.error('No materials available');
          return;
        }

        const now = new Date();

        const defaultShapeParams: ShapeParams = {
          type: 'RECT',
          x: 600,
          y: 400,
        };

        const defaultEdgeBanding: EdgeBanding = {
          type: 'RECT',
          top: false,
          bottom: false,
          left: false,
          right: false,
        };

        const defaultPosition: [number, number, number] = [
          0,
          defaultMaterial.thickness / 2,
          0,
        ];
        const defaultRotation: [number, number, number] = [
          -Math.PI / 2,
          0,
          0,
        ]; // Lay the part flat on the ground by default

        const newPart: Part = {
          id: uuidv4(),
          name: `Część ${get().parts.length + 1}`,
          furnitureId,
          group: undefined,
          shapeType: 'RECT',
          shapeParams: defaultShapeParams,
          width: 600,
          height: 400,
          depth: defaultMaterial.thickness,
          position: defaultPosition,
          rotation: defaultRotation,
          materialId: defaultMaterial.id,
          edgeBanding: defaultEdgeBanding,
          notes: undefined,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          parts: [...state.parts, newPart],
          selectedPartId: newPart.id,
        }));
      },

      /**
       * Update part properties
       * Automatically syncs depth with material thickness when material changes
       */
      updatePart: (id: string, patch: Partial<Part>) => {
        set((state) => {
          const partIndex = state.parts.findIndex((p) => p.id === id);
          if (partIndex === -1) return state;

          const currentPart = state.parts[partIndex];
          let updatedPatch = { ...patch };

          // Auto-sync depth with material thickness
          if (patch.materialId && patch.materialId !== currentPart.materialId) {
            const newMaterial = state.materials.find(
              (m) => m.id === patch.materialId
            );
            if (newMaterial) {
              updatedPatch.depth = newMaterial.thickness;
            }
          }

          // Auto-update width/height from shapeParams if changed
          if (patch.shapeParams) {
            const params = patch.shapeParams;
            switch (params.type) {
              case 'RECT':
                updatedPatch.width = params.x;
                updatedPatch.height = params.y;
                break;
              case 'TRAPEZOID':
                updatedPatch.width = Math.max(params.frontX, params.backX);
                updatedPatch.height = params.y;
                break;
              case 'L_SHAPE':
                updatedPatch.width = params.x;
                updatedPatch.height = params.y;
                break;
              case 'POLYGON':
                // Calculate bounding box
                const xs = params.points.map((p) => p[0]);
                const ys = params.points.map((p) => p[1]);
                updatedPatch.width = Math.max(...xs) - Math.min(...xs);
                updatedPatch.height = Math.max(...ys) - Math.min(...ys);
                break;
            }
          }

          // Update timestamp
          updatedPatch.updatedAt = new Date();

          const newParts = [...state.parts];
          newParts[partIndex] = { ...currentPart, ...updatedPatch };

          return { parts: newParts };
        });
      },

      /**
       * Remove a part
       */
      removePart: (id: string) => {
        set((state) => {
          const part = state.parts.find((p) => p.id === id);

          // If part belongs to cabinet, remove from cabinet's partIds
          let updatedCabinets = state.cabinets;
          if (part?.cabinetMetadata) {
            updatedCabinets = state.cabinets.map((cabinet) => {
              if (cabinet.id === part.cabinetMetadata?.cabinetId) {
                return {
                  ...cabinet,
                  partIds: cabinet.partIds.filter((pid) => pid !== id),
                  updatedAt: new Date(),
                };
              }
              return cabinet;
            });
          }

          return {
            parts: state.parts.filter((p) => p.id !== id),
            cabinets: updatedCabinets,
            selectedPartId:
              state.selectedPartId === id ? null : state.selectedPartId,
          };
        });
      },

      /**
       * Select a part (or deselect if null)
       */
      selectPart: (id: string | null) => {
        set({ selectedPartId: id, selectedCabinetId: null });
      },

      /**
       * Select a cabinet (or deselect if null)
       */
      selectCabinet: (id: string | null) => {
        set({ selectedCabinetId: id, selectedPartId: null });
      },

      /**
       * Set transformation state (used to disable OrbitControls during transforms)
       */
      setIsTransforming: (isTransforming: boolean) => {
        set({ isTransforming });
      },

      /**
       * Set transform mode (translate or rotate)
       */
      setTransformMode: (mode: 'translate' | 'rotate') => {
        set({ transformMode: mode });
      },

      /**
       * Duplicate a part with all its properties
       * Offsets position by +50mm on X-axis
       */
      duplicatePart: (id: string) => {
        const state = get();
        const partToDuplicate = state.parts.find((p) => p.id === id);
        if (!partToDuplicate) {
          console.error('Part not found for duplication');
          return;
        }

        const now = new Date();
        const newPart: Part = {
          ...partToDuplicate,
          id: uuidv4(),
          name: `${partToDuplicate.name} (kopia)`,
          position: [
            partToDuplicate.position[0] + 50,
            partToDuplicate.position[1],
            partToDuplicate.position[2],
          ] as [number, number, number],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          parts: [...state.parts, newPart],
          selectedPartId: newPart.id,
        }));
      },

      // ========================================================================
      // Material Actions
      // ========================================================================

      /**
       * Add a new material
       */
      addMaterial: (material: Omit<Material, 'id'>) => {
        const newMaterial: Material = {
          ...material,
          id: uuidv4(),
        };
        set((state) => ({
          materials: [...state.materials, newMaterial],
        }));
      },

      /**
       * Update material properties
       * Note: Does NOT auto-update part depths (by design - user should manually update)
       */
      updateMaterial: (id: string, patch: Partial<Material>) => {
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        }));
      },

      /**
       * Remove a material
       * Warning: Does not cascade delete - parts may reference deleted material
       */
      removeMaterial: (id: string) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }));
      },

      // ========================================================================
      // Cabinet Actions
      // ========================================================================
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
          name: `Szafka ${get().cabinets.length + 1}`,
          furnitureId,
          type,
          params,
          materials,
          topBottomPlacement: params.topBottomPlacement, // Store the placement
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
      },

      updateCabinet: (id, patch) => {
        set(state => {
          const cabinetIndex = state.cabinets.findIndex(c => c.id === id);
          if (cabinetIndex === -1) return state;

          const cabinet = state.cabinets[cabinetIndex];
          const cabinetParts = state.parts.filter(p => cabinet.partIds.includes(p.id));
          const { center, rotation } = getCabinetTransform(cabinetParts);

          const materials = patch.materials
            ? { ...cabinet.materials, ...patch.materials }
            : cabinet.materials;

          const params = patch.topBottomPlacement
            ? { ...cabinet.params, topBottomPlacement: patch.topBottomPlacement }
            : cabinet.params;

          const shouldRegenerate =
            Boolean(patch.materials) ||
            (patch.topBottomPlacement && patch.topBottomPlacement !== cabinet.topBottomPlacement);

          if (shouldRegenerate) {
            const bodyMaterial = state.materials.find(m => m.id === materials.bodyMaterialId);
            if (!bodyMaterial) return state; // Should not happen

            // Generate new parts with preserved transform
            const generator = getGeneratorForType(cabinet.type);
            const generatedParts = generator(id, cabinet.furnitureId, params, materials, bodyMaterial);
            const transformedParts = applyCabinetTransform(generatedParts, center, rotation);

            const now = new Date();
            const newParts = transformedParts.map(part => ({
              ...part,
              id: uuidv4(),
              createdAt: now,
              updatedAt: now,
            }));

            const remainingParts = state.parts.filter(p => !cabinet.partIds.includes(p.id));

            const updatedCabinet = {
              ...cabinet,
              ...patch,
              params,
              materials,
              topBottomPlacement: params.topBottomPlacement,
              partIds: newParts.map(p => p.id),
              updatedAt: now,
            };

            return {
              cabinets: state.cabinets.map(c => c.id === id ? updatedCabinet : c),
              parts: [...remainingParts, ...newParts],
            };
          }

          const updatedPatch = { ...patch, updatedAt: new Date() };

          const newCabinets = [...state.cabinets];
          newCabinets[cabinetIndex] = { ...cabinet, ...updatedPatch };

          return { cabinets: newCabinets };
        });
      },

      updateCabinetParams: (id, params) => {
        // This should be called AFTER user confirms regeneration dialog
        set(state => {
          const cabinet = state.cabinets.find(c => c.id === id);
          if (!cabinet) return state;

          const bodyMaterial = state.materials.find(m => m.id === cabinet.materials.bodyMaterialId);
          if (!bodyMaterial) return state;

          const cabinetParts = state.parts.filter(p => cabinet.partIds.includes(p.id));
          const { center, rotation } = getCabinetTransform(cabinetParts);

          // Generate new parts
          const generator = getGeneratorForType(params.type);
          const generatedParts = generator(id, cabinet.furnitureId, params, cabinet.materials, bodyMaterial);
          const transformedParts = applyCabinetTransform(generatedParts, center, rotation);


          const now = new Date();
          const newParts = transformedParts.map(part => ({
            ...part,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          }));

          const oldPartIds = new Set(cabinet.partIds);
          const remainingParts = state.parts.filter(p => !oldPartIds.has(p.id));

          // Update cabinet
          const updatedCabinet = {
            ...cabinet,
            params,
            type: params.type,
            topBottomPlacement: params.topBottomPlacement,
            partIds: newParts.map(p => p.id),
            updatedAt: now,
          };

          return {
            cabinets: state.cabinets.map(c => c.id === id ? updatedCabinet : c),
            parts: [...remainingParts, ...newParts],
          };
        });
      },

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
      },

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
      },
    }),
    {
      name: 'meblarz-storage', // localStorage key
      version: 2,
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
      },
    }
  )
);

// ============================================================================
// Selectors (for optimized component re-renders)
// ============================================================================

/**
 * Get parts for the currently selected furniture
 */
export const useSelectedFurnitureParts = () => {
  const parts = useStore((state) => state.parts);
  const selectedFurnitureId = useStore((state) => state.selectedFurnitureId);
  return parts.filter((p) => p.furnitureId === selectedFurnitureId);
};

/**
 * Get the currently selected part
 */
export const useSelectedPart = () => {
  const parts = useStore((state) => state.parts);
  const selectedPartId = useStore((state) => state.selectedPartId);
  return parts.find((p) => p.id === selectedPartId);
};

/**
 * Get a material by ID
 */
export const useMaterial = (id: string | undefined) => {
  return useStore((state) => state.materials.find((m) => m.id === id));
};

/**
 * Get parts for a specific cabinet
 */
export const useCabinetParts = (cabinetId: string) => {
  return useStore((state) =>
    state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId)
  );
};

/**
 * Get the currently selected cabinet
 */
export const useSelectedCabinet = () => {
  const cabinets = useStore((state) => state.cabinets);
  const selectedCabinetId = useStore((state) => state.selectedCabinetId);
  return cabinets.find((c) => c.id === selectedCabinetId);
};

/**
 * Get cabinet by ID
 */
export const useCabinet = (id: string | undefined) => {
  return useStore((state) => state.cabinets.find((c) => c.id === id));
};
