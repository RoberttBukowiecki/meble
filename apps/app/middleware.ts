import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@meble/i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/', '/(pl|en)/:path*'],
};
