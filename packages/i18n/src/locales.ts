/**
 * Supported locales configuration
 */
export const locales = ['pl', 'en'] as const;

export type Locale = (typeof locales)[number];

/**
 * Default locale for the application
 */
export const defaultLocale: Locale = 'pl';

/**
 * Locale display names
 */
export const localeNames: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
};
