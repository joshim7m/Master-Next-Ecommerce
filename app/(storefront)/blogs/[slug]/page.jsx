import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '../../../../src/lib/prisma';
import { injectAdsIntoContent } from '../../../../src/lib/blog-ads';
import AdCard from '../../../../src/components/storefront/AdCard';
import { getSiteSettings } from '../../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../../src/lib/siteSettings';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [settings, post] = await Promise.all([
    getSiteSettings(),
    prisma.blogPost.findUnique({
      where: { slug },
      include: { category: true },
    }),
  ]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  if (!post || post.status !== 'publish') return {};

  const description = post.metaDescription || post.content.replace(/<[^>]+>/g, '').slice(0, 160);
  const imageUrl = post.bannerImage || `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&type=website`;

  return {
    title: { absolute: `${post.title} | ${siteName} Blog` },
    description,
    keywords: post.tags || undefined,
    alternates: { canonical: `/blogs/${post.slug}` },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `${siteUrl}/blogs/${post.slug}`,
      siteName,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.category?.authorName ? [post.category.authorName] : undefined,
      section: post.category?.title,
      tags: post.tags ? post.tags.split(',').map((t) => t.trim()) : undefined,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [imageUrl],
      creator: `@${siteName.replace(/\s+/g, '').toLowerCase()}`,
    },
  };
}

