/**
 * TemplateCard - Cabinet template selection card
 *
 * Displays a template option with:
 * - Illustration
 * - Title and description
 * - Feature tags
 * - Hover effects
 */

import { CabinetType } from "@/types";
import { cn } from "@/lib/utils";
import { CabinetIllustration } from "../CabinetIllustrations";

// ============================================================================
// FeatureTag Component
// ============================================================================

interface FeatureTagProps {
  children: React.ReactNode;
  variant?: "default" | "highlight";
}

export function FeatureTag({ children, variant = "default" }: FeatureTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
        variant === "highlight"
          ? "bg-primary/15 text-primary dark:bg-primary/25"
          : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// TemplateCard Component
// ============================================================================

export interface TemplateCardProps {
  type: CabinetType;
  title: string;
  description: string;
  features?: string[];
  highlightFeature?: string;
  colorScheme?: "warm" | "cool";
  onClick: () => void;
}

export function TemplateCard({
  type,
  title,
  description,
  features = [],
  highlightFeature,
  colorScheme = "warm",
  onClick,
}: TemplateCardProps) {
  const isWarm = colorScheme === "warm";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left overflow-hidden rounded-xl",
        "border-2 transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-xl",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isWarm
          ? [
              "bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/30",
              "dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/10",
              "border-amber-200/50 dark:border-amber-800/30",
              "hover:border-amber-400 dark:hover:border-amber-600",
              "hover:shadow-amber-500/10",
            ]
          : [
              "bg-gradient-to-br from-slate-50/80 via-zinc-50/50 to-stone-50/30",
              "dark:from-slate-950/30 dark:via-zinc-950/20 dark:to-stone-950/10",
              "border-slate-200/50 dark:border-slate-800/30",
              "hover:border-slate-400 dark:hover:border-slate-600",
              "hover:shadow-slate-500/10",
            ]
      )}
    >
      {/* Blueprint grid pattern overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.015] dark:opacity-[0.03]",
          "bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)]",
          "bg-[size:16px_16px]"
        )}
      />

      {/* Hover glow */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          isWarm
            ? "bg-gradient-to-br from-amber-400/5 to-orange-400/10"
            : "bg-gradient-to-br from-slate-400/5 to-zinc-400/10"
        )}
      />

      <div className="relative z-10 flex gap-4 p-4">
        {/* Illustration */}
        <div
          className={cn(
            "flex-shrink-0 w-20 h-[70px] rounded-lg flex items-center justify-center",
            "transition-all duration-300",
            isWarm
              ? [
                  "bg-gradient-to-br from-amber-100 to-orange-100",
                  "dark:from-amber-900/40 dark:to-orange-900/30",
                  "text-amber-700 dark:text-amber-300",
                  "group-hover:from-amber-200 group-hover:to-orange-200",
                  "dark:group-hover:from-amber-800/50 dark:group-hover:to-orange-800/40",
                ]
              : [
                  "bg-gradient-to-br from-slate-100 to-zinc-100",
                  "dark:from-slate-900/40 dark:to-zinc-900/30",
                  "text-slate-600 dark:text-slate-300",
                  "group-hover:from-slate-200 group-hover:to-zinc-200",
                  "dark:group-hover:from-slate-800/50 dark:group-hover:to-zinc-800/40",
                ]
          )}
        >
          <CabinetIllustration type={type} className="w-full h-full p-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3
            className={cn(
              "text-sm font-bold tracking-tight mb-1 transition-colors duration-200",
              isWarm
                ? "text-amber-950 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-50"
                : "text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-50"
            )}
          >
            {title}
          </h3>

          <p
            className={cn(
              "text-xs leading-relaxed mb-2 line-clamp-2",
              isWarm
                ? "text-amber-800/60 dark:text-amber-200/50"
                : "text-slate-600/60 dark:text-slate-300/50"
            )}
          >
            {description}
          </p>

          {/* Feature tags */}
          {(features.length > 0 || highlightFeature) && (
            <div className="flex flex-wrap gap-1.5">
              {highlightFeature && <FeatureTag variant="highlight">{highlightFeature}</FeatureTag>}
              {features.map((feature, i) => (
                <FeatureTag key={i}>{feature}</FeatureTag>
              ))}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div
          className={cn(
            "flex-shrink-0 self-center w-8 h-8 rounded-full flex items-center justify-center",
            "transition-all duration-300",
            isWarm
              ? [
                  "bg-amber-100 dark:bg-amber-900/30",
                  "text-amber-500 dark:text-amber-400",
                  "group-hover:bg-amber-500 group-hover:text-white",
                  "dark:group-hover:bg-amber-600",
                ]
              : [
                  "bg-slate-100 dark:bg-slate-900/30",
                  "text-slate-400 dark:text-slate-500",
                  "group-hover:bg-slate-600 group-hover:text-white",
                  "dark:group-hover:bg-slate-500",
                ]
          )}
        >
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
