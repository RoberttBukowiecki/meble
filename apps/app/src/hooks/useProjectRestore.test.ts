/**
 * Tests for useProjectRestore hook
 */

import { renderHook, waitFor } from "@testing-library/react";

// Suppress console.debug output in tests
beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Mock the store
const mockLoadProject = jest.fn();
const mockResetProjectState = jest.fn();
let mockCurrentProjectId: string | null = null;

jest.mock("@/lib/store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentProjectId: mockCurrentProjectId,
      loadProject: mockLoadProject,
      resetProjectState: mockResetProjectState,
    }),
}));

// Mock auth provider
let mockIsAuthenticated = false;
let mockAuthLoading = true;

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockAuthLoading,
  }),
}));

// Import after mocks
import { useProjectRestore } from "./useProjectRestore";

describe("useProjectRestore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProjectId = null;
    mockIsAuthenticated = false;
    mockAuthLoading = true;
  });

  it("waits for auth to finish loading before attempting restore", () => {
    mockCurrentProjectId = "project-123";
    mockAuthLoading = true;

    renderHook(() => useProjectRestore());

    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(mockResetProjectState).not.toHaveBeenCalled();
  });

  it("clears project state when user is not authenticated", async () => {
    mockCurrentProjectId = "project-123";
    mockAuthLoading = false;
    mockIsAuthenticated = false;

    renderHook(() => useProjectRestore());

    await waitFor(() => {
      expect(mockResetProjectState).toHaveBeenCalled();
    });
    expect(mockLoadProject).not.toHaveBeenCalled();
  });

  it("loads project when user is authenticated and project ID exists", async () => {
    mockCurrentProjectId = "project-123";
    mockAuthLoading = false;
    mockIsAuthenticated = true;
    mockLoadProject.mockResolvedValue(true);

    renderHook(() => useProjectRestore());

    await waitFor(() => {
      expect(mockLoadProject).toHaveBeenCalledWith("project-123");
    });
  });

  it("resets state if project load fails", async () => {
    mockCurrentProjectId = "project-123";
    mockAuthLoading = false;
    mockIsAuthenticated = true;
    mockLoadProject.mockResolvedValue(false);

    renderHook(() => useProjectRestore());

    await waitFor(() => {
      expect(mockLoadProject).toHaveBeenCalledWith("project-123");
      expect(mockResetProjectState).toHaveBeenCalled();
    });
  });

  it("does nothing if no project ID is persisted", async () => {
    mockCurrentProjectId = null;
    mockAuthLoading = false;
    mockIsAuthenticated = true;

    renderHook(() => useProjectRestore());

    await waitFor(() => {
      expect(mockLoadProject).not.toHaveBeenCalled();
      expect(mockResetProjectState).not.toHaveBeenCalled();
    });
  });

  it("only attempts restore once", async () => {
    mockCurrentProjectId = "project-123";
    mockAuthLoading = false;
    mockIsAuthenticated = true;
    mockLoadProject.mockResolvedValue(true);

    const { rerender } = renderHook(() => useProjectRestore());

    await waitFor(() => {
      expect(mockLoadProject).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another load
    rerender();
    rerender();
    rerender();

    expect(mockLoadProject).toHaveBeenCalledTimes(1);
  });
});
