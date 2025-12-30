/**
 * FormSection - Reusable section wrapper with icon and title
 *
 * Provides consistent styling for form sections with:
 * - Icon + title header
 * - Subtle card background
 * - Optional collapsible content
 */

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  /** Optional description below title */
  description?: string;
  /** If true, section can be collapsed */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional class names */
  className?: string;
}

export function FormSection({
  icon: Icon,
  title,
  children,
  description,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const headerContent = (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg",
          "bg-gradient-to-br from-amber-100 to-orange-100",
          "dark:from-amber-900/40 dark:to-orange-900/30",
          "text-amber-700 dark:text-amber-400",
          "shadow-sm"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {collapsible && (
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isCollapsed && "-rotate-90"
          )}
        />
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50",
        "bg-gradient-to-b from-card to-card/80",
        "shadow-sm",
        className
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full px-4 py-3 text-left",
            "hover:bg-muted/30 transition-colors duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            !isCollapsed && "border-b border-border/30"
          )}
        >
          {headerContent}
        </button>
      ) : (
        <div className="px-4 py-3 border-b border-border/30">{headerContent}</div>
      )}

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          collapsible && isCollapsed ? "max-h-0" : "max-h-[2000px]"
        )}
      >
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
