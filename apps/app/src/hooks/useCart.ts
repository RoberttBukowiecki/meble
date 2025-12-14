/**
 * Shopping Cart Hook
 *
 * Manages cart state and operations for both authenticated and guest users.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGuestSession } from './useGuestSession';

interface CartProduct {
  id: string;
  slug: string;
  name: string;
  namePl: string;
  price: number;
  image?: string;
  inStock: boolean;
}

interface CartVariant {
  id: string;
  name: string;
  price: number | null;
  attributes: Record<string, string>;
}

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: CartProduct | null;
  variant: CartVariant | null;
}

interface CartData {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

interface UseCartReturn {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  error: string | null;
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refetch: () => Promise<void>;
  isAddingItem: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

/**
 * Hook for managing shopping cart
 */
export function useCart(isAuthenticated: boolean): UseCartReturn {
  const { sessionId } = useGuestSession();
  const [cart, setCart] = useState<CartData>({ items: [], itemCount: 0, subtotal: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (!isAuthenticated && sessionId) {
        params.set('sessionId', sessionId);
      }

      const response = await fetch(`${API_BASE}/shop/cart?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch cart');
      }

      setCart(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setCart({ items: [], itemCount: 0, subtotal: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, sessionId]);

  // Fetch cart on mount and when session changes
  useEffect(() => {
    if (isAuthenticated || sessionId) {
      fetchCart();
    }
  }, [fetchCart, isAuthenticated, sessionId]);

  // Add item to cart
  const addItem = useCallback(
    async (productId: string, variantId?: string, quantity = 1): Promise<boolean> => {
      setIsAddingItem(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/shop/cart`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            variantId,
            quantity,
            sessionId: !isAuthenticated ? sessionId : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error?.message || 'Failed to add item');
          return false;
        }

        // Refetch cart to get updated data
        await fetchCart();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setIsAddingItem(false);
      }
    },
    [isAuthenticated, sessionId, fetchCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/shop/cart/${itemId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity,
            sessionId: !isAuthenticated ? sessionId : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error?.message || 'Failed to update item');
          return false;
        }

        // Update local state
        setCart((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item
          ),
          itemCount: prev.items.reduce(
            (sum, item) => sum + (item.id === itemId ? quantity : item.quantity),
            0
          ),
          subtotal: prev.items.reduce(
            (sum, item) =>
              sum + (item.id === itemId ? item.unitPrice * quantity : item.totalPrice),
            0
          ),
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      }
    },
    [isAuthenticated, sessionId]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      setError(null);

      try {
        const params = new URLSearchParams();
        if (!isAuthenticated && sessionId) {
          params.set('sessionId', sessionId);
        }

        const response = await fetch(`${API_BASE}/shop/cart/${itemId}?${params}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error?.message || 'Failed to remove item');
          return false;
        }

        // Update local state
        setCart((prev) => {
          const removedItem = prev.items.find((item) => item.id === itemId);
          if (!removedItem) return prev;

          return {
            items: prev.items.filter((item) => item.id !== itemId),
            itemCount: prev.itemCount - removedItem.quantity,
            subtotal: prev.subtotal - removedItem.totalPrice,
          };
        });

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      }
    },
    [isAuthenticated, sessionId]
  );

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      // Remove all items one by one
      for (const item of cart.items) {
        await removeItem(item.id);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
  }, [cart.items, removeItem]);

  return {
    items: cart.items,
    itemCount: cart.itemCount,
    subtotal: cart.subtotal,
    isLoading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refetch: fetchCart,
    isAddingItem,
  };
}

export type { CartItem, CartProduct, CartVariant, CartData };
