"use client";

import { useTranslations } from "next-intl";
import { track, AnalyticsEvent } from "@meble/analytics";
import { APP_URLS } from "@meble/constants";
import { Container } from "./Container";

interface CtaProps {
  /** Article slug for tracking - if provided, tracks as article CTA */
  articleSlug?: string;
}

export function Cta({ articleSlug }: CtaProps) {
  const t = useTranslations("cta");

  const handleCtaClick = () => {
    if (articleSlug) {
      // Track as article CTA click
      track(AnalyticsEvent.LANDING_ARTICLE_CTA_CLICKED, {
        article_slug: articleSlug,
        cta_location: "bottom",
      });
    } else {
      // Track as regular landing CTA click
      track(AnalyticsEvent.LANDING_CTA_CLICKED, {
        location: "cta_section",
      });
    }
  };

  // Add ref parameter for attribution tracking
  const appUrl = articleSlug
    ? `${APP_URLS.app}?ref=blog-${articleSlug}`
    : APP_URLS.app;

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between w-full max-w-4xl gap-5 mx-auto text-white bg-indigo-600 px-7 py-7 lg:px-12 lg:py-12 lg:flex-nowrap rounded-xl">
        <div className="flex-grow text-center lg:text-left">
          <h2 className="text-2xl font-medium lg:text-3xl">{t("title")}</h2>
          <p className="mt-2 font-medium text-white text-opacity-90 lg:text-xl">
            {t("description")}
          </p>
        </div>
        <div className="flex-shrink-0 w-full text-center lg:w-auto">
          <a
            href={appUrl}
            onClick={handleCtaClick}
            className="inline-block py-3 mx-auto text-lg font-medium text-center text-indigo-600 bg-white rounded-md px-7 lg:px-10 lg:py-5"
          >
            {t("button")}
          </a>
        </div>
      </div>
    </Container>
  );
}
