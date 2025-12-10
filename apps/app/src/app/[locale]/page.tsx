'use client';

import { Scene } from '@/components/canvas/Scene';
import { Sidebar } from '@/components/ui/Sidebar';

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* 3D Canvas - 75% width */}
      <div className="w-3/4 bg-muted">
        <Scene />
      </div>

      {/* Sidebar - 25% width */}
      <div className="w-1/4 border-l border-border bg-background">
        <Sidebar />
      </div>
    </div>
  );
}