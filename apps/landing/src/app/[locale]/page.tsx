import { notFound } from 'next/navigation';

import Benefits from '@/components/Benefits/Benefits';
import FAQ from '@/components/FAQ';
import Hero from '@/components/Hero';
import Pricing from '@/components/Pricing/Pricing';
import Stats from '@/components/Stats';
import Testimonials from '@/components/Testimonials';
import CTA from '@/components/CTA';
import { getLandingContent } from '@/data/content';
import { Locale, defaultLocale, locales } from '@meble/i18n';
import { getTranslations } from 'next-intl/server';

type PageProps = {
  params: { locale: Locale };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const Page = async ({ params }: PageProps) => {
  const locale = locales.includes(params.locale)
    ? params.locale
    : defaultLocale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const content = await getLandingContent(locale);
  const t = await getTranslations({ locale, namespace: 'landing' });
  const pricingTiers = t.raw('sections.pricing.tiers');
  const faqItems = t.raw('sections.faqs.items');

  return (
    <>
      <Hero hero={content.hero} />
      <Benefits benefits={content.benefits} />
      <Pricing pricing={pricingTiers} />
      <Testimonials testimonials={content.testimonials} />
      <FAQ faqs={faqItems} />
      <Stats />
      <CTA />
    </>
  );
};

export default Page;
