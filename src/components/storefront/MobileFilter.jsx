'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

export default function MobileFilter({ onClose }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get('category') || null;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState(new Set());

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
    onClose?.();
  };

  const toggleParent = (slug) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const btnClass = (isActive) =>
    `block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
      isActive
        ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
    }`;

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2f0f6b] border-t-transparent dark:border-[#a78bfa]" />
      </div>
    );
  }

  return (
    <div className="space-y-1 px-4 py-4">
      <div className="space-y-1 divide-y divide-indigo-100 dark:divide-transparent">
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
                      ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {parent.name}
                </button>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleParent(parent.slug)}
                    className="shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              {isOpen && children.length > 0 && (
                <div className="ml-5 border-l-2 border-slate-100 pl-2 dark:border-slate-700 divide-y divide-indigo-100 dark:divide-transparent">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleCategoryChange(child.slug)}
                      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        selectedCategory === child.slug
                          ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
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
  );
}
