"use client";

import { useState } from "react";
import { Scene } from "@/components/canvas/Scene";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopBar } from "@/components/ui/TopBar";
import { HistoryDrawer } from "@/components/layout/HistoryDrawer";
import { HistoryPanel } from "@/components/layout/HistoryPanel";
import { MobileWarningDialog } from "@/components/ui/MobileWarningDialog";
import { Drawer } from "@meble/ui";
import { useIsMobile, useProjectRestore } from "@/hooks";

export default function Home() {
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Restore project from persisted state on app load
  useProjectRestore();

  return (
    <>
      <MobileWarningDialog />
      <div className="flex h-screen w-full overflow-hidden relative">
        {/* 3D Canvas - full width on mobile, 75% on desktop */}
        <div className="w-full md:w-3/4 flex flex-col bg-muted">
          {/* TopBar - macOS style menubar */}
          <TopBar />
          {/* Scene takes remaining height */}
          <div className="flex-1">
            <Scene onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} isMobile={isMobile} />
          </div>
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
            <div className="h-full">
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
