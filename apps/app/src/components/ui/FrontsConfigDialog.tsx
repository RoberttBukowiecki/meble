
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
import { FrontsConfig } from './FrontsConfig';
import { useState } from 'react';

interface FrontsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: Partial<CabinetParams>;
  onParamsChange: (params: Partial<CabinetParams>) => void;
}

export function FrontsConfigDialog({
  open,
  onOpenChange,
  params,
  onParamsChange,
}: FrontsConfigDialogProps) {
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
          <DialogTitle>Konfiguracja frontów</DialogTitle>
        </DialogHeader>
        
        <FrontsConfig params={localParams} onChange={setLocalParams} />

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
