import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/Container";
import { BlogHero, BlogCard } from "@/components/blog";
import { StructuredData } from "@/components/StructuredData";
import {
  BLOG_ARTICLES,
  getFeaturedArticles,
  BLOG_CATEGORIES,
  type BlogCategory,
} from "@/lib/blog-data";
import {
  SITE_URL,
  SEO_METADATA,
  getCanonicalUrl,
  getAlternateUrls,
  generateBreadcrumbSchema,
  type SupportedLocale,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === "pl" || paramLocale === "en"
    ? paramLocale
    : "pl") as SupportedLocale;

  const t = await getTranslations({ locale, namespace: "blog" });
  const seoMeta = SEO_METADATA[locale];

  const title = t("seo.title");
  const description = t("seo.description");

  const canonicalUrl = getCanonicalUrl(locale, "/blog");
  const alternates = getAlternateUrls("/blog");

  const languageAlternates: Record<string, string> = {};
  alternates.forEach(({ hreflang, url }) => {
    languageAlternates[hreflang] = url;
  });
  languageAlternates["x-default"] = getCanonicalUrl("pl", "/blog");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      type: "website",
      locale: seoMeta.openGraph.locale,
      url: canonicalUrl,
      siteName: seoMeta.openGraph.siteName,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/img/blog/og-blog.jpg`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale: paramLocale } = await params;
  const locale = (paramLocale === "pl" || paramLocale === "en"
    ? paramLocale
    : "pl") as SupportedLocale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "blog" });

  const featuredArticles = getFeaturedArticles();
  const otherArticles = BLOG_ARTICLES.filter((article) => !article.featured);

  // Generate breadcrumb structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: locale === "pl" ? "Strona główna" : "Home",
      url: getCanonicalUrl(locale),
    },
    { name: t("title"), url: getCanonicalUrl(locale, "/blog") },
  ]);

  // Generate blog listing structured data
  const blogListingSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: t("seo.title"),
    description: t("seo.description"),
    url: getCanonicalUrl(locale, "/blog"),
    inLanguage: locale === "pl" ? "pl-PL" : "en-US",
    blogPost: BLOG_ARTICLES.map((article) => ({
      "@type": "BlogPosting",
      headline: article.content[locale].title,
      description: article.content[locale].description,
      url: getCanonicalUrl(locale, `/blog/${article.slug}`),
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      image: `${SITE_URL}${article.image.src}`,
    })),
  };

  return (
    <>
      <StructuredData data={[breadcrumbSchema, blogListingSchema]} />

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
        <BlogHero />

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className="py-12 bg-gray-50 dark:bg-trueGray-900">
            <Container>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
                {t("featured")}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredArticles.map((article) => (
                  <BlogCard
                    key={article.slug}
                    article={article}
                    featured={true}
                  />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* All Articles */}
        <section className="py-16">
          <Container>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
              {t("allArticles")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherArticles.map((article) => (
                <BlogCard key={article.slug} article={article} />
              ))}
            </div>
          </Container>
        </section>

        {/* Categories */}
        <section className="py-12 bg-gray-50 dark:bg-trueGray-900">
          <Container>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
              {t("categories")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map(
                (category) => {
                  const count = BLOG_ARTICLES.filter(
                    (a) => a.category === category
                  ).length;
                  return (
                    <span
                      key={category}
                      className="px-4 py-2 bg-white dark:bg-trueGray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {BLOG_CATEGORIES[category][locale]} ({count})
                    </span>
                  );
                }
              )}
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
