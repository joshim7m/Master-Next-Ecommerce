'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import TrendingCard from '../../../../src/components/storefront/TrendingCard';

function LoadMoreButton({ onClick, remaining }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-6 flex justify-center sm:mt-8">
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-xl border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-on-primary active:scale-95 dark:bg-dark-card dark:hover:bg-primary dark:hover:text-on-primary sm:w-auto sm:px-10 sm:py-3.5 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Load More ({remaining} left)
      </button>
    </div>
  );
}

export default function ProductGrid({ products, pageSize = 12 }) {
  const [visible, setVisible] = useState(pageSize);

  const totalCount = products.length;
  const displayed = products.slice(0, visible);
  const hasMore = visible < totalCount;

  const handleLoadMore = useCallback(() => {
    setVisible((v) => Math.min(v + pageSize, totalCount));
  }, [pageSize, totalCount]);

  if (!totalCount) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-16 text-center dark:border-dark-border dark:bg-dark-card">
        <span className="mb-4 material-symbols-outlined text-[48px] text-muted/30 dark:text-dark-muted/30">
          inventory_2
        </span>
        <p className="text-muted dark:text-dark-muted">No products match your filters.</p>
        <Link href="/" className="mt-3 text-sm font-medium text-primary hover:underline">
          Clear all filters
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {displayed.map((product, i) => (
          <div key={product.id} className="animate-fade-in">
            <TrendingCard product={product} index={i} />
          </div>
        ))}
      </div>

      {hasMore && (
        <LoadMoreButton onClick={handleLoadMore} remaining={totalCount - visible} />
      )}

      {!hasMore && totalCount > pageSize && (
        <p className="mt-6 text-center text-xs text-muted sm:mt-8 sm:text-sm dark:text-dark-muted">
          Showing all {totalCount} products
        </p>
      )}
    </div>
  );
}
