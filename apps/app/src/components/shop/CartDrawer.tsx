/**
 * Cart Drawer Component
 *
 * Slide-out drawer showing shopping cart contents.
 */

'use client';

import { Button, Drawer, Badge } from '@meble/ui';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import type { CartItem } from '@/hooks/useCart';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading?: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  onRemoveItem: (itemId: string) => Promise<boolean>;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  onOpenChange,
  items,
  itemCount,
  subtotal,
  isLoading,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} zł`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-semibold text-lg">Koszyk</h2>
            {itemCount > 0 && (
              <Badge variant="secondary">{itemCount}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Koszyk jest pusty</p>
              <Button
                variant="link"
                onClick={() => onOpenChange(false)}
                className="mt-2"
              >
                Kontynuuj zakupy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium">Suma częściowa</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>

            {/* Shipping note */}
            <p className="text-sm text-muted-foreground">
              Koszty wysyłki zostaną obliczone przy kasie
            </p>

            {/* Checkout button */}
            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
            >
              Przejdź do kasy
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/**
 * Individual cart item row
 */
interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  onRemove: (itemId: string) => Promise<boolean>;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} zł`;
  };

  const imageUrl = item.product?.image || 'https://placehold.co/80x80?text=No+Image';
  const productName = item.product?.namePl || item.product?.name || 'Produkt';

  return (
    <div className="flex gap-3 pb-4 border-b last:border-b-0">
      {/* Image */}
      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2">{productName}</h3>

        {item.variant && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.variant.name}
          </p>
        )}

        <p className="text-sm font-medium mt-1">
          {formatPrice(item.unitPrice)}
        </p>

        {/* Quantity controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (item.quantity > 1) {
                  onUpdateQuantity(item.id, item.quantity - 1);
                } else {
                  onRemove(item.id);
                }
              }}
            >
              {item.quantity === 1 ? (
                <Trash2 className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
            </Button>

            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={!item.product?.inStock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <span className="text-sm font-semibold">
            {formatPrice(item.totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart button for header/nav
 */
interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
}

export function CartButton({ itemCount, onClick }: CartButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Button>
  );
}
