/**
 * Application-wide constants
 */

/**
 * The name of the application
 * Use this constant everywhere instead of hardcoding the app name
 */
export const APP_NAME = 'e-meble';

/**
 * Application URLs
 */
export const APP_URLS = {
  /** Main application URL */
  app: 'https://app.e-meble.com',
  /** Landing page URL */
  landing: 'https://e-meble.com',
} as const;

/**
 * Company Information
 */
export const COMPANY_INFO = {
  name: 'e-meble',
  legalName: 'e-meble Sp. z o.o.',
  email: 'kontakt@e-meble.com',
  phone: '+48 123 456 789',
  nip: '5252525252',
  address: {
    street: 'ul. Przykładowa 12/4',
    city: 'Warszawa',
    zipCode: '00-001',
    country: 'Polska'
  },
  fullAddress: 'ul. Przykładowa 12/4, 00-001 Warszawa'
} as const;

/**
 * Social Media Links
 */
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/e-meble',
  instagram: 'https://instagram.com/e-meble',
  linkedin: 'https://linkedin.com/company/e-meble',
  twitter: 'https://twitter.com/e_meble',
  github: 'https://github.com/RoberttBukowiecki/meble'
} as const;

/**
 * Social media handles (without URLs)
 */
export const SOCIAL_HANDLES = {
  twitter: '@e_meble',
  facebook: 'e-meble',
  instagram: 'e-meble',
  linkedin: 'e-meble',
} as const;

/**
 * Application metadata
 */
export const APP_META = {
  name: APP_NAME,
  repository: 'https://github.com/RoberttBukowiecki/meble.git',
} as const;

/**
 * Branding assets paths (relative to public folder)
 */
export const BRANDING = {
  logo: '/logo.svg',
  favicon: '/favico.svg',
  logoColor: '#1a1a2e',
} as const;
