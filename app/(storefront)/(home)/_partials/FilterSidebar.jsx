'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

export default function FilterSidebar({ categories }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get('category') || null;
  const currentMaxPrice = Number(searchParams.get('maxPrice') || 100000);

  const [localRange, setLocalRange] = useState([0, currentMaxPrice]);
  const [expandedParents, setExpandedParents] = useState(new Set());

  const parentCats = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

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

  const buildHref = (params) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === '0') {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    });
    const qs = sp.toString();
    return qs ? `?${qs}` : '/';
  };

  const handleCategoryChange = (slug) => {
    router.push(buildHref({ category: slug }));
  };

  const toggleParent = (slug) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const applyPrice = () => {
    router.push(buildHref({ maxPrice: String(localRange[1]) }));
  };

  const btnClass = (isActive) =>
    `block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
      isActive
        ? 'bg-primary text-on-primary dark:bg-primary dark:text-white'
        : 'text-on-surface/70 hover:bg-warm-sand dark:text-dark-text/70 dark:hover:bg-dark-card'
    }`;

  const filterPanel = (
    <div className="rounded-xl border border-border bg-white p-5 shadow-ambient dark:border-dark-border dark:bg-dark-card">
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 font-label-caps text-[0.65rem] text-muted dark:text-dark-muted">
            Categories
          </h4>
          <div className="divide-y divide-border/50 dark:divide-dark-border/50">
            <button
              type="button"
              onClick={() => handleCategoryChange(null)}
              className={btnClass(!selectedCategory)}
            >
              All
            </button>

            {parentCats.map((parent) => {
              const children = childMap[parent.id] || [];
              const isParentSelected = selectedCategory === parent.slug;
              const isOpen = expandedParents.has(parent.slug);

              return (
                <div key={parent.id}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCategoryChange(parent.slug)}
                      className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
                        isParentSelected
                          ? 'bg-primary text-on-primary dark:bg-primary dark:text-white'
                          : 'text-on-surface/70 hover:bg-warm-sand dark:text-dark-text/70 dark:hover:bg-dark-card'
                      }`}
                    >
                      {parent.name}
                    </button>
                    {children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleParent(parent.slug)}
                        className="shrink-0 p-2 text-muted hover:text-on-surface dark:text-dark-muted dark:hover:text-dark-text"
                      >
                        <span className={`material-symbols-outlined text-[18px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                          chevron_right
                        </span>
                      </button>
                    )}
                  </div>

                  {isOpen && children.length > 0 && (
                    <div className="ml-5 divide-y divide-border/50 border-l-2 border-border/50 pl-2 dark:divide-dark-border/50 dark:border-dark-border/50">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleCategoryChange(child.slug)}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                            selectedCategory === child.slug
                              ? 'bg-primary text-on-primary dark:bg-primary dark:text-white'
                              : 'text-muted hover:bg-warm-sand dark:text-dark-muted dark:hover:bg-dark-card'
                          }`}
                        >
                          {child.name}
                        </button>
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
              max="100000"
              step="100"
              value={localRange[1]}
              onChange={(e) => setLocalRange([0, Number(e.target.value)])}
              className="w-full accent-primary dark:accent-primary"
            />
            <div className="flex items-center justify-between text-sm text-on-surface/70 dark:text-dark-text/70">
              <span>৳0</span>
              <span>৳{localRange[1].toLocaleString()}</span>
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
