'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

const chipColors = [
  'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30',
  'bg-secondary/10 text-secondary border-secondary/20 dark:bg-secondary/20 dark:text-secondary dark:border-secondary/30',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700',
  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
];

export default function MobileCategoryChips({ parentCats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category') || null;

  const buildHref = (slug) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (slug === null || slug === undefined) {
      sp.delete('category');
    } else {
      sp.set('category', slug);
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : '/';
  };

  const colored = useMemo(() => {
    if (!parentCats) return [];
    return parentCats.map((cat, i) => ({
      cat,
      color: chipColors[i % chipColors.length],
    }));
  }, [parentCats]);

  return (
    <div className="mt-4 mb-4 flex items-center gap-3 overflow-x-auto lg:hidden scrollbar-none">
      <button
        type="button"
        onClick={() => router.push(buildHref(null))}
        className={`shrink-0 rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
          !selectedCategory
            ? 'bg-editorial-ink text-white ring-2 ring-editorial-ink/30 shadow-lg dark:bg-white dark:text-editorial-ink dark:ring-white/30'
            : 'border border-border bg-white text-on-surface/70 hover:bg-warm-sand hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70 dark:hover:bg-dark-card'
        }`}
      >
        All
      </button>
      {colored.map(({ cat, color }) => {
        const active = selectedCategory === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => router.push(buildHref(cat.slug))}
            className={`shrink-0 rounded-full border px-5 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
              active
                ? `${color} ring-2 ring-current/20 shadow-lg`
                : `border-border bg-white text-on-surface/70 hover:bg-warm-sand hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:text-dark-text/70`
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
