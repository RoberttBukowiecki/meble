// Client-side exports
export {
  posthog,
  initAnalytics,
  isAnalyticsInitialized,
  getStoredUTMData,
  getStoredReferralData,
  getAttributionProperties,
  type ReferralData,
  type UTMData,
} from './client';

// Events
export {
  AnalyticsEvent,
  type EventProperties,
  type EventPropertiesFor,
} from './events';

// Hooks
export {
  useTrack,
  useAnalyticsUser,
  track,
  identify,
  resetUser,
  setUserProperties,
  trackPageView,
} from './hooks';

// Provider
export { AnalyticsProvider } from './provider';
