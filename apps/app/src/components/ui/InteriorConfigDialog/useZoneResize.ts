"use client";

/**
 * Zone Resize Hook
 *
 * Handles drag-to-resize functionality for zone dividers.
 * Supports both horizontal and vertical resizing.
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface ResizeState {
  /** Index of the divider being dragged (zone above the divider) */
  dividerIndex: number;
  /** Starting Y/X position of the drag */
  startPosition: number;
  /** Starting ratios of all zones at drag start */
  startRatios: number[];
}

interface UseZoneResizeOptions {
  /** Current zone height/width ratios */
  ratios: number[];
  /** Callback when ratios change */
  onRatiosChange: (newRatios: number[]) => void;
  /** Direction of the layout */
  direction: "HORIZONTAL" | "VERTICAL";
  /** Minimum ratio for any zone */
  minRatio?: number;
  /** Container element ref for calculating positions */
  containerRef: React.RefObject<HTMLElement | null>;
}

export function useZoneResize({
  ratios,
  onRatiosChange,
  direction,
  minRatio = 0.1,
  containerRef,
}: UseZoneResizeOptions) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const isResizing = resizeState !== null;

  const handleResizeStart = useCallback(
    (dividerIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const position = direction === "HORIZONTAL" ? e.clientY : e.clientX;

      setResizeState({
        dividerIndex,
        startPosition: position,
        startRatios: [...ratios],
      });
    },
    [ratios, direction]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerSize = direction === "HORIZONTAL" ? rect.height : rect.width;
      const currentPosition = direction === "HORIZONTAL" ? e.clientY : e.clientX;

      // Calculate delta as a fraction of container size
      const deltaPixels = currentPosition - resizeState.startPosition;
      const deltaRatio = deltaPixels / containerSize;

      // For horizontal layout (flex-col-reverse), moving divider down decreases above zone
      const adjustedDelta = direction === "HORIZONTAL" ? -deltaRatio : deltaRatio;

      // Calculate new ratios
      const totalRatio = resizeState.startRatios.reduce((sum, r) => sum + r, 0);
      const { dividerIndex, startRatios } = resizeState;

      // The divider is between zones[dividerIndex] and zones[dividerIndex + 1]
      // In a flex-col-reverse container:
      // - First zone (index 0) is at the bottom
      // - Moving divider UP increases zone above (higher index), decreases zone below
      const zoneAboveIndex = dividerIndex + 1;
      const zoneBelowIndex = dividerIndex;

      if (zoneAboveIndex >= startRatios.length || zoneBelowIndex < 0) return;

      let newRatioAbove = startRatios[zoneAboveIndex] + adjustedDelta * totalRatio;
      let newRatioBelow = startRatios[zoneBelowIndex] - adjustedDelta * totalRatio;

      // Clamp to minimum ratios
      const minAbsolute = minRatio * totalRatio;
      if (newRatioAbove < minAbsolute) {
        const diff = minAbsolute - newRatioAbove;
        newRatioAbove = minAbsolute;
        newRatioBelow -= diff;
      }
      if (newRatioBelow < minAbsolute) {
        const diff = minAbsolute - newRatioBelow;
        newRatioBelow = minAbsolute;
        newRatioAbove -= diff;
      }

      // Round to 2 decimal places for cleaner values
      newRatioAbove = Math.round(newRatioAbove * 100) / 100;
      newRatioBelow = Math.round(newRatioBelow * 100) / 100;

      const newRatios = [...startRatios];
      newRatios[zoneAboveIndex] = newRatioAbove;
      newRatios[zoneBelowIndex] = newRatioBelow;

      onRatiosChange(newRatios);
    },
    [resizeState, containerRef, direction, minRatio, onRatiosChange]
  );

  const handleResizeEnd = useCallback(() => {
    setResizeState(null);
  }, []);

  // Add/remove global mouse event listeners during resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = direction === "HORIZONTAL" ? "ns-resize" : "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd, direction]);

  return {
    isResizing,
    handleResizeStart,
  };
}
