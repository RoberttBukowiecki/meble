/**
 * useAdmin Hook
 *
 * Admin dashboard data fetching and management.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Use local API routes for admin (same-origin cookies work reliably)
// Local routes proxy to payments API server-side
const API_BASE = '/api';

// Types
export interface AdminStats {
  overview: {
    totalUsers: number;
    activeCredits: number;
    activeTenants: number;
    totalTenants: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
  orders: {
    thisMonth: number;
    completed: number;
    pending: number;
    totalValue: number;
  };
  tenants: {
    total: number;
    active: number;
    byPlan: {
      starter: number;
      professional: number;
      enterprise: number;
    };
  };
  payouts: {
    pendingCount: number;
    pendingAmount: number;
  };
}

export interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  totals: {
    revenue: number;
    newUsers: number;
    exports: number;
    orders: number;
  };
  daily: Array<{
    date: string;
    revenue: {
      total: number;
      credits: number;
      shop: number;
      orders: number;
      commissions: number;
      tenants: number;
    };
    users: { new: number; active: number };
    exports: { total: number; paid: number; free: number };
    orders: { quotes: number; created: number; completed: number };
    tenants: { new: number; active: number };
  }>;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userEmail: string | null;
  adminEmail: string | null;
  ipAddress: string | null;
  oldValues: any;
  newValues: any;
  metadata: any;
  createdAt: string;
}

// Stats Hook
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/stats`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch stats');
      }

      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

// Analytics Hook
export function useAdminAnalytics(period: string = '30d') {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/analytics?period=${period}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch analytics');
      }

      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, isLoading, error, refresh: fetchAnalytics };
}

// Audit Logs Hook
export function useAuditLogs(filters: {
  action?: string;
  resourceType?: string;
  limit?: number;
} = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Use ref for offset to avoid stale closure issues in loadMore
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);

  const fetchLogs = useCallback(async (reset = false) => {
    // Prevent duplicate requests
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offsetRef.current;

      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      params.append('limit', String(filters.limit || 50));
      params.append('offset', String(currentOffset));

      const response = await fetch(`${API_BASE}/admin/audit?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch logs');
      }

      const newLogs = data.data.logs;

      if (reset) {
        setLogs(newLogs);
        offsetRef.current = newLogs.length;
      } else {
        setLogs(prev => [...prev, ...newLogs]);
        offsetRef.current += newLogs.length;
      }

      setTotal(data.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [filters.action, filters.resourceType, filters.limit]);

  useEffect(() => {
    offsetRef.current = 0;
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.action, filters.resourceType]);

  return {
    logs,
    isLoading,
    error,
    hasMore: logs.length < total,
    loadMore: () => fetchLogs(false),
    refresh: () => fetchLogs(true),
  };
}
