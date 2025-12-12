"use client";

import { useTranslations } from "next-intl";
import { Container } from "./Container";

interface SectionTitleProps {
  pretitleKey?: string;
  titleKey?: string;
  descriptionKey?: string;
  align?: "left" | "center";
}

export function SectionTitle({
  pretitleKey,
  titleKey,
  descriptionKey,
  align = "center",
}: SectionTitleProps) {
  const t = useTranslations();

  return (
    <Container
      className={`flex w-full flex-col mt-4 ${
        align === "left" ? "" : "items-center justify-center text-center"
      }`}
    >
      {pretitleKey && (
        <div className="text-sm font-bold tracking-wider text-indigo-600 uppercase">
          {t(pretitleKey)}
        </div>
      )}

      {titleKey && (
        <h2 className="max-w-2xl mt-3 text-3xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight lg:text-4xl dark:text-white">
          {t(titleKey)}
        </h2>
      )}

      {descriptionKey && (
        <p className="max-w-2xl py-4 text-lg leading-normal text-gray-500 lg:text-xl xl:text-xl dark:text-gray-300">
          {t(descriptionKey)}
        </p>
      )}
    </Container>
  );
}
