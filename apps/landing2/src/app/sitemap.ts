/**
 * Dynamic Sitemap Generation for SEO
 * Generates XML sitemap for search engines
 */

import { MetadataRoute } from 'next';
import { SITE_URL, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const lastModified = new Date();

  // Main pages with their priorities and change frequencies
  const pages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    // Add more pages as the site grows
    // { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
    // { path: '/features', priority: 0.8, changeFrequency: 'monthly' as const },
    // { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    // { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  // Generate sitemap entries for all locales
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of SUPPORTED_LOCALES) {
      // For default locale, don't add prefix (as per localePrefix: 'as-needed')
      const localePath = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
      const url = `${baseUrl}${localePath}${page.path}`;

      // Generate alternates for hreflang
      const languages: Record<string, string> = {};
      for (const altLocale of SUPPORTED_LOCALES) {
        const altLocalePath = altLocale === DEFAULT_LOCALE ? '' : `/${altLocale}`;
        const hreflang = altLocale === 'pl' ? 'pl-PL' : 'en-US';
        languages[hreflang] = `${baseUrl}${altLocalePath}${page.path}`;
      }
      // Add x-default pointing to default locale
      languages['x-default'] = `${baseUrl}${page.path}`;

      sitemapEntries.push({
        url,
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages,
        },
      });
    }
  }

  return sitemapEntries;
}
