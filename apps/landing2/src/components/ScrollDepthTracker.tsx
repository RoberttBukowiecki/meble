"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track, AnalyticsEvent } from "@meble/analytics";

/**
 * Tracks scroll depth at 25%, 50%, 75%, and 100% thresholds.
 * Each threshold is only tracked once per page view.
 * Resets when pathname changes.
 */
export function ScrollDepthTracker() {
  const pathname = usePathname();
  const trackedDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100] as const;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Avoid division by zero on pages with no scroll
      if (scrollHeight <= 0) return;

      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      thresholds.forEach((threshold) => {
        if (scrollPercent >= threshold && !trackedDepths.current.has(threshold)) {
          trackedDepths.current.add(threshold);
          track(AnalyticsEvent.LANDING_SCROLL_DEPTH, {
            depth: threshold,
            page_path: pathname || "/",
          });
        }
      });
    };

    // Initial check in case page loads already scrolled
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Reset tracked depths when pathname changes
  useEffect(() => {
    trackedDepths.current = new Set();
  }, [pathname]);

  return null;
}
