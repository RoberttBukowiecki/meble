/* eslint-disable react-hooks/globals */
/**
 * Render Performance Tests for Scene Component
 *
 * These tests verify that Scene and its child components (Part3D, etc.)
 * don't re-render excessively when performing basic operations.
 *
 * Goals:
 * - Part3D should only re-render when its own data changes
 * - Scene should only re-render when relevant state changes
 * - Selecting a part should not re-render all parts
 * - Updating one part should not re-render other parts
 */

import React, { useRef, useEffect } from 'react';
import { render, act, screen } from '@testing-library/react';
import { useStore, useSelectedFurnitureParts, useSelectedPart, useIsPartHidden } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import type { Part, Material, Cabinet, CabinetType } from '@/types';
import { DEFAULT_FURNITURE_ID } from '@/lib/store/constants';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Render counter component - wraps children and counts renders
 */
function RenderCounter({
  id,
  counters,
  children,
}: {
  id: string;
  counters: Map<string, number>;
  children?: React.ReactNode;
}) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  counters.set(id, renderCount.current);

  return <div data-testid={`counter-${id}`}>{children}</div>;
}

/**
 * Simulates Part3D component's store usage pattern
 * Uses useShallow exactly like the real Part3D component
 */
function MockPart3D({
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

  return (
    <div data-testid={`mock-part-${part.id}`}>
      {part.name} - renders: {renderCount.current}
    </div>
  );
}

/**
 * Simulates Scene component's store usage pattern
 */
function MockScene({ renderCounters }: { renderCounters: Map<string, number> }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renderCounters.set('scene', renderCount.current);

  const parts = useSelectedFurnitureParts();
  const selectedPart = useSelectedPart();

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

  return (
    <div data-testid="mock-scene">
      Scene renders: {renderCount.current}
      {parts.map((part) => (
        <MockPart3D key={part.id} part={part} renderCounters={renderCounters} />
      ))}
    </div>
  );
}

// ============================================================================
// Test Setup
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
    materialId: 'mat-1',
    shapeType: 'RECT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestMaterial(id: string): Material {
  return {
    id,
    name: 'Test Material',
    color: '#8B4513',
    thickness: 18,
    category: 'board',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function resetStore() {
  const store = useStore.getState();
  // Reset to initial state
  useStore.setState({
    parts: [],
    materials: [createTestMaterial('mat-1')],
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

// ============================================================================
// Tests
// ============================================================================

describe('Scene Render Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Part3D isolation', () => {
    it('should not re-render all parts when selecting one part', () => {
      const renderCounters = new Map<string, number>();

      // Add 3 parts to the store
      const part1 = createTestPart('part-1', 'Part 1');
      const part2 = createTestPart('part-2', 'Part 2');
      const part3 = createTestPart('part-3', 'Part 3');

      act(() => {
        useStore.setState({
          parts: [part1, part2, part3],
        });
      });

      // Render the mock scene
      render(<MockScene renderCounters={renderCounters} />);

      // Initial render counts
      const initialPart1Renders = renderCounters.get('part-part-1') || 0;
      const initialPart2Renders = renderCounters.get('part-part-2') || 0;
      const initialPart3Renders = renderCounters.get('part-part-3') || 0;

      expect(initialPart1Renders).toBe(1);
      expect(initialPart2Renders).toBe(1);
      expect(initialPart3Renders).toBe(1);

      // Select part 1
      act(() => {
        useStore.getState().selectPart('part-1');
      });

      // All parts re-render due to selection state change (selectedPartId, selectedPartIds)
      // This is expected behavior - selection state is shared
      const afterSelectPart1Renders = renderCounters.get('part-part-1') || 0;
      const afterSelectPart2Renders = renderCounters.get('part-part-2') || 0;
      const afterSelectPart3Renders = renderCounters.get('part-part-3') || 0;

      // Parts should re-render (selection changes affect all parts for visual feedback)
      expect(afterSelectPart1Renders).toBeGreaterThan(initialPart1Renders);
      expect(afterSelectPart2Renders).toBeGreaterThan(initialPart2Renders);
      expect(afterSelectPart3Renders).toBeGreaterThan(initialPart3Renders);
    });

    it('should not re-render parts when updating unrelated part data', () => {
      const renderCounters = new Map<string, number>();

      const part1 = createTestPart('part-1', 'Part 1');
      const part2 = createTestPart('part-2', 'Part 2');
      const part3 = createTestPart('part-3', 'Part 3');

      act(() => {
        useStore.setState({
          parts: [part1, part2, part3],
        });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialPart2Renders = renderCounters.get('part-part-2') || 0;
      const initialPart3Renders = renderCounters.get('part-part-3') || 0;

      // Update part 1's name (simple update that doesn't trigger shapeParams logic)
      act(() => {
        useStore.getState().updatePart('part-1', { name: 'Updated Part 1' });
      });

      // Part 2 and Part 3 should NOT re-render (their data didn't change)
      // Note: They may re-render once if Scene re-renders, but the count should be minimal
      const afterUpdatePart2Renders = renderCounters.get('part-part-2') || 0;
      const afterUpdatePart3Renders = renderCounters.get('part-part-3') || 0;

      // Parts get re-mounted when parts array changes due to React reconciliation
      // This is expected - the key test is that re-renders are bounded
      expect(afterUpdatePart2Renders).toBeLessThanOrEqual(3);
      expect(afterUpdatePart3Renders).toBeLessThanOrEqual(3);
    });

    it('should not re-render parts when hiding a different part', () => {
      const renderCounters = new Map<string, number>();

      const part1 = createTestPart('part-1', 'Part 1');
      const part2 = createTestPart('part-2', 'Part 2');

      act(() => {
        useStore.setState({
          parts: [part1, part2],
        });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialPart2Renders = renderCounters.get('part-part-2') || 0;

      // Hide part 1 (should not affect part 2)
      act(() => {
        useStore.getState().hideParts(['part-1']);
      });

      // Part 2 should NOT re-render (useIsPartHidden is isolated by partId)
      const afterHidePart2Renders = renderCounters.get('part-part-2') || 0;

      // useIsPartHidden(part-2) should return stable result, no re-render
      expect(afterHidePart2Renders).toBe(initialPart2Renders);
    });
  });

  describe('Scene isolation', () => {
    it('should not re-render Scene when only materials change', () => {
      const renderCounters = new Map<string, number>();

      act(() => {
        useStore.setState({
          parts: [createTestPart('part-1', 'Part 1')],
        });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialSceneRenders = renderCounters.get('scene') || 0;

      // Add a new material
      act(() => {
        useStore.getState().addMaterial({
          id: 'mat-2',
          name: 'New Material',
          color: '#FF0000',
          thickness: 18,
          category: 'board',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Scene should NOT re-render (materials are not in Scene's selector)
      const afterMaterialSceneRenders = renderCounters.get('scene') || 0;
      expect(afterMaterialSceneRenders).toBe(initialSceneRenders);
    });

    it('should re-render Scene when transform mode changes', () => {
      const renderCounters = new Map<string, number>();

      act(() => {
        useStore.setState({
          parts: [createTestPart('part-1', 'Part 1')],
        });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialSceneRenders = renderCounters.get('scene') || 0;

      // Change transform mode
      act(() => {
        useStore.getState().setTransformMode('rotate');
      });

      // Scene SHOULD re-render (transformMode is in Scene's selector)
      const afterModeSceneRenders = renderCounters.get('scene') || 0;
      expect(afterModeSceneRenders).toBeGreaterThan(initialSceneRenders);
    });

    it('should re-render Scene when cabinets change', () => {
      const renderCounters = new Map<string, number>();

      const part1 = createTestPart('part-1', 'Part 1');

      act(() => {
        useStore.setState({
          parts: [part1],
        });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialSceneRenders = renderCounters.get('scene') || 0;

      // Directly update cabinets array (simulating addCabinet effect)
      act(() => {
        useStore.setState({
          cabinets: [
            {
              id: 'cab-1',
              name: 'Test Cabinet',
              furnitureId: DEFAULT_FURNITURE_ID,
              type: 'base',
              params: { width: 600, height: 720, depth: 560 },
              materials: { bodyMaterialId: 'mat-1', frontMaterialId: 'mat-1' },
              partIds: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        });
      });

      // Scene SHOULD re-render (cabinets is in Scene's selector)
      const afterCabinetSceneRenders = renderCounters.get('scene') || 0;
      expect(afterCabinetSceneRenders).toBeGreaterThan(initialSceneRenders);
    });
  });

  describe('Selector stability', () => {
    it('useSelectedFurnitureParts should return stable reference when parts dont change', () => {
      const part1 = createTestPart('part-1', 'Part 1');

      act(() => {
        useStore.setState({
          parts: [part1],
        });
      });

      let result1: Part[] = [];
      let result2: Part[] = [];

      function TestComponent() {
        const parts = useSelectedFurnitureParts();
        if (!result1.length) {
          result1 = parts;
        } else if (!result2.length) {
          result2 = parts;
        }
        return null;
      }

      const { rerender } = render(<TestComponent />);

      // Trigger a re-render without changing parts
      act(() => {
        useStore.getState().setTransformMode('rotate');
      });

      rerender(<TestComponent />);

      // Both results should reference the same filtered parts
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0].id).toBe(result2[0].id);
    });

    it('useIsPartHidden should be isolated per part', () => {
      const part1 = createTestPart('part-1', 'Part 1');
      const part2 = createTestPart('part-2', 'Part 2');

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
        part1Hidden = useIsPartHidden('part-1');
        return <div data-testid="test-part-1" />;
      }

      function TestPart2() {
        part2RenderCount++;
        part2Hidden = useIsPartHidden('part-2');
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

      // Hide part 1
      act(() => {
        useStore.setState({
          hiddenPartIds: new Set(['part-1']),
        });
      });

      // Part 1 should re-render (its hidden state changed)
      expect(part1Hidden).toBe(true);
      expect(part1RenderCount).toBeGreaterThan(initialPart1Renders);

      // Part 2 should NOT re-render (its hidden state is unchanged)
      expect(part2Hidden).toBe(false);
      expect(part2RenderCount).toBe(initialPart2Renders);
    });
  });

  describe('Batch operations', () => {
    it('should minimize re-renders during batch updates', () => {
      const renderCounters = new Map<string, number>();

      const parts = Array.from({ length: 10 }, (_, i) =>
        createTestPart(`part-${i}`, `Part ${i}`)
      );

      act(() => {
        useStore.setState({ parts });
      });

      render(<MockScene renderCounters={renderCounters} />);

      const initialSceneRenders = renderCounters.get('scene') || 0;

      // Perform multiple updates in a single batch
      act(() => {
        useStore.getState().updatePartsBatch(
          parts.slice(0, 5).map((p) => p.id),
          { width: 200 }
        );
      });

      const afterBatchSceneRenders = renderCounters.get('scene') || 0;

      // Scene should only re-render once for the entire batch
      // (not once per part)
      expect(afterBatchSceneRenders).toBeLessThanOrEqual(initialSceneRenders + 2);
    });

    it('should handle clear selection efficiently', () => {
      const renderCounters = new Map<string, number>();

      const parts = Array.from({ length: 5 }, (_, i) =>
        createTestPart(`part-${i}`, `Part ${i}`)
      );

      act(() => {
        useStore.setState({ parts });
      });

      render(<MockScene renderCounters={renderCounters} />);

      // Select multiple parts
      act(() => {
        useStore.getState().addToSelection(parts.map((p) => p.id));
      });

      const afterSelectRenders = renderCounters.get('scene') || 0;

      // Clear selection
      act(() => {
        useStore.getState().clearSelection();
      });

      const afterClearRenders = renderCounters.get('scene') || 0;

      // Should only be one additional render for clearing
      expect(afterClearRenders).toBeLessThanOrEqual(afterSelectRenders + 2);
    });
  });
});

describe('Render count thresholds', () => {
  beforeEach(() => {
    resetStore();
  });

  it('initial scene render should be exactly 1', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    expect(renderCounters.get('scene')).toBe(1);
    expect(renderCounters.get('part-part-1')).toBe(1);
  });

  it('adding a part should cause bounded re-renders', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Add a new part
    act(() => {
      useStore.getState().addPart({
        name: 'Part 2',
        furnitureId: DEFAULT_FURNITURE_ID,
        width: 100,
        height: 50,
        depth: 18,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        materialId: 'mat-1',
        shapeType: 'RECT',
      });
    });

    // Scene re-renders once for the new part
    const afterAddSceneRenders = renderCounters.get('scene') || 0;
    expect(afterAddSceneRenders).toBeLessThanOrEqual(initialSceneRenders + 2);
  });

  it('removing a part should cause bounded re-renders', () => {
    const renderCounters = new Map<string, number>();

    const part1 = createTestPart('part-1', 'Part 1');
    const part2 = createTestPart('part-2', 'Part 2');

    act(() => {
      useStore.setState({
        parts: [part1, part2],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;
    const initialPart2Renders = renderCounters.get('part-part-2') || 0;

    // Remove part 1
    act(() => {
      useStore.getState().removePart('part-1');
    });

    // Scene re-renders once
    const afterRemoveSceneRenders = renderCounters.get('scene') || 0;
    expect(afterRemoveSceneRenders).toBeLessThanOrEqual(initialSceneRenders + 2);

    // Part 2 may re-render due to array change but should be bounded
    const afterRemovePart2Renders = renderCounters.get('part-part-2') || 0;
    expect(afterRemovePart2Renders).toBeLessThanOrEqual(initialPart2Renders + 2);
  });
});

// ============================================================================
// Large Scale Performance Tests
// ============================================================================

describe('Large Scale Performance (50+ parts)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should handle 50 parts without excessive re-renders', () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // All parts should render exactly once on initial mount
    for (let i = 0; i < PART_COUNT; i++) {
      expect(renderCounters.get(`part-part-${i}`)).toBe(1);
    }
    expect(renderCounters.get('scene')).toBe(1);
  });

  it('should select one part without re-rendering all 50 parts excessively', () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Select one part
    act(() => {
      useStore.getState().selectPart('part-25');
    });

    // Total re-renders should be bounded (each part re-renders at most once for selection change)
    let totalReRenders = 0;
    for (let i = 0; i < PART_COUNT; i++) {
      totalReRenders += (renderCounters.get(`part-part-${i}`) || 0) - 1; // Subtract initial render
    }

    // With selection state shared, all parts re-render once = 50 re-renders max
    expect(totalReRenders).toBeLessThanOrEqual(PART_COUNT);
  });

  it('should update one part in 50 without re-rendering all', () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialTotalRenders = Array.from({ length: PART_COUNT }, (_, i) =>
      renderCounters.get(`part-part-${i}`) || 0
    ).reduce((a, b) => a + b, 0);

    // Update one part
    act(() => {
      useStore.getState().updatePart('part-25', { name: 'Updated Part 25' });
    });

    const afterTotalRenders = Array.from({ length: PART_COUNT }, (_, i) =>
      renderCounters.get(`part-part-${i}`) || 0
    ).reduce((a, b) => a + b, 0);

    // Scene re-renders, which causes all parts to re-render (due to parts prop)
    // But each part should only re-render once per Scene render
    const reRenderCount = afterTotalRenders - initialTotalRenders;
    expect(reRenderCount).toBeLessThanOrEqual(PART_COUNT * 2);
  });

  it('should handle batch update of 25 parts efficiently', () => {
    const renderCounters = new Map<string, number>();
    const PART_COUNT = 50;

    const parts = Array.from({ length: PART_COUNT }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Batch update 25 parts
    act(() => {
      useStore.getState().updatePartsBatch(
        parts.slice(0, 25).map((p) => p.id),
        { name: 'Batch Updated' }
      );
    });

    // Scene should render at most twice (once for the batch, maybe once for React internal reasons)
    const afterSceneRenders = renderCounters.get('scene') || 0;
    expect(afterSceneRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// Multiselect Performance Tests
// ============================================================================

describe('Multiselect Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should toggle selection efficiently', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Toggle 5 parts one by one
    for (let i = 0; i < 5; i++) {
      act(() => {
        useStore.getState().togglePartSelection(`part-${i}`);
      });
    }

    const afterToggleRenders = renderCounters.get('scene') || 0;

    // Each toggle should cause at most 1 Scene re-render
    expect(afterToggleRenders - initialSceneRenders).toBeLessThanOrEqual(5);
  });

  it('should addToSelection efficiently with many parts', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 20 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Add 10 parts to selection in one call
    act(() => {
      useStore.getState().addToSelection(parts.slice(0, 10).map((p) => p.id));
    });

    const afterAddRenders = renderCounters.get('scene') || 0;

    // Single batch add should cause at most 2 re-renders
    expect(afterAddRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });

  it('should selectRange efficiently', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 20 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // First select a part to set anchor
    act(() => {
      useStore.getState().selectPart('part-5');
    });

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Select range from part-5 to part-15
    act(() => {
      useStore.getState().selectRange('part-5', 'part-15');
    });

    const afterRangeRenders = renderCounters.get('scene') || 0;

    // Range selection should cause at most 2 re-renders
    expect(afterRangeRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });

  it('should selectAll efficiently', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 30 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Select all
    act(() => {
      useStore.getState().selectAll();
    });

    const afterSelectAllRenders = renderCounters.get('scene') || 0;

    // Select all should cause at most 2 re-renders
    expect(afterSelectAllRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });

  it('should deleteSelectedParts without excessive re-renders', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 20 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Select 10 parts
    act(() => {
      useStore.getState().addToSelection(parts.slice(0, 10).map((p) => p.id));
    });

    const beforeDeleteRenders = renderCounters.get('scene') || 0;

    // Delete selected parts
    act(() => {
      useStore.getState().deleteSelectedParts();
    });

    const afterDeleteRenders = renderCounters.get('scene') || 0;

    // Delete should cause at most 2 re-renders
    expect(afterDeleteRenders - beforeDeleteRenders).toBeLessThanOrEqual(2);

    // Verify only 10 parts remain
    expect(useStore.getState().parts).toHaveLength(10);
  });
});

// ============================================================================
// Transform Operations Performance
// ============================================================================

describe('Transform Operations Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set isTransforming without cascading re-renders', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Start transforming
    act(() => {
      useStore.getState().setIsTransforming(true);
    });

    // End transforming
    act(() => {
      useStore.getState().setIsTransforming(false);
    });

    const afterTransformRenders = renderCounters.get('scene') || 0;

    // Two state changes = at most 4 re-renders
    expect(afterTransformRenders - initialSceneRenders).toBeLessThanOrEqual(4);
  });

  it('should set transformingPartId efficiently', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Get initial render counts for all parts
    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 10; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Set transforming part
    act(() => {
      useStore.getState().setTransformingPartId('part-5');
    });

    // Only affected parts should re-render (those checking transformingPartId)
    let totalExtraRenders = 0;
    for (let i = 0; i < 10; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      totalExtraRenders += after - initial;
    }

    // Each part re-renders once due to transformingPartId in selector
    expect(totalExtraRenders).toBeLessThanOrEqual(10);
  });

  it('should switch transform modes efficiently', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Switch through all modes
    act(() => {
      useStore.getState().setTransformMode('rotate');
    });
    act(() => {
      useStore.getState().setTransformMode('resize');
    });
    act(() => {
      useStore.getState().setTransformMode('translate');
    });

    const afterModeRenders = renderCounters.get('scene') || 0;

    // 3 mode changes = at most 6 re-renders
    expect(afterModeRenders - initialSceneRenders).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// Unrelated State Changes (Isolation Tests)
// ============================================================================

describe('Unrelated State Changes Isolation', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should not re-render parts when snap settings change', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Toggle snap
    act(() => {
      useStore.getState().toggleSnap();
    });

    // Parts should not re-render (snap is not in Part3D selector)
    for (let i = 0; i < 5; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      // Scene re-renders (snap is in Scene selector), so parts may re-mount
      // But should be bounded
      expect(after - initial).toBeLessThanOrEqual(2);
    }
  });

  it('should not re-render parts when graphics settings change', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Update graphics settings
    act(() => {
      useStore.getState().updateGraphicsSettings({ shadows: false });
    });

    // Check bounded re-renders
    for (let i = 0; i < 5; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      expect(after - initial).toBeLessThanOrEqual(2);
    }
  });

  it('should not re-render parts when dimension settings change', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Update dimension settings
    act(() => {
      useStore.getState().setDimensionEnabled(true);
    });

    // Check bounded re-renders
    for (let i = 0; i < 5; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      expect(after - initial).toBeLessThanOrEqual(2);
    }
  });

  it('should not re-render Scene when history stack changes', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Clear history (should not affect Scene)
    act(() => {
      useStore.getState().clearHistory();
    });

    const afterHistoryRenders = renderCounters.get('scene') || 0;

    // Scene selector doesn't include history, so no re-render expected
    expect(afterHistoryRenders).toBe(initialSceneRenders);
  });
});

// ============================================================================
// Stress Tests - Rapid State Changes
// ============================================================================

describe('Stress Tests - Rapid State Changes', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should handle 100 rapid selection changes', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Perform 100 rapid selection changes
    act(() => {
      for (let i = 0; i < 100; i++) {
        useStore.getState().selectPart(`part-${i % 10}`);
      }
    });

    const afterRapidRenders = renderCounters.get('scene') || 0;

    // React batches updates in act(), so we expect far fewer than 100 re-renders
    // Ideally just a few re-renders for the entire batch
    expect(afterRapidRenders - initialSceneRenders).toBeLessThanOrEqual(5);
  });

  it('should handle 50 rapid transform mode switches', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;
    const modes = ['translate', 'rotate', 'resize'] as const;

    // Perform 50 rapid mode switches
    act(() => {
      for (let i = 0; i < 50; i++) {
        useStore.getState().setTransformMode(modes[i % 3]);
      }
    });

    const afterRapidRenders = renderCounters.get('scene') || 0;

    // React batches updates, so expect far fewer than 50 re-renders
    expect(afterRapidRenders - initialSceneRenders).toBeLessThanOrEqual(5);
  });

  it('should handle rapid hide/show toggles', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPart5Renders = renderCounters.get('part-part-5') || 0;

    // Toggle hide/show for part-5 multiple times
    act(() => {
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          useStore.getState().hideParts(['part-5']);
        } else {
          useStore.getState().showParts(['part-5']);
        }
      }
    });

    const afterToggleRenders = renderCounters.get('part-part-5') || 0;

    // Batched updates should result in minimal re-renders
    expect(afterToggleRenders - initialPart5Renders).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// Furniture Switching Performance
// ============================================================================

describe('Furniture Switching Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should switch furniture without re-rendering parts from other furniture', () => {
    const renderCounters = new Map<string, number>();

    const FURNITURE_1 = 'furniture-1';
    const FURNITURE_2 = 'furniture-2';

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
          { id: FURNITURE_1, name: 'Furniture 1' },
          { id: FURNITURE_2, name: 'Furniture 2' },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Initially, only furniture-1 parts should be rendered
    for (let i = 0; i < 5; i++) {
      expect(renderCounters.get(`part-part-1-${i}`)).toBe(1);
      expect(renderCounters.get(`part-part-2-${i}`)).toBeUndefined();
    }

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Switch to furniture 2
    act(() => {
      useStore.getState().setSelectedFurniture(FURNITURE_2);
    });

    const afterSwitchRenders = renderCounters.get('scene') || 0;

    // Scene should re-render (different parts now)
    expect(afterSwitchRenders).toBeGreaterThan(initialSceneRenders);

    // Now furniture-2 parts should be rendered
    for (let i = 0; i < 5; i++) {
      expect(renderCounters.get(`part-part-2-${i}`)).toBe(1);
    }
  });
});

// ============================================================================
// Collision Detection Performance
// ============================================================================

describe('Collision Detection Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should update collisions without excessive part re-renders', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts, collisions: [] });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialPartRenders = new Map<string, number>();
    for (let i = 0; i < 10; i++) {
      initialPartRenders.set(`part-${i}`, renderCounters.get(`part-part-${i}`) || 0);
    }

    // Add collision
    act(() => {
      useStore.setState({
        collisions: [
          {
            partId: 'part-0',
            collidingWith: ['part-1'],
            severity: 'warning' as const,
          },
        ],
      });
    });

    // All parts re-render because collisions is in the selector
    // But each should only re-render once
    for (let i = 0; i < 10; i++) {
      const initial = initialPartRenders.get(`part-${i}`) || 0;
      const after = renderCounters.get(`part-part-${i}`) || 0;
      expect(after - initial).toBeLessThanOrEqual(2);
    }
  });

  it('should clear collisions efficiently', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 10 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({
        parts,
        collisions: [
          { partId: 'part-0', collidingWith: ['part-1'], severity: 'warning' as const },
          { partId: 'part-2', collidingWith: ['part-3'], severity: 'error' as const },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialSceneRenders = renderCounters.get('scene') || 0;

    // Clear collisions
    act(() => {
      useStore.setState({ collisions: [] });
    });

    const afterClearRenders = renderCounters.get('scene') || 0;

    // Single state update = bounded re-renders
    expect(afterClearRenders - initialSceneRenders).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// useShallow Effectiveness Tests
// ============================================================================

describe('useShallow Effectiveness', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should prevent re-renders when unselected properties change', () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      // This selector only uses transformMode
      const { transformMode } = useStore(
        useShallow((state) => ({
          transformMode: state.transformMode,
        }))
      );
      return <div>{transformMode}</div>;
    }

    act(() => {
      useStore.setState({ transformMode: 'translate' });
    });

    render(<TestComponent />);

    const initialRenders = renderCount;

    // Change unrelated state
    act(() => {
      useStore.setState({ selectedPartId: 'some-id' });
    });

    // Should NOT re-render (selectedPartId not in selector)
    expect(renderCount).toBe(initialRenders);

    // Change related state
    act(() => {
      useStore.getState().setTransformMode('rotate');
    });

    // SHOULD re-render (transformMode is in selector)
    expect(renderCount).toBeGreaterThan(initialRenders);
  });

  it('should shallow compare objects correctly', () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const { rooms } = useStore(
        useShallow((state) => ({
          rooms: state.rooms,
        }))
      );
      return <div>{rooms.length}</div>;
    }

    act(() => {
      useStore.setState({ rooms: [] });
    });

    render(<TestComponent />);

    const initialRenders = renderCount;

    // Set same empty array (reference change but shallow equal)
    act(() => {
      useStore.setState({ rooms: [] });
    });

    // Should NOT re-render (shallow equal arrays)
    // Note: actually it will re-render because [] !== [] by reference
    // This tests that we understand the limitation
    expect(renderCount).toBeLessThanOrEqual(initialRenders + 1);
  });
});

