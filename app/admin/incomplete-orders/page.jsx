'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { getIncompleteOrders, deleteIncompleteOrder } from '../../../src/actions/orders';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

function ItemsSection({ items }) {
  if (!items?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-200 px-5 py-3.5 dark:bg-gradient-to-r dark:from-slate-900/40 dark:to-slate-900/20 dark:border-slate-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Cart Items ({items.length})</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30 sm:gap-4 sm:px-5 sm:py-3.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 sm:h-14 sm:w-14">
              {item.itemImagePath ? (
                <img src={item.itemImagePath} alt={item.productTitle} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate dark:text-white max-w-[300px] md:max-w-[550px]">{item.productTitle}</p>
              {item.variantName && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
                  <svg className="h-3 w-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {item.variantName}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">৳{Number(item.purchasePrice).toLocaleString()} × {item.quantity}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">৳{(Number(item.purchasePrice) * item.quantity).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value) {
  return `${new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })} ${new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
}

export default function IncompleteOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, orderNo: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getIncompleteOrders().then((data) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.details?.customerName?.toLowerCase().includes(q) ||
        o.details?.phoneNumber?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    setDeleting(true);
    try {
      await deleteIncompleteOrder(confirmDelete.id);
      setOrders((prev) => prev.filter((o) => o.id !== confirmDelete.id));
      setConfirmDelete({ open: false, id: null, orderNo: null });
    } catch {}
    setDeleting(false);
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incomplete Orders</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {orders.length} {orders.length === 1 ? 'draft' : 'drafts'} · customers who started checkout but did not complete
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search by name, phone or order no…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">Clear</button>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {filtered.map((order) => (
          <div key={order.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-slate-50 transition-colors dark:active:bg-slate-700/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/admin/orders/${order.orderNo}`} className="text-sm font-semibold text-[#2f0f6b] hover:underline dark:text-[#a78bfa]" onClick={(e) => e.stopPropagation()}>
                    {order.orderNo}
                  </Link>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                    incomplete
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-900 dark:text-white">{order.details?.customerName || '—'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{order.details?.phoneNumber || ''}</p>
                <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{order.items?.length || 0} item(s) · ৳{Number(order.total).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">{formatDateTime(order.updatedAt || order.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: order.id, orderNo: order.orderNo }); }}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Delete draft"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(expanded === order.id ? null : order.id); }}
                className={`shrink-0 rounded-lg p-2 transition ${
                  expanded === order.id ? 'bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {expanded === order.id ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                </svg>
              </button>
            </div>
            {expanded === order.id && (
              <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                <ItemsSection items={order.items} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            {search ? 'No incomplete orders match your search.' : 'No incomplete orders yet.'}
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Products</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Updated</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right dark:text-slate-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((order) => (
              <Fragment key={order.id}>
                <tr className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/orders/${order.orderNo}`} className="font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">{order.orderNo}</Link>
                      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">incomplete</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.details?.customerName || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{order.details?.phoneNumber || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="hover:text-[#2f0f6b] dark:hover:text-[#a78bfa]">
                      {order.items?.length || 0} item(s)
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">৳{Number(order.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap dark:text-slate-400">{formatDateTime(order.updatedAt || order.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className={`rounded-lg p-2 transition ${
                          expanded === order.id
                            ? 'bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                        }`}
                        title={expanded === order.id ? 'Collapse' : 'Expand details'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {expanded === order.id ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ open: true, id: order.id, orderNo: order.orderNo })}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Delete draft"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === order.id && (
                  <tr>
                    <td colSpan={6} className="px-0 py-0">
                      <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                        <ItemsSection items={order.items} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">{search ? 'No incomplete orders match your search.' : 'No incomplete orders yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete incomplete order"
        message={`Delete draft order #${confirmDelete.orderNo}? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null, orderNo: null })}
        variant="danger"
      />
    </section>
  );
}
