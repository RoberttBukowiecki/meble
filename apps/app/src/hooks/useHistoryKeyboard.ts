import { useEffect } from 'react';
import { useStore } from '@/lib/store';

/**
 * Hook that sets up keyboard shortcuts for undo/redo functionality
 *
 * Shortcuts:
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z: Redo
 * - Cmd/Ctrl + Y: Redo (alternative)
 *
 * The shortcuts are blocked when the user is typing in text inputs.
 */
export function useHistoryKeyboard() {
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const canUndo = useStore((state) => state.canUndo());
  const canRedo = useStore((state) => state.canRedo());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a text input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore auto-repeat events
      if (e.repeat) return;

      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
      }

      // Cmd/Ctrl + Shift + Z = Redo
      if (isMod && e.key === 'z' && e.shiftKey && canRedo) {
        e.preventDefault();
        redo();
      }

      // Cmd/Ctrl + Y = Redo (alternative)
      if (isMod && e.key === 'y' && canRedo) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
