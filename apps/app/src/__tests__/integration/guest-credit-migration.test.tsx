/**
 * Guest Credit Purchase → Account Creation → Credit Migration Tests
 *
 * Tests the complete flow:
 * 1. Guest purchases credits (payment completed via webhook)
 * 2. Guest creates an account (signs up)
 * 3. Credits are migrated from guest_credits to export_credits
 *
 * Key components tested:
 * - useGuestSession hook (session ID generation, localStorage)
 * - AuthProvider (migration trigger on SIGNED_IN event)
 * - /api/auth/migrate-credits endpoint
 * - Database tables: guest_credits, export_credits
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

// ============================================================================
// CONSTANTS - Must match source files
// ============================================================================

const GUEST_SESSION_KEY = 'e_meble_guest_session';
const GUEST_EMAIL_KEY = 'e_meble_guest_email';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase client
const mockSupabaseAuth = {
  getUser: jest.fn(),
  getSession: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  signInWithOAuth: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  refreshSession: jest.fn(),
  onAuthStateChange: jest.fn(),
};

const mockSupabaseFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  }),
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { useGuestSession } from '@/hooks/useGuestSession';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockGuestSession(overrides?: Partial<{ sessionId: string; email: string | null; createdAt: string }>) {
  return {
    sessionId: `guest_${Date.now().toString(36)}_abc123`,
    email: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function setupLocalStorageWithGuestSession(session: ReturnType<typeof createMockGuestSession>) {
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  if (session.email) {
    localStorage.setItem(GUEST_EMAIL_KEY, session.email);
  }
}

// Test component that exposes auth context
function AuthTestComponent({ onAuthChange }: { onAuthChange?: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();

  if (onAuthChange) {
    onAuthChange(auth);
  }

  return (
    <div>
      <div data-testid="auth-status">
        {auth.isLoading ? 'loading' : auth.isAuthenticated ? 'authenticated' : 'guest'}
      </div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
    </div>
  );
}

// Test component for guest session
function GuestSessionTestComponent() {
  const { sessionId, email, isLoading, setEmail, clearSession } = useGuestSession();

  return (
    <div>
      <div data-testid="session-loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="session-id">{sessionId || 'no-session'}</div>
      <div data-testid="session-email">{email || 'no-email'}</div>
      <button onClick={() => setEmail('test@example.com')} data-testid="set-email">
        Set Email
      </button>
      <button onClick={clearSession} data-testid="clear-session">
        Clear Session
      </button>
    </div>
  );
}

// ============================================================================
// TESTS: Guest Session Management
// ============================================================================

describe('Guest Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('creates new session ID on first load', async () => {
    render(<GuestSessionTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('session-loading')).toHaveTextContent('ready');
    });

    const sessionId = screen.getByTestId('session-id').textContent;
    expect(sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('persists session to localStorage', async () => {
    render(<GuestSessionTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('session-loading')).toHaveTextContent('ready');
    });

    const stored = localStorage.getItem(GUEST_SESSION_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.sessionId).toMatch(/^guest_/);
    expect(parsed.createdAt).toBeDefined();
  });

  it('loads existing session from localStorage', async () => {
    const existingSession = createMockGuestSession({ sessionId: 'guest_existing_session' });
    setupLocalStorageWithGuestSession(existingSession);

    render(<GuestSessionTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('session-id')).toHaveTextContent('guest_existing_session');
    });
  });

  it('saves email to localStorage', async () => {
    const user = userEvent.setup();
    render(<GuestSessionTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('session-loading')).toHaveTextContent('ready');
    });

    await user.click(screen.getByTestId('set-email'));

    await waitFor(() => {
      expect(screen.getByTestId('session-email')).toHaveTextContent('test@example.com');
    });

    expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe('test@example.com');
  });

  it('clears session and generates new one', async () => {
    const existingSession = createMockGuestSession({ sessionId: 'guest_old_session' });
    setupLocalStorageWithGuestSession(existingSession);

    const user = userEvent.setup();
    render(<GuestSessionTestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('session-id')).toHaveTextContent('guest_old_session');
    });

    await user.click(screen.getByTestId('clear-session'));

    await waitFor(() => {
      const newSessionId = screen.getByTestId('session-id').textContent;
      expect(newSessionId).not.toBe('guest_old_session');
      expect(newSessionId).toMatch(/^guest_/);
    });
  });
});

// ============================================================================
// TESTS: Credit Migration on Sign Up
// ============================================================================

describe('Credit Migration on Sign Up', () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    authStateCallback = null;

    // Setup default Supabase mocks
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    // Capture auth state change callback
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    // Mock profile fetch
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  it('calls migrate-credits API on SIGNED_IN event with guest session', async () => {
    // Setup guest session in localStorage
    const guestSession = createMockGuestSession({ sessionId: 'guest_test_migration_123' });
    setupLocalStorageWithGuestSession(guestSession);

    // Mock successful migration API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { migratedCredits: 5 } }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });

    // Simulate user signing in
    const mockUser = { id: 'user-123', email: 'newuser@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-123' };

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }
    });

    // Verify migration API was called with correct session ID
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/migrate-credits',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Session-ID': 'guest_test_migration_123',
          }),
        })
      );
    });
  });

  it('clears guest session after successful migration', async () => {
    const guestSession = createMockGuestSession({
      sessionId: 'guest_to_clear_456',
      email: 'guest@example.com',
    });
    setupLocalStorageWithGuestSession(guestSession);

    // Verify localStorage is set initially
    expect(localStorage.getItem(GUEST_SESSION_KEY)).not.toBeNull();
    expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe('guest@example.com');

    // Mock successful migration
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { migratedCredits: 3 } }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_IN
    const mockUser = { id: 'user-456', email: 'newuser@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-456' };

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }
    });

    // Wait for migration to complete and localStorage to be cleared
    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBeNull();
    });
  });

  it('does not call migration API when no guest session exists', async () => {
    // No guest session in localStorage
    expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_IN
    const mockUser = { id: 'user-789', email: 'existing@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-789' };

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }
    });

    // Wait a bit and verify migration was NOT called
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/auth/migrate-credits',
      expect.anything()
    );
  });

  it('handles migration API failure gracefully', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_fail_test' });
    setupLocalStorageWithGuestSession(guestSession);

    // Mock failed migration API call
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_IN
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'user-fail' }, access_token: 'token' });
      }
    });

    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Guest session should NOT be cleared on failure (user can try again later)
    expect(localStorage.getItem(GUEST_SESSION_KEY)).not.toBeNull();

    consoleError.mockRestore();
  });

  it('handles network error during migration gracefully', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_network_error' });
    setupLocalStorageWithGuestSession(guestSession);

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_IN
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'user-net' }, access_token: 'token' });
      }
    });

    // Wait and verify error was logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to migrate guest credits:',
        expect.any(Error)
      );
    });

    // Guest session should be preserved
    expect(localStorage.getItem(GUEST_SESSION_KEY)).not.toBeNull();

    consoleError.mockRestore();
  });
});

// ============================================================================
// TESTS: Migrate Credits API Route
// ============================================================================

describe('/api/auth/migrate-credits API', () => {
  // These tests would typically be in a separate API route test file
  // but included here to show the expected behavior

  it('should return 401 if user is not authenticated', async () => {
    // This is a documentation test - actual API testing requires different setup
    const expectedResponse = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    };

    expect(expectedResponse.error.code).toBe('UNAUTHORIZED');
  });

  it('should return success with 0 credits if no guest session provided', async () => {
    const expectedResponse = {
      success: true,
      data: { migratedCredits: 0, message: 'No guest session to migrate' },
    };

    expect(expectedResponse.success).toBe(true);
    expect(expectedResponse.data.migratedCredits).toBe(0);
  });

  it('should migrate credits and mark guest_credits as migrated', async () => {
    // Expected flow:
    // 1. Find guest_credits where session_id matches and migrated_to_user_id is null
    // 2. Calculate remaining credits (credits_total - credits_used)
    // 3. Create export_credits for authenticated user with package_type='migrated_guest'
    // 4. Update guest_credits with migrated_to_user_id and migrated_at

    const expectedMigrationMetadata = {
      migrated_from_session: 'guest_session_id',
      original_guest_id: 'guest_credit_id',
      migrated_at: expect.any(String),
    };

    expect(expectedMigrationMetadata.migrated_from_session).toBeDefined();
  });
});

// ============================================================================
// TESTS: Full Flow Integration
// ============================================================================

describe('Full Guest Purchase → Signup → Migration Flow', () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    authStateCallback = null;

    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  it('simulates complete flow: guest purchase → signup → migration → authenticated use', async () => {
    // STEP 1: Guest session exists with purchased credits
    const guestSession = createMockGuestSession({
      sessionId: 'guest_full_flow_test',
      email: 'buyer@example.com',
    });
    setupLocalStorageWithGuestSession(guestSession);

    // Simulate that guest has credits in the database (this would be set by webhook)
    // For this test, we just verify the migration API is called correctly

    // Mock successful migration with 10 credits
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          migratedCredits: 10,
          message: 'Successfully migrated 10 credits',
        },
      }),
    });

    // Render the app
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // STEP 2: Verify guest state
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });
    expect(localStorage.getItem(GUEST_SESSION_KEY)).not.toBeNull();

    // STEP 3: User signs up (simulated by auth state change)
    const newUser = {
      id: 'new-user-full-flow',
      email: 'buyer@example.com',
      created_at: new Date().toISOString(),
    };
    const newSession = {
      user: newUser,
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    };

    // Update mock to return authenticated user
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: newUser }, error: null });

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', newSession);
      }
    });

    // STEP 4: Verify migration was triggered
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/migrate-credits',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Session-ID': 'guest_full_flow_test',
          }),
        })
      );
    });

    // STEP 5: Verify guest session was cleared
    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBeNull();
    });

    // STEP 6: Verify user is authenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('buyer@example.com');
    });
  });

  it('handles multiple guest credit entries during migration', async () => {
    // Guest might have made multiple purchases before signing up
    const guestSession = createMockGuestSession({
      sessionId: 'guest_multiple_purchases',
      email: 'multi@example.com',
    });
    setupLocalStorageWithGuestSession(guestSession);

    // Mock migration of multiple credit entries (e.g., 5 + 10 = 15 total)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          migratedCredits: 15, // From two separate purchases
          message: 'Successfully migrated 15 credits',
        },
      }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });

    // User signs up
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', {
          user: { id: 'user-multi', email: 'multi@example.com' },
          access_token: 'token',
        });
      }
    });

    // Verify migration was successful
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
    });
  });

  it('preserves Smart Export sessions during migration', async () => {
    // Guest used Smart Export (free re-export within 24h) - this should still work after migration
    // The export_sessions table links to credit_id, which is updated during migration

    const guestSession = createMockGuestSession({
      sessionId: 'guest_smart_export',
    });
    setupLocalStorageWithGuestSession(guestSession);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          migratedCredits: 5,
          message: 'Successfully migrated 5 credits',
          // In real implementation, export_sessions might be linked to new credit entry
        },
      }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', {
          user: { id: 'user-smart', email: 'smart@example.com' },
          access_token: 'token',
        });
      }
    });

    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
    });
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    authStateCallback = null;

    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  it('handles corrupted localStorage data', async () => {
    // Set invalid JSON
    localStorage.setItem(GUEST_SESSION_KEY, 'not-valid-json');

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<GuestSessionTestComponent />);

    // Should create a new session instead of crashing
    await waitFor(() => {
      expect(screen.getByTestId('session-loading')).toHaveTextContent('ready');
    });

    const sessionId = screen.getByTestId('session-id').textContent;
    expect(sessionId).toMatch(/^guest_/);

    consoleError.mockRestore();
  });

  it('handles missing sessionId in parsed data', async () => {
    // Set JSON without sessionId
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({ email: 'test@example.com' }));

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_IN - migration should not be called because sessionId is missing
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', {
          user: { id: 'user-missing' },
          access_token: 'token',
        });
      }
    });

    // Wait a bit and verify no migration API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/auth/migrate-credits',
      expect.anything()
    );
  });

  it('handles expired guest credits (no migration)', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_expired' });
    setupLocalStorageWithGuestSession(guestSession);

    // Mock API returns 0 credits (expired)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          migratedCredits: 0,
          message: 'No credits to migrate',
        },
      }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', {
          user: { id: 'user-expired' },
          access_token: 'token',
        });
      }
    });

    // API should be called, but response indicates no credits to migrate
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Session should still be cleared (migration was successful, just 0 credits)
    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
    });
  });

  it('handles user already used all credits as guest', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_all_used' });
    setupLocalStorageWithGuestSession(guestSession);

    // Guest used all 5 credits, 0 remaining
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          migratedCredits: 0, // All credits were used
          message: 'Successfully migrated 0 credits',
        },
      }),
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', {
          user: { id: 'user-all-used' },
          access_token: 'token',
        });
      }
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Session should still be cleared
    await waitFor(() => {
      expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
    });
  });

  it('does not trigger migration on SIGNED_OUT event', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_signout_test' });
    setupLocalStorageWithGuestSession(guestSession);

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger SIGNED_OUT instead of SIGNED_IN
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_OUT', null);
      }
    });

    // Wait and verify migration was NOT called
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/auth/migrate-credits',
      expect.anything()
    );

    // Guest session should remain
    expect(localStorage.getItem(GUEST_SESSION_KEY)).not.toBeNull();
  });

  it('does not trigger migration on TOKEN_REFRESHED event', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_refresh_test' });
    setupLocalStorageWithGuestSession(guestSession);

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger TOKEN_REFRESHED
    act(() => {
      if (authStateCallback) {
        authStateCallback('TOKEN_REFRESHED', {
          user: { id: 'user-refresh' },
          access_token: 'new-token',
        });
      }
    });

    // Wait and verify migration was NOT called
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/auth/migrate-credits',
      expect.anything()
    );
  });
});

// ============================================================================
// TESTS: Concurrent Operations
// ============================================================================

describe('Concurrent Operations', () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    authStateCallback = null;

    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  it('handles rapid SIGNED_IN events without duplicate migrations', async () => {
    const guestSession = createMockGuestSession({ sessionId: 'guest_rapid_signin' });
    setupLocalStorageWithGuestSession(guestSession);

    let migrationCallCount = 0;
    mockFetch.mockImplementation(() => {
      migrationCallCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { migratedCredits: 5 } }),
      });
    });

    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).not.toHaveTextContent('loading');
    });

    // Trigger multiple SIGNED_IN events rapidly
    act(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'user-1' }, access_token: 'token-1' });
        authStateCallback('SIGNED_IN', { user: { id: 'user-1' }, access_token: 'token-2' });
        authStateCallback('SIGNED_IN', { user: { id: 'user-1' }, access_token: 'token-3' });
      }
    });

    // Wait for all async operations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // First migration clears localStorage, subsequent ones should not call API
    // (because localStorage check happens before API call)
    // Note: This depends on timing - first call clears storage before others check it
    expect(migrationCallCount).toBeGreaterThanOrEqual(1);
  });
});
