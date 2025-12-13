'use client';

import { useState } from 'react';
import { Scene } from '@/components/canvas/Scene';
import { Sidebar } from '@/components/ui/Sidebar';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { HistoryPanel } from '@/components/layout/HistoryPanel';
import { MobileWarningDialog } from '@/components/ui/MobileWarningDialog';
import { Drawer } from '@meble/ui';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function Home() {
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <MobileWarningDialog />
      <div className="flex h-screen w-full overflow-hidden relative">
        {/* 3D Canvas - full width on mobile, 75% on desktop */}
        <div className="w-full md:w-3/4 bg-muted">
          <Scene
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            isMobile={isMobile}
          />
        </div>

        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block w-1/4 border-l border-border bg-background">
          <Sidebar />
        </div>

        {/* Mobile Sidebar - Drawer from right */}
        {isMobile && (
          <Drawer
            open={isMobileSidebarOpen}
            onOpenChange={setIsMobileSidebarOpen}
            side="right"
            className="w-[85vw] max-w-sm"
          >
            <div className="pt-12 h-full">
              <Sidebar />
            </div>
          </Drawer>
        )}

        <HistoryDrawer open={isHistoryDrawerOpen} onOpenChange={setIsHistoryDrawerOpen} />
        <HistoryPanel onHistoryDrawerOpen={() => setIsHistoryDrawerOpen(true)} />
      </div>
    </>
  );
}
