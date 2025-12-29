/**
 * Tests for NewProjectDialog component
 *
 * Covers:
 * - "new" mode: creates empty project
 * - "saveAs" mode: saves current project data with new name
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewProjectDialog } from "./NewProjectDialog";

// Mock the store
const mockCreateNewProject = jest.fn();
const mockSaveProjectAs = jest.fn();

jest.mock("@/lib/store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({
      createNewProject: mockCreateNewProject,
      saveProjectAs: mockSaveProjectAs,
    }),
}));

// Mock zustand/react/shallow
jest.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

describe("NewProjectDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("mode='new' (default)", () => {
    it("renders with 'Nowy projekt' title", () => {
      render(<NewProjectDialog open={true} onOpenChange={() => {}} />);

      expect(screen.getByText("Nowy projekt")).toBeInTheDocument();
    });

    it("renders 'Utwórz projekt' button", () => {
      render(<NewProjectDialog open={true} onOpenChange={() => {}} />);

      expect(screen.getByRole("button", { name: "Utwórz projekt" })).toBeInTheDocument();
    });

    it("calls createNewProject when submitted", async () => {
      const user = userEvent.setup();
      mockCreateNewProject.mockResolvedValue("new-project-id");

      const onOpenChange = jest.fn();
      const onCreated = jest.fn();

      render(
        <NewProjectDialog
          open={true}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
          mode="new"
        />
      );

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "Test Project");

      const submitButton = screen.getByRole("button", { name: "Utwórz projekt" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateNewProject).toHaveBeenCalledWith("Test Project");
        expect(mockSaveProjectAs).not.toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("new-project-id");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows error when createNewProject fails", async () => {
      const user = userEvent.setup();
      mockCreateNewProject.mockResolvedValue(null);

      render(<NewProjectDialog open={true} onOpenChange={() => {}} mode="new" />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "Test Project");

      const submitButton = screen.getByRole("button", { name: "Utwórz projekt" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nie udało się utworzyć projektu")).toBeInTheDocument();
      });
    });
  });

  describe("mode='saveAs'", () => {
    it("renders with 'Zapisz jako' title", () => {
      render(<NewProjectDialog open={true} onOpenChange={() => {}} mode="saveAs" />);

      expect(screen.getByText("Zapisz jako")).toBeInTheDocument();
    });

    it("renders 'Zapisz' button", () => {
      render(<NewProjectDialog open={true} onOpenChange={() => {}} mode="saveAs" />);

      expect(screen.getByRole("button", { name: "Zapisz" })).toBeInTheDocument();
    });

    it("calls saveProjectAs when submitted (preserves current data)", async () => {
      const user = userEvent.setup();
      mockSaveProjectAs.mockResolvedValue("saved-project-id");

      const onOpenChange = jest.fn();
      const onCreated = jest.fn();

      render(
        <NewProjectDialog
          open={true}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
          mode="saveAs"
        />
      );

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "My Saved Project");

      const submitButton = screen.getByRole("button", { name: "Zapisz" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveProjectAs).toHaveBeenCalledWith("My Saved Project");
        expect(mockCreateNewProject).not.toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("saved-project-id");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows error when saveProjectAs fails", async () => {
      const user = userEvent.setup();
      mockSaveProjectAs.mockResolvedValue(null);

      render(<NewProjectDialog open={true} onOpenChange={() => {}} mode="saveAs" />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "My Project");

      const submitButton = screen.getByRole("button", { name: "Zapisz" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nie udało się zapisać projektu")).toBeInTheDocument();
      });
    });
  });

  describe("validation", () => {
    it("shows error when name is empty", async () => {
      const user = userEvent.setup();

      render(<NewProjectDialog open={true} onOpenChange={() => {}} />);

      // Submit without entering a name
      const submitButton = screen.getByRole("button", { name: "Utwórz projekt" });

      // Button should be disabled when name is empty
      expect(submitButton).toBeDisabled();
    });

    it("trims whitespace from name", async () => {
      const user = userEvent.setup();
      mockCreateNewProject.mockResolvedValue("project-id");

      render(<NewProjectDialog open={true} onOpenChange={() => {}} />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "  Trimmed Name  ");

      const submitButton = screen.getByRole("button", { name: "Utwórz projekt" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateNewProject).toHaveBeenCalledWith("Trimmed Name");
      });
    });
  });

  describe("dialog behavior", () => {
    it("closes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();

      render(<NewProjectDialog open={true} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole("button", { name: "Anuluj" });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("resets form when closed", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();

      const { rerender } = render(<NewProjectDialog open={true} onOpenChange={onOpenChange} />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "Some Name");

      // Close and reopen
      const cancelButton = screen.getByRole("button", { name: "Anuluj" });
      await user.click(cancelButton);

      rerender(<NewProjectDialog open={false} onOpenChange={onOpenChange} />);
      rerender(<NewProjectDialog open={true} onOpenChange={onOpenChange} />);

      // Form should be reset (implementation resets on close)
      const newInput = screen.getByLabelText(/Nazwa projektu/);
      expect(newInput).toHaveValue("");
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();

      // Make the mock hang to test loading state
      mockCreateNewProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("id"), 1000))
      );

      render(<NewProjectDialog open={true} onOpenChange={() => {}} />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "Test");

      const submitButton = screen.getByRole("button", { name: "Utwórz projekt" });
      await user.click(submitButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText("Tworzenie...")).toBeInTheDocument();
      });
    });

    it("shows 'Zapisywanie...' in saveAs mode during submission", async () => {
      const user = userEvent.setup();

      mockSaveProjectAs.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("id"), 1000))
      );

      render(<NewProjectDialog open={true} onOpenChange={() => {}} mode="saveAs" />);

      const input = screen.getByLabelText(/Nazwa projektu/);
      await user.type(input, "Test");

      const submitButton = screen.getByRole("button", { name: "Zapisz" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Zapisywanie...")).toBeInTheDocument();
      });
    });
  });
});
