'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getProducts, getCategories, deleteProduct } from '../../../src/actions/products';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

function StatusBadge({ status }) {
  const isPublished = status === 'publish';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isPublished ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()]).then(([p, c]) => {
      setProducts(p);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') list = list.filter((p) => p.status === filterStatus);
    if (filterFeatured !== 'all') list = list.filter((p) => (filterFeatured === 'yes') === !!p.featured);
    if (filterCategory !== 'all') {
      if (filterCategory === 'top') {
        const topSlugs = new Set(categories.filter((c) => !c.parentId).map((c) => c.slug));
        list = list.filter((p) => p.categories?.some((c) => topSlugs.has(c.slug)));
      } else {
        list = list.filter((p) => p.categories?.some((c) => c.slug === filterCategory));
      }
    }
    return list;
  }, [products, search, filterStatus, filterFeatured, filterCategory, categories]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterFeatured, filterCategory]);

  const refetch = () => Promise.all([getProducts(), getCategories()]).then(([p, c]) => { setProducts(p); setCategories(c); });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteProduct(deleteTarget); } catch {}
    setDeleteTarget(null);
    refetch();
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{filtered.length} {filtered.length === 1 ? 'product' : 'products'} {filtered.length > PER_PAGE ? `(page ${page} of ${totalPages})` : ''}</p>
        </div>
        <Link href="/admin/products/create" className="shrink-0 rounded-lg bg-[#2f0f6b] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition">+ New</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search products\u2026" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto order-last sm:order-none">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]">
            <option value="all">Status</option>
            <option value="publish">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select value={filterFeatured} onChange={(e) => setFilterFeatured(e.target.value)} className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]">
            <option value="all">Featured</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]">
            <option value="all">Category</option>
            <option value="top">Top-level</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          {(filterStatus !== 'all' || filterFeatured !== 'all' || filterCategory !== 'all' || search) && (
            <button onClick={() => { setFilterStatus('all'); setFilterFeatured('all'); setFilterCategory('all'); setSearch(''); }} className="shrink-0 px-2 text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">Clear</button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="w-10 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SN</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Featured</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categories</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Stock</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((p, index) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <td className="w-10 py-3 text-center text-slate-500 whitespace-nowrap dark:text-slate-400">{(page - 1) * PER_PAGE + index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.images?.[0]?.image_path ? (
                      <div className="h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <img src={p.images[0].image_path} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 border border-slate-200 dark:bg-slate-700 dark:text-slate-600 dark:border-slate-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link href={`/admin/products/edit?id=${p.id}`} className="block max-w-[240px] truncate font-medium text-slate-900 hover:text-[#2f0f6b] transition dark:text-white dark:hover:text-[#a78bfa]">{p.title}</Link>
                      {p.sku && <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">SKU: {p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-medium text-slate-900 dark:text-white">৳{Number(p.sale_price || p.unite_price).toLocaleString()}</span>
                  {p.sale_price ? <span className="ml-1.5 text-xs text-slate-400 line-through dark:text-slate-500">৳{Number(p.unite_price).toLocaleString()}</span> : null}
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-center">
                  {p.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z" /></svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">\u2014</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate dark:text-slate-400">{p.categories?.map((c) => c.name).join(', ') || '\u2014'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-medium ${(p.quantity ?? 0) > 0 ? 'text-slate-900 dark:text-white' : 'text-red-400 dark:text-red-400'}`}>{p.quantity ?? '\u2014'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (menuOpen === p.id) { setMenuOpen(null); return; }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = 144;
                        const left = Math.min(rect.left + rect.width - menuWidth, window.innerWidth - menuWidth - 8);
                        setMenuPos({ top: rect.top - 8, left: Math.max(8, left) });
                        setMenuOpen(p.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {menuOpen === p.id && (
                      <div ref={menuRef} className="fixed z-50 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800" style={{ top: menuPos.top, left: menuPos.left }}>
                        <Link
                          href={`/admin/products/edit?id=${p.id}`}
                          onClick={() => setMenuOpen(null)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setDeleteTarget(p.id); setMenuOpen(null); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition dark:hover:bg-red-900/20"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">{search || filterStatus !== 'all' || filterFeatured !== 'all' || filterCategory !== 'all' ? 'No products match your filters.' : 'No products yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let n;
            if (totalPages <= 5) {
              n = i + 1;
            } else if (page <= 3) {
              n = i + 1;
            } else if (page >= totalPages - 2) {
              n = totalPages - 4 + i;
            } else {
              n = page - 2 + i;
            }
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                  page === n
                    ? 'bg-[#2f0f6b] text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            );
          })}
          <span className="text-xs text-slate-400 sm:hidden dark:text-slate-500">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
