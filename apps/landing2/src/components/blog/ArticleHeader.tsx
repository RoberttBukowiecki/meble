"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BlogArticle, BLOG_CATEGORIES } from "@/lib/blog-data";
import { Container } from "../Container";
import {
  CalendarIcon,
  ClockIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface ArticleHeaderProps {
  article: BlogArticle;
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const locale = useLocale() as "pl" | "en";
  const t = useTranslations("blog");
  const content = article.content[locale];
  const category = BLOG_CATEGORIES[article.category][locale];

  const formattedDate = new Date(article.publishedAt).toLocaleDateString(
    locale === "pl" ? "pl-PL" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="relative">
      {/* Hero Image */}
      <div className="relative h-[40vh] md:h-[50vh] lg:h-[60vh] min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-10" />
        <Image
          src={article.image.src}
          alt={article.image.alt[locale]}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

        {/* Back button */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {t("backToBlog")}
          </Link>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-16">
          <Container>
            <div className="max-w-4xl">
              {/* Category badge */}
              <span className="inline-block px-3 py-1 text-sm font-semibold text-white bg-indigo-600 rounded-full mb-4">
                {category}
              </span>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {content.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-white/80">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5" />
                  {article.readingTime} {t("minRead")}
                </span>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Excerpt */}
      <Container className="py-8 border-b border-gray-200 dark:border-trueGray-700">
        <div className="max-w-4xl mx-auto">
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
            {content.excerpt}
          </p>
        </div>
      </Container>
    </div>
  );
}
