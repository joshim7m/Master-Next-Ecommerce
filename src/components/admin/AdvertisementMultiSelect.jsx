'use client';

import { useState, useRef, useEffect } from 'react';

export default function AdvertisementMultiSelect({ advertisements = [], selected = [], onChange }) {
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

  const filtered = advertisements.filter(
    (ad) =>
      ad.title.toLowerCase().includes(search.toLowerCase()) &&
      !selected.some((s) => s.id === ad.id)
  );

  const addAd = (ad) => {
    if (!selected.some((s) => s.id === ad.id)) {
      onChange([...selected, ad]);
    }
    setSearch('');
  };

  const removeAd = (adId) => {
    onChange(selected.filter((s) => s.id !== adId));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 min-h-[42px] focus-within:border-[#2f0f6b] focus-within:ring-1 focus-within:ring-[#2f0f6b]">
        {selected.map((ad) => (
          <span key={ad.id} className="inline-flex items-center gap-1.5 rounded-md bg-[#2f0f6b]/10 px-2 py-1 text-xs font-medium text-[#2f0f6b]">
            {ad.image && (
              <img src={ad.image} alt="" className="h-5 w-5 rounded object-cover" />
            )}
            {ad.title}
            <button type="button" onClick={() => removeAd(ad.id)} className="ml-0.5 hover:text-[#2f0f6b]/70">&times;</button>
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
          placeholder={selected.length ? '' : 'Search advertisements...'}
          className="flex-1 min-w-[120px] bg-transparent p-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.map((ad) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => addAd(ad)}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 transition"
            >
              {ad.image ? (
                <img src={ad.image} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{ad.title}</p>
                {ad.price && <p className="text-xs text-slate-500">৳{parseFloat(ad.price).toLocaleString()}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && search && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
          No advertisements found
        </div>
      )}
    </div>
  );
}
