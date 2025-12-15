'use client';

import { useEffect, useRef, Suspense, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, posthog, isAnalyticsInitialized } from './client';

interface AnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Inner component that handles pageview tracking
 * Separated to isolate useSearchParams which requires Suspense
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>('');

  useEffect(() => {
    if (!pathname) return;
    if (!isAnalyticsInitialized()) return;

    // Build full URL for tracking
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Avoid duplicate pageviews
    if (url === lastTrackedUrl.current) return;
    lastTrackedUrl.current = url;

    // Track pageview
    posthog.capture('$pageview', {
      $current_url: typeof window !== 'undefined' ? window.location.href : url,
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Analytics provider component
 * Wrap your app with this to enable analytics tracking
 *
 * @example
 * ```tsx
 * import { AnalyticsProvider } from '@meble/analytics';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AnalyticsProvider>
 *           {children}
 *         </AnalyticsProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initAnalytics();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}
