/**
 * ConfigItem - Card-style configuration item with action button
 *
 * Used for equipment items like:
 * - Fronty boczne
 * - Panele ozdobne
 * - Wnętrze (zaawansowane)
 * - Nóżki
 * - Blat kuchenny
 */

import { ReactNode } from "react";
import { Button } from "@meble/ui";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigItemProps {
  /** Item title */
  title: string;
  /** Current configuration summary */
  summary: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Click handler for configure button */
  onConfigure: () => void;
  /** Optional alert/warning content */
  alert?: ReactNode;
  /** Whether this item is configured (has non-default values) */
  isConfigured?: boolean;
  /** Custom action button label */
  actionLabel?: string;
  /** Additional class names */
  className?: string;
}

export function ConfigItem({
  title,
  summary,
  icon: Icon,
  onConfigure,
  alert,
  isConfigured = false,
  actionLabel = "Konfiguruj",
  className,
}: ConfigItemProps) {
  return (
    <div
      className={cn(
        "group relative",
        "flex items-start gap-3 p-3",
        "rounded-lg border",
        "transition-all duration-150",
        isConfigured
          ? "bg-primary/5 border-primary/20 dark:bg-primary/10"
          : "bg-card border-border/50 hover:border-border hover:bg-muted/30",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center",
          "w-9 h-9 rounded-lg flex-shrink-0",
          "transition-colors duration-150",
          isConfigured
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-sm font-medium text-foreground leading-tight">{title}</h4>
        <p
          className={cn(
            "text-xs mt-0.5 leading-relaxed",
            isConfigured ? "text-primary/80 dark:text-primary/70" : "text-muted-foreground"
          )}
        >
          {summary}
        </p>
        {alert && <div className="mt-2">{alert}</div>}
      </div>

      {/* Action */}
      <Button
        variant={isConfigured ? "default" : "outline"}
        size="sm"
        onClick={onConfigure}
        className={cn(
          "flex-shrink-0 h-8 px-3 text-xs",
          !isConfigured && "opacity-70 group-hover:opacity-100"
        )}
      >
        <Settings2 className="h-3 w-3 mr-1.5" />
        {actionLabel}
      </Button>
    </div>
  );
}

// ============================================================================
// ConfigToggleItem - ConfigItem variant with toggle instead of button
// ============================================================================

interface ConfigToggleItemProps {
  /** Item title */
  title: string;
  /** Current configuration summary */
  summary: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Current checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Optional additional content when enabled */
  expandedContent?: ReactNode;
  /** Optional badge */
  badge?: ReactNode;
  /** Additional class names */
  className?: string;
}

export function ConfigToggleItem({
  title,
  summary,
  icon: Icon,
  checked,
  onChange,
  expandedContent,
  badge,
  className,
}: ConfigToggleItemProps) {
  const { Switch } = require("@meble/ui");

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "group relative",
          "flex items-center gap-3 p-3",
          "rounded-lg border",
          "transition-all duration-150",
          checked
            ? "bg-primary/5 border-primary/20 dark:bg-primary/10"
            : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center",
            "w-9 h-9 rounded-lg flex-shrink-0",
            "transition-colors duration-150",
            checked
              ? "bg-primary/10 text-primary dark:bg-primary/20"
              : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground leading-tight">{title}</h4>
            {badge}
          </div>
          <p
            className={cn("text-xs mt-0.5", checked ? "text-primary/80" : "text-muted-foreground")}
          >
            {summary}
          </p>
        </div>

        {/* Toggle */}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>

      {/* Expanded content */}
      {expandedContent && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            checked ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="ml-12 space-y-3">{expandedContent}</div>
        </div>
      )}
    </div>
  );
}
