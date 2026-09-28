import prisma from '../../../../src/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductDetailClient from '../../../../src/components/storefront/ProductDetailClient';
import { getSiteSettings } from '../../../../src/lib/getSiteSettings';
import { getAutoRelated } from '../../../../src/lib/recommendations';
import { siteNameOf, siteUrlOf } from '../../../../src/lib/siteSettings';

async function getProduct(slug) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: true,
      variants: true,
      categories: true,
      options: { orderBy: { position: 'asc' } },
    },
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [settings, product] = await Promise.all([getSiteSettings(), getProduct(slug)]);
  if (!product) return {};
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const category = product.categories?.[0]?.name || '';
  const price = Number(product.sale_price || product.unite_price).toLocaleString();
  const title = product.title;
  const description =
    product.metaDescription ||
    ((product.description || `Buy ${product.title} online at ${siteName}.`) +
    ` ৳${price} — Shop now with cash on delivery across Bangladesh. ${category ? `Category: ${category}.` : ''}`);

  const keywords = product.tags
    ? product.tags.split(',').map(k => k.trim()).filter(Boolean)
    : [product.title, category, 'lingerie Bangladesh', 'buy online BD', siteName].filter(Boolean);

  const imageUrl = product.images?.[0]?.image_path || `${siteUrl}/api/og?title=${encodeURIComponent(product.title)}&subtitle=${encodeURIComponent(`৳${price} — Shop now at ${siteName}`)}&type=product&price=${encodeURIComponent(price)}&siteName=${encodeURIComponent(siteName)}`;

  return {
    title: { absolute: `${product.title} — ${siteName}` },
    description,
    keywords,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      type: 'website',
      locale: 'en_BD',
      url: `${siteUrl}/products/${slug}`,
      siteName,
      title: `${product.title} — ${siteName}`,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} — ${siteName}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSiteSettings()]);

  if (!product) return notFound();

  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const category = product.categories?.[0] || null;
  const RELATED_COUNT = 6;

  // Same-category candidates first, scored by shared tags and price proximity,
  // then backfilled with featured and newest products.
  // See src/lib/recommendations.js.
  const related = await getAutoRelated({ seedIds: [product.id], limit: RELATED_COUNT });

  const price = Number(product.sale_price || product.unite_price);
  const imageUrl = product.images?.[0]?.image_path || `${siteUrl}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `Buy ${product.title} at ${siteName}`,
    image: imageUrl,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: siteName,
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${slug}`,
      priceCurrency: 'BDT',
      price,
      availability: product.variants?.length
        ? 'https://schema.org/InStock'
        : product.quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: siteName,
      },
    },
    category: category?.name || undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      ...(category
        ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${siteUrl}/categories/${category.slug}` }]
        : []),
      {
        '@type': 'ListItem',
        position: category ? 3 : 2,
        name: product.title,
        item: `${siteUrl}/products/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-[1440px] px-page-margin-mobile sm:px-4 lg:px-page-margin-desktop py-6 sm:py-10">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted sm:text-sm dark:text-dark-muted" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-primary">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          {category && (
            <>
              <Link href={`/categories/${category.slug}`} className="transition-colors hover:text-primary">
                {category.name}
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </>
          )}
          <span className="truncate text-on-surface dark:text-dark-text">{product.title}</span>
        </nav>

        <ProductDetailClient
          product={JSON.parse(JSON.stringify(product))}
          related={related}
          whatsappNumber={settings.whatsappNumber || ''}
        />
      </div>
    </>
  );
}
