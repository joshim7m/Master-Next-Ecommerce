'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getOrderReport } from '../../../../src/actions/orders';
import { buildXlsx } from '../../../../src/lib/xlsx';

const PER_PAGE = 10;
const EXCLUDED_EXPORT_STATUSES = ['cancelled', 'return', 'incomplete'];

const orderStatusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  return: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  incomplete: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
};

const presets = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last 1 Month' },
  { key: 'custom', label: 'Custom' },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function computeRange(preset, customFrom, customTo) {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      return { from: start, to: endOfDay(now) };
    }
    case 'month':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case 'lastMonth': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 30);
      return { from: start, to: endOfDay(now) };
    }
    case 'custom': {
      if (!customFrom || !customTo) return { from: null, to: null };
      return { from: startOfDay(new Date(`${customFrom}T00:00:00`)), to: endOfDay(new Date(`${customTo}T00:00:00`)) };
    }
    default:
      return { from: null, to: null };
  }
}

function invoiceOf(order) {
  return (order.items || [])
    .map((i) => (i.variantName ? `${i.productTitle} ${i.variantName}` : i.productTitle))
    .join(', ');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className="fixed left-4 right-4 top-20 z-50 animate-fade-in sm:left-auto sm:right-6">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md sm:px-5 sm:py-3.5 ${
          isSuccess
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-red-200 bg-red-50/95 text-red-800'
        }`}
      >
        {isSuccess ? (
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${orderStatusColors[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
      {status}
    </span>
  );
}

function StatCard({ bg, text, iconPath, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function SalesReportPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('lastMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(0);
  const [site, setSite] = useState({ name: '', mobile: '' });
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const customInvalid =
    preset === 'custom' &&
    (!customFrom || !customTo || new Date(`${customFrom}T00:00:00`) > new Date(`${customTo}T00:00:00`) || (customFrom && customTo && new Date(`${customTo}T00:00:00`) - new Date(`${customFrom}T00:00:00`) > 365 * 86400000));

  useEffect(() => {
    fetch('/api/admin/settings/site')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSite({ name: data.siteName || '', mobile: data.mobile || '' }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (customInvalid) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (!range.from || !range.to) return;
    setLoading(true);
    getOrderReport(range.from.toISOString(), range.to.toISOString())
      .then((data) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => {
        setLoading(false);
        setSelected(new Set());
        setPage(0);
      });
  }, [preset, customFrom, customTo, customInvalid]);

  const exportable = useMemo(() => orders.filter((o) => !EXCLUDED_EXPORT_STATUSES.includes(o.orderStatus)), [orders]);

  const stats = useMemo(() => {
    const revenue = exportable.reduce((s, o) => s + Number(o.total), 0);
    const items = orders.reduce((s, o) => s + (o.items || []).reduce((n, i) => n + i.quantity, 0), 0);
    return { orders: orders.length, revenue, items };
  }, [orders, exportable]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = orders.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const pageAllSelected = paginated.length > 0 && paginated.every((o) => selected.has(o.id));
  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const eligibleSelected = selectedOrders.filter((o) => !EXCLUDED_EXPORT_STATUSES.includes(o.orderStatus));

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      paginated.forEach((o) => (pageAllSelected ? next.delete(o.id) : next.add(o.id)));
      return next;
    });
  };

  const handleExport = async (rows) => {
    const eligible = rows.filter((o) => !EXCLUDED_EXPORT_STATUSES.includes(o.orderStatus));
    const skipped = rows.length - eligible.length;
    if (!eligible.length) {
      setToast({ type: 'error', message: 'No eligible orders to export (cancelled/return/incomplete are skipped).' });
      return;
    }
    setExporting(true);
    try {
      const data = [
        ['Invoice', 'Name', 'Address', 'Phone', 'Amount', 'Note', 'Lot', 'Contact Name', 'Contact Number'],
        ...eligible.map((o) => [
          invoiceOf(o),
          o.details?.customerName || '',
          o.details?.shippingAddress || '',
          o.details?.phoneNumber || '',
          String(Number(o.total)),
          'null',
          '',
          site.name,
          site.mobile,
        ]),
      ];
      const blob = await buildXlsx(data, { sheetName: 'Courier Report', colWidths: [26, 20, 42, 16, 10, 8, 8, 22, 16] });
      downloadBlob(blob, `courier-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast({
        type: 'success',
        message: `Exported ${eligible.length} ${eligible.length === 1 ? 'order' : 'orders'}${skipped ? ` — ${skipped} skipped (cancelled/return/incomplete)` : ''}.`,
      });
    } catch {
      setToast({ type: 'error', message: 'Failed to generate the export file.' });
    } finally {
      setExporting(false);
    }
  };

  const rangeLabel =
    range.from && range.to
      ? `${range.from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — ${range.to.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '—';

  const dateFmt = (d) =>
    `${new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })} ${new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Report</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Filter orders by date range and export a courier-ready CSV.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                preset === p.key
                  ? 'bg-[#2f0f6b] text-white shadow-sm dark:bg-[#a78bfa] dark:text-slate-900'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto hidden text-xs font-medium text-slate-400 dark:text-slate-500 sm:block">{rangeLabel}</span>
        </div>

        {preset === 'custom' && (
          <div className="mt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">End Date</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                />
              </div>
            </div>
            {customInvalid && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                Select a valid range (start ≤ end, max 1 year).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          bg="bg-blue-100"
          text="text-blue-600 dark:text-blue-400 dark:bg-blue-900/30"
          iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          label="Orders"
          value={loading ? '…' : stats.orders}
        />
        <StatCard
          bg="bg-emerald-100"
          text="text-emerald-600 dark:text-emerald-400 dark:bg-emerald-900/30"
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          label="Revenue (exportable)"
          value={loading ? '…' : `৳${stats.revenue.toLocaleString()}`}
        />
        <StatCard
          bg="bg-fuchsia-100"
          text="text-fuchsia-600 dark:text-fuchsia-400 dark:bg-fuchsia-900/30"
          iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          label="Items Sold"
          value={loading ? '…' : stats.items}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading report…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/50">
              <svg className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">No orders found</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No orders were placed in the selected date range.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={toggleAllOnPage}
                        aria-label="Select all on page"
                        className="h-4 w-4 cursor-pointer accent-[#2f0f6b] dark:accent-[#a78bfa]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Order No</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Address</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginated.map((o) => {
                    const itemCount = (o.items || []).reduce((n, i) => n + i.quantity, 0);
                    const itemTitles = (o.items || []).map((i) => `${i.productTitle}${i.variantName ? ` (${i.variantName})` : ''} ×${i.quantity}`).join('\n');
                    const isExcluded = EXCLUDED_EXPORT_STATUSES.includes(o.orderStatus);
                    return (
                      <tr key={o.id} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30 ${isExcluded ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggleRow(o.id)}
                            aria-label={`Select order ${o.orderNo}`}
                            title={isExcluded ? 'Will be skipped on export (cancelled/return/incomplete)' : undefined}
                            className="h-4 w-4 cursor-pointer accent-[#2f0f6b] dark:accent-[#a78bfa]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/orders/${o.orderNo}`} className="font-semibold text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">
                            {o.orderNo}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">{dateFmt(o.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{o.details?.customerName || o.user?.name || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{o.details?.phoneNumber || '—'}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-400" title={o.details?.shippingAddress || ''}>
                          {o.details?.shippingAddress || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400" title={itemTitles}>
                          {itemCount}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">৳{Number(o.total).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.orderStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {safePage * PER_PAGE + 1}–{Math.min((safePage + 1) * PER_PAGE, orders.length)} of {orders.length} · {eligibleSelected.length} selected
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40"
                >
                  Prev
                </button>
                <span className="px-2 text-sm text-slate-500 dark:text-slate-400">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages - 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Courier Export (Excel)</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Columns: Invoice (product + variant), Name, Address, Phone, Amount, Note, Lot, Contact Name, Contact Number. Phone numbers keep their leading zeros. Cancelled/return/incomplete orders are skipped.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (!eligibleSelected.length) {
                setToast({ type: 'error', message: 'Select at least one exportable order first.' });
                return;
              }
              handleExport(selectedOrders);
            }}
            disabled={loading || orders.length === 0 || exporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2f0f6b]/20 bg-[#2f0f6b]/5 px-4 py-2.5 text-sm font-semibold text-[#2f0f6b] transition hover:bg-[#2f0f6b]/10 disabled:opacity-50 dark:border-[#a78bfa]/30 dark:bg-[#a78bfa]/10 dark:text-[#a78bfa] dark:hover:bg-[#a78bfa]/20"
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Selected{eligibleSelected.length ? ` (${eligibleSelected.length})` : ''}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleExport(orders)}
            disabled={loading || exportable.length === 0 || exporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f0f6b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f0f6b]/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2f0f6b]/30 disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export All ({exportable.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
