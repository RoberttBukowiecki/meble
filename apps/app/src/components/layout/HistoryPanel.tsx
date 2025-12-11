'use client';

import { useState } from 'react';
import { Button } from '@meble/ui';
import { History, LayoutList, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { HorizontalTimeline } from '../ui/HorizontalTimeline';

const PANEL_HEIGHT = '128px';

interface HistoryPanelProps {
  onHistoryDrawerOpen: () => void;
}

export function HistoryPanel({ onHistoryDrawerOpen }: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('History');

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out',
        isOpen ? 'transform-none' : `translate-y-[calc(100%-48px)]`
      )}
    >
      <div className="flex justify-center">
        <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              className="rounded-b-none rounded-t-lg"
              onClick={onHistoryDrawerOpen}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              {t('listTitle')}
            </Button>
            <Button
              variant="secondary"
              className="rounded-b-none rounded-t-lg"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              <History className="h-4 w-4 mx-2" />
              {t('timelineTitle')}
            </Button>
        </div>
      </div>

      <div
        className="bg-background border-t border-border shadow-lg p-4"
        style={{ height: PANEL_HEIGHT }}
      >
        <HorizontalTimeline />
      </div>
    </div>
  );
}
