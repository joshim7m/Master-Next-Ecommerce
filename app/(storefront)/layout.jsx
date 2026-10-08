import { Suspense } from 'react';
import Header from '@/src/components/storefront/Header';
import Footer from '@/src/components/storefront/Footer';
import GoogleTagManager from '@/src/components/storefront/GoogleTagManager';
import PageViewTracker from '@/src/components/storefront/PageViewTracker';
import prisma from '@/src/lib/prisma';
import { getSiteSettings } from '@/src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf, brandSuffix, seoDescription, seoKeywords } from '@/src/lib/siteSettings';
import { buildCategoryTreeForMenu } from '@/src/lib/categoryTree';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);
  const suffix = brandSuffix(settings);
  // Title is the admin's site name / metaTitle only — no hardcoded slogan.
  // Description and keywords are emitted only when the admin entered them.
  const defaultTitle = settings.metaTitle || siteName;
  const description = seoDescription(settings);
  const keywords = seoKeywords(settings);

  const ogQuery = new URLSearchParams({
    title: siteName,
    type: 'website',
    siteName,
    ...(description ? { subtitle: description.slice(0, 120) } : {}),
  });
  const ogImage = settings.ogImage || `${siteUrl}/api/og?${ogQuery.toString()}`;

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${suffix}`,
    },
    ...(description ? { description } : {}),
    ...(keywords ? { keywords } : {}),
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_BD',
      url: siteUrl,
      siteName,
      title: defaultTitle,
      ...(description ? { description } : {}),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: defaultTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      ...(description ? { description } : {}),
      images: [ogImage],
      creator: `@${siteName.replace(/\s+/g, '').toLowerCase()}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function StorefrontLayout({ children }) {
  const [settings, socialLinks, categoryRows, footerPages] = await Promise.all([
    getSiteSettings(),
    prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }).catch(() => []),
    // Only the four fields the mega-menu renders, so the whole tree is cheap
    // to serialise into the client Header on every storefront page.
    prisma.category
      .findMany({
        select: { id: true, name: true, slug: true, parentId: true },
        orderBy: { name: 'asc' },
      })
      .catch(() => []),
    // Published admin-managed pages, linked from the footer Company column.
    prisma.page
      .findMany({
        where: { status: 'publish' },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
      .catch(() => []),
  ]);

  const menuCategories = buildCategoryTreeForMenu(categoryRows);

  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: settings.logo || `${siteUrl}/api/og?title=${encodeURIComponent(siteName)}&type=website`,
    areaServed: {
      '@type': 'Country',
      name: 'Bangladesh',
    },
    sameAs: socialLinks.map((l) => l.url).filter(Boolean),
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/categories?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <GoogleTagManager gtmId={settings.gtmId} />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary focus:outline-none">Skip to content</a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Header
        siteName={settings.siteName}
        logo={settings.logo}
        mobile={settings.mobile}
        announcementText={settings.announcementText}
        categories={menuCategories}
      />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer
        siteName={settings.siteName}
        mobile={settings.mobile}
        email={settings.email}
        address={settings.address}
        copyrightText={settings.copyrightText}
        socialLinks={socialLinks}
        pages={footerPages}
      />
      </div>
    </>
  );
}