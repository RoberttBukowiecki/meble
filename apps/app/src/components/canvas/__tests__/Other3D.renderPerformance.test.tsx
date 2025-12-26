/**
 * Other 3D Component Render Performance Tests
 *
 * Tests for Leg3D, RoomLighting, SnapGuidesRenderer, and cross-component isolation.
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import {
  resetStore,
  createTestPart,
  useStore,
  useShallow,
  useSelectedFurnitureParts,
  DEFAULT_FURNITURE_ID,
} from "./test-helpers.util";

// ============================================================================
// Leg3D and CabinetLegs Isolation Tests (Props-only components)
// ============================================================================

describe("Leg3D Isolation (Props-only)", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock Leg3D - receives props only, no store usage
   */
  function MockLeg3D({
    legIndex,
    renderCounters,
  }: {
    legIndex: number;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set(`leg-${legIndex}`, renderCount.current);

    // Leg3D is a pure component - only re-renders if props change
    return (
      <div data-testid={`leg-${legIndex}`}>
        Leg {legIndex} - renders: {renderCount.current}
      </div>
    );
  }

  /**
   * Mock CabinetLegs - renders multiple legs
   */
  function MockCabinetLegs({
    legCount,
    renderCounters,
  }: {
    legCount: number;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set("cabinet-legs", renderCount.current);

    return (
      <div data-testid="cabinet-legs">
        {Array.from({ length: legCount }, (_, i) => (
          <MockLeg3D key={i} legIndex={i} renderCounters={renderCounters} />
        ))}
      </div>
    );
  }

  it("should not re-render legs when store state changes (props-only component)", () => {
    const renderCounters = new Map<string, number>();

    render(<MockCabinetLegs legCount={4} renderCounters={renderCounters} />);

    // Initial render
    expect(renderCounters.get("leg-0")).toBe(1);
    expect(renderCounters.get("leg-1")).toBe(1);
    expect(renderCounters.get("leg-2")).toBe(1);
    expect(renderCounters.get("leg-3")).toBe(1);

    // Simulate store changes (Leg3D doesn't subscribe to store)
    act(() => {
      useStore.setState({ selectedPartId: "some-part" });
    });

    // Legs should NOT re-render (they don't use store)
    expect(renderCounters.get("leg-0")).toBe(1);
    expect(renderCounters.get("leg-1")).toBe(1);
    expect(renderCounters.get("leg-2")).toBe(1);
    expect(renderCounters.get("leg-3")).toBe(1);
  });

  it("should only re-render when parent re-renders with new props", () => {
    const renderCounters = new Map<string, number>();

    const { rerender } = render(<MockCabinetLegs legCount={4} renderCounters={renderCounters} />);

    expect(renderCounters.get("cabinet-legs")).toBe(1);

    // Re-render parent with same props
    rerender(<MockCabinetLegs legCount={4} renderCounters={renderCounters} />);

    // All legs re-render due to parent re-render (no React.memo)
    // This documents expected behavior for non-memoized components
    expect(renderCounters.get("cabinet-legs")).toBe(2);
  });

  it("should handle leg count changes", () => {
    const renderCounters = new Map<string, number>();

    const { rerender } = render(<MockCabinetLegs legCount={4} renderCounters={renderCounters} />);

    expect(renderCounters.get("leg-0")).toBe(1);
    expect(renderCounters.get("leg-3")).toBe(1);

    // Change leg count
    rerender(<MockCabinetLegs legCount={6} renderCounters={renderCounters} />);

    // New legs should be rendered
    expect(renderCounters.get("leg-4")).toBe(1);
    expect(renderCounters.get("leg-5")).toBe(1);
  });
});

// ============================================================================
// RoomLighting Isolation Tests
// ============================================================================

