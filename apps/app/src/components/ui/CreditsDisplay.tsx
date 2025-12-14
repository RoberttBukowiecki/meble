/**
 * Credits Display Component
 *
 * Displays user's credit balance with option to purchase more.
 */

'use client';

import { useState } from 'react';
import { Button, Badge, Tooltip, TooltipContent, TooltipTrigger } from '@meble/ui';
import { CreditCard, Plus, Sparkles, RefreshCw, Clock } from 'lucide-react';
import { CreditsPurchaseModal } from './CreditsPurchaseModal';
import type { CreditBalance } from '@/hooks/useCredits';
import type { GuestCreditBalance } from '@/hooks/useGuestCredits';

interface CreditsDisplayProps {
  balance: CreditBalance | GuestCreditBalance | null;
  isAuthenticated: boolean;
  userEmail?: string;
  guestSessionId?: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

function isUserBalance(balance: CreditBalance | GuestCreditBalance): balance is CreditBalance {
  return 'hasUnlimited' in balance;
}

export function CreditsDisplay({
  balance,
  isAuthenticated,
  userEmail,
  guestSessionId,
  isLoading,
  onRefresh,
  compact = false,
}: CreditsDisplayProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const availableCredits = balance?.availableCredits ?? 0;
  const hasUnlimited = balance && isUserBalance(balance) ? balance.hasUnlimited : false;
  const unlimitedExpiresAt = balance && isUserBalance(balance) ? balance.unlimitedExpiresAt : null;
  const guestExpiresAt = balance && !isUserBalance(balance) ? balance.expiresAt : null;

  const formatExpiryDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (compact) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPurchaseModal(true)}
            >
              {hasUnlimited ? (
                <Sparkles className="h-4 w-4 text-amber-500" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <span className="font-medium">
                {hasUnlimited ? 'Pro' : availableCredits}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasUnlimited ? (
              <>
                Nielimitowane eksporty
                {unlimitedExpiresAt && (
                  <span className="block text-xs text-muted-foreground">
                    Ważne do: {formatExpiryDate(unlimitedExpiresAt)}
                  </span>
                )}
              </>
            ) : (
              <>
                {availableCredits} kredyt{availableCredits === 1 ? '' : availableCredits < 5 ? 'y' : 'ów'} dostępnych
                <span className="block text-xs text-muted-foreground">
                  Kliknij, aby kupić więcej
                </span>
              </>
            )}
          </TooltipContent>
        </Tooltip>

        <CreditsPurchaseModal
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          guestSessionId={guestSessionId}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {hasUnlimited ? (
              <>
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="font-semibold">Pro (Unlimited)</span>
                <Badge variant="secondary" className="text-xs">
                  Aktywny
                </Badge>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {availableCredits} kredyt{availableCredits === 1 ? '' : availableCredits < 5 ? 'y' : 'ów'}
                </span>
              </>
            )}

            {isLoading && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Expiry info */}
          {(unlimitedExpiresAt || guestExpiresAt) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Ważne do: {formatExpiryDate(unlimitedExpiresAt || guestExpiresAt)}
              </span>
            </div>
          )}

          {/* Guest info */}
          {!isAuthenticated && availableCredits > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Zaloguj się, aby zachować kredyty na stałe
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPurchaseModal(true)}
          >
            <Plus className="h-4 w-4" />
            {availableCredits === 0 && !hasUnlimited ? 'Kup kredyty' : 'Dokup'}
          </Button>
        </div>
      </div>

      <CreditsPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        guestSessionId={guestSessionId}
      />
    </>
  );
}

/**
 * Inline credits badge for use in headers/nav
 */
export function CreditsBadge({
  availableCredits,
  hasUnlimited,
  onClick,
}: {
  availableCredits: number;
  hasUnlimited?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
    >
      {hasUnlimited ? (
        <>
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-medium">Pro</span>
        </>
      ) : (
        <>
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{availableCredits}</span>
        </>
      )}
    </button>
  );
}