async function getPost(slug) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      category: true,
      advertisements: { include: { advertisement: true } },
    },
  });

  if (!post || post.status !== 'publish') return null;

  const [related, allPublished] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: 'publish', categoryId: post.categoryId, id: { not: post.id } },
      include: { category: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.blogPost.findMany({
      where: { status: 'publish', id: { not: post.id }, categoryId: { not: post.categoryId } },
      take: 2,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const morePosts = related.length >= 3 ? related : [...related, ...allPublished].slice(0, 3);

  const ads = post.advertisements.map((pa) => pa.advertisement).filter(Boolean);
  const contentWithAds = injectAdsIntoContent(post.content, ads);

  const wordCount = post.content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil((wordCount / 200)));

  return {
    post: JSON.parse(JSON.stringify(post)),
    related: JSON.parse(JSON.stringify(morePosts)),
    ads: JSON.parse(JSON.stringify(ads)),
    contentWithAds,
    readingTime,
    wordCount,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const [settings, data] = await Promise.all([getSiteSettings(), getPost(slug)]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  if (!data) return notFound();

  const { post, related, ads, contentWithAds, readingTime, wordCount } = data;
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const modifiedDate = new Date(post.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription || post.content.replace(/<[^>]+>/g, '').slice(0, 160),
    image: post.bannerImage,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: post.category?.authorName ? {
      '@type': 'Person',
      name: post.category.authorName,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blogs/${post.slug}`,
    },
    wordCount,
    articleSection: post.category?.title,
    keywords: post.tags || undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blogs` },
      ...(post.category ? [{ '@type': 'ListItem', position: 3, name: post.category.title, item: `${siteUrl}/blogs/category/${post.category.slug}` }] : []),
      { '@type': 'ListItem', position: post.category ? 4 : 3, name: post.title, item: `${siteUrl}/blogs/${post.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article itemScope itemType="https://schema.org/BlogPosting">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-white/80 backdrop-blur-sm dark:border-dark-border dark:bg-dark-surface/80">
          <nav className="mx-auto flex max-w-4xl items-center gap-1.5 px-page-margin-mobile py-3 text-xs text-muted sm:px-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link href="/blogs" className="hover:text-primary transition-colors">Blog</Link>
            {post.category && (
              <>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link href={`/blogs/category/${post.category.slug}`} className="hover:text-primary transition-colors">{post.category.title}</Link>
              </>
            )}
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="truncate text-on-surface/60 dark:text-dark-text/60" itemProp="headline">{post.title}</span>
          </nav>
        </div>

        <div className="mx-auto max-w-4xl px-page-margin-mobile pb-12 sm:px-6 sm:pb-16">
          {/* Banner */}
          {post.bannerImage && (
            <div className="mb-8 overflow-hidden rounded-xl shadow-ambient dark:shadow-none">
              <img src={post.bannerImage} alt={post.title} className="w-full h-[220px] sm:h-[400px] object-cover" itemProp="image" />
            </div>
          )}

          {/* Header */}
          <header className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-4">
              {post.category && (
                <Link
                  href={`/blogs/category/${post.category.slug}`}
                  className="inline-block rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-on-primary shadow-sm hover:shadow-md transition"
                  itemProp="articleSection"
                >{post.category.title}</Link>
              )}
            </div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-dark-text leading-tight sm:text-4xl sm:leading-tight" itemProp="headline">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {post.category?.authorName && (
                <span className="inline-flex items-center gap-2" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white shadow-sm">
                    {post.category.authorName.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-on-surface/70 dark:text-dark-text/70" itemProp="name">{post.category.authorName}</span>
                </span>
              )}
              <time dateTime={post.createdAt} className="inline-flex items-center gap-1.5 text-muted dark:text-dark-muted" itemProp="datePublished">
                <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                {date}
              </time>
              <meta itemProp="dateModified" content={post.updatedAt} />
              <span className="hidden md:inline-flex items-center gap-1.5 text-muted dark:text-dark-muted">
                <span className="material-symbols-outlined text-[16px] text-success">schedule</span>
                {readingTime} min read
              </span>
            </div>
          </header>

          {/* Content with ads */}
          <div
            className="prose prose-slate max-w-none prose-headings:text-on-surface prose-a:text-primary prose-img:rounded-lg prose-p:leading-relaxed sm:prose-lg dark:prose-invert dark:prose-headings:text-dark-text dark:prose-a:text-primary dark:prose-strong:text-dark-text"
            dangerouslySetInnerHTML={{ __html: contentWithAds }}
            itemProp="articleBody"
          />

          {/* Fallback ads */}
          {ads.length > 0 && !contentWithAds.includes('blog-ad') && (
            <div className="mt-10 space-y-6">
              <h2 className="text-lg font-semibold text-on-surface dark:text-dark-text">Sponsored</h2>
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && (
            <div className="mt-6 flex flex-wrap gap-1.5" itemProp="keywords">
              {post.tags.split(',').map((tag) => {
                const colors = [
                  'bg-primary/10 text-primary',
                  'bg-secondary/10 text-secondary',
                  'bg-success/10 text-success',
                  'bg-warning/10 text-warning',
                  'bg-primary/10 text-primary',
                  'bg-secondary/10 text-secondary',
                  'bg-success/10 text-success',
                  'bg-warning/10 text-warning',
                  'bg-primary/10 text-primary',
                  'bg-secondary/10 text-secondary',
                ];
                const idx = tag.trim().length % colors.length;
                return (
                  <span key={tag.trim()} className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[idx]}`}>
                    {tag.trim()}
                  </span>
                );
              })}
            </div>
          )}

          {/* Bottom navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-border dark:border-dark-border pt-6">
            <Link href="/blogs" className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface/60 dark:text-dark-text/60 hover:text-primary transition">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Blog
            </Link>
          </div>

          {/* Related Posts */}
          {related.length > 0 && (
            <section className="mt-10 border-t border-border dark:border-dark-border pt-8">
              <h2 className="mb-5 text-lg font-bold text-on-surface dark:text-dark-text">Related Articles</h2>
              <div className="grid gap-5 sm:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.id} href={`/blogs/${r.slug}`} className="group">
                    {r.bannerImage ? (
                      <div className="overflow-hidden rounded-lg image-hover-zoom">
                        <img src={r.bannerImage} alt={r.title} className="h-40 w-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-lg bg-warm-sand dark:bg-dark-card text-muted dark:text-dark-muted">
                        <span className="material-symbols-outlined text-[32px]">article</span>
                      </div>
                    )}
                    <h3 className="mt-2.5 text-sm font-semibold text-on-surface dark:text-dark-text group-hover:text-primary transition-colors line-clamp-2">{r.title}</h3>
                    <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
