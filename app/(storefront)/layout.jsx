import { Suspense } from 'react';
import Header from '@/src/components/storefront/Header';
import Footer from '@/src/components/storefront/Footer';
import GoogleTagManager from '@/src/components/storefront/GoogleTagManager';
import PageViewTracker from '@/src/components/storefront/PageViewTracker';
import prisma from '@/src/lib/prisma';
import { getSiteSettings } from '@/src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf, brandSuffix } from '@/src/lib/siteSettings';

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);
  const suffix = brandSuffix(settings);
  const defaultTitle = settings.metaTitle
    ? `${settings.metaTitle} — Bangladesh's Trusted Online Lingerie & Women's Intimates Store`
    : `${siteName} — Bangladesh's Trusted Online Lingerie & Women's Intimates Store`;
  const description =
    settings.metaDescription ||
    `Shop premium lingerie, bras, panties, nightwear, and women's intimate apparel at ${siteName}. ` +
      'We offer discreet packaging, cash on delivery across Bangladesh, and sizes that fit every body. ' +
      'From everyday comfort to something a little special — delivered right to your doorstep in Dhaka, Chittagong, Sylhet, and everywhere in between.';
  const keywords = settings.metaKeywords
    ? settings.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [
        'lingerie Bangladesh',
        'bra shop online BD',
        'panty buy Bangladesh',
        'nightwear for women Bangladesh',
        'women innerwear online Dhaka',
        'sexy lingerie Bangladesh',
        'bra panty set BD',
        'night dress women',
        'intimate apparel Bangladesh',
        'women underwear online shopping',
        'Secret clothing Bangladesh',
        siteName,
      ];
  const ogSubtitle = description.slice(0, 120);
  const ogImage = settings.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(siteName)}&subtitle=${encodeURIComponent(ogSubtitle)}&siteName=${encodeURIComponent(siteName)}`;

  return {
    title: {
      default: defaultTitle,
      template: `%s | ${suffix}`,
    },
    description,
    keywords,
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
      description,
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
      description,
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
    verification: {},
  };
}

export default async function StorefrontLayout({ children }) {
  const [settings, socialLinks] = await Promise.all([
    getSiteSettings(),
    prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }).catch(() => []),
  ]);

  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: settings.logo || `${siteUrl}/api/og?title=${encodeURIComponent(siteName)}&type=website`,
    description:
      `${siteName} — Bangladesh's trusted online store for premium lingerie, bras, panties, nightwear, and women's intimate apparel with discreet delivery nationwide.`,
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
      />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer
        siteName={settings.siteName}
        mobile={settings.mobile}
        email={settings.email}
        address={settings.address}
        copyrightText={settings.copyrightText}
        socialLinks={socialLinks}
      />
      </div>
    </>
  );
}