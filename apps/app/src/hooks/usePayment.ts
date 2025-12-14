/**
 * Payment Hook
 *
 * Handles creating payments for credit purchases.
 */

import { useState, useCallback } from 'react';

interface CreatePaymentParams {
  packageType: 'single' | 'starter' | 'standard' | 'pro';
  provider: 'payu' | 'przelewy24';
  email: string;
  sessionId?: string; // For guest purchases
}

interface PaymentResult {
  success: boolean;
  redirectUrl?: string;
  paymentId?: string;
  error?: string;
}

interface UsePaymentReturn {
  createPayment: (params: CreatePaymentParams) => Promise<PaymentResult>;
  isCreating: boolean;
  error: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

/**
 * Hook for creating payments
 */
export function usePayment(): UsePaymentReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async (params: CreatePaymentParams): Promise<PaymentResult> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/payments/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageType: params.packageType,
          provider: params.provider,
          email: params.email,
          guestSessionId: params.sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Payment creation failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        redirectUrl: data.data.redirectUrl,
        paymentId: data.data.paymentId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createPayment,
    isCreating,
    error,
  };
}

export type { CreatePaymentParams, PaymentResult };
