/**
 * Guest Credits Hook
 *
 * Hook for guest (non-authenticated) user credits management.
 * Uses the shared Zustand credits store for state.
 *
 * @param enabled - If false, skips fetching credits (use when user is authenticated)
 */

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGuestSession } from "./useGuestSession";
import {
  useCreditsStore,
  type GuestCreditBalance,
  type UseCreditResult,
} from "@/lib/store/creditsStore";

interface UseGuestCreditsReturn {
  balance: GuestCreditBalance | null;
  sessionId: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  useCredit: (projectHash: string) => Promise<UseCreditResult | null>;
  setEmail: (email: string) => void;
  isUsingCredit: boolean;
}

/**
 * Hook for managing guest credits
 * @param enabled - If false, skips fetching credits (use when user is authenticated)
 */
export function useGuestCredits(enabled = true): UseGuestCreditsReturn {
  const {
    sessionId,
    email,
    isLoading: sessionLoading,
    setEmail: setSessionEmail,
  } = useGuestSession();

  const {
    guestBalance,
    guestLoading,
    guestError,
    isUsingCredit,
    fetchGuestCredits,
    useGuestCredit,
    setGuestSession,
  } = useCreditsStore(
    useShallow((state) => ({
      guestBalance: state.guestBalance,
      guestLoading: state.guestLoading,
      guestError: state.guestError,
      isUsingCredit: state.isUsingCredit,
      fetchGuestCredits: state.fetchGuestCredits,
      useGuestCredit: state.useGuestCredit,
      setGuestSession: state.setGuestSession,
    }))
  );

  // Sync session to store and fetch credits when session is ready
  // Skip if disabled (user is authenticated)
  useEffect(() => {
    if (!enabled) return;
    if (sessionId && !sessionLoading) {
      setGuestSession(sessionId, email);
      fetchGuestCredits(sessionId);
    }
  }, [sessionId, email, sessionLoading, setGuestSession, fetchGuestCredits, enabled]);

  // Wrapper for useCredit that includes sessionId
  // Note: useGuestCredit is a store action, not a React hook
  const useCredit = async (projectHash: string): Promise<UseCreditResult | null> => {
    if (!sessionId) {
      return null;
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useGuestCredit is a store action, not a hook
    return useGuestCredit(sessionId, projectHash);
  };

  // Wrapper for refetch
  const refetch = async () => {
    if (sessionId) {
      await fetchGuestCredits(sessionId);
    }
  };

  return {
    balance: guestBalance,
    sessionId,
    email,
    isLoading: guestLoading || sessionLoading,
    error: guestError,
    refetch,
    useCredit,
    setEmail: setSessionEmail,
    isUsingCredit,
  };
}

export type { GuestCreditBalance, UseCreditResult };
