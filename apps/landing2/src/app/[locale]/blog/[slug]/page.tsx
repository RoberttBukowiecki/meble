import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/Container";
import { ArticleHeader, ArticleContent, BlogCard, ArticleTracker } from "@/components/blog";
import { StructuredData } from "@/components/StructuredData";
import { Cta } from "@/components/Cta";
import {
  getArticleBySlug,
  getAllSlugs,
  getLatestArticles,
  BLOG_ARTICLES,
} from "@/lib/blog-data";
import {
  SITE_URL,
  SEO_METADATA,
  ORGANIZATION,
  getCanonicalUrl,
  getAlternateUrls,
  generateBreadcrumbSchema,
  type SupportedLocale,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const slugs = getAllSlugs();
  const locales = ["pl", "en"];

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: paramLocale, slug } = await params;
  const locale = (paramLocale === "pl" || paramLocale === "en"
    ? paramLocale
    : "pl") as SupportedLocale;

  const article = getArticleBySlug(slug);
  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  const content = article.content[locale];
  const seoMeta = SEO_METADATA[locale];

  const canonicalUrl = getCanonicalUrl(locale, `/blog/${slug}`);
  const alternates = getAlternateUrls(`/blog/${slug}`);

  const languageAlternates: Record<string, string> = {};
  alternates.forEach(({ hreflang, url }) => {
    languageAlternates[hreflang] = url;
  });
  languageAlternates["x-default"] = getCanonicalUrl("pl", `/blog/${slug}`);

  return {
    title: content.title,
    description: content.description,
    keywords: content.keywords.join(", "),
    authors: [{ name: ORGANIZATION.name }],
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      type: "article",
      locale: seoMeta.openGraph.locale,
      url: canonicalUrl,
      siteName: seoMeta.openGraph.siteName,
      title: content.title,
      description: content.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt || article.publishedAt,
      authors: [ORGANIZATION.name],
      images: [
        {
          url: `${SITE_URL}${article.image.src}`,
          width: 1200,
          height: 630,
          alt: article.image.alt[locale],
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: [`${SITE_URL}${article.image.src}`],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale: paramLocale, slug } = await params;
  const locale = (paramLocale === "pl" || paramLocale === "en"
    ? paramLocale
    : "pl") as SupportedLocale;
  setRequestLocale(locale);

  const article = getArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "blog" });
  const content = article.content[locale];

  // Get related articles (latest excluding current)
  const relatedArticles = getLatestArticles(4).filter(
    (a) => a.slug !== article.slug
  ).slice(0, 3);

  // Generate breadcrumb structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: locale === "pl" ? "Strona główna" : "Home",
      url: getCanonicalUrl(locale),
    },
    { name: t("title"), url: getCanonicalUrl(locale, "/blog") },
    { name: content.title, url: getCanonicalUrl(locale, `/blog/${slug}`) },
  ]);

  // Generate article structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: content.title,
    description: content.description,
    image: `${SITE_URL}${article.image.src}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Organization",
      name: ORGANIZATION.name,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION.name,
      logo: {
        "@type": "ImageObject",
        url: ORGANIZATION.logo,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(locale, `/blog/${slug}`),
    },
    keywords: content.keywords.join(", "),
    articleBody: content.body,
    wordCount: content.body.split(/\s+/).length,
    inLanguage: locale === "pl" ? "pl-PL" : "en-US",
  };

  return (
    <>
      <StructuredData data={[breadcrumbSchema, articleSchema]} />

      {/* Analytics: Track article view */}
      <ArticleTracker
        slug={article.slug}
        title={content.title}
        category={article.category}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
      >
        {locale === "pl" ? "Przejdź do treści" : "Skip to main content"}
      </a>

      <header role="banner">
        <Navbar />
      </header>

      <main id="main-content" role="main">
        <article>
          <ArticleHeader article={article} />

          <Container className="py-12">
            <div className="max-w-4xl mx-auto">
              <ArticleContent body={content.body} />

              {/* Article Tags */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-trueGray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">
                  {t("tags")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {content.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-gray-100 dark:bg-trueGray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-16 bg-gray-50 dark:bg-trueGray-900">
            <Container>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
                {t("relatedArticles")}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedArticles.map((relatedArticle) => (
                  <BlogCard key={relatedArticle.slug} article={relatedArticle} />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* CTA Section - with article tracking */}
        <Cta articleSlug={article.slug} />
      </main>

      <Footer />
    </>
  );
}
