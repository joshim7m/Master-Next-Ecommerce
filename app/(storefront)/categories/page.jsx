import prisma from '../../../src/lib/prisma';
import Link from 'next/link';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);
  const title = `All Categories — Shop Lingerie, Bras, Panties & Nightwear | ${siteName} Bangladesh`;
  const description =
    `Browse all product categories at ${siteName} — lingerie, bras, panties, nightwear, stockings, health & beauty, watches, and more. ` +
    'Shop online with cash on delivery across Bangladesh.';
  const ogImage = settings.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent('All Categories')}&subtitle=${encodeURIComponent('Shop Lingerie, Bras, Panties & Nightwear')}&type=category&siteName=${encodeURIComponent(siteName)}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/categories' },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/categories`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${siteName} Categories` }],
    },
    twitter: { title, description, images: [ogImage] },
  };
}

const PER_PAGE = 18;

export default async function CategoryListingPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);
  const skip = (page - 1) * PER_PAGE;

  const [settings, total, categories, allCategories, bannerCat] = await Promise.all([
    getSiteSettings(),
    prisma.category.count(),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      skip,
      take: PER_PAGE,
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.findMany({ select: { name: true, slug: true } }),
    prisma.category.findFirst({ where: { image: { not: null } }, orderBy: { name: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const siteUrl = siteUrlOf(settings);
  const bannerImage = bannerCat?.image || null;
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `All Categories — ${siteNameOf(settings)} Bangladesh`,
    description: `Browse all product categories at ${siteNameOf(settings)} — lingerie, bras, panties, nightwear, and more.`,
    url: `${siteUrl}/categories`,
    hasPart: allCategories.map((c) => ({
      '@type': 'CollectionPage',
      name: c.name,
      url: `${siteUrl}/categories/${c.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <section className="mx-auto w-full max-w-7xl px-page-margin-mobile py-6 sm:px-6 sm:py-10 lg:px-page-margin-desktop">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-editorial-ink via-[#3b0764] to-purple-800 shadow-ambient-lg sm:mb-12">
          {bannerImage && (
            <img src={bannerImage} alt={bannerCat?.name || ''} className="absolute inset-0 h-full w-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
          <div className="relative flex min-h-[9rem] flex-col justify-center px-6 py-8 sm:min-h-[12rem] sm:px-10">
            <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg sm:text-4xl">Shop Categories</h1>
            <p className="mt-2 text-sm text-white/85 sm:text-base">{total} categories to explore</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((category) => {
            const imgSrc = category.image;
            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-dark-border dark:bg-dark-card"
              >
                <div className="image-hover-zoom relative aspect-square w-full overflow-hidden bg-warm-sand dark:bg-dark-card">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-sand to-soft-blush dark:from-dark-card dark:to-dark-bg">
                      <span className="text-3xl font-bold text-muted/40 dark:text-dark-muted/40">
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1 p-3 text-center">
                  <h2 className="line-clamp-2 text-xs font-semibold text-on-surface transition-colors group-hover:text-primary dark:text-dark-text dark:group-hover:text-primary">
                    {category.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    {category._count.products} items
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
            <Link
              href={`/categories?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-on-surface/70 transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:text-primary ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </Link>
            {Array.from({ length: totalPages }, (_, i) => {
              const n = i + 1;
              return n === page ? (
                <span key={n} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary shadow-sm dark:bg-primary dark:text-on-primary">
                  {n}
                </span>
              ) : (
                <Link
                  key={n}
                  href={`/categories?page=${n}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-sm font-semibold text-on-surface/70 transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:text-primary"
                >
                  {n}
                </Link>
              );
            })}
            <Link
              href={`/categories?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-on-surface/70 transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:text-primary ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </Link>
          </nav>
        )}

        {categories.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-ambient dark:border-dark-border dark:bg-dark-card">
            <p className="text-muted dark:text-dark-muted">No categories available yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
