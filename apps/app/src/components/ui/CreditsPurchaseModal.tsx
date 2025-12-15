/**
 * Credits Purchase Modal
 *
 * Modal for purchasing export credits.
 * Supports both authenticated users and guests.
 */

'use client';

import { useState } from 'react';
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
} from '@meble/ui';
import { Check, CreditCard, Loader2, Sparkles, Zap } from 'lucide-react';
import { usePayment } from '@/hooks/usePayment';
import {EXPORT_PACKAGES, ExportPackageId} from "@meble/config";

interface CreditsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  userEmail?: string;
  guestSessionId?: string | null;
  onSuccess?: () => void;
}

type PaymentProvider = 'payu' | 'przelewy24';

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

export function CreditsPurchaseModal({
  open,
  onOpenChange,
  isAuthenticated,
  userEmail,
  guestSessionId,
  onSuccess,
}: CreditsPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<ExportPackageId>('standard');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('przelewy24');
  const [email, setEmail] = useState(userEmail || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const { createPayment, isCreating, error: paymentError } = usePayment();

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

  const handlePurchase = async () => {
    if (!validateEmail(email)) return;

    const result = await createPayment({
      packageType: selectedPackage as 'single' | 'starter' | 'standard' | 'pro',
      provider: selectedProvider,
      email,
      sessionId: !isAuthenticated ? (guestSessionId ?? undefined) : undefined,
    });

    if (result.success && result.redirectUrl) {
      // Redirect to payment provider
      window.location.href = result.redirectUrl;
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
                    onClick={() => setSelectedPackage(packageId)}
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

          {/* Payment Provider Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Metoda płatności</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedProvider('przelewy24')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  selectedProvider === 'przelewy24'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Przelewy24</span>
                {selectedProvider === 'przelewy24' && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider('payu')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  selectedProvider === 'payu'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">PayU</span>
                {selectedProvider === 'payu' && <Check className="h-4 w-4 text-primary" />}
              </button>
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
          <Button onClick={handlePurchase} disabled={isCreating || !email}>
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
