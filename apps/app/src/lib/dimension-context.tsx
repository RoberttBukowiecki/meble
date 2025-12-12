'use client';

/**
 * Dimension Context
 *
 * Provides ref-based dimension line state management for high-performance
 * dimension display during transform operations.
 *
 * Pattern (same as SnapContext):
 * - DimensionSettings are persisted in Zustand store
 * - Active dimension lines are stored in refs (no rerenders on update)
 * - Components read dimension state in useFrame callback (R3F render loop)
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import type { DimensionLine } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface DimensionContextValue {
  /** Ref holding current dimension lines (updated without rerender) */
  dimensionLinesRef: MutableRefObject<DimensionLine[]>;

  /** Ref holding version number for change detection in useFrame */
  versionRef: MutableRefObject<number>;

  /** Ref holding the currently active transform axis */
  activeAxisRef: MutableRefObject<'X' | 'Y' | 'Z' | null>;

  /** Update dimension lines (call this during drag) */
  setDimensionLines: (lines: DimensionLine[]) => void;

  /** Clear dimension lines (call on drag end) */
  clearDimensionLines: () => void;

  /** Set the active transform axis */
  setActiveAxis: (axis: 'X' | 'Y' | 'Z' | null) => void;
}

// ============================================================================
// Context
// ============================================================================

const DimensionContext = createContext<DimensionContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface DimensionProviderProps {
  children: ReactNode;
}

/**
 * DimensionProvider
 *
 * Wrap your Canvas or scene with this provider to enable dimension display.
 * Uses refs internally to avoid rerenders during frequent updates.
 */
export function DimensionProvider({ children }: DimensionProviderProps) {
  const dimensionLinesRef = useRef<DimensionLine[]>([]);
  const versionRef = useRef(0);
  const activeAxisRef = useRef<'X' | 'Y' | 'Z' | null>(null);

  const setDimensionLines = useCallback((lines: DimensionLine[]) => {
    dimensionLinesRef.current = lines;
    versionRef.current += 1;
  }, []);

  const clearDimensionLines = useCallback(() => {
    if (dimensionLinesRef.current.length > 0 || activeAxisRef.current !== null) {
      dimensionLinesRef.current = [];
      activeAxisRef.current = null;
      versionRef.current += 1;
    }
  }, []);

  const setActiveAxis = useCallback((axis: 'X' | 'Y' | 'Z' | null) => {
    activeAxisRef.current = axis;
  }, []);

  return (
    <DimensionContext.Provider
      value={{
        dimensionLinesRef,
        versionRef,
        activeAxisRef,
        setDimensionLines,
        clearDimensionLines,
        setActiveAxis,
      }}
    >
      {children}
    </DimensionContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * useDimensionContext
 *
 * Returns the full dimension context value. Must be used within a DimensionProvider.
 */
export function useDimensionContext(): DimensionContextValue {
  const context = useContext(DimensionContext);
  if (!context) {
    throw new Error('useDimensionContext must be used within a DimensionProvider');
  }
  return context;
}

/**
 * useDimensionLines
 *
 * Convenience hook that returns just the setter functions.
 * Use this in transform controls to update dimension lines during drag.
 */
export function useDimensionLines() {
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();
  return { setDimensionLines, clearDimensionLines, setActiveAxis };
}

/**
 * useDimensionLinesRef
 *
 * Returns the refs for reading dimension lines in useFrame.
 * Use this in DimensionRenderer to read current dimension state.
 */
export function useDimensionLinesRef() {
  const { dimensionLinesRef, versionRef, activeAxisRef } = useDimensionContext();
  return { dimensionLinesRef, versionRef, activeAxisRef };
}
