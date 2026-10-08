import prisma from '../../../src/lib/prisma';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf, seoDescription } from '../../../src/lib/siteSettings';
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
  // Title comes from the admin (metaTitle) or the admin-set site name — never
  // from a hardcoded slogan. Description is emitted only when the admin wrote one.
  const siteTitle = settings.metaTitle || siteName;
  const description = seoDescription(settings);

  const title = category ? `${category.name} | ${siteName}` : siteTitle;

  const ogTitle = category ? category.name : siteName;
  const ogQuery = new URLSearchParams({
    title: ogTitle,
    type: category ? 'category' : 'website',
    siteName,
    ...(description ? { subtitle: description.slice(0, 120) } : {}),
  });
  const ogImage = settings.ogImage || `${siteUrl}/api/og?${ogQuery.toString()}`;

  return {
    title: { absolute: title },
    ...(description ? { description } : {}),
    alternates: { canonical: category ? `/categories/${category.slug}` : '/' },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      siteName,
      url: category ? `${siteUrl}/categories/${category.slug}` : siteUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title,
      ...(description ? { description } : {}),
      images: [ogImage],
    },
  };
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const categorySlug = params.category || null;

  const [settings, categories, heroProducts, trendingProducts, heroSlides, promoBanner] = await Promise.all([
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
      take: 15,
    }),
    prisma.heroSlider.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    prisma.promoBanner.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  // Top-level categories only (no parent) — includes children count
  const parentCats = categories
    .filter((c) => !c.parentId)
    .map((c) => ({
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

  // Hero slides — from admin settings; fall back to product collage images
  const heroSlideData = heroSlides.map((s) => ({
    title: s.title || '',
    subtitle: s.subtitle || '',
    buttonText: s.buttonText || 'Shop Now',
    buttonLink: s.buttonLink || '#trending',
    image: s.image || '',
  }));
  if (heroSlideData.length === 0) {
    const shuffled = heroProducts.sort(() => 0.5 - Math.random());
    heroSlideData.push(...shuffled.slice(0, 4).map((p) => ({
      title: '',
      subtitle: '',
      buttonText: 'Shop Now',
      buttonLink: `/products/${p.slug}`,
      image: p.images?.[0]?.image_path || '',
    })));
  }
  const trendingSerialized = JSON.parse(JSON.stringify(trendingProducts));

  const siteUrl = siteUrlOf(settings);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${siteNameOf(settings)}`,
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

      {/* Hero — DB-driven slider from admin hero sliders */}
      <Hero slides={heroSlideData} />

      {/* Featured Categories — carousel grid, 2 rows */}
      <FeaturedCategories categories={parentCats} />

      {/* Trending Now — 6-col product grid, 2 rows */}
      <TrendingNow products={trendingSerialized} />

      {/* Promo Banner — split layout, from admin settings */}
      <PromoBanner banner={promoBanner} categories={promoCats} />
    </>
  );
}
