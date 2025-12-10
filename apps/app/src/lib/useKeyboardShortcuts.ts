/**
 * Custom hook for keyboard shortcuts
 */

import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS, normalizeShortcutKeys, type ShortcutKeys } from './config';

interface KeyboardShortcutHandlers {
  onTranslateMode?: () => void;
  onRotateMode?: () => void;
  onResetCamera?: () => void;
  onDeletePart?: () => void;
  onDuplicatePart?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const matchesShortcut = (shortcut: ShortcutKeys, key: string) =>
      normalizeShortcutKeys(shortcut).some(
        (shortcutKey) => shortcutKey.toLowerCase() === key
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Handle shortcuts
      if (matchesShortcut(KEYBOARD_SHORTCUTS.TRANSLATE_MODE, key)) {
        event.preventDefault();
        handlers.onTranslateMode?.();
        return;
      }

      if (matchesShortcut(KEYBOARD_SHORTCUTS.ROTATE_MODE, key)) {
        event.preventDefault();
        handlers.onRotateMode?.();
        return;
      }

      if (matchesShortcut(KEYBOARD_SHORTCUTS.RESET_CAMERA, key)) {
        event.preventDefault();
        handlers.onResetCamera?.();
        return;
      }

      if (matchesShortcut(KEYBOARD_SHORTCUTS.DELETE_PART, key)) {
        event.preventDefault();
        handlers.onDeletePart?.();
        return;
      }

      if (
        matchesShortcut(KEYBOARD_SHORTCUTS.DUPLICATE_PART, key) &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        handlers.onDuplicatePart?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
