import { render, screen } from "@testing-library/react";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import type { SyncStatus } from "@/types";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span data-testid="icon-check" className={className}>
      Check
    </span>
  ),
  Circle: ({ className }: { className?: string }) => (
    <span data-testid="icon-circle" className={className}>
      Circle
    </span>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="icon-loader" className={className}>
      Loader2
    </span>
  ),
  CloudOff: ({ className }: { className?: string }) => (
    <span data-testid="icon-cloud-off" className={className}>
      CloudOff
    </span>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert" className={className}>
      AlertTriangle
    </span>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className}>
      XCircle
    </span>
  ),
}));

// Mock @meble/ui Tooltip components
jest.mock("@meble/ui", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

describe("SyncStatusIndicator", () => {
  const statusTestCases: Array<{
    status: SyncStatus;
    expectedLabel: string;
    expectedIconTestId: string;
  }> = [
    { status: "synced", expectedLabel: "Zapisano", expectedIconTestId: "icon-check" },
    { status: "local_only", expectedLabel: "Niezapisane", expectedIconTestId: "icon-circle" },
    { status: "syncing", expectedLabel: "Zapisywanie...", expectedIconTestId: "icon-loader" },
    { status: "offline", expectedLabel: "Offline", expectedIconTestId: "icon-cloud-off" },
    { status: "conflict", expectedLabel: "Konflikt", expectedIconTestId: "icon-alert" },
    { status: "error", expectedLabel: "Błąd", expectedIconTestId: "icon-x" },
  ];

  describe.each(statusTestCases)(
    "$status status",
    ({ status, expectedLabel, expectedIconTestId }) => {
      it("renders correct icon", () => {
        render(<SyncStatusIndicator status={status} />);
        expect(screen.getByTestId(expectedIconTestId)).toBeInTheDocument();
      });

      it("renders correct label when showLabel is true (default)", () => {
        render(<SyncStatusIndicator status={status} />);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });

      it("hides label when showLabel is false", () => {
        render(<SyncStatusIndicator status={status} showLabel={false} />);
        expect(screen.queryByText(expectedLabel)).not.toBeInTheDocument();
        expect(screen.getByTestId(expectedIconTestId)).toBeInTheDocument();
      });
    }
  );

  describe("sizes", () => {
    it("renders with small size icons", () => {
      render(<SyncStatusIndicator status="synced" size="sm" />);
      const icon = screen.getByTestId("icon-check");
      expect(icon).toHaveClass("h-3", "w-3");
    });

    it("renders with default (medium) size icons", () => {
      render(<SyncStatusIndicator status="synced" />);
      const icon = screen.getByTestId("icon-check");
      expect(icon).toHaveClass("h-4", "w-4");
    });

    it("uses smaller text for small size", () => {
      render(<SyncStatusIndicator status="synced" size="sm" />);
      const label = screen.getByText("Zapisano");
      expect(label).toHaveClass("text-xs");
    });

    it("uses default text size for medium", () => {
      render(<SyncStatusIndicator status="synced" size="md" />);
      const label = screen.getByText("Zapisano");
      expect(label).toHaveClass("text-sm");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <SyncStatusIndicator status="synced" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("color classes", () => {
    it("applies green color for synced status", () => {
      render(<SyncStatusIndicator status="synced" />);
      const icon = screen.getByTestId("icon-check");
      expect(icon).toHaveClass("text-green-500");
    });

    it("applies yellow color for local_only status", () => {
      render(<SyncStatusIndicator status="local_only" />);
      const icon = screen.getByTestId("icon-circle");
      expect(icon).toHaveClass("text-yellow-500");
    });

    it("applies orange color for conflict status", () => {
      render(<SyncStatusIndicator status="conflict" />);
      const icon = screen.getByTestId("icon-alert");
      expect(icon).toHaveClass("text-orange-500");
    });

    it("applies destructive color for error status", () => {
      render(<SyncStatusIndicator status="error" />);
      const icon = screen.getByTestId("icon-x");
      expect(icon).toHaveClass("text-destructive");
    });
  });

  describe("animation states", () => {
    it("applies pulse animation for local_only status", () => {
      render(<SyncStatusIndicator status="local_only" />);
      const icon = screen.getByTestId("icon-circle");
      expect(icon).toHaveClass("animate-pulse");
    });

    it("applies spin animation for syncing status", () => {
      render(<SyncStatusIndicator status="syncing" />);
      const icon = screen.getByTestId("icon-loader");
      expect(icon).toHaveClass("animate-spin");
    });

    it("applies pulse animation for conflict status", () => {
      render(<SyncStatusIndicator status="conflict" />);
      const icon = screen.getByTestId("icon-alert");
      expect(icon).toHaveClass("animate-pulse");
    });

    it("does not apply animation for synced status", () => {
      render(<SyncStatusIndicator status="synced" />);
      const icon = screen.getByTestId("icon-check");
      expect(icon).not.toHaveClass("animate-pulse");
      expect(icon).not.toHaveClass("animate-spin");
    });
  });

  describe("tooltip when showLabel is false", () => {
    it("wraps content in tooltip when showLabel is false", () => {
      render(<SyncStatusIndicator status="synced" showLabel={false} />);
      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    });

    it("does not wrap in tooltip when showLabel is true", () => {
      render(<SyncStatusIndicator status="synced" showLabel={true} />);
      expect(screen.queryByTestId("tooltip-trigger")).not.toBeInTheDocument();
    });
  });

  describe("monospace font styling", () => {
    it("applies font-mono class to label", () => {
      render(<SyncStatusIndicator status="synced" />);
      const label = screen.getByText("Zapisano");
      expect(label).toHaveClass("font-mono");
    });
  });
});