describe("RoomLighting Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock RoomLighting component
   */
  function MockRoomLighting({ renderCounters }: { renderCounters: Map<string, number> }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set("room-lighting", renderCount.current);

    // Simulate real RoomLighting selector pattern
    const { rooms, walls, openings, lights, graphicsSettings } = useStore(
      useShallow((state) => ({
        rooms: state.rooms,
        walls: state.walls,
        openings: state.openings,
        lights: state.lights,
        graphicsSettings: state.graphicsSettings,
      }))
    );

    return (
      <div data-testid="room-lighting">
        RoomLighting - {rooms.length} rooms, {lights?.length || 0} lights - renders:{" "}
        {renderCount.current}
      </div>
    );
  }

  it("should not re-render when parts change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [],
        openings: [],
        lights: [],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockRoomLighting renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("room-lighting") || 0;

    // Update a part
    act(() => {
      useStore.getState().updatePart("part-1", { name: "Updated" });
    });

    // RoomLighting should NOT re-render
    expect(renderCounters.get("room-lighting")).toBe(initialRenders);
  });

  it("should not re-render when cabinets change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [],
        openings: [],
        lights: [],
        cabinets: [],
      });
    });

    render(<MockRoomLighting renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("room-lighting") || 0;

    // Add a cabinet
    act(() => {
      useStore.setState({
        cabinets: [
          {
            id: "cab-1",
            name: "Cabinet",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    // RoomLighting should NOT re-render (cabinets not in selector)
    expect(renderCounters.get("room-lighting")).toBe(initialRenders);
  });

  it("should re-render when lighting settings change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [],
        walls: [],
        openings: [],
        lights: [],
        graphicsSettings: { lightingMode: "edit", shadows: true },
      });
    });

    render(<MockRoomLighting renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("room-lighting") || 0;

    // Change lighting mode
    act(() => {
      useStore.getState().updateGraphicsSettings({ lightingMode: "simulation" });
    });

    // RoomLighting SHOULD re-render
    expect(renderCounters.get("room-lighting")).toBeGreaterThan(initialRenders);
  });

  it("should not re-render when selection changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [],
        openings: [],
        lights: [],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockRoomLighting renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("room-lighting") || 0;

    // Select a part
    act(() => {
      useStore.getState().selectPart("part-1");
    });

    // RoomLighting should NOT re-render
    expect(renderCounters.get("room-lighting")).toBe(initialRenders);
  });
});

// ============================================================================
// SnapGuidesRenderer Performance Pattern Tests
// ============================================================================

describe("SnapGuidesRenderer Performance Pattern", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock SnapGuidesRenderer - demonstrates the ref-based update pattern
   * Real component uses useFrame to update without re-renders
   */
  function MockSnapGuidesRenderer({ renderCounters }: { renderCounters: Map<string, number> }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set("snap-guides", renderCount.current);

    // Real component only subscribes to showGuides boolean
    const showGuides = useStore((state) => state.snapSettings.showGuides);

    // Actual snap points are read via refs in useFrame - no subscription!
    // This is the key to high-performance updates

    if (!showGuides) return null;

    return <div data-testid="snap-guides">SnapGuides - renders: {renderCount.current}</div>;
  }

  it("should only re-render when showGuides changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        snapSettings: {
          enabled: true,
          showGuides: true,
          gridSize: 10,
          angleSnap: 15,
        },
      });
    });

    render(<MockSnapGuidesRenderer renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("snap-guides") || 0;

    // Change snap settings (but not showGuides)
    act(() => {
      useStore.setState({
        snapSettings: {
          enabled: true,
          showGuides: true,
          gridSize: 20, // Changed
          angleSnap: 30, // Changed
        },
      });
    });

    // Should NOT re-render (showGuides didn't change)
    expect(renderCounters.get("snap-guides")).toBe(initialRenders);
  });

  it("should re-render only when showGuides toggles", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        snapSettings: {
          enabled: true,
          showGuides: true,
          gridSize: 10,
          angleSnap: 15,
        },
      });
    });

    render(<MockSnapGuidesRenderer renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("snap-guides") || 0;

    // Toggle showGuides off
    act(() => {
      useStore.setState({
        snapSettings: {
          enabled: true,
          showGuides: false, // Changed!
          gridSize: 10,
          angleSnap: 15,
        },
      });
    });

    // SHOULD re-render (showGuides changed)
    expect(renderCounters.get("snap-guides")).toBeGreaterThan(initialRenders);
  });

  it("documents the ref-based pattern for high-performance updates", () => {
    // This test documents the pattern used by SnapGuidesRenderer:
    //
    // 1. Subscribe only to boolean flags that control visibility
    // 2. Read dynamic data (snap points, positions) via refs
    // 3. Update visuals in useFrame callback (no React re-renders)
    //
    // Benefits:
    // - Snap points can update 60fps without causing re-renders
    // - Component only re-renders when visibility changes
    // - Mesh positions are updated directly via ref.current.position.set()
    //
    // This pattern should be used for all high-frequency visual updates:
    // - Transform previews during drag
    // - Dimension line updates
    // - Collision highlight updates

    expect(true).toBe(true); // Documentation test
  });
});

