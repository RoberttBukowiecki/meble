/**
 * Payment Success Page
 *
 * Displayed after successful payment completion.
 * Fetches actual payment details from the payments API.
 */

'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@meble/ui';
import { CheckCircle, ArrowLeft, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { track, AnalyticsEvent } from '@meble/analytics';

const PAYMENTS_API = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || 'http://localhost:3002/api';

interface PaymentData {
  status: string;
  amount: number;
  currency: string;
  metadata?: {
    credits?: number;
    packageId?: string;
  };
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [isLoading, setIsLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedPayment = useRef(false);

  useEffect(() => {
    async function fetchPaymentStatus() {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${PAYMENTS_API}/payments/${orderId}/status`);
        const data = await response.json();

        if (data.success && data.data) {
          setPayment(data.data);

          // Track successful payment (only once, and only if not pending)
          if (!hasTrackedPayment.current && data.data.status !== 'pending') {
            hasTrackedPayment.current = true;
            track(AnalyticsEvent.PAYMENT_COMPLETED, {
              package_id: data.data.metadata?.packageId || 'unknown',
              amount: data.data.amount || 0,
              provider: 'payu',
              transaction_id: orderId,
            });
          }
        } else {
          setError('Nie udało się pobrać szczegółów płatności');
        }
      } catch (err) {
        console.error('Failed to fetch payment status:', err);
        setError('Błąd połączenia z serwerem');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaymentStatus();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h1 className="text-xl font-semibold">Weryfikacja płatności...</h1>
          <p className="text-muted-foreground">Proszę czekać</p>
        </div>
      </div>
    );
  }

  const credits = payment?.metadata?.credits;
  const isPending = payment?.status === 'pending';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success/Pending Icon */}
        <div className="flex justify-center">
          <div className={`rounded-full p-4 ${isPending ? 'bg-yellow-100' : 'bg-green-100'}`}>
            {isPending ? (
              <Loader2 className="h-16 w-16 text-yellow-600 animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-600" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {isPending ? 'Płatność w trakcie...' : 'Płatność zakończona!'}
          </h1>
          <p className="text-muted-foreground">
            {isPending
              ? 'Oczekujemy na potwierdzenie płatności. Kredyty zostaną dodane automatycznie.'
              : 'Dziękujemy za zakup. Twoje kredyty zostały dodane do konta.'
            }
          </p>
        </div>

        {/* Credits Info */}
        {credits !== undefined && credits !== null && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {credits === -1 ? (
                'Nielimitowane eksporty (30 dni)'
              ) : (
                `+${credits} kredyt${credits === 1 ? '' : credits < 5 ? 'y' : 'ów'}`
              )}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-yellow-50 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Order ID */}
        {orderId && (
          <p className="text-sm text-muted-foreground">
            Numer zamówienia: <code className="bg-muted px-1.5 py-0.5 rounded">{orderId}</code>
          </p>
        )}

        {/* Smart Export Info */}
        <div className="p-4 rounded-lg border bg-card text-left">
          <h3 className="font-medium mb-2">Smart Export</h3>
          <p className="text-sm text-muted-foreground">
            Pamiętaj! Po eksporcie projektu masz 24h na darmowe re-eksporty
            tego samego projektu. Możesz wprowadzać poprawki bez dodatkowych kosztów.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Wróć do edytora
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
