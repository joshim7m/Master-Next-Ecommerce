'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOrderByOrderNo, updateOrderStatus, updateOrderDetails, updateOrderItemQuantity, deleteOrderItem } from '../../../../src/actions/orders';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';

const orderStatuses = ['pending', 'processing', 'completed', 'cancelled'];

const orderStatusColors = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  processing: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState({ open: false, itemId: null });
  const [confirmQuantity, setConfirmQuantity] = useState({ open: false, itemId: null, newQty: null });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState(false);

  useEffect(() => {
    getOrderByOrderNo(params.orderNo).then((data) => {
      setOrder(data);
      setDeliveryInput(data.details ? String(Number(data.details.deliveryCharge)) : '0');
      setLoading(false);
      if (data.details?.deviceHash) {
        fetch(`/api/checkout/check-blocked?deviceHash=${data.details.deviceHash}`)
          .then((res) => res.json())
          .then((d) => setIsBlocked(d.blocked))
          .catch(() => {});
      }
    });
  }, [params.orderNo]);

  const handleStatusUpdate = async (field, value) => {
    if (!order) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateOrderStatus(order.id, { [field]: value });
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleDeliveryChargeUpdate = async () => {
    const val = parseFloat(deliveryInput);
    if (isNaN(val) || val < 0 || !order) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateOrderDetails(order.id, { deliveryCharge: val });
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleBlock = async () => {
    const deviceHash = order?.details?.deviceHash;
    if (!deviceHash) return;
    setBlockLoading(true);
    try {
      const res = await fetch('/api/admin/orders/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceHash, orderNo: order.orderNo, reason: 'Blocked from order detail page' }),
      });
      if (res.ok) setIsBlocked(true);
      else {
        const data = await res.json();
        alert(data.error || 'Failed to block device.');
      }
    } catch {
      alert('Failed to block device.');
    }
    setBlockLoading(false);
  };

  const handleUnblock = async () => {
    const deviceHash = order?.details?.deviceHash;
    if (!deviceHash) return;
    setBlockLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/unblock?deviceHash=${deviceHash}`, { method: 'DELETE' });
      if (res.ok) setIsBlocked(false);
      else {
        const data = await res.json();
        alert(data.error || 'Failed to unblock device.');
      }
    } catch {
      alert('Failed to unblock device.');
    }
    setBlockLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg className="h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Order not found</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">No order matches &ldquo;{params.orderNo}&rdquo;</p>
        <Link href="/admin/orders" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90">&larr; Back to orders</Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + Number(item.purchasePrice) * item.quantity, 0);
  const deliveryCharge = Number(order.details?.deliveryCharge || 0);
  const osColor = orderStatusColors[order.orderStatus] || { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' };
  const canEdit = order.orderStatus !== 'completed';

  const handleQuantityUpdate = async (itemId, newQty) => {
    if (newQty < 1) return;
    setSaving(true);
    try {
      await updateOrderItemQuantity(itemId, newQty);
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleRemoveItem = async (itemId) => {
    setSaving(true);
    try {
      await deleteOrderItem(itemId);
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.message || 'Failed to remove item');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/orders"
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 transition shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{order.orderNo}</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Placed{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>
              {' at '}
              {new Date(order.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${osColor.bg} ${osColor.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${osColor.dot}`} />
            {order.orderStatus}
          </span>
        </div>
      </div>

      {/* ── Order Items ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order Items</h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {order.items.map((item) => {
            const lineTotal = Number(item.purchasePrice) * item.quantity;
            return (
              <li key={item.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-700">
                    {item.itemImagePath ? (
                      <img src={item.itemImagePath} alt={item.productTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-500">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate dark:text-white max-w-[300px] md:max-w-[550px]">{item.productTitle}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/30">
                        SKU: {item.sku || 'N/A'}
                      </span>
                      {item.variantName && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <svg className="h-3 w-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium text-slate-900 dark:text-white">৳{Number(item.purchasePrice).toLocaleString()}</span>
                      <span className="text-slate-400 dark:text-slate-500"> × {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">৳{lineTotal.toLocaleString()}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="mt-2 ml-20 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setConfirmQuantity({ open: true, itemId: item.id, newQty: item.quantity - 1 })}
                        disabled={item.quantity <= 1 || saving}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium text-slate-900 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => setConfirmQuantity({ open: true, itemId: item.id, newQty: item.quantity + 1 })}
                        disabled={saving}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    <button
                      onClick={() => setConfirmDelete({ open: true, itemId: item.id })}
                      disabled={saving}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition dark:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove item"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Totals */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 space-y-2 dark:bg-slate-900/30 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="font-medium text-slate-900 dark:text-white">৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Delivery</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {deliveryCharge > 0 ? `৳${deliveryCharge.toLocaleString()}` : 'Free'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-white">Total</span>
            <span className="text-lg font-bold text-[#2f0f6b] dark:text-[#a78bfa]">৳{Number(order.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Status, Customer, Device ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Status management */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Status</h2>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                Order Status
              </label>
              <div className="relative">
                <select
                  value={order.orderStatus}
                  onChange={(e) => handleStatusUpdate('orderStatus', e.target.value)}
                  disabled={saving}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                >
                  {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Delivery Charge */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                Delivery Charge
              </label>
              {order.orderStatus === 'completed' || order.orderStatus === 'cancelled' ? (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-900/50">
                  <span className="text-slate-900 font-medium dark:text-white">৳{deliveryCharge > 0 ? deliveryCharge.toLocaleString() : '0'}</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deliveryInput}
                      onChange={(e) => setDeliveryInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={handleDeliveryChargeUpdate}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
                  >
                    {saving ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Updating delivery charge will recalculate the total.</p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {saving && (
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </span>
              )}
              {saved && (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium dark:text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer details */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customer</h2>
          </div>
          <div className="p-5">
            {order.details ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.details.phoneNumber || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{order.details.customerName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Phone</p>
                    <p className="text-sm text-slate-900 font-medium dark:text-white">{order.details.phoneNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Shipping Area</p>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {order.details.shippingArea}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Shipping Address</p>
                    <p className="text-sm text-slate-900 bg-slate-50 rounded-lg p-3 border border-slate-100 dark:text-white dark:bg-slate-900/50 dark:border-slate-700">
                      {order.details.shippingAddress}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                <svg className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                No details available
              </div>
            )}
          </div>
        </div>

        {/* Device & Block */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Device & Block</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1 dark:text-slate-400">Device Hash</p>
              <p className="text-sm font-mono text-slate-700 break-all dark:text-slate-300">{order.details?.deviceHash || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1 dark:text-slate-400">IP Address</p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{order.details?.ipAddress || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1 dark:text-slate-400">Status</p>
              {isBlocked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeWidth="2" />
                  </svg>
                  Blocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Active
                </span>
              )}
            </div>
            {order.details?.deviceHash ? (
              isBlocked ? (
                <button
                  onClick={() => setConfirmUnblock(true)}
                  disabled={blockLoading}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-600"
                >
                  {blockLoading ? 'Processing...' : 'Unblock Device'}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmBlock(true)}
                  disabled={blockLoading}
                  className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 dark:bg-red-500 dark:text-white dark:hover:bg-red-600"
                >
                  {blockLoading ? 'Processing...' : 'Block Device'}
                </button>
              )
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No device hash — cannot block.</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Remove Item"
        message="Are you sure you want to remove this item from the order?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          handleRemoveItem(confirmDelete.itemId);
          setConfirmDelete({ open: false, itemId: null });
        }}
        onCancel={() => setConfirmDelete({ open: false, itemId: null })}
      />

      <ConfirmDialog
        open={confirmQuantity.open}
        title="Update Quantity"
        message={`Change quantity to ${confirmQuantity.newQty}?`}
        confirmLabel="Update"
        cancelLabel="Cancel"
        onConfirm={() => {
          handleQuantityUpdate(confirmQuantity.itemId, confirmQuantity.newQty);
          setConfirmQuantity({ open: false, itemId: null, newQty: null });
        }}
        onCancel={() => setConfirmQuantity({ open: false, itemId: null, newQty: null })}
      />

      <ConfirmDialog
        open={confirmBlock}
        title="Block Device"
        message={`Block this device?\n\nDevice: ${order?.details?.deviceHash}\nOrder: #${order?.orderNo}\nCustomer: ${order?.details?.customerName || '—'}`}
        confirmLabel="Block"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setConfirmBlock(false);
          handleBlock();
        }}
        onCancel={() => setConfirmBlock(false)}
      />

      <ConfirmDialog
        open={confirmUnblock}
        title="Unblock Device"
        message={`Unblock this device?\n\nDevice: ${order?.details?.deviceHash}`}
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmUnblock(false);
          handleUnblock();
        }}
        onCancel={() => setConfirmUnblock(false)}
      />
    </div>
  );
}
