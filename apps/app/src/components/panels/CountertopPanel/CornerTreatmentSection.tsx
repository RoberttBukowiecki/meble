'use client';

/**
 * CornerTreatmentSection - Countertop corner treatment configuration
 */

import * as React from 'react';
import { useStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import {
  CornerDownRight,
  Circle,
  Square,
  Scissors,
} from 'lucide-react';
import type { CountertopGroup, CornerTreatment, CornerPosition } from '@/types';

// Corner treatment options with icons
const CORNER_TREATMENT_OPTIONS: { value: CornerTreatment; label: string; icon: React.ReactNode }[] = [
  { value: 'STRAIGHT', label: 'Prosty', icon: <Square className="h-3 w-3" /> },
  { value: 'CHAMFER', label: 'Fazowany', icon: <CornerDownRight className="h-3 w-3" /> },
  { value: 'RADIUS', label: 'Zaokrąglony', icon: <Circle className="h-3 w-3" /> },
  { value: 'CLIP', label: 'Ścięty', icon: <Scissors className="h-3 w-3" /> },
];

interface CornerTreatmentSectionProps {
  group: CountertopGroup;
}

export function CornerTreatmentSection({ group }: CornerTreatmentSectionProps) {
  const updateCornerTreatment = useStore((state) => state.updateCornerTreatment);

  // Determine which corners to show based on layout
  const cornerCount = group.layoutType === 'U_SHAPE' ? 8 : group.layoutType === 'L_SHAPE' ? 6 : 4;
  const corners = Array.from({ length: cornerCount }, (_, i) => (i + 1) as CornerPosition);

  const getCornerConfig = (position: CornerPosition) => {
    return group.corners.find((c) => c.position === position);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Narożniki ({cornerCount})
      </div>
      <div className="grid grid-cols-2 gap-2">
        {corners.map((position) => {
          const config = getCornerConfig(position);
          const treatment = config?.treatment || 'STRAIGHT';

          return (
            <div key={position} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4">#{position}</span>
              <Select
                value={treatment}
                onValueChange={(val) =>
                  updateCornerTreatment(group.id, position, val as CornerTreatment)
                }
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORNER_TREATMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
