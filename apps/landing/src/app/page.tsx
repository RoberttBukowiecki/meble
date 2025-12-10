import {redirect} from "@/navigation";
import {locales, defaultLocale, type Locale} from "@meble/i18n";
import {getLocale} from "next-intl/server";

export default async function RootRedirect() {
  const detected = await getLocale();
  const locale: Locale = locales.includes(detected as Locale) ? (detected as Locale) : defaultLocale;

  redirect({ href: "/", locale, forcePrefix: true });
}
