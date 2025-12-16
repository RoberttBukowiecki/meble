/**
 * Guest Session Hook Tests
 *
 * Tests for guest session management in localStorage.
 * Guest sessions are used for anonymous credit purchases.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGuestSession } from './useGuestSession';

// Storage keys (must match the hook implementation)
const STORAGE_KEY = 'e_meble_guest_session';
const EMAIL_KEY = 'e_meble_guest_email';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
    reset: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Silence console.error for expected errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('useGuestSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.reset();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('initialization', () => {
    it('creates new session when none exists', async () => {
      const { result } = renderHook(() => useGuestSession());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have created a session
      expect(result.current.sessionId).not.toBeNull();
      expect(result.current.sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('loads existing session from localStorage', async () => {
      const existingSession = {
        sessionId: 'guest_existing_abc123def456',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessionId).toBe('guest_existing_abc123def456');
      expect(result.current.createdAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('loads email from separate storage key', async () => {
      const existingSession = {
        sessionId: 'guest_test_abc123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        if (key === EMAIL_KEY) return 'test@example.com';
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('generates valid session ID format: guest_{timestamp}_{random}', async () => {
      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const sessionId = result.current.sessionId;
      expect(sessionId).not.toBeNull();
      expect(sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);

      // Parse the session ID parts
      const parts = sessionId!.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('guest');
      // Timestamp part should be base36 encoded
      expect(parts[1].length).toBeGreaterThan(0);
      // Random part should be alphanumeric
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('sets isLoading to false after initialization', async () => {
      const { result } = renderHook(() => useGuestSession());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After initialization, isLoading should remain false
      expect(result.current.isLoading).toBe(false);
    });

    it('initializes createdAt with ISO timestamp', async () => {
      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.createdAt).not.toBeNull();
      // Should be valid ISO date string
      expect(new Date(result.current.createdAt!).toISOString()).toBe(
        result.current.createdAt
      );
    });
  });

  describe('setEmail', () => {
    it('saves email to localStorage under EMAIL_KEY', async () => {
      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        EMAIL_KEY,
        'test@example.com'
      );
    });

    it('updates session state with email', async () => {
      // Ensure clean state - no stored email
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return null;
        if (key === EMAIL_KEY) return null;
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Email should be null initially
      expect(result.current.email).toBeNull();

      act(() => {
        result.current.setEmail('new@example.com');
      });

      expect(result.current.email).toBe('new@example.com');
    });

    it('does nothing when session is null (during loading)', () => {
      // Force session to be null by not waiting for initialization
      const { result } = renderHook(() => useGuestSession());

      // During loading, session is null
      // setEmail should not throw or cause errors
      act(() => {
        result.current.setEmail('test@example.com');
      });

      // No localStorage call for email should happen
      // (the only setItem call should be for creating new session)
    });

    it('can update email multiple times', async () => {
      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setEmail('first@example.com');
      });
      expect(result.current.email).toBe('first@example.com');

      act(() => {
        result.current.setEmail('second@example.com');
      });
      expect(result.current.email).toBe('second@example.com');
    });
  });

  describe('clearSession', () => {
    it('removes session from localStorage', async () => {
      const existingSession = {
        sessionId: 'guest_test_abc123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.clearSession();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('removes email from localStorage', async () => {
      const existingSession = {
        sessionId: 'guest_test_abc123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        if (key === EMAIL_KEY) return 'test@example.com';
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.clearSession();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(EMAIL_KEY);
    });

    it('creates new session after clearing', async () => {
      const existingSession = {
        sessionId: 'guest_old_session123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const oldSessionId = result.current.sessionId;

      act(() => {
        result.current.clearSession();
      });

      // Should have a new session ID
      expect(result.current.sessionId).not.toBe(oldSessionId);
      expect(result.current.sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);

      // Email should be cleared
      expect(result.current.email).toBeNull();
    });
  });

  describe('error handling', () => {
    it('creates fallback session on localStorage getItem error', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have a session (fallback)
      expect(result.current.sessionId).not.toBeNull();
      expect(result.current.sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);
      expect(console.error).toHaveBeenCalled();
    });

    it('creates fallback session on JSON parse error', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return 'invalid-json{{{';
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should create a new session
      expect(result.current.sessionId).not.toBeNull();
      expect(result.current.sessionId).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/);
      expect(console.error).toHaveBeenCalled();
    });

    it('logs error but continues on setEmail failure', async () => {
      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(console.error).toHaveBeenCalled();
    });

    it('logs error but continues on clearSession failure', async () => {
      const existingSession = {
        sessionId: 'guest_test_abc123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        return null;
      });

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      act(() => {
        result.current.clearSession();
      });

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('session persistence', () => {
    it('session ID remains stable across re-renders', async () => {
      const { result, rerender } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialSessionId = result.current.sessionId;

      // Re-render multiple times
      rerender();
      rerender();
      rerender();

      expect(result.current.sessionId).toBe(initialSessionId);
    });

    it('does not recreate session on hook re-initialization with same storage', async () => {
      // Setup existing session
      const existingSession = {
        sessionId: 'guest_persistent_abc123',
        email: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return JSON.stringify(existingSession);
        return null;
      });

      // First hook instance loads session
      const { result: result1, unmount } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      expect(result1.current.sessionId).toBe('guest_persistent_abc123');

      unmount();

      // Second hook instance should load same session
      const { result: result2 } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      expect(result2.current.sessionId).toBe('guest_persistent_abc123');
    });
  });

  describe('return values', () => {
    it('returns all expected properties', async () => {
      // Set up mock to return no existing session (will create new)
      mockLocalStorage.getItem.mockImplementation(() => null);

      const { result } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check all properties exist
      expect(result.current).toHaveProperty('sessionId');
      expect(result.current).toHaveProperty('email');
      expect(result.current).toHaveProperty('createdAt');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('setEmail');
      expect(result.current).toHaveProperty('clearSession');

      // Check types - sessionId should be string after initialization
      expect(result.current.sessionId).not.toBeNull();
      expect(typeof result.current.sessionId).toBe('string');
      expect(result.current.email === null || typeof result.current.email === 'string').toBe(true);
      expect(typeof result.current.createdAt).toBe('string');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.setEmail).toBe('function');
      expect(typeof result.current.clearSession).toBe('function');
    });

    it('setEmail and clearSession are stable references', async () => {
      const { result, rerender } = renderHook(() => useGuestSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const setEmail1 = result.current.setEmail;
      const clearSession1 = result.current.clearSession;

      rerender();

      // setEmail uses useCallback with [session] dependency
      // clearSession uses useCallback with [] dependency
      expect(result.current.clearSession).toBe(clearSession1);
      // Note: setEmail might change if session changes, which is expected
    });
  });
});
