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
  name: 'E-meble',
  legalName: 'Robert Bukowiecki',
  email: 'contact@e-meble.com',
  phone: '-',
  nip: '8943228809',
  krs: '-',
  regon: '527662517',
  address: {
    street: 'ul. Chachaja 9/30',
    city: 'Wrocław',
    zipCode: '52-402',
    country: 'Polska'
  },
  fullAddress: 'ul. Chachaja 9/30, 52-402 Wrocław'
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
