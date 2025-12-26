"use client";

/**
 * SyncStatusIndicator - Shows sync status with CAD-like styling
 *
 * States:
 * - synced: Green dot - "Zapisano"
 * - local_only: Yellow pulsing dot - "Niezapisane zmiany"
 * - syncing: Spinning icon - "Synchronizowanie..."
 * - offline: Grey cloud - "Offline"
 * - conflict: Orange warning - "Konflikt wersji"
 * - error: Red X - "Błąd zapisu"
 */

import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/types";
import { Check, Circle, Loader2, CloudOff, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@meble/ui";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<
  SyncStatus,
  {
    label: string;
    tooltip: string;
    icon: typeof Check;
    colorClass: string;
    animate?: string;
  }
> = {
  synced: {
    label: "Zapisano",
    tooltip: "Wszystkie zmiany zapisane",
    icon: Check,
    colorClass: "text-green-500",
  },
  local_only: {
    label: "Niezapisane",
    tooltip: "Masz niezapisane zmiany",
    icon: Circle,
    colorClass: "text-yellow-500",
    animate: "animate-pulse",
  },
  syncing: {
    label: "Zapisywanie...",
    tooltip: "Trwa zapisywanie zmian",
    icon: Loader2,
    colorClass: "text-primary",
    animate: "animate-spin",
  },
  offline: {
    label: "Offline",
    tooltip: "Brak połączenia z serwerem",
    icon: CloudOff,
    colorClass: "text-muted-foreground",
  },
  conflict: {
    label: "Konflikt",
    tooltip: "Wykryto konflikt wersji - kliknij aby rozwiązać",
    icon: AlertTriangle,
    colorClass: "text-orange-500",
    animate: "animate-pulse",
  },
  error: {
    label: "Błąd",
    tooltip: "Nie udało się zapisać - spróbuj ponownie",
    icon: XCircle,
    colorClass: "text-destructive",
  },
};

export function SyncStatusIndicator({
  status,
  size = "md",
  showLabel = true,
  className,
}: SyncStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const content = (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className={cn(iconSize, config.colorClass, config.animate)} />
      {showLabel && (
        <span className={cn(textSize, "font-mono", config.colorClass)}>{config.label}</span>
      )}
    </div>
  );

  // If not showing label, wrap in tooltip
  if (!showLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export default SyncStatusIndicator;
