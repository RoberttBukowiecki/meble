"use client";

/**
 * View Mode Panel
 * UI component for switching between perspective (3D) and orthographic (2D) views
 */

import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@meble/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@meble/ui";
import {
  Box,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  Layers,
} from "lucide-react";
import type { OrthographicView } from "@/types";
import { ORTHOGRAPHIC_VIEW_CONFIGS, ORTHOGRAPHIC_VIEWS } from "@/types";
import { formatShortcutLabel, KEYBOARD_SHORTCUTS } from "@/lib/config";

/**
 * Get icon for orthographic view
 */
function getViewIcon(view: OrthographicView) {
  switch (view) {
    case "TOP":
      return <ArrowDown className="h-4 w-4 mr-2" />;
    case "BOTTOM":
      return <ArrowUp className="h-4 w-4 mr-2" />;
    case "FRONT":
      return <Eye className="h-4 w-4 mr-2" />;
    case "BACK":
      return <Eye className="h-4 w-4 mr-2 rotate-180" />;
    case "LEFT":
      return <ArrowRight className="h-4 w-4 mr-2" />;
    case "RIGHT":
      return <ArrowLeft className="h-4 w-4 mr-2" />;
    default:
      return <Layers className="h-4 w-4 mr-2" />;
  }
}

/**
 * Get keyboard shortcut for view
 */
function getViewShortcut(view: OrthographicView | "perspective"): string | undefined {
  const shortcuts: Record<string, keyof typeof KEYBOARD_SHORTCUTS> = {
    perspective: "VIEW_PERSPECTIVE",
    TOP: "VIEW_TOP",
    FRONT: "VIEW_FRONT",
    RIGHT: "VIEW_RIGHT",
    BACK: "VIEW_BACK",
    LEFT: "VIEW_LEFT",
    BOTTOM: "VIEW_BOTTOM",
  };

  const shortcutKey = shortcuts[view];
  if (shortcutKey && KEYBOARD_SHORTCUTS[shortcutKey]) {
    return formatShortcutLabel(KEYBOARD_SHORTCUTS[shortcutKey]);
  }
  return undefined;
}

/**
 * View Mode Panel component
 * Displays current view mode and allows switching between views
 */
export function ViewModePanel() {
  const {
    cameraMode,
    orthographicView,
    setCameraMode,
    setOrthographicView,
    switchToOrthographicView,
    switchToPerspective,
  } = useStore(
    useShallow((state) => ({
      cameraMode: state.cameraMode,
      orthographicView: state.orthographicView,
      setCameraMode: state.setCameraMode,
      setOrthographicView: state.setOrthographicView,
      switchToOrthographicView: state.switchToOrthographicView,
      switchToPerspective: state.switchToPerspective,
    }))
  );

  const isPerspective = cameraMode === "perspective";
  const currentViewLabel = isPerspective ? "3D" : ORTHOGRAPHIC_VIEW_CONFIGS[orthographicView].label;

  return (
    <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 md:h-8 gap-1 px-2"
            title="Zmiana widoku"
          >
            {isPerspective ? (
              <Box className="h-5 w-5 md:h-4 md:w-4" />
            ) : (
              <Layers className="h-5 w-5 md:h-4 md:w-4" />
            )}
            <span className="hidden md:inline text-xs">{currentViewLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Perspective (3D) view */}
          <DropdownMenuItem
            onClick={switchToPerspective}
            className={isPerspective ? "bg-accent" : ""}
          >
            <Box className="h-4 w-4 mr-2" />
            <span className="flex-1">Widok 3D</span>
            {getViewShortcut("perspective") && (
              <span className="text-xs text-muted-foreground ml-2">
                {getViewShortcut("perspective")}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Widoki ortograficzne
          </DropdownMenuLabel>

          {/* Orthographic views */}
          {ORTHOGRAPHIC_VIEWS.map((view) => {
            const config = ORTHOGRAPHIC_VIEW_CONFIGS[view];
            const isActive = !isPerspective && orthographicView === view;
            const shortcut = getViewShortcut(view);

            return (
              <DropdownMenuItem
                key={view}
                onClick={() => switchToOrthographicView(view)}
                className={isActive ? "bg-accent" : ""}
              >
                {getViewIcon(view)}
                <span className="flex-1">{config.label}</span>
                {shortcut && <span className="text-xs text-muted-foreground ml-2">{shortcut}</span>}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
