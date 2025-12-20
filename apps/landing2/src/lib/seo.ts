/**
 * SEO Configuration for e-meble Landing Page
 * Production-grade SEO setup with keywords, structured data, and metadata
 */

import { APP_NAME, APP_URLS, COMPANY_INFO, SOCIAL_HANDLES as CONST_SOCIAL_HANDLES } from '@meble/constants';

// Base URL configuration
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || APP_URLS.landing;

// Supported locales for hreflang
export const SUPPORTED_LOCALES = ['pl', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Default locale
export const DEFAULT_LOCALE: SupportedLocale = 'pl';

// Keywords for SEO - researched for furniture design niche in Poland
export const SEO_KEYWORDS = {
  pl: {
    primary: [
      'projektowanie mebli 3D',
      'meble na wymiar',
      'projektant mebli online',
      'konfigurator mebli',
      'lista cięcia mebli',
    ],
    secondary: [
      'szafa na wymiar',
      'meble DIY',
      'projektowanie szaf',
      'meble kuchenne na wymiar',
      'program do projektowania mebli',
      'eksport CSV mebli',
      'projekt szafy online',
      'meble bez pośredników',
      'tanie meble na wymiar',
      'wizualizacja mebli 3D',
    ],
    longTail: [
      'jak zaprojektować szafę na wymiar',
      'darmowy program do projektowania mebli',
      'generator listy cięcia płyt meblowych',
      'projektowanie mebli w przeglądarce',
      'oszczędność na meblach na wymiar',
      'meble bezpośrednio z hurtowni',
    ],
  },
  en: {
    primary: [
      '3D furniture design',
      'custom furniture',
      'online furniture designer',
      'furniture configurator',
      'furniture cut list',
    ],
    secondary: [
      'custom wardrobe',
      'DIY furniture',
      'wardrobe design',
      'custom kitchen cabinets',
      'furniture design software',
      'CSV furniture export',
      'wardrobe design online',
      'furniture without middlemen',
      'affordable custom furniture',
      '3D furniture visualization',
    ],
    longTail: [
      'how to design custom wardrobe',
      'free furniture design software',
      'furniture board cut list generator',
      'browser furniture design',
      'save money on custom furniture',
      'furniture direct from warehouse',
    ],
  },
} as const;

// Social media handles (re-exported from constants)
export const SOCIAL_HANDLES = CONST_SOCIAL_HANDLES;

// Organization info for structured data
export const ORGANIZATION = {
  name: COMPANY_INFO.name,
  legalName: COMPANY_INFO.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.webp`,
  foundingDate: '2024',
  sameAs: [
    `https://twitter.com/${SOCIAL_HANDLES.twitter.replace('@', '')}`,
    `https://facebook.com/${SOCIAL_HANDLES.facebook}`,
    `https://linkedin.com/company/${SOCIAL_HANDLES.linkedin}`,
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: COMPANY_INFO.email,
    availableLanguage: ['Polish', 'English'],
  },
} as const;

// SEO metadata by locale
// Optimized for CTR - includes brand, USP, and specific numbers
export const SEO_METADATA = {
  pl: {
    title: `${APP_NAME} | Zaprojektuj meble 3D za darmo → Oszczędź 50%`,
    titleTemplate: `%s | ${APP_NAME}`,
    description:
      'Projektuj szafy, komody i regały w 3D za darmo. Generuj listę cięcia CSV, zamów płyty z hurtowni i zaoszczędź nawet 50%. Bez rejestracji, od razu w przeglądarce.',
    keywords: [
      ...SEO_KEYWORDS.pl.primary,
      ...SEO_KEYWORDS.pl.secondary,
      // Additional keywords for pillar pages
      'zaprojektuj meble',
      'projektowanie mebli na wymiar',
      'zamawianie mebli online',
    ].join(', '),
    openGraph: {
      siteName: APP_NAME,
      locale: 'pl_PL',
      type: 'website',
    },
  },
  en: {
    title: `${APP_NAME} | Design furniture in 3D for free → Save 50%`,
    titleTemplate: `%s | ${APP_NAME}`,
    description:
      'Design wardrobes, cabinets and shelves in 3D for free. Generate CSV cut lists, order boards from warehouse and save up to 50%. No registration, works in browser.',
    keywords: [
      ...SEO_KEYWORDS.en.primary,
      ...SEO_KEYWORDS.en.secondary,
      // Additional keywords for pillar pages
      'design furniture',
      'custom furniture design',
      'order furniture online',
    ].join(', '),
    openGraph: {
      siteName: APP_NAME,
      locale: 'en_US',
      type: 'website',
    },
  },
} as const;

// Structured data generators
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...ORGANIZATION,
  };
}

export function generateWebsiteSchema(locale: SupportedLocale) {
  const meta = SEO_METADATA[locale];
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: meta.openGraph.siteName,
    url: SITE_URL,
    inLanguage: locale === 'pl' ? 'pl-PL' : 'en-US',
    description: meta.description,
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION.name,
      logo: {
        '@type': 'ImageObject',
        url: ORGANIZATION.logo,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${locale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateSoftwareApplicationSchema(locale: SupportedLocale) {
  const isPolish = locale === 'pl';
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'DesignApplication',
    applicationSubCategory: isPolish ? 'Projektowanie mebli' : 'Furniture Design',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: isPolish ? 'PLN' : 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    description: SEO_METADATA[locale].description,
    url: SITE_URL,
    image: `${SITE_URL}/img/hero.png`,
    screenshot: `${SITE_URL}/img/benefit-one.png`,
    featureList: isPolish
      ? [
          'Projektowanie mebli w 3D',
          'Generowanie list cięcia CSV',
          'Wizualizacja w czasie rzeczywistym',
          'Eksport do produkcji',
          'Biblioteka materiałów',
        ]
      : [
          '3D furniture design',
          'CSV cut list generation',
          'Real-time visualization',
          'Production export',
          'Material library',
        ],
    author: {
      '@type': 'Organization',
      name: ORGANIZATION.name,
    },
  };
}

export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateReviewSchema(
  reviews: Array<{
    author: string;
    reviewBody: string;
    ratingValue: number;
  }>
) {
  return reviews.map((review) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: APP_NAME,
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewBody: review.reviewBody,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
  }));
}

// Generate all structured data for a page
export function generateAllStructuredData(
  locale: SupportedLocale,
  faqs?: Array<{ question: string; answer: string }>
) {
  const schemas: Record<string, unknown>[] = [
    generateOrganizationSchema(),
    generateWebsiteSchema(locale),
    generateSoftwareApplicationSchema(locale),
  ];

  if (faqs && faqs.length > 0) {
    schemas.push(generateFAQSchema(faqs));
  }

  return schemas;
}

// Canonical URL generator
export function getCanonicalUrl(locale: SupportedLocale, path: string = '') {
  const basePath = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${SITE_URL}${basePath}${path}`;
}

// Alternate URLs for hreflang
export function getAlternateUrls(path: string = '') {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    url: getCanonicalUrl(locale, path),
    hreflang: locale === 'pl' ? 'pl-PL' : 'en-US',
  }));
}
