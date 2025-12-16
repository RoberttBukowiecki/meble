'use client';

/**
 * Dialog for configuring cabinet legs
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@meble/ui';
import { LegsConfig as LegsConfigType, CabinetParams } from '@/types';
import { LegsConfig } from './LegsConfig';
import { LegsDomain } from '@/lib/domain/legs';
import { useState, useEffect } from 'react';

interface LegsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: LegsConfigType | undefined;
  onConfigChange: (config: LegsConfigType) => void;
  cabinetWidth: number;
}

export function LegsConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  cabinetWidth,
}: LegsConfigDialogProps) {
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<LegsConfigType>(
    config ?? LegsDomain.createDefaultLegsConfig()
  );

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalConfig(config ?? LegsDomain.createDefaultLegsConfig());
    }
  }, [open, config]);

  // Handle params change from LegsConfig component
  const handleParamsChange = (params: Partial<CabinetParams>) => {
    if (params.legs) {
      setLocalConfig(params.legs);
    }
  };

  // Save changes
  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  // Cancel changes
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle>Konfiguracja nóżek</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <LegsConfig
            params={{ legs: localConfig }}
            onChange={handleParamsChange}
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get summary text for legs configuration
 */
export function getLegsSummary(
  config: LegsConfigType | undefined,
  cabinetWidth?: number
): string {
  if (!config || !config.enabled) {
    return 'Brak (szafka na podłodze)';
  }
  return LegsDomain.getSummary(config, cabinetWidth);
}

/**
 * Check if legs are configured
 */
export function hasLegs(config: LegsConfigType | undefined): boolean {
  return config?.enabled ?? false;
}
