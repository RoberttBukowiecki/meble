/**
 * Credits Hook
 *
 * Hook for authenticated user credits management.
 * Uses the shared Zustand credits store for state.
 */

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useCreditsStore,
  type CreditBalance,
  type CreditPackage,
  type UseCreditResult,
} from '@/lib/store/creditsStore';

interface UseCreditsReturn {
  balance: CreditBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  useCredit: (projectHash: string) => Promise<UseCreditResult | null>;
  isUsingCredit: boolean;
}

/**
 * Hook for managing authenticated user credits
 */
export function useCredits(isAuthenticated: boolean): UseCreditsReturn {
  const {
    userBalance,
    userLoading,
    userError,
    isUsingCredit,
    fetchUserCredits,
    useUserCredit,
  } = useCreditsStore(
    useShallow((state) => ({
      userBalance: state.userBalance,
      userLoading: state.userLoading,
      userError: state.userError,
      isUsingCredit: state.isUsingCredit,
      fetchUserCredits: state.fetchUserCredits,
      useUserCredit: state.useUserCredit,
    }))
  );

  // Fetch credits on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCredits();
    }
  }, [isAuthenticated, fetchUserCredits]);

  return {
    balance: userBalance,
    isLoading: userLoading,
    error: userError,
    refetch: fetchUserCredits,
    useCredit: useUserCredit,
    isUsingCredit,
  };
}

export type { CreditBalance, CreditPackage, UseCreditResult };
