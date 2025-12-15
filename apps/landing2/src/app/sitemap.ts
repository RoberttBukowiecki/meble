/**
 * Dynamic Sitemap Generation for SEO
 * Generates XML sitemap for search engines
 */

import { MetadataRoute } from 'next';
import { SITE_URL, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/seo';
import { BLOG_ARTICLES } from '@/lib/blog-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const lastModified = new Date();

  // Main pages with their priorities and change frequencies
  const pages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' as const },
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

  // Add blog articles to sitemap
  for (const article of BLOG_ARTICLES) {
    for (const locale of SUPPORTED_LOCALES) {
      const localePath = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
      const url = `${baseUrl}${localePath}/blog/${article.slug}`;

      // Generate alternates for hreflang
      const languages: Record<string, string> = {};
      for (const altLocale of SUPPORTED_LOCALES) {
        const altLocalePath = altLocale === DEFAULT_LOCALE ? '' : `/${altLocale}`;
        const hreflang = altLocale === 'pl' ? 'pl-PL' : 'en-US';
        languages[hreflang] = `${baseUrl}${altLocalePath}/blog/${article.slug}`;
      }
      languages['x-default'] = `${baseUrl}/blog/${article.slug}`;

      sitemapEntries.push({
        url,
        lastModified: new Date(article.updatedAt || article.publishedAt),
        changeFrequency: 'monthly' as const,
        priority: article.featured ? 0.8 : 0.7,
        alternates: {
          languages,
        },
      });
    }
  }

  return sitemapEntries;
}
