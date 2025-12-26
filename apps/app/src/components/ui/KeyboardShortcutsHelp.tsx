"use client";

/**
 * Keyboard shortcuts help panel
 */

import { useState } from "react";
import { Button, Badge } from "@meble/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@meble/ui";
import { Keyboard } from "lucide-react";
import { KEYBOARD_SHORTCUTS, formatShortcutLabel, type ShortcutKeys } from "@/lib/config";
import { useIsAdmin } from "@/hooks";

const withMod = (shortcut: ShortcutKeys) => `CTRL/CMD + ${formatShortcutLabel(shortcut)}`;

interface ShortcutItem {
  key: string;
  description: string;
}

interface ShortcutSectionData {
  category: string;
  items: ShortcutItem[];
}

function ShortcutSection({ section }: { section: ShortcutSectionData }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{section.category}</h3>
      <div className="space-y-1.5">
        {section.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-2 rounded-md bg-muted p-2"
          >
            <span className="text-sm text-muted-foreground">{item.description}</span>
            <kbd className="shrink-0 rounded bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
              {item.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useIsAdmin();

  // Left column: Selection and editing
  const leftColumn = [
    {
      category: "Zaznaczanie",
      items: [
        { key: withMod(KEYBOARD_SHORTCUTS.SELECT_ALL), description: "Zaznacz wszystkie części" },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.CLEAR_SELECTION),
          description: "Wyczyść zaznaczenie",
        },
        { key: "CTRL/CMD + KLIK", description: "Dodaj/usuń z zaznaczenia" },
        { key: "SHIFT + KLIK", description: "Zaznacz zakres części" },
      ],
    },
    {
      category: "Historia zmian",
      items: [
        { key: withMod("z"), description: "Cofnij ostatnią akcję" },
        {
          key: `CTRL/CMD + SHIFT + ${formatShortcutLabel("z")}`,
          description: "Przywróć cofniętą akcję",
        },
        { key: withMod("y"), description: "Przywróć (alternatywa)" },
      ],
    },
    {
      category: "Części",
      items: [
        { key: withMod(KEYBOARD_SHORTCUTS.DUPLICATE_PART), description: "Duplikuj zaznaczone" },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.DELETE_PART),
          description: "Usuń zaznaczone",
        },
      ],
    },
  ];

  // Right column: Transform, view, visibility
  const rightColumn = [
    {
      category: "Tryby transformacji",
      items: [
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.TRANSLATE_MODE),
          description: "Tryb przesuwania",
        },
        { key: formatShortcutLabel(KEYBOARD_SHORTCUTS.ROTATE_MODE), description: "Tryb obrotu" },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.RESIZE_MODE),
          description: "Tryb zmiany rozmiaru",
        },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_SPACE_MODE),
          description: "Przełącz osie globalne/lokalne",
        },
        { key: "SHIFT + OBRÓT", description: "Przyciąganie co 15°" },
      ],
    },
    {
      category: "Widok",
      items: [
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.RESET_CAMERA),
          description: "Reset widoku kamery",
        },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_GRID),
          description: "Pokaż/ukryj siatkę",
        },
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS),
          description: "Pokaż/ukryj wymiary obiektów",
        },
      ],
    },
    {
      category: "Widoczność",
      items: [
        {
          key: formatShortcutLabel(KEYBOARD_SHORTCUTS.HIDE_SELECTED),
          description: "Ukryj/pokaż zaznaczone",
        },
        { key: withMod(KEYBOARD_SHORTCUTS.TOGGLE_HIDE_FRONTS), description: "Ukryj/pokaż fronty" },
      ],
    },
  ];

  // Admin-only shortcuts section
  const adminSection: ShortcutSectionData = {
    category: "Admin (testowanie)",
    items: [
      {
        key: withMod(KEYBOARD_SHORTCUTS.ADMIN_TEST_CREDITS_ANIMATION),
        description: "Test animacji kredytów",
      },
      {
        key: withMod(KEYBOARD_SHORTCUTS.ADMIN_TEST_EXPORT_DIALOG),
        description: "Otwórz dialog eksportu",
      },
    ],
  };

  return (
    <>
      <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-11 w-11 md:h-8 md:w-8 p-0"
          title="Skróty klawiszowe"
        >
          <Keyboard className="h-5 w-5 md:h-4 md:w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skróty klawiszowe</DialogTitle>
            <DialogDescription>Lista dostępnych skrótów klawiszowych w aplikacji</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left column */}
              <div className="space-y-4">
                {leftColumn.map((section) => (
                  <ShortcutSection key={section.category} section={section} />
                ))}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {rightColumn.map((section) => (
                  <ShortcutSection key={section.category} section={section} />
                ))}
              </div>
            </div>

            {/* Admin-only shortcuts section */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-dashed border-amber-500">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Admin
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Skróty widoczne tylko dla administratorów
                  </span>
                </div>
                <ShortcutSection section={adminSection} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
