/**
 * CategoryStep - First step: category selection
 *
 * Displays:
 * - Kitchen category card
 * - Furniture category card
 */

import { Box, Warehouse, ArrowLeftRight, ChefHat, Armchair } from "lucide-react";
import { cn } from "@/lib/utils";

export type Category = "kitchen" | "furniture" | null;

interface CategoryStepProps {
  onSelect: (category: Category) => void;
}

export function CategoryStep({ onSelect }: CategoryStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Kitchen Category Card */}
      <button
        onClick={() => onSelect("kitchen")}
        className={cn(
          "group relative overflow-hidden rounded-2xl p-6 text-left",
          "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50",
          "dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20",
          "border-2 border-amber-200/60 dark:border-amber-800/40",
          "hover:border-amber-400 dark:hover:border-amber-600",
          "hover:shadow-xl hover:shadow-amber-500/10",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1"
        )}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute top-4 right-4 w-32 h-32 border-2 border-current rounded-full" />
          <div className="absolute bottom-4 left-4 w-20 h-20 border-2 border-current rounded-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-orange-400/0 group-hover:from-amber-400/10 group-hover:to-orange-400/5 transition-all duration-500" />

        {/* Content */}
        <div className="relative z-10">
          <div
            className={cn(
              "inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4",
              "bg-gradient-to-br from-amber-500 to-orange-600",
              "text-white shadow-lg shadow-amber-500/25",
              "group-hover:scale-110 group-hover:shadow-xl",
              "transition-all duration-300"
            )}
          >
            <ChefHat className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-amber-950 dark:text-amber-100 mb-2">Kuchnia</h3>
          <p className="text-sm text-amber-800/70 dark:text-amber-200/60 mb-4">
            Szafki dolne, wiszące i narożne do kompletnej zabudowy kuchennej
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            <Box className="w-3.5 h-3.5" />3 szablony
          </span>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 transition-all duration-300">
          <ArrowLeftRight className="w-5 h-5 text-amber-600 group-hover:text-white rotate-45 transition-colors" />
        </div>
      </button>

      {/* Furniture Category Card */}
      <button
        onClick={() => onSelect("furniture")}
        className={cn(
          "group relative overflow-hidden rounded-2xl p-6 text-left",
          "bg-gradient-to-br from-slate-50 via-zinc-50 to-stone-50",
          "dark:from-slate-950/40 dark:via-zinc-950/30 dark:to-stone-950/20",
          "border-2 border-slate-200/60 dark:border-slate-800/40",
          "hover:border-slate-400 dark:hover:border-slate-600",
          "hover:shadow-xl hover:shadow-slate-500/10",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1"
        )}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute top-4 right-4 w-32 h-32 border-2 border-current rounded-lg rotate-12" />
          <div className="absolute bottom-4 left-4 w-20 h-20 border-2 border-current rounded-lg -rotate-6" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-400/0 to-zinc-400/0 group-hover:from-slate-400/10 group-hover:to-zinc-400/5 transition-all duration-500" />

        {/* Content */}
        <div className="relative z-10">
          <div
            className={cn(
              "inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4",
              "bg-gradient-to-br from-slate-600 to-zinc-700",
              "text-white shadow-lg shadow-slate-500/25",
              "group-hover:scale-110 group-hover:shadow-xl",
              "transition-all duration-300"
            )}
          >
            <Armchair className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Meble</h3>
          <p className="text-sm text-slate-600/70 dark:text-slate-300/60 mb-4">
            Szafy, regały i komody do salonu, sypialni i biura
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">
            <Warehouse className="w-3.5 h-3.5" />3 szablony
          </span>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center group-hover:bg-slate-600 transition-all duration-300">
          <ArrowLeftRight className="w-5 h-5 text-slate-500 group-hover:text-white rotate-45 transition-colors" />
        </div>
      </button>
    </div>
  );
}
