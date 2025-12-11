import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLandingContent } from "@/data/content";
import { Locale, defaultLocale, locales } from "@meble/i18n";

type Params = { locale: string };

interface Props {
  children: ReactNode;
  params: Promise<Params>;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const safeLocale: Locale =
    locales.find((value) => value === paramLocale) ?? defaultLocale;
  const content = await getLandingContent(safeLocale);
  const { metadata, siteName, siteUrl } = content.siteDetails;

  return {
    title: metadata.title,
    description: metadata.description,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: siteUrl,
      type: "website",
      images: [
        {
          url: "/images/og-image.webp",
          width: 1200,
          height: 675,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: ["/images/twitter-image.jpg"],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: paramLocale } = await params;
  const safeLocale: Locale =
    locales.find((value) => value === paramLocale) ?? defaultLocale;
  const content = await getLandingContent(safeLocale);
  const messages = await getMessages({ locale: safeLocale });

  return (
    <NextIntlClientProvider locale={safeLocale} messages={messages}>
      {content.siteDetails.googleAnalyticsId && <GoogleAnalytics gaId={content.siteDetails.googleAnalyticsId} />}
      <Header
        siteName={content.siteDetails.siteName}
        menuItems={content.header.menuItems}
        primaryCtaLabel={content.header.primaryCtaLabel}
        locale={safeLocale}
      />
      <main>{children}</main>
      <Footer siteDetails={content.siteDetails} footerDetails={content.footer} locale={safeLocale} />
    </NextIntlClientProvider>
  );
}
