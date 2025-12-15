/**
 * useGuestCredits Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGuestCredits } from './useGuestCredits';
import { useCreditsStore } from '@/lib/store/creditsStore';

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

// Mock useGuestSession hook
jest.mock('./useGuestSession', () => ({
  useGuestSession: () => ({
    sessionId: 'guest_test_123',
    email: 'guest@example.com',
    isLoading: false,
    setEmail: jest.fn(),
    clearSession: jest.fn(),
  }),
}));

describe('useGuestCredits', () => {
  beforeEach(() => {
    // Reset store state
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

  it('fetches guest credits on mount', async () => {
    const mockBalance = {
      availableCredits: 3,
      expiresAt: '2025-01-15T00:00:00Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBalance }),
    });

    const { result } = renderHook(() => useGuestCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toEqual(mockBalance);
    expect(result.current.sessionId).toBe('guest_test_123');
  });

  it('shares state between multiple hook instances', async () => {
    const mockBalance = {
      availableCredits: 3,
      expiresAt: null,
    };

    // Pre-set the balance to avoid timing issues
    useCreditsStore.setState({
      guestBalance: mockBalance,
      guestSessionId: 'guest_test_123',
    });

    // Render two hook instances
    const { result: result1 } = renderHook(() => useGuestCredits());
    const { result: result2 } = renderHook(() => useGuestCredits());

    // Both should see the same balance (shared via Zustand store)
    expect(result1.current.balance).toEqual(mockBalance);
    expect(result2.current.balance).toEqual(mockBalance);
  });

  it('updates all instances when guest credit is used', async () => {
    const mockBalance = {
      availableCredits: 5,
      expiresAt: null,
    };

    // First calls are for fetching balance on mount
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      })
      // Third call is for useCredit
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: true,
            sessionId: 'guest_test_123',
            creditsRemaining: 4,
            message: 'Credit used',
            isFreeReexport: false,
          },
        }),
      });

    // Render two hook instances
    const { result: result1 } = renderHook(() => useGuestCredits());
    const { result: result2 } = renderHook(() => useGuestCredits());

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Use credit from first instance
    await act(async () => {
      await result1.current.useCredit('hash_abc');
    });

    // Both instances should see updated balance
    expect(result1.current.balance?.availableCredits).toBe(4);
    expect(result2.current.balance?.availableCredits).toBe(4);
  });

  it('handles Smart Export (free re-export)', async () => {
    const mockBalance = {
      availableCredits: 5,
      expiresAt: null,
    };

    // First call is for fetching balance on mount
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBalance }),
      })
      // Second call is for useCredit (free re-export)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            creditUsed: false,
            sessionId: 'guest_test_123',
            creditsRemaining: 5,
            message: 'Free re-export',
            isFreeReexport: true,
          },
        }),
      });

    const { result } = renderHook(() => useGuestCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let useCreditResult: any;
    await act(async () => {
      useCreditResult = await result.current.useCredit('hash_abc');
    });

    // Should not deduct credit for free re-export
    expect(useCreditResult?.isFreeReexport).toBe(true);
    expect(result.current.balance?.availableCredits).toBe(5);
  });

  it('handles no credits error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { code: 'NO_CREDITS' } }),
    });

    const { result } = renderHook(() => useGuestCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should set zero balance, not error
    expect(result.current.balance).toEqual({ availableCredits: 0, expiresAt: null });
  });

  it('provides refetch function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { availableCredits: 3, expiresAt: null },
      }),
    });

    const { result } = renderHook(() => useGuestCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Reset fetch to track new calls
    mockFetch.mockClear();

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    // Should have called fetch once for refetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
