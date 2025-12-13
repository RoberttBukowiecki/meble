'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@meble/ui';
import { Monitor, Smartphone } from 'lucide-react';
import { MOBILE_BREAKPOINT } from '@/hooks/useIsMobile';

const STORAGE_KEY = 'mobile-warning-dismissed';

export function MobileWarningDialog() {
  const t = useTranslations('MobileWarning');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if mobile and if dialog was not already dismissed in this session
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const wasDismissed = sessionStorage.getItem(STORAGE_KEY);

    if (isMobile && !wasDismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Smartphone className="h-12 w-12 text-muted-foreground" />
              <Monitor className="h-16 w-16 text-primary absolute -right-6 -top-2" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('description')}
            <br /><br />
            {t('note')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleDismiss} className="w-full">
            {t('continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
