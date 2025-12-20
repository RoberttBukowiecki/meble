import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { APP_NAME, APP_URLS } from '@meble/constants';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/Container';
import { Cta } from '@/components/Cta';
import { StructuredData } from '@/components/StructuredData';
import {
  SITE_URL,
  getCanonicalUrl,
  getAlternateUrls,
  generateBreadcrumbSchema,
  generateFAQSchema,
  type SupportedLocale,
} from '@/lib/seo';
import { Link } from '@/i18n/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

// SEO metadata for pillar page
const PILLAR_SEO = {
  pl: {
    title: 'Projektowanie mebli online | Darmowy projektant 3D',
    description:
      'Zaprojektuj szafę, komodę lub regał online w 5 minut. Bezpłatny projektant 3D z listą cięcia do hurtowni. Oszczędź do 50% kosztów stolarza.',
    keywords:
      'projektowanie mebli online, zaprojektuj meble, projektowanie mebli na wymiar online, projektant mebli 3D, konfigurator szaf online',
  },
  en: {
    title: 'Design furniture online | Free 3D designer',
    description:
      'Design a wardrobe, cabinet or shelf online in 5 minutes. Free 3D designer with cut list for warehouse. Save up to 50% on carpenter costs.',
    keywords:
      'design furniture online, furniture designer, custom furniture design online, 3D furniture designer, wardrobe configurator online',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;

  const seo = PILLAR_SEO[locale];
  const canonicalUrl = getCanonicalUrl(locale, '/projektowanie-mebli-online');
  const alternates = getAlternateUrls('/projektowanie-mebli-online');

  const languageAlternates: Record<string, string> = {};
  alternates.forEach(({ hreflang, url }) => {
    languageAlternates[hreflang] = url;
  });
  languageAlternates['x-default'] = getCanonicalUrl('pl', '/projektowanie-mebli-online');

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: APP_NAME,
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${SITE_URL}/img/og-image.png`,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
  };
}

export default async function ProjektowanieMebliOnlinePage({ params }: Props) {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'pillarDesign' });
  const isPolish = locale === 'pl';

  // FAQ items for this pillar page
  const faqItems = [
    { question: t('faq.items.1.question'), answer: t('faq.items.1.answer') },
    { question: t('faq.items.2.question'), answer: t('faq.items.2.answer') },
    { question: t('faq.items.3.question'), answer: t('faq.items.3.answer') },
    { question: t('faq.items.4.question'), answer: t('faq.items.4.answer') },
  ];

  // Breadcrumb schema
  const breadcrumbData = generateBreadcrumbSchema([
    { name: isPolish ? 'Strona główna' : 'Home', url: SITE_URL },
    {
      name: isPolish ? 'Projektowanie mebli online' : 'Design furniture online',
      url: getCanonicalUrl(locale, '/projektowanie-mebli-online'),
    },
  ]);

  // FAQ schema
  const faqSchema = generateFAQSchema(faqItems);

  // HowTo schema for SEO
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: isPolish ? 'Jak zaprojektować meble online' : 'How to design furniture online',
    description: PILLAR_SEO[locale].description,
    totalTime: 'PT5M',
    tool: [
      {
        '@type': 'HowToTool',
        name: isPolish ? 'Przeglądarka internetowa' : 'Web browser',
      },
    ],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: isPolish ? 'Wybierz typ mebla' : 'Choose furniture type',
        text: isPolish
          ? 'Wybierz czy projektujesz szafę, komodę, regał czy inny mebel.'
          : 'Choose whether you are designing a wardrobe, cabinet, shelf or other furniture.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: isPolish ? 'Dostosuj wymiary' : 'Adjust dimensions',
        text: isPolish
          ? 'Wprowadź dokładne wymiary mebla dopasowane do Twojej przestrzeni.'
          : 'Enter exact furniture dimensions tailored to your space.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: isPolish ? 'Wybierz materiały' : 'Choose materials',
        text: isPolish
          ? 'Wybierz rodzaj płyty, kolor i wykończenie krawędzi.'
          : 'Choose board type, color and edge finish.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: isPolish ? 'Pobierz listę cięcia' : 'Download cut list',
        text: isPolish
          ? 'Wygeneruj listę cięcia w formacie CSV gotową do zamówienia w hurtowni.'
          : 'Generate a cut list in CSV format ready to order from the warehouse.',
      },
    ],
  };

  // Related blog articles
  const relatedArticles = [
    {
      slug: 'jak-zaprojektowac-szafe-na-wymiar-poradnik',
      title: isPolish
        ? 'Jak zaprojektować szafę na wymiar? Kompletny poradnik'
        : 'How to design a custom wardrobe? Complete guide',
    },
    {
      slug: 'jak-zmierzyc-wneke-pod-szafe-krok-po-kroku',
      title: isPolish
        ? 'Jak zmierzyć wnękę pod szafę? Krok po kroku'
        : 'How to measure alcove for wardrobe? Step by step',
    },
    {
      slug: 'lista-ciecia-plyt-meblowych-jak-wygenerowac-i-zamowic',
      title: isPolish
        ? 'Lista cięcia płyt meblowych - Jak wygenerować i zamówić'
        : 'Furniture board cut list - How to generate and order',
    },
  ];

  return (
    <>
      {/* Structured Data */}
      <StructuredData data={[breadcrumbData, faqSchema, howToSchema]} />

      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
      >
        {isPolish ? 'Przejdź do treści' : 'Skip to main content'}
      </a>

      <header role="banner">
        <Navbar />
      </header>

      <main id="main-content" role="main">
        {/* Hero Section */}
        <section className="pt-20 pb-16 bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
          <Container>
            <nav className="mb-8 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-indigo-600">
                {isPolish ? 'Strona główna' : 'Home'}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-white">{t('breadcrumb')}</span>
            </nav>

            <div className="max-w-4xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 lg:text-5xl xl:text-6xl dark:text-white">
                {t('hero.title')}
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('hero.description')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <a
                  href={APP_URLS.app}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('hero.cta')}
                </a>
                <Link
                  href="/zamawianie-mebli-online"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors dark:bg-indigo-900 dark:text-indigo-200"
                >
                  {t('hero.ctaSecondary')}
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* How it works - HowTo Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('howItWorks.title')}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-xl mb-4">
                    {step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t(`howItWorks.steps.${step}.title`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(`howItWorks.steps.${step}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* What you can design */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {t('whatYouCanDesign.title')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              {t('whatYouCanDesign.description')}
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {['wardrobes', 'cabinets', 'kitchen'].map((type) => (
                <div
                  key={type}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t(`whatYouCanDesign.types.${type}.title`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(`whatYouCanDesign.types.${type}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Why design yourself */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('whyDesignYourself.title')}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {['savings', 'control', 'noMiddlemen'].map((benefit) => (
                <div key={benefit} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                    <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t(`whyDesignYourself.benefits.${benefit}.title`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(`whyDesignYourself.benefits.${benefit}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('faq.title')}
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{item.answer}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Related Articles - Internal Linking */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {t('relatedArticles.title')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
              {t('relatedArticles.description')}
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="block bg-gray-50 dark:bg-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                    {article.title}
                  </h3>
                  <span className="inline-flex items-center mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                    {isPolish ? 'Czytaj więcej' : 'Read more'}
                    <ArrowIcon className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <Cta />
      </main>

      <Footer />
    </>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
