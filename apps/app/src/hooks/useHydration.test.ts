/**
 * Tests for useHydration hook
 */

import { renderHook, act } from "@testing-library/react";

// Mock callback for onFinishHydration
let onFinishHydrationCallback: (() => void) | null = null;
let mockHasHydrated = false;

jest.mock("@/lib/store", () => ({
  useStore: {
    persist: {
      hasHydrated: () => mockHasHydrated,
      onFinishHydration: (callback: () => void) => {
        onFinishHydrationCallback = callback;
        return () => {
          onFinishHydrationCallback = null;
        };
      },
    },
  },
}));

// Import after mocks
import { useHydration } from "./useHydration";

describe("useHydration", () => {
  beforeEach(() => {
    mockHasHydrated = false;
    onFinishHydrationCallback = null;
  });

  it("returns false initially when store is not hydrated", () => {
    mockHasHydrated = false;

    const { result } = renderHook(() => useHydration());

    expect(result.current).toBe(false);
  });

  it("returns true immediately if store is already hydrated", () => {
    mockHasHydrated = true;

    const { result } = renderHook(() => useHydration());

    expect(result.current).toBe(true);
  });

  it("returns true after hydration finishes", () => {
    mockHasHydrated = false;

    const { result } = renderHook(() => useHydration());

    expect(result.current).toBe(false);

    // Simulate hydration finishing
    act(() => {
      if (onFinishHydrationCallback) {
        onFinishHydrationCallback();
      }
    });

    expect(result.current).toBe(true);
  });

  it("unsubscribes from hydration callback on unmount", () => {
    mockHasHydrated = false;

    const { unmount } = renderHook(() => useHydration());

    expect(onFinishHydrationCallback).not.toBeNull();

    unmount();

    expect(onFinishHydrationCallback).toBeNull();
  });
});
