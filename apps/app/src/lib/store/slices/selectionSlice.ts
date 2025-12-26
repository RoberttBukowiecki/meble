import { v4 as uuidv4 } from "uuid";
import type { TransformMode, TransformSpace, Part, PartSnapshot } from "@/types";
import { DEFAULT_FURNITURE_ID } from "../constants";
import type { SelectionSlice, StoreSlice } from "../types";
import { HISTORY_LABELS } from "../history/constants";
import { generateId } from "../history/utils";
import { triggerDebouncedCollisionDetection } from "../utils";
import { PART_CONFIG } from "@/lib/config";

export const createSelectionSlice: StoreSlice<SelectionSlice> = (set, get) => ({
  selectedPartId: null,
  selectedCabinetId: null,
  selectedFurnitureId: DEFAULT_FURNITURE_ID,
  isTransforming: false,
  transformingPartId: null,
  transformingCabinetId: null,
  transformMode: "translate",
  transformSpace: "local",

  // Multiselect state
  selectedPartIds: new Set<string>(),
  multiSelectAnchorId: null,
  transformingPartIds: new Set<string>(),

  setSelectedFurniture: (id: string) => {
    set({
      selectedFurnitureId: id,
      selectedPartId: null,
      selectedCabinetId: null,
      selectedPartIds: new Set<string>(),
      multiSelectAnchorId: null,
    });
  },

  selectPart: (id: string | null) => {
    // Single select: clear multiselect and set single part
    if (id === null) {
      set({
        selectedPartId: null,
        selectedCabinetId: null,
        selectedPartIds: new Set<string>(),
        multiSelectAnchorId: null,
      });
    } else {
      set({
        selectedPartId: id,
        selectedCabinetId: null,
        selectedPartIds: new Set<string>([id]),
        multiSelectAnchorId: id,
      });
    }
  },

  selectCabinet: (id: string | null) => {
    if (id === null) {
      set({
        selectedCabinetId: null,
        selectedPartId: null,
        selectedPartIds: new Set<string>(),
        multiSelectAnchorId: null,
        selectedCountertopGroupId: null, // Clear countertop selection when deselecting cabinet
      });
    } else {
      // Set anchor to first part of cabinet for potential Shift+click range selection
      const cabinet = get().cabinets.find((c) => c.id === id);
      const firstPartId = cabinet?.partIds[0] || null;

      set({
        selectedCabinetId: id,
        selectedPartId: null,
        selectedPartIds: new Set<string>(),
        multiSelectAnchorId: firstPartId, // Enable Shift+click from this cabinet
      });
    }
  },

  setIsTransforming: (isTransforming: boolean) => {
    set({ isTransforming });
  },

  setTransformingPartId: (id: string | null) => {
    set({ transformingPartId: id });
  },

  setTransformingCabinetId: (id: string | null) => {
    set({ transformingCabinetId: id });
  },

  setTransformMode: (mode: TransformMode) => {
    set({ transformMode: mode });
  },

  setTransformSpace: (space: TransformSpace) => {
    set({ transformSpace: space });
  },

  // =========================================================================
  // Multiselect Actions
  // =========================================================================

  togglePartSelection: (id: string) => {
    const { selectedPartIds, multiSelectAnchorId } = get();
    const newSet = new Set(selectedPartIds);

    if (newSet.has(id)) {
      // Remove from selection
      newSet.delete(id);
    } else {
      // Add to selection
      newSet.add(id);
    }

    // Update selectedPartId to first item or null
    const firstId = newSet.size > 0 ? Array.from(newSet)[0] : null;

    // Set anchor if this is the first selection
    const newAnchor =
      newSet.size > 0
        ? multiSelectAnchorId && newSet.has(multiSelectAnchorId)
          ? multiSelectAnchorId
          : id
        : null;

    set({
      selectedPartIds: newSet,
      selectedPartId: firstId,
      selectedCabinetId: null, // Clear cabinet selection when multiselecting parts
      multiSelectAnchorId: newAnchor,
    });
  },

  addToSelection: (ids: string[]) => {
    if (ids.length === 0) return;

    const { selectedPartIds, multiSelectAnchorId } = get();
    const newSet = new Set(selectedPartIds);

    for (const id of ids) {
      newSet.add(id);
    }

    const firstId = newSet.size > 0 ? Array.from(newSet)[0] : null;
    const newAnchor = multiSelectAnchorId || ids[0];

    set({
      selectedPartIds: newSet,
      selectedPartId: firstId,
      selectedCabinetId: null,
      multiSelectAnchorId: newAnchor,
    });
  },

  removeFromSelection: (ids: string[]) => {
    if (ids.length === 0) return;

    const { selectedPartIds, multiSelectAnchorId } = get();
    const newSet = new Set(selectedPartIds);

    for (const id of ids) {
      newSet.delete(id);
    }

    const firstId = newSet.size > 0 ? Array.from(newSet)[0] : null;
    const newAnchor =
      multiSelectAnchorId && newSet.has(multiSelectAnchorId) ? multiSelectAnchorId : firstId;

    set({
      selectedPartIds: newSet,
      selectedPartId: firstId,
      multiSelectAnchorId: newAnchor,
    });
  },

  selectRange: (fromId: string, toId: string) => {
    const { parts, cabinets, selectedFurnitureId } = get();

    // Get parts in current furniture (ordered as they appear in table)
    const furnitureParts = parts.filter((p) => p.furnitureId === selectedFurnitureId);

    const fromIndex = furnitureParts.findIndex((p) => p.id === fromId);
    const toIndex = furnitureParts.findIndex((p) => p.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    // Get initial range of part IDs
    const rangeParts = furnitureParts.slice(startIndex, endIndex + 1);
    const rangeIdSet = new Set(rangeParts.map((p) => p.id));

    // For any cabinet part in the range, include ALL parts of that cabinet
    const cabinetIdsInRange = new Set<string>();
    for (const part of rangeParts) {
      if (part.cabinetMetadata?.cabinetId) {
        cabinetIdsInRange.add(part.cabinetMetadata.cabinetId);
      }
    }

    // Add all parts from cabinets that have any part in the range
    for (const cabinet of cabinets) {
      if (cabinetIdsInRange.has(cabinet.id)) {
        for (const partId of cabinet.partIds) {
          rangeIdSet.add(partId);
        }
      }
    }

    const rangeIds = Array.from(rangeIdSet);

    set({
      selectedPartIds: new Set(rangeIds),
      selectedPartId: rangeIds[0] || null,
      selectedCabinetId: null,
      multiSelectAnchorId: fromId,
    });
  },

  selectAll: () => {
    const { parts, selectedFurnitureId } = get();

    const furnitureParts = parts.filter((p) => p.furnitureId === selectedFurnitureId);
    const allIds = furnitureParts.map((p) => p.id);

    if (allIds.length === 0) return;

    set({
      selectedPartIds: new Set(allIds),
      selectedPartId: allIds[0],
      selectedCabinetId: null,
      multiSelectAnchorId: allIds[0],
    });
  },

  clearSelection: () => {
    set({
      selectedPartIds: new Set<string>(),
      selectedPartId: null,
      selectedCabinetId: null,
      multiSelectAnchorId: null,
      selectedCountertopGroupId: null, // Clear countertop selection too
    });
  },

  setTransformingPartIds: (ids: Set<string>) => {
    set({ transformingPartIds: ids });
  },

  // =========================================================================
  // Batch Operations
  // =========================================================================

  deleteSelectedParts: () => {
    const { selectedPartIds, parts, cabinets, pushEntry } = get();
    if (selectedPartIds.size === 0) return;

    // Capture parts to delete with their indices
    const partsToDelete: PartSnapshot[] = [];
    const idsToDelete = new Set(selectedPartIds);

    parts.forEach((part, index) => {
      if (idsToDelete.has(part.id)) {
        partsToDelete.push({ ...part, _index: index });
      }
    });

    if (partsToDelete.length === 0) return;

    // Record history entry
    pushEntry({
      type: "DELETE_MULTISELECT",
      targetIds: Array.from(selectedPartIds),
      furnitureId: partsToDelete[0].furnitureId,
      before: { parts: partsToDelete },
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: `${HISTORY_LABELS.DELETE_MULTISELECT} (${partsToDelete.length})`,
        kind: "geometry",
      },
    });

    // Update cabinets to remove deleted parts from their partIds
    const updatedCabinets = cabinets.map((cabinet) => {
      const hasDeletedParts = cabinet.partIds.some((pid) => idsToDelete.has(pid));
      if (hasDeletedParts) {
        return {
          ...cabinet,
          partIds: cabinet.partIds.filter((pid) => !idsToDelete.has(pid)),
          updatedAt: new Date(),
        };
      }
      return cabinet;
    });

    // Single state update
    set({
      parts: parts.filter((p) => !idsToDelete.has(p.id)),
      cabinets: updatedCabinets,
      selectedPartIds: new Set<string>(),
      selectedPartId: null,
      multiSelectAnchorId: null,
    });

    triggerDebouncedCollisionDetection(get);
  },

  duplicateSelectedParts: () => {
    const { selectedPartIds, parts, pushEntry } = get();
    if (selectedPartIds.size === 0) return;

    const now = new Date();
    const selectedParts = parts.filter((p) => selectedPartIds.has(p.id));

    if (selectedParts.length === 0) return;

    const offset = PART_CONFIG.DUPLICATE_OFFSET;

    const duplicates: Part[] = selectedParts.map((part) => ({
      ...part,
      id: uuidv4(),
      name: `${part.name} (kopia)`,
      position: [part.position[0] + offset, part.position[1], part.position[2]] as [
        number,
        number,
        number,
      ],
      createdAt: now,
      updatedAt: now,
      cabinetMetadata: undefined, // Remove cabinet association
      group: undefined, // Remove group association
    }));

    const newPartIds = duplicates.map((p) => p.id);

    // Record history entry
    pushEntry({
      type: "DUPLICATE_MULTISELECT",
      targetIds: newPartIds,
      furnitureId: duplicates[0].furnitureId,
      after: { parts: duplicates },
      meta: {
        id: generateId(),
        timestamp: Date.now(),
        label: `${HISTORY_LABELS.DUPLICATE_MULTISELECT} (${duplicates.length})`,
        kind: "geometry",
      },
    });

    // Single state update: add duplicates and select them
    set({
      parts: [...parts, ...duplicates],
      selectedPartIds: new Set(newPartIds),
      selectedPartId: newPartIds[0] || null,
      multiSelectAnchorId: newPartIds[0] || null,
    });

    triggerDebouncedCollisionDetection(get);
  },
});
