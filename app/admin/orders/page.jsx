'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { getOrdersPage, getCustomerOrderStats, updateOrderStatus } from '../../../src/actions/orders';

const orderStatuses = ['pending', 'processing', 'completed', 'cancelled', 'return', 'incomplete'];

const orderStatusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  return: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  incomplete: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
};

const orderStatusDotColors = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  return: 'bg-purple-500',
  incomplete: 'bg-slate-400',
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
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'custom', label: 'Custom date' },
];

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

function ItemsSection({ items }) {
  if (!items?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-purple-50 to-purple-50/50 border-b border-slate-200 px-5 py-3.5 dark:bg-gradient-to-r dark:from-purple-900/20 dark:to-purple-900/10 dark:border-slate-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Order Items ({items.length})</span>
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
              <p className="text-sm font-medium text-slate-900 truncate dark:text-white truncate max-w-[300px] md:max-w-[550px]">{item.productTitle}</p>
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

function CustomerCard({ details, user }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-blue-50/50 border-b border-slate-200 px-4 py-3 dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-blue-900/10 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Customer</span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Name</span>
          <span className="font-medium text-slate-900 dark:text-white">{details?.customerName || user?.name || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Phone</span>
          <span className="font-medium text-slate-900 dark:text-white">{details?.phoneNumber || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Area</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">{details?.shippingArea || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Address</span>
          <p className="mt-0.5 rounded-lg bg-slate-50 p-2.5 text-slate-900 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white">{details?.shippingAddress || '—'}</p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ order, onUpdate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-amber-50/50 border-b border-slate-200 px-4 py-3 dark:bg-gradient-to-r dark:from-amber-900/20 dark:to-amber-900/10 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Status</span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</label>
          <select value={order.orderStatus} onChange={(e) => onUpdate('orderStatus', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]">
            {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 pt-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${orderStatusDotColors[order.orderStatus] || 'bg-slate-400'}`} />
            {order.orderStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ details, items, total }) {
  const subtotal = items.reduce((s, i) => s + Number(i.purchasePrice) * i.quantity, 0);
  const charge = Number(details?.deliveryCharge || 0);
  const discount = Number(details?.discount || 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-b border-slate-200 px-4 py-3 dark:bg-gradient-to-r dark:from-emerald-900/20 dark:to-emerald-900/10 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m4-1l2 1m4-4l2 1m-8 7l4-4 4 4M5 18h14" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Delivery</span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Charge</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {charge > 0 ? `৳${charge.toLocaleString()}` : <span className="text-emerald-600 font-medium dark:text-emerald-400">Free</span>}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
          <span className="font-medium text-slate-900 dark:text-white">৳{subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">−৳{discount.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">Total</span>
            <span className="text-lg font-bold text-[#2f0f6b] dark:text-[#a78bfa]">৳{Number(total).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandedDetails({ order, onStatusUpdate }) {
  return (
    <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        <ItemsSection items={order.items} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CustomerCard details={order.details} user={order.user} />
          <StatusCard order={order} onUpdate={(f, v) => onStatusUpdate(order.id, f, v)} />
          <DeliveryCard details={order.details} items={order.items} total={order.total} />
        </div>
      </div>
    </div>
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: null, to: null });

  const [preset, setPreset] = useState('today');
  const [customFrom, setCustomFrom] = useState(() => bdKeyDaysAgo(6));
  const [customTo, setCustomTo] = useState(() => bdDateKey());
  const [appliedRange, setAppliedRange] = useState({ from: null, to: null });

  const [filterOrderStatus, setFilterOrderStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expanded, setExpanded] = useState(null);
  const [statsOrder, setStatsOrder] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const minDate = bdKeyDaysAgo(30);
  const maxDate = bdDateKey();
  const customInvalid = Boolean(preset === 'custom' && customFrom && customTo && customFrom > customTo);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const s = url.searchParams.get('status');
    if (s && orderStatuses.includes(s)) {
      setFilterOrderStatus(s);
      setPage(1);
    }
  }, []);

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

  const clearFilters = () => {
    setPreset('today');
    setFilterOrderStatus('all');
    setSearch('');
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

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  const hasFilters = filterOrderStatus !== 'all' || search.trim() !== '';
  const emptyText =
    search.trim() !== '' || filterOrderStatus !== 'all'
      ? 'No orders match your filters.'
      : 'No orders in this period.';
  const rangeLabel =
    preset === 'today'
      ? 'today'
      : preset === 'yesterday'
        ? 'yesterday'
        : preset === 'last7'
          ? 'last 7 days'
          : formatBdDate(range.from) === formatBdDate(range.to)
            ? formatBdDate(range.from)
            : `${formatBdDate(range.from)} – ${formatBdDate(range.to)}`;

  return (
    <section className="space-y-5">
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

      {/* ── Filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* One row on desktop: range chips · search · status · clear */}
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

          <select
            value={filterOrderStatus}
            onChange={(e) => {
              setFilterOrderStatus(e.target.value);
              setPage(1);
            }}
            className="w-full shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
          >
            <option value="all">All Status</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
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
        {/* Mobile: card list */}
        <div className="space-y-3 md:hidden">
          {orders.map((order) => (
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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusColors[order.orderStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">{order.details?.customerName || order.user?.name || '—'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.details?.phoneNumber || ''}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-900 shrink-0 dark:text-white">৳{Number(order.total).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openStats(order); }}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 dark:text-slate-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
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
                  onClick={(e) => { e.stopPropagation(); setExpanded(expanded === order.id ? null : order.id); }}
                  className={`shrink-0 rounded-lg p-2 transition ${
                    expanded === order.id ? 'bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {expanded === order.id ? (
                      <polyline points="18 15 12 9 6 15" />
                    ) : (
                      <polyline points="6 9 12 15 18 9" />
                    )}
                  </svg>
                </button>
              </div>
              {expanded === order.id && (
                <ExpandedDetails order={order} onStatusUpdate={handleStatusUpdate} />
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              {emptyText}
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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">IP Address</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.orderNo}`} className="font-medium text-[#2f0f6b] hover:underline dark:text-[#a78bfa]">{order.orderNo}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.details?.customerName || order.user?.name || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{order.details?.phoneNumber || ''}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">৳{Number(order.total).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusColors[order.orderStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{order.orderStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}{' '}
                      {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{order.details?.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openStats(order); }}
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
                          onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                          className={`rounded-lg p-2 transition ${
                            expanded === order.id
                              ? 'bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/15 dark:text-[#a78bfa]'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                          }`}
                          title={expanded === order.id ? 'Collapse' : 'Expand details'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {expanded === order.id ? (
                              <polyline points="18 15 12 9 6 15" />
                            ) : (
                              <polyline points="6 9 12 15 18 9" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr>
                      <td colSpan={7} className="px-0 py-0">
                        <ExpandedDetails order={order} onStatusUpdate={handleStatusUpdate} />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
    </section>
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
