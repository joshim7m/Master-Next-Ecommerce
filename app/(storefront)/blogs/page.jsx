import Link from 'next/link';
import prisma from '../../../src/lib/prisma';
import BlogCard from '../../../src/components/storefront/BlogCard';
import LoadMorePosts from '../../../src/components/storefront/LoadMorePosts';
import { getSiteSettings } from '../../../src/lib/getSiteSettings';
import { siteNameOf, siteUrlOf } from '../../../src/lib/siteSettings';

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const categorySlug = params?.category || null;

  const [settings, category] = await Promise.all([
    getSiteSettings(),
    categorySlug ? prisma.blogCategory.findUnique({ where: { slug: categorySlug } }) : Promise.resolve(null),
  ]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const title = category
    ? `${category.title} Articles | ${siteName} Blog`
    : `Blog | ${siteName} — Lingerie, Fashion & Style Tips`;

  const description = category
    ? `Read our latest ${category.title} articles at ${siteName} Bangladesh. Shop online with cash on delivery.`
    : `Read our latest articles about lingerie, women's fashion, intimate wear tips, and style guides at ${siteName} Bangladesh. Cash on delivery, discreet packaging.`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: category ? `/blogs?category=${category.slug}` : '/blogs',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${siteUrl}${category ? `/blogs?category=${category.slug}` : '/blogs'}`,
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const INITIAL_POSTS = 5;

async function getInitialData(searchParams) {
  const params = await searchParams;
  const categorySlug = params?.category || '';
  const where = { status: 'publish' };
  if (categorySlug) {
    const cat = await prisma.blogCategory.findUnique({ where: { slug: categorySlug } });
    if (cat) where.categoryId = cat.id;
  }

  const [posts, total, categories, recentPosts] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: INITIAL_POSTS,
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({
      where: { status: 'publish' },
      include: { _count: { select: { posts: true } } },
      orderBy: { title: 'asc' },
    }),
    prisma.blogPost.findMany({
      where: { status: 'publish' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    posts: JSON.parse(JSON.stringify(posts)),
    total,
    categories: JSON.parse(JSON.stringify(categories)),
    recentPosts: JSON.parse(JSON.stringify(recentPosts)),
    activeCategory: categorySlug,
    categoryId: where.categoryId || '',
  };
}

export default async function BlogListingPage({ searchParams }) {
  const [settings, { posts, total, categories, recentPosts, activeCategory, categoryId }] = await Promise.all([
    getSiteSettings(),
    getInitialData(searchParams),
  ]);
  const siteName = siteNameOf(settings);
  const siteUrl = siteUrlOf(settings);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blogs` },
    ],
  };

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${siteName} Blog`,
    description: `Tips, guides, and inspiration for lingerie, women's fashion, and intimate wear — from ${siteName}.`,
    url: `${siteUrl}/blogs`,
    blogPost: posts.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${siteUrl}/blogs/${p.slug}`,
      datePublished: p.createdAt,
      author: p.category?.authorName ? { '@type': 'Person', name: p.category.authorName } : undefined,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />

      <div className="mx-auto max-w-[1440px] px-page-margin-mobile py-8 sm:px-6 lg:px-page-margin-desktop sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface dark:text-dark-text">Blog</span>
        </nav>

        <div className="mb-8">
          <h1 className="font-display text-headline-md font-bold text-on-surface dark:text-dark-text">Blog</h1>
          <p className="mt-1 text-muted dark:text-dark-muted">Tips, guides, and inspiration for lingerie, fashion, and intimate wear</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="min-w-0 flex-1">
            {total === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-500">No posts yet. Check back soon!</p>
              </div>
            ) : (
              <LoadMorePosts
                initialPosts={posts}
                total={total}
                perPage={INITIAL_POSTS}
                categoryId={categoryId}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-80" aria-label="Blog sidebar">
            <div className="space-y-8 lg:sticky lg:top-24">
              {/* Categories */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-ambient dark:border-dark-border dark:bg-dark-card">
                <h2 className="mb-3 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">Categories</h2>
                <ul className="space-y-1.5">
                  <li>
                    <Link
                      href="/blogs"
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        !activeCategory ? 'bg-primary/10 font-medium text-primary' : 'text-on-surface/70 hover:bg-warm-sand hover:text-on-surface dark:text-dark-text/70 dark:hover:bg-dark-card dark:hover:text-dark-text'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-warm-sand text-xs font-semibold text-muted dark:bg-dark-card dark:text-dark-muted">All</span>
                        <span>All Posts</span>
                      </span>
                      <span className="rounded-full bg-warm-sand px-2 py-0.5 text-xs text-muted dark:bg-dark-card dark:text-dark-muted">{total}</span>
                    </Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/blogs/category/${cat.slug}`}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          activeCategory === cat.slug ? 'bg-primary/10 font-medium text-primary' : 'text-on-surface/70 hover:bg-warm-sand hover:text-on-surface dark:text-dark-text/70 dark:hover:bg-dark-card dark:hover:text-dark-text'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.title} className="h-7 w-7 rounded-md object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-warm-sand text-xs font-semibold text-muted dark:bg-dark-card dark:text-dark-muted">{cat.title.charAt(0).toUpperCase()}</span>
                          )}
                          <span>{cat.title}</span>
                        </span>
                        <span className="rounded-full bg-warm-sand px-2 py-0.5 text-xs text-muted dark:bg-dark-card dark:text-dark-muted">{cat._count?.posts ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Posts */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-ambient dark:border-dark-border dark:bg-dark-card">
                <h2 className="mb-3 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">Recent Posts</h2>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link key={post.id} href={`/blogs/${post.slug}`} className="group flex gap-3">
                      {post.bannerImage ? (
                        <img src={post.bannerImage} alt={post.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-warm-sand text-muted dark:bg-dark-card dark:text-dark-muted">
                          <span className="material-symbols-outlined text-[20px]">article</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface line-clamp-2 group-hover:text-primary transition-colors dark:text-dark-text dark:group-hover:text-primary">{post.title}</p>
                        <p className="mt-0.5 text-xs text-muted dark:text-dark-muted">
                          {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
