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

// SEO metadata for ordering pillar page
const PILLAR_SEO = {
  pl: {
    title: 'Zamawianie mebli online | Jak kupić meble na wymiar',
    description:
      'Zamów meble na wymiar online krok po kroku. Od projektu 3D przez wycenę do dostawy płyt. Sprawdź jak oszczędzić na meblach bez stolarza.',
    keywords:
      'zamawianie mebli online, jak zamówić meble na wymiar, kupić meble online, meble na wymiar online, zamówienie płyt meblowych',
  },
  en: {
    title: 'Order furniture online | How to buy custom furniture',
    description:
      'Order custom furniture online step by step. From 3D design through quote to board delivery. Learn how to save on furniture without a carpenter.',
    keywords:
      'order furniture online, how to order custom furniture, buy furniture online, custom furniture online, furniture board order',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;

  const seo = PILLAR_SEO[locale];
  const canonicalUrl = getCanonicalUrl(locale, '/zamawianie-mebli-online');
  const alternates = getAlternateUrls('/zamawianie-mebli-online');

  const languageAlternates: Record<string, string> = {};
  alternates.forEach(({ hreflang, url }) => {
    languageAlternates[hreflang] = url;
  });
  languageAlternates['x-default'] = getCanonicalUrl('pl', '/zamawianie-mebli-online');

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

export default async function ZamawianieMebliOnlinePage({ params }: Props) {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'pillarOrdering' });
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
      name: isPolish ? 'Zamawianie mebli online' : 'Order furniture online',
      url: getCanonicalUrl(locale, '/zamawianie-mebli-online'),
    },
  ]);

  // FAQ schema
  const faqSchema = generateFAQSchema(faqItems);

  // HowTo schema for ordering process
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: isPolish ? 'Jak zamówić meble online' : 'How to order furniture online',
    description: PILLAR_SEO[locale].description,
    totalTime: 'P7D',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: isPolish ? 'PLN' : 'USD',
      value: isPolish ? '3500-5000' : '900-1300',
    },
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: isPolish ? 'Stwórz projekt' : 'Create a design',
        text: isPolish
          ? 'Zaprojektuj mebel w darmowym projektancie 3D.'
          : 'Design furniture in the free 3D designer.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: isPolish ? 'Eksportuj listę cięcia' : 'Export cut list',
        text: isPolish
          ? 'Pobierz plik CSV z listą wszystkich elementów.'
          : 'Download a CSV file with all elements.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: isPolish ? 'Wyślij do hurtowni' : 'Send to warehouse',
        text: isPolish
          ? 'Prześlij listę do wybranej hurtowni płyt meblowych.'
          : 'Send the list to your chosen furniture board warehouse.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: isPolish ? 'Odbierz i złóż' : 'Pick up and assemble',
        text: isPolish
          ? 'Odbierz pocięte elementy i złóż meble.'
          : 'Pick up pre-cut elements and assemble furniture.',
      },
    ],
  };

  // Related blog articles
  const relatedArticles = [
    {
      slug: 'ile-kosztuje-szafa-na-wymiar-2024',
      title: isPolish
        ? 'Ile kosztuje szafa na wymiar? Analiza cen 2024'
        : 'How much does a custom wardrobe cost? 2024 price analysis',
    },
    {
      slug: 'meble-diy-od-czego-zaczac-poradnik-dla-poczatkujacych',
      title: isPolish
        ? 'Meble DIY - Od czego zacząć?'
        : 'DIY Furniture - Where to start?',
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
        <section className="pt-20 pb-16 bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
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
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {t('hero.cta')}
                </a>
                <Link
                  href="/projektowanie-mebli-online"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors dark:bg-green-900 dark:text-green-200"
                >
                  {t('hero.ctaSecondary')}
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Process Steps */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('process.title')}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white font-bold text-xl mb-4">
                    {step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t(`process.steps.${step}.title`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(`process.steps.${step}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Pricing Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              {t('pricing.description')}
            </p>

            <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {t('pricing.example.title')}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('pricing.example.traditional')}
                  </span>
                  <span className="text-red-500 line-through font-medium">
                    {isPolish ? '8000-12000 zł' : '$2000-3000'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('pricing.example.diy')}
                  </span>
                  <span className="text-green-600 font-bold text-xl">
                    {isPolish ? '3500-5000 zł' : '$900-1300'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 -mx-4">
                  <span className="text-green-700 dark:text-green-300 font-semibold">
                    {t('pricing.example.savings')}
                  </span>
                  <span className="text-green-600 font-bold text-xl">
                    {isPolish ? 'do 7000 zł' : 'up to $1700'}
                  </span>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('faq.title')}
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6"
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

        {/* Related Articles */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
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
                  className="block bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400">
                    {article.title}
                  </h3>
                  <span className="inline-flex items-center mt-4 text-green-600 dark:text-green-400 text-sm font-medium">
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