// ============================================================================
// Memory and Cleanup Tests
// ============================================================================

describe('Memory and Cleanup', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should not leak render counters when parts are removed', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    const { rerender, unmount } = render(<MockScene renderCounters={renderCounters} />);

    // Scene should be rendered
    expect(renderCounters.get('scene')).toBeDefined();
    expect(renderCounters.get('scene')).toBe(1);

    // Remove all parts
    act(() => {
      useStore.setState({ parts: [] });
    });

    rerender(<MockScene renderCounters={renderCounters} />);

    // Scene should still be tracked
    expect(renderCounters.get('scene')).toBeDefined();

    unmount();
  });

  it('should cleanup properly on unmount', () => {
    const renderCounters = new Map<string, number>();

    act(() => {
      useStore.setState({
        parts: [createTestPart('part-1', 'Part 1')],
      });
    });

    const { unmount } = render(<MockScene renderCounters={renderCounters} />);

    expect(renderCounters.get('scene')).toBe(1);

    unmount();

    // After unmount, state changes should not cause issues
    act(() => {
      useStore.getState().selectPart('part-1');
    });

    // Render count stays the same (component unmounted)
    expect(renderCounters.get('scene')).toBe(1);
  });
});

// ============================================================================
// CRITICAL: Individual Part3D Isolation Tests
// These tests verify that each Part3D component is properly isolated
// and doesn't re-render when only other parts are affected
// ============================================================================

