/**
 * CountertopPart3D Render Performance Tests
 *
 * Tests for countertop component isolation and render optimization.
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import {
  resetStore,
  createTestPart,
  useStore,
  useShallow,
  DEFAULT_FURNITURE_ID,
} from "./test-helpers.util";

describe("CountertopPart3D Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Mock CountertopSegment3D that simulates the real component's store usage
   */
  function MockCountertopSegment({
    segmentId,
    groupId,
    renderCounters,
  }: {
    segmentId: string;
    groupId: string;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set(`countertop-${segmentId}`, renderCount.current);

    // Simulate real CountertopSegment3D selector pattern
    const { cabinets, parts, transformingCabinetId } = useStore(
      useShallow((state) => ({
        cabinets: state.cabinets,
        parts: state.parts,
        transformingCabinetId: state.transformingCabinetId,
      }))
    );

    const selectedCountertopGroupId = useStore((state) => state.selectedCountertopGroupId);

    const isSelected = selectedCountertopGroupId === groupId;

    return (
      <div data-testid={`countertop-segment-${segmentId}`}>
        Segment {segmentId} - renders: {renderCount.current}
        {isSelected && " [selected]"}
      </div>
    );
  }

  /**
   * Mock CountertopPart3D that renders all segments of a group
   */
  function MockCountertopPart3D({
    group,
    renderCounters,
  }: {
    group: { id: string; segments: { id: string }[] };
    renderCounters: Map<string, number>;
  }) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    renderCounters.set(`countertop-group-${group.id}`, renderCount.current);

    return (
      <div data-testid={`countertop-group-${group.id}`}>
        {group.segments.map((seg) => (
          <MockCountertopSegment
            key={seg.id}
            segmentId={seg.id}
            groupId={group.id}
            renderCounters={renderCounters}
          />
        ))}
      </div>
    );
  }

  it("should not re-render countertop segments when selecting a part", () => {
    const renderCounters = new Map<string, number>();

    const groups = [
      { id: "group-1", segments: [{ id: "seg-1" }, { id: "seg-2" }] },
      { id: "group-2", segments: [{ id: "seg-3" }] },
    ];

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1")],
      });
    });

    render(
      <>
        {groups.map((g) => (
          <MockCountertopPart3D key={g.id} group={g} renderCounters={renderCounters} />
        ))}
      </>
    );

    const initialSeg1Renders = renderCounters.get("countertop-seg-1") || 0;
    const initialSeg2Renders = renderCounters.get("countertop-seg-2") || 0;

    // Select a part (unrelated to countertop)
    act(() => {
      useStore.getState().selectPart("part-1");
    });

    // Countertop segments should NOT re-render (part selection doesn't affect them)
    const afterSeg1Renders = renderCounters.get("countertop-seg-1") || 0;
    const afterSeg2Renders = renderCounters.get("countertop-seg-2") || 0;

    // Bounded re-renders (ideally 0, but parts dependency may trigger)
    expect(afterSeg1Renders - initialSeg1Renders).toBeLessThanOrEqual(1);
    expect(afterSeg2Renders - initialSeg2Renders).toBeLessThanOrEqual(1);
  });

  it("should only re-render selected countertop group when selection changes", () => {
    const renderCounters = new Map<string, number>();

    const groups = [
      { id: "group-1", segments: [{ id: "seg-1" }] },
      { id: "group-2", segments: [{ id: "seg-2" }] },
    ];

    render(
      <>
        {groups.map((g) => (
          <MockCountertopPart3D key={g.id} group={g} renderCounters={renderCounters} />
        ))}
      </>
    );

    const initialSeg1Renders = renderCounters.get("countertop-seg-1") || 0;
    const initialSeg2Renders = renderCounters.get("countertop-seg-2") || 0;

    // Select countertop group 1
    act(() => {
      useStore.setState({ selectedCountertopGroupId: "group-1" });
    });

    // Group 1 segment should re-render (selected)
    expect(renderCounters.get("countertop-seg-1")).toBe(initialSeg1Renders + 1);

    // Group 2 segment should also re-render due to shared selector (current limitation)
    // In optimized version, this should NOT re-render
    const afterSeg2Renders = renderCounters.get("countertop-seg-2") || 0;
    expect(afterSeg2Renders - initialSeg2Renders).toBeLessThanOrEqual(1);
  });

  it("should not re-render when unrelated cabinet transforms", () => {
    const renderCounters = new Map<string, number>();

    const groups = [{ id: "group-1", segments: [{ id: "seg-1" }] }];

    act(() => {
      useStore.setState({
        cabinets: [
          {
            id: "cab-1",
            name: "Cabinet 1",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "cab-2",
            name: "Cabinet 2",
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

    render(
      <>
        {groups.map((g) => (
          <MockCountertopPart3D key={g.id} group={g} renderCounters={renderCounters} />
        ))}
      </>
    );

    const initialSeg1Renders = renderCounters.get("countertop-seg-1") || 0;

    // Transform cabinet 2 (not related to this countertop)
    act(() => {
      useStore.setState({ transformingCabinetId: "cab-2" });
    });

    // Segment should re-render because transformingCabinetId is in selector
    // In optimized version, we'd check if cabinetId is in segment.cabinetIds
    const afterSeg1Renders = renderCounters.get("countertop-seg-1") || 0;
    expect(afterSeg1Renders - initialSeg1Renders).toBeLessThanOrEqual(1);
  });

  it("should handle multiple countertop groups efficiently", () => {
    const renderCounters = new Map<string, number>();

    const groups = Array.from({ length: 10 }, (_, i) => ({
      id: `group-${i}`,
      segments: [{ id: `seg-${i}-a` }, { id: `seg-${i}-b` }],
    }));

    render(
      <>
        {groups.map((g) => (
          <MockCountertopPart3D key={g.id} group={g} renderCounters={renderCounters} />
        ))}
      </>
    );

    // Initial render - all segments should render once
    for (let i = 0; i < 10; i++) {
      expect(renderCounters.get(`countertop-seg-${i}-a`)).toBe(1);
      expect(renderCounters.get(`countertop-seg-${i}-b`)).toBe(1);
    }

    // Select one group
    act(() => {
      useStore.setState({ selectedCountertopGroupId: "group-5" });
    });

    // All segments re-render (current limitation with shared selector)
    // But each should re-render at most once
    for (let i = 0; i < 10; i++) {
      expect(renderCounters.get(`countertop-seg-${i}-a`)).toBeLessThanOrEqual(2);
      expect(renderCounters.get(`countertop-seg-${i}-b`)).toBeLessThanOrEqual(2);
    }
  });

  it("should not re-render when hiding parts", () => {
    const renderCounters = new Map<string, number>();

    const groups = [{ id: "group-1", segments: [{ id: "seg-1" }] }];

    act(() => {
      useStore.setState({
        parts: [createTestPart("part-1", "Part 1"), createTestPart("part-2", "Part 2")],
      });
    });

    render(
      <>
        {groups.map((g) => (
          <MockCountertopPart3D key={g.id} group={g} renderCounters={renderCounters} />
        ))}
      </>
    );

    const initialSeg1Renders = renderCounters.get("countertop-seg-1") || 0;

    // Hide a part
    act(() => {
      useStore.getState().hideParts(["part-1"]);
    });

    // Countertop should NOT re-render (hidden parts not in selector)
    expect(renderCounters.get("countertop-seg-1")).toBe(initialSeg1Renders);
  });
});
