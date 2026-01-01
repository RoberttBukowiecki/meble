"use client";

/**
 * WizardTriggerButton - Button to open the furniture design wizard
 *
 * Floating action button that opens the AI-powered design assistant.
 */

import React, { useState } from "react";
import { FurnitureWizard } from "./FurnitureWizard";
import { cn } from "@/lib/utils";

interface WizardTriggerButtonProps {
  /** Callback when wizard completes with output */
  onComplete?: (output: unknown) => void;
  /** Additional CSS classes */
  className?: string;
  /** Button variant */
  variant?: "floating" | "inline" | "sidebar";
}

export function WizardTriggerButton({
  onComplete,
  className,
  variant = "floating",
}: WizardTriggerButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleComplete = (output: unknown) => {
    setIsWizardOpen(false);
    onComplete?.(output);
  };

  const handleClose = () => {
    setIsWizardOpen(false);
  };

  // Floating button (bottom-right corner)
  if (variant === "floating") {
    return (
      <>
        <button
          onClick={() => setIsWizardOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-40",
            "w-14 h-14 rounded-full shadow-lg",
            "bg-gradient-to-br from-blue-500 to-purple-600",
            "hover:from-blue-600 hover:to-purple-700",
            "text-white",
            "flex items-center justify-center",
            "transition-all duration-200",
            "hover:scale-110 hover:shadow-xl",
            "group",
            className
          )}
          title="Asystent projektowania"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Zaprojektuj z asystentem AI
          </span>
        </button>

        <FurnitureWizard
          isOpen={isWizardOpen}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      </>
    );
  }

  // Inline button (for sidebars, toolbars)
  if (variant === "inline") {
    return (
      <>
        <button
          onClick={() => setIsWizardOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-gradient-to-r from-blue-500 to-purple-600",
            "hover:from-blue-600 hover:to-purple-700",
            "text-white font-medium text-sm",
            "transition-all duration-200",
            className
          )}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span>Asystent AI</span>
        </button>

        <FurnitureWizard
          isOpen={isWizardOpen}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      </>
    );
  }

  // Sidebar variant (for sidebar with label)
  return (
    <>
      <button
        onClick={() => setIsWizardOpen(true)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
          "bg-gradient-to-r from-blue-50 to-purple-50",
          "dark:from-blue-900/20 dark:to-purple-900/20",
          "hover:from-blue-100 hover:to-purple-100",
          "dark:hover:from-blue-900/30 dark:hover:to-purple-900/30",
          "border border-blue-200 dark:border-blue-800",
          "transition-all duration-200",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900 dark:text-white">
            Asystent projektowania
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Opisz co chcesz zaprojektować
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <FurnitureWizard
        isOpen={isWizardOpen}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </>
  );
}

export default WizardTriggerButton;
