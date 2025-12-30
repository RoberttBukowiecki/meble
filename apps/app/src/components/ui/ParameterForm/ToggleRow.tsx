/**
 * ToggleRow - Switch toggle with label and optional expandable content
 *
 * Provides consistent styling for boolean toggles with:
 * - Label with optional description
 * - Switch component
 * - Animated expandable content when enabled
 */

import { ReactNode, useId } from "react";
import { Switch, Label } from "@meble/ui";
import { cn } from "@/lib/utils";

interface ToggleRowProps {
  /** Main label text */
  label: string;
  /** Optional description below label */
  description?: string;
  /** Current checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Content to show when toggle is enabled */
  expandedContent?: ReactNode;
  /** Optional icon */
  icon?: React.ComponentType<{ className?: string }>;
  /** Disable the toggle */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  expandedContent,
  icon: Icon,
  disabled = false,
  className,
}: ToggleRowProps) {
  const id = useId();

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          "px-3 py-2.5 rounded-lg",
          "bg-muted/30 hover:bg-muted/50",
          "border border-transparent",
          "transition-all duration-150",
          checked && "bg-primary/5 border-primary/20 dark:bg-primary/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <Icon
              className={cn(
                "h-4 w-4 flex-shrink-0",
                checked ? "text-primary dark:text-primary" : "text-muted-foreground"
              )}
            />
          )}
          <div className="flex-1 min-w-0">
            <Label
              htmlFor={id}
              className={cn(
                "text-sm font-medium cursor-pointer block",
                disabled && "cursor-not-allowed"
              )}
            >
              {label}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      </div>

      {/* Expandable content */}
      {expandedContent && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            checked ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div
            className={cn(
              "ml-4 pl-3 border-l-2 border-primary/20",
              "bg-muted/20 rounded-r-lg p-3",
              "space-y-3"
            )}
          >
            {expandedContent}
          </div>
        </div>
      )}
    </div>
  );
}
