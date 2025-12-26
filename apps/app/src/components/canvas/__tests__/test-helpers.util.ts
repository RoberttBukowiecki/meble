/**
 * Shared utilities for render performance tests
 */

import React, { useRef } from "react";
import { act } from "@testing-library/react";
import { useStore, useSelectedFurnitureParts, useIsPartHidden } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { Part, Material, Room, WallSegment } from "@/types";
import { DEFAULT_FURNITURE_ID } from "@/lib/store/constants";

// ============================================================================
// Test Data Factories
// ============================================================================

export function createTestPart(id: string, name: string, furnitureId = DEFAULT_FURNITURE_ID): Part {
  return {
    id,
    name,
    furnitureId,
    width: 100,
    height: 50,
    depth: 18,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    materialId: "mat-1",
    shapeType: "RECT",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestMaterial(id: string): Material {
  return {
    id,
    name: "Test Material",
    color: "#8B4513",
    thickness: 18,
    category: "board",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestRoom(id: string): Room {
  return {
    id,
    name: `Room ${id}`,
    origin: [0, 0],
    heightMm: 2700,
    wallThicknessMm: 120,
  };
}

export function createTestWall(id: string, roomId: string): WallSegment {
  return {
    id,
    roomId,
    start: [0, 0],
    end: [3000, 0],
    heightMm: 2700,
    thicknessMm: 120,
  };
}

export function createTestCabinet(id: string, furnitureId = DEFAULT_FURNITURE_ID) {
  return {
    id,
    name: `Cabinet ${id}`,
    furnitureId,
    type: "base" as const,
    params: { width: 600, height: 720, depth: 560 },
    materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
    partIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Store Reset
// ============================================================================

export function resetStore() {
  useStore.setState({
    parts: [],
    materials: [createTestMaterial("mat-1")],
    cabinets: [],
    rooms: [],
    walls: [],
    openings: [],
    lights: [],
    selectedPartId: null,
    selectedCabinetId: null,
    selectedPartIds: new Set<string>(),
    selectedCountertopGroupId: null,
    collisions: [],
    hiddenPartIds: new Set<string>(),
    isTransforming: false,
    transformingPartId: null,
    transformingCabinetId: null,
    transformingPartIds: new Set<string>(),
  });
}

// ============================================================================
// Mock Components
// ============================================================================

/**
 * Mock Part3D component that simulates the real component's store usage
 */
export function MockPart3D({
  part,
  renderCounters,
}: {
  part: Part;
  renderCounters: Map<string, number>;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set(`part-${part.id}`, renderCount.current);

  // Use exact same selector pattern as real Part3D
  const {
    selectedPartId,
    selectedPartIds,
    selectedCabinetId,
    collisions,
    transformingPartId,
    transformingCabinetId,
    transformingPartIds,
  } = useStore(
    useShallow((state) => ({
      selectedPartId: state.selectedPartId,
      selectedPartIds: state.selectedPartIds,
      selectedCabinetId: state.selectedCabinetId,
      collisions: state.collisions,
      transformingPartId: state.transformingPartId,
      transformingCabinetId: state.transformingCabinetId,
      transformingPartIds: state.transformingPartIds,
    }))
  );

  // Use optimized hidden state selector
  const isManuallyHidden = useIsPartHidden(part.id);

  return React.createElement(
    "div",
    { "data-testid": `mock-part-${part.id}` },
    `${part.name} - renders: ${renderCount.current}`
  );
}

/**
 * Mock Scene component that simulates the real Scene's store usage
 */
export function MockScene({ renderCounters }: { renderCounters: Map<string, number> }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set("scene", renderCount.current);

  const parts = useSelectedFurnitureParts();

  // Use exact same selector pattern as real Scene
  const {
    isTransforming,
    transformMode,
    selectedCabinetId,
    selectedPartId,
    snapEnabled,
    snapSettings,
    dimensionSettings,
    showGrid,
    graphicsSettings,
    rooms,
    cabinets,
    countertopGroups,
    selectedFurnitureId,
    transformingCabinetId,
  } = useStore(
    useShallow((state) => ({
      isTransforming: state.isTransforming,
      transformMode: state.transformMode,
      selectedCabinetId: state.selectedCabinetId,
      selectedPartId: state.selectedPartId,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      dimensionSettings: state.dimensionSettings,
      showGrid: state.showGrid,
      graphicsSettings: state.graphicsSettings,
      rooms: state.rooms,
      cabinets: state.cabinets,
      countertopGroups: state.countertopGroups,
      selectedFurnitureId: state.selectedFurnitureId,
      transformingCabinetId: state.transformingCabinetId,
    }))
  );

  return React.createElement(
    "div",
    { "data-testid": "mock-scene" },
    `Scene renders: ${renderCount.current}`,
    parts.map((part) =>
      React.createElement(MockPart3D, {
        key: part.id,
        part,
        renderCounters,
      })
    )
  );
}

/**
 * Optimized Mock Part3D with individual selectors (ideal pattern)
 */
export function OptimizedMockPart3D({
  partId,
  renderCounters,
}: {
  partId: string;
  renderCounters: Map<string, number>;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set(`optimized-${partId}`, renderCount.current);

  // OPTIMIZED: Individual selectors for each boolean check
  const isSelected = useStore((state) => state.selectedPartIds.has(partId));
  const isSingleSelected = useStore((state) => state.selectedPartId === partId);
  const isTransforming = useStore((state) => state.transformingPartId === partId);
  const isTransformingMulti = useStore((state) => state.transformingPartIds.has(partId));
  const isHidden = useIsPartHidden(partId);

  return React.createElement(
    "div",
    { "data-testid": `optimized-part-${partId}` },
    `Part ${partId} - renders: ${renderCount.current}${isSelected ? " [selected]" : ""}${isTransforming ? " [transforming]" : ""}`
  );
}

/**
 * Optimized Mock Scene with individual selectors
 */
export function OptimizedMockScene({
  partIds,
  renderCounters,
}: {
  partIds: string[];
  renderCounters: Map<string, number>;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set("optimized-scene", renderCount.current);

  return React.createElement(
    "div",
    { "data-testid": "optimized-scene" },
    partIds.map((id) =>
      React.createElement(OptimizedMockPart3D, {
        key: id,
        partId: id,
        renderCounters,
      })
    )
  );
}

// Re-export for convenience
export { DEFAULT_FURNITURE_ID };
export { useStore, useSelectedFurnitureParts, useIsPartHidden };
export { useShallow };
export { act };
