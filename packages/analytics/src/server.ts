/**
 * Server-side analytics for webhooks and API routes
 *
 * Usage:
 * ```ts
 * import { serverTrack, serverIdentify, shutdownAnalytics } from '@meble/analytics/server';
 *
 * // Track event
 * serverTrack('payment_completed', userId, {
 *   amount: 49,
 *   package_id: 'starter',
 * });
 *
 * // Shutdown on app termination
 * process.on('SIGTERM', shutdownAnalytics);
 * ```
 */

import { PostHog } from 'posthog-node';
import { AnalyticsEvent, type EventPropertiesFor } from './events';

const POSTHOG_KEY = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let posthogServer: PostHog | null = null;

/**
 * Get or create the PostHog server client
 */
function getPostHogClient(): PostHog | null {
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics Server] PostHog key not configured');
    }
    return null;
  }

  if (!posthogServer) {
    posthogServer = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1, // Send events immediately (important for serverless)
      flushInterval: 0,
    });
  }

  return posthogServer;
}

/**
 * Track an event from server-side
 */
export function serverTrack<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  properties?: EventPropertiesFor<E>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event,
    properties: properties as Record<string, unknown>,
  });
}

/**
 * Identify a user from server-side
 */
export function serverIdentify(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Set user properties from server-side
 */
export function serverSetUserProperties(
  distinctId: string,
  properties: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Alias a user (link anonymous ID to authenticated ID)
 */
export function serverAlias(
  distinctId: string,
  alias: string
) {
  const client = getPostHogClient();
  if (!client) return;

  client.alias({
    distinctId,
    alias,
  });
}

/**
 * Shutdown the PostHog client
 * Call this when your app is terminating to ensure all events are flushed
 */
export async function shutdownAnalytics() {
  if (posthogServer) {
    await posthogServer.shutdown();
    posthogServer = null;
  }
}

/**
 * Flush all pending events
 * Useful in serverless environments before the function terminates
 */
export async function flushAnalytics() {
  const client = getPostHogClient();
  if (client) {
    await client.flush();
  }
}

// Re-export events for convenience
export { AnalyticsEvent } from './events';
export type { EventPropertiesFor } from './events';
