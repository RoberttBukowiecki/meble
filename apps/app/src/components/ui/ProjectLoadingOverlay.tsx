"use client";

/**
 * ProjectLoadingOverlay - Full-screen overlay shown during project loading
 *
 * Displays a loading spinner with message when isProjectLoading is true.
 * Prevents user interaction with the scene while project data is being fetched.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function ProjectLoadingOverlay({
  isLoading,
  message = "Wczytywanie projektu...",
  className,
}: ProjectLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-8 shadow-lg border border-border">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

export default ProjectLoadingOverlay;
