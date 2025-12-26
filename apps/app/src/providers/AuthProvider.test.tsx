import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";
import {
  createMockSupabaseClient,
  mockUser,
  mockSession,
  mockProfile,
} from "../../test/__mocks__/supabase";

// Mock the supabase client
const mockSupabaseClient = createMockSupabaseClient({
  user: mockUser,
  session: mockSession,
  profile: mockProfile,
});

jest.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockSupabaseClient,
}));

// Test component to access auth context
function TestAuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-email">{auth.user?.email || "none"}</span>
      <span data-testid="profile-name">{auth.profile?.displayName || "none"}</span>
      <button onClick={() => auth.signIn("test@example.com", "password")}>Sign In</button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("provides initial loading state", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    // Wait for auth initialization
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("provides authenticated state when user is logged in", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("user-email")).toHaveTextContent("test@example.com");
  });

  it("provides profile data when available", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile-name")).toHaveTextContent("TestUser");
    });
  });

  it("handles unauthenticated state", async () => {
    const unauthenticatedClient = createMockSupabaseClient({
      user: null,
      session: null,
      profile: null,
    });

    jest.mock("@/lib/supabase/client", () => ({
      getSupabaseBrowserClient: () => unauthenticatedClient,
    }));

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("subscribes to auth state changes", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    unmount();

    const subscription =
      mockSupabaseClient.auth.onAuthStateChange.mock.results[0].value.data.subscription;
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});

describe("useAuth", () => {
  it("throws error when used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestAuthConsumer />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });
});

describe("AuthProvider - Sign In", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls signInWithPassword on signIn", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signInButton = screen.getByText("Sign In");
    await act(async () => {
      signInButton.click();
    });

    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password",
    });
  });

  it("calls signOut on signOut", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signOutButton = screen.getByText("Sign Out");
    await act(async () => {
      signOutButton.click();
    });

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
  });
});

describe("AuthProvider - Guest Credit Migration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("attempts to migrate guest credits when user signs in", async () => {
    // Set up guest session in localStorage (key must match STORAGE_KEY in useGuestSession.ts)
    localStorage.setItem(
      "e_meble_guest_session",
      JSON.stringify({ sessionId: "guest-session-123" })
    );

    // Simulate auth state change to SIGNED_IN
    let authStateCallback: ((event: string, session: unknown) => void) | null = null;
    mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // Trigger SIGNED_IN event
    if (authStateCallback) {
      await act(async () => {
        authStateCallback!("SIGNED_IN", mockSession);
      });
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/migrate-credits",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Session-ID": "guest-session-123",
          }),
        })
      );
    });
  });
});
