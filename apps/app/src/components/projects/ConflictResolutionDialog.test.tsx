/**
 * Tests for ConflictResolutionDialog component and useConflictResolutionDialog hook
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ConflictResolutionDialog, useConflictResolutionDialog } from "./ConflictResolutionDialog";
import { useStore } from "@/lib/store";

// Mock the store
jest.mock("@/lib/store", () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

const createMockProjectData = (overrides = {}) => ({
  cabinets: [],
  parts: [],
  rooms: [],
  materials: [],
  edgeBanding: [],
  settings: {},
  ...overrides,
});

describe("ConflictResolutionDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  const defaultMockStore = {
    syncState: {
      status: "conflict" as const,
      conflictData: createMockProjectData({ cabinets: [{ id: "1" }, { id: "2" }] }),
    },
    resolveConflict: jest.fn().mockResolvedValue(undefined),
    clearConflict: jest.fn(),
    getProjectData: jest.fn().mockReturnValue(createMockProjectData({ cabinets: [{ id: "1" }] })),
    currentProjectName: "Test Project",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue(defaultMockStore);
  });

  it("should render dialog with correct title", () => {
    render(<ConflictResolutionDialog {...defaultProps} />);

    expect(screen.getByText("Konflikt wersji")).toBeInTheDocument();
  });

  it("should show version comparison with local and server stats", () => {
    render(<ConflictResolutionDialog {...defaultProps} />);

    expect(screen.getByText("Twoja wersja")).toBeInTheDocument();
    expect(screen.getByText("Wersja na serwerze")).toBeInTheDocument();
    // Local version has 1 cabinet
    expect(screen.getAllByText("Szafki: 1").length).toBeGreaterThan(0);
    // Server version has 2 cabinets
    expect(screen.getAllByText("Szafki: 2").length).toBeGreaterThan(0);
  });

  it("should render three resolution options", () => {
    render(<ConflictResolutionDialog {...defaultProps} />);

    expect(screen.getByText("Zachowaj moją wersję")).toBeInTheDocument();
    expect(screen.getByText("Zachowaj wersję z serwera")).toBeInTheDocument();
    expect(screen.getByText("Zachowaj obie wersje")).toBeInTheDocument();
  });

  it("should call resolveConflict with 'keep_local' when local option is clicked", async () => {
    const resolveConflict = jest.fn().mockResolvedValue(undefined);
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zachowaj moją wersję"));

    await waitFor(() => {
      expect(resolveConflict).toHaveBeenCalledWith("keep_local");
    });
  });

  it("should call resolveConflict with 'keep_server' when server option is clicked", async () => {
    const resolveConflict = jest.fn().mockResolvedValue(undefined);
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zachowaj wersję z serwera"));

    await waitFor(() => {
      expect(resolveConflict).toHaveBeenCalledWith("keep_server");
    });
  });

  it("should call resolveConflict with 'keep_both' when both option is clicked", async () => {
    const resolveConflict = jest.fn().mockResolvedValue(undefined);
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zachowaj obie wersje"));

    await waitFor(() => {
      expect(resolveConflict).toHaveBeenCalledWith("keep_both");
    });
  });

  it("should show project name in 'keep both' option description", () => {
    render(<ConflictResolutionDialog {...defaultProps} />);

    expect(screen.getByText(/Test Project \(kopia\)/)).toBeInTheDocument();
  });

  it("should disable cancel button while resolving", async () => {
    const resolveConflict = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zachowaj moją wersję"));

    await waitFor(() => {
      // Cancel button should be disabled while resolving
      expect(screen.getByText("Anuluj").closest("button")).toBeDisabled();
    });
  });

  it("should show error message when resolution fails", async () => {
    const resolveConflict = jest.fn().mockRejectedValue(new Error("Failed to resolve"));
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zachowaj moją wersję"));

    await waitFor(() => {
      expect(screen.getByText("Failed to resolve")).toBeInTheDocument();
    });
  });

  it("should call clearConflict when Cancel is clicked", () => {
    const clearConflict = jest.fn();
    mockUseStore.mockReturnValue({ ...defaultMockStore, clearConflict });

    render(<ConflictResolutionDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Anuluj"));

    expect(clearConflict).toHaveBeenCalled();
  });

  it("should close dialog on successful resolution", async () => {
    const onOpenChange = jest.fn();
    const resolveConflict = jest.fn().mockResolvedValue(undefined);
    mockUseStore.mockReturnValue({ ...defaultMockStore, resolveConflict });

    render(<ConflictResolutionDialog {...defaultProps} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Zachowaj moją wersję"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("should show 'Ładowanie...' when server data is not available", () => {
    mockUseStore.mockReturnValue({
      ...defaultMockStore,
      syncState: { status: "conflict", conflictData: undefined },
    });

    render(<ConflictResolutionDialog {...defaultProps} />);

    expect(screen.getByText("Ładowanie...")).toBeInTheDocument();
  });
});

describe("useConflictResolutionDialog", () => {
  const TestComponent = () => {
    const { hasConflict, isOpen, openDialog, closeDialog, ConflictResolutionDialogComponent } =
      useConflictResolutionDialog();

    return (
      <div>
        <span data-testid="has-conflict">{String(hasConflict)}</span>
        <span data-testid="is-open">{String(isOpen)}</span>
        <button onClick={openDialog} data-testid="open-btn">
          Open
        </button>
        <button onClick={closeDialog} data-testid="close-btn">
          Close
        </button>
        <ConflictResolutionDialogComponent />
      </div>
    );
  };

  const defaultMockStore = {
    syncState: { status: "synced" as const, conflictData: undefined },
    resolveConflict: jest.fn(),
    clearConflict: jest.fn(),
    getProjectData: jest.fn().mockReturnValue(createMockProjectData()),
    currentProjectName: "Test Project",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue(defaultMockStore);
  });

  it("should return hasConflict=false when no conflict", () => {
    render(<TestComponent />);

    expect(screen.getByTestId("has-conflict")).toHaveTextContent("false");
  });

  it("should return hasConflict=true when conflict exists", () => {
    mockUseStore.mockReturnValue({
      ...defaultMockStore,
      syncState: { status: "conflict", conflictData: createMockProjectData() },
    });

    render(<TestComponent />);

    expect(screen.getByTestId("has-conflict")).toHaveTextContent("true");
  });

  it("should auto-open dialog when conflict is detected", async () => {
    const { rerender } = render(<TestComponent />);

    expect(screen.getByTestId("is-open")).toHaveTextContent("false");

    // Simulate conflict detection
    mockUseStore.mockReturnValue({
      ...defaultMockStore,
      syncState: { status: "conflict", conflictData: createMockProjectData() },
    });

    rerender(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("is-open")).toHaveTextContent("true");
    });
  });

  it("should allow manual open/close", async () => {
    render(<TestComponent />);

    expect(screen.getByTestId("is-open")).toHaveTextContent("false");

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("true");

    await act(async () => {
      fireEvent.click(screen.getByTestId("close-btn"));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("false");
  });
});
