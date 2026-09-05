import Link from 'next/link';
import prisma from '../../../../src/lib/prisma';
import { getSiteSettings } from '../../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);
  const title = `Blog Categories | ${siteName} — Browse All Topics`;
  const description = `Browse all blog categories at ${siteName} Bangladesh. Find articles about lingerie, fashion, styling tips, nightwear, and more.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/blogs/categories' },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${siteUrl}/blogs/categories`,
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

async function getCategories() {
  const categories = await prisma.blogCategory.findMany({
    where: { status: 'publish' },
    include: {
      _count: { select: { posts: true } },
      posts: {
        where: { status: 'publish' },
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { bannerImage: true, title: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  return JSON.parse(JSON.stringify(categories));
}

export default async function BlogCategoriesPage() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blogs` },
      { '@type': 'ListItem', position: 3, name: 'Categories', item: `${siteUrl}/blogs/categories` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog Categories',
    description: `Browse all blog categories at ${siteName} Bangladesh.`,
    url: `${siteUrl}/blogs/categories`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categories.length,
      itemListElement: categories.map((cat, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/blogs/category/${cat.slug}`,
        name: cat.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <div className="mx-auto max-w-[1440px] px-page-margin-mobile py-8 sm:px-6 lg:px-page-margin-desktop sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href="/blogs" className="hover:text-primary transition-colors">Blog</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface dark:text-dark-text">Categories</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-headline-md font-bold text-on-surface dark:text-dark-text">Blog Categories</h1>
          <p className="mt-1 text-muted dark:text-dark-muted">Browse articles by topic</p>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-muted dark:text-dark-muted">folder_off</span>
            <p className="mt-2 text-muted dark:text-dark-muted">No categories yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blogs/category/${cat.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-white shadow-ambient transition-all hover:shadow-ambient-lg hover:-translate-y-1 dark:border-dark-border dark:bg-dark-card"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden bg-warm-sand dark:bg-dark-card image-hover-zoom">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : cat.posts?.[0]?.bannerImage ? (
                    <img
                      src={cat.posts[0].bannerImage}
                      alt={`${cat.title} articles`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-muted/30 dark:text-dark-muted/30">folder</span>
                    </div>
                  )}
                  {/* Post count badge */}
                  <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-on-surface shadow-sm dark:bg-dark-card/90 dark:text-dark-text">
                    {cat._count?.posts ?? 0} post{cat._count?.posts !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors dark:text-dark-text dark:group-hover:text-primary">
                    {cat.title}
                  </h2>
                  {cat.authorName && (
                    <p className="mt-1 text-sm text-muted dark:text-dark-muted">
                      By <span className="font-medium text-on-surface/70 dark:text-dark-text/70">{cat.authorName}</span>
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                    View articles
                    <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
