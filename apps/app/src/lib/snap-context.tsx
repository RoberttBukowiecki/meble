"use client";

/**
 * Snap Context
 *
 * Provides ref-based snap state management for high-performance snap operations.
 * This avoids frequent store updates during drag operations which would cause
 * performance issues.
 *
 * Pattern:
 * - SnapSettings are persisted in Zustand store
 * - Active snap points are stored in refs (no rerenders on update)
 * - Wall snap geometry is cached and updated when room/walls change
 * - Components read snap state in useFrame callback (R3F render loop)
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type MutableRefObject,
} from "react";
import type { SnapPoint } from "@/types";
import type { WallSnapCache } from "@/types/wall-snap";

// ============================================================================
// Types
// ============================================================================

/** Default wall snap cache */
const DEFAULT_WALL_SNAP_CACHE: WallSnapCache = {
  roomId: null,
  surfaces: [],
  corners: [],
  version: 0,
};

interface SnapContextValue {
  /** Ref holding current active snap points (updated without rerender) */
  snapPointsRef: MutableRefObject<SnapPoint[]>;

  /** Ref holding version number for change detection in useFrame */
  versionRef: MutableRefObject<number>;

  /** Update snap points (call this during drag) */
  setSnapPoints: (points: SnapPoint[]) => void;

  /** Clear snap points (call on drag end) */
  clearSnapPoints: () => void;

  /** Ref holding wall snap geometry cache */
  wallSnapCacheRef: MutableRefObject<WallSnapCache>;

  /** Update wall snap cache (call when room/walls change) */
  updateWallSnapCache: (cache: WallSnapCache) => void;
}

// ============================================================================
// Context
// ============================================================================

const SnapContext = createContext<SnapContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface SnapProviderProps {
  children: ReactNode;
}

/**
 * SnapProvider
 *
 * Wrap your Canvas or scene with this provider to enable snap visualizations.
 * Uses refs internally to avoid rerenders during frequent updates.
 */
export function SnapProvider({ children }: SnapProviderProps) {
  const snapPointsRef = useRef<SnapPoint[]>([]);
  const versionRef = useRef(0);
  const wallSnapCacheRef = useRef<WallSnapCache>(DEFAULT_WALL_SNAP_CACHE);

  const setSnapPoints = useCallback((points: SnapPoint[]) => {
    snapPointsRef.current = points;
    versionRef.current += 1;
  }, []);

  const clearSnapPoints = useCallback(() => {
    if (snapPointsRef.current.length > 0) {
      snapPointsRef.current = [];
      versionRef.current += 1;
    }
  }, []);

  const updateWallSnapCache = useCallback((cache: WallSnapCache) => {
    wallSnapCacheRef.current = cache;
  }, []);

  return (
    <SnapContext.Provider
      value={{
        snapPointsRef,
        versionRef,
        setSnapPoints,
        clearSnapPoints,
        wallSnapCacheRef,
        updateWallSnapCache,
      }}
    >
      {children}
    </SnapContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * useSnapContext
 *
 * Returns the snap context value. Must be used within a SnapProvider.
 */
export function useSnapContext(): SnapContextValue {
  const context = useContext(SnapContext);
  if (!context) {
    throw new Error("useSnapContext must be used within a SnapProvider");
  }
  return context;
}

/**
 * useSnapPoints
 *
 * Convenience hook that returns just the setter functions.
 * Use this in transform controls to update snap points during drag.
 */
export function useSnapPoints() {
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  return { setSnapPoints, clearSnapPoints };
}

/**
 * useSnapPointsRef
 *
 * Returns the refs for reading snap points in useFrame.
 * Use this in SnapGuidesRenderer to read current snap state.
 */
export function useSnapPointsRef() {
  const { snapPointsRef, versionRef } = useSnapContext();
  return { snapPointsRef, versionRef };
}

/**
 * useWallSnapCache
 *
 * Returns the wall snap cache ref and updater.
 * Use this in WallSnapCacheUpdater to update cache when room/walls change.
 */
export function useWallSnapCache() {
  const { wallSnapCacheRef, updateWallSnapCache } = useSnapContext();
  return { wallSnapCacheRef, updateWallSnapCache };
}