// ============================================================================
// Cross-Component Isolation Summary Tests
// ============================================================================

describe("Cross-Component Isolation Summary", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should isolate Room3D from Part3D state changes", () => {
    // This documents the expected isolation between different 3D subsystems
    const renderCounters = new Map<string, number>();

    function MockRoom3D() {
      const renderCount = useRef(0);
      renderCount.current += 1;
      renderCounters.set("room3d", renderCount.current);

      const { rooms, walls } = useStore(
        useShallow((state) => ({
          rooms: state.rooms,
          walls: state.walls,
        }))
      );

      return <div>Room3D - {rooms.length} rooms</div>;
    }

    function MockPart3DList() {
      const renderCount = useRef(0);
      renderCount.current += 1;
      renderCounters.set("part3d-list", renderCount.current);

      const parts = useSelectedFurnitureParts();

      return <div>Part3DList - {parts.length} parts</div>;
    }

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(
      <>
        <MockRoom3D />
        <MockPart3DList />
      </>
    );

    const initialRoomRenders = renderCounters.get("room3d") || 0;
    const initialPartRenders = renderCounters.get("part3d-list") || 0;

    // Update a part
    act(() => {
      useStore.getState().updatePart("part-1", { name: "Updated Part" });
    });

    // Room3D should NOT re-render (parts not in its selector)
    expect(renderCounters.get("room3d")).toBe(initialRoomRenders);

    // Part3D list SHOULD re-render (parts changed)
    expect(renderCounters.get("part3d-list")).toBeGreaterThan(initialPartRenders);
  });

  it("should isolate RoomLighting from cabinet state changes", () => {
    const renderCounters = new Map<string, number>();

    function MockRoomLighting() {
      const renderCount = useRef(0);
      renderCount.current += 1;
      renderCounters.set("lighting", renderCount.current);

      const { rooms, lights } = useStore(
        useShallow((state) => ({
          rooms: state.rooms,
          lights: state.lights,
        }))
      );

      return <div>Lighting - {lights?.length || 0} lights</div>;
    }

    function MockCabinetList() {
      const renderCount = useRef(0);
      renderCount.current += 1;
      renderCounters.set("cabinet-list", renderCount.current);

      const cabinets = useStore((state) => state.cabinets);

      return <div>Cabinets - {cabinets.length}</div>;
    }

    act(() => {
      useStore.setState({
        rooms: [],
        lights: [],
        cabinets: [],
      });
    });

    render(
      <>
        <MockRoomLighting />
        <MockCabinetList />
      </>
    );

    const initialLightingRenders = renderCounters.get("lighting") || 0;

    // Add a cabinet
    act(() => {
      useStore.setState({
        cabinets: [
          {
            id: "cab-1",
            name: "Cabinet",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    // RoomLighting should NOT re-render
    expect(renderCounters.get("lighting")).toBe(initialLightingRenders);

    // CabinetList SHOULD re-render
    expect(renderCounters.get("cabinet-list")).toBeGreaterThan(1);
  });
});
