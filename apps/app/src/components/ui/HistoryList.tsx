'use client';

import { useStore } from '@/lib/store';
import { formatHistoryTimestamp } from '@/lib/utils/time';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function HistoryList() {
  const t = useTranslations('History');
  const undoStack = useStore(state => state.undoStack);
  const redoStack = useStore(state => state.redoStack);
  const jumpTo = useStore(state => state.jumpTo);

  const allEntries = [
    ...undoStack.map((e, i) => ({ ...e, status: 'done' as const, index: i })),
    ...redoStack
      .slice()
      .reverse()
      .map((e, i) => ({
        ...e,
        status: 'undone' as const,
        index: undoStack.length + i
      })),
  ];

  const currentIndex = undoStack.length - 1;

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">{t('listTitle')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('operationCount', { count: allEntries.length })}
        </p>
      </div>

      <div className="h-full overflow-y-auto">
        <div className="p-2">
          {allEntries.length === 0 && (
            <div className="text-center text-sm text-muted-foreground p-8">
              {t('noHistory')}
            </div>
          )}
          {allEntries.map((entry, i) => (
            <button
              key={entry.meta.id}
              onClick={() => jumpTo(entry.meta.id)}
              className={cn(
                "w-full text-left p-3 rounded-md mb-1 transition-colors",
                "hover:bg-accent",
                i === currentIndex && "bg-primary text-primary-foreground",
                entry.status === 'undone' && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{entry.meta.label}</span>
                {entry.meta.isMilestone && (
                  <span className="text-xs bg-accent px-2 py-1 rounded">
                    {t('milestone')}
                  </span>
                )}
              </div>
              <div className={cn(
                "text-xs mt-1",
                i === currentIndex ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}>
                {formatHistoryTimestamp(entry.meta.timestamp)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
