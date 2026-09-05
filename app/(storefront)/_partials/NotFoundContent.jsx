'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function NotFoundContent({ allProducts }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return allProducts;
    const q = query.toLowerCase();
    return allProducts.filter((p) => p.title.toLowerCase().includes(q));
  }, [query, allProducts]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <svg className="mx-auto h-32 w-32 text-slate-200 dark:text-slate-700 sm:h-40 sm:w-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <h1 className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-7xl">404</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400 sm:text-xl">Oops! The page you&apos;re looking for doesn&apos;t exist.</p>

        <div className="mt-2 flex items-center justify-center gap-3 text-sm text-slate-400">
          <Link href="/" className="font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">Go Home</Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link href="/products" className="font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">Browse Products</Link>
        </div>
      </div>

      <div className="relative mx-auto mt-10 max-w-md">
        <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for products..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm transition focus:border-[#2f0f6b] focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/15 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]/15"
        />
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
        <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {query.trim() ? `Search Results (${filtered.length})` : `Products (${allProducts.length})`}
        </h2>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {filtered.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-1.5 aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-700">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="truncate text-[11px] font-medium text-slate-900 group-hover:text-[#2f0f6b] dark:text-slate-100 dark:group-hover:text-[#a78bfa]">
                  {product.title}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#2f0f6b] dark:text-[#a78bfa]">
                  ৳{product.price.toLocaleString()}
                  {product.originalPrice && (
                    <span className="ml-0.5 text-[10px] text-slate-400 line-through dark:text-slate-500">৳{product.originalPrice.toLocaleString()}</span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No products match your search.</p>
        )}
      </div>
    </div>
  );
}
