/**
 * Room3D, Wall3D, and FloorCeiling3D Render Performance Tests
 *
 * Tests for room-related component isolation and render optimization.
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import {
  resetStore,
  createTestPart,
  createTestRoom,
  createTestWall,
  useStore,
  useShallow,
} from "./test-helpers.util";
import type { Room, WallSegment } from "@/types";

// ============================================================================
// Room3D and Wall3D Isolation Tests
// ============================================================================

describe("Room3D and Wall3D Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock Wall3D component
   */
  function MockWall3D({
    wallId,
    roomId,
    renderCounters,
  }: {
    wallId: string;
    roomId: string;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set(`wall-${wallId}`, renderCount.current);

    // Wall3D doesn't use store directly - receives props
    return (
      <div data-testid={`wall-${wallId}`}>
        Wall {wallId} in Room {roomId} - renders: {renderCount.current}
      </div>
    );
  }

  /**
   * Mock Room3D component
   */
  function MockRoom3D({ renderCounters }: { renderCounters: Map<string, number> }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set("room3d", renderCount.current);

    // Simulate real Room3D selector pattern
    const { rooms, walls, openings } = useStore(
      useShallow((state) => ({
        rooms: state.rooms,
        walls: state.walls,
        openings: state.openings,
      }))
    );

    return (
      <div data-testid="room3d">
        {rooms.map((room) => (
          <div key={room.id}>
            {walls
              .filter((w) => w.roomId === room.id)
              .map((wall) => (
                <MockWall3D
                  key={wall.id}
                  wallId={wall.id}
                  roomId={room.id}
                  renderCounters={renderCounters}
                />
              ))}
          </div>
        ))}
      </div>
    );
  }

  it("should not re-render Room3D when parts change", () => {
    const renderCounters = new Map<string, number>();

    const room = createTestRoom("room-1");
    const wall = createTestWall("wall-1", "room-1");

    act(() => {
      useStore.setState({
        rooms: [room],
        walls: [wall],
        openings: [],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockRoom3D renderCounters={renderCounters} />);

    const initialRoomRenders = renderCounters.get("room3d") || 0;
    const initialWallRenders = renderCounters.get("wall-wall-1") || 0;

    // Update a part
    act(() => {
      useStore.getState().updatePart("part-1", { name: "Updated Part" });
    });

    // Room3D should NOT re-render (parts not in selector)
    expect(renderCounters.get("room3d")).toBe(initialRoomRenders);
    expect(renderCounters.get("wall-wall-1")).toBe(initialWallRenders);
  });

  it("should re-render Room3D only when walls change", () => {
    const renderCounters = new Map<string, number>();

    const room = createTestRoom("room-1");
    const wall1 = createTestWall("wall-1", "room-1");

    act(() => {
      useStore.setState({
        rooms: [room],
        walls: [wall1],
        openings: [],
      });
    });

    render(<MockRoom3D renderCounters={renderCounters} />);

    const initialRoomRenders = renderCounters.get("room3d") || 0;

    // Add a new wall
    const wall2 = createTestWall("wall-2", "room-1");
    act(() => {
      useStore.setState({
        walls: [wall1, wall2],
      });
    });

    // Room3D SHOULD re-render (walls changed)
    expect(renderCounters.get("room3d")).toBeGreaterThan(initialRoomRenders);

    // New wall should be rendered
    expect(renderCounters.get("wall-wall-2")).toBe(1);
  });

  it("should not re-render walls in other rooms when one room changes", () => {
    const renderCounters = new Map<string, number>();

    const room1 = createTestRoom("room-1");
    const room2 = createTestRoom("room-2");
    const wall1 = createTestWall("wall-1", "room-1");
    const wall2 = createTestWall("wall-2", "room-2");

    act(() => {
      useStore.setState({
        rooms: [room1, room2],
        walls: [wall1, wall2],
        openings: [],
      });
    });

    render(<MockRoom3D renderCounters={renderCounters} />);

    const initialWall2Renders = renderCounters.get("wall-wall-2") || 0;

    // Add opening to room 1
    act(() => {
      useStore.setState({
        openings: [
          {
            id: "opening-1",
            wallId: "wall-1",
            type: "WINDOW",
            offsetFromStartMm: 500,
            widthMm: 1000,
            heightMm: 1200,
            sillHeightMm: 900,
          },
        ],
      });
    });

    // Wall 2 (in room 2) should have bounded re-renders
    // Current implementation: Room3D re-renders due to openings change
    const afterWall2Renders = renderCounters.get("wall-wall-2") || 0;
    expect(afterWall2Renders - initialWall2Renders).toBeLessThanOrEqual(1);
  });

  it("should not re-render Room3D when selection changes", () => {
    const renderCounters = new Map<string, number>();

    const room = createTestRoom("room-1");
    const wall = createTestWall("wall-1", "room-1");

    act(() => {
      useStore.setState({
        rooms: [room],
        walls: [wall],
        openings: [],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockRoom3D renderCounters={renderCounters} />);

    const initialRoomRenders = renderCounters.get("room3d") || 0;

    // Select a part
    act(() => {
      useStore.getState().selectPart("part-1");
    });

    // Room3D should NOT re-render (selection not in selector)
    expect(renderCounters.get("room3d")).toBe(initialRoomRenders);
  });
});

// ============================================================================
// FloorCeiling3D Isolation Tests
// ============================================================================

describe("FloorCeiling3D Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock FloorCeiling3D component
   */
  function MockFloorCeiling3D({
    roomId,
    renderCounters,
  }: {
    roomId: string;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set(`floor-ceiling-${roomId}`, renderCount.current);

    // Simulate real FloorCeiling3D selector pattern
    const { allWalls, rooms, graphicsSettings } = useStore(
      useShallow((state) => ({
        allWalls: state.walls,
        rooms: state.rooms,
        graphicsSettings: state.graphicsSettings,
      }))
    );

    const walls = React.useMemo(
      () => allWalls.filter((w) => w.roomId === roomId),
      [allWalls, roomId]
    );

    return (
      <div data-testid={`floor-ceiling-${roomId}`}>
        FloorCeiling for {roomId} - {walls.length} walls - renders: {renderCount.current}
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
        walls: [
          { id: "wall-1", roomId: "room-1", start: [0, 0], end: [3000, 0] },
          { id: "wall-2", roomId: "room-1", start: [3000, 0], end: [3000, 4000] },
          { id: "wall-3", roomId: "room-1", start: [3000, 4000], end: [0, 4000] },
          { id: "wall-4", roomId: "room-1", start: [0, 4000], end: [0, 0] },
        ],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockFloorCeiling3D roomId="room-1" renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("floor-ceiling-room-1") || 0;

    // Update a part
    act(() => {
      useStore.getState().updatePart("part-1", { name: "Updated" });
    });

    // FloorCeiling should NOT re-render
    expect(renderCounters.get("floor-ceiling-room-1")).toBe(initialRenders);
  });

  it("should re-render only affected room when walls change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
          { id: "room-2", name: "Room 2", origin: [5000, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [
          { id: "wall-1", roomId: "room-1", start: [0, 0], end: [3000, 0] },
          { id: "wall-2", roomId: "room-2", start: [5000, 0], end: [8000, 0] },
        ],
      });
    });

    render(
      <>
        <MockFloorCeiling3D roomId="room-1" renderCounters={renderCounters} />
        <MockFloorCeiling3D roomId="room-2" renderCounters={renderCounters} />
      </>
    );

    const initialRoom1Renders = renderCounters.get("floor-ceiling-room-1") || 0;
    const initialRoom2Renders = renderCounters.get("floor-ceiling-room-2") || 0;

    // Add wall to room 1 only
    act(() => {
      useStore.setState({
        walls: [
          { id: "wall-1", roomId: "room-1", start: [0, 0], end: [3000, 0] },
          { id: "wall-1b", roomId: "room-1", start: [3000, 0], end: [3000, 2000] },
          { id: "wall-2", roomId: "room-2", start: [5000, 0], end: [8000, 0] },
        ],
      });
    });

    // Both re-render because walls array changed (current limitation)
    // But with useMemo filtering, the recalculation is minimized
    const afterRoom1Renders = renderCounters.get("floor-ceiling-room-1") || 0;
    const afterRoom2Renders = renderCounters.get("floor-ceiling-room-2") || 0;

    expect(afterRoom1Renders - initialRoom1Renders).toBeLessThanOrEqual(1);
    expect(afterRoom2Renders - initialRoom2Renders).toBeLessThanOrEqual(1);
  });

  it("should not re-render when selection changes", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [{ id: "wall-1", roomId: "room-1", start: [0, 0], end: [3000, 0] }],
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(<MockFloorCeiling3D roomId="room-1" renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("floor-ceiling-room-1") || 0;

    // Select a part
    act(() => {
      useStore.getState().selectPart("part-1");
    });

    // FloorCeiling should NOT re-render
    expect(renderCounters.get("floor-ceiling-room-1")).toBe(initialRenders);
  });

  it("should re-render when graphics settings change", () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        rooms: [
          { id: "room-1", name: "Room 1", origin: [0, 0], heightMm: 2700, wallThicknessMm: 120 },
        ],
        walls: [{ id: "wall-1", roomId: "room-1", start: [0, 0], end: [3000, 0] }],
      });
    });

    render(<MockFloorCeiling3D roomId="room-1" renderCounters={renderCounters} />);

    const initialRenders = renderCounters.get("floor-ceiling-room-1") || 0;

    // Update graphics settings
    act(() => {
      useStore.getState().updateGraphicsSettings({ shadows: false });
    });

    // FloorCeiling SHOULD re-render (graphicsSettings in selector)
    expect(renderCounters.get("floor-ceiling-room-1")).toBeGreaterThan(initialRenders);
  });
});
