import { APP_NAME } from '@meble/constants';
import { Locale, defaultLocale } from '@meble/i18n';
import { getTranslations } from 'next-intl/server';

import { LandingContent } from '@/types';

const replaceAppName = (value: string) => value.replace(/{appName}/g, APP_NAME);

const applyAppName = <T,>(obj: T): T => {
  if (typeof obj === 'string') return replaceAppName(obj) as T;
  if (Array.isArray(obj)) return obj.map(applyAppName) as T;
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        applyAppName(v),
      ])
    ) as T;
  }
  return obj;
};

export const getLandingContent = async (
  locale: Locale = defaultLocale
): Promise<LandingContent> => {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const rawContent = t.raw('content') as LandingContent;
  return applyAppName(rawContent);
};
