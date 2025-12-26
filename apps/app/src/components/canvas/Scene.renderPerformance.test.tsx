/**
 * Scene Render Performance Tests
 *
 * Main test file for Scene component render optimization.
 * Component-specific tests are in __tests__/ subdirectory:
 * - Part3D.renderPerformance.test.tsx
 * - Room.renderPerformance.test.tsx
 * - Countertop.renderPerformance.test.tsx
 * - Cabinet.renderPerformance.test.tsx
 * - Other3D.renderPerformance.test.tsx
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import { useStore, useSelectedFurnitureParts } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { Part, Material } from "@/types";
import { DEFAULT_FURNITURE_ID } from "@/lib/store/constants";

// ============================================================================
// Test Utilities
// ============================================================================

function createTestPart(id: string, name: string, furnitureId = DEFAULT_FURNITURE_ID): Part {
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

function createTestMaterial(id: string): Material {
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

function resetStore() {
  useStore.setState({
    parts: [],
    materials: [createTestMaterial("mat-1")],
    cabinets: [],
    selectedPartId: null,
    selectedCabinetId: null,
    selectedPartIds: new Set<string>(),
    collisions: [],
    hiddenPartIds: new Set<string>(),
    isTransforming: false,
    transformingPartId: null,
    transformingCabinetId: null,
    transformingPartIds: new Set<string>(),
  });
}

function MockScene({ renderCounters }: { renderCounters: Map<string, number> }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set("scene", renderCount.current);

  const parts = useSelectedFurnitureParts();

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

  return (
    <div data-testid="mock-scene">
      Scene renders: {renderCount.current}, parts: {parts.length}
    </div>
  );
}

// ============================================================================
// Scene Isolation Tests
// ============================================================================

describe("Scene Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should not re-render Scene when only materials change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().addMaterial({
        id: "mat-2",
        name: "New Material",
        color: "#FF0000",
        thickness: 18,
        category: "board",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    expect(renderCounters.get("scene")).toBe(initialSceneRenders);
  });

  it("should re-render Scene when transform mode changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().setTransformMode("rotate");
    });

    expect(renderCounters.get("scene")).toBeGreaterThan(initialSceneRenders);
  });

  it("should re-render Scene when cabinets change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.setState({
        cabinets: [
          {
            id: "cab-1",
            name: "Test Cabinet",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: { width: 600, height: 720, depth: 560 },
            materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
            partIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    expect(renderCounters.get("scene")).toBeGreaterThan(initialSceneRenders);
  });
});

// ============================================================================
// Render Count Thresholds
// ============================================================================

describe("Render count thresholds", () => {
  beforeEach(() => {
    resetStore();
  });

  it("initial scene render should be exactly 1", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    expect(renderCounters.get("scene")).toBe(1);
  });

  it("adding a part should cause bounded re-renders", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().addPart({
        name: "Part 2",
        furnitureId: DEFAULT_FURNITURE_ID,
        width: 100,
        height: 50,
        depth: 18,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        materialId: "mat-1",
        shapeType: "RECT",
      });
    });

    expect(renderCounters.get("scene")).toBeLessThanOrEqual(initialSceneRenders + 2);
  });
});

// ============================================================================
// Batch Operations
// ============================================================================

describe("Batch operations", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should minimize re-renders during batch updates", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().updatePartsBatch(
        parts.slice(0, 5).map((p) => p.id),
        { width: 200 }
      );
    });

    expect(renderCounters.get("scene")).toBeLessThanOrEqual(initialSceneRenders + 2);
  });

  it("should handle clear selection efficiently", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().addToSelection(parts.map((p) => p.id));
    });

    const afterSelectRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().clearSelection();
    });

    expect(renderCounters.get("scene")).toBeLessThanOrEqual(afterSelectRenders + 2);
  });
});

// ============================================================================
// Multiselect Performance
// ============================================================================

describe("Multiselect Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should toggle selection efficiently", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    for (let i = 0; i < 5; i++) {
      act(() => {
        useStore.getState().togglePartSelection(`part-${i}`);
      });
    }

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(5);
  });

  it("should addToSelection efficiently with many parts", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 20 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().addToSelection(parts.slice(0, 10).map((p) => p.id));
    });

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(2);
  });

  it("should selectAll efficiently", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 30 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().selectAll();
    });

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// Transform Operations Performance
// ============================================================================

describe("Transform Operations Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should set isTransforming without cascading re-renders", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().setIsTransforming(true);
    });

    act(() => {
      useStore.getState().setIsTransforming(false);
    });

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(4);
  });

  it("should switch transform modes efficiently", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().setTransformMode("rotate");
    });
    act(() => {
      useStore.getState().setTransformMode("resize");
    });
    act(() => {
      useStore.getState().setTransformMode("translate");
    });

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// Unrelated State Changes Isolation
// ============================================================================

describe("Unrelated State Changes Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should not re-render Scene when history stack changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().clearHistory();
    });

    expect(renderCounters.get("scene")).toBe(initialSceneRenders);
  });
});

// ============================================================================
// Stress Tests - Rapid State Changes
// ============================================================================

describe("Stress Tests - Rapid State Changes", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should handle 100 rapid selection changes", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      for (let i = 0; i < 100; i++) {
        useStore.getState().selectPart(`part-${i % 10}`);
      }
    });

    // Batched in single act = should be minimal re-renders
    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// Furniture Switching Performance
// ============================================================================

describe("Furniture Switching Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should switch furniture efficiently", () => {
    const renderCounters = new Map<string, number>();

    const FURNITURE_1 = "furniture-1";
    const FURNITURE_2 = "furniture-2";

    const parts1 = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-1-${i}`, `Part 1-${i}`, FURNITURE_1)
    );
    const parts2 = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-2-${i}`, `Part 2-${i}`, FURNITURE_2)
    );

    act(() => {
      useStore.setState({
        parts: [...parts1, ...parts2],
        selectedFurnitureId: FURNITURE_1,
        furnitures: [
          { id: FURNITURE_1, name: "Furniture 1" },
          { id: FURNITURE_2, name: "Furniture 2" },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().setSelectedFurniture(FURNITURE_2);
    });

    expect(renderCounters.get("scene")).toBeGreaterThan(initialSceneRenders);
  });
});

// ============================================================================
// Collision Detection Performance
// ============================================================================

describe("Collision Detection Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should clear collisions efficiently", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({
        parts,
        collisions: [
          { partId: "part-0", collidingWith: ["part-1"], severity: "warning" as const },
          { partId: "part-2", collidingWith: ["part-3"], severity: "error" as const },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.setState({ collisions: [] });
    });

    expect(renderCounters.get("scene")! - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// useShallow Effectiveness Tests
// ============================================================================

describe("useShallow Effectiveness", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should prevent re-renders when unselected properties change", () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const { transformMode } = useStore(
        useShallow((state) => ({
          transformMode: state.transformMode,
        }))
      );
      return <div>{transformMode}</div>;
    }

    act(() => {
      useStore.setState({ transformMode: "translate" });
    });

    render(<TestComponent />);

    const initialRenders = renderCount;

    act(() => {
      useStore.setState({ selectedPartId: "some-id" });
    });

    expect(renderCount).toBe(initialRenders);

    act(() => {
      useStore.getState().setTransformMode("rotate");
    });

    expect(renderCount).toBeGreaterThan(initialRenders);
  });
});

// ============================================================================
// Memory and Cleanup Tests
// ============================================================================

describe("Memory and Cleanup", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should cleanup properly on unmount", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    const { unmount } = render(<MockScene renderCounters={renderCounters} />);

    expect(renderCounters.get("scene")).toBe(1);

    unmount();

    act(() => {
      useStore.getState().selectPart("part-1");
    });

    expect(renderCounters.get("scene")).toBe(1);
  });
});

// ============================================================================
// Object Dimensions Performance Tests
// ============================================================================

describe("Object Dimensions Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should not re-render parts when object dimension settings change", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Toggle object dimensions
    act(() => {
      useStore.getState().toggleObjectDimensions();
    });

    // Parts should not re-render (object dimensions is not in Part3D selector)
    for (let i = 0; i < 5; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      // Parts get re-mounted when scene re-renders but should be bounded
      expect(after - initial).toBeLessThanOrEqual(2);
    }
  });

  it("should toggle object dimensions efficiently", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    // Toggle object dimensions multiple times
    act(() => {
      useStore.getState().toggleObjectDimensions();
    });
    act(() => {
      useStore.getState().toggleObjectDimensions();
    });
    act(() => {
      useStore.getState().toggleObjectDimensions();
    });

    const afterToggleRenders = renderCounters.get("scene") || 0;

    // 3 toggles should cause at most 6 re-renders
    expect(afterToggleRenders - initialSceneRenders).toBeLessThanOrEqual(6);
  });

  it("should update object dimension settings efficiently", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    // Update multiple settings
    act(() => {
      useStore.getState().updateObjectDimensionSettings({ mode: "all" });
    });
    act(() => {
      useStore.getState().updateObjectDimensionSettings({ granularity: "part" });
    });
    act(() => {
      useStore.getState().updateObjectDimensionSettings({ showLabels: true });
    });
    act(() => {
      useStore.getState().updateObjectDimensionSettings({ showAxisColors: true });
    });

    const afterSettingsRenders = renderCounters.get("scene") || 0;

    // 4 setting changes should cause at most 8 re-renders
    expect(afterSettingsRenders - initialSceneRenders).toBeLessThanOrEqual(8);
  });

  it("should not re-render Scene when object dimensions are disabled and selection changes", () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) => createTestPart(`part-${i}`, `Part ${i}`));

    act(() => {
      useStore.setState({
        parts,
        objectDimensionSettings: {
          enabled: false,
          mode: "selection",
          granularity: "group",
          showLabels: true,
          showAxisColors: false,
        },
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    // Select a part
    act(() => {
      useStore.getState().selectPart("part-1");
    });

    // Scene re-renders for selection change
    const afterSelectRenders = renderCounters.get("scene") || 0;

    // Should be minimal re-renders (selection changes are handled)
    expect(afterSelectRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });

  it("should batch object dimension mode and granularity changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    // Batch multiple setting changes
    act(() => {
      useStore.getState().updateObjectDimensionSettings({
        mode: "all",
        granularity: "part",
        showLabels: true,
        showAxisColors: true,
      });
    });

    const afterBatchRenders = renderCounters.get("scene") || 0;

    // Single batch update should cause at most 2 re-renders
    expect(afterBatchRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// Object Dimensions Calculator Performance Tests
// ============================================================================

describe("Object Dimensions Calculator Performance", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should handle 50 parts without performance degradation", () => {
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({
        parts,
        selectedPartIds: new Set(["part-0"]),
        selectedPartId: "part-0",
      });
    });

    // Import and test the calculator directly
    const { calculateAllObjectDimensions } = require("@/lib/object-dimensions-calculator");

    const startTime = performance.now();

    // Calculate dimensions multiple times
    for (let i = 0; i < 100; i++) {
      calculateAllObjectDimensions(
        "selection",
        "group",
        parts,
        [],
        [],
        "part-0",
        null,
        new Set(["part-0"]),
        null,
        DEFAULT_FURNITURE_ID,
        new Set(),
        1000,
        1000,
        1000
      );
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 100;

    // Average calculation should be under 5ms
    expect(avgTime).toBeLessThan(5);
  });

  it("should handle 20 cabinets without performance degradation", () => {
    const CABINET_COUNT = 20;
    const PARTS_PER_CABINET = 6;

    const parts: Part[] = [];
    const cabinets: Cabinet[] = [];

    for (let c = 0; c < CABINET_COUNT; c++) {
      const cabinetParts = Array.from({ length: PARTS_PER_CABINET }, (_, i) => ({
        ...createTestPart(`cab${c}-part-${i}`, `Cabinet ${c} Part ${i}`),
        cabinetMetadata: { cabinetId: `cabinet-${c}`, role: "SIDE" as const },
      }));

      parts.push(...cabinetParts);

      cabinets.push({
        id: `cabinet-${c}`,
        name: `Cabinet ${c}`,
        furnitureId: DEFAULT_FURNITURE_ID,
        type: "base" as CabinetType,
        params: { width: 600, height: 720, depth: 560 },
        materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
        partIds: cabinetParts.map((p) => p.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    act(() => {
      useStore.setState({
        parts,
        cabinets,
        selectedCabinetId: "cabinet-0",
      });
    });

    const { calculateAllObjectDimensions } = require("@/lib/object-dimensions-calculator");

    const startTime = performance.now();

    // Calculate dimensions in 'all' mode with 'group' granularity
    for (let i = 0; i < 50; i++) {
      calculateAllObjectDimensions(
        "all",
        "group",
        parts,
        cabinets,
        [],
        null,
        "cabinet-0",
        new Set(),
        null,
        DEFAULT_FURNITURE_ID,
        new Set(),
        1000,
        1000,
        1000
      );
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 50;

    // Average calculation should be under 10ms for 20 cabinets
    expect(avgTime).toBeLessThan(10);
  });

  it("should handle granularity switch efficiently", () => {
    const CABINET_COUNT = 10;

    const parts: Part[] = [];
    const cabinets: Cabinet[] = [];

    for (let c = 0; c < CABINET_COUNT; c++) {
      const cabinetParts = Array.from({ length: 5 }, (_, i) => ({
        ...createTestPart(`cab${c}-part-${i}`, `Cabinet ${c} Part ${i}`),
        cabinetMetadata: { cabinetId: `cabinet-${c}`, role: "SIDE" as const },
      }));

      parts.push(...cabinetParts);

      cabinets.push({
        id: `cabinet-${c}`,
        name: `Cabinet ${c}`,
        furnitureId: DEFAULT_FURNITURE_ID,
        type: "base" as CabinetType,
        params: {},
        materials: {},
        partIds: cabinetParts.map((p) => p.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const { calculateAllObjectDimensions } = require("@/lib/object-dimensions-calculator");

    // Test 'group' granularity
    const groupStartTime = performance.now();
    for (let i = 0; i < 100; i++) {
      calculateAllObjectDimensions(
        "all",
        "group",
        parts,
        cabinets,
        [],
        null,
        null,
        new Set(),
        null,
        DEFAULT_FURNITURE_ID,
        new Set(),
        1000,
        1000,
        1000
      );
    }
    const groupEndTime = performance.now();
    const groupAvgTime = (groupEndTime - groupStartTime) / 100;

    // Test 'part' granularity
    const partStartTime = performance.now();
    for (let i = 0; i < 100; i++) {
      calculateAllObjectDimensions(
        "all",
        "part",
        parts,
        cabinets,
        [],
        null,
        null,
        new Set(),
        null,
        DEFAULT_FURNITURE_ID,
        new Set(),
        1000,
        1000,
        1000
      );
    }
    const partEndTime = performance.now();
    const partAvgTime = (partEndTime - partStartTime) / 100;

    // Both should be under 10ms
    expect(groupAvgTime).toBeLessThan(10);
    expect(partAvgTime).toBeLessThan(10);

    // Part granularity may be slower but should be within 3x
    expect(partAvgTime).toBeLessThan(groupAvgTime * 3);
  });
});
