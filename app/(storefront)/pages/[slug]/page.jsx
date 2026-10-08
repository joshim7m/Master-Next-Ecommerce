import { cache } from 'react';
import { notFound } from 'next/navigation';
import prisma from '../../../../src/lib/prisma';
import { getSiteSettings } from '../../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../../src/lib/siteSettings';

// Only published pages are reachable on the storefront; drafts 404.
const getPublishedPage = cache(async (slug) => {
  const page = await prisma.page.findUnique({ where: { slug } });
  return page && page.status === 'publish' ? page : null;
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getPublishedPage(slug),
  ]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  if (!page) return {};

  const plain = page.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const description = page.metaDescription || plain.slice(0, 160);
  const title = `${page.name} | ${siteName}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/pages/${page.slug}` },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${siteUrl}/pages/${page.slug}`,
      siteName,
      publishedTime: page.createdAt.toISOString(),
      modifiedTime: page.updatedAt.toISOString(),
    },
  };
}

export default async function PageDetail({ params }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);

  if (!page) notFound();

  return (
    <main className="mx-auto max-w-4xl px-page-margin-mobile py-10 sm:px-4 sm:py-12">
      {/* Content in the site's standard container box */}
      <div className="rounded-2xl border border-border bg-white shadow-ambient dark:border-dark-border dark:bg-dark-card">
        <div className="border-b border-border px-5 py-7 sm:px-10 sm:py-9 dark:border-dark-border">
          <h1 className="font-display text-headline-md font-bold text-on-surface sm:text-headline-lg dark:text-dark-text">{page.name}</h1>
        </div>

        <div className="px-5 py-7 sm:px-10 sm:py-9">
          <div
            className="prose prose-slate max-w-none prose-headings:text-on-surface prose-a:text-primary prose-img:rounded-lg prose-p:leading-relaxed sm:prose-lg dark:prose-invert dark:prose-headings:text-dark-text dark:prose-a:text-primary dark:prose-strong:text-dark-text"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </div>
    </main>
  );
}