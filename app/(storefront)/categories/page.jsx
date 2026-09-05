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

export default async function CategoryListingPage() {
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  const siteUrl = siteUrlOf(settings);
  const randomCat = categories.filter((c) => c.image).length
    ? categories.filter((c) => c.image)[Math.floor(Math.random() * categories.filter((c) => c.image).length)]
    : null;
  const bannerImage = randomCat?.image || null;
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `All Categories — ${siteNameOf(settings)} Bangladesh`,
    description: `Browse all product categories at ${siteNameOf(settings)} — lingerie, bras, panties, nightwear, and more.`,
    url: `${siteUrl}/categories`,
    hasPart: categories.map((c) => ({
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
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="relative mb-10 aspect-[3/2] overflow-hidden rounded-2xl bg-slate-200 sm:aspect-[4/1]">
          {bannerImage ? (
            <img src={bannerImage} alt={randomCat.name || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">Categories</h1>
            <p className="mt-1 text-sm text-white/80 sm:text-base">{categories.length} product categories</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((category) => {
            const imgSrc = category.image;
            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#2f0f6b] focus:ring-offset-2"
              >
                <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <span className="text-2xl font-bold text-slate-400">{category.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="w-full text-center">
                  <h2 className="text-sm font-semibold text-slate-900 group-hover:text-[#2f0f6b] transition-colors line-clamp-2">
                    {category.name}
                  </h2>
                  <span className="mt-1 inline-flex items-center justify-center h-5 rounded-full bg-[#2f0f6b]/10 px-2 text-[10px] font-semibold text-[#2f0f6b]">
                    {category._count.products}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">No categories available yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
