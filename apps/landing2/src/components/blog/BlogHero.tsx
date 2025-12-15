"use client";

import { useTranslations } from "next-intl";
import { Container } from "../Container";

export function BlogHero() {
  const t = useTranslations("blog");

  return (
    <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-trueGray-900 dark:via-trueGray-800 dark:to-trueGray-900 pt-24 pb-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl" />
      </div>
      <Container className="relative">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-4">
            {t("pretitle")}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {t("title")}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            {t("description")}
          </p>
        </div>
      </Container>
    </div>
  );
}
