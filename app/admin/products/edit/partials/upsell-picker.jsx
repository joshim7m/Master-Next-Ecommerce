'use client';

import { useState, useRef, useEffect } from 'react';

const MAX_SELECTED = 4;

/**
 * Admin picker for curated cross-sell links.
 *
 * Selection order is the display order: the first pick leads the
 * "Frequently Bought Together" bundle on the storefront. Products left unselected
 * simply fall back to automatic recommendations, so this is never required.
 */
export default function UpsellPicker({ products = [], selectedIds = [], currentProductId, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const term = search.trim().toLowerCase();
  const atLimit = selectedIds.length >= MAX_SELECTED;

  const options = products.filter(
    (p) =>
      p.id !== currentProductId &&
      !selectedIds.includes(p.id) &&
      (!term || p.title.toLowerCase().includes(term) || String(p.sku || '').toLowerCase().includes(term))
  );

  const byId = new Map(products.map((p) => [p.id, p]));

  const add = (id) => {
    if (atLimit || selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setSearch('');
  };

  const remove = (id) => onChange(selectedIds.filter((existing) => existing !== id));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mt-1 flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 focus-within:border-[#2f0f6b] focus-within:ring-1 focus-within:ring-[#2f0f6b] dark:border-slate-700 dark:focus-within:border-[#a78bfa] dark:focus-within:ring-[#a78bfa]">
        {selectedIds.map((id, index) => {
          const product = byId.get(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-[#2f0f6b]/10 px-2 py-1 text-xs font-medium text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]"
            >
              <span className="font-bold">{index + 1}.</span>
              {product?.title || id}
              <span className="ml-0.5 flex items-center">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="hover:text-[#2f0f6b]/70 disabled:opacity-30 dark:hover:text-[#a78bfa]/70"
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selectedIds.length - 1}
                  aria-label="Move down"
                  className="hover:text-[#2f0f6b]/70 disabled:opacity-30 dark:hover:text-[#a78bfa]/70"
                >
                  &#9660;
                </button>
                <button type="button" onClick={() => remove(id)} aria-label="Remove" className="ml-0.5 hover:text-[#2f0f6b]/70 dark:hover:text-[#a78bfa]/70">
                  &times;
                </button>
              </span>
            </span>
          );
        })}

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={atLimit}
          placeholder={atLimit ? `Maximum ${MAX_SELECTED} reached` : selectedIds.length ? '' : 'Search products to upsell...'}
          className="min-w-[140px] flex-1 bg-transparent p-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        {selectedIds.length}/{MAX_SELECTED} selected, shown in order on the storefront. Products with no curated picks
        fall back to automatic recommendations.
      </p>

      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {options.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => add(product.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:text-white dark:hover:bg-slate-700"
            >
              {product.image ? (
                <img src={product.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-slate-700">
                  <span className="material-symbols-outlined text-[16px]">image</span>
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{product.title}</span>
              {product.sku && <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{product.sku}</span>}
            </button>
          ))}
        </div>
      )}

      {open && term && options.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No published products found
        </div>
      )}
    </div>
  );
}
