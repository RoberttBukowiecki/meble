/**
 * Stats Grid Component
 *
 * Displays overview stats in a grid layout.
 */

'use client';

import { StatsCard } from './StatsCard';
import { Users, CreditCard, Building2, Package, Wallet } from 'lucide-react';
import type { AdminStats } from '@/hooks/useAdmin';

interface StatsGridProps {
  stats: AdminStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Przychód (ten miesiąc)"
        value={stats.revenue.thisMonth}
        change={stats.revenue.changePercent}
        changeLabel="vs poprzedni"
        format="currency"
        icon={<Wallet className="h-4 w-4" />}
      />

      <StatsCard
        title="Użytkownicy"
        value={stats.overview.totalUsers}
        icon={<Users className="h-4 w-4" />}
      />

      <StatsCard
        title="Aktywne kredyty"
        value={stats.overview.activeCredits}
        icon={<CreditCard className="h-4 w-4" />}
      />

      <StatsCard
        title="Tenanci"
        value={`${stats.tenants.active} / ${stats.tenants.total}`}
        icon={<Building2 className="h-4 w-4" />}
      />

      <StatsCard
        title="Zamówienia (ten miesiąc)"
        value={stats.orders.thisMonth}
        icon={<Package className="h-4 w-4" />}
      />

      <StatsCard
        title="Wartość zamówień"
        value={stats.orders.totalValue}
        format="currency"
      />

      <StatsCard
        title="Oczekujące wypłaty"
        value={stats.payouts.pendingCount}
      />

      <StatsCard
        title="Kwota do wypłaty"
        value={stats.payouts.pendingAmount}
        format="currency"
      />
    </div>
  );
}
