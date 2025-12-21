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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@meble/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium h-8 px-2">Element</TableHead>
            <TableHead className="text-xs font-medium h-8 px-2 text-right w-20">Długość</TableHead>
            <TableHead className="text-xs font-medium h-8 px-2 text-right w-20">Szerokość</TableHead>
            <TableHead className="text-xs font-medium h-8 px-2 text-center w-16">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">Usł.</TooltipTrigger>
                  <TooltipContent>
                    <p>Usłojenie wzdłuż długości</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-xs font-medium h-8 px-2 text-center" colSpan={4}>
              Obrzeża (a/b/c/d)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segments.map((segment) => (
            <TableRow key={segment.id} className="hover:bg-muted/30">
              <TableCell className="py-1.5 px-2">
                <span className="text-sm font-medium">{segment.name}</span>
              </TableCell>
              <TableCell className="py-1.5 px-2">
                <NumberInput
                  value={segment.length}
                  onChange={(val) =>
                    updateSegmentDimensions(groupId, segment.id, { length: val })
                  }
                  min={100}
                  max={4100}
                  step={1}
                  className="h-7 w-20 text-xs text-right"
                />
              </TableCell>
              <TableCell className="py-1.5 px-2">
                <NumberInput
                  value={segment.width}
                  onChange={(val) =>
                    updateSegmentDimensions(groupId, segment.id, { width: val })
                  }
                  min={100}
                  max={1200}
                  step={1}
                  className="h-7 w-20 text-xs text-right"
                />
              </TableCell>
              <TableCell className="py-1.5 px-2 text-center">
                <Checkbox
                  checked={segment.grainAlongLength}
                  onCheckedChange={(checked) =>
                    updateSegmentGrain(groupId, segment.id, !!checked)
                  }
                  className="h-4 w-4"
                />
              </TableCell>
              {(['a', 'b', 'c', 'd'] as EdgeId[]).map((edge) => (
                <TableCell key={edge} className="py-1.5 px-0.5">
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
                    <SelectTrigger className="h-7 w-16 text-[10px] px-1">
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
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
