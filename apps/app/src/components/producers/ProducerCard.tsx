/**
 * Producer Card Component
 *
 * Displays a producer in a grid or list view.
 */

'use client';

import { Button, Badge } from '@meble/ui';
import { Star, MapPin, CheckCircle, Scissors, Square, Circle, Truck, ArrowRight } from 'lucide-react';

interface ProducerCardProps {
  producer: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    address?: {
      city?: string;
      postal_code?: string;
    };
    services: string[];
    baseCuttingPrice?: number;
    baseEdgingPrice?: number;
    minimumOrderValue?: number;
    deliveryBaseCost?: number;
    freeDeliveryThreshold?: number;
    isVerified: boolean;
    rating?: number | null;
    totalOrders?: number;
  };
  onSelect?: (producerId: string) => void;
  selected?: boolean;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  cutting: <Scissors className="h-3.5 w-3.5" />,
  edging: <Square className="h-3.5 w-3.5" />,
  drilling: <Circle className="h-3.5 w-3.5" />,
  cnc: <span className="text-xs font-bold">CNC</span>,
  delivery: <Truck className="h-3.5 w-3.5" />,
};

const SERVICE_LABELS: Record<string, string> = {
  cutting: 'Cięcie',
  edging: 'Okleinowanie',
  drilling: 'Wiercenie',
  cnc: 'CNC',
  delivery: 'Dostawa',
};

export function ProducerCard({ producer, onSelect, selected }: ProducerCardProps) {
  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} zł`;
  };

  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all ${
        selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'hover:border-primary/50 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {producer.logoUrl ? (
              <img
                src={producer.logoUrl}
                alt={producer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {producer.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{producer.name}</h3>
              {producer.isVerified && (
                <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </div>

            {producer.address?.city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{producer.address.city}</span>
              </div>
            )}

            {producer.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{producer.rating.toFixed(2)}</span>
                {producer.totalOrders && producer.totalOrders > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({producer.totalOrders} zamówień)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="p-4 flex-1">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {producer.services.map((service) => (
            <Badge key={service} variant="secondary" className="gap-1 text-xs">
              {SERVICE_ICONS[service]}
              {SERVICE_LABELS[service] || service}
            </Badge>
          ))}
        </div>

        {producer.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {producer.description}
          </p>
        )}

        {/* Pricing */}
        <div className="space-y-1 text-sm">
          {producer.baseCuttingPrice && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cięcie:</span>
              <span className="font-medium">{formatPrice(producer.baseCuttingPrice)}/mb</span>
            </div>
          )}
          {producer.baseEdgingPrice && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Okleinowanie:</span>
              <span className="font-medium">{formatPrice(producer.baseEdgingPrice)}/mb</span>
            </div>
          )}
          {producer.minimumOrderValue && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min. zamówienie:</span>
              <span className="font-medium">{formatPrice(producer.minimumOrderValue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <Button
          className="w-full"
          variant={selected ? 'default' : 'outline'}
          onClick={() => onSelect?.(producer.id)}
        >
          {selected ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Wybrany
            </>
          ) : (
            <>
              Wybierz producenta
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Producer Card Skeleton
 */
export function ProducerCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-1.5">
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="space-y-1">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
