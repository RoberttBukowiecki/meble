'use client';

import { Drawer } from '@meble/ui';
import { HistoryList } from '../ui/HistoryList';

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDrawer({ open, onOpenChange }: HistoryDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="left">
      <HistoryList />
    </Drawer>
  );
}
