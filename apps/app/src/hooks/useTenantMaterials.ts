/**
 * useTenantMaterials Hook
 *
 * Fetches and manages tenant-specific materials.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/lib/tenant/context';

export interface TenantMaterial {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  thickness?: number;
  width?: number;
  height?: number;
  color?: string;
  texture?: string;
  imageUrl?: string;
  pricePerM2?: number;
  pricePerSheet?: number;
  inStock: boolean;
  metadata?: Record<string, any>;
}

interface UseTenantMaterialsOptions {
  category?: string;
  limit?: number;
}

interface UseTenantMaterialsReturn {
  materials: TenantMaterial[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api';

export function useTenantMaterials(
  options: UseTenantMaterialsOptions = {}
): UseTenantMaterialsReturn {
  const { category, limit = 50 } = options;
  const { isTenantContext, tenant } = useTenant();

  const [materials, setMaterials] = useState<TenantMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchMaterials = useCallback(
    async (reset = false) => {
      if (!isTenantContext || !tenant) {
        setMaterials([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const currentOffset = reset ? 0 : offset;
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(currentOffset),
        });

        if (category) {
          params.append('category', category);
        }

        const response = await fetch(`${API_BASE}/tenant/materials?${params}`, {
          headers: {
            'x-tenant-id': tenant.id,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to fetch materials');
        }

        if (reset) {
          setMaterials(data.data.materials);
          setOffset(data.data.materials.length);
        } else {
          setMaterials((prev) => [...prev, ...data.data.materials]);
          setOffset((prev) => prev + data.data.materials.length);
        }

        setTotal(data.data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch materials');
      } finally {
        setIsLoading(false);
      }
    },
    [isTenantContext, tenant, category, limit, offset]
  );

  const loadMore = useCallback(async () => {
    if (!isLoading && materials.length < total) {
      await fetchMaterials(false);
    }
  }, [isLoading, materials.length, total, fetchMaterials]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchMaterials(true);
  }, [fetchMaterials]);

  // Re-fetch when tenant or category changes - fetchMaterials is intentionally
  // not in deps to avoid infinite loops since it depends on offset
  useEffect(() => {
    if (isTenantContext && tenant) {
      setOffset(0);
      fetchMaterials(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTenantContext, tenant?.id, category]);

  return {
    materials,
    isLoading,
    error,
    hasMore: materials.length < total,
    loadMore,
    refresh,
  };
}
