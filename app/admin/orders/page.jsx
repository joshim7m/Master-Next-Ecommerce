'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrdersPage, getCustomerOrderStats, updateOrderStatus, deleteOrder } from '../../../src/actions/orders';
import InvoicePreviewModal from '../../../src/components/admin/InvoicePreviewModal';
import CreateOrderModal from '../../../src/components/admin/CreateOrderModal';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

const orderStatuses = [
  'pending', 'in_review', 'in_courier', 'hold', 'follow_up', 'processing',
  'return', 'cancelled', 'completed', 'blocked', 'incomplete',
];

const orderStatusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_review: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  in_courier: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  hold: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  follow_up: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  processing: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  return: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  blocked: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  incomplete: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
};

/*
 * Orders list filters. The list only ever shows the last 31 Bangladesh days —
 * `getOrdersPage` clamps every preset to that window, and custom dates can't
 * reach outside it either.
 */
const PAGE_SIZE = 20; // mirrors ORDERS_PAGE_SIZE in src/actions/orders.js
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_PRESETS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'custom', label: 'Custom date' },
];

/** Header label per preset — "custom" falls back to the resolved dates. */
const PRESET_RANGE_LABELS = {
  all: 'last 31 days',
  today: 'today',
  yesterday: 'yesterday',
  last7: 'last 7 days',
};

/** Matches the server guard in deleteOrder — in-courier / blocked never; completed only after 31 days. */
const UNDELETABLE = new Set(['in_courier', 'blocked']);
const COMPLETED_DELETE_AGE_DAYS = 31;
function isOrderDeletable(order) {
  if (UNDELETABLE.has(order.orderStatus)) return false;
  if (order.orderStatus !== 'completed') return true;
  // Completed orders become deletable once they are older than 31 days.
  const cutoff = Date.now() - COMPLETED_DELETE_AGE_DAYS * DAY_MS;
  return new Date(order.createdAt).getTime() < cutoff;
}

const CHIP_BASE = 'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition';
const CHIP_ON =
  'border-[#2f0f6b] bg-[#2f0f6b] text-white shadow-sm dark:border-[#a78bfa] dark:bg-[#a78bfa] dark:text-slate-900';
const CHIP_OFF =
  'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';
const DATE_INPUT =
  'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';

/** `YYYY-MM-DD` of the Bangladesh calendar day containing `date`. */
function bdDateKey(date = new Date()) {
  return new Date(new Date(date).getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);
}
function bdKeyDaysAgo(days) {
  return bdDateKey(new Date(Date.now() - days * DAY_MS));
}
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

/** Compact page list: first, last and a window around the current page. */
function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out = [];
  let previous = 0;
  for (const p of wanted) {
    if (previous && p - previous > 1) out.push('gap');
    out.push(p);
    previous = p;
  }
  return out;
}

/**
 * Inline status control for the list.
 *
 * It replaces the status dropdown that used to live inside the expandable
 * details panel, so the quick "mark as processing / completed" workflow
 * survives without any expand/shrink.
 */
