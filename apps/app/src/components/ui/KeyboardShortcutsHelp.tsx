'use client';

/**
 * Keyboard shortcuts help panel
 */

import { useState } from 'react';
import { Button } from '@meble/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@meble/ui';
import { Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/lib/config';

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  const shortcuts = [
    {
      category: 'Tryby transformacji',
      items: [
        { key: KEYBOARD_SHORTCUTS.TRANSLATE_MODE.toUpperCase(), description: 'Tryb przesuwania' },
        { key: KEYBOARD_SHORTCUTS.ROTATE_MODE.toUpperCase(), description: 'Tryb obrotu' },
      ],
    },
    {
      category: 'Kamera',
      items: [
        { key: KEYBOARD_SHORTCUTS.RESET_CAMERA.toUpperCase(), description: 'Reset widoku kamery' },
      ],
    },
    {
      category: 'Części',
      items: [
        { key: 'CTRL+D', description: 'Duplikuj zaznaczoną część' },
        { key: 'DELETE', description: 'Usuń zaznaczoną część' },
      ],
    },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-background/80 backdrop-blur-sm"
        title="Skróty klawiszowe"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Skróty klawiszowe</DialogTitle>
            <DialogDescription>
              Lista dostępnych skrótów klawiszowych w aplikacji
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-md bg-muted p-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        {item.description}
                      </span>
                      <kbd className="rounded bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
