"use client";

/**
 * ProjectHeader - Shows project name and sync status in the app header
 *
 * CAD-like styling with monospace font for project name.
 * Only visible for authenticated users with an active project.
 */

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@meble/ui";
import {
  FolderOpen,
  ChevronDown,
  Save,
  MoreVertical,
  FileText,
  FolderSearch,
  Download,
  Upload,
} from "lucide-react";

interface ProjectHeaderProps {
  onOpenProjects?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  className?: string;
}

export function ProjectHeader({
  onOpenProjects,
  onExport,
  onImport,
  className,
}: ProjectHeaderProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    currentProjectId,
    currentProjectName,
    syncState,
    isProjectLoading,
    saveProject,
    updateProjectName,
  } = useStore(
    useShallow((state) => ({
      currentProjectId: state.currentProjectId,
      currentProjectName: state.currentProjectName,
      syncState: state.syncState,
      isProjectLoading: state.isProjectLoading,
      saveProject: state.saveProject,
      updateProjectName: state.updateProjectName,
    }))
  );

  // Don't render if no project is loaded
  if (!currentProjectId) {
    return null;
  }

  const handleSave = async () => {
    if (isSaving || isProjectLoading || syncState.status === "synced") return;

    setIsSaving(true);
    try {
      await saveProject();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAs = () => {
    // TODO: Open save-as dialog
    console.log("Save as...");
  };

  const handleRename = () => {
    // TODO: Open rename dialog or inline edit
    const newName = prompt("Nowa nazwa projektu:", currentProjectName);
    if (newName && newName !== currentProjectName) {
      updateProjectName(newName);
    }
  };

  // Disable save while project is loading to prevent race condition with stale revision
  const canSave =
    !isProjectLoading && (syncState.status === "local_only" || syncState.status === "error");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Project name dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-2 font-mono uppercase tracking-wide text-sm h-8 px-2"
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="max-w-[180px] truncate">{currentProjectName}</span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={onOpenProjects}>
            <FolderSearch className="h-4 w-4 mr-2" />
            Moje projekty...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sync status */}
      <SyncStatusIndicator status={syncState.status} size="sm" showLabel={false} />

      {/* Save button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", canSave && "text-yellow-500 hover:text-yellow-400")}
            disabled={!canSave || isSaving}
            onClick={handleSave}
          >
            <Save className={cn("h-4 w-4", isSaving && "animate-pulse")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {canSave ? "Zapisz projekt (Ctrl+S)" : "Wszystko zapisane"}
        </TooltipContent>
      </Tooltip>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleSave} disabled={!canSave}>
            <Save className="h-4 w-4 mr-2" />
            Zapisz
            <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSaveAs}>
            <FileText className="h-4 w-4 mr-2" />
            Zapisz jako...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRename}>
            <FileText className="h-4 w-4 mr-2" />
            Zmień nazwę
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onOpenProjects}>
            <FolderSearch className="h-4 w-4 mr-2" />
            Moje projekty...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Eksportuj JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImport}>
            <Upload className="h-4 w-4 mr-2" />
            Importuj JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProjectHeader;
