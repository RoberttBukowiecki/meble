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
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
      <div
        className={`grid grid-cols-1 items-center gap-x-8 gap-y-10 lg:grid-cols-2 ${
          imageAtRight ? 'lg:grid-flow-col-dense' : ''
        }`}
      >
        <div className={`lg:col-start-${imageAtRight ? '2' : '1'}`}>
          <div className="text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4">{description}</p>
          </div>
          <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-muted-foreground lg:max-w-none">
            {bullets.map((bullet: any) => {
              const Icon = iconMap[bullet.icon as keyof typeof iconMap] || FiGrid;
              return (
                <div key={bullet.title} className="relative pl-9">
                  <dt className="inline font-semibold text-foreground">
                    <Icon
                      className="absolute left-1 top-1 h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    {bullet.title}
                  </dt>{' '}
                  <dd className="inline">{bullet.description}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <div
            className={`rounded-xl bg-muted p-2 ring-1 ring-inset ring-muted-foreground/10 lg:p-4 ${
              imageAtRight ? 'lg:ml-auto' : ''
            }`}
          >
            <Image
              src={imageSrc}
              alt={title}
              width={600}
              height={600}
              quality={100}
              className="w-full rounded-md shadow-2xl ring-1 ring-muted-foreground/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitSection;
