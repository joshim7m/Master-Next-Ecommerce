'use client';

import { useState, useRef, useEffect } from 'react';

export default function CategoryMultiSelect({ categories = [], selected = [], onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) &&
      !selected.some((s) => s.id === cat.id)
  );

  const addCategory = (cat) => {
    if (!selected.some((s) => s.id === cat.id)) {
      onChange([...selected, cat]);
    }
    setSearch('');
  };

  const removeCategory = (catId) => {
    onChange(selected.filter((s) => s.id !== catId));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 min-h-[42px] focus-within:border-[#2f0f6b] focus-within:ring-1 focus-within:ring-[#2f0f6b] dark:border-slate-700 dark:focus-within:border-[#a78bfa] dark:focus-within:ring-[#a78bfa]">
        {selected.map((cat) => (
          <span key={cat.id} className="inline-flex items-center gap-1 rounded-md bg-[#2f0f6b]/10 px-2 py-1 text-xs font-medium text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]">
            {cat.name}
            <button type="button" onClick={() => removeCategory(cat.id)} className="ml-0.5 hover:text-[#2f0f6b]/70 dark:hover:text-[#a78bfa]/70">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length ? '' : 'Search categories...'}
          className="flex-1 min-w-[120px] bg-transparent p-1 text-sm outline-none placeholder:text-slate-400 dark:text-white dark:placeholder-slate-500"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtered.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => addCategory(cat)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition dark:text-white dark:hover:bg-slate-700"
            >
              <span>{cat.name}</span>
              {cat._count?.products != null && (
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{cat._count.products} products</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && search && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No categories found
        </div>
      )}
    </div>
  );
}
