"use client";

/**
 * ProjectListDialog - Modal to browse and manage user's projects
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types";
import {
  listProjects,
  archiveProject,
  deleteProject,
  duplicateProject,
} from "@/lib/supabase/projects";
import { ProjectCard } from "./ProjectCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@meble/ui";
import { Search, Plus, FolderOpen, ChevronDown, Loader2 } from "lucide-react";

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProject: (projectId: string) => void;
  onCreateNew: () => void;
}

type SortOption = "last_opened_at" | "updated_at" | "name" | "created_at";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "last_opened_at", label: "Ostatnio otwarte" },
  { value: "updated_at", label: "Ostatnio modyfikowane" },
  { value: "name", label: "Nazwa (A-Z)" },
  { value: "created_at", label: "Data utworzenia" },
];

export function ProjectListDialog({
  open,
  onOpenChange,
  onOpenProject,
  onCreateNew,
}: ProjectListDialogProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("last_opened_at");

  // Load projects when dialog opens
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, sortBy]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await listProjects({
        orderBy: sortBy,
        orderDirection: sortBy === "name" ? "asc" : "desc",
      });

      if (error) {
        console.error("Failed to load projects:", error);
        return;
      }

      setProjects(data ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (projectId: string) => {
    onOpenProject(projectId);
    onOpenChange(false);
  };

  const handleDuplicate = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newName = `${project.name} (kopia)`;
    const { error } = await duplicateProject(projectId, newName);

    if (!error) {
      loadProjects();
    }
  };

  const handleArchive = async (projectId: string) => {
    const { error } = await archiveProject(projectId);
    if (!error) {
      loadProjects();
    }
  };

  const handleDelete = async (projectId: string) => {
    const confirmed = confirm(
      "Czy na pewno chcesz usunąć ten projekt? Ta operacja jest nieodwracalna."
    );
    if (!confirmed) return;

    const { error } = await deleteProject(projectId);
    if (!error) {
      loadProjects();
    }
  };

  const handleCreateNew = () => {
    onCreateNew();
    onOpenChange(false);
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? "Sortuj";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Moje projekty</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-4 py-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj projektów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {currentSortLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(sortBy === option.value && "bg-accent")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New project button */}
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nowy projekt
          </Button>
        </div>

        {/* Projects grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState hasSearch={searchQuery.length > 0} onCreateNew={handleCreateNew} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={handleOpen}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ hasSearch, onCreateNew }: { hasSearch: boolean; onCreateNew: () => void }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">Nie znaleziono projektów</h3>
        <p className="text-sm text-muted-foreground">Spróbuj zmienić kryteria wyszukiwania</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-1">Nie masz jeszcze żadnych projektów</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Utwórz swój pierwszy projekt meblowy i zacznij projektować w 3D.
      </p>
      <Button onClick={onCreateNew} className="gap-2">
        <Plus className="h-4 w-4" />
        Utwórz pierwszy projekt
      </Button>
    </div>
  );
}

export default ProjectListDialog;
