"use client";

/**
 * TopBar - macOS-style menubar above the 3D scene
 *
 * Features:
 * - Project name (editable inline)
 * - File menu (New, Open, Save, Save As)
 * - Sync status indicator
 * - Save to cloud for authenticated users
 */

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "@/components/projects/SyncStatusIndicator";
import { ProjectListDialog } from "@/components/projects/ProjectListDialog";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@meble/ui";
import { ChevronDown, File, FolderOpen, Save, FileText, Cloud, Plus } from "lucide-react";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const [projectListOpen, setProjectListOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { isAuthenticated } = useAuth();

  const {
    currentProjectId,
    currentProjectName,
    syncState,
    parts,
    saveProject,
    loadProject,
    createNewProject,
    updateProjectName,
  } = useStore(
    useShallow((state) => ({
      currentProjectId: state.currentProjectId,
      currentProjectName: state.currentProjectName,
      syncState: state.syncState,
      parts: state.parts,
      saveProject: state.saveProject,
      loadProject: state.loadProject,
      createNewProject: state.createNewProject,
      updateProjectName: state.updateProjectName,
    }))
  );

  const hasUnsavedWork = parts.length > 0;
  const canSave = syncState.status === "local_only" || syncState.status === "error";

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await saveProject();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAs = () => {
    // For "Save As", open new project dialog with current data
    setNewProjectOpen(true);
  };

  const handleOpenProject = async (projectId: string) => {
    await loadProject(projectId);
    setProjectListOpen(false);
  };

  const handleNewProject = () => {
    setNewProjectOpen(true);
  };

  const handleProjectCreated = () => {
    setNewProjectOpen(false);
  };

  // If not authenticated, show simplified bar with "Save to cloud" prompt
  if (!isAuthenticated) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-between h-8 px-3 bg-background/95 backdrop-blur border-b border-border",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide">
              Niezapisany projekt
            </span>
            {hasUnsavedWork && (
              <span className="text-xs text-yellow-500">({parts.length} części)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Zaloguj się, aby zapisać projekt w chmurze
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between h-8 px-3 bg-background/95 backdrop-blur border-b border-border",
          className
        )}
      >
        {/* Left side: File menu and project name */}
        <div className="flex items-center gap-2">
          {/* File Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1.5">
                <File className="h-3 w-3" />
                Plik
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleNewProject}>
                <Plus className="h-4 w-4 mr-2" />
                Nowy projekt
                <span className="ml-auto text-xs text-muted-foreground">⌘N</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProjectListOpen(true)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Otwórz...
                <span className="ml-auto text-xs text-muted-foreground">⌘O</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleSave} disabled={!canSave || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Zapisz
                <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveAs}>
                <FileText className="h-4 w-4 mr-2" />
                Zapisz jako...
                <span className="ml-auto text-xs text-muted-foreground">⇧⌘S</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="h-4 w-px bg-border mx-1" />

          {/* Project name */}
          {currentProjectId ? (
            <button
              onClick={() => {
                const newName = prompt("Nazwa projektu:", currentProjectName);
                if (newName && newName !== currentProjectName) {
                  updateProjectName(newName);
                }
              }}
              className="font-mono text-xs uppercase tracking-wide hover:text-primary transition-colors px-1"
            >
              {currentProjectName}
            </button>
          ) : hasUnsavedWork ? (
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide px-1">
              Niezapisany projekt ({parts.length} części)
            </span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide px-1">
              Brak projektu
            </span>
          )}
        </div>

        {/* Right side: Sync status and save button */}
        <div className="flex items-center gap-2">
          {currentProjectId && (
            <SyncStatusIndicator status={syncState.status} size="sm" showLabel={false} />
          )}

          {/* Quick save button when there are unsaved changes */}
          {(canSave || (hasUnsavedWork && !currentProjectId)) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1.5 text-yellow-500 hover:text-yellow-400"
              onClick={currentProjectId ? handleSave : handleSaveAs}
              disabled={isSaving}
            >
              <Cloud className="h-3 w-3" />
              {currentProjectId ? "Zapisz" : "Zapisz w chmurze"}
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ProjectListDialog
        open={projectListOpen}
        onOpenChange={setProjectListOpen}
        onOpenProject={handleOpenProject}
        onCreateNew={() => {
          setProjectListOpen(false);
          setNewProjectOpen(true);
        }}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreated={handleProjectCreated}
      />
    </>
  );
}

export default TopBar;
