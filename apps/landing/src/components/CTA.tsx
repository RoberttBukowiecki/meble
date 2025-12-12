'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@meble/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { APP_NAME } from '@meble/constants';

const CTA = () => {
  const t = useTranslations('landing.sections.cta');

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {t('heading', { appName: APP_NAME })}
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex items-center gap-x-6 lg:mt-0 lg:flex-shrink-0"
        >
          <Button asChild size="lg" className="h-12 px-8 text-lg flex items-center justify-center">
            <Link href="/app">{t('primaryButton')}</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CTA;
