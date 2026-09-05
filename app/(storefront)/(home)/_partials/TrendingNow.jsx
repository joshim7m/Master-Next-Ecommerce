'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import TrendingCard from '../../../../src/components/storefront/TrendingCard';

const LOAD_MORE_SIZE = 6;

function SkeletonCard({ index }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-white dark:border-dark-border/60 dark:bg-dark-card"
      style={{ animationDelay: `${(index % LOAD_MORE_SIZE) * 60}ms` }}
    >
      <div className="skeleton-shimmer aspect-square w-full" />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded" />
        <div className="skeleton-shimmer mt-1 h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function TrendingNow({ products = [] }) {
  const initial = products.slice(0, 12);

  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length === 12);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/more?skip=${items.length}&take=${LOAD_MORE_SIZE}`);
      if (!res.ok) throw new Error('Failed to load products');
      const next = await res.json();
      setItems((prev) => [...prev, ...next]);
      setHasMore(next.length === LOAD_MORE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [items.length, loading]);

  if (!products.length) return null;

  return (
    <section className="py-section-gap px-page-margin-mobile md:px-page-margin-desktop max-w-[1440px] mx-auto">
      <div className="flex justify-between items-end mb-stack-lg">
        <h2 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-editorial-ink dark:text-dark-text">
          Trending Now
        </h2>
        <Link
          href="/products"
          className="font-semibold text-xs text-secondary underline hover:text-editorial-ink dark:hover:text-dark-text transition-colors uppercase tracking-widest whitespace-nowrap"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
        {items.map((product, i) => (
          <div key={`${product.id}-${i}`} className="animate-fade-in">
            <TrendingCard product={product} index={i} />
          </div>
        ))}
        {loading &&
          Array.from({ length: LOAD_MORE_SIZE }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} index={i} />
          ))}
      </div>

      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="w-full rounded-xl border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-on-primary active:scale-95 dark:bg-dark-card dark:hover:bg-primary dark:hover:text-on-primary sm:w-auto sm:px-10 sm:py-3.5"
          >
            Load More
          </button>
        </div>
      )}

      {!hasMore && items.length > 12 && (
        <p className="mt-6 text-center text-xs text-muted sm:mt-8 sm:text-sm dark:text-dark-muted">
          Showing all {items.length} products
        </p>
      )}
    </section>
  );
}