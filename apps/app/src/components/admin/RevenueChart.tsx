/**
 * Revenue Chart Component
 *
 * Simple bar chart for revenue visualization.
 */

'use client';

import { useMemo } from 'react';
import type { AnalyticsData } from '@/hooks/useAdmin';

interface RevenueChartProps {
  data: AnalyticsData;
  height?: number;
}

export function RevenueChart({ data, height = 200 }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data.daily.length) return [];

    const maxRevenue = Math.max(...data.daily.map(d => d.revenue.total), 1);

    return data.daily.map(day => ({
      date: day.date,
      value: day.revenue.total,
      height: (day.revenue.total / maxRevenue) * 100,
      label: new Date(day.date).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [data.daily]);

  const formatCurrency = (value: number) => {
    return `${(value / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0 })} zł`;
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Brak danych
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Przychód</h3>

      <div className="flex items-end gap-1" style={{ height }}>
        {chartData.map((bar, index) => (
          <div
            key={bar.date}
            className="flex-1 flex flex-col items-center group"
          >
            <div className="relative w-full">
              <div
                className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                style={{ height: `${Math.max(bar.height, 2)}%`, minHeight: 2 }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg z-10">
                <div className="font-medium">{formatCurrency(bar.value)}</div>
                <div className="text-muted-foreground">{bar.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{chartData[0]?.label}</span>
        <span>{chartData[chartData.length - 1]?.label}</span>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Suma za okres:</span>
          <span className="font-semibold">{formatCurrency(data.totals.revenue)}</span>
        </div>
      </div>
    </div>
  );
}
