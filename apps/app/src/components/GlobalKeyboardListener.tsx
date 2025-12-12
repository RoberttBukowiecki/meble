'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { KEYBOARD_SHORTCUTS, normalizeShortcutKeys, type ShortcutKeys } from '@/lib/config';

/**
 * Global keyboard listener component that manages all keyboard shortcuts
 * Uses getState() instead of selectors to avoid unnecessary re-renders
 */
export function GlobalKeyboardListener() {
  useEffect(() => {
    const matchesShortcut = (shortcut: ShortcutKeys, key: string) =>
      normalizeShortcutKeys(shortcut).some(
        (shortcutKey) => shortcutKey.toLowerCase() === key.toLowerCase()
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      // Track Shift key state for rotation snapping
      if (event.key === 'Shift') {
        useStore.getState().setShiftPressed(true);
      }

      // Ignore shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore auto-repeat events for most shortcuts
      if (event.repeat && event.key !== 'Shift') return;

      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      // ============================================================================
      // Selection shortcuts
      // ============================================================================

      // Cmd/Ctrl + A = Select all parts in current furniture
      if (isMod && matchesShortcut(KEYBOARD_SHORTCUTS.SELECT_ALL, key)) {
        event.preventDefault();
        useStore.getState().selectAll();
        return;
      }

      // Escape = Clear selection
      if (matchesShortcut(KEYBOARD_SHORTCUTS.CLEAR_SELECTION, event.key)) {
        event.preventDefault();
        useStore.getState().clearSelection();
        return;
      }

      // ============================================================================
      // History shortcuts (Cmd/Ctrl + Z, Cmd/Ctrl + Shift + Z, Cmd/Ctrl + Y)
      // ============================================================================

      // Cmd/Ctrl + Z = Undo
      if (isMod && key === 'z' && !event.shiftKey && useStore.getState().canUndo()) {
        event.preventDefault();
        useStore.getState().undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z = Redo
      if (isMod && key === 'z' && event.shiftKey && useStore.getState().canRedo()) {
        event.preventDefault();
        useStore.getState().redo();
        return;
      }

      // Cmd/Ctrl + Y = Redo (alternative)
      if (isMod && key === 'y' && useStore.getState().canRedo()) {
        event.preventDefault();
        useStore.getState().redo();
        return;
      }

      // ============================================================================
      // Transform mode shortcuts
      // ============================================================================

      // M = Translate mode
      if (matchesShortcut(KEYBOARD_SHORTCUTS.TRANSLATE_MODE, key)) {
        event.preventDefault();
        useStore.getState().setTransformMode('translate');
        return;
      }

      // R = Rotate mode
      if (matchesShortcut(KEYBOARD_SHORTCUTS.ROTATE_MODE, key)) {
        event.preventDefault();
        useStore.getState().setTransformMode('rotate');
        return;
      }

      // S = Resize mode
      if (matchesShortcut(KEYBOARD_SHORTCUTS.RESIZE_MODE, key)) {
        event.preventDefault();
        useStore.getState().setTransformMode('resize');
        return;
      }

      // ============================================================================
      // Part/Cabinet actions
      // ============================================================================

      // Delete/Backspace = Delete selected parts or cabinet
      if (matchesShortcut(KEYBOARD_SHORTCUTS.DELETE_PART, key)) {
        event.preventDefault();
        const state = useStore.getState();

        if (state.selectedCabinetId) {
          // Cabinet selected - confirm deletion
          if (window.confirm('Usunąć całą szafkę i wszystkie jej części?')) {
            state.removeCabinet(state.selectedCabinetId);
          }
        } else if (state.selectedPartIds.size > 1) {
          // Multiple parts selected - use multiselect delete
          state.deleteSelectedParts();
        } else if (state.selectedPartId) {
          // Single part selected
          state.removePart(state.selectedPartId);
        }
        return;
      }

      // Cmd/Ctrl + D = Duplicate selected parts or cabinet
      if (matchesShortcut(KEYBOARD_SHORTCUTS.DUPLICATE_PART, key) && isMod) {
        event.preventDefault();
        const state = useStore.getState();

        if (state.selectedCabinetId) {
          // Cabinet selected
          state.duplicateCabinet(state.selectedCabinetId);
        } else if (state.selectedPartIds.size > 1) {
          // Multiple parts selected - use multiselect duplicate
          state.duplicateSelectedParts();
        } else if (state.selectedPartId) {
          // Single part selected
          state.duplicatePart(state.selectedPartId);
        }
        return;
      }

      // ============================================================================
      // Camera/View shortcuts (C, G)
      // ============================================================================
      // Note: Camera reset (C) is handled by Scene.tsx via custom event
      // Grid toggle (G) would be handled similarly if implemented

      if (matchesShortcut(KEYBOARD_SHORTCUTS.RESET_CAMERA, key)) {
        event.preventDefault();
        // Dispatch custom event for camera reset
        window.dispatchEvent(new CustomEvent('keyboard:resetCamera'));
        return;
      }

      if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_GRID, key)) {
        event.preventDefault();
        // Dispatch custom event for grid toggle
        window.dispatchEvent(new CustomEvent('keyboard:toggleGrid'));
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        useStore.getState().setShiftPressed(false);
      }
    };

    // Reset on window blur (in case keys are released outside the window)
    const handleBlur = () => {
      useStore.getState().setShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []); // Empty deps - no re-renders! ✅

  return null;
}
