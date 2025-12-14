/**
 * Guest Credits Hook
 *
 * Manages credit balance and usage for guest (non-authenticated) users.
 * Uses session ID from localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGuestSession } from './useGuestSession';

interface GuestCreditBalance {
  availableCredits: number;
  expiresAt: string | null;
}

interface UseGuestCreditResult {
  creditUsed: boolean;
  sessionId: string;
  creditsRemaining: number;
  message: string;
  isFreeReexport: boolean;
}

interface UseGuestCreditsReturn {
  balance: GuestCreditBalance | null;
  sessionId: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  useCredit: (projectHash: string) => Promise<UseGuestCreditResult | null>;
  setEmail: (email: string) => void;
  isUsingCredit: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

/**
 * Hook for managing guest credits
 */
export function useGuestCredits(): UseGuestCreditsReturn {
  const { sessionId, email, setEmail, isLoading: sessionLoading } = useGuestSession();
  const [balance, setBalance] = useState<GuestCreditBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCredit, setIsUsingCredit] = useState(false);

  // Fetch guest credit balance
  const fetchBalance = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/guest/credits?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // No credits is not an error for guests
        if (data.error?.code === 'NO_CREDITS') {
          setBalance({ availableCredits: 0, expiresAt: null });
          return;
        }
        throw new Error(data.error?.message || 'Failed to fetch credits');
      }

      setBalance(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      // Set default balance on error
      setBalance({ availableCredits: 0, expiresAt: null });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Fetch balance when session is available
  useEffect(() => {
    if (sessionId && !sessionLoading) {
      fetchBalance();
    }
  }, [sessionId, sessionLoading, fetchBalance]);

  // Use guest credit for export
  const useCredit = useCallback(async (projectHash: string): Promise<UseGuestCreditResult | null> => {
    if (!sessionId) {
      setError('Session not available');
      return null;
    }

    setIsUsingCredit(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/guest/credits/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          projectHash,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to use credit';
        setError(errorMessage);
        return null;
      }

      // Update local balance
      if (!data.data.isFreeReexport) {
        setBalance((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            availableCredits: Math.max(0, prev.availableCredits - 1),
          };
        });
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsUsingCredit(false);
    }
  }, [sessionId]);

  return {
    balance,
    sessionId,
    email,
    isLoading: isLoading || sessionLoading,
    error,
    refetch: fetchBalance,
    useCredit,
    setEmail,
    isUsingCredit,
  };
}

export type { GuestCreditBalance, UseGuestCreditResult };
