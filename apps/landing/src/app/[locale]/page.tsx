import { notFound } from "next/navigation";

import Benefits from "@/components/Benefits/Benefits";
import CTA from "@/components/CTA";
import Container from "@/components/Container";
import FAQ from "@/components/FAQ";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing/Pricing";
import Section from "@/components/Section";
import Stats from "@/components/Stats";
import Testimonials from "@/components/Testimonials";
import { getLandingContent } from "@/data/content";
import { Locale, defaultLocale, locales } from "@meble/i18n";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: { locale: Locale };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const Page = async ({ params }: PageProps) => {
  const locale = locales.includes(params.locale) ? params.locale : defaultLocale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const content = await getLandingContent(locale);
  const t = await getTranslations({ locale, namespace: "landing.sections" });

  const pricingTitle = t("pricing.title");
  const pricingDescription = t("pricing.description");

  const testimonialTitle = t("testimonials.title");
  const testimonialDescription = t("testimonials.description");

  return (
    <>
      <Hero hero={content.hero} cta={content.cta} />
      <Container>
        <Benefits benefits={content.benefits} />

        <Section id="pricing" title={pricingTitle} description={pricingDescription}>
          <Pricing pricing={content.pricing} locale={locale} />
        </Section>

        <Section id="testimonials" title={testimonialTitle} description={testimonialDescription}>
          <Testimonials testimonials={content.testimonials} />
        </Section>

        <FAQ faqs={content.faqs} locale={locale} contactEmail={content.footer.email} />

        <Stats stats={content.stats} />

        <CTA cta={content.cta} />
      </Container>
    </>
  );
};

export default Page;
