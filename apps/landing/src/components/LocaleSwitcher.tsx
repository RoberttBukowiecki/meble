"use client";

import { useTransition } from "react";

import { Locale } from "@meble/i18n";
import { usePathname, useRouter } from "@/navigation";

interface Props {
  locale: Locale;
}

const LocaleSwitcher: React.FC<Props> = ({ locale }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const targetLocale = locale === "pl" ? "en" : "pl";

  const handleSwitch = () => {
    startTransition(() => {
      router.replace(pathname ?? "/", { locale: targetLocale });
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

export default LocaleSwitcher;
