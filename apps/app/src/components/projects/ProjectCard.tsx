"use client";

/**
 * ProjectCard - Project card with CAD-like styling
 *
 * Features:
 * - Blueprint grid overlay on hover
 * - Monospace font for project name and stats
 * - Quick action menu
 */

import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@meble/ui";
import { FolderOpen, MoreVertical, Play, Copy, Archive, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface ProjectCardProps {
  project: ProjectListItem;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

/**
 * Blueprint grid style for hover overlay
 */
const blueprintGridStyle = {
  backgroundImage: `
    linear-gradient(to right, hsl(var(--primary) / 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--primary) / 0.08) 1px, transparent 1px)
  `,
  backgroundSize: "12px 12px",
};

/**
 * Format relative time in Polish
 */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: pl });
  } catch {
    return dateStr;
  }
}

export function ProjectCard({
  project,
  onOpen,
  onDuplicate,
  onArchive,
  onDelete,
  className,
}: ProjectCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden",
        "hover:shadow-lg transition-shadow cursor-pointer",
        className
      )}
      onClick={() => onOpen(project.id)}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[16/10] bg-muted">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        {/* Blueprint grid overlay - visible on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={blueprintGridStyle}
        />
      </div>

      {/* Project info - CAD style */}
      <div className="p-3 space-y-1">
        <h3 className="font-mono text-sm font-medium uppercase tracking-wide truncate">
          {project.name}
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          {project.partsCount ?? 0} części · {project.cabinetsCount ?? 0} szafek
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(project.lastOpenedAt || project.updatedAt)}
        </p>
      </div>

      {/* Quick action button - appears on hover */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 h-7 w-7",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-background/80 backdrop-blur-sm hover:bg-background"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onOpen(project.id)}>
            <Play className="h-4 w-4 mr-2" />
            Otwórz
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(project.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplikuj
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => onArchive(project.id)}>
            <Archive className="h-4 w-4 mr-2" />
            Archiwizuj
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(project.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProjectCard;
