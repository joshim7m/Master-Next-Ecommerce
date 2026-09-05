'use client';

import { useState } from 'react';

function ImageCell({ imageId, allImages, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = allImages.find((img) => img.id === imageId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 overflow-hidden hover:border-[#2f0f6b] transition dark:border-slate-700 dark:hover:border-[#a78bfa]"
      >
        {selected ? (
          <img src={selected.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="mx-4 max-h-[80vh] max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Select Image</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition dark:hover:text-slate-300">&times;</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => { onSelect(''); setOpen(false); }}
                className="flex h-20 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-slate-300 transition dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500"
              >
                None
              </button>
              {allImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => { onSelect(img.id); setOpen(false); }}
                  className={`h-20 w-full overflow-hidden rounded-lg border-2 transition hover:border-[#2f0f6b] ${
                    imageId === img.id ? 'border-[#2f0f6b]' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ManageVariant({ variants, optionLabels, allImages, onChange, onRemove, onToggleDefault }) {
  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
        No variants yet. Define options and click &quot;Generate Variants&quot; above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Variant</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sale</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stock</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SKU</th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {variants.map((v) => (
            <tr key={v._key} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
              <td className="px-3 py-2">
                <ImageCell
                  imageId={v.imageId}
                  allImages={allImages}
                  onSelect={(id) => onChange(v._key, 'imageId', id)}
                />
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap min-w-[100px] dark:text-white">
                {v.optionValues?.filter(Boolean).join(' / ') || '\u2014'}
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  step="0.01"
                  value={v.price}
                  onChange={(e) => onChange(v._key, 'price', e.target.value)}
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  step="0.01"
                  value={v.sale_price}
                  onChange={(e) => onChange(v._key, 'sale_price', e.target.value)}
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  value={v.quantity}
                  onChange={(e) => onChange(v._key, 'quantity', e.target.value)}
                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  value={v.sku}
                  onChange={(e) => onChange(v._key, 'sku', e.target.value)}
                  placeholder="SKU"
                  className="w-24 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="radio"
                  name="default_variant"
                  checked={v.isDefault}
                  onChange={() => onToggleDefault(v._key)}
                  className="h-4 w-4 border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-700"
                />
              </td>
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onRemove(v._key)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Remove variant"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
