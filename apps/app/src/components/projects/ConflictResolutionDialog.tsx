"use client";

/**
 * ConflictResolutionDialog - Dialog for resolving version conflicts
 *
 * Shown when a save fails due to version mismatch (another session saved first).
 * Three options:
 * 1. Keep local - Overwrite server with local changes
 * 2. Keep server - Discard local changes and load server version
 * 3. Keep both - Save local as new project, load server version
 */

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@meble/ui";
import { Button } from "@meble/ui";
import {
  AlertTriangle,
  Download,
  Upload,
  Copy,
  Loader2,
  MonitorSmartphone,
  Cloud,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { ConflictResolution, ProjectData } from "@/types";
import { cn } from "@/lib/utils";

interface ConflictResolutionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
}

interface VersionComparisonProps {
  localData: ProjectData;
  serverData: ProjectData | undefined;
}

function VersionComparison({ localData, serverData }: VersionComparisonProps) {
  const localStats = {
    cabinets: localData.cabinets?.length ?? 0,
    parts: localData.parts?.length ?? 0,
    rooms: localData.rooms?.length ?? 0,
  };

  const serverStats = serverData
    ? {
        cabinets: serverData.cabinets?.length ?? 0,
        parts: serverData.parts?.length ?? 0,
        rooms: serverData.rooms?.length ?? 0,
      }
    : null;

  return (
    <div className="grid grid-cols-2 gap-4 my-4">
      {/* Local version */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MonitorSmartphone className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Twoja wersja</span>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Szafki: {localStats.cabinets}</p>
          <p>Części: {localStats.parts}</p>
          <p>Pomieszczenia: {localStats.rooms}</p>
        </div>
      </div>

      {/* Server version */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="h-5 w-5 text-green-500" />
          <span className="font-medium">Wersja na serwerze</span>
        </div>
        {serverStats ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Szafki: {serverStats.cabinets}</p>
            <p>Części: {serverStats.parts}</p>
            <p>Pomieszczenia: {serverStats.rooms}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        )}
      </div>
    </div>
  );
}

export function ConflictResolutionDialog({ open, onOpenChange }: ConflictResolutionDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ConflictResolution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { syncState, resolveConflict, clearConflict, getProjectData, currentProjectName } =
    useStore(
      useShallow((state) => ({
        syncState: state.syncState,
        resolveConflict: state.resolveConflict,
        clearConflict: state.clearConflict,
        getProjectData: state.getProjectData,
        currentProjectName: state.currentProjectName,
      }))
    );

  const localData = getProjectData();
  const serverData = syncState.conflictData;
  const hasConflict = syncState.status === "conflict";

  // Auto-open when conflict is detected
  useEffect(() => {
    if (hasConflict && !open) {
      onOpenChange(true);
    }
  }, [hasConflict, open, onOpenChange]);

  const handleResolve = useCallback(
    async (resolution: ConflictResolution) => {
      setIsResolving(true);
      setSelectedOption(resolution);
      setError(null);

      try {
        await resolveConflict(resolution);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się rozwiązać konfliktu");
      } finally {
        setIsResolving(false);
        setSelectedOption(null);
      }
    },
    [resolveConflict, onOpenChange]
  );

  const handleCancel = useCallback(() => {
    // Don't close if resolving
    if (isResolving) return;

    // Clear conflict and close - this effectively keeps local changes
    // but marks them as needing to be saved again
    clearConflict();
    onOpenChange(false);
  }, [isResolving, clearConflict, onOpenChange]);

  // Prevent closing while resolving
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isResolving) return;
      if (!newOpen) {
        handleCancel();
      } else {
        onOpenChange(newOpen);
      }
    },
    [isResolving, handleCancel, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => isResolving && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Konflikt wersji
          </DialogTitle>
          <DialogDescription>
            Projekt został zmodyfikowany w innym miejscu (np. w innej karcie przeglądarki lub na
            innym urządzeniu). Wybierz, którą wersję zachować.
          </DialogDescription>
        </DialogHeader>

        <VersionComparison localData={localData} serverData={serverData} />

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <div className="space-y-3">
          {/* Keep local option */}
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start h-auto py-3 px-4",
              selectedOption === "keep_local" && "ring-2 ring-primary"
            )}
            onClick={() => handleResolve("keep_local")}
            disabled={isResolving}
          >
            <div className="flex items-start gap-3">
              {isResolving && selectedOption === "keep_local" ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 mt-0.5" />
              ) : (
                <Upload className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              )}
              <div className="text-left">
                <p className="font-medium">Zachowaj moją wersję</p>
                <p className="text-sm text-muted-foreground">
                  Nadpisz wersję na serwerze swoimi zmianami
                </p>
              </div>
            </div>
          </Button>

          {/* Keep server option */}
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start h-auto py-3 px-4",
              selectedOption === "keep_server" && "ring-2 ring-primary"
            )}
            onClick={() => handleResolve("keep_server")}
            disabled={isResolving}
          >
            <div className="flex items-start gap-3">
              {isResolving && selectedOption === "keep_server" ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 mt-0.5" />
              ) : (
                <Download className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              )}
              <div className="text-left">
                <p className="font-medium">Zachowaj wersję z serwera</p>
                <p className="text-sm text-muted-foreground">
                  Odrzuć swoje zmiany i załaduj wersję z serwera
                </p>
              </div>
            </div>
          </Button>

          {/* Keep both option */}
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start h-auto py-3 px-4",
              selectedOption === "keep_both" && "ring-2 ring-primary"
            )}
            onClick={() => handleResolve("keep_both")}
            disabled={isResolving}
          >
            <div className="flex items-start gap-3">
              {isResolving && selectedOption === "keep_both" ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 mt-0.5" />
              ) : (
                <Copy className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
              )}
              <div className="text-left">
                <p className="font-medium">Zachowaj obie wersje</p>
                <p className="text-sm text-muted-foreground">
                  Zapisz swoją wersję jako &quot;{currentProjectName} (kopia)&quot; i załaduj wersję
                  z serwera
                </p>
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={handleCancel} disabled={isResolving}>
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage conflict resolution dialog state
 */
export function useConflictResolutionDialog() {
  const [open, setOpen] = useState(false);

  const { syncState } = useStore(
    useShallow((state) => ({
      syncState: state.syncState,
    }))
  );

  const hasConflict = syncState.status === "conflict";

  // Auto-open when conflict is detected
  useEffect(() => {
    if (hasConflict) {
      setOpen(true);
    }
  }, [hasConflict]);

  const DialogComponent = useCallback(
    () => <ConflictResolutionDialog open={open} onOpenChange={setOpen} />,
    [open]
  );

  return {
    hasConflict,
    isOpen: open,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
    ConflictResolutionDialogComponent: DialogComponent,
  };
}

export default ConflictResolutionDialog;
