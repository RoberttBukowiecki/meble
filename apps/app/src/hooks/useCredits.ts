/**
 * Credits Hook
 *
 * Manages credit balance and usage for authenticated users.
 * Integrates with the payments API.
 */

import { useState, useEffect, useCallback } from 'react';

interface CreditPackage {
  id: string;
  type: 'single' | 'starter' | 'standard' | 'pro' | 'migrated_guest' | 'bonus';
  total: number;
  used: number;
  remaining: number;
  validUntil: string | null;
  purchasedAt: string;
}

interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  hasUnlimited: boolean;
  unlimitedExpiresAt: string | null;
  packages: CreditPackage[];
}

interface UseCreditResult {
  creditUsed: boolean;
  sessionId: string;
  creditsRemaining: number;
  message: string;
  isFreeReexport: boolean;
}

interface UseCreditsReturn {
  balance: CreditBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  useCredit: (projectHash: string) => Promise<UseCreditResult | null>;
  isUsingCredit: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

/**
 * Hook for managing authenticated user credits
 */
export function useCredits(isAuthenticated: boolean): UseCreditsReturn {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCredit, setIsUsingCredit] = useState(false);

  // Fetch credit balance
  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

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

      setBalance(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch balance on mount and when auth changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Use credit for export
  const useCredit = useCallback(async (projectHash: string): Promise<UseCreditResult | null> => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return null;
    }

    setIsUsingCredit(true);
    setError(null);

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
        setError(errorMessage);
        return null;
      }

      // Update local balance
      if (balance && !data.data.isFreeReexport) {
        setBalance((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            usedCredits: prev.usedCredits + 1,
            availableCredits: Math.max(0, prev.availableCredits - 1),
          };
        });
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to use credit:', err);
      return null;
    } finally {
      setIsUsingCredit(false);
    }
  }, [isAuthenticated, balance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
    useCredit,
    isUsingCredit,
  };
}

export type { CreditBalance, CreditPackage, UseCreditResult };
