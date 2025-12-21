'use client';

/**
 * CncOperationsSection - CNC operations management for countertops
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/lib/store';
import { Button, NumberInput } from '@meble/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@meble/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CountertopGroup, CutoutPresetType } from '@/types';
import { CUTOUT_PRESET_OPTIONS, DEFAULT_CNC_POSITION } from './constants';

interface CncOperationsSectionProps {
  group: CountertopGroup;
}

export function CncOperationsSection({ group }: CncOperationsSectionProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = React.useState<CutoutPresetType | null>(null);
  const [positionX, setPositionX] = React.useState(DEFAULT_CNC_POSITION.x);
  const [positionY, setPositionY] = React.useState(DEFAULT_CNC_POSITION.y);

  const { addCncOperationFromPreset, removeCncOperation } = useStore(
    useShallow((state) => ({
      addCncOperationFromPreset: state.addCncOperationFromPreset,
      removeCncOperation: state.removeCncOperation,
    }))
  );

  const handleAddOperation = () => {
    if (!selectedSegmentId || !selectedPreset) return;
    addCncOperationFromPreset(group.id, selectedSegmentId, selectedPreset, {
      x: positionX,
      y: positionY,
    });
    setShowAddDialog(false);
    setSelectedPreset(null);
  };

  // Count total operations
  const totalOperations = group.segments.reduce(
    (sum, seg) => sum + seg.cncOperations.length,
    0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Operacje CNC ({totalOperations})
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Dodaj
        </Button>
      </div>

      {group.segments.map((segment) =>
        segment.cncOperations.length > 0 ? (
          <div key={segment.id} className="space-y-1">
            <div className="text-xs text-muted-foreground">{segment.name}:</div>
            {segment.cncOperations.map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between bg-muted/50 rounded px-2 py-1"
              >
                <span className="text-xs">
                  {op.preset || op.type} @ ({op.position.x}, {op.position.y})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCncOperation(group.id, segment.id, op.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null
      )}

      {/* Add CNC Operation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj operację CNC</DialogTitle>
            <DialogDescription>
              Wybierz preset i określ pozycję operacji na blacie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Segment</label>
              <Select
                value={selectedSegmentId || ''}
                onValueChange={setSelectedSegmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz segment" />
                </SelectTrigger>
                <SelectContent>
                  {group.segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preset</label>
              <Select
                value={selectedPreset || ''}
                onValueChange={(val) => setSelectedPreset(val as CutoutPresetType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz preset" />
                </SelectTrigger>
                <SelectContent>
                  {CUTOUT_PRESET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pozycja X (mm)</label>
                <NumberInput
                  value={positionX}
                  onChange={setPositionX}
                  min={0}
                  max={4000}
                  step={10}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pozycja Y (mm)</label>
                <NumberInput
                  value={positionY}
                  onChange={setPositionY}
                  min={0}
                  max={1000}
                  step={10}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleAddOperation}
              disabled={!selectedSegmentId || !selectedPreset}
            >
              Dodaj operację
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
