'use client';

import { useState, useEffect } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@meble/ui';
import { useStore } from '@/lib/store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@meble/ui';

export function HistoryButtons() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const undo = useStore(state => state.undo);
  const redo = useStore(state => state.redo);
  const canUndo = useStore(state => state.canUndo());
  const canRedo = useStore(state => state.canRedo());

  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!isClient || !canUndo}
            aria-label="Cofnij"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cofnij (Cmd+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!isClient || !canRedo}
            aria-label="Ponów"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ponów (Cmd+Shift+Z)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
