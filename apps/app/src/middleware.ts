import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@meble/i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Don't use a prefix for the default locale
  localePrefix: 'as-needed',
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(pl|en)/:path*'],
};
