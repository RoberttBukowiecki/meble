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
} from '@/types';

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
      selectedPartId: null,
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
          position: [0, 0, 0],
          rotation: [0, 0, 0],
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
        set((state) => ({
          parts: state.parts.filter((p) => p.id !== id),
          selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
        }));
      },

      /**
       * Select a part (or deselect if null)
       */
      selectPart: (id: string | null) => {
        set({ selectedPartId: id });
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
    }),
    {
      name: 'meblarz-storage', // localStorage key
      version: 1,
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
