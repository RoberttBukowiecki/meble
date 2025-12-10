import {defineRouting} from 'next-intl/routing';

import {defaultLocale, locales} from '@meble/i18n';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});
