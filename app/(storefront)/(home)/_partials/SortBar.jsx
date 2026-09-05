'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest', icon: 'schedule' },
  { value: 'oldest', label: 'Oldest', icon: 'history' },
  { value: 'price_asc', label: 'Price ↑', icon: 'arrow_upward' },
  { value: 'price_desc', label: 'Price ↓', icon: 'arrow_downward' },
];

export default function SortBar({ productCount }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentSort = searchParams.get('sort') || 'latest';
  const current = SORT_OPTIONS.find((o) => o.value === currentSort) || SORT_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSort = (value) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === 'latest') {
      sp.delete('sort');
    } else {
      sp.set('sort', value);
    }
    const qs = sp.toString();
    router.push(qs ? `?${qs}` : '/');
    setOpen(false);
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
      <p className="text-sm text-muted dark:text-dark-muted">
        {productCount} {productCount === 1 ? 'product' : 'products'}
      </p>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-on-surface transition hover:border-primary hover:text-primary sm:px-4 dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:border-primary dark:hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">{current.icon}</span>
          <span className="hidden sm:inline">{current.label}</span>
          <span className={`material-symbols-outlined text-[16px] text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-ambient dark:border-dark-border dark:bg-dark-card">
            {SORT_OPTIONS.map((opt) => {
              const isActive = currentSort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSort(opt.value)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-primary/5 font-medium text-primary'
                      : 'text-on-surface/70 hover:bg-warm-sand dark:text-dark-text/70 dark:hover:bg-dark-card'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                  {opt.label}
                  {isActive && (
                    <span className="ml-auto material-symbols-outlined text-[18px] text-primary">check</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
