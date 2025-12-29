"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { KEYBOARD_SHORTCUTS, normalizeShortcutKeys, type ShortcutKeys } from "@/lib/config";

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
      if (event.key === "Shift") {
        useStore.getState().setShiftPressed(true);
      }

      // Ignore shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Ignore auto-repeat events for most shortcuts
      if (event.repeat && event.key !== "Shift") return;

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
      if (isMod && key === "z" && !event.shiftKey && useStore.getState().canUndo()) {
        event.preventDefault();
        useStore.getState().undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z = Redo
      if (isMod && key === "z" && event.shiftKey && useStore.getState().canRedo()) {
        event.preventDefault();
        useStore.getState().redo();
        return;
      }

      // Cmd/Ctrl + Y = Redo (alternative)
      if (isMod && key === "y" && useStore.getState().canRedo()) {
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
        useStore.getState().setTransformMode("translate");
        return;
      }

      // R = Rotate mode
      if (matchesShortcut(KEYBOARD_SHORTCUTS.ROTATE_MODE, key)) {
        event.preventDefault();
        useStore.getState().setTransformMode("rotate");
        return;
      }

      // S = Resize mode
      if (matchesShortcut(KEYBOARD_SHORTCUTS.RESIZE_MODE, key)) {
        event.preventDefault();
        useStore.getState().setTransformMode("resize");
        return;
      }

      // L = Toggle world/local space (for translate mode)
      if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_SPACE_MODE, key)) {
        event.preventDefault();
        const state = useStore.getState();
        state.setTransformSpace(state.transformSpace === "world" ? "local" : "world");
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
          if (window.confirm("Usunąć całą szafkę i wszystkie jej części?")) {
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
        window.dispatchEvent(new CustomEvent("keyboard:resetCamera"));
        return;
      }

      if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_GRID, key)) {
        event.preventDefault();
        useStore.getState().toggleGrid();
        return;
      }

      // B = Toggle object dimensions (W/H/D)
      if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_OBJECT_DIMENSIONS, key)) {
        event.preventDefault();
        useStore.getState().toggleObjectDimensions();
        return;
      }

      // ============================================================================
      // View mode shortcuts (1-7)
      // ============================================================================

      // 1 = Perspective (3D) view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_PERSPECTIVE, key)) {
        event.preventDefault();
        useStore.getState().switchToPerspective();
        return;
      }

      // 2 = Top view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_TOP, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("TOP");
        return;
      }

      // 3 = Front view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_FRONT, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("FRONT");
        return;
      }

      // 4 = Right view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_RIGHT, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("RIGHT");
        return;
      }

      // 5 = Back view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_BACK, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("BACK");
        return;
      }

      // 6 = Left view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_LEFT, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("LEFT");
        return;
      }

      // 7 = Bottom view
      if (matchesShortcut(KEYBOARD_SHORTCUTS.VIEW_BOTTOM, key)) {
        event.preventDefault();
        useStore.getState().switchToOrthographicView("BOTTOM");
        return;
      }

      // ============================================================================
      // Visibility shortcuts (H, Ctrl+H)
      // ============================================================================

      // Ctrl+H = Toggle cabinet front visibility (hideFronts)
      if (isMod && matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_HIDE_FRONTS, key)) {
        event.preventDefault();
        const state = useStore.getState();

        // If cabinet is selected, toggle its hideFronts
        if (state.selectedCabinetId) {
          const cabinet = state.cabinets.find((c) => c.id === state.selectedCabinetId);
          if (cabinet) {
            state.updateCabinet(cabinet.id, { hideFronts: !cabinet.hideFronts });
          }
          return;
        }

        // If part is selected and belongs to a cabinet, toggle that cabinet's hideFronts
        if (state.selectedPartId) {
          const part = state.parts.find((p) => p.id === state.selectedPartId);
          if (part?.cabinetMetadata?.cabinetId) {
            const cabinet = state.cabinets.find((c) => c.id === part.cabinetMetadata?.cabinetId);
            if (cabinet) {
              state.updateCabinet(cabinet.id, { hideFronts: !cabinet.hideFronts });
            }
          }
        }
        return;
      }

      // H = Hide/show selected parts (without Ctrl/Cmd)
      if (!isMod && matchesShortcut(KEYBOARD_SHORTCUTS.HIDE_SELECTED, key)) {
        event.preventDefault();
        const state = useStore.getState();
        const partIdsToToggle: string[] = [];

        // Collect all part IDs to toggle
        if (state.selectedCabinetId) {
          // Cabinet selected - toggle all its parts
          const cabinet = state.cabinets.find((c) => c.id === state.selectedCabinetId);
          if (cabinet) {
            partIdsToToggle.push(...cabinet.partIds);
          }
        } else if (state.selectedPartIds.size > 0) {
          // Multiple parts selected
          partIdsToToggle.push(...Array.from(state.selectedPartIds));
        } else if (state.selectedPartId) {
          // Single part - check if it has a group
          const part = state.parts.find((p) => p.id === state.selectedPartId);
          if (part?.group) {
            // Toggle all parts in the same group
            const groupParts = state.parts.filter((p) => p.group === part.group);
            partIdsToToggle.push(...groupParts.map((p) => p.id));
          } else {
            partIdsToToggle.push(state.selectedPartId);
          }
        }

        if (partIdsToToggle.length > 0) {
          state.togglePartsHidden(partIdsToToggle);
        }
        return;
      }

      // W = Toggle wall occlusion (smart transparent walls)
      if (matchesShortcut(KEYBOARD_SHORTCUTS.TOGGLE_WALL_OCCLUSION, key)) {
        event.preventDefault();
        useStore.getState().toggleWallOcclusion();
        return;
      }

      // ============================================================================
      // Admin-only shortcuts (for testing)
      // ============================================================================

      // Ctrl+9 = Test credits animation in sidebar (admin only)
      if (isMod && matchesShortcut(KEYBOARD_SHORTCUTS.ADMIN_TEST_CREDITS_ANIMATION, key)) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("admin:testCreditsAnimation"));
        return;
      }

      // Ctrl+0 = Open export dialog and test credits animation (admin only)
      if (isMod && matchesShortcut(KEYBOARD_SHORTCUTS.ADMIN_TEST_EXPORT_DIALOG, key)) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("admin:testExportDialog"));
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        useStore.getState().setShiftPressed(false);
      }
    };

    // Reset on window blur (in case keys are released outside the window)
    const handleBlur = () => {
      useStore.getState().setShiftPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []); // Empty deps - no re-renders! ✅

  return null;
}
