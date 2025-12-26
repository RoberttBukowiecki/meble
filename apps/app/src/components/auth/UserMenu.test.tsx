import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@meble/ui";
import { UserMenu } from "./UserMenu";

// Wrapper with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock auth provider - will be overridden per test
const mockSignOut = jest.fn();
let mockAuthState = {
  user: null as { id: string; email: string } | null,
  profile: null as {
    displayName: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null,
  isAuthenticated: false,
  isLoading: false,
  signOut: mockSignOut,
};

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockAuthState,
}));

// Mock useCredits hook
jest.mock("@/hooks/useCredits", () => ({
  useCredits: () => ({
    balance: { availableCredits: 5, hasUnlimited: false },
    isLoading: false,
  }),
}));

// Mock useIsAdmin hook
jest.mock("@/hooks", () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

// Mock CreditsPurchaseModal
jest.mock("@/components/ui/CreditsPurchaseModal", () => ({
  CreditsPurchaseModal: () => null,
}));

describe("UserMenu", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  describe("Loading state", () => {
    it("shows loading skeleton when auth is loading", () => {
      mockAuthState = {
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: true,
        signOut: mockSignOut,
      };

      renderWithProviders(<UserMenu />);

      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Unauthenticated state", () => {
    beforeEach(() => {
      mockAuthState = {
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        signOut: mockSignOut,
      };
    });

    it("shows login and register options in dropdown when not authenticated", async () => {
      renderWithProviders(<UserMenu />);

      // Open dropdown menu (user icon button)
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Check menu items are in dropdown
      expect(screen.getByText(/zaloguj/i)).toBeInTheDocument();
      expect(screen.getByText(/zarejestruj/i)).toBeInTheDocument();
    });

    it("navigates to login page on login menu item click", async () => {
      renderWithProviders(<UserMenu />);

      // Open dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Click login menu item
      await user.click(screen.getByText(/zaloguj/i));

      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("navigates to register page on register menu item click", async () => {
      renderWithProviders(<UserMenu />);

      // Open dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Click register menu item
      await user.click(screen.getByText(/zarejestruj/i));

      expect(mockPush).toHaveBeenCalledWith("/register");
    });
  });

  describe("Authenticated state", () => {
    beforeEach(() => {
      mockAuthState = {
        user: { id: "test-id", email: "test@example.com" },
        profile: {
          displayName: "TestUser",
          fullName: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };
    });

    it("shows user initials in avatar", async () => {
      renderWithProviders(<UserMenu />);

      // T for "TestUser" (single word = first letter only)
      // Implementation splits by space and takes first letter of each word
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("shows initials when no avatar", () => {
      mockAuthState.profile!.avatarUrl = null;
      renderWithProviders(<UserMenu />);

      // T for TestUser (single word)
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("shows email initials when no display name", () => {
      mockAuthState.profile = null;
      renderWithProviders(<UserMenu />);

      // TE for test@example.com
      expect(screen.getByText("TE")).toBeInTheDocument();
    });

    it("opens dropdown menu on avatar click and shows user info", async () => {
      renderWithProviders(<UserMenu />);

      // Find avatar trigger button (there are multiple buttons - credits and avatar)
      const buttons = screen.getAllByRole("button");
      const avatarButton = buttons.find((btn) => btn.querySelector(".h-7"));
      expect(avatarButton).toBeDefined();

      await user.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByText("TestUser")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
      });
    });

    it("shows logout menu item in dropdown", async () => {
      renderWithProviders(<UserMenu />);

      const buttons = screen.getAllByRole("button");
      const avatarButton = buttons.find((btn) => btn.querySelector(".h-7"));
      await user.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByText(/wyloguj/i)).toBeInTheDocument();
      });
    });

    it("signs out and redirects on logout click", async () => {
      renderWithProviders(<UserMenu />);

      const buttons = screen.getAllByRole("button");
      const avatarButton = buttons.find((btn) => btn.querySelector(".h-7"));
      await user.click(avatarButton!);

      await waitFor(async () => {
        const logoutItem = screen.getByText(/wyloguj/i);
        await user.click(logoutItem);
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("uses fullName when displayName is null", () => {
      mockAuthState = {
        user: { id: "test-id", email: "test@example.com" },
        profile: {
          displayName: null,
          fullName: "John Doe",
          avatarUrl: null,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };

      renderWithProviders(<UserMenu />);

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("handles long display names with truncation", async () => {
      mockAuthState = {
        user: { id: "test-id", email: "test@example.com" },
        profile: {
          displayName: "Very Long Display Name That Should Be Truncated",
          fullName: null,
          avatarUrl: null,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };

      renderWithProviders(<UserMenu />);

      // Open dropdown to see the name
      const buttons = screen.getAllByRole("button");
      const avatarButton = buttons.find((btn) => btn.querySelector(".h-7"));
      await user.click(avatarButton!);

      await waitFor(() => {
        const displayName = screen.getByText(/very long/i);
        expect(displayName).toHaveClass("truncate");
      });
    });
  });
});
