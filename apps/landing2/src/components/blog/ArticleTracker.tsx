"use client";

import { useEffect } from "react";
import { track, AnalyticsEvent } from "@meble/analytics";

interface ArticleTrackerProps {
  slug: string;
  title: string;
  category?: string;
}

/**
 * Client component that tracks article page views
 * Also sets up the article context for CTA tracking
 */
export function ArticleTracker({ slug, title, category }: ArticleTrackerProps) {
  useEffect(() => {
    // Track article view
    track(AnalyticsEvent.LANDING_ARTICLE_VIEW, {
      article_slug: slug,
      article_title: title,
      category,
    });

    // Store article info in sessionStorage for CTA tracking
    sessionStorage.setItem(
      "current_article",
      JSON.stringify({ slug, title, category })
    );

    return () => {
      // Clean up when leaving article
      sessionStorage.removeItem("current_article");
    };
  }, [slug, title, category]);

  return null;
}

/**
 * Get current article info from sessionStorage
 */
export function getCurrentArticle(): {
  slug: string;
  title: string;
  category?: string;
} | null {
  if (typeof window === "undefined") return null;

  const data = sessionStorage.getItem("current_article");
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
