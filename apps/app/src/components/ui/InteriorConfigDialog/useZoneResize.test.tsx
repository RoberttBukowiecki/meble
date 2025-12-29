/**
 * useZoneResize Hook Tests
 *
 * Tests for the drag-to-resize functionality for zone dividers.
 */

import { renderHook, act } from "@testing-library/react";
import { useZoneResize } from "./useZoneResize";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock container element
function createMockContainer(width: number, height: number): HTMLElement {
  const element = document.createElement("div");
  element.getBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  }));
  return element;
}

// ============================================================================
// Tests
// ============================================================================

describe("useZoneResize Hook", () => {
  let onRatiosChange: jest.Mock;
  let containerRef: { current: HTMLElement | null };

  beforeEach(() => {
    jest.clearAllMocks();
    onRatiosChange = jest.fn();
    containerRef = { current: createMockContainer(400, 400) };
  });

  afterEach(() => {
    // Clean up any leftover event listeners
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  // ==========================================================================
  // ZR-001: Initial state
  // ==========================================================================
  describe("ZR-001: Initial state", () => {
    it("returns isResizing as false initially", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      expect(result.current.isResizing).toBe(false);
    });

    it("returns handleResizeStart function", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      expect(typeof result.current.handleResizeStart).toBe("function");
    });
  });

  // ==========================================================================
  // ZR-002: Resize start
  // ==========================================================================
  describe("ZR-002: Resize start", () => {
    it("sets isResizing to true when resize starts", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      expect(result.current.isResizing).toBe(true);
    });

    it("prevents default and stops propagation", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();

      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault,
          stopPropagation,
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("sets correct cursor style during resize (horizontal)", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      expect(document.body.style.cursor).toBe("ns-resize");
      expect(document.body.style.userSelect).toBe("none");
    });

    it("sets correct cursor style during resize (vertical)", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "VERTICAL",
          containerRef,
        })
      );

      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      expect(document.body.style.cursor).toBe("ew-resize");
    });
  });

  // ==========================================================================
  // ZR-003: Resize move (HORIZONTAL)
  // ==========================================================================
  describe("ZR-003: Resize move (HORIZONTAL)", () => {
    it("calls onRatiosChange when mouse moves during resize", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Move mouse
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 240, // 40px down
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(onRatiosChange).toHaveBeenCalled();
    });

    it("adjusts ratios based on movement amount", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1], // 50% each
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize at center
      act(() => {
        const mockEvent = {
          clientY: 200, // Middle of 400px container
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Move mouse down by 40px (10% of 400px container)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 240,
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      // For horizontal layout with flex-col-reverse, moving down decreases ratio
      expect(onRatiosChange).toHaveBeenCalled();
      const newRatios = onRatiosChange.mock.calls[0][0];
      // The sum should remain constant (2)
      expect(newRatios[0] + newRatios[1]).toBeCloseTo(2, 1);
    });
  });

  // ==========================================================================
  // ZR-004: Resize move (VERTICAL)
  // ==========================================================================
  describe("ZR-004: Resize move (VERTICAL)", () => {
    it("uses clientX for VERTICAL direction", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "VERTICAL",
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Move mouse horizontally
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 200,
          clientX: 280, // 80px to the right
        });
        window.dispatchEvent(moveEvent);
      });

      expect(onRatiosChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ZR-005: Resize end
  // ==========================================================================
  describe("ZR-005: Resize end", () => {
    it("sets isResizing to false on mouseup", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      expect(result.current.isResizing).toBe(true);

      // End resize
      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      expect(result.current.isResizing).toBe(false);
    });

    it("resets cursor style on mouseup", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // End resize
      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      expect(document.body.style.cursor).toBe("");
      expect(document.body.style.userSelect).toBe("");
    });
  });

  // ==========================================================================
  // ZR-006: Minimum ratio constraint
  // ==========================================================================
  describe("ZR-006: Minimum ratio constraint", () => {
    it("enforces minimum ratio", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [0.5, 0.5],
          onRatiosChange,
          direction: "HORIZONTAL",
          minRatio: 0.2, // 20% minimum
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Try to move a lot - should be clamped
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 380, // Try to move almost to the bottom
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(onRatiosChange).toHaveBeenCalled();
      const newRatios = onRatiosChange.mock.calls[0][0];
      // Neither ratio should be less than minRatio * totalRatio
      expect(newRatios[0]).toBeGreaterThanOrEqual(0.2 * 1); // minRatio * totalRatio
      expect(newRatios[1]).toBeGreaterThanOrEqual(0.2 * 1);
    });

    it("uses default minRatio of 0.1", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [0.5, 0.5],
          onRatiosChange,
          direction: "HORIZONTAL",
          // No minRatio specified - should use 0.1 default
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Move a lot
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 390,
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(onRatiosChange).toHaveBeenCalled();
      const newRatios = onRatiosChange.mock.calls[0][0];
      // Using default 0.1 minRatio
      expect(newRatios[0]).toBeGreaterThanOrEqual(0.1);
      expect(newRatios[1]).toBeGreaterThanOrEqual(0.1);
    });
  });

  // ==========================================================================
  // ZR-007: No container ref
  // ==========================================================================
  describe("ZR-007: No container ref", () => {
    it("does nothing if containerRef is null", () => {
      const nullContainerRef = { current: null };

      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef: nullContainerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Try to move
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 240,
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      // Should not call onRatiosChange because container is null
      expect(onRatiosChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ZR-008: Multiple zones
  // ==========================================================================
  describe("ZR-008: Multiple zones", () => {
    it("handles three zones correctly", () => {
      const { result } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1, 1], // Three equal zones
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize on divider between zone 1 and 2 (index 1)
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(1, mockEvent);
      });

      // Move mouse
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientY: 220,
          clientX: 200,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(onRatiosChange).toHaveBeenCalled();
      const newRatios = onRatiosChange.mock.calls[0][0];
      // Should only affect adjacent zones (indices 1 and 2)
      // Zone 0 should remain unchanged
      expect(newRatios[0]).toBe(1); // First zone unchanged
      expect(newRatios.length).toBe(3);
    });
  });

  // ==========================================================================
  // ZR-009: Event listener cleanup
  // ==========================================================================
  describe("ZR-009: Event listener cleanup", () => {
    it("removes event listeners on unmount during resize", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { result, unmount } = renderHook(() =>
        useZoneResize({
          ratios: [1, 1],
          onRatiosChange,
          direction: "HORIZONTAL",
          containerRef,
        })
      );

      // Start resize
      act(() => {
        const mockEvent = {
          clientY: 200,
          clientX: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as React.MouseEvent;
        result.current.handleResizeStart(0, mockEvent);
      });

      // Unmount while resizing
      unmount();

      // Should have removed event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});
