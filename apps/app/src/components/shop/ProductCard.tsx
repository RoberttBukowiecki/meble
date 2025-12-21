/**
 * Product Card Component
 *
 * Displays a single product in a grid or list view.
 */

'use client';

import { useState } from 'react';
import { Button, Badge } from '@meble/ui';
import { ShoppingCart, ExternalLink, Check, Loader2 } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    namePl: string;
    description?: string;
    descriptionPl?: string;
    category: string;
    price: number;
    compareAtPrice?: number | null;
    currency: string;
    images: string[];
    thumbnailUrl?: string;
    isFeatured: boolean;
    inStock: boolean;
    externalUrl?: string;
    isAffiliate?: boolean;
  };
  onAddToCart?: (productId: string) => Promise<boolean>;
  isAddingToCart?: boolean;
  locale?: 'pl' | 'en';
}

export function ProductCard({
  product,
  onAddToCart,
  isAddingToCart,
  locale = 'pl',
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const name = locale === 'pl' ? product.namePl : product.name;
  const description = locale === 'pl' ? product.descriptionPl : product.description;
  const imageUrl = product.thumbnailUrl || product.images?.[0] || 'https://placehold.co/400x300?text=No+Image';

  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} zł`;
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const handleAddToCart = async () => {
    if (!onAddToCart || isAdding || !product.inStock) return;

    setIsAdding(true);
    const success = await onAddToCart(product.id);

    if (success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }

    setIsAdding(false);
  };

  const handleExternalClick = () => {
    if (product.externalUrl) {
      window.open(product.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group relative flex flex-col rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.isFeatured && (
            <Badge variant="default" className="text-xs">
              Polecany
            </Badge>
          )}
          {discount && (
            <Badge variant="destructive" className="text-xs">
              -{discount}%
            </Badge>
          )}
          {!product.inStock && (
            <Badge variant="secondary" className="text-xs">
              Niedostępny
            </Badge>
          )}
        </div>

        {/* Affiliate badge */}
        {product.isAffiliate && (
          <div className="absolute top-2 right-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category */}
        <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {product.category}
        </span>

        {/* Name */}
        <h3 className="font-medium line-clamp-2 mb-1">{name}</h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Price and Action */}
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through ml-2">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {product.isAffiliate ? (
            <Button size="sm" variant="outline" onClick={handleExternalClick}>
              <ExternalLink className="h-4 w-4" />
              Zobacz
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!product.inStock || isAdding || isAddingToCart}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : added ? (
                <>
                  <Check className="h-4 w-4" />
                  Dodano
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Dodaj
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Product Card Skeleton for loading state
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-muted animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
          <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
