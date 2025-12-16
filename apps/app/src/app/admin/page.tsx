/**
 * Admin Dashboard Page
 *
 * Main admin dashboard with KPIs and analytics.
 */

'use client';

import { useAdminStats, useAdminAnalytics, useAuditLogs } from '@/hooks/useAdmin';
import { StatsGrid, RevenueChart, AuditLogTable } from '@/components/admin';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@meble/ui';

export default function AdminDashboardPage() {
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useAdminStats();

  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics,
  } = useAdminAnalytics('30d');

  const {
    logs,
    isLoading: logsLoading,
    refresh: refreshLogs,
  } = useAuditLogs({ limit: 10 });

  const isLoading = statsLoading || analyticsLoading || logsLoading;

  const handleRefresh = () => {
    refreshStats();
    refreshAnalytics();
    refreshLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Przegląd statystyk i analityki systemu
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Odśwież
        </Button>
      </div>

      {/* Stats Error */}
      {statsError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{statsError}</p>
        </div>
      )}

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : stats ? (
        <StatsGrid stats={stats} />
      ) : null}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div>
          {analyticsLoading ? (
            <div className="h-80 rounded-lg border bg-card animate-pulse" />
          ) : analytics ? (
            <RevenueChart data={analytics} height={200} />
          ) : analyticsError ? (
            <div className="h-80 rounded-lg border bg-card flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Błąd ładowania wykresu</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Quick Stats Card */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Podsumowanie</h3>
          {analytics ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Nowi użytkownicy</span>
                <span className="font-semibold">{analytics.totals.newUsers}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Eksporty</span>
                <span className="font-semibold">{analytics.totals.exports}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Zamówienia</span>
                <span className="font-semibold">{analytics.totals.orders}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Przychód (30 dni)</span>
                <span className="font-semibold text-primary">
                  {(analytics.totals.revenue / 100).toLocaleString('pl-PL', {
                    style: 'currency',
                    currency: 'PLN',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse bg-muted rounded" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ostatnia aktywność</h3>
        <AuditLogTable logs={logs} isLoading={logsLoading} />
      </div>
    </div>
  );
}
