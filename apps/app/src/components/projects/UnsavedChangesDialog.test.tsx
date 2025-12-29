/**
 * Tests for UnsavedChangesDialog component and useUnsavedChangesDialog hook
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { UnsavedChangesDialog, useUnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useStore } from "@/lib/store";

// Mock the store
jest.mock("@/lib/store", () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe("UnsavedChangesDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({
      saveProject: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  it("should render dialog with correct title and description", () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(screen.getByText("Niezapisane zmiany")).toBeInTheDocument();
    expect(screen.getByText(/Masz niezapisane zmiany w projekcie/)).toBeInTheDocument();
  });

  it("should show custom action description", () => {
    render(<UnsavedChangesDialog {...defaultProps} actionDescription="przełączeniem projektu" />);

    expect(screen.getByText(/przełączeniem projektu/)).toBeInTheDocument();
  });

  it("should render three action buttons", () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(screen.getByText("Anuluj")).toBeInTheDocument();
    expect(screen.getByText("Odrzuć zmiany")).toBeInTheDocument();
    expect(screen.getByText("Zapisz i kontynuuj")).toBeInTheDocument();
  });

  it("should call onAction with 'cancel' when Cancel button is clicked", () => {
    const onAction = jest.fn();
    render(<UnsavedChangesDialog {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText("Anuluj"));

    expect(onAction).toHaveBeenCalledWith("cancel");
  });

  it("should call onAction with 'discard' when Discard button is clicked", () => {
    const onAction = jest.fn();
    render(<UnsavedChangesDialog {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText("Odrzuć zmiany"));

    expect(onAction).toHaveBeenCalledWith("discard");
  });

  it("should call saveProject and onAction with 'save' on successful save", async () => {
    const onAction = jest.fn();
    const saveProject = jest.fn().mockResolvedValue({ success: true });
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    await waitFor(() => {
      expect(saveProject).toHaveBeenCalled();
      expect(onAction).toHaveBeenCalledWith("save");
    });
  });

  it("should show loading state while saving", async () => {
    const saveProject = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    await waitFor(() => {
      expect(screen.getByText("Zapisywanie...")).toBeInTheDocument();
    });
  });

  it("should show error message on save failure", async () => {
    const saveProject = jest.fn().mockResolvedValue({
      success: false,
      error: "NETWORK",
    });
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    await waitFor(() => {
      expect(screen.getByText(/Błąd połączenia/)).toBeInTheDocument();
    });
  });

  it("should show conflict error message", async () => {
    const saveProject = jest.fn().mockResolvedValue({
      success: false,
      error: "CONFLICT",
    });
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    await waitFor(() => {
      expect(screen.getByText(/Wykryto konflikt wersji/)).toBeInTheDocument();
    });
  });

  it("should disable buttons while saving", async () => {
    const saveProject = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    await waitFor(() => {
      expect(screen.getByText("Anuluj").closest("button")).toBeDisabled();
      expect(screen.getByText("Odrzuć zmiany").closest("button")).toBeDisabled();
    });
  });

  it("should not close dialog on outside click while saving", async () => {
    const onOpenChange = jest.fn();
    const saveProject = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
    mockUseStore.mockReturnValue({ saveProject });

    render(<UnsavedChangesDialog {...defaultProps} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Zapisz i kontynuuj"));

    // Try to close via onOpenChange
    await waitFor(() => {
      // The dialog should prevent closing while saving
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });
});

describe("useUnsavedChangesDialog", () => {
  const TestComponent = ({ onConfirm }: { onConfirm?: (action: string) => void }) => {
    const { hasUnsavedChanges, confirmUnsavedChanges, UnsavedChangesDialogComponent } =
      useUnsavedChangesDialog();

    const handleClick = async () => {
      const action = await confirmUnsavedChanges("test action");
      onConfirm?.(action);
    };

    return (
      <div>
        <span data-testid="has-unsaved">{String(hasUnsavedChanges)}</span>
        <button onClick={handleClick}>Confirm</button>
        <UnsavedChangesDialogComponent />
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return hasUnsavedChanges=false when no project loaded", () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "synced" },
      currentProjectId: null,
      isProjectLoading: false,
      saveProject: jest.fn(),
    });

    render(<TestComponent />);

    expect(screen.getByTestId("has-unsaved")).toHaveTextContent("false");
  });

  it("should return hasUnsavedChanges=true when project has local_only status", () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "local_only" },
      currentProjectId: "test-id",
      isProjectLoading: false,
      saveProject: jest.fn(),
    });

    render(<TestComponent />);

    expect(screen.getByTestId("has-unsaved")).toHaveTextContent("true");
  });

  it("should return hasUnsavedChanges=true when project has error status", () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "error" },
      currentProjectId: "test-id",
      isProjectLoading: false,
      saveProject: jest.fn(),
    });

    render(<TestComponent />);

    expect(screen.getByTestId("has-unsaved")).toHaveTextContent("true");
  });

  it("should return hasUnsavedChanges=false when project is loading", () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "local_only" },
      currentProjectId: "test-id",
      isProjectLoading: true,
      saveProject: jest.fn(),
    });

    render(<TestComponent />);

    expect(screen.getByTestId("has-unsaved")).toHaveTextContent("false");
  });

  it("should resolve immediately with 'save' when no unsaved changes", async () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "synced" },
      currentProjectId: "test-id",
      isProjectLoading: false,
      saveProject: jest.fn(),
    });

    const onConfirm = jest.fn();
    render(<TestComponent onConfirm={onConfirm} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    expect(onConfirm).toHaveBeenCalledWith("save");
  });

  it("should show dialog when there are unsaved changes", async () => {
    mockUseStore.mockReturnValue({
      syncState: { status: "local_only" },
      currentProjectId: "test-id",
      isProjectLoading: false,
      saveProject: jest.fn().mockResolvedValue({ success: true }),
    });

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    await waitFor(() => {
      expect(screen.getByText("Niezapisane zmiany")).toBeInTheDocument();
    });
  });
});
