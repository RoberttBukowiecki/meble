'use client';

import { useStore } from '@/lib/store';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@meble/ui';
import { cn } from '@/lib/utils';
import { formatHistoryTimestamp } from '@/lib/utils/time';
import { HistoryEntry } from '@/types';

function getEntryIcon(entry: HistoryEntry) {
  const kind = entry.meta.kind;
  if (entry.meta.isMilestone) return '💎';

  switch (kind) {
    case 'geometry':
      return '📐';
    case 'material':
      return '🎨';
    case 'cabinet':
      return '📦';
    case 'selection':
      return '🖱️';
    default:
      return '🔹';
  }
}

export function HorizontalTimeline() {
  const { undoStack, redoStack, jumpTo } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allEntries = useMemo(() => {
    const entries = [
      ...undoStack.map(e => ({ ...e, status: 'done' as const })),
      ...[...redoStack].reverse().map(e => ({ ...e, status: 'undone' as const })),
    ].sort((a, b) => a.meta.timestamp - b.meta.timestamp);
    return entries;
  }, [undoStack, redoStack]);

  const { timelineData, timeTicks } = useMemo(() => {
    if (allEntries.length === 0) return { timelineData: [], timeTicks: [] };

    const gaps = allEntries.slice(1).map((entry, i) => {
      const prevEntry = allEntries[i];
      return entry.meta.timestamp - prevEntry.meta.timestamp;
    });

    const logGaps = gaps.map(gap => Math.log1p(gap));
    const totalLogGaps = logGaps.reduce((sum, gap) => sum + gap, 0);
    
    let timelineData;
    if (totalLogGaps === 0) {
        timelineData = allEntries.map((entry, i) => ({
            ...entry,
            percent: allEntries.length > 1 ? (i / (allEntries.length - 1)) * 100 : 50
        }));
    } else {
        let cumulativePercent = 0;
        timelineData = [
          { ...allEntries[0], percent: 0 },
          ...allEntries.slice(1).map((entry, i) => {
            const percent = (logGaps[i] / totalLogGaps) * 100;
            cumulativePercent += percent;
            return { ...entry, percent: cumulativePercent };
          })
        ];
    }
    
    // Calculate time ticks
    const startTime = allEntries[0].meta.timestamp;
    const endTime = allEntries[allEntries.length - 1].meta.timestamp;
    const duration = endTime - startTime;
    const tickCount = Math.floor(width / 120); // approx 120px per label
    const timeTicks = [];

    if (duration > 0 && tickCount > 1) {
        for (let i = 0; i <= tickCount; i++) {
            const percent = (i / tickCount) * 100;
            const timestamp = startTime + (duration * (percent / 100));
            timeTicks.push({
                percent,
                label: formatHistoryTimestamp(timestamp),
            });
        }
    } else {
        timeTicks.push({ percent: 0, label: formatHistoryTimestamp(startTime) });
        if (duration > 0) {
            timeTicks.push({ percent: 100, label: formatHistoryTimestamp(endTime) });
        }
    }

    return { timelineData, timeTicks };
  }, [allEntries, width]);

  const currentIndex = useStore(state => state.undoStack.length - 1);
  const currentPositionPercent = currentIndex >= 0 && timelineData.length > 0
    ? timelineData.find(d => d.meta.id === undoStack[currentIndex].meta.id)?.percent ?? 0
    : 0;

  if (allEntries.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
        Brak historii do wyświetlenia na osi czasu.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center px-8 relative" ref={containerRef}>
      <div className="relative w-full h-1 bg-muted rounded-full">
        {/* Progress bar */}
        <div 
          className="absolute h-1 bg-primary rounded-full"
          style={{ width: `${currentPositionPercent}%` }}
        />

        {timelineData.map((entry) => {
          return (
            <Tooltip key={entry.meta.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => jumpTo(entry.meta.id)}
                  className={cn(
                    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center',
                    entry.meta.isMilestone ? 'bg-primary' : 'bg-accent',
                    entry.status === 'undone' && 'opacity-50'
                  )}
                  style={{ left: `${entry.percent}%` }}
                >
                  <span className={cn("text-xs", entry.meta.isMilestone && "text-primary-foreground")}>
                    {getEntryIcon(entry)}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{entry.meta.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatHistoryTimestamp(entry.meta.timestamp)}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="relative w-full h-4 mt-2">
        {timeTicks.map(tick => (
            <div key={tick.percent} className="absolute top-0 -translate-x-1/2 text-xs text-muted-foreground" style={{ left: `${tick.percent}%` }}>
                |
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">{tick.label}</span>
            </div>
        ))}
      </div>
    </div>
  );
}
