'use server';

import { cookies } from 'next/headers';
import { locales, type Locale } from '@meble/i18n';

export async function setLocale(locale: Locale) {
  // Validate locale
  if (!locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
}
