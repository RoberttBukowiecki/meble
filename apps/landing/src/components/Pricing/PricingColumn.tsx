'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from 'lucide-react';
import { IPricing } from '@/types';
import { Button } from '@meble/ui';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface Props {
  tier: IPricing;
  highlight?: boolean;
}

const PricingColumn: React.FC<Props> = ({ tier, highlight }: Props) => {
  const t = useTranslations('landing.pricing');
  const { name, price, features } = tier;

  return (
    <motion.div
      whileHover={{ y: -10 }}
      className={clsx(
        'flex flex-col rounded-3xl bg-card p-8 ring-1 ring-border shadow-lg transition-shadow duration-300 hover:shadow-xl',
        { 'ring-2 ring-primary relative overflow-hidden': highlight }
      )}
    >
      {highlight && (
        <div className="absolute top-0 right-0 -mr-3 -mt-3 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
      )}
      <h3 className="text-lg font-semibold leading-8 text-foreground">{name}</h3>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('description', { tier: name })}
      </p>
      <p className="mt-6 flex items-baseline gap-x-1">
        <span className="text-4xl font-bold tracking-tight text-foreground">
          {typeof price === 'number' ? `$${price}` : price}
        </span>
        {typeof price === 'number' && (
          <span className="text-sm font-semibold leading-6 text-muted-foreground">
            {t('priceSuffix')}
          </span>
        )}
      </p>
      <Button
        variant={highlight ? 'default' : 'outline'}
        className="mt-6 w-full"
        size="lg"
      >
        {t('ctaLabel')}
      </Button>
      <ul
        role="list"
        className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground"
      >
        {features.map((feature) => (
          <li key={feature} className="flex gap-x-3">
            <CheckIcon
              className="h-6 w-5 flex-none text-primary"
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default PricingColumn;
