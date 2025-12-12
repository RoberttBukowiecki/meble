/**
 * Application-wide constants
 */

/**
 * The name of the application
 * Use this constant everywhere instead of hardcoding "Meble"
 */
export const APP_NAME = 'Meble 3D';

/**
 * Company Information
 */
export const COMPANY_INFO = {
  name: 'Meble 3D Sp. z o.o.',
  email: 'hello@meblarz3d.pl',
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
  facebook: 'https://facebook.com/meblarz3d',
  instagram: 'https://instagram.com/meblarz3d',
  linkedin: 'https://linkedin.com/company/meblarz3d',
  twitter: 'https://twitter.com/meblarz3d',
  github: 'https://github.com/RoberttBukowiecki/meble'
} as const;

/**
 * Application metadata
 */
export const APP_META = {
  name: APP_NAME,
  repository: 'https://github.com/RoberttBukowiecki/meble.git',
} as const;
