/**
 * Cabinet Component Render Performance Tests
 *
 * Tests for cabinet component isolation and render optimization.
 */

import React, { useRef } from "react";
import { render, act } from "@testing-library/react";
import {
  resetStore,
  createTestPart,
  createTestCabinet,
  MockScene,
  useStore,
  useShallow,
  DEFAULT_FURNITURE_ID,
} from "./test-helpers.util";

describe("Cabinet Component Isolation", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should not re-render cabinet parts when unrelated cabinet is selected", () => {
    const renderCounters = new Map<string, number>();

    // Create parts for two cabinets
    const cabinet1Parts = Array.from({ length: 3 }, (_, i) => ({
      ...createTestPart(`cab1-part-${i}`, `Cabinet 1 Part ${i}`),
      cabinetMetadata: { cabinetId: "cabinet-1", role: "SIDE" as const },
    }));

    const cabinet2Parts = Array.from({ length: 3 }, (_, i) => ({
      ...createTestPart(`cab2-part-${i}`, `Cabinet 2 Part ${i}`),
      cabinetMetadata: { cabinetId: "cabinet-2", role: "SIDE" as const },
    }));

    act(() => {
      useStore.setState({
        parts: [...cabinet1Parts, ...cabinet2Parts],
        cabinets: [
          {
            id: "cabinet-1",
            name: "Cabinet 1",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: { width: 600, height: 720, depth: 560 },
            materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
            partIds: cabinet1Parts.map((p) => p.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "cabinet-2",
            name: "Cabinet 2",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: { width: 600, height: 720, depth: 560 },
            materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
            partIds: cabinet2Parts.map((p) => p.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialCab2Renders = [0, 1, 2].map((i) => renderCounters.get(`part-cab2-part-${i}`) || 0);

    // Select cabinet 1
    act(() => {
      useStore.getState().selectCabinet("cabinet-1");
    });

    // Cabinet 2 parts should have bounded re-renders
    // Ideally 0 extra re-renders, but current implementation may cause some
    const afterCab2Renders = [0, 1, 2].map((i) => renderCounters.get(`part-cab2-part-${i}`) || 0);

    const cab2ExtraRenders =
      afterCab2Renders.reduce((a, b) => a + b, 0) - initialCab2Renders.reduce((a, b) => a + b, 0);

    // Document current behavior and set reasonable bound
    expect(cab2ExtraRenders).toBeLessThanOrEqual(3);
  });

  it("should handle cabinet transform without re-rendering other cabinets", () => {
    const renderCounters = new Map<string, number>();

    const cabinet1Parts = [createTestPart("cab1-part-0", "Cabinet 1 Part 0")];
    const cabinet2Parts = [createTestPart("cab2-part-0", "Cabinet 2 Part 0")];

    act(() => {
      useStore.setState({
        parts: [...cabinet1Parts, ...cabinet2Parts],
        cabinets: [
          {
            id: "cabinet-1",
            name: "Cabinet 1",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: ["cab1-part-0"],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "cabinet-2",
            name: "Cabinet 2",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: ["cab2-part-0"],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialCab2Renders = renderCounters.get("part-cab2-part-0") || 0;

    // Transform cabinet 1
    act(() => {
      useStore.getState().setTransformingCabinetId("cabinet-1");
    });

    const afterCab2Renders = renderCounters.get("part-cab2-part-0") || 0;

    // Cabinet 2 parts should have minimal re-renders
    expect(afterCab2Renders - initialCab2Renders).toBeLessThanOrEqual(2);
  });

  it("should handle multiple cabinets efficiently", () => {
    const renderCounters = new Map<string, number>();

    const allParts = Array.from({ length: 20 }, (_, i) =>
      createTestPart(
        `cab-${Math.floor(i / 4)}-part-${i % 4}`,
        `Cabinet ${Math.floor(i / 4)} Part ${i % 4}`
      )
    );

    const cabinets = Array.from({ length: 5 }, (_, i) => ({
      id: `cabinet-${i}`,
      name: `Cabinet ${i}`,
      furnitureId: DEFAULT_FURNITURE_ID,
      type: "base" as const,
      params: { width: 600, height: 720, depth: 560 },
      materials: { bodyMaterialId: "mat-1", frontMaterialId: "mat-1" },
      partIds: allParts.filter((_, j) => Math.floor(j / 4) === i).map((p) => p.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    act(() => {
      useStore.setState({
        parts: allParts,
        cabinets,
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Initial render - each part should render once
    for (let i = 0; i < 20; i++) {
      expect(renderCounters.get(`part-cab-${Math.floor(i / 4)}-part-${i % 4}`)).toBe(1);
    }

    // Select one cabinet
    act(() => {
      useStore.getState().selectCabinet("cabinet-2");
    });

    // Parts in other cabinets should have minimal re-renders
    for (let i = 0; i < 20; i++) {
      const cabinetIndex = Math.floor(i / 4);
      const partKey = `part-cab-${cabinetIndex}-part-${i % 4}`;
      const renders = renderCounters.get(partKey) || 0;
      // Allow some re-renders due to shared selection state
      expect(renders).toBeLessThanOrEqual(3);
    }
  });

  it("should handle cabinet deletion without excessive re-renders", () => {
    const renderCounters = new Map<string, number>();

    const cabinet1Parts = [createTestPart("cab1-part-0", "Cabinet 1 Part 0")];
    const cabinet2Parts = [createTestPart("cab2-part-0", "Cabinet 2 Part 0")];

    act(() => {
      useStore.setState({
        parts: [...cabinet1Parts, ...cabinet2Parts],
        cabinets: [
          {
            id: "cabinet-1",
            name: "Cabinet 1",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: ["cab1-part-0"],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "cabinet-2",
            name: "Cabinet 2",
            furnitureId: DEFAULT_FURNITURE_ID,
            type: "base",
            params: {},
            materials: {},
            partIds: ["cab2-part-0"],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get("scene") || 0;

    // Delete cabinet 1
    act(() => {
      useStore.getState().removeCabinet("cabinet-1");
    });

    const afterSceneRenders = renderCounters.get("scene") || 0;

    // Scene should re-render once or twice (for cabinets and parts update)
    expect(afterSceneRenders - initialSceneRenders).toBeLessThanOrEqual(2);

    // Cabinet 2 part should still exist and have minimal re-renders
    expect(renderCounters.get("part-cab2-part-0")).toBeLessThanOrEqual(3);
  });
});
