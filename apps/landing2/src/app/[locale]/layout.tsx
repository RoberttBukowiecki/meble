import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { APP_NAME } from '@meble/constants';
import { AnalyticsProvider } from '@meble/analytics';
import { routing } from '@/i18n/routing';
import {
  SITE_URL,
  SEO_METADATA,
  SOCIAL_HANDLES,
  getCanonicalUrl,
  getAlternateUrls,
  type SupportedLocale,
} from '@/lib/seo';
import '@/styles/globals.css';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ScrollDepthTracker } from '@/components/ScrollDepthTracker';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Viewport configuration (moved from metadata)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === 'pl' || paramLocale === 'en' ? paramLocale : 'pl') as SupportedLocale;
  const messages = await getMessages({ locale });
  const messagesMetadata = messages.metadata as { title: string; description: string };

  const seoMeta = SEO_METADATA[locale];
  const canonicalUrl = getCanonicalUrl(locale);
  const alternates = getAlternateUrls();

  // Build language alternates object
  const languageAlternates: Record<string, string> = {};
  alternates.forEach(({ hreflang, url }) => {
    languageAlternates[hreflang] = url;
  });
  languageAlternates['x-default'] = getCanonicalUrl('pl'); // Default to Polish

  return {
    // Basic metadata
    title: {
      default: seoMeta.title,
      template: seoMeta.titleTemplate,
    },
    description: seoMeta.description,
    keywords: seoMeta.keywords,

    // Authorship and publisher
    authors: [{ name: APP_NAME, url: SITE_URL }],
    creator: APP_NAME,
    publisher: APP_NAME,

    // Robots configuration
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Canonical and alternates
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },

    // Open Graph
    openGraph: {
      type: 'website',
      locale: seoMeta.openGraph.locale,
      alternateLocale: locale === 'pl' ? 'en_US' : 'pl_PL',
      url: canonicalUrl,
      siteName: seoMeta.openGraph.siteName,
      title: seoMeta.title,
      description: seoMeta.description,
      images: [
        {
          url: `${SITE_URL}/img/og-image.png`,
          width: 1200,
          height: 630,
          alt: locale === 'pl'
            ? `${APP_NAME} - Darmowy Projektant Mebli 3D`
            : `${APP_NAME} - Free 3D Furniture Designer`,
          type: 'image/png',
        },
        {
          url: `${SITE_URL}/img/hero.png`,
          width: 616,
          height: 617,
          alt: `${APP_NAME} Preview`,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      site: SOCIAL_HANDLES.twitter,
      creator: SOCIAL_HANDLES.twitter,
      title: seoMeta.title,
      description: seoMeta.description,
      images: {
        url: `${SITE_URL}/img/og-image.png`,
        alt: locale === 'pl'
          ? `${APP_NAME} - Darmowy Projektant Mebli 3D`
          : `${APP_NAME} - Free 3D Furniture Designer`,
      },
    },

    // App Links
    appLinks: {
      web: {
        url: SITE_URL,
        should_fallback: true,
      },
    },

    // Category
    category: locale === 'pl' ? 'Projektowanie' : 'Design',

    // Icons
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180' },
      ],
      other: [
        { rel: 'mask-icon', url: '/favicon.svg', color: '#4f46e5' },
      ],
    },

    // Manifest
    manifest: '/site.webmanifest',

    // Verification (add your actual verification codes)
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      // yandex: 'yandex-verification-code',
      // bing: 'bing-verification-code',
    },

    // Other
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for analytics (when added) */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className="antialiased">
        <AnalyticsProvider>
          <ScrollDepthTracker />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NextIntlClientProvider messages={messages}>
              {children}
              <CookieConsentBanner />
            </NextIntlClientProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
