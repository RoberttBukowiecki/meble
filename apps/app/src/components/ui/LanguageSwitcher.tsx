'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { locales, localeNames, type Locale } from '@meble/i18n';
import { Button } from '@meble/ui';
import { Languages } from 'lucide-react';
import { setLocale } from '@/actions/locale';

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: Locale) => {
    startTransition(async () => {
      await setLocale(newLocale);
      // Refresh to apply new locale
      window.location.reload();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1">
        {locales.map((locale) => (
          <Button
            key={locale}
            variant={currentLocale === locale ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchLocale(locale)}
            disabled={isPending}
            className="h-8 px-2 text-xs"
          >
            {localeNames[locale]}
          </Button>
        ))}
      </div>
    </div>
  );
}
