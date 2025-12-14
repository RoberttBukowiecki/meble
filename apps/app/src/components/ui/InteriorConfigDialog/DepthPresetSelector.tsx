'use client';

/**
 * Depth Preset Selector Component
 *
 * Reusable component for selecting depth presets (FULL/HALF/CUSTOM)
 * Used for shelf depth, partition depth, and other depth configurations.
 */

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NumberInput,
  cn,
} from '@meble/ui';
import { INTERIOR_CONFIG } from '@/lib/config';

// ============================================================================
// Types
// ============================================================================

export type DepthPreset = 'FULL' | 'HALF' | 'CUSTOM';

interface DepthPresetSelectorProps {
  /** Current depth preset value */
  value: DepthPreset;
  /** Callback when preset changes */
  onChange: (preset: DepthPreset, customDepth?: number) => void;
  /** Custom depth value (used when preset is CUSTOM) */
  customDepth?: number;
  /** Cabinet depth in mm (for calculating FULL and HALF values) */
  cabinetDepth: number;
  /** Minimum custom depth (defaults to CUSTOM_SHELF_DEPTH_MIN) */
  minDepth?: number;
  /** Maximum custom depth (defaults to cabinetDepth - offset) */
  maxDepth?: number;
  /** Display variant: 'default' (horizontal) or 'compact' (inline) */
  variant?: 'default' | 'compact';
  /** Additional class name */
  className?: string;
  /** Label for the selector (optional) */
  label?: string;
  /** Show calculated depth */
  showCalculatedDepth?: boolean;
  /** Offset from cabinet depth for FULL preset (default 10mm) */
  fullDepthOffset?: number;
}

// ============================================================================
// Constants
// ============================================================================

const PRESET_LABELS: Record<DepthPreset, string> = {
  FULL: 'Pełna',
  HALF: 'Połowa',
  CUSTOM: 'Własna',
};

// ============================================================================
// Component
// ============================================================================

export function DepthPresetSelector({
  value,
  onChange,
  customDepth,
  cabinetDepth,
  minDepth = INTERIOR_CONFIG.CUSTOM_SHELF_DEPTH_MIN,
  maxDepth,
  variant = 'default',
  className,
  label,
  showCalculatedDepth = true,
  fullDepthOffset = 10,
}: DepthPresetSelectorProps) {
  // Calculate effective depths
  const calculatedDepth = useMemo(() => {
    const fullDepth = cabinetDepth - fullDepthOffset;
    switch (value) {
      case 'FULL':
        return fullDepth;
      case 'HALF':
        return Math.round(fullDepth / 2);
      case 'CUSTOM':
        return customDepth ?? Math.round(fullDepth * 0.75);
    }
  }, [value, customDepth, cabinetDepth, fullDepthOffset]);

  const effectiveMaxDepth = maxDepth ?? (cabinetDepth - fullDepthOffset);

  const handlePresetChange = (newPreset: DepthPreset) => {
    const defaultCustom = newPreset === 'CUSTOM'
      ? (customDepth ?? Math.round((cabinetDepth - fullDepthOffset) * 0.75))
      : undefined;
    onChange(newPreset, defaultCustom);
  };

  const handleCustomDepthChange = (newDepth: number) => {
    onChange('CUSTOM', Math.max(minDepth, Math.min(effectiveMaxDepth, newDepth)));
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {label && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
        )}
        <Select value={value} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as DepthPreset[]).map((preset) => (
              <SelectItem key={preset} value={preset} className="text-xs">
                {PRESET_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value === 'CUSTOM' && (
          <NumberInput
            value={customDepth ?? calculatedDepth}
            onChange={handleCustomDepthChange}
            min={minDepth}
            max={effectiveMaxDepth}
            allowNegative={false}
            className="h-7 w-20 text-xs"
          />
        )}
        {showCalculatedDepth && (
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
            {calculatedDepth}mm
          </span>
        )}
      </div>
    );
  }

  // Default variant (vertical layout)
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <span className="text-sm font-medium">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as DepthPreset[]).map((preset) => (
              <SelectItem key={preset} value={preset}>
                {PRESET_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value === 'CUSTOM' && (
          <NumberInput
            value={customDepth ?? calculatedDepth}
            onChange={handleCustomDepthChange}
            min={minDepth}
            max={effectiveMaxDepth}
            allowNegative={false}
            className="h-8 w-24"
          />
        )}
      </div>
      {showCalculatedDepth && (
        <div className="text-xs text-muted-foreground">
          Głębokość: <span className="font-mono font-medium text-foreground">{calculatedDepth}mm</span>
        </div>
      )}
    </div>
  );
}

export default DepthPresetSelector;
