
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@meble/ui';
import { CabinetParams } from '@/types';
import { HandlesConfig } from './HandlesConfig';
import { useState } from 'react';

interface HandlesConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: Partial<CabinetParams>;
  onParamsChange: (params: Partial<CabinetParams>) => void;
}

export function HandlesConfigDialog({
  open,
  onOpenChange,
  params,
  onParamsChange,
}: HandlesConfigDialogProps) {
  const [localParams, setLocalParams] = useState(params);

  const handleSave = () => {
    onParamsChange(localParams);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalParams(params);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfiguracja uchwytów</DialogTitle>
        </DialogHeader>
        
        <HandlesConfig params={localParams} onChange={setLocalParams} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
