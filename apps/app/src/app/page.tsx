'use client';

import { useState } from 'react';
import { Scene } from '@/components/canvas/Scene';
import { Sidebar } from '@/components/ui/Sidebar';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { HistoryPanel } from '@/components/layout/HistoryPanel';

export default function Home() {
  // Keyboard shortcuts are now handled by GlobalKeyboardListener in layout.tsx

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* 3D Canvas - 75% width */}
      <div className="w-3/4 bg-muted">
        <Scene />
      </div>

      {/* Sidebar - 25% width */}
      <div className="w-1/4 border-l border-border bg-background">
        <Sidebar />
      </div>

      <HistoryDrawer open={isHistoryDrawerOpen} onOpenChange={setIsHistoryDrawerOpen} />
      <HistoryPanel onHistoryDrawerOpen={() => setIsHistoryDrawerOpen(true)} />
    </div>
  );
}