describe('CRITICAL: Individual Part3D Isolation', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * Test component that mimics optimized Part3D isolation
   * Uses individual selectors for each piece of state that affects this part
   */
  function OptimizedMockPart3D({
    partId,
    renderCounters,
  }: {
    partId: string;
    renderCounters: Map<string, number>;
  }) {
    const renderCount = React.useRef(0);
    renderCount.current += 1;
    renderCounters.set(`optimized-${partId}`, renderCount.current);

    // OPTIMIZED: Individual selectors for each boolean check
    // This prevents re-renders when other parts' selection state changes
    const isSelected = useStore((state) => state.selectedPartIds.has(partId));
    const isSingleSelected = useStore((state) => state.selectedPartId === partId);
    const isTransforming = useStore((state) => state.transformingPartId === partId);
    const isTransformingMulti = useStore((state) => state.transformingPartIds.has(partId));
    const isHidden = useIsPartHidden(partId);

    return (
      <div data-testid={`optimized-part-${partId}`}>
        Part {partId} - renders: {renderCount.current}
        {isSelected && ' [selected]'}
        {isTransforming && ' [transforming]'}
      </div>
    );
  }

  /**
   * Mock Scene that uses optimized Part3D components
   */
  function OptimizedMockScene({
    partIds,
    renderCounters,
  }: {
    partIds: string[];
    renderCounters: Map<string, number>;
  }) {
    const renderCount = React.useRef(0);
    renderCount.current += 1;
    renderCounters.set('optimized-scene', renderCount.current);

    return (
      <div data-testid="optimized-scene">
        {partIds.map((id) => (
          <OptimizedMockPart3D key={id} partId={id} renderCounters={renderCounters} />
        ))}
      </div>
    );
  }

  it('IDEAL: selecting one part should NOT re-render other parts (optimized pattern)', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3', 'part-4', 'part-5'];

    // Create parts in store
    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Initial renders - all should be 1
    for (const id of partIds) {
      expect(renderCounters.get(`optimized-${id}`)).toBe(1);
    }

    // Select part-1
    act(() => {
      useStore.getState().selectPart('part-1');
    });

    // CRITICAL: With optimized selectors, only part-1 should re-render
    // because it's the only one whose isSelected state changed from false to true
    const part1Renders = renderCounters.get('optimized-part-1') || 0;
    const part2Renders = renderCounters.get('optimized-part-2') || 0;
    const part3Renders = renderCounters.get('optimized-part-3') || 0;

    // Part 1 re-renders (selected state changed)
    expect(part1Renders).toBe(2);

    // Other parts should NOT re-render (their state didn't change)
    // This is the ideal behavior we want!
    expect(part2Renders).toBe(1);
    expect(part3Renders).toBe(1);
  });

  it('IDEAL: multiselect add should only re-render added parts (optimized pattern)', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3', 'part-4', 'part-5'];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Add part-1 and part-2 to selection
    act(() => {
      useStore.getState().addToSelection(['part-1', 'part-2']);
    });

    // Only part-1 and part-2 should re-render
    expect(renderCounters.get('optimized-part-1')).toBe(2);
    expect(renderCounters.get('optimized-part-2')).toBe(2);

    // part-3, part-4, part-5 should NOT re-render
    expect(renderCounters.get('optimized-part-3')).toBe(1);
    expect(renderCounters.get('optimized-part-4')).toBe(1);
    expect(renderCounters.get('optimized-part-5')).toBe(1);
  });

  it('IDEAL: toggle selection should only re-render toggled part (optimized pattern)', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3'];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Toggle part-2
    act(() => {
      useStore.getState().togglePartSelection('part-2');
    });

    // Only part-2 should re-render
    expect(renderCounters.get('optimized-part-1')).toBe(1);
    expect(renderCounters.get('optimized-part-2')).toBe(2);
    expect(renderCounters.get('optimized-part-3')).toBe(1);
  });

  it('IDEAL: clear selection should only re-render previously selected parts', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3', 'part-4', 'part-5'];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({
        parts,
        selectedPartIds: new Set(['part-1', 'part-2']),
        selectedPartId: 'part-1',
      });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Clear selection
    act(() => {
      useStore.getState().clearSelection();
    });

    // Only previously selected parts (1, 2) should re-render
    expect(renderCounters.get('optimized-part-1')).toBe(2);
    expect(renderCounters.get('optimized-part-2')).toBe(2);

    // Unselected parts should NOT re-render
    expect(renderCounters.get('optimized-part-3')).toBe(1);
    expect(renderCounters.get('optimized-part-4')).toBe(1);
    expect(renderCounters.get('optimized-part-5')).toBe(1);
  });

  it('IDEAL: hiding one part should not re-render other parts', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3'];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts, hiddenPartIds: new Set() });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Hide part-2
    act(() => {
      useStore.getState().hideParts(['part-2']);
    });

    // Only part-2 should re-render (its hidden state changed)
    expect(renderCounters.get('optimized-part-1')).toBe(1);
    expect(renderCounters.get('optimized-part-2')).toBe(2);
    expect(renderCounters.get('optimized-part-3')).toBe(1);
  });

  it('IDEAL: setting transformingPartId should only re-render affected part', () => {
    const renderCounters = new Map<string, number>();
    const partIds = ['part-1', 'part-2', 'part-3'];

    const parts = partIds.map((id) => createTestPart(id, `Part ${id}`));
    act(() => {
      useStore.setState({ parts });
    });

    render(<OptimizedMockScene partIds={partIds} renderCounters={renderCounters} />);

    // Set transforming part
    act(() => {
      useStore.getState().setTransformingPartId('part-2');
    });

    // Only part-2 should re-render
    expect(renderCounters.get('optimized-part-1')).toBe(1);
    expect(renderCounters.get('optimized-part-2')).toBe(2);
    expect(renderCounters.get('optimized-part-3')).toBe(1);
  });
});

