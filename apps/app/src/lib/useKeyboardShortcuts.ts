/**
 * Custom hook for keyboard shortcuts
 */

import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from './config';

interface KeyboardShortcutHandlers {
  onTranslateMode?: () => void;
  onRotateMode?: () => void;
  onResetCamera?: () => void;
  onDeletePart?: () => void;
  onDuplicatePart?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
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
      switch (key) {
        case KEYBOARD_SHORTCUTS.TRANSLATE_MODE:
          event.preventDefault();
          handlers.onTranslateMode?.();
          break;

        case KEYBOARD_SHORTCUTS.ROTATE_MODE:
          event.preventDefault();
          handlers.onRotateMode?.();
          break;

        case KEYBOARD_SHORTCUTS.RESET_CAMERA:
          event.preventDefault();
          handlers.onResetCamera?.();
          break;

        case KEYBOARD_SHORTCUTS.DELETE_PART.toLowerCase():
          if (event.key === KEYBOARD_SHORTCUTS.DELETE_PART) {
            event.preventDefault();
            handlers.onDeletePart?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.DUPLICATE_PART:
          // Only trigger on Ctrl/Cmd + D
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onDuplicatePart?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
