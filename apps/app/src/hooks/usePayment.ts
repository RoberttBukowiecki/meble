/**
 * Payment Hook
 *
 * Handles creating payments for credit purchases.
 * Connects to the payments app API.
 */

import { useState, useCallback } from 'react';

interface CreatePaymentParams {
  packageType: 'single' | 'starter' | 'standard' | 'pro';
  provider: 'payu';
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

// Payments API URL - should point to payments app
const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || 'http://localhost:3002/api';

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
      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add session ID header for guest purchases
      if (params.sessionId) {
        headers['x-session-id'] = params.sessionId;
      }

      // Build return URL based on current location
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/payment/success`
        : 'http://localhost:3000/payment/success';

      const response = await fetch(`${API_BASE}/payments/create`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          type: 'credit_purchase',
          provider: params.provider,
          packageId: params.packageType,
          email: params.email,
          returnUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Blad tworzenia platnosci';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        redirectUrl: data.data.redirectUrl,
        paymentId: data.data.paymentId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany blad';
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
