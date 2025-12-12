"use client";
import Image from 'next/image';
import {
  FiBox,
  FiClipboard,
  FiCpu,
  FiGrid,
  FiLayers,
  FiLock,
  FiRotateCw,
  FiUploadCloud,
} from 'react-icons/fi';
import { IBenefit } from '@/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  benefit: IBenefit;
  imageAtRight?: boolean;
}

const BenefitSection: React.FC<Props> = ({ benefit, imageAtRight }: Props) => {
  const { title, description, imageSrc, bullets } = benefit;

  const iconMap = useMemo(
    () => ({
      grid: FiGrid,
      rotate: FiRotateCw,
      box: FiBox,
      layers: FiLayers,
      clipboard: FiClipboard,
      upload: FiUploadCloud,
      cpu: FiCpu,
      lock: FiLock,
    }),
    []
  );

  return (
    <div className="mx-auto mt-24 max-w-7xl px-6 sm:mt-32 lg:px-8">
      <div
        className={`mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 items-center ${
          imageAtRight ? 'lg:grid-flow-col-dense' : ''
        }`}
      >
        <motion.div 
          initial={{ opacity: 0, x: imageAtRight ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className={`lg:col-start-${imageAtRight ? '2' : '1'} lg:pr-8 lg:pt-4`}
        >
          <div className="lg:max-w-lg">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{description}</p>
            <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-muted-foreground lg:max-w-none">
              {bullets.map((bullet: any, index) => {
                const Icon = iconMap[bullet.icon as keyof typeof iconMap] || FiGrid;
                return (
                  <motion.div 
                    key={bullet.title} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative pl-9"
                  >
                    <dt className="inline font-semibold text-foreground">
                      <Icon
                        className="absolute left-1 top-1 h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                      {bullet.title}
                    </dt>{' '}
                    <dd className="inline">{bullet.description}</dd>
                  </motion.div>
                );
              })}
            </dl>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className={`flex items-start justify-center lg:col-start-1 lg:row-start-1 ${
             imageAtRight ? 'lg:col-start-1' : 'lg:col-start-2'
          }`}
        >
          <div
            className={`relative w-full max-w-[48rem] rounded-xl bg-muted/50 p-3 ring-1 ring-inset ring-foreground/10 lg:p-4 shadow-2xl ${
              imageAtRight ? 'lg:mr-auto' : 'lg:ml-auto'
            }`}
          >
             <Image
              src={imageSrc}
              alt={title}
              width={1200}
              height={800}
              quality={100}
              className="w-full rounded-md shadow-inner ring-1 ring-foreground/10"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BenefitSection;
