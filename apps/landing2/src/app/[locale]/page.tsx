import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { SectionTitle } from '@/components/SectionTitle';
import { Benefits } from '@/components/Benefits';
import { Video } from '@/components/Video';
import { Testimonials } from '@/components/Testimonials';
import { Faq } from '@/components/Faq';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';
import { PopupWidget } from '@/components/PopupWidget';
import { StructuredData } from '@/components/StructuredData';
import { benefitOne, benefitTwo } from '@/components/data';
import {
  generateAllStructuredData,
  type SupportedLocale,
} from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;
  setRequestLocale(locale);

  // Get translations for FAQ structured data
  const t = await getTranslations({ locale, namespace: 'faq' });
  const faqItems = [
    { question: t('items.1.question'), answer: t('items.1.answer') },
    { question: t('items.2.question'), answer: t('items.2.answer') },
    { question: t('items.3.question'), answer: t('items.3.answer') },
    { question: t('items.4.question'), answer: t('items.4.answer') },
  ];

  // Generate all structured data for rich snippets
  const structuredData = generateAllStructuredData(locale, faqItems);

  return (
    <>
      {/* JSON-LD Structured Data for Rich Search Results */}
      <StructuredData data={structuredData} />

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
      >
        {locale === 'pl' ? 'Przejdź do treści' : 'Skip to main content'}
      </a>

      {/* Header with navigation */}
      <header role="banner">
        <Navbar />
      </header>

      {/* Main content */}
      <main id="main-content" role="main">
        {/* Hero Section */}
        <Hero />

        {/* Benefits Section */}
        <section aria-labelledby="benefits-heading">
          <SectionTitle
            pretitleKey="benefits.pretitle"
            titleKey="benefits.title"
            descriptionKey="benefits.description"
            id="benefits-heading"
          />
          <Benefits data={benefitOne} />
          <Benefits imgPos="right" data={benefitTwo} />
        </section>

        {/* Video Section */}
        <section aria-labelledby="video-heading">
          <SectionTitle
            pretitleKey="video.pretitle"
            titleKey="video.title"
            descriptionKey="video.description"
            id="video-heading"
          />
          <Video />
        </section>

        {/* Testimonials Section */}
        <section aria-labelledby="testimonials-heading">
          <SectionTitle
            pretitleKey="testimonials.pretitle"
            titleKey="testimonials.title"
            descriptionKey="testimonials.description"
            id="testimonials-heading"
          />
          <Testimonials />
        </section>

        {/* FAQ Section */}
        <section aria-labelledby="faq-heading">
          <SectionTitle
            pretitleKey="faq.pretitle"
            titleKey="faq.title"
            descriptionKey="faq.description"
            id="faq-heading"
          />
          <Faq />
        </section>

        {/* Call to Action */}
        <section aria-label={locale === 'pl' ? 'Zacznij teraz' : 'Get started'}>
          <Cta />
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Contact Widget */}
      <PopupWidget />
    </>
  );
}
