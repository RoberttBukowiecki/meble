'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { locales, localeNames, type Locale } from '@meble/i18n';
import { Button } from '@meble/ui';
import { Languages, Check } from 'lucide-react';
import { setLocale } from '@/actions/locale';

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Settings');

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    startTransition(async () => {
      await setLocale(newLocale);
      // Refresh to apply new locale
      window.location.reload();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Languages className="h-4 w-4" />
        <span>{t('language')}</span>
      </div>
      <div className="flex flex-col gap-1">
        {locales.map((locale) => (
          <Button
            key={locale}
            variant={currentLocale === locale ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => switchLocale(locale)}
            disabled={isPending}
            className="w-full justify-between"
          >
            <span>{localeNames[locale]}</span>
            {currentLocale === locale && <Check className="h-4 w-4" />}
          </Button>
        ))}
      </div>
    </div>
  );
}
