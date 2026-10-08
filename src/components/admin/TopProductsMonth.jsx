'use client';

import Link from 'next/link';

const RANK_STYLES = [
  'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300',
  'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300',
];

function rankClass(index) {
  return RANK_STYLES[index] || 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400';
}

function Row({ product, index }) {
  const body = (
    <>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankClass(index)}`}
      >
        {index + 1}
      </span>

      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
        {product.image ? (
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{product.title}</span>
        {product.variants?.length ? (
          <span className="block truncate text-xs text-slate-400">{product.variants.join(' / ')}</span>
        ) : null}
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {product.units} sold
        </span>
        <span className="block text-xs text-slate-400">
          ৳{Number(product.revenue).toLocaleString()}
        </span>
      </span>
    </>
  );

  const className =
    'flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition ' +
    (product.productId
      ? 'cursor-pointer hover:border-[#2f0f6b]/20 hover:bg-[#2f0f6b]/5 dark:border-slate-700 dark:hover:border-[#a78bfa]/30 dark:hover:bg-[#a78bfa]/5'
      : '');

  // Only link when the sku still resolves to a product — a snapshot row can
  // outlive its product, and a dead edit link is worse than no link.
  if (product.productId) {
    return (
      <Link href={`/admin/products/edit?id=${product.productId}`} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

/**
 * Best sellers for the current Bangladesh calendar month, ranked by units sold.
 * Revenue travels alongside because "what sold most" and "what earned most" are
 * usually not the same product.
 */
export default function TopProductsMonth({ products, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Product of the Month</h2>
        <Link
          href="/admin/products"
          className="shrink-0 text-sm font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]"
        >
          All products
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50" />
          ))}
        </div>
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No sales this month yet</p>
          <p className="text-xs text-slate-400">Ranking appears once an order completes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, i) => (
            <Row key={`${product.sku || product.title}-${i}`} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}