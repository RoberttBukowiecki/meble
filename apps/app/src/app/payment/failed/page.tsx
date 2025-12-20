/**
 * Payment Failed Page
 *
 * Displayed when payment fails or is cancelled.
 */

'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@meble/ui';
import { COMPANY_INFO } from '@meble/constants';
import { XCircle, ArrowLeft, RefreshCw, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { track, AnalyticsEvent } from '@meble/analytics';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');
  const hasTrackedFailure = useRef(false);

  const getErrorMessage = (errorCode: string | null): string => {
    switch (errorCode) {
      case 'cancelled':
        return 'Płatność została anulowana przez użytkownika.';
      case 'timeout':
        return 'Upłynął czas na dokonanie płatności.';
      case 'insufficient_funds':
        return 'Niewystarczające środki na koncie.';
      case 'card_declined':
        return 'Karta została odrzucona.';
      default:
        return 'Wystąpił problem z przetworzeniem płatności.';
    }
  };

  // Track payment failure
  useEffect(() => {
    if (!hasTrackedFailure.current) {
      hasTrackedFailure.current = true;
      track(AnalyticsEvent.PAYMENT_FAILED, {
        package_id: 'unknown', // Not available on failed page
        amount: 0,
        provider: 'payu',
        error_code: error || 'unknown',
        error_message: getErrorMessage(error),
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Płatność nieudana</h1>
          <p className="text-muted-foreground">{getErrorMessage(error)}</p>
        </div>

        {/* Order ID */}
        {orderId && (
          <p className="text-sm text-muted-foreground">
            Numer zamówienia: <code className="bg-muted px-1.5 py-0.5 rounded">{orderId}</code>
          </p>
        )}

        {/* Help Info */}
        <div className="p-4 rounded-lg border bg-card text-left space-y-3">
          <h3 className="font-medium">Co możesz zrobić?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Spróbuj ponownie z inną metodą płatności</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Jeśli problem się powtarza, skontaktuj się z nami:{' '}
                <a href={`mailto:${COMPANY_INFO.email}`} className="text-primary hover:underline">
                  {COMPANY_INFO.email}
                </a>
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild variant="default">
            <Link href="/">
              <RefreshCw className="h-4 w-4" />
              Spróbuj ponownie
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Wróć do edytora
            </Link>
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground">
          Twoje dane płatności nie są przechowywane przez naszą aplikację.
          Wszystkie płatności są przetwarzane bezpiecznie przez{' '}
          <a href="https://przelewy24.pl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Przelewy24
          </a>
          {' '}lub{' '}
          <a href="https://payu.pl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            PayU
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
