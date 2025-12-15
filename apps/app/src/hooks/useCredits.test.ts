/**
 * useCredits Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCredits } from './useCredits';
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

describe('useCredits', () => {
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

  it('fetches credits when authenticated', async () => {
    const mockBalance = {
      totalCredits: 10,
      usedCredits: 2,
      availableCredits: 8,
      hasUnlimited: false,
      unlimitedExpiresAt: null,
      packages: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBalance }),
    });

    const { result } = renderHook(() => useCredits(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toEqual(mockBalance);
  });

  it('does not fetch credits when not authenticated', () => {
    const { result } = renderHook(() => useCredits(false));

    expect(result.current.balance).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shares state between multiple hook instances', async () => {
    const mockBalance = {
      totalCredits: 10,
      usedCredits: 2,
      availableCredits: 8,
      hasUnlimited: false,
      unlimitedExpiresAt: null,
      packages: [],
    };

    // Pre-set the balance to avoid timing issues
    useCreditsStore.setState({ userBalance: mockBalance });

    // Render two hook instances (simulating ExportDialog and UserMenu)
    const { result: result1 } = renderHook(() => useCredits(true));
    const { result: result2 } = renderHook(() => useCredits(true));

    // Both should have the same balance (shared via Zustand store)
    expect(result1.current.balance).toEqual(mockBalance);
    expect(result2.current.balance).toEqual(mockBalance);
  });

  it('updates all instances when credit is used', async () => {
    const mockBalance = {
      totalCredits: 10,
      usedCredits: 2,
      availableCredits: 8,
      hasUnlimited: false,
      unlimitedExpiresAt: null,
      packages: [],
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
            sessionId: 'session_123',
            creditsRemaining: 7,
            message: 'Credit used',
            isFreeReexport: false,
          },
        }),
      });

    // Render two hook instances
    const { result: result1 } = renderHook(() => useCredits(true));
    const { result: result2 } = renderHook(() => useCredits(true));

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Use credit from first instance
    await act(async () => {
      await result1.current.useCredit('hash_abc');
    });

    // Both instances should see updated balance
    expect(result1.current.balance?.availableCredits).toBe(7);
    expect(result2.current.balance?.availableCredits).toBe(7);
  });

  it('provides refetch function', async () => {
    const mockBalance = {
      totalCredits: 10,
      usedCredits: 2,
      availableCredits: 8,
      hasUnlimited: false,
      unlimitedExpiresAt: null,
      packages: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBalance }),
    });

    const { result } = renderHook(() => useCredits(true));

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

  it('handles errors correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { message: 'Auth required' } }),
    });

    const { result } = renderHook(() => useCredits(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Auth required');
    expect(result.current.balance).toBeNull();
  });
});