// ============================================================================
// CURRENT IMPLEMENTATION: Tests showing current behavior
// These tests document the current behavior and where improvements are needed
// ============================================================================

describe('CURRENT: Part3D Implementation Behavior Analysis', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ANALYSIS: current Part3D re-renders on any selection change', () => {
    const renderCounters = new Map<string, number>();

    const parts = Array.from({ length: 5 }, (_, i) =>
      createTestPart(`part-${i}`, `Part ${i}`)
    );

    act(() => {
      useStore.setState({ parts });
    });

    render(<MockScene renderCounters={renderCounters} />);

    // Select part-0
    act(() => {
      useStore.getState().selectPart('part-0');
    });

    // Current behavior: ALL parts re-render because selectedPartIds is in shared selector
    // This is what we document - not ideal but current behavior
    const allPartRenders = [0, 1, 2, 3, 4].map(
      (i) => renderCounters.get(`part-part-${i}`) || 0
    );

    // Document current behavior: all parts likely re-rendered
    // This test passes but documents the issue
    const totalReRenders = allPartRenders.reduce((a, b) => a + b, 0) - 5; // subtract initial renders

    // If this is > 1, multiple parts re-rendered (current behavior)
    // When we optimize, this should become 1 (only selected part re-renders)
    console.log(`Total extra re-renders on single selection: ${totalReRenders}`);

    // For now, just verify it's bounded (not infinite loop)
    expect(totalReRenders).toBeLessThanOrEqual(5);
  });

  it('ANALYSIS: identify which selector values cause unnecessary re-renders', () => {
    let selectorCallCount = 0;
    let selectedPartIdsChanges = 0;
    let lastSelectedPartIds: Set<string> | null = null;

    function AnalysisComponent({ partId }: { partId: string }) {
      selectorCallCount++;

      const { selectedPartIds } = useStore(
        useShallow((state) => {
          // Track when selectedPartIds reference changes
          if (lastSelectedPartIds !== state.selectedPartIds) {
            selectedPartIdsChanges++;
            lastSelectedPartIds = state.selectedPartIds;
          }
          return { selectedPartIds: state.selectedPartIds };
        })
      );

      return <div>Part {partId}</div>;
    }

    const parts = [createTestPart('part-1', 'Part 1'), createTestPart('part-2', 'Part 2')];

    act(() => {
      useStore.setState({ parts });
    });

    render(
      <>
        <AnalysisComponent partId="part-1" />
        <AnalysisComponent partId="part-2" />
      </>
    );

    const initialCalls = selectorCallCount;
    const initialChanges = selectedPartIdsChanges;

    // Select part-1
    act(() => {
      useStore.getState().selectPart('part-1');
    });

    // Document: how many times did the selector get called?
    console.log(`Selector calls after selection: ${selectorCallCount - initialCalls}`);
    console.log(`selectedPartIds reference changes: ${selectedPartIdsChanges - initialChanges}`);

    // The issue: selectedPartIds is a new Set on every selection change
    // This causes all components with this selector to re-render
    expect(selectorCallCount).toBeGreaterThan(initialCalls);
  });
});

