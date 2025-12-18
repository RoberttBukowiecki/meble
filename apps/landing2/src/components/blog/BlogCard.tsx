"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BlogArticle, BLOG_CATEGORIES } from "@/lib/blog-data";
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";

interface BlogCardProps {
  article: BlogArticle;
  featured?: boolean;
}

export function BlogCard({ article, featured = false }: BlogCardProps) {
  const locale = useLocale() as "pl" | "en";
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

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl bg-white dark:bg-trueGray-800 shadow-lg hover:shadow-xl transition-all duration-300">
        <Link href={`/blog/${article.slug}`} className="block">
          <div className="relative aspect-[16/9] min-h-[16rem] md:min-h-[20rem] overflow-hidden bg-gray-100 dark:bg-trueGray-900">
            <div className="absolute inset-3 md:inset-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 rounded-xl pointer-events-none" />
            <div className="absolute inset-3 md:inset-4">
              <Image
                src={article.image.src}
                alt={article.image.alt[locale]}
                fill
                className="object-contain transition-transform duration-500 group-hover:scale-105 rounded-xl"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="absolute top-5 left-5 md:top-6 md:left-6 z-20">
              <span className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full">
                {category}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {article.readingTime} min
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {content.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
              {content.excerpt}
            </p>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex flex-col bg-white dark:bg-trueGray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      <Link href={`/blog/${article.slug}`} className="block">
        <div className="relative aspect-[16/9] min-h-[12rem] overflow-hidden bg-gray-100 dark:bg-trueGray-900">
          <Image
            src={article.image.src}
            alt={article.image.alt[locale]}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-semibold text-white bg-indigo-600/90 rounded-full">
              {category}
            </span>
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {article.readingTime} min
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {content.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 flex-1">
            {content.excerpt}
          </p>
          <div className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:underline">
            {locale === "pl" ? "Czytaj więcej →" : "Read more →"}
          </div>
        </div>
      </Link>
    </article>
  );
}
