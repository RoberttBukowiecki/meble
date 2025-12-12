'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

import { ITestimonial } from '@/types';

interface Props {
  testimonials: ITestimonial[];
}

const Testimonials: React.FC<Props> = ({ testimonials }) => {
  const t = useTranslations('landing.sections.testimonials');

  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-lg font-semibold leading-8 tracking-tight text-primary"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
             {t('description')}
          </motion.p>
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
             hidden: {},
             visible: {
               transition: {
                 staggerChildren: 0.2
               }
             }
           }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm leading-6 text-foreground sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <motion.figure
              key={testimonial.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
              }}
              className="rounded-2xl bg-muted p-6 ring-1 ring-inset ring-muted-foreground/10"
            >
              <blockquote className="text-foreground">
                <p>{`“${testimonial.message}”`}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <Image
                  className="h-10 w-10 rounded-full bg-background"
                  src={testimonial.avatar}
                  alt=""
                  width={40}
                  height={40}
                />
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-muted-foreground">{testimonial.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Testimonials;
