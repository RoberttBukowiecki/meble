'use client';

/**
 * SegmentTable - Countertop segment table component
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/lib/store';
import { NumberInput, Checkbox } from '@meble/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@meble/ui';
import type { CountertopSegment, EdgeBandingOption, EdgeId } from '@/types';
import { EDGE_BANDING_OPTIONS } from './constants';

interface SegmentTableProps {
  segments: CountertopSegment[];
  groupId: string;
}

export function SegmentTable({ segments, groupId }: SegmentTableProps) {
  const {
    updateSegmentDimensions,
    updateSegmentEdgeBanding,
    updateSegmentGrain,
  } = useStore(
    useShallow((state) => ({
      updateSegmentDimensions: state.updateSegmentDimensions,
      updateSegmentEdgeBanding: state.updateSegmentEdgeBanding,
      updateSegmentGrain: state.updateSegmentGrain,
    }))
  );

  if (segments.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Brak segmentów blatu
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <div
          key={segment.id}
          className="border rounded-lg p-3 space-y-3 bg-muted/20"
        >
          {/* Segment name */}
          <div className="text-sm font-medium">{segment.name}</div>

          {/* Dimensions row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Długość (mm)</label>
              <NumberInput
                value={segment.length}
                onChange={(val) =>
                  updateSegmentDimensions(groupId, segment.id, { length: val })
                }
                min={100}
                max={4100}
                step={1}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Szerokość (mm)</label>
              <NumberInput
                value={segment.width}
                onChange={(val) =>
                  updateSegmentDimensions(groupId, segment.id, { width: val })
                }
                min={100}
                max={1200}
                step={1}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {/* Grain checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`grain-${segment.id}`}
              checked={segment.grainAlongLength}
              onCheckedChange={(checked) =>
                updateSegmentGrain(groupId, segment.id, !!checked)
              }
              className="h-4 w-4"
            />
            <label
              htmlFor={`grain-${segment.id}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Usłojenie wzdłuż długości
            </label>
          </div>

          {/* Edge banding row */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Obrzeża</label>
            <div className="grid grid-cols-4 gap-1">
              {(['a', 'b', 'c', 'd'] as EdgeId[]).map((edge) => (
                <div key={edge} className="space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase block text-center">
                    {edge}
                  </span>
                  <Select
                    value={segment.edgeBanding[edge]}
                    onValueChange={(val) =>
                      updateSegmentEdgeBanding(
                        groupId,
                        segment.id,
                        edge,
                        val as EdgeBandingOption
                      )
                    }
                  >
                    <SelectTrigger className="h-6 text-[10px] px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDGE_BANDING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
