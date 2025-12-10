import React from 'react';
import Image from 'next/image';

import { ITestimonial } from '@/types';

interface Props {
  testimonials: ITestimonial[];
}

const Testimonials: React.FC<Props> = ({ testimonials }) => {
  return (
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:mx-0 lg:flex lg:max-w-none lg:flex-row lg:items-center lg:gap-x-16">
      <div className="lg:flex-shrink-0 lg:w-1/2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {/* This title can be passed as a prop or fetched from translations */}
          What our users say
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {/* This description can be passed as a prop or fetched from translations */}
          Discover how our app is transforming the workflow for furniture makers.
        </p>
      </div>
      <div className="mt-10 lg:mt-0 lg:w-1/2 lg:flex-auto">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-1">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="rounded-2xl bg-card p-8 text-sm leading-6"
            >
              <blockquote className="text-foreground">
                <p>{`“${testimonial.message}”`}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <Image
                  className="h-10 w-10 rounded-full bg-gray-50"
                  src={testimonial.avatar}
                  alt=""
                  width={40}
                  height={40}
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-muted-foreground">{testimonial.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
