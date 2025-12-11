import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from '@meble/i18n';

export default createMiddleware({
  defaultLocale,
  locales,
  localePrefix: 'as-needed',
});

export const config = {
  // Apply middleware to all paths except Next.js internals and static files
  matcher: ['/((?!api|_next|favicon.ico|sitemap.xml|robots.txt).*)'],
};
