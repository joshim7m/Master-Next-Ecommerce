import prisma from '../../../src/lib/prisma';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../src/lib/siteSettings';
import Hero from './_partials/Hero';
import FeaturedCategories from './_partials/FeaturedCategories';
import TrendingNow from './_partials/TrendingNow';
import PromoBanner from './_partials/PromoBanner';
import MobileCategoryChips from './_partials/MobileCategoryChips';

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const categorySlug = params.category || null;

  const [settings, category] = await Promise.all([
    getSiteSettings(),
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug } }) : Promise.resolve(null),
  ]);

  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const title = category
    ? `${category.name} — Shop Online at ${siteName} Bangladesh`
    : `${siteName} — Shop Lingerie, Bras, Panties & Nightwear Online in Bangladesh`;

  const description = category
    ? `Browse our collection of ${category.name} at ${siteName}. ` +
      `Shop online with cash on delivery across Bangladesh — Dhaka, Chittagong, Sylhet & nationwide. ` +
      `Premium quality, discreet packaging, and sizes that fit every body.`
    : `Discover ${siteName} — Bangladesh's favourite online destination for lingerie, bras, panties, nightwear, and women's intimate apparel. ` +
      "Cash on delivery, discreet packaging, and free shipping options available across Dhaka, Chittagong, Sylhet, and all of Bangladesh.";

  const ogTitle = category ? category.name : siteName;
  const ogImage = settings.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(description.slice(0, 120))}&type=${category ? 'category' : 'website'}&siteName=${encodeURIComponent(siteName)}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: category ? `/categories/${category.slug}` : '/' },
    openGraph: {
      title,
      description,
      siteName,
      url: category ? `${siteUrl}/categories/${category.slug}` : siteUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const categorySlug = params.category || null;

  const [settings, categories, heroProducts, trendingProducts] = await Promise.all([
    getSiteSettings(),
    prisma.category.findMany({
      include: { _count: { select: { products: true } }, children: { include: { _count: { select: { products: true } } } } },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'publish', images: { some: {} } },
      include: { images: true },
      take: 20,
    }),
    prisma.product.findMany({
      where: { status: 'publish' },
      include: { images: true, variants: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  const parentCats = categories.filter((c) => !c.parentId);
  const allCats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    count: c._count?.products || 0,
  }));

  // Pick 3 random categories with real images for the promo banner
  const catsWithImages = categories.filter(
    (c) => c.image && !/^https?:\/\/[\w.-]+\/?$/.test(c.image)
  );
  const shuffledCats = [...catsWithImages].sort(() => 0.5 - Math.random());
  const promoCats = shuffledCats.slice(0, 3).map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image }));

  // Pick 4 random product images for the hero collage
  const shuffled = heroProducts.sort(() => 0.5 - Math.random());
  const heroImages = shuffled.slice(0, 4).map((p) => ({
    src: p.images?.[0]?.image_path || '',
    alt: p.title,
    link: `/products/${p.slug}`,
  }));
  const trendingSerialized = JSON.parse(JSON.stringify(trendingProducts));

  const siteUrl = siteUrlOf(settings);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${siteNameOf(settings)} — Lingerie, Bras, Panties & Nightwear Online Bangladesh`,
    numberOfItems: trendingProducts.length,
    itemListElement: trendingProducts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/products/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* Hero — editorial collage */}
      <Hero images={heroImages} />

      {/* Featured Categories — carousel grid, 2 rows */}
      <FeaturedCategories categories={allCats} />

      {/* Trending Now — 6-col product grid, 2 rows */}
      <TrendingNow products={trendingSerialized} />

      {/* Promo Banner — split layout */}
      <PromoBanner categories={promoCats} />
    </>
  );
}
