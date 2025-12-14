'use client';

/**
 * Partition Editor Component
 *
 * Edits partition (vertical divider) properties including
 * depth preset and material selection.
 */

import { useCallback } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NumberInput,
  cn,
} from '@meble/ui';
import type { PartitionConfig, PartitionDepthPreset, Material } from '@/types';
import { Zone } from '@/lib/domain';
import { SeparatorVertical } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface PartitionEditorProps {
  partition: PartitionConfig;
  onUpdate: (partition: PartitionConfig) => void;
  materials: Material[];
  bodyMaterialId: string;
  cabinetDepth: number;
  className?: string;
}

// Depth preset options
const DEPTH_PRESET_OPTIONS: { value: PartitionDepthPreset; label: string; description: string }[] = [
  { value: 'FULL', label: 'Pełna', description: 'Pełna głębokość szafki' },
  { value: 'HALF', label: 'Połowa', description: '50% głębokości szafki' },
  { value: 'CUSTOM', label: 'Niestandardowa', description: 'Własna wartość w mm' },
];

// ============================================================================
// Component
// ============================================================================

export function PartitionEditor({
  partition,
  onUpdate,
  materials,
  bodyMaterialId,
  cabinetDepth,
  className,
}: PartitionEditorProps) {
  // Handle depth preset change
  const handleDepthPresetChange = useCallback(
    (depthPreset: PartitionDepthPreset) => {
      onUpdate({
        ...partition,
        depthPreset,
        customDepth: depthPreset === 'CUSTOM' ? partition.customDepth ?? cabinetDepth * 0.75 : undefined,
      });
    },
    [partition, onUpdate, cabinetDepth]
  );

  // Handle custom depth change
  const handleCustomDepthChange = useCallback(
    (customDepth: number) => {
      onUpdate({
        ...partition,
        customDepth,
      });
    },
    [partition, onUpdate]
  );

  // Handle material change
  const handleMaterialChange = useCallback(
    (materialId: string) => {
      onUpdate({
        ...partition,
        materialId: materialId === 'DEFAULT' ? undefined : materialId,
      });
    },
    [partition, onUpdate]
  );

  // Calculate effective depth
  const effectiveDepth = Zone.calculatePartitionDepth(partition, cabinetDepth);

  return (
    <div className={cn('space-y-3 p-3 border rounded-lg bg-muted/20', className)}>
      <div className="flex items-center gap-2">
        <SeparatorVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Przegroda</span>
      </div>

      {/* Depth Preset */}
      <div className="space-y-1.5">
        <Label className="text-xs">Głębokość</Label>
        <Select
          value={partition.depthPreset}
          onValueChange={(v) => handleDepthPresetChange(v as PartitionDepthPreset)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPTH_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Depth Input */}
      {partition.depthPreset === 'CUSTOM' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Niestandardowa głębokość (mm)</Label>
          <NumberInput
            value={partition.customDepth ?? cabinetDepth * 0.75}
            onChange={handleCustomDepthChange}
            min={50}
            max={cabinetDepth}
            step={10}
          />
        </div>
      )}

      {/* Material Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs">Materiał</Label>
        <Select
          value={partition.materialId ?? 'DEFAULT'}
          onValueChange={handleMaterialChange}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEFAULT">
              <span className="text-muted-foreground">Domyślny (korpus)</span>
            </SelectItem>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Effective depth display */}
      <div className="text-[10px] text-muted-foreground border-t pt-2">
        Efektywna głębokość: <span className="font-medium">{effectiveDepth} mm</span>
      </div>
    </div>
  );
}

export default PartitionEditor;
