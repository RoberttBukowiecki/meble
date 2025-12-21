'use client';

/**
 * Shared countertop material selection component
 * Used in CountertopConfigDialog, CountertopPanel, and CabinetTemplateDialog
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import { useMemo } from 'react';

interface CountertopMaterialSelectProps {
  /** Selected material ID */
  value: string | undefined;
  /** Callback when material changes */
  onChange: (materialId: string) => void;
  /** Label text (optional) */
  label?: string;
  /** Additional class name for the select trigger */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Whether to show label */
  showLabel?: boolean;
}

/**
 * Hook to get countertop materials from store
 */
export function useCountertopMaterials() {
  const materials = useStore((state) => state.materials);

  const countertopMaterials = useMemo(
    () => materials.filter((m) => m.category === 'countertop'),
    [materials]
  );

  const defaultMaterialId = countertopMaterials[0]?.id;

  return {
    countertopMaterials,
    defaultMaterialId,
    hasMaterials: countertopMaterials.length > 0,
  };
}

/**
 * Countertop material selection component
 */
export function CountertopMaterialSelect({
  value,
  onChange,
  label = 'Materiał blatu',
  className = '',
  placeholder = 'Wybierz materiał blatu',
  size = 'default',
  showLabel = true,
}: CountertopMaterialSelectProps) {
  const { countertopMaterials, defaultMaterialId, hasMaterials } = useCountertopMaterials();

  // If no countertop materials exist, don't render anything
  if (!hasMaterials) {
    return null;
  }

  const triggerClassName = size === 'sm' ? 'h-8 text-xs' : 'h-10';
  const labelClassName = size === 'sm' ? 'text-xs text-muted-foreground' : 'text-sm font-medium';

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <Label className={labelClassName}>{label}</Label>
      )}
      <Select
        value={value || defaultMaterialId || ''}
        onValueChange={onChange}
      >
        <SelectTrigger className={`${triggerClassName} ${className}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {countertopMaterials.map((mat) => (
            <SelectItem
              key={mat.id}
              value={mat.id}
              className={size === 'sm' ? 'text-xs' : ''}
            >
              {mat.name} ({mat.thickness}mm)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default CountertopMaterialSelect;
