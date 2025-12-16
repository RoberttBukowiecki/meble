/**
 * Mock for @meble/analytics package
 *
 * Used in tests to verify analytics tracking calls without
 * actually sending data to PostHog.
 */

// Mock all exported functions
export const track = jest.fn();
export const identify = jest.fn();
export const resetUser = jest.fn();
export const setUserProperties = jest.fn();
export const trackPageView = jest.fn();

// Mock hooks
export const useTrack = jest.fn(() => track);
export const useAnalyticsUser = jest.fn(() => ({
  identify,
  resetUser,
  setUserProperties,
}));

// Mock provider (no-op)
export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => children;

// Mock client functions
export const posthog = null;
export const initAnalytics = jest.fn();
export const isAnalyticsInitialized = jest.fn(() => false);
export const getStoredUTMData = jest.fn(() => null);
export const getStoredReferralData = jest.fn(() => null);
export const getAttributionProperties = jest.fn(() => ({}));

// Re-export the real AnalyticsEvent enum (no need to mock)
export enum AnalyticsEvent {
  // Landing events
  LANDING_PAGE_VIEW = 'landing_page_view',
  LANDING_CTA_CLICKED = 'landing_cta_clicked',
  LANDING_ARTICLE_VIEW = 'landing_article_view',
  LANDING_ARTICLE_CTA_CLICKED = 'landing_article_cta_clicked',

  // App session events
  APP_SESSION_STARTED = 'app_session_started',
  APP_PAGE_VIEW = 'app_page_view',

  // Design events
  PART_ADDED = 'part_added',
  CABINET_CREATED = 'cabinet_created',
  TEMPLATE_SELECTED = 'template_selected',
  CONFIG_OPENED = 'config_opened',
  INTERIOR_CONFIGURED = 'interior_configured',

  // Export events
  EXPORT_INITIATED = 'export_initiated',
  EXPORT_VALIDATION_FAILED = 'export_validation_failed',
  EXPORT_COMPLETED = 'export_completed',
  SMART_EXPORT_USED = 'smart_export_used',

  // Monetization events
  PURCHASE_MODAL_OPENED = 'purchase_modal_opened',
  PACKAGE_SELECTED = 'package_selected',
  PAYMENT_PROVIDER_SELECTED = 'payment_provider_selected',
  PURCHASE_STARTED = 'purchase_started',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',

  // UX events
  LANGUAGE_CHANGED = 'language_changed',
  VALIDATION_ERROR = 'validation_error',
  CONTACT_FORM_SUBMITTED = 'contact_form_submitted',
  NEWSLETTER_SUBSCRIBED = 'newsletter_subscribed',
  POPUP_WIDGET_OPENED = 'popup_widget_opened',
  POPUP_WIDGET_SUBMITTED = 'popup_widget_submitted',
}

// Helper to reset all mocks
export const resetAllAnalyticsMocks = () => {
  track.mockClear();
  identify.mockClear();
  resetUser.mockClear();
  setUserProperties.mockClear();
  trackPageView.mockClear();
  useTrack.mockClear();
  useAnalyticsUser.mockClear();
  initAnalytics.mockClear();
  isAnalyticsInitialized.mockClear();
  getStoredUTMData.mockClear();
  getStoredReferralData.mockClear();
  getAttributionProperties.mockClear();
};
