import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales } from '@meble/i18n';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale =
    locales.find((supportedLocale) => supportedLocale === locale) ?? defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});
