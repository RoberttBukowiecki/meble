"use client";

/**
 * CncOperationsSection - CNC operations management for countertops
 */

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { Button, NumberInput } from "@meble/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@meble/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@meble/ui";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import type { CountertopGroup, CountertopSegment, CutoutPresetType } from "@/types";
import { CUTOUT_PRESET_OPTIONS } from "./constants";
import { CUTOUT_PRESETS, CNC_OPERATION_LIMITS } from "@/lib/config";

/**
 * Get cutout dimensions for a preset
 */
function getPresetDimensions(preset: CutoutPresetType): { width: number; height: number } {
  const presetConfig = CUTOUT_PRESETS[preset];
  if (!presetConfig) return { width: 0, height: 0 };

  const { dimensions } = presetConfig;

  // Circular cutout
  if (dimensions.diameter) {
    return { width: dimensions.diameter, height: dimensions.diameter };
  }

  // Rectangular cutout
  return { width: dimensions.width ?? 0, height: dimensions.height ?? 0 };
}

/**
 * Calculate minimum position for cutout center to keep it within bounds
 */
function getMinPosition(preset: CutoutPresetType): { minX: number; minY: number } {
  const { width, height } = getPresetDimensions(preset);
  const minEdge = CNC_OPERATION_LIMITS.MIN_EDGE_DISTANCE;
  return {
    minX: minEdge + width / 2,
    minY: minEdge + height / 2,
  };
}

/**
 * Calculate maximum position for cutout center
 */
function getMaxPosition(
  preset: CutoutPresetType,
  segment: CountertopSegment
): { maxX: number; maxY: number } {
  const { width, height } = getPresetDimensions(preset);
  const minEdge = CNC_OPERATION_LIMITS.MIN_EDGE_DISTANCE;
  return {
    maxX: segment.length - minEdge - width / 2,
    maxY: segment.width - minEdge - height / 2,
  };
}

/**
 * Validate if position is valid for the given preset and segment
 */
function validatePosition(
  preset: CutoutPresetType,
  segment: CountertopSegment,
  x: number,
  y: number
): { valid: boolean; error?: string } {
  const { minX, minY } = getMinPosition(preset);
  const { maxX, maxY } = getMaxPosition(preset, segment);

  if (x < minX) {
    return {
      valid: false,
      error: `Pozycja X musi być min. ${Math.ceil(minX)}mm (środek wycięcia)`,
    };
  }
  if (x > maxX) {
    return { valid: false, error: `Pozycja X musi być max. ${Math.floor(maxX)}mm` };
  }
  if (y < minY) {
    return {
      valid: false,
      error: `Pozycja Y musi być min. ${Math.ceil(minY)}mm (środek wycięcia)`,
    };
  }
  if (y > maxY) {
    return { valid: false, error: `Pozycja Y musi być max. ${Math.floor(maxY)}mm` };
  }

  return { valid: true };
}

interface CncOperationsSectionProps {
  group: CountertopGroup;
}

export function CncOperationsSection({ group }: CncOperationsSectionProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = React.useState<CutoutPresetType | null>(null);
  const [positionX, setPositionX] = React.useState(0);
  const [positionY, setPositionY] = React.useState(0);

  const { addCncOperationFromPreset, removeCncOperation } = useStore(
    useShallow((state) => ({
      addCncOperationFromPreset: state.addCncOperationFromPreset,
      removeCncOperation: state.removeCncOperation,
    }))
  );

  // Get selected segment
  const selectedSegment = React.useMemo(
    () => group.segments.find((s) => s.id === selectedSegmentId),
    [group.segments, selectedSegmentId]
  );

  // Calculate validation result
  const validationResult = React.useMemo(() => {
    if (!selectedPreset || !selectedSegment) return { valid: true };
    return validatePosition(selectedPreset, selectedSegment, positionX, positionY);
  }, [selectedPreset, selectedSegment, positionX, positionY]);

  // Update position to center when segment or preset changes
  React.useEffect(() => {
    if (selectedSegment && selectedPreset) {
      // Set position to center of segment (safe default)
      const centerX = Math.round(selectedSegment.length / 2);
      const centerY = Math.round(selectedSegment.width / 2);
      setPositionX(centerX);
      setPositionY(centerY);
    }
  }, [selectedSegmentId, selectedPreset, selectedSegment]);

  const handleAddOperation = () => {
    if (!selectedSegmentId || !selectedPreset || !validationResult.valid) return;
    addCncOperationFromPreset(group.id, selectedSegmentId, selectedPreset, {
      x: positionX,
      y: positionY,
    });
    setShowAddDialog(false);
    setSelectedPreset(null);
    setSelectedSegmentId(null);
  };

  // Count total operations
  const totalOperations = group.segments.reduce((sum, seg) => sum + seg.cncOperations.length, 0);

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
              <Select value={selectedSegmentId || ""} onValueChange={setSelectedSegmentId}>
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
                value={selectedPreset || ""}
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
                  min={selectedPreset ? Math.ceil(getMinPosition(selectedPreset).minX) : 50}
                  max={
                    selectedSegment && selectedPreset
                      ? Math.floor(getMaxPosition(selectedPreset, selectedSegment).maxX)
                      : 4000
                  }
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  Odległość środka wycięcia od lewej krawędzi
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pozycja Y (mm)</label>
                <NumberInput
                  value={positionY}
                  onChange={setPositionY}
                  min={selectedPreset ? Math.ceil(getMinPosition(selectedPreset).minY) : 50}
                  max={
                    selectedSegment && selectedPreset
                      ? Math.floor(getMaxPosition(selectedPreset, selectedSegment).maxY)
                      : 1000
                  }
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  Odległość środka wycięcia od przedniej krawędzi
                </p>
              </div>
            </div>

            {/* Validation error */}
            {!validationResult.valid && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{validationResult.error}</span>
              </div>
            )}

            {/* Preset dimensions hint */}
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">
                Wymiary wycięcia: {getPresetDimensions(selectedPreset).width} ×{" "}
                {getPresetDimensions(selectedPreset).height} mm
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleAddOperation}
              disabled={!selectedSegmentId || !selectedPreset || !validationResult.valid}
            >
              Dodaj operację
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
