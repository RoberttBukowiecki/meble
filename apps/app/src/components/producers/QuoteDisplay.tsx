/**
 * Quote Display Component
 *
 * Shows a quote from a producer with pricing breakdown.
 */

'use client';

import { Button, Badge } from '@meble/ui';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Scissors,
  Square,
  Truck,
  Package,
  ArrowRight,
} from 'lucide-react';

interface QuoteDisplayProps {
  quote: {
    quoteId: string;
    quoteNumber: string;
    producer: {
      id: string;
      name: string;
    };
    services: string[];
    breakdown: {
      cuttingCost: number;
      edgingCost: number;
      drillingCost: number;
      subtotal: number;
      deliveryCost: number;
      total: number;
    };
    estimatedDays: number;
    validUntil: string;
    partsCount: number;
    totalParts: number;
  };
  onAccept?: () => void;
  onReject?: () => void;
  isAccepting?: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  cutting: 'Cięcie',
  edging: 'Okleinowanie',
  drilling: 'Wiercenie',
  cnc: 'Obróbka CNC',
  delivery: 'Dostawa',
};

export function QuoteDisplay({ quote, onAccept, onReject, isAccepting }: QuoteDisplayProps) {
  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} zł`;
  };

  const validUntilDate = new Date(quote.validUntil);
  const isExpired = validUntilDate < new Date();
  const hoursRemaining = Math.max(
    0,
    Math.floor((validUntilDate.getTime() - Date.now()) / (1000 * 60 * 60))
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{quote.producer.name}</h3>
            <p className="text-sm text-muted-foreground">
              Wycena #{quote.quoteNumber}
            </p>
          </div>
          <div className="text-right">
            {isExpired ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Wygasła
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {hoursRemaining}h do wygaśnięcia
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium mb-2">Usługi</h4>
        <div className="flex flex-wrap gap-2">
          {quote.services.map((service) => (
            <Badge key={service} variant="outline">
              {SERVICE_LABELS[service] || service}
            </Badge>
          ))}
        </div>
      </div>

      {/* Project Summary */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium mb-2">Projekt</h4>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{quote.partsCount} rodzajów części</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{quote.totalParts}</span>
            <span className="text-muted-foreground">sztuk łącznie</span>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium mb-3">Kalkulacja</h4>
        <div className="space-y-2 text-sm">
          {quote.breakdown.cuttingCost > 0 && (
            <div className="flex justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Scissors className="h-4 w-4" />
                Cięcie
              </span>
              <span>{formatPrice(quote.breakdown.cuttingCost)}</span>
            </div>
          )}

          {quote.breakdown.edgingCost > 0 && (
            <div className="flex justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Square className="h-4 w-4" />
                Okleinowanie
              </span>
              <span>{formatPrice(quote.breakdown.edgingCost)}</span>
            </div>
          )}

          {quote.breakdown.drillingCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wiercenie</span>
              <span>{formatPrice(quote.breakdown.drillingCost)}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between">
            <span className="text-muted-foreground">Suma częściowa</span>
            <span className="font-medium">{formatPrice(quote.breakdown.subtotal)}</span>
          </div>

          {quote.breakdown.deliveryCost > 0 && (
            <div className="flex justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                Dostawa
              </span>
              <span>{formatPrice(quote.breakdown.deliveryCost)}</span>
            </div>
          )}

          {quote.breakdown.deliveryCost === 0 && quote.services.includes('delivery') && (
            <div className="flex justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                Dostawa
              </span>
              <span className="text-green-600 font-medium">GRATIS</span>
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex justify-between items-center">
          <span className="font-medium">Razem do zapłaty</span>
          <span className="text-2xl font-bold">{formatPrice(quote.breakdown.total)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Szacowany czas realizacji: {quote.estimatedDays} dni roboczych
        </p>
      </div>

      {/* Actions */}
      {!isExpired && (onAccept || onReject) && (
        <div className="p-4 flex gap-3">
          {onReject && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onReject}
              disabled={isAccepting}
            >
              Odrzuć
            </Button>
          )}
          {onAccept && (
            <Button
              className="flex-1"
              onClick={onAccept}
              disabled={isAccepting}
            >
              {isAccepting ? (
                'Przetwarzanie...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Akceptuj i zamów
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Quote Request Form
 */
interface QuoteRequestProps {
  onRequestQuote: (services: string[]) => void;
  availableServices: string[];
  isLoading?: boolean;
  partsCount: number;
}

export function QuoteRequestForm({
  onRequestQuote,
  availableServices,
  isLoading,
  partsCount,
}: QuoteRequestProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(['cutting', 'edging']);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h4 className="font-medium mb-2">Wybierz usługi</h4>
        <div className="flex flex-wrap gap-2">
          {availableServices.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedServices.includes(service)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {SERVICE_LABELS[service] || service}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Projekt zawiera {partsCount} części
      </div>

      <Button
        className="w-full"
        onClick={() => onRequestQuote(selectedServices)}
        disabled={isLoading || selectedServices.length === 0}
      >
        {isLoading ? (
          'Pobieranie wyceny...'
        ) : (
          <>
            Poproś o wycenę
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}

// Need to import useState for QuoteRequestForm
import { useState } from 'react';
