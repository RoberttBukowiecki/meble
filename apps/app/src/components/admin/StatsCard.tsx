/**
 * Stats Card Component
 *
 * Displays a single stat with label, value, and optional change indicator.
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percent';
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number',
}: StatsCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `${(val / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('pl-PL');
    }
  };

  const getChangeColor = () => {
    if (!change || change === 0) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = () => {
    if (!change || change === 0) return <Minus className="h-4 w-4" />;
    return change > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>

      <div className="mt-2">
        <span className="text-2xl font-bold">{formatValue(value)}</span>
      </div>

      {change !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          {changeLabel && (
            <span className="text-muted-foreground ml-1">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
