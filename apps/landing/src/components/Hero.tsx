import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { HeroDetails } from '@/types';
import { Button } from '@meble/ui';
import Link from 'next/link';

interface Props {
  hero: HeroDetails;
}

const Hero: React.FC<Props> = ({ hero }) => {
  const t = useTranslations('landing.header');

  return (
    <section id="hero" className="relative bg-background">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {hero.heading}
          </h1>
          <p className="mt-3 text-lg leading-8 text-muted-foreground sm:mt-4">
            {hero.subheading}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/app">{t('primaryCtaLabel')}</Link>
            </Button>
          </div>
        </div>
        <div className="mt-16 sm:mt-20">
          <div className="-m-2 rounded-xl bg-muted p-2 ring-1 ring-inset ring-muted-foreground/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <Image
              src={hero.centerImageSrc}
              width={1200}
              height={675}
              quality={100}
              sizes="(max-width: 768px) 100vw, 1200px"
              priority={true}
              alt={hero.imageAlt}
              className="w-full rounded-md shadow-2xl ring-1 ring-muted-foreground/10"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
