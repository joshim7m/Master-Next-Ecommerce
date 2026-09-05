import Link from 'next/link';

export default function BlogCard({ post, horizontal = true }) {
  const excerpt = post.metaDescription || (post.content ? post.content.replace(/<[^>]+>/g, '').slice(0, 150) + '...' : '');
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (!horizontal) {
    return (
      <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-ambient transition hover:shadow-ambient-lg dark:border-dark-border dark:bg-dark-card">
        <Link href={`/blogs/${post.slug}`} className="block overflow-hidden image-hover-zoom">
          {post.bannerImage ? (
            <img src={post.bannerImage} alt={post.title} className="h-48 w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-48 items-center justify-center bg-warm-sand text-muted dark:bg-dark-card dark:text-dark-muted">
              <span className="material-symbols-outlined text-[40px]">article</span>
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-2 text-xs text-muted dark:text-dark-muted">
            {post.category && (
               <Link href={`/blogs/category/${post.category.slug}`} className="font-medium text-primary hover:underline">{post.category.title}</Link>
            )}
            <span>&middot;</span>
            <time dateTime={post.createdAt}>{date}</time>
            {post.category?.authorName && (
              <><span>&middot;</span><span>{post.category.authorName}</span></>
            )}
          </div>
          <Link href={`/blogs/${post.slug}`} className="mt-2 block">
            <h2 className="text-lg font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors dark:text-dark-text dark:group-hover:text-primary">{post.title}</h2>
          </Link>
          <p className="mt-2 text-sm text-muted line-clamp-3 dark:text-dark-muted">{excerpt}</p>
          <div className="mt-4 flex items-center gap-2">
            {post.tags && post.tags.split(',').slice(0, 3).map((tag) => (
              <span key={tag.trim()} className="rounded-full bg-warm-sand px-2.5 py-0.5 text-xs text-on-surface/60 dark:bg-dark-card dark:text-dark-text/60">{tag.trim()}</span>
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-ambient transition hover:shadow-ambient-lg dark:border-dark-border dark:bg-dark-card md:flex-row">
      <Link href={`/blogs/${post.slug}`} className="block w-full shrink-0 overflow-hidden image-hover-zoom md:w-72">
        {post.bannerImage ? (
          <img src={post.bannerImage} alt={post.title} className="h-48 w-full object-cover md:h-full" loading="lazy" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-warm-sand text-muted md:h-full dark:bg-dark-card dark:text-dark-muted">
            <span className="material-symbols-outlined text-[40px]">article</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col justify-center p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted dark:text-dark-muted">
          {post.category && (
            <Link href={`/blogs/category/${post.category.slug}`} className="font-medium text-primary hover:underline">{post.category.title}</Link>
          )}
          <span>&middot;</span>
          <time dateTime={post.createdAt}>{date}</time>
        </div>
        <Link href={`/blogs/${post.slug}`} className="mt-2 block">
          <h2 className="text-base md:text-xl font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors dark:text-dark-text dark:group-hover:text-primary">
            {post.title}
          </h2>
        </Link>
        <p className="mt-2 text-sm text-muted line-clamp-2 dark:text-dark-muted">{excerpt}</p>
        <div className="mt-3 hidden md:flex items-center gap-2">
          {post.tags && post.tags.split(',').slice(0, 3).map((tag) => (
            <span key={tag.trim()} className="rounded-full bg-warm-sand px-2.5 py-0.5 text-xs text-on-surface/60 dark:bg-dark-card dark:text-dark-text/60">{tag.trim()}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