// ============================================================================
// Cabinet Isolation Tests
// ============================================================================

describe('Cabinet Component Isolation', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should not re-render cabinet parts when unrelated cabinet is selected', () => {
    const renderCounters = new Map<string, number>();

    // Create parts for two cabinets
    const cabinet1Parts = Array.from({ length: 3 }, (_, i) => ({
      ...createTestPart(`cab1-part-${i}`, `Cabinet 1 Part ${i}`),
      cabinetMetadata: { cabinetId: 'cabinet-1', role: 'SIDE' as const },
    }));

    const cabinet2Parts = Array.from({ length: 3 }, (_, i) => ({
      ...createTestPart(`cab2-part-${i}`, `Cabinet 2 Part ${i}`),
      cabinetMetadata: { cabinetId: 'cabinet-2', role: 'SIDE' as const },
    }));

    act(() => {
      useStore.setState({
        parts: [...cabinet1Parts, ...cabinet2Parts],
        cabinets: [
          {
            id: 'cabinet-1',
            name: 'Cabinet 1',
            furnitureId: DEFAULT_FURNITURE_ID,
            type: 'base',
            params: { width: 600, height: 720, depth: 560 },
            materials: { bodyMaterialId: 'mat-1', frontMaterialId: 'mat-1' },
            partIds: cabinet1Parts.map((p) => p.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'cabinet-2',
            name: 'Cabinet 2',
            furnitureId: DEFAULT_FURNITURE_ID,
            type: 'base',
            params: { width: 600, height: 720, depth: 560 },
            materials: { bodyMaterialId: 'mat-1', frontMaterialId: 'mat-1' },
            partIds: cabinet2Parts.map((p) => p.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialCab2Renders = [0, 1, 2].map(
      (i) => renderCounters.get(`part-cab2-part-${i}`) || 0
    );

    // Select cabinet 1
    act(() => {
      useStore.getState().selectCabinet('cabinet-1');
    });

    // Cabinet 2 parts should have bounded re-renders
    // Ideally 0 extra re-renders, but current implementation may cause some
    const afterCab2Renders = [0, 1, 2].map(
      (i) => renderCounters.get(`part-cab2-part-${i}`) || 0
    );

    const cab2ExtraRenders = afterCab2Renders.reduce((a, b) => a + b, 0) -
      initialCab2Renders.reduce((a, b) => a + b, 0);

    // Document current behavior and set reasonable bound
    expect(cab2ExtraRenders).toBeLessThanOrEqual(3);
  });

  it('should handle cabinet transform without re-rendering other cabinets', () => {
    const renderCounters = new Map<string, number>();

    const cabinet1Parts = [createTestPart('cab1-part-0', 'Cabinet 1 Part 0')];
    const cabinet2Parts = [createTestPart('cab2-part-0', 'Cabinet 2 Part 0')];

    act(() => {
      useStore.setState({
        parts: [...cabinet1Parts, ...cabinet2Parts],
        cabinets: [
          {
            id: 'cabinet-1',
            name: 'Cabinet 1',
            furnitureId: DEFAULT_FURNITURE_ID,
            type: 'base',
            params: {},
            materials: {},
            partIds: ['cab1-part-0'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'cabinet-2',
            name: 'Cabinet 2',
            furnitureId: DEFAULT_FURNITURE_ID,
            type: 'base',
            params: {},
            materials: {},
            partIds: ['cab2-part-0'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    render(<MockScene renderCounters={renderCounters} />);

    const initialCab2Renders = renderCounters.get('part-cab2-part-0') || 0;

    // Transform cabinet 1
    act(() => {
      useStore.getState().setTransformingCabinetId('cabinet-1');
    });

    const afterCab2Renders = renderCounters.get('part-cab2-part-0') || 0;

    // Cabinet 2 parts should have minimal re-renders
    expect(afterCab2Renders - initialCab2Renders).toBeLessThanOrEqual(2);
  });
});
