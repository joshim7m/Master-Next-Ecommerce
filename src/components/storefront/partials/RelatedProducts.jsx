'use client';

import { useState } from 'react';
import Link from 'next/link';

function RelatedCard({ product }) {
  const [loaded, setLoaded] = useState(false);
  const price = Number(product.sale_price || product.unite_price);
  const originalPrice = product.sale_price ? Number(product.unite_price) : null;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const img = product.images?.[0]?.image_path;
  const stockQty = product.quantity ?? 0;
  const inStock = stockQty > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col h-full rounded-2xl border border-border bg-white shadow-ambient transition-all duration-300 hover:shadow-ambient-lg hover:-translate-y-1 overflow-hidden dark:border-dark-border dark:bg-dark-card"
    >
      <div className="image-hover-zoom relative aspect-square w-full overflow-hidden bg-warm-sand dark:bg-dark-card">
        {img ? (
          <img
            src={img}
            alt={product.title}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted dark:text-dark-muted">
            <span className="material-symbols-outlined text-[32px]">image</span>
          </div>
        )}

        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-badge-sale px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            -{discount}%
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-300">
          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-on-surface opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg dark:bg-dark-card/90 dark:text-dark-text">
            <span className="material-symbols-outlined text-[14px]">visibility</span>
            Quick View
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h4 className="text-xs font-semibold text-on-surface line-clamp-2 leading-relaxed group-hover:text-primary transition-colors dark:text-dark-text dark:group-hover:text-primary">
          {product.title}
        </h4>

        <div className="mt-auto pt-2 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-primary">
            ৳{price.toLocaleString()}
          </span>
          {originalPrice && (
            <span className="text-[11px] text-muted line-through dark:text-dark-muted">
              ৳{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {!inStock && (
          <span className="mt-1 inline-block rounded-full bg-badge-sale/10 px-2 py-0.5 text-[10px] font-semibold text-badge-sale">
            Out of Stock
          </span>
        )}
      </div>
    </Link>
  );
}

export default function RelatedProducts({ products }) {
  if (!products?.length) return null;

  return (
    <div className="mt-12">
      <h2 className="mb-6 font-display text-headline-md font-bold text-on-surface dark:text-dark-text">Related Products</h2>
      <div className="grid grid-cols-2 gap-5 pb-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((r) => (
          <RelatedCard key={r.id} product={r} />
        ))}
      </div>
    </div>
  );
}
