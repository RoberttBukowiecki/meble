"use client";

/**
 * CountertopEditorDialog - Full-screen 2D countertop editor in a dialog
 *
 * Features:
 * - Large interactive diagram for detailed editing
 * - Segment selection and highlighting
 * - CNC operation visualization
 * - Gap mode toggling
 * - Corner marker interaction
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@meble/ui";
import { Badge } from "@meble/ui";
import { Maximize2, Layers } from "lucide-react";
import type { CountertopGroup } from "@/types/countertop";
import { CountertopLayoutDiagram } from "./CountertopLayoutDiagram";
import type { DiagramSelection } from "./CountertopLayoutDiagram/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CountertopEditorDialogProps {
  group: CountertopGroup;
}

/**
 * Get display label for layout type
 */
function getLayoutTypeLabel(layoutType: string): string {
  const labels: Record<string, string> = {
    STRAIGHT: "Prosty",
    L_SHAPE: "Kształt L",
    U_SHAPE: "Kształt U",
    ISLAND: "Wyspa",
    PENINSULA: "Półwysep",
  };
  return labels[layoutType] ?? layoutType;
}

export function CountertopEditorDialog({ group }: CountertopEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<DiagramSelection>({
    type: null,
    id: null,
  });

  const { updateGapMode } = useStore(
    useShallow((state) => ({
      updateGapMode: state.updateGapMode,
    }))
  );

  // Handle selection changes in full editor
  const handleSelect = useCallback((newSelection: DiagramSelection) => {
    setSelection(newSelection);
  }, []);

  // Calculate optimal dialog size based on viewport
  const getDialogSize = () => {
    if (typeof window === "undefined") return { width: 800, height: 600 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      width: Math.min(vw - 80, 1200),
      height: Math.min(vh - 120, 800),
    };
  };

  const dialogSize = getDialogSize();

  return (
    <>
      {/* Small preview that opens the dialog */}
      <div
        className={cn(
          "relative rounded-lg border border-border bg-muted/30 overflow-hidden cursor-pointer",
          "hover:border-primary/50 hover:bg-muted/50 transition-colors",
          "group"
        )}
        onClick={() => setOpen(true)}
      >
        {/* Small non-interactive preview */}
        <CountertopLayoutDiagram
          group={group}
          width={320}
          height={160}
          showEdgeLabels={false}
          showCornerMarkers={false}
          interactive={false}
        />

        {/* Overlay with expand hint */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
            <Maximize2 className="h-3.5 w-3.5" />
            Otwórz edytor 2D
          </div>
        </div>

        {/* Layout type badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-muted/90 text-[9px] font-medium text-muted-foreground">
          {getLayoutTypeLabel(group.layoutType)}
        </div>

        {/* Segment count */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-muted/90 text-[9px] font-medium text-muted-foreground">
          {group.segments.length} seg.
        </div>
      </div>

      {/* Full editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-none p-0 gap-0"
          style={{
            width: dialogSize.width,
            height: dialogSize.height,
          }}
        >
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <div>
                  <DialogTitle className="text-base">{group.name}</DialogTitle>
                  <DialogDescription className="text-xs">
                    Edytor 2D - kliknij elementy aby je wybrać i edytować
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getLayoutTypeLabel(group.layoutType)}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {group.segments.length} {group.segments.length === 1 ? "segment" : "segmenty"}
                </Badge>
                {group.gaps && group.gaps.length > 0 && (
                  <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600">
                    {group.gaps.length} {group.gaps.length === 1 ? "przerwa" : "przerwy"}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 p-4 bg-muted/20 overflow-auto">
            {/* Full interactive diagram */}
            <div className="flex items-center justify-center min-h-full">
              <CountertopLayoutDiagram
                group={group}
                width={dialogSize.width - 64}
                height={dialogSize.height - 140}
                selection={selection}
                onSelect={handleSelect}
                showDimensions
                showEdgeLabels
                showCornerMarkers
                interactive
              />
            </div>
          </div>

          {/* Selection info footer */}
          {selection.type && selection.id && (
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">Zaznaczono:</span>
                {selection.type === "segment" && (
                  <span>
                    Segment:{" "}
                    {group.segments.find((s) => s.id === selection.id)?.name ?? selection.id}
                  </span>
                )}
                {selection.type === "corner" && <span>Narożnik #{selection.id}</span>}
                {selection.type === "cnc" && <span>Operacja CNC: {selection.id}</span>}
                {selection.type === "gap" && (
                  <span>Przerwa: {group.gaps?.find((g) => g.id === selection.id)?.distance}mm</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CountertopEditorDialog;
