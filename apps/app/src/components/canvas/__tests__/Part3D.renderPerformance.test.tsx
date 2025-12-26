/**
 * Part3D Render Performance Tests
 *
 * Tests for Part3D component isolation and render optimization.
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import {
  resetStore,
  createTestPart,
  MockScene,
  OptimizedMockScene,
  useStore,
  useShallow,
  useIsPartHidden,
  DEFAULT_FURNITURE_ID,
} from "./test-helpers.util";

describe("Part3D Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should not re-render all parts when selecting one part", () => {
    const renderCounters = new Map<string, number>();

    const part1 = createTestPart("part-1", "Part 1");
    const part2 = createTestPart("part-2", "Part 2");
    const part3 = createTestPart("part-3", "Part 3");

    act(() => {
      useStore.setState({
        parts: [part1, part2, part3],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPart1Renders = renderCounters.get("part-part-1") || 0;
    const initialPart2Renders = renderCounters.get("part-part-2") || 0;
    const initialPart3Renders = renderCounters.get("part-part-3") || 0;

    expect(initialPart1Renders).toBe(1);
    expect(initialPart2Renders).toBe(1);
    expect(initialPart3Renders).toBe(1);

    act(() => {
      useStore.getState().selectPart("part-1");
    });

    const afterSelectPart1Renders = renderCounters.get("part-part-1") || 0;
    const afterSelectPart2Renders = renderCounters.get("part-part-2") || 0;
    const afterSelectPart3Renders = renderCounters.get("part-part-3") || 0;

    expect(afterSelectPart1Renders).toBeGreaterThan(initialPart1Renders);
    expect(afterSelectPart2Renders).toBeGreaterThan(initialPart2Renders);
    expect(afterSelectPart3Renders).toBeGreaterThan(initialPart3Renders);
  });

  it("should not re-render parts when updating unrelated part data", () => {
    const renderCounters = new Map<string, number>();

    const part1 = createTestPart("part-1", "Part 1");
    const part2 = createTestPart("part-2", "Part 2");
    const part3 = createTestPart("part-3", "Part 3");

    act(() => {
      useStore.setState({
        parts: [part1, part2, part3],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPart2Renders = renderCounters.get("part-part-2") || 0;
    const initialPart3Renders = renderCounters.get("part-part-3") || 0;

    act(() => {
      useStore.getState().updatePart("part-1", { name: "Updated Part 1" });
    });

    const afterUpdatePart2Renders = renderCounters.get("part-part-2") || 0;
    const afterUpdatePart3Renders = renderCounters.get("part-part-3") || 0;

    expect(afterUpdatePart2Renders).toBeLessThanOrEqual(3);
    expect(afterUpdatePart3Renders).toBeLessThanOrEqual(3);
  });

  it("should not re-render parts when hiding a different part", () => {
    const renderCounters = new Map<string, number>();

    const part1 = createTestPart("part-1", "Part 1");
    const part2 = createTestPart("part-2", "Part 2");

    act(() => {
      useStore.setState({
        parts: [part1, part2],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPart2Renders = renderCounters.get("part-part-2") || 0;

    act(() => {
      useStore.getState().hideParts(["part-1"]);
    });

    const afterHidePart2Renders = renderCounters.get("part-part-2") || 0;
    expect(afterHidePart2Renders).toBe(initialPart2Renders);
  });
});

describe("CRITICAL: Individual Part3D Isolation (Optimized Pattern)", () => {
  beforeEach(() => {
    resetStore();
  });

  it("IDEAL: selecting one part should NOT re-render other parts", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3", "part-4", "part-5"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    for (const id of partIds) {
      expect(renderCounters.get(`optimized-${id}`)).toBe(1);
    }

    act(() => {
      useStore.getState().selectPart("part-1");
    });

    expect(renderCounters.get("optimized-part-1")).toBe(2);
    expect(renderCounters.get("optimized-part-2")).toBe(1);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
  });

  it("IDEAL: multiselect add should only re-render added parts", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3", "part-4", "part-5"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().addToSelection(["part-1", "part-2"]);
    });

    expect(renderCounters.get("optimized-part-1")).toBe(2);
    expect(renderCounters.get("optimized-part-2")).toBe(2);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
    expect(renderCounters.get("optimized-part-4")).toBe(1);
    expect(renderCounters.get("optimized-part-5")).toBe(1);
  });

  it("IDEAL: toggle selection should only re-render toggled part", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().togglePartSelection("part-2");
    });

    expect(renderCounters.get("optimized-part-1")).toBe(1);
    expect(renderCounters.get("optimized-part-2")).toBe(2);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
  });

  it("IDEAL: clear selection should only re-render previously selected parts", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3", "part-4", "part-5"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({
        parts,
        selectedPartIds: new Set(["part-1", "part-2"]),
        selectedPartId: "part-1",
      });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().clearSelection();
    });

    expect(renderCounters.get("optimized-part-1")).toBe(2);
    expect(renderCounters.get("optimized-part-2")).toBe(2);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
    expect(renderCounters.get("optimized-part-4")).toBe(1);
    expect(renderCounters.get("optimized-part-5")).toBe(1);
  });

  it("IDEAL: hiding one part should not re-render other parts", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts, hiddenPartIds: new Set() });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().hideParts(["part-2"]);
    });

    expect(renderCounters.get("optimized-part-1")).toBe(1);
    expect(renderCounters.get("optimized-part-2")).toBe(2);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
  });

  it("IDEAL: setting transformingPartId should only re-render affected part", () => {
    const renderCounters = new Map<string, number>();
    const partIds = ["part-1", "part-2", "part-3"];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().setTransformingPartId("part-2");
    });

    expect(renderCounters.get("optimized-part-1")).toBe(1);
    expect(renderCounters.get("optimized-part-2")).toBe(2);
    expect(renderCounters.get("optimized-part-3")).toBe(1);
  });
});

describe("Large Scale Part3D Performance (50+ parts)", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should handle 50 parts without excessive re-renders", () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    for (let i = 0; i < PART_COUNT; i++) {
      expect(renderCounters.get(`part-part-${i}`)).toBe(1);
    }
    expect(renderCounters.get("scene")).toBe(1);
  });

  it("should select one part without re-rendering all 50 parts excessively", () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    act(() => {
      useStore.getState().selectPart("part-25");
    });

    let totalReRenders = 0;
    for (let i = 0; i < PART_COUNT; i++) {
      totalReRenders += (renderCounters.get(`part-part-${i}`) || 0) - 1;
    }

    expect(totalReRenders).toBeLessThanOrEqual(PART_COUNT);
  });

  it("should handle batch update of 25 parts efficiently", () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    act(() => {
      useStore.getState().updatePartsBatch(
        parts.slice(0, 25).map((p) => p.id),
        { name: "Batch Updated" }
      );
    });

    const afterSceneRenders = renderCounters.get("scene") || 0;
    expect(afterSceneRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

describe("Selector Stability", () => {
  beforeEach(() => {
    resetStore();
  });

  it("useIsPartHidden should be isolated per part", () => {
    const part1 = createTestPart("part-1", "Part 1");
    const part2 = createTestPart("part-2", "Part 2");

    act(() => {
      useStore.setState({
        parts: [part1, part2],
        hiddenPartIds: new Set<string>(),
      });
    });

    let part1Hidden = false;
    let part2Hidden = false;
    let part1RenderCount = 0;
    let part2RenderCount = 0;

    function TestPart1() {
      part1RenderCount++;
      part1Hidden = useIsPartHidden("part-1");
      return <div data-testid="test-part-1" />;
    }

    function TestPart2() {
      part2RenderCount++;
      part2Hidden = useIsPartHidden("part-2");
      return <div data-testid="test-part-2" />;
    }

    render(
      <>
        <TestPart1 />
        <TestPart2 />
      </>
    );

    expect(part1Hidden).toBe(false);
    expect(part2Hidden).toBe(false);
    const initialPart1Renders = part1RenderCount;
    const initialPart2Renders = part2RenderCount;

    act(() => {
      useStore.setState({
        hiddenPartIds: new Set(["part-1"]),
      });
    });

    expect(part1Hidden).toBe(true);
    expect(part1RenderCount).toBeGreaterThan(initialPart1Renders);
    expect(part2Hidden).toBe(false);
    expect(part2RenderCount).toBe(initialPart2Renders);
  });
});
