import React from 'react';
import Image from 'next/image';

import { CTADetails, HeroDetails } from "@/types";

interface Props {
  hero: HeroDetails;
  cta: CTADetails;
}

const Hero: React.FC<Props> = ({ hero, cta }) => {
    return (
        <section
            id="hero"
            className="relative flex items-center justify-center pb-0 pt-32 md:pt-40 px-5"
        >
            <div className="absolute left-0 top-0 bottom-0 -z-10 w-full">
                <div className="absolute inset-0 h-full w-full bg-hero-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]">
                </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 backdrop-blur-[2px] h-40 bg-gradient-to-b from-transparent via-[rgba(233,238,255,0.5)] to-[rgba(202,208,230,0.5)]">
            </div>

            <div className="text-center">
                <h1 className="text-4xl md:text-6xl md:leading-tight font-bold text-foreground max-w-lg md:max-w-3xl mx-auto">{hero.heading}</h1>
                <p className="mt-4 text-foreground text-lg max-w-2xl mx-auto">{hero.subheading}</p>
                <a
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-foreground px-5 py-3 text-base font-semibold text-background shadow-md transition hover:-translate-y-[1px] hover:shadow-lg"
                  href={cta.primaryButton.href}
                >
                  <span className="text-sm font-medium text-muted-foreground mr-2">{cta.primaryButton.topLabel}</span>
                  <span>{cta.primaryButton.bottomLabel}</span>
                </a>
                <Image
                    src={hero.centerImageSrc}
                    width={384}
                    height={340}
                    quality={100}
                    sizes="(max-width: 768px) 100vw, 384px"
                    priority={true}
                    unoptimized={true}
                    alt={hero.imageAlt}
                    className='relative mt-12 md:mt-16 mx-auto z-10'
                />
            </div>
        </section>
    );
};

export default Hero;
