/**
 * Post-Export Recommendations Component
 *
 * Shows product recommendations after successful export.
 * Used for upselling accessories based on project content.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@meble/ui';
import { ShoppingBag, X, ArrowRight } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

interface Product {
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
}

interface PostExportRecommendationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTags?: string[];
  onAddToCart?: (productId: string) => Promise<boolean>;
  onViewShop?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

export function PostExportRecommendations({
  open,
  onOpenChange,
  projectTags = [],
  onAddToCart,
  onViewShop,
}: PostExportRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRecommendations();
    }
  }, [open, projectTags]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectTags.length > 0) {
        params.set('tags', projectTags.join(','));
      }
      params.set('limit', '4');

      const response = await fetch(`${API_BASE}/shop/recommendations?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!onAddToCart) return false;
    setIsAddingToCart(true);
    const result = await onAddToCart(productId);
    setIsAddingToCart(false);
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <DialogTitle>Eksport zakończony!</DialogTitle>
          </div>
          <DialogDescription>
            Potrzebujesz akcesoriów do swojego projektu? Sprawdź nasze polecane produkty.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isAddingToCart={isAddingToCart}
                  locale="pl"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak rekomendacji dla tego projektu</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Zamknij
          </Button>

          {onViewShop && (
            <Button
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onViewShop();
              }}
            >
              Zobacz wszystkie produkty
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline recommendations banner (for embedding in pages)
 */
interface RecommendationsBannerProps {
  projectTags?: string[];
  onAddToCart?: (productId: string) => Promise<boolean>;
  maxProducts?: number;
}

export function RecommendationsBanner({
  projectTags = [],
  onAddToCart,
  maxProducts = 3,
}: RecommendationsBannerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [projectTags]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectTags.length > 0) {
        params.set('tags', projectTags.join(','));
      }
      params.set('limit', maxProducts.toString());

      const response = await fetch(`${API_BASE}/shop/recommendations?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!onAddToCart) return false;
    setIsAddingToCart(true);
    const result = await onAddToCart(productId);
    setIsAddingToCart(false);
    return result;
  };

  if (isLoading || products.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Polecane produkty</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            isAddingToCart={isAddingToCart}
            locale="pl"
          />
        ))}
      </div>
    </div>
  );
}
