'use client';

/**
 * GroupListItem - Countertop group list item component
 */

import * as React from 'react';
import { Button, Badge } from '@meble/ui';
import { Trash2 } from 'lucide-react';
import type { CountertopGroup } from '@/types';
import { CountertopDomain } from '@/lib/domain/countertop';
import { LAYOUT_TYPE_LABELS, LAYOUT_TYPE_COLORS } from './constants';

interface GroupListItemProps {
  group: CountertopGroup;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function GroupListItem({ group, isSelected, onSelect, onDelete }: GroupListItemProps) {
  const segmentCount = group.segments.length;
  const totalAreaM2 = CountertopDomain.calculateTotalAreaM2(group);

  return (
    <div
      onClick={onSelect}
      className={`
        group relative cursor-pointer rounded-lg border p-3 transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground truncate">
              {group.name}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ${LAYOUT_TYPE_COLORS[group.layoutType]}`}
            >
              {LAYOUT_TYPE_LABELS[group.layoutType]}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>{segmentCount} segment(ów) • {totalAreaM2.toFixed(2)} m²</div>
            {group.joints.length > 0 && (
              <div>{group.joints.length} połączeń</div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
