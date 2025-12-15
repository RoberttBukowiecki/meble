/**
 * Credits Store
 *
 * Zustand store for managing credits state across the application.
 * Handles both authenticated users and guest users with a unified interface.
 *
 * This is a separate store from the main editor store because:
 * 1. Credits are server state (fetched from API), not client state
 * 2. Should NOT be persisted to localStorage
 * 3. Needs to stay in sync across all components
 */

import { create } from 'zustand';

// Types
export interface CreditPackage {
  id: string;
  type: 'single' | 'starter' | 'standard' | 'pro' | 'migrated_guest' | 'bonus';
  total: number;
  used: number;
  remaining: number;
  validUntil: string | null;
  purchasedAt: string;
}

export interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  hasUnlimited: boolean;
  unlimitedExpiresAt: string | null;
  packages: CreditPackage[];
}

export interface GuestCreditBalance {
  availableCredits: number;
  expiresAt: string | null;
}

export interface UseCreditResult {
  creditUsed: boolean;
  sessionId: string;
  creditsRemaining: number;
  message: string;
  isFreeReexport: boolean;
}

interface CreditsState {
  // Auth user credits
  userBalance: CreditBalance | null;
  userLoading: boolean;
  userError: string | null;

  // Guest credits
  guestBalance: GuestCreditBalance | null;
  guestSessionId: string | null;
  guestEmail: string | null;
  guestLoading: boolean;
  guestError: string | null;

  // Credit usage state
  isUsingCredit: boolean;

  // Actions
  fetchUserCredits: () => Promise<void>;
  fetchGuestCredits: (sessionId: string) => Promise<void>;
  useUserCredit: (projectHash: string) => Promise<UseCreditResult | null>;
  useGuestCredit: (sessionId: string, projectHash: string) => Promise<UseCreditResult | null>;
  setGuestSession: (sessionId: string, email: string | null) => void;
  clearGuestSession: () => void;
  reset: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

const initialState = {
  userBalance: null,
  userLoading: false,
  userError: null,
  guestBalance: null,
  guestSessionId: null,
  guestEmail: null,
  guestLoading: false,
  guestError: null,
  isUsingCredit: false,
};

export const useCreditsStore = create<CreditsState>((set, get) => ({
  ...initialState,

  /**
   * Fetch credits for authenticated user
   */
  fetchUserCredits: async () => {
    set({ userLoading: true, userError: null });

    try {
      const response = await fetch(`${API_BASE}/credits`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch credits');
      }

      set({ userBalance: data.data, userLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ userError: message, userLoading: false });
      console.error('Failed to fetch user credits:', err);
    }
  },

  /**
   * Fetch credits for guest user
   */
  fetchGuestCredits: async (sessionId: string) => {
    if (!sessionId) return;

    set({ guestLoading: true, guestError: null, guestSessionId: sessionId });

    try {
      const response = await fetch(
        `${API_BASE}/guest/credits?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        // No credits is not an error for guests
        if (data.error?.code === 'NO_CREDITS') {
          set({
            guestBalance: { availableCredits: 0, expiresAt: null },
            guestLoading: false,
          });
          return;
        }
        throw new Error(data.error?.message || 'Failed to fetch credits');
      }

      set({ guestBalance: data.data, guestLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({
        guestError: message,
        guestBalance: { availableCredits: 0, expiresAt: null },
        guestLoading: false,
      });
      console.error('Failed to fetch guest credits:', err);
    }
  },

  /**
   * Use credit for authenticated user export
   */
  useUserCredit: async (projectHash: string): Promise<UseCreditResult | null> => {
    set({ isUsingCredit: true, userError: null });

    try {
      const response = await fetch(`${API_BASE}/credits/use`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectHash }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to use credit';
        set({ userError: errorMessage, isUsingCredit: false });
        return null;
      }

      // Update balance locally for instant UI feedback
      if (!data.data.isFreeReexport) {
        set((state) => {
          if (!state.userBalance) return { isUsingCredit: false };
          return {
            userBalance: {
              ...state.userBalance,
              usedCredits: state.userBalance.usedCredits + 1,
              availableCredits: Math.max(0, state.userBalance.availableCredits - 1),
            },
            isUsingCredit: false,
          };
        });
      } else {
        set({ isUsingCredit: false });
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ userError: message, isUsingCredit: false });
      console.error('Failed to use credit:', err);
      return null;
    }
  },

  /**
   * Use credit for guest user export
   */
  useGuestCredit: async (
    sessionId: string,
    projectHash: string
  ): Promise<UseCreditResult | null> => {
    if (!sessionId) {
      set({ guestError: 'Session not available' });
      return null;
    }

    set({ isUsingCredit: true, guestError: null });

    try {
      const response = await fetch(`${API_BASE}/guest/credits/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, projectHash }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to use credit';
        set({ guestError: errorMessage, isUsingCredit: false });
        return null;
      }

      // Update balance locally for instant UI feedback
      if (!data.data.isFreeReexport) {
        set((state) => {
          if (!state.guestBalance) return { isUsingCredit: false };
          return {
            guestBalance: {
              ...state.guestBalance,
              availableCredits: Math.max(0, state.guestBalance.availableCredits - 1),
            },
            isUsingCredit: false,
          };
        });
      } else {
        set({ isUsingCredit: false });
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ guestError: message, isUsingCredit: false });
      console.error('Failed to use credit:', err);
      return null;
    }
  },

  /**
   * Set guest session info
   */
  setGuestSession: (sessionId: string, email: string | null) => {
    set({ guestSessionId: sessionId, guestEmail: email });
  },

  /**
   * Clear guest session (on login/logout)
   */
  clearGuestSession: () => {
    set({
      guestBalance: null,
      guestSessionId: null,
      guestEmail: null,
      guestError: null,
    });
  },

  /**
   * Reset entire store (on logout)
   */
  reset: () => {
    set(initialState);
  },
}));

// Selectors for convenience
export const selectUserCredits = (state: CreditsState) => ({
  balance: state.userBalance,
  isLoading: state.userLoading,
  error: state.userError,
});

export const selectGuestCredits = (state: CreditsState) => ({
  balance: state.guestBalance,
  sessionId: state.guestSessionId,
  email: state.guestEmail,
  isLoading: state.guestLoading,
  error: state.guestError,
});

export const selectAvailableCredits = (isAuthenticated: boolean) => (state: CreditsState) => {
  if (isAuthenticated) {
    return state.userBalance?.availableCredits ?? 0;
  }
  return state.guestBalance?.availableCredits ?? 0;
};

export const selectHasUnlimited = (state: CreditsState) =>
  state.userBalance?.hasUnlimited ?? false;

export const selectIsLoading = (isAuthenticated: boolean) => (state: CreditsState) => {
  if (isAuthenticated) {
    return state.userLoading;
  }
  return state.guestLoading;
};
