/**
 * Credits Store Tests
 *
 * Comprehensive tests for the credits Zustand store.
 * Tests both authenticated and guest user flows.
 */

import { useCreditsStore } from './creditsStore';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Silence console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('creditsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCreditsStore.setState({
      userBalance: null,
      userLoading: false,
      userError: null,
      guestBalance: null,
      guestSessionId: null,
      guestEmail: null,
      guestLoading: false,
      guestError: null,
      isUsingCredit: false,
    });
    mockFetch.mockReset();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useCreditsStore.getState();

      expect(state.userBalance).toBeNull();
      expect(state.userLoading).toBe(false);
      expect(state.userError).toBeNull();
      expect(state.guestBalance).toBeNull();
      expect(state.guestSessionId).toBeNull();
      expect(state.guestEmail).toBeNull();
      expect(state.guestLoading).toBe(false);
      expect(state.guestError).toBeNull();
      expect(state.isUsingCredit).toBe(false);
    });
  });

  describe('fetchUserCredits', () => {
    it('fetches and stores user credits successfully', async () => {
      const mockBalance = {
        totalCredits: 10,
        usedCredits: 2,
        availableCredits: 8,
        hasUnlimited: false,
        unlimitedExpiresAt: null,
        packages: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      });

      await useCreditsStore.getState().fetchUserCredits();

      const state = useCreditsStore.getState();
      expect(state.userBalance).toEqual(mockBalance);
      expect(state.userLoading).toBe(false);
      expect(state.userError).toBeNull();
    });

    it('handles fetch error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { message: 'Auth required' } }),
      });

      await useCreditsStore.getState().fetchUserCredits();

      const state = useCreditsStore.getState();
      expect(state.userBalance).toBeNull();
      expect(state.userLoading).toBe(false);
      expect(state.userError).toBe('Auth required');
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await useCreditsStore.getState().fetchUserCredits();

      const state = useCreditsStore.getState();
      expect(state.userBalance).toBeNull();
      expect(state.userLoading).toBe(false);
      expect(state.userError).toBe('Network error');
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const fetchPromise = useCreditsStore.getState().fetchUserCredits();

      // Check loading state while fetching
      expect(useCreditsStore.getState().userLoading).toBe(true);

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, data: { availableCredits: 5 } }),
      });

      await fetchPromise;
      expect(useCreditsStore.getState().userLoading).toBe(false);
    });
  });

  describe('fetchGuestCredits', () => {
    it('fetches and stores guest credits successfully', async () => {
      const mockBalance = {
        availableCredits: 3,
        expiresAt: '2025-01-15T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      });

      await useCreditsStore.getState().fetchGuestCredits('guest_123');

      const state = useCreditsStore.getState();
      expect(state.guestBalance).toEqual(mockBalance);
      expect(state.guestSessionId).toBe('guest_123');
      expect(state.guestLoading).toBe(false);
      expect(state.guestError).toBeNull();
    });

    it('handles NO_CREDITS error by setting zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { code: 'NO_CREDITS' } }),
      });

      await useCreditsStore.getState().fetchGuestCredits('guest_123');

      const state = useCreditsStore.getState();
      expect(state.guestBalance).toEqual({ availableCredits: 0, expiresAt: null });
      expect(state.guestLoading).toBe(false);
    });

    it('does nothing when sessionId is empty', async () => {
      await useCreditsStore.getState().fetchGuestCredits('');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('useUserCredit', () => {
    beforeEach(() => {
      // Set up initial balance
      useCreditsStore.setState({
        userBalance: {
          totalCredits: 10,
          usedCredits: 2,
          availableCredits: 8,
          hasUnlimited: false,
          unlimitedExpiresAt: null,
          packages: [],
        },
      });
    });

    it('uses credit and updates balance locally', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: true,
            sessionId: 'session_123',
            creditsRemaining: 7,
            message: 'Credit used',
            isFreeReexport: false,
          },
        }),
      });

      const result = await useCreditsStore.getState().useUserCredit('hash_abc');

      expect(result).not.toBeNull();
      expect(result?.creditUsed).toBe(true);
      expect(result?.isFreeReexport).toBe(false);

      // Check local balance was updated
      const state = useCreditsStore.getState();
      expect(state.userBalance?.availableCredits).toBe(7);
      expect(state.userBalance?.usedCredits).toBe(3);
      expect(state.isUsingCredit).toBe(false);
    });

    it('does not deduct credit for free re-export (Smart Export)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: false,
            sessionId: 'session_123',
            creditsRemaining: 8,
            message: 'Free re-export',
            isFreeReexport: true,
          },
        }),
      });

      const result = await useCreditsStore.getState().useUserCredit('hash_abc');

      expect(result?.isFreeReexport).toBe(true);

      // Balance should remain unchanged
      const state = useCreditsStore.getState();
      expect(state.userBalance?.availableCredits).toBe(8);
      expect(state.userBalance?.usedCredits).toBe(2);
    });

    it('handles error when using credit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'No credits available' },
        }),
      });

      const result = await useCreditsStore.getState().useUserCredit('hash_abc');

      expect(result).toBeNull();
      expect(useCreditsStore.getState().userError).toBe('No credits available');
      expect(useCreditsStore.getState().isUsingCredit).toBe(false);
    });
  });

  describe('useGuestCredit', () => {
    beforeEach(() => {
      useCreditsStore.setState({
        guestBalance: {
          availableCredits: 3,
          expiresAt: '2025-01-15T00:00:00Z',
        },
        guestSessionId: 'guest_123',
      });
    });

    it('uses guest credit and updates balance locally', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: true,
            sessionId: 'guest_123',
            creditsRemaining: 2,
            message: 'Credit used',
            isFreeReexport: false,
          },
        }),
      });

      const result = await useCreditsStore
        .getState()
        .useGuestCredit('guest_123', 'hash_abc');

      expect(result).not.toBeNull();
      expect(result?.creditUsed).toBe(true);

      // Check local balance was updated
      const state = useCreditsStore.getState();
      expect(state.guestBalance?.availableCredits).toBe(2);
    });

    it('returns null when sessionId is missing', async () => {
      const result = await useCreditsStore.getState().useGuestCredit('', 'hash_abc');

      expect(result).toBeNull();
      expect(useCreditsStore.getState().guestError).toBe('Session not available');
    });
  });

  describe('setGuestSession', () => {
    it('sets guest session ID and email', () => {
      useCreditsStore.getState().setGuestSession('guest_456', 'test@example.com');

      const state = useCreditsStore.getState();
      expect(state.guestSessionId).toBe('guest_456');
      expect(state.guestEmail).toBe('test@example.com');
    });
  });

  describe('clearGuestSession', () => {
    it('clears guest session data', () => {
      useCreditsStore.setState({
        guestBalance: { availableCredits: 5, expiresAt: null },
        guestSessionId: 'guest_123',
        guestEmail: 'test@example.com',
        guestError: 'Some error',
      });

      useCreditsStore.getState().clearGuestSession();

      const state = useCreditsStore.getState();
      expect(state.guestBalance).toBeNull();
      expect(state.guestSessionId).toBeNull();
      expect(state.guestEmail).toBeNull();
      expect(state.guestError).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets entire store to initial state', () => {
      useCreditsStore.setState({
        userBalance: { availableCredits: 10 } as any,
        userLoading: true,
        userError: 'error',
        guestBalance: { availableCredits: 5, expiresAt: null },
        guestSessionId: 'guest_123',
        guestEmail: 'test@example.com',
        guestLoading: true,
        guestError: 'error',
        isUsingCredit: true,
      });

      useCreditsStore.getState().reset();

      const state = useCreditsStore.getState();
      expect(state.userBalance).toBeNull();
      expect(state.userLoading).toBe(false);
      expect(state.userError).toBeNull();
      expect(state.guestBalance).toBeNull();
      expect(state.guestSessionId).toBeNull();
      expect(state.guestEmail).toBeNull();
      expect(state.guestLoading).toBe(false);
      expect(state.guestError).toBeNull();
      expect(state.isUsingCredit).toBe(false);
    });
  });

  describe('cross-component sync', () => {
    it('shares state across multiple store consumers', async () => {
      // Simulate two components using the store
      const consumer1State = useCreditsStore.getState;
      const consumer2State = useCreditsStore.getState;

      const mockBalance = {
        totalCredits: 10,
        usedCredits: 0,
        availableCredits: 10,
        hasUnlimited: false,
        unlimitedExpiresAt: null,
        packages: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      });

      // Consumer 1 fetches credits
      await consumer1State().fetchUserCredits();

      // Consumer 2 should see the same balance (shared state)
      expect(consumer2State().userBalance).toEqual(mockBalance);
      expect(consumer1State().userBalance).toBe(consumer2State().userBalance);
    });

    it('updates all consumers when credit is used', async () => {
      // Set initial state
      const initialBalance = {
        totalCredits: 10,
        usedCredits: 0,
        availableCredits: 10,
        hasUnlimited: false,
        unlimitedExpiresAt: null,
        packages: [],
      };

      useCreditsStore.setState({ userBalance: initialBalance });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: true,
            sessionId: 'session_123',
            creditsRemaining: 9,
            message: 'Credit used',
            isFreeReexport: false,
          },
        }),
      });

      // Use credit
      await useCreditsStore.getState().useUserCredit('hash_abc');

      // All consumers should see updated balance
      expect(useCreditsStore.getState().userBalance?.availableCredits).toBe(9);
    });
  });

  describe('unlimited credits handling', () => {
    it('handles unlimited user credits correctly', async () => {
      const mockBalance = {
        totalCredits: 999,
        usedCredits: 50,
        availableCredits: 999,
        hasUnlimited: true,
        unlimitedExpiresAt: '2025-12-31T00:00:00Z',
        packages: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      });

      await useCreditsStore.getState().fetchUserCredits();

      const state = useCreditsStore.getState();
      expect(state.userBalance?.hasUnlimited).toBe(true);
      expect(state.userBalance?.availableCredits).toBe(999);
    });
  });
});
