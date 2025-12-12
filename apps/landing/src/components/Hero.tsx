'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { HeroDetails } from '@/types';
import { Button } from '@meble/ui';
import Link from 'next/link';

interface Props {
  hero: HeroDetails;
}

const Hero: React.FC<Props> = ({ hero }) => {
  const t = useTranslations('landing.header');

  return (
    <section id="hero" className="relative overflow-hidden bg-background pt-16 md:pt-20 lg:pt-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            {hero.heading}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-muted-foreground"
          >
            {hero.subheading}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex items-center justify-center gap-x-6"
          >
            <Button asChild size="lg" className="h-12 px-8 text-lg">
              <Link href="/app">{t('primaryCtaLabel')}</Link>
            </Button>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 sm:mt-24 relative"
        >
          {/* Gradient Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-30 blur-2xl rounded-2xl" />
          
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{
              repeat: Infinity,
              duration: 6,
              ease: "easeInOut",
            }}
            className="relative rounded-xl bg-background/50 p-2 ring-1 ring-inset ring-foreground/10 lg:-m-4 lg:rounded-2xl lg:p-4 backdrop-blur-sm"
          >
            <Image
              src={hero.centerImageSrc}
              width={1200}
              height={675}
              quality={100}
              sizes="(max-width: 768px) 100vw, 1200px"
              priority={true}
              alt={hero.imageAlt}
              className="w-full rounded-md shadow-2xl ring-1 ring-foreground/10"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
