'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  children,
  side = 'left',
  className,
}: DrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />
      {/* Drawer Content */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50 w-80 bg-background border-border shadow-xl transition-transform duration-300 ease-in-out',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          !open && side === 'left' && '-translate-x-full',
          !open && side === 'right' && 'translate-x-full',
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 p-2 rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  );
}
