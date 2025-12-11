import createMiddleware from 'next-intl/middleware';

import {routing} from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip middleware for API routes, Next internals, and any file with an extension (static assets)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
