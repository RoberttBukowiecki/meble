"use client";

/**
 * UnsavedChangesDialog - Confirmation dialog for actions that would lose unsaved changes
 *
 * Three options:
 * 1. Save and continue - saves changes then proceeds
 * 2. Discard - proceeds without saving
 * 3. Cancel - returns to current state
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@meble/ui";
import { Save, Trash2, X, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

export type UnsavedChangesAction = "save" | "discard" | "cancel";

interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** What action triggered this dialog (for contextual messaging) */
  actionDescription?: string;
  /** Callback when user makes a choice */
  onAction: (action: UnsavedChangesAction) => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  actionDescription = "kontynuować",
  onAction,
}: UnsavedChangesDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { saveProject } = useStore(
    useShallow((state) => ({
      saveProject: state.saveProject,
    }))
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveProject();

      if (result.success) {
        onAction("save");
        onOpenChange(false);
      } else {
        // Handle specific error types
        if (result.error === "CONFLICT") {
          setSaveError("Wykryto konflikt wersji. Odśwież stronę i spróbuj ponownie.");
        } else if (result.error === "NETWORK") {
          setSaveError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
        } else {
          setSaveError(result.message || "Nie udało się zapisać projektu.");
        }
      }
    } catch (err) {
      setSaveError("Nieoczekiwany błąd podczas zapisywania.");
    } finally {
      setIsSaving(false);
    }
  }, [saveProject, onAction, onOpenChange]);

  const handleDiscard = useCallback(() => {
    onAction("discard");
    onOpenChange(false);
  }, [onAction, onOpenChange]);

  const handleCancel = useCallback(() => {
    onAction("cancel");
    onOpenChange(false);
  }, [onAction, onOpenChange]);

  // Prevent closing while saving
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isSaving) return;
      if (!newOpen) {
        handleCancel();
      } else {
        onOpenChange(newOpen);
      }
    },
    [isSaving, handleCancel, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => isSaving && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-yellow-500" />
            Niezapisane zmiany
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Masz niezapisane zmiany w projekcie. Co chcesz zrobić przed
                {actionDescription ? ` ${actionDescription}` : ""}?
              </p>
              {saveError && <p className="text-destructive text-sm font-medium">{saveError}</p>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>

          <Button variant="destructive" onClick={handleDiscard} disabled={isSaving}>
            <Trash2 className="h-4 w-4 mr-2" />
            Odrzuć zmiany
          </Button>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Zapisywanie..." : "Zapisz i kontynuuj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage UnsavedChangesDialog state
 * Returns a function that shows the dialog and returns a promise with the user's choice
 */
export function useUnsavedChangesDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    actionDescription?: string;
    resolve?: (action: UnsavedChangesAction) => void;
  }>({ open: false });

  const { syncState, currentProjectId, isProjectLoading } = useStore(
    useShallow((state) => ({
      syncState: state.syncState,
      currentProjectId: state.currentProjectId,
      isProjectLoading: state.isProjectLoading,
    }))
  );

  const hasUnsavedChanges =
    currentProjectId !== null &&
    !isProjectLoading &&
    (syncState.status === "local_only" || syncState.status === "error");

  /**
   * Shows the dialog and returns a promise that resolves with the user's choice
   * If there are no unsaved changes, resolves immediately with "save" (proceed)
   */
  const confirmUnsavedChanges = useCallback(
    (actionDescription?: string): Promise<UnsavedChangesAction> => {
      if (!hasUnsavedChanges) {
        return Promise.resolve("save"); // No unsaved changes, proceed
      }

      return new Promise((resolve) => {
        setDialogState({
          open: true,
          actionDescription,
          resolve,
        });
      });
    },
    [hasUnsavedChanges]
  );

  const handleAction = useCallback(
    (action: UnsavedChangesAction) => {
      dialogState.resolve?.(action);
      setDialogState({ open: false });
    },
    [dialogState.resolve]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        dialogState.resolve?.("cancel");
        setDialogState({ open: false });
      }
    },
    [dialogState.resolve]
  );

  const DialogComponent = useCallback(
    () => (
      <UnsavedChangesDialog
        open={dialogState.open}
        onOpenChange={handleOpenChange}
        actionDescription={dialogState.actionDescription}
        onAction={handleAction}
      />
    ),
    [dialogState.open, dialogState.actionDescription, handleOpenChange, handleAction]
  );

  return {
    hasUnsavedChanges,
    confirmUnsavedChanges,
    UnsavedChangesDialogComponent: DialogComponent,
  };
}

export default UnsavedChangesDialog;
