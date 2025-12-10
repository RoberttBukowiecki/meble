"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Locale, locales } from "@meble/i18n";

interface Props {
  locale: Locale;
}

const LocaleSwitcher: React.FC<Props> = ({ locale }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const targetLocale = locale === "pl" ? "en" : "pl";

  const handleSwitch = () => {
    const nextPath = buildPathname(pathname, targetLocale);
    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  };

  const label =
    locale === "pl"
      ? "Switch to English"
      : "Przełącz na polski";

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="px-3 py-2 rounded-full border border-border hover:border-primary transition-colors text-sm font-semibold bg-card"
      aria-label={label}
      disabled={isPending}
    >
      {targetLocale.toUpperCase()}
    </button>
  );
};

const buildPathname = (pathname: string | null, locale: Locale) => {
  if (!pathname || pathname === "/") {
    return `/${locale}`;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && locales.includes(segments[0] as Locale)) {
    segments[0] = locale;
  } else {
    segments.unshift(locale);
  }

  return `/${segments.join("/")}`;
};

export default LocaleSwitcher;
