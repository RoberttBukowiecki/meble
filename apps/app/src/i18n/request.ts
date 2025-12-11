import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales } from '@meble/i18n';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  let locale: string;

  if (localeCookie && locales.includes(localeCookie as any)) {
    // Use saved locale from cookie
    locale = localeCookie;
  } else {
    // First visit - detect browser language
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');

    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "pl-PL,pl;q=0.9,en;q=0.8")
      const browserLang = acceptLanguage
        .split(',')[0]
        .split('-')[0]
        .toLowerCase();

      // Use browser language if supported, otherwise default
      locale = locales.includes(browserLang as any) ? browserLang : defaultLocale;
    } else {
      locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
