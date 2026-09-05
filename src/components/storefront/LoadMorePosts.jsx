'use client';

import { useState } from 'react';
import { getBlogPosts } from '../../../src/actions/blog';
import BlogCard from './BlogCard';

export default function LoadMorePosts({ initialPosts, total, perPage, categoryId }) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasMore = posts.length < total;

  const loadMore = async () => {
    setLoading(true);
    try {
      const result = await getBlogPosts({
        page: page + 1,
        perPage,
        categoryId,
      });
      setPosts((prev) => [...prev, ...result.posts]);
      setPage((prev) => prev + 1);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} horizontal />
      ))}
      {hasMore && (
        <div className="pt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-6 py-3 text-sm font-medium text-on-surface/70 shadow-ambient transition hover:bg-warm-sand hover:border-primary/30 disabled:opacity-50 dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:bg-dark-card"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : null}
            {loading ? 'Loading...' : `Load More (${posts.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
