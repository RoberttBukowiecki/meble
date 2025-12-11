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
import { KEYBOARD_SHORTCUTS, formatShortcutLabel, type ShortcutKeys } from '@/lib/config';

const withMod = (shortcut: ShortcutKeys) =>
  `CTRL/CMD + ${formatShortcutLabel(shortcut)}`;

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  const shortcuts = [
    {
      category: 'Historia zmian',
      items: [
        { key: withMod('z'), description: 'Cofnij ostatnią akcję' },
        { key: `CTRL/CMD + SHIFT + ${formatShortcutLabel('z')}`, description: 'Przywróć cofniętą akcję' },
        { key: withMod('y'), description: 'Przywróć cofniętą akcję (alternatywa)' },
      ],
    },
    {
      category: 'Tryby transformacji',
      items: [
        { key: formatShortcutLabel(KEYBOARD_SHORTCUTS.TRANSLATE_MODE), description: 'Tryb przesuwania' },
        { key: formatShortcutLabel(KEYBOARD_SHORTCUTS.ROTATE_MODE), description: 'Tryb obrotu' },
      ],
    },
    {
      category: 'Kamera',
      items: [
        { key: formatShortcutLabel(KEYBOARD_SHORTCUTS.RESET_CAMERA), description: 'Reset widoku kamery' },
      ],
    },
    {
      category: 'Części',
      items: [
        { key: withMod(KEYBOARD_SHORTCUTS.DUPLICATE_PART), description: 'Duplikuj zaznaczoną część' },
        { key: formatShortcutLabel(KEYBOARD_SHORTCUTS.DELETE_PART), description: 'Usuń zaznaczoną część' },
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
