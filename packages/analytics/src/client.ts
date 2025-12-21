import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Storage keys for referral tracking
const REFERRAL_STORAGE_KEY = 'meble_referral_data';
const UTM_STORAGE_KEY = 'meble_utm_data';

export interface ReferralData {
  referrer: string | null;
  landing_page: string;
  captured_at: string;
}

export interface UTMData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  ref: string | null; // Custom ref parameter for internal tracking
  captured_at: string;
}

/**
 * Extract UTM parameters from URL
 */
function getUTMParams(): Omit<UTMData, 'captured_at'> {
  if (typeof window === 'undefined') {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      ref: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    ref: params.get('ref'), // Custom ref for internal article/page tracking
  };
}

/**
 * Get referrer information
 */
function getReferrerData(): Omit<ReferralData, 'captured_at'> {
  if (typeof window === 'undefined') {
    return {
      referrer: null,
      landing_page: '',
    };
  }

  return {
    referrer: document.referrer || null,
    landing_page: window.location.href,
  };
}

/**
 * Store UTM data if not already stored (first-touch attribution)
 */
function captureUTMData(): UTMData | null {
  if (typeof window === 'undefined') return null;

  const existingData = localStorage.getItem(UTM_STORAGE_KEY);
  const currentParams = getUTMParams();

  // Check if we have any UTM params in URL
  const hasUTMParams = Object.values(currentParams).some((v) => v !== null);

  if (hasUTMParams) {
    // Always update with new UTM params (last-touch for UTM)
    const utmData: UTMData = {
      ...currentParams,
      captured_at: new Date().toISOString(),
    };
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
    return utmData;
  }

  // Return existing data if available
  if (existingData) {
    try {
      return JSON.parse(existingData) as UTMData;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Store referral data if not already stored (first-touch attribution)
 */
function captureReferralData(): ReferralData | null {
  if (typeof window === 'undefined') return null;

  const existingData = localStorage.getItem(REFERRAL_STORAGE_KEY);

  // Only capture on first visit (first-touch attribution)
  if (!existingData) {
    const referralData: ReferralData = {
      ...getReferrerData(),
      captured_at: new Date().toISOString(),
    };
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referralData));
    return referralData;
  }

  try {
    return JSON.parse(existingData) as ReferralData;
  } catch {
    return null;
  }
}

/**
 * Get stored UTM data
 */
export function getStoredUTMData(): UTMData | null {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(UTM_STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as UTMData;
  } catch {
    return null;
  }
}

/**
 * Get stored referral data
 */
export function getStoredReferralData(): ReferralData | null {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as ReferralData;
  } catch {
    return null;
  }
}

/**
 * Get attribution properties for events
 */
export function getAttributionProperties(): Record<string, unknown> {
  const utmData = getStoredUTMData();
  const referralData = getStoredReferralData();

  return {
    // UTM parameters
    ...(utmData?.utm_source && { utm_source: utmData.utm_source }),
    ...(utmData?.utm_medium && { utm_medium: utmData.utm_medium }),
    ...(utmData?.utm_campaign && { utm_campaign: utmData.utm_campaign }),
    ...(utmData?.utm_term && { utm_term: utmData.utm_term }),
    ...(utmData?.utm_content && { utm_content: utmData.utm_content }),
    ...(utmData?.ref && { internal_ref: utmData.ref }),

    // Referral data
    ...(referralData?.referrer && { initial_referrer: referralData.referrer }),
    ...(referralData?.landing_page && { initial_landing_page: referralData.landing_page }),
  };
}

/**
 * Initialize PostHog analytics
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] PostHog key not configured');
    }
    return;
  }

  // Capture UTM and referral data before initializing PostHog
  const utmData = captureUTMData();
  const referralData = captureReferralData();

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We handle pageviews manually for SPA
    capture_pageleave: true,
    persistence: 'localStorage+cookie',

    // === SESSION REPLAY CONFIG ===
    disable_session_recording: false,
    session_recording: {
      // Privacy controls
      maskAllInputs: true,
      maskTextSelector: '.ph-mask',
      blockSelector: '.ph-no-capture',

      // Performance
      recordCrossOriginIframes: false,
    },

    // === ERROR TRACKING ===
    capture_exceptions: true,

    // === WEB VITALS ===
    capture_performance: true,

    bootstrap: {
      // Include attribution data in bootstrap for first event
      featureFlags: {},
    },
    loaded: (ph) => {
      // Set super properties for all future events
      const superProps: Record<string, unknown> = {};

      if (utmData) {
        if (utmData.utm_source) superProps['$utm_source'] = utmData.utm_source;
        if (utmData.utm_medium) superProps['$utm_medium'] = utmData.utm_medium;
        if (utmData.utm_campaign) superProps['$utm_campaign'] = utmData.utm_campaign;
        if (utmData.utm_term) superProps['$utm_term'] = utmData.utm_term;
        if (utmData.utm_content) superProps['$utm_content'] = utmData.utm_content;
        if (utmData.ref) superProps['internal_ref'] = utmData.ref;
      }

      if (referralData) {
        if (referralData.referrer) superProps['$initial_referrer'] = referralData.referrer;
        if (referralData.landing_page) superProps['$initial_landing_page'] = referralData.landing_page;
      }

      if (Object.keys(superProps).length > 0) {
        ph.register(superProps);
      }
    },
  });
}

/**
 * Check if analytics is initialized
 */
export function isAnalyticsInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  return posthog.__loaded ?? false;
}

export { posthog };
