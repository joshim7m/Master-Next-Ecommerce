'use client';

import { useEffect, useState } from 'react';
import { getCompletedCustomers, deleteCompletedCustomer } from '../../../../src/actions/orders';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';

/*
 * /admin/reports/customers — one row per completed order, snapshotted from
 * `CompletedCustomer` at the moment the order was completed (manually or by
 * courier). Historic data, so it survives old orders being deleted.
 */
const PAGE_SIZE = 20; // mirrors COMPLETED_CUSTOMERS_PAGE_SIZE in src/actions/orders.js

function formatBdDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomersReportPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, pageSize: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setRefreshing(true);
    getCompletedCustomers({ page, search: debouncedSearch })
      .then((res) => {
        if (!alive) return;
        setRows(res.rows);
        setMeta({ total: res.total, totalPages: res.totalPages, pageSize: res.pageSize });
        // Server clamps an out-of-range page (e.g. search shrinks the list).
        if (res.page !== page) setPage(res.page);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedSearch, page]);

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  /** Remove one snapshot row after the confirmation dialog. */
  const handleDelete = (row) => {
    if (!row || deleting) return;
    setDeleting(true);
    deleteCompletedCustomer(row.id)
      .then(() => {
        setRows((list) => list.filter((r) => r.id !== row.id));
        setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
      })
      .catch((e) => {
        alert(e?.message?.replace(/^Error: /, '') || 'Failed to delete.');
      })
      .finally(() => {
        setDeleting(false);
        setConfirmDelete(null);
      });
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>
            {meta.total} {meta.total === 1 ? 'customer order' : 'customer orders'} · captured when an order is completed
          </span>
          {refreshing && (
            <span
              aria-label="Refreshing"
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]"
            />
          )}
        </p>
      </div>

      {/* ── Search ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="relative w-full sm:max-w-[340px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          />
        </div>
      </div>

      <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {/* Mobile: card list */}
        <div className="space-y-3 md:hidden">
          {rows.map((row, i) => {
            const sn = (page - 1) * meta.pageSize + i + 1;
            return (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500 dark:bg-slate-700/60 dark:text-slate-400">
                    {sn}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.customerName || '—'}</p>
                      <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatBdDate(row.orderDate)}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.phoneNumber || '—'}</p>
                    <p className="mt-1.5 whitespace-normal break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {row.shippingAddress || '—'}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex max-w-full items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/30">
                        <span className="truncate">{row.productName || '—'}</span>
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmDelete(row)}
                    disabled={deleting}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete record"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              {debouncedSearch ? 'No customers match your search.' : 'No completed orders yet — rows appear here the moment an order is completed.'}
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
                <th className="w-[48px] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SN</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Address</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Purchase Product</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order Date</th>
                <th className="py-3 pl-0 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, i) => {
                const sn = (page - 1) * meta.pageSize + i + 1;
                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                    <td className="px-3 py-3 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">{sn}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{row.customerName || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.phoneNumber || '—'}</p>
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      <p
                        className="whitespace-normal text-slate-700 dark:text-slate-300"
                        title={row.shippingAddress}
                      >
                        {row.shippingAddress || '—'}
                      </p>
                    </td>
                    <td className="max-w-[300px] px-4 py-3">
                      <p className="whitespace-normal text-slate-700 dark:text-slate-300">{row.productName || '—'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatBdDate(row.orderDate)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(row)}
                        disabled={deleting}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Delete record"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    {debouncedSearch ? 'No customers match your search.' : 'No completed orders yet — rows appear here the moment an order is completed.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-700 dark:text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete Record"
          message="Remove this customer record from the report?"
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => { if (!deleting) setConfirmDelete(null); }}
        />
      )}
    </section>
  );
}
