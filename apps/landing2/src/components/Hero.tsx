"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { track, AnalyticsEvent } from "@meble/analytics";
import { APP_URLS } from "@meble/constants";
import { Container } from "./Container";
import heroImg from "../../public/img/hero.webp";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <>
      <Container className="flex flex-wrap">
        <div className="flex items-center w-full lg:w-1/2">
          <div className="max-w-2xl mb-8">
            <h1 className="text-4xl font-bold leading-snug tracking-tight text-gray-800 lg:text-4xl lg:leading-tight xl:text-6xl xl:leading-tight dark:text-white">
              {t("title")}
            </h1>
            <p className="py-5 text-xl leading-normal text-gray-500 lg:text-xl xl:text-2xl dark:text-gray-300">
              {t("description")}
            </p>

            <div className="flex flex-col items-start space-y-3 sm:space-y-0 sm:items-center sm:flex-row">
              <a
                href={APP_URLS.app}
                className="px-8 py-4 text-lg font-medium text-center text-white bg-indigo-600 rounded-md"
                onClick={() => track(AnalyticsEvent.LANDING_CTA_CLICKED, { location: 'hero' })}
              >
                {t("cta")}
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center w-full lg:w-1/2">
          <div className="hidden lg:block">
            <Image
              src={heroImg}
              width={616}
              height={617}
              alt="Hero Illustration"
              loading="eager"
              placeholder="blur"
              className="rounded-md"
            />
          </div>
        </div>
      </Container>

      {/* Savings Value Proposition Section */}
      <Container>
        <div className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 md:p-12 lg:p-16">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white"></div>
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <SparklesIcon />
              {t("savings.badge")}
            </div>

            <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {t("savings.title")}
              <span className="block mt-2 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                {t("savings.highlight")}
              </span>
            </h2>

            <p className="mb-8 max-w-2xl text-lg text-indigo-100 md:text-xl">
              {t("savings.description")}
            </p>

            {/* Stats */}
            <div className="mb-8 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white md:text-4xl">50%</div>
                <div className="mt-1 text-sm text-indigo-200">{t("savings.stats.savings")}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white md:text-4xl">0</div>
                <div className="mt-1 text-sm text-indigo-200">{t("savings.stats.middlemen")}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white md:text-4xl">100%</div>
                <div className="mt-1 text-sm text-indigo-200">{t("savings.stats.control")}</div>
              </div>
            </div>

            {/* Benefits list */}
            <div className="mb-8 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-400" />
                <span className="text-white">{t("savings.benefits.direct")}</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-400" />
                <span className="text-white">{t("savings.benefits.cutlist")}</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-400" />
                <span className="text-white">{t("savings.benefits.quality")}</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-400" />
                <span className="text-white">{t("savings.benefits.custom")}</span>
              </div>
            </div>

            <a
              href={APP_URLS.app}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
              onClick={() => track(AnalyticsEvent.LANDING_CTA_CLICKED, { location: 'cta_section' })}
            >
              {t("savings.cta")}
              <ArrowRightIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </Container>
    </>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}
