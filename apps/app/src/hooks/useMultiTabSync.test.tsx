/**
 * Tests for useMultiTabSync hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useMultiTabSync, MultiTabSyncProvider } from "./useMultiTabSync";
import { useStore } from "@/lib/store";
import { render, screen } from "@testing-library/react";

// Mock the store
jest.mock("@/lib/store", () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MockBroadcastChannel>> = new Map();
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();
  private closed = false;

  constructor(name: string) {
    this.name = name;

    // Register this channel
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: unknown) {
    if (this.closed) return;

    // Broadcast to all other channels with the same name
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.forEach((channel) => {
        if (channel !== this && !channel.closed) {
          const event = new MessageEvent("message", { data: message });

          // Call onmessage if set
          if (channel.onmessage) {
            channel.onmessage(event);
          }

          // Call event listeners
          const listeners = channel.listeners.get("message");
          if (listeners) {
            listeners.forEach((listener) => listener(event));
          }
        }
      });
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  close() {
    this.closed = true;
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
    }
  }

  static reset() {
    MockBroadcastChannel.channels.clear();
  }
}

// Install mock
(global as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel =
  MockBroadcastChannel;

describe("useMultiTabSync", () => {
  const defaultMockStore = {
    currentProjectId: "project-123",
    currentProjectRevision: 1,
    loadProject: jest.fn().mockResolvedValue({ success: true }),
    setSyncStatus: jest.fn(),
    syncState: { status: "synced" as const },
    markAsDirty: jest.fn(),
  };

  // Add getState to the mock
  const mockGetState = jest.fn().mockReturnValue(defaultMockStore);

  beforeEach(() => {
    jest.clearAllMocks();
    MockBroadcastChannel.reset();
    mockUseStore.mockReturnValue(defaultMockStore);
    (mockUseStore as unknown as { getState: () => typeof defaultMockStore }).getState =
      mockGetState;
  });

  it("should generate a unique tab ID", () => {
    const { result: result1 } = renderHook(() => useMultiTabSync());
    const { result: result2 } = renderHook(() => useMultiTabSync());

    expect(result1.current.tabId).toMatch(/^tab-\d+-\w+$/);
    expect(result2.current.tabId).toMatch(/^tab-\d+-\w+$/);
    expect(result1.current.tabId).not.toBe(result2.current.tabId);
  });

  it("should broadcast PROJECT_OPENED on mount when project is loaded", () => {
    const postMessageSpy = jest.spyOn(MockBroadcastChannel.prototype, "postMessage");

    renderHook(() => useMultiTabSync());

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PROJECT_OPENED",
        projectId: "project-123",
      })
    );
  });

  it("should not broadcast when no project is loaded", () => {
    mockUseStore.mockReturnValue({ ...defaultMockStore, currentProjectId: null });
    const postMessageSpy = jest.spyOn(MockBroadcastChannel.prototype, "postMessage");

    renderHook(() => useMultiTabSync());

    expect(postMessageSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PROJECT_OPENED",
      })
    );
  });

  it("should broadcast TAB_CLOSING on unmount", () => {
    const postMessageSpy = jest.spyOn(MockBroadcastChannel.prototype, "postMessage");

    const { unmount } = renderHook(() => useMultiTabSync());

    postMessageSpy.mockClear();
    unmount();

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TAB_CLOSING",
        projectId: "project-123",
      })
    );
  });

  it("should call onExternalSave when another tab saves the same project", async () => {
    const onExternalSave = jest.fn();
    mockGetState.mockReturnValue({ ...defaultMockStore, syncState: { status: "synced" } });

    // Tab 1: listening
    const { result: tab1 } = renderHook(() => useMultiTabSync({ onExternalSave }));

    // Tab 2: saving
    const { result: tab2 } = renderHook(() => useMultiTabSync());

    await act(async () => {
      tab2.current.broadcastSave(5);
    });

    await waitFor(() => {
      expect(onExternalSave).toHaveBeenCalledWith(5);
    });
  });

  it("should call onConcurrentEdit when another tab opens the same project", async () => {
    const onConcurrentEdit = jest.fn();

    // Tab 1: listening
    renderHook(() => useMultiTabSync({ onConcurrentEdit }));

    // Tab 2: opens same project - broadcasts PROJECT_OPENED
    renderHook(() => useMultiTabSync());

    await waitFor(() => {
      expect(onConcurrentEdit).toHaveBeenCalled();
    });
  });

  it("should not broadcast when disabled", () => {
    const postMessageSpy = jest.spyOn(MockBroadcastChannel.prototype, "postMessage");

    renderHook(() => useMultiTabSync({ enabled: false }));

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("should set conflict status when external save detected with local changes", async () => {
    const setSyncStatus = jest.fn();
    mockGetState.mockReturnValue({
      ...defaultMockStore,
      syncState: { status: "local_only" },
      setSyncStatus,
    });
    mockUseStore.mockReturnValue({ ...defaultMockStore, setSyncStatus });

    // Tab 1: has local changes
    renderHook(() => useMultiTabSync());

    // Tab 2: saves
    const { result: tab2 } = renderHook(() => useMultiTabSync());

    await act(async () => {
      tab2.current.broadcastSave(5);
    });

    await waitFor(() => {
      expect(setSyncStatus).toHaveBeenCalledWith("conflict");
    });
  });

  it("should provide broadcastOpen function", () => {
    const { result } = renderHook(() => useMultiTabSync());

    expect(typeof result.current.broadcastOpen).toBe("function");
  });

  it("should return concurrentTabs count", () => {
    const { result } = renderHook(() => useMultiTabSync());

    expect(typeof result.current.concurrentTabs).toBe("number");
    expect(result.current.concurrentTabs).toBe(0);
  });
});

describe("MultiTabSyncProvider", () => {
  const defaultMockStore = {
    currentProjectId: "project-123",
    currentProjectRevision: 1,
    loadProject: jest.fn().mockResolvedValue({ success: true }),
    setSyncStatus: jest.fn(),
    syncState: { status: "synced" as const },
    markAsDirty: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockBroadcastChannel.reset();
    mockUseStore.mockReturnValue(defaultMockStore);
    (mockUseStore as unknown as { getState: () => typeof defaultMockStore }).getState = jest
      .fn()
      .mockReturnValue(defaultMockStore);
  });

  it("should render children", () => {
    render(
      <MultiTabSyncProvider>
        <div data-testid="child">Child content</div>
      </MultiTabSyncProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should reload project on external save", async () => {
    const loadProject = jest.fn().mockResolvedValue({ success: true });
    mockUseStore.mockReturnValue({ ...defaultMockStore, loadProject });
    (mockUseStore as unknown as { getState: () => typeof defaultMockStore }).getState = jest
      .fn()
      .mockReturnValue({ ...defaultMockStore, syncState: { status: "synced" } });

    // Render provider
    render(
      <MultiTabSyncProvider>
        <div>App</div>
      </MultiTabSyncProvider>
    );

    // Another tab saves
    const { result: otherTab } = renderHook(() => useMultiTabSync());

    await act(async () => {
      otherTab.current.broadcastSave(5);
    });

    await waitFor(() => {
      expect(loadProject).toHaveBeenCalledWith("project-123");
    });
  });
});
