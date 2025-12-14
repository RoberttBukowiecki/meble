/**
 * Product Grid Component
 *
 * Displays products in a responsive grid layout.
 */

'use client';

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

interface ProductGridProps {
  products: Product[];
  onAddToCart?: (productId: string) => Promise<boolean>;
  isAddingToCart?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  locale?: 'pl' | 'en';
  columns?: 2 | 3 | 4;
}

export function ProductGrid({
  products,
  onAddToCart,
  isAddingToCart,
  isLoading,
  emptyMessage = 'Brak produktów',
  locale = 'pl',
  columns = 3,
}: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          isAddingToCart={isAddingToCart}
          locale={locale}
        />
      ))}
    </div>
  );
}

/**
 * Featured Products Section
 */
interface FeaturedProductsProps {
  products: Product[];
  onAddToCart?: (productId: string) => Promise<boolean>;
  isAddingToCart?: boolean;
  title?: string;
  locale?: 'pl' | 'en';
}

export function FeaturedProducts({
  products,
  onAddToCart,
  isAddingToCart,
  title = 'Polecane produkty',
  locale = 'pl',
}: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ProductGrid
        products={products}
        onAddToCart={onAddToCart}
        isAddingToCart={isAddingToCart}
        locale={locale}
        columns={4}
      />
    </section>
  );
}
