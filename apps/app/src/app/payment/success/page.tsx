/**
 * Payment Success Page
 *
 * Displayed after successful payment completion.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@meble/ui';
import { CheckCircle, ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [isVerifying, setIsVerifying] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    // Simulate verification delay and credit fetch
    const timer = setTimeout(() => {
      setIsVerifying(false);
      // Credits would be fetched from API in real implementation
      setCredits(5); // Placeholder
    }, 1500);

    return () => clearTimeout(timer);
  }, [orderId]);

  if (isVerifying) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Płatność zakończona!</h1>
          <p className="text-muted-foreground">
            Dziękujemy za zakup. Twoje kredyty zostały dodane do konta.
          </p>
        </div>

        {/* Credits Info */}
        {credits !== null && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              +{credits} kredyt{credits === 1 ? '' : credits < 5 ? 'y' : 'ów'}
            </span>
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
