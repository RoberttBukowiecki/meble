'use client';

import { useTranslations } from 'next-intl';
import { FiGrid, FiLayers, FiUploadCloud } from 'react-icons/fi';
import { useMemo } from 'react';

const Stats = () => {
  const t = useTranslations('landing.stats');

  const stats = useMemo(
    () => [
      {
        id: 1,
        name: t('shapes.title'),
        value: t('shapes.value'),
        icon: FiGrid,
      },
      {
        id: 2,
        name: t('materials.title'),
        value: t('materials.value'),
        icon: FiLayers,
      },
      {
        id: 3,
        name: t('export.title'),
        value: t('export.value'),
        icon: FiUploadCloud,
      },
    ],
    [t]
  );

  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="mx-auto flex max-w-xs flex-col gap-y-4"
              >
                <dt className="text-base leading-7 text-muted-foreground">
                  {stat.name}
                </dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Stats;
