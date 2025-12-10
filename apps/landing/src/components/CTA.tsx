'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@meble/ui';
import Link from 'next/link';

const CTA = () => {
  const t = useTranslations('landing.cta');

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('heading')}
        </h2>
        <div className="mt-10 flex items-center gap-x-6 lg:mt-0 lg:flex-shrink-0">
          <Button asChild size="lg">
            <Link href="/app">{t('primaryButton')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CTA;
