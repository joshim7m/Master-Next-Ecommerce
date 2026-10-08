'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const FALLBACK_CEILING = 100000;

export default function FilterSidebar({ categories = [], activeSlug, priceCeiling }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A category page knows its category from the path; /products carries it as
  // ?category=. Either way the sidebar needs a single value to highlight.
  const selectedCategory = activeSlug || searchParams.get('category') || null;

  // The slider needs a ceiling that reflects real prices. Left at a hardcoded
  // 100000 while the catalogue tops out near 2000, the entire useful range is
  // squeezed into the first couple of percent of the track.
  const ceiling = Number(priceCeiling) > 0 ? Number(priceCeiling) : FALLBACK_CEILING;
  const step = Math.max(10, Math.ceil(ceiling / 100));

  const appliedMaxPrice = Math.min(Number(searchParams.get('maxPrice')) || ceiling, ceiling);
  const [maxPrice, setMaxPrice] = useState(appliedMaxPrice);

  // Keep the slider in step with the URL, so back/forward and a fresh navigation
  // don't leave it showing a value that is no longer applied.
  useEffect(() => {
    setMaxPrice(appliedMaxPrice);
  }, [appliedMaxPrice]);

  const [expandedParents, setExpandedParents] = useState(new Set());

  const parentCats = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const childMap = useMemo(() => {
    const map = {};
    for (const c of categories) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [categories]);

  // Categories are pages, not a query-param filter: /categories/[slug] resolves
  // its category from the path and never reads ?category=, so pushing that param
  // left the grid unchanged. Navigating is also what makes each item a real,
  // middle-clickable link.
  const categoryHref = (slug) => (slug ? `/categories/${slug}` : '/products');

  // Open the branch containing the active category, so arriving on a
  // sub-category never leaves it hidden behind a collapsed parent.
  const activeParentSlug = useMemo(() => {
    if (!selectedCategory) return null;
    if (parentCats.some((p) => p.slug === selectedCategory)) return selectedCategory;

    const child = categories.find((c) => c.slug === selectedCategory);
    if (!child?.parentId) return null;
    return parentCats.find((p) => p.id === child.parentId)?.slug ?? null;
  }, [selectedCategory, parentCats, categories]);

  const toggleParent = (slug) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Price stays a query param: both /products and /categories/[slug] read it.
  // Navigating between categories deliberately drops it, so each page starts
  // from a clean filter rather than inheriting a stale one.
  const applyPrice = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('maxPrice', String(maxPrice));
    router.push(`${pathname}?${sp.toString()}`);
  };

  const activeClass = 'bg-primary text-on-primary dark:bg-primary dark:text-white';

  // Children sit a shade dimmer than parents — that tonal step is the only cue
  // distinguishing the two levels once indentation is accounted for.
  const toneClass = (isActive, dim = false) =>
    isActive
      ? activeClass
      : dim
        ? 'text-muted hover:bg-warm-sand dark:text-dark-text/60 dark:hover:bg-dark-card'
        : 'text-on-surface/70 hover:bg-warm-sand dark:text-dark-text/70 dark:hover:bg-dark-card';

  const itemClass = (isActive, { dim = false } = {}) =>
    `block w-full rounded-lg px-3 py-2 text-left text-sm transition ${toneClass(isActive, dim)}`;

  const filterPanel = (
    <div className="rounded-xl border border-border bg-white p-5 shadow-ambient dark:border-dark-border dark:bg-dark-card">
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">
            Categories
          </h4>
          <div className="divide-y divide-border/50 dark:divide-dark-border/50">
            <Link
              href={categoryHref(null)}
              className={itemClass(!selectedCategory)}
              aria-current={!selectedCategory ? 'page' : undefined}
            >
              All
            </Link>

            {parentCats.map((parent) => {
              const children = childMap[parent.id] || [];
              const isParentSelected = selectedCategory === parent.slug;
              const isOpen = expandedParents.has(parent.slug) || activeParentSlug === parent.slug;
              const panelId = `filter-children-${parent.id}`;

              return (
                <div key={parent.id}>
                  <div className="flex items-center gap-1">
                    <Link
                      href={categoryHref(parent.slug)}
                      className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${toneClass(isParentSelected)}`}
                      aria-current={isParentSelected ? 'page' : undefined}
                    >
                      {parent.name}
                    </Link>
                    {children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleParent(parent.slug)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={`${isOpen ? 'Hide' : 'Show'} sub-categories of ${parent.name}`}
                        className="shrink-0 p-2 text-muted hover:text-on-surface dark:text-dark-muted dark:hover:text-dark-text"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        >
                          chevron_right
                        </span>
                      </button>
                    )}
                  </div>

                  {isOpen && children.length > 0 && (
                    <div
                      id={panelId}
                      className="ml-5 divide-y divide-border/50 border-l-2 border-border/50 pl-2 dark:divide-dark-border/50 dark:border-dark-border/50"
                    >
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={categoryHref(child.slug)}
                          className={itemClass(selectedCategory === child.slug, { dim: true })}
                          aria-current={selectedCategory === child.slug ? 'page' : undefined}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">
            Price Range
          </h4>
          <div className="space-y-3">
            <input
              type="range"
              min="0"
              max={ceiling}
              step={step}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary dark:accent-primary"
              aria-label="Maximum price"
            />
            <div className="flex items-center justify-between text-sm text-on-surface/70 dark:text-dark-text/70">
              <span>৳0</span>
              <span>৳{maxPrice.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={applyPrice}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm text-on-primary transition hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <aside className="hidden shrink-0 lg:block lg:w-64">
      {filterPanel}
    </aside>
  );
}
