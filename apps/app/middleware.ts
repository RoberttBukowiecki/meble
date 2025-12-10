import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from '@meble/i18n';

export default createMiddleware({
  defaultLocale,
  locales,
  // Keep URLs locale-agnostic while still negotiating the locale
  localePrefix: 'never',
});

export const config = {
  // Apply middleware to all paths except Next.js internals and static files
  matcher: ['/((?!api|_next|favicon.ico|sitemap.xml|robots.txt).*)'],
};
