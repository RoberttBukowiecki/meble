import { useCallback } from 'react';
import { posthog } from './client';
import { AnalyticsEvent, EventPropertiesFor } from './events';

/**
 * React hook for tracking analytics events
 * Provides a type-safe track function
 */
export function useTrack() {
  return useCallback(
    <E extends AnalyticsEvent>(
      event: E,
      properties?: EventPropertiesFor<E>
    ) => {
      if (typeof window === 'undefined') return;
      posthog.capture(event, properties as Record<string, unknown>);
    },
    []
  );
}

/**
 * React hook to get current user identification
 */
export function useAnalyticsUser() {
  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    posthog.identify(userId, traits);
  }, []);

  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;
    posthog.reset();
  }, []);

  const setUserProperties = useCallback((properties: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    posthog.people.set(properties);
  }, []);

  return { identify, reset, setUserProperties };
}

/**
 * Standalone track function for non-component usage
 * Use this in callbacks, utilities, or server-side code
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties?: EventPropertiesFor<E>
) {
  if (typeof window === 'undefined') return;
  posthog.capture(event, properties as Record<string, unknown>);
}

/**
 * Identify user for analytics
 */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.identify(userId, traits);
}

/**
 * Reset user identification (on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.people.set(properties);
}

/**
 * Track page view manually
 */
export function trackPageView(url?: string) {
  if (typeof window === 'undefined') return;
  posthog.capture('$pageview', {
    $current_url: url || window.location.href,
  });
}
