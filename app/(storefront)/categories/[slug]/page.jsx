import prisma from '../../../../src/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FilterSidebar from '../../(home)/_partials/FilterSidebar';
import ProductGrid from '../../(home)/_partials/ProductGrid';
import { getSiteSettings } from '../../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../../src/lib/siteSettings';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [settings, category] = await Promise.all([
    getSiteSettings(),
    prisma.category.findUnique({ where: { slug } }),
  ]);
  if (!category) return {};
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const title = `${category.name} — Buy Online in Bangladesh | ${siteName}`;
  const description =
    (category.description || `Shop our collection of ${category.name} at ${siteName}.`) +
    ` Browse ${category.name} online with cash on delivery across Bangladesh — Dhaka, Chittagong, Sylhet & nationwide. ` +
    'Premium quality, discreet packaging, and sizes that fit every body.';

  const ogImage = settings.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(category.name)}&subtitle=${encodeURIComponent(`Browse at ${siteName} — Cash on Delivery Bangladesh`)}&type=category&siteName=${encodeURIComponent(siteName)}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/categories/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: category.name }],
    },
    twitter: { title, description, images: [ogImage] },
  };
}

export default async function CategoryProductsPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : null;

  const [settings, category, categories] = await Promise.all([
    getSiteSettings(),
    prisma.category.findUnique({
      where: { slug },
    }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } }, children: { include: { _count: { select: { products: true } } } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!category) return notFound();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const where = { status: 'publish', categories: { some: { slug } } };
  if (maxPrice) {
    where.unite_price = { lte: maxPrice };
  }

  const products = await prisma.product.findMany({
    where,
    include: { images: true, variants: true },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = JSON.parse(JSON.stringify(products));

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} — ${siteName} Bangladesh`,
    description: category.description || `Browse ${category.name} at ${siteName} — shop online with cash on delivery across Bangladesh.`,
    url: `${siteUrl}/categories/${slug}`,
    numberOfItems: products.length,
    hasPart: products.slice(0, 20).map((p) => ({
      '@type': 'Product',
      name: p.title,
      url: `${siteUrl}/products/${p.slug}`,
      image: p.images?.[0]?.image_path || undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        price: Number(p.sale_price || p.unite_price),
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: category.name, item: `${siteUrl}/categories/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="relative mb-6 aspect-[3/2] overflow-hidden rounded-2xl bg-slate-200 sm:mb-8 sm:aspect-[4/1]">
          {category.image ? (
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
            <Link href="/categories" className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm hover:bg-white/30 transition sm:text-xs">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Categories
            </Link>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">{category.name}</h1>
            {category.description && (
              <p className="mt-1 text-sm text-white/80 sm:text-base">{category.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <FilterSidebar categories={categories} />
          <div className="flex-1">
            <p className="mb-4 text-sm text-slate-400">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
            <ProductGrid products={serialized} />
          </div>
        </div>
      </section>
    </>
  );
}