function StatusSelect({ order, onUpdate }) {
  return (
    <select
      value={order.orderStatus}
      onChange={(e) => onUpdate('orderStatus', e.target.value)}
      aria-label={`Status for order ${order.orderNo}`}
      className={`inline-block rounded-full border border-transparent px-2.5 py-1 text-xs font-medium transition focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa] ${
        orderStatusColors[order.orderStatus] ||
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
      }`}
    >
      {/* `blocked` is not manually selectable — it's set only by the block-device
          API. Show it (disabled) so blocked orders still display their badge. */}
      {order.orderStatus === 'blocked' && <option value="blocked" disabled>blocked</option>}
      {orderStatuses.filter((s) => s !== 'blocked').map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

/** The product amount only — excludes delivery charge, matching the invoice subtotal. */
function TotalCell({ order }) {
  const items = order.items || [];
  const productTotal = items.length
    ? items.reduce((s, i) => s + Number(i.purchasePrice) * Number(i.quantity), 0)
    : Number(order.total) - Number(order.details?.deliveryCharge || 0);
  const discount = Number(order.details?.discount || 0);
  return (
    <div>
      <p className="font-medium text-slate-900 dark:text-white">৳{productTotal.toLocaleString()}</p>
      {discount > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">−৳{discount.toLocaleString()} discount</p>
      )}
    </div>
  );
}

/** Row for orders with an admin note — small icon plus the note text, no label. */
function OrderNote({ note, className = '' }) {
  return (
    <p className={`flex items-start gap-1 text-orange-300 ${className}`}>
      <svg className="mt-0.5 h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM7 9h10M7 13h6" />
      </svg>
      <span className="whitespace-normal break-words">{note}</span>
    </p>
  );
}

function CustomerStatsModal({ stats, loading = false, onClose }) {
  if (!stats && !loading) return null;

  const view = stats || { name: '', mobile: '', total: 0, completed: 0, returned: 0, others: 0 };
  const segs = [
    { label: 'Completed', value: view.completed, dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    { label: 'Returned', value: view.returned, dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
    { label: 'Others', value: view.others, dot: 'bg-slate-400', text: 'text-slate-400 dark:text-slate-500', bar: 'bg-slate-300 dark:bg-slate-600' },
  ];
  const pct = view.total > 0 ? (v) => Math.max(0, (v / view.total) * 100) : () => 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl animate-fade-in sm:rounded-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Customer Order Stats</h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{view.name} {view.mobile ? `· ${view.mobile}` : ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]" />
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Loading customer stats…</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{view.total}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Orders Placed</p>
              </div>

              <div>
                <div className="flex h-10 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  {segs.map((s) => (
                    <div key={s.label} className={`${s.bar} transition-all duration-500`} style={{ width: `${pct(s.value)}%` }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {segs.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
                        <p className={`text-sm font-bold ${s.text}`}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: null, to: null });

  const [preset, setPreset] = useState('all');
  const [customFrom, setCustomFrom] = useState(() => bdKeyDaysAgo(6));
  const [customTo, setCustomTo] = useState(() => bdDateKey());
  const [appliedRange, setAppliedRange] = useState({ from: null, to: null });

  const [filterOrderStatus, setFilterOrderStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [statsOrder, setStatsOrder] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const minDate = bdKeyDaysAgo(30);
  const maxDate = bdDateKey();
  const customInvalid = Boolean(preset === 'custom' && customFrom && customTo && customFrom > customTo);

  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  // The sidebar can point this page at a different ?status= while it stays
  // mounted, so the param is read reactively — a mount-only read missed every
  // click after the first navigation.
  useEffect(() => {
    setFilterOrderStatus(statusParam && orderStatuses.includes(statusParam) ? statusParam : 'all');
    setPage(1);
  }, [statusParam]);

  // Debounce the search box so every keystroke doesn't hit the database.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Paged, filtered query — re-runs on any filter change.
  useEffect(() => {
    let alive = true;
    setRefreshing(true);
    getOrdersPage({
      preset,
      from: preset === 'custom' ? appliedRange.from : undefined,
      to: preset === 'custom' ? appliedRange.to : undefined,
      status: filterOrderStatus,
      search: debouncedSearch,
      page,
    })
      .then((res) => {
        if (!alive) return;
        setOrders(res.orders);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setRange({ from: res.from, to: res.to });
        // The server clamps out-of-range pages (e.g. after a filter shrinks the list).
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
  }, [preset, appliedRange.from, appliedRange.to, filterOrderStatus, debouncedSearch, page, refreshKey]);

  // Customer stats are all-time counts, so they need their own query.
  useEffect(() => {
    if (!statsOrder) return;
    const phone = statsOrder.details?.phoneNumber;
    if (!phone) {
      setCustomerStats({
        name: statsOrder.details?.customerName || statsOrder.user?.name || '—',
        mobile: '',
        total: 0,
        completed: 0,
        returned: 0,
        others: 0,
      });
      setStatsLoading(false);
      return;
    }
    let alive = true;
    setStatsLoading(true);
    getCustomerOrderStats(phone)
      .then((data) => {
        if (!alive) return;
        setCustomerStats({
          ...data,
          name: data.name || statsOrder.details?.customerName || statsOrder.user?.name || '—',
          mobile: phone,
        });
        setStatsLoading(false);
      })
      .catch(() => {
        if (alive) setStatsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [statsOrder]);

  useEffect(() => {
    if (!statsOrder) return;
    const handler = (e) => { if (e.key === 'Escape') setStatsOrder(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [statsOrder]);

  useEffect(() => {
    if (!invoiceOrder) return;
    const handler = (e) => { if (e.key === 'Escape') setInvoiceOrder(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [invoiceOrder]);

  const selectPreset = (key) => {
    setPreset(key);
    setPage(1);
    // Selecting "Custom" applies the drafted dates right away; the Apply
    // button re-applies after the inputs change.
    if (key === 'custom') setAppliedRange({ from: customFrom, to: customTo });
  };

  const applyCustomRange = () => {
    if (customInvalid) return;
    setAppliedRange({ from: customFrom, to: customTo });
    setPage(1);
  };

  const openStats = (order) => {
    setStatsOrder(order);
    setCustomerStats({
      name: order.details?.customerName || order.user?.name || '—',
      mobile: order.details?.phoneNumber || '',
      total: 0,
      completed: 0,
      returned: 0,
      others: 0,
    });
    setStatsLoading(true);
  };

  const handleStatusUpdate = async (id, field, value) => {
    try {
      await updateOrderStatus(id, { [field]: value });
      setRefreshKey((k) => k + 1);
    } catch {}
  };

  /** Delete from the list after the confirmation dialog — guarded server-side by deleteOrder. */
  const handleDeleteOrder = (order) => {
    if (!isOrderDeletable(order) || deleting) return;
    setDeleting(true);
    deleteOrder(order.id)
      .then(() => {
        setOrders((list) => list.filter((o) => o.id !== order.id));
        setTotal((t) => Math.max(0, t - 1));
      })
      .catch((e) => {
        alert(e?.message?.replace(/^Error: /, '') || 'Failed to delete order.');
      })
      .finally(() => {
        setDeleting(false);
        setConfirmDeleteOrder(null);
      });
  };

  /**
   * Open the invoice preview for an order.
   *
   * The sheet needs the brand settings (site name, logo, contact), which only
   * the server may read, so the preview is fetched rather than assembled from
   * the list row. Fetching per open also means the numbers are the ones in the
   * database right now — a discount edited on the detail page shows up here
   * without a reload.
   */
  const openInvoice = async (order) => {
    setInvoiceOrder(order);
    setInvoiceData(null);
    setInvoiceError(null);
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/invoice-preview?orderNo=${encodeURIComponent(order.orderNo)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInvoiceData(data);
    } catch {
      setInvoiceError('Could not load the invoice. Please try again.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  const emptyText =
    search.trim() !== '' || filterOrderStatus !== 'all'
      ? 'No orders match your filters.'
      : 'No orders in this period.';
  const rangeLabel =
    PRESET_RANGE_LABELS[preset] ??
    (formatBdDate(range.from) === formatBdDate(range.to)
      ? formatBdDate(range.from)
      : `${formatBdDate(range.from)} – ${formatBdDate(range.to)}`);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {total} {total === 1 ? 'order' : 'orders'} · {rangeLabel}
            </span>
            {refreshing && (
              <span
                aria-label="Refreshing"
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]"
              />
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2f0f6b]/90 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Order
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* One row on desktop: range chips · search */}
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPreset(p.key)}
              aria-pressed={preset === p.key}
              className={`${CHIP_BASE} shrink-0 whitespace-nowrap ${preset === p.key ? CHIP_ON : CHIP_OFF}`}
            >
              {p.label}
            </button>
          ))}

          <div className="relative ml-auto w-full flex-1 sm:w-auto sm:min-w-[170px] sm:max-w-[280px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by order number or phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
        </div>

        {preset === 'custom' && (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="orders-date-from"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  From
                </label>
                <input
                  id="orders-date-from"
                  type="date"
                  value={customFrom}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={DATE_INPUT}
                />
              </div>
              <div>
                <label
                  htmlFor="orders-date-to"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  To
                </label>
                <input
                  id="orders-date-to"
                  type="date"
                  value={customTo}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={DATE_INPUT}
                />
              </div>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={customInvalid || !customFrom || !customTo}
                className="rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0f6b]/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
              >
                Apply
              </button>
              <p
                className={`max-w-xs text-xs ${
                  customInvalid ? 'font-medium text-red-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {customInvalid
                  ? '“From” must be on or before “To”.'
                  : `Only the last 31 days are available (${formatBdDate(minDate)} – ${formatBdDate(maxDate)}).`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {/* Orders table — horizontally scrollable on small screens */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">IP Address</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.orderNo}`} className="font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">{order.orderNo}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.details?.customerName || order.user?.name || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{order.details?.phoneNumber || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <TotalCell order={order} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect order={order} onUpdate={(f, v) => handleStatusUpdate(order.id, f, v)} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                    {order.details?.orderNote && (
                      <OrderNote note={order.details.orderNote} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{order.details?.ipAddress || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openStats(order)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 dark:text-slate-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
                        title="Customer order stats"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="20" x2="4" y2="10" />
                          <line x1="10" y1="20" x2="10" y2="4" />
                          <line x1="16" y1="20" x2="16" y2="12" />
                          <line x1="20" y1="20" x2="20" y2="16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openInvoice(order)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-[#2f0f6b]/10 hover:text-[#2f0f6b] dark:text-slate-500 dark:hover:bg-[#a78bfa]/15 dark:hover:text-[#a78bfa]"
                        title="View invoice"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      {isOrderDeletable(order) && (
                        <button
                          onClick={() => setConfirmDeleteOrder(order)}
                          disabled={deleting}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Delete order"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">{emptyText}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <Pager page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {statsOrder && (
        <CustomerStatsModal
          stats={customerStats}
          loading={statsLoading}
          onClose={() => setStatsOrder(null)}
        />
      )}

      {createOpen && <CreateOrderModal onClose={() => setCreateOpen(false)} />}

      {invoiceOrder && (
        <InvoicePreviewModal
          order={invoiceOrder}
          data={invoiceData}
          loading={invoiceLoading}
          error={invoiceError}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

      {confirmDeleteOrder && (
        <ConfirmDialog
          open
          title="Delete Order"
          message={`Permanently delete order #${confirmDeleteOrder.orderNo} and all its items?\n\nCustomer: ${confirmDeleteOrder.details?.customerName || confirmDeleteOrder.user?.name || '—'}\nPhone: ${confirmDeleteOrder.details?.phoneNumber || '—'}\nTotal: ৳${Number(confirmDeleteOrder.total).toLocaleString()}\nPlaced: ${formatBdDate(confirmDeleteOrder.createdAt)}\n\nThis cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => handleDeleteOrder(confirmDeleteOrder)}
          onCancel={() => { if (!deleting) setConfirmDeleteOrder(null); }}
        />
      )}
    </section>
  );
}

/**
 * `useSearchParams` needs a Suspense boundary when the route is prerendered,
 * so the list lives in an inner component.
 */
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>}>
      <OrdersList />
    </Suspense>
  );
}

function Pager({ page, totalPages, total, pageSize, onPage }) {
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {start}–{end}
        </span>{' '}
        of <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> orders
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-400 dark:text-slate-500">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`h-7 min-w-[1.75rem] rounded-lg px-2 text-xs font-semibold transition ${
                p === page
                  ? 'bg-[#2f0f6b] text-white dark:bg-[#a78bfa] dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
