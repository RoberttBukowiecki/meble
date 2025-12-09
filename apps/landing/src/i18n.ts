import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from '@meble/i18n';

export default getRequestConfig(async ({ locale }) => {
  const activeLocale = locale || defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`./messages/${activeLocale}.json`)).default,
  };
});
