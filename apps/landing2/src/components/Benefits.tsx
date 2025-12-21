"use client";

import Image from "next/image";
import React, { cloneElement, isValidElement } from "react";
import { useTranslations } from "next-intl";
import { Container } from "./Container";
import { BenefitData } from "./data";

interface BenefitsProps {
  data: BenefitData;
  imgPos?: "left" | "right";
}

export function Benefits({ data, imgPos }: BenefitsProps) {
  const t = useTranslations();

  return (
    <Container className="flex flex-wrap mb-20 lg:gap-10 lg:flex-nowrap">
      <div
        className={`flex items-center justify-center w-full lg:w-1/2 ${
          imgPos === "right" ? "lg:order-1" : ""
        }`}
      >
        <div>
          <Image
            src={data.image}
            width={521}
            height={482}
            alt="Benefits"
            placeholder="blur"
            className="rounded-md"
          />
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center w-full lg:w-1/2 ${
          imgPos === "right" ? "lg:justify-end" : ""
        }`}
      >
        <div>
          <div className="flex flex-col w-full mt-4">
            <h3 className="max-w-2xl mt-3 text-3xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight lg:text-4xl dark:text-white">
              {t(data.titleKey)}
            </h3>

            <p className="max-w-2xl py-4 text-lg leading-normal text-gray-500 lg:text-xl xl:text-xl dark:text-gray-300">
              {t(data.descKey)}
            </p>
          </div>

          <div className="w-full mt-5">
            {data.bullets.map((item, index) => (
              <Benefit
                key={index}
                titleKey={item.titleKey}
                icon={item.icon}
                descKey={item.descKey}
              />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

interface BenefitProps {
  titleKey: string;
  descKey: string;
  icon: React.ReactElement;
}

function Benefit({ titleKey, descKey, icon }: BenefitProps) {
  const t = useTranslations();

  return (
    <div className="flex items-start mt-8 space-x-3">
      <div className="flex items-center justify-center flex-shrink-0 mt-1 bg-indigo-500 rounded-md w-11 h-11">
        {isValidElement(icon) &&
          cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: "w-7 h-7 text-indigo-50",
          })}
      </div>
      <div>
        <h4 className="text-xl font-medium text-gray-800 dark:text-gray-200">
          {t(titleKey)}
        </h4>
        <p className="mt-1 text-gray-500 dark:text-gray-400">{t(descKey)}</p>
      </div>
    </div>
  );
}
