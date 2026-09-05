'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { getOrders, updateOrderStatus } from '../../../src/actions/orders';

const orderStatuses = ['pending', 'processing', 'completed', 'cancelled'];

const orderStatusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const orderStatusDotColors = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOrderStatus, setFilterOrderStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getOrders().then((data) => { setOrders(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.details?.phoneNumber?.toLowerCase().includes(q)
      );
    }
    if (filterOrderStatus !== 'all') list = list.filter((o) => o.orderStatus === filterOrderStatus);
    return list;
  }, [orders, search, filterOrderStatus]);

  const handleStatusUpdate = async (id, field, value) => {
    try {
      await updateOrderStatus(id, { [field]: value });
      getOrders().then(setOrders);
    } catch {}
  };

  if (loading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search by order number or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
        </div>
        <select value={filterOrderStatus} onChange={(e) => setFilterOrderStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]">
          <option value="all">All Status</option>
          {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterOrderStatus !== 'all' || search) && (
          <button onClick={() => { setFilterOrderStatus('all'); setSearch(''); }} className="text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-300">Clear</button>
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
        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            {search || filterOrderStatus !== 'all' ? 'No orders match your filters.' : 'No orders yet.'}
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
            {filtered.map((order) => (
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
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">{search || filterOrderStatus !== 'all' ? 'No orders match your filters.' : 'No orders yet.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
