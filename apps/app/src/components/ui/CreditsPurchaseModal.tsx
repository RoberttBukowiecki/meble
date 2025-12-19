/**
 * Credits Purchase Modal
 *
 * Modal for purchasing export credits.
 * Supports both authenticated users and guests.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Checkbox,
  PayULogo,
} from '@meble/ui';
import { track, AnalyticsEvent } from '@meble/analytics';
import { Check, ChevronDown, CreditCard, Loader2, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePayment } from '@/hooks/usePayment';
import { EXPORT_PACKAGES, ExportPackageId } from "@meble/config";

interface CreditsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  userEmail?: string;
  guestSessionId?: string | null;
  onSuccess?: () => void;
}

type PaymentProvider = 'payu';

const PACKAGES_ORDER: ExportPackageId[] = ['single', 'starter', 'standard', 'pro'];

// Filter packages based on auth status
function getAvailablePackages(isAuthenticated: boolean) {
  return PACKAGES_ORDER.filter((id) => {
    const pkg = EXPORT_PACKAGES[id];
    if (!pkg) return false;
    // Single is guest-only unless we want to allow it for auth users too
    if (pkg.guestOnly && isAuthenticated) return false;
    return true;
  });
}

const GUEST_EMAIL_KEY = 'e-meble-guest-email';
export const EXPORT_DIALOG_PENDING_KEY = 'e-meble-export-dialog-pending';

export function CreditsPurchaseModal({
  open,
  onOpenChange,
  isAuthenticated,
  userEmail,
  guestSessionId,
  onSuccess,
}: CreditsPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<ExportPackageId>('standard');
  const [selectedProvider] = useState<PaymentProvider>('payu');
  const [email, setEmail] = useState(userEmail || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPayuInfo, setShowPayuInfo] = useState(false);

  const { createPayment, isCreating, error: paymentError } = usePayment();

  // Load saved guest email on mount
  useEffect(() => {
    if (!isAuthenticated && !userEmail) {
      const savedEmail = localStorage.getItem(GUEST_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isAuthenticated, userEmail]);

  const availablePackages = getAvailablePackages(isAuthenticated);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email jest wymagany');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Nieprawidłowy format email');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handlePackageSelect = (packageId: ExportPackageId) => {
    setSelectedPackage(packageId);
    const pkg = EXPORT_PACKAGES[packageId];
    if (pkg) {
      track(AnalyticsEvent.PACKAGE_SELECTED, {
        package_id: packageId,
        package_name: pkg.namePl,
        price: pkg.price / 100, // Convert from grosze to zł
        credits: pkg.credits,
      });
    }
  };

  const handlePurchase = async () => {
    if (!validateEmail(email)) return;

    const pkg = EXPORT_PACKAGES[selectedPackage];

    // Track purchase started
    track(AnalyticsEvent.PURCHASE_STARTED, {
      package_id: selectedPackage,
      amount: (pkg?.price ?? 0) / 100,
      provider: selectedProvider,
      currency: 'PLN',
    });

    const result = await createPayment({
      packageType: selectedPackage as 'single' | 'starter' | 'standard' | 'pro',
      provider: selectedProvider,
      email,
      sessionId: !isAuthenticated ? (guestSessionId ?? undefined) : undefined,
    });

    if (result.success && result.redirectUrl) {
      // Save guest email for future use
      if (!isAuthenticated && email) {
        localStorage.setItem(GUEST_EMAIL_KEY, email);
      }
      // Save flag to reopen export dialog after returning from payment
      localStorage.setItem(EXPORT_DIALOG_PENDING_KEY, 'true');
      // Redirect to payment provider
      window.location.href = result.redirectUrl;
    } else {
      // Track payment failure (client-side redirect issue)
      track(AnalyticsEvent.PAYMENT_FAILED, {
        package_id: selectedPackage,
        amount: (pkg?.price ?? 0) / 100,
        provider: selectedProvider,
        error_message: 'redirect_failed',
      });
    }
  };

  const formatPrice = (priceGrosze: number): string => {
    return `${(priceGrosze / 100).toFixed(0)} zł`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Kup kredyty eksportu
          </DialogTitle>
          <DialogDescription>
            Wybierz pakiet kredytów i metodę płatności. Smart Export pozwala na darmowe
            re-eksporty tego samego projektu przez 24h.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Wybierz pakiet</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePackages.map((packageId) => {
                const pkg = EXPORT_PACKAGES[packageId];
                if (!pkg) return null;
                const isSelected = selectedPackage === packageId;
                const isUnlimited = pkg.credits === -1;

                return (
                  <button
                    key={packageId}
                    type="button"
                    onClick={() => handlePackageSelect(packageId)}
                    className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 left-3 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                        Popularny
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      {isUnlimited ? (
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Zap className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-semibold">{pkg.namePl}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {pkg.descriptionPl}
                    </p>

                    <div className="flex items-baseline gap-2 mt-auto">
                      <span className="text-2xl font-bold">{formatPrice(pkg.price)}</span>
                      {pkg.savings && (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                          -{pkg.savings}
                        </span>
                      )}
                    </div>

                    {pkg.features && (
                      <ul className="mt-2 space-y-1">
                        {pkg.features.slice(0, 2).map((feature, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Input (for guests or if not provided) */}
          {(!isAuthenticated || !userEmail) && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.pl"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground">
                  Email używany do potwierdzenia płatności i odzyskania kredytów.
                </p>
              )}
            </div>
          )}

          {/* Payment Provider Info */}
          <div className="space-y-4">
            {/* PayU Logo and info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <PayULogo size="sm" />
                <span className="text-sm text-muted-foreground">
                  Bezpieczna płatność
                </span>
              </div>
            </div>

            {/* Terms acceptance */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                Akceptuję{' '}
                <Link href="/regulamin" className="text-primary hover:underline" target="_blank">
                  regulamin serwisu
                </Link>
                {' '}oraz{' '}
                <a
                  href="https://static.payu.com/sites/terms/files/payu_terms_of_service_single_transaction_pl_pl.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  regulamin płatności PayU
                </a>
              </label>
            </div>

            {/* PayU RODO Info - Collapsible */}
            <div className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowPayuInfo(!showPayuInfo)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showPayuInfo ? 'rotate-180' : ''}`} />
                Informacja o przetwarzaniu danych
              </button>
              {showPayuInfo && (
                <div className="mt-2 p-3 rounded bg-muted/30 space-y-2">
                  <p>
                    Administratorem danych w zakresie płatności jest PayU S.A. z siedzibą
                    w Poznaniu (60-166), ul. Grunwaldzka 186.
                  </p>
                  <p>
                    Dane przetwarzane są w celu realizacji transakcji płatniczej.
                    Podanie danych jest dobrowolne, lecz niezbędne do realizacji płatności.
                  </p>
                  <a
                    href="https://poland.payu.com/privacy-portal/privacy-principles/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-block"
                  >
                    Polityka prywatności PayU
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {paymentError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {paymentError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Anuluj
          </Button>
          <Button onClick={handlePurchase} disabled={isCreating || !email || !termsAccepted}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Przetwarzanie...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Zapłać {formatPrice(EXPORT_PACKAGES[selectedPackage]?.price || 0)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
