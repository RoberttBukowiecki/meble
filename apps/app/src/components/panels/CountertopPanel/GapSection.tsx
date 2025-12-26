"use client";

/**
 * GapSection - Displays and manages gaps between cabinets in a countertop group
 *
 * Shows detected gaps with distance and allows user to toggle between:
 * - BRIDGE: Single countertop spans over the gap
 * - SPLIT: Separate countertops for cabinets on each side
 */

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { Button } from "@meble/ui";
import { Link2, Unlink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountertopGroup, CabinetGap, CabinetGapMode } from "@/types/countertop";
import { CABINET_GAP_CONFIG } from "@/lib/config";

interface GapSectionProps {
  group: CountertopGroup;
}

export function GapSection({ group }: GapSectionProps) {
  const { cabinets, updateGapMode } = useStore(
    useShallow((state) => ({
      cabinets: state.cabinets,
      updateGapMode: state.updateGapMode,
    }))
  );

  // Only show gaps above the touch threshold
  const visibleGaps =
    group.gaps?.filter((g) => g.distance > CABINET_GAP_CONFIG.TOUCH_THRESHOLD) ?? [];

  if (visibleGaps.length === 0) {
    return null;
  }

  // Get cabinet name by ID
  const getCabinetName = (cabinetId: string): string => {
    const cabinet = cabinets.find((c) => c.id === cabinetId);
    return cabinet?.name || "Szafka";
  };

  const handleModeChange = (gapId: string, mode: CabinetGapMode) => {
    updateGapMode(group.id, gapId, mode);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Wykryto przerwy między szafkami</span>
      </div>

      <div className="space-y-2">
        {visibleGaps.map((gap) => (
          <GapItem
            key={gap.id}
            gap={gap}
            cabinetAName={getCabinetName(gap.cabinetAId)}
            cabinetBName={getCabinetName(gap.cabinetBId)}
            onModeChange={(mode) => handleModeChange(gap.id, mode)}
          />
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        &quot;Łącz&quot; - jeden blat nad przerwą • &quot;Rozdziel&quot; - osobne blaty
      </p>
    </div>
  );
}

interface GapItemProps {
  gap: CabinetGap;
  cabinetAName: string;
  cabinetBName: string;
  onModeChange: (mode: CabinetGapMode) => void;
}

function GapItem({ gap, cabinetAName, cabinetBName, onModeChange }: GapItemProps) {
  const isLargeGap = gap.distance > CABINET_GAP_CONFIG.AUTO_SPLIT_THRESHOLD;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2.5 rounded-lg border",
        gap.mode === "BRIDGE"
          ? "bg-primary/5 border-primary/20"
          : "bg-orange-500/5 border-orange-500/20"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            gap.mode === "BRIDGE" ? "bg-primary" : "bg-orange-500"
          )}
        />
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{gap.distance}mm</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {cabinetAName} ↔ {cabinetBName}
          </div>
        </div>
        {isLargeGap && gap.mode === "BRIDGE" && (
          <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0 ml-2">
        <Button
          size="sm"
          variant={gap.mode === "BRIDGE" ? "default" : "outline"}
          className={cn(
            "h-7 px-2 text-[10px]",
            gap.mode === "BRIDGE" && "bg-primary hover:bg-primary/90"
          )}
          onClick={() => onModeChange("BRIDGE")}
          title="Jeden blat nad przerwą"
        >
          <Link2 className="h-3 w-3 mr-1" />
          Łącz
        </Button>
        <Button
          size="sm"
          variant={gap.mode === "SPLIT" ? "default" : "outline"}
          className={cn(
            "h-7 px-2 text-[10px]",
            gap.mode === "SPLIT" && "bg-orange-500 hover:bg-orange-500/90"
          )}
          onClick={() => onModeChange("SPLIT")}
          title="Rozdziel na dwa blaty"
        >
          <Unlink className="h-3 w-3 mr-1" />
          Rozdziel
        </Button>
      </div>
    </div>
  );
}
