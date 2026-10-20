'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOrderByOrderNo, updateOrderStatus, updateOrderDetails, updateOrderItemQuantity, deleteOrderItem } from '../../../../src/actions/orders';
import { DEFAULT_DELIVERY_AREAS } from '../../../../src/lib/deliveryAreas';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';
import CourierBookingModal from '../../../../src/components/admin/CourierBookingModal';
import CourierStatusBadge from '../../../../src/components/admin/CourierStatusBadge';

const orderStatuses = ['pending', 'processing', 'completed', 'cancelled', 'return', 'incomplete'];

const orderStatusColors = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  processing: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  return: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  incomplete: { bg: 'bg-slate-100 dark:bg-slate-700/60', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  // Customer edit mode (card on the right) — zones come from site config.
  const [deliveryAreas, setDeliveryAreas] = useState(DEFAULT_DELIVERY_AREAS);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ customerName: '', phoneNumber: '', shippingArea: '', shippingAddress: '', orderNote: '' });
  const [customerErrors, setCustomerErrors] = useState({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);

  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState({ open: false, itemId: null });
  const [confirmQuantity, setConfirmQuantity] = useState({ open: false, itemId: null, newQty: null });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState(false);

  useEffect(() => {
    getOrderByOrderNo(params.orderNo).then((data) => {
      setOrder(data);
      setDeliveryInput(data.details ? String(Number(data.details.deliveryCharge)) : '0');
      setDiscountInput(data.details ? String(Number(data.details.discount || 0)) : '0');
      setLoading(false);
      if (data.details?.deviceHash) {
        fetch(`/api/checkout/check-blocked?deviceHash=${data.details.deviceHash}`)
          .then((res) => res.json())
          .then((d) => setIsBlocked(d.blocked))
          .catch(() => {});
      }
    });
  }, [params.orderNo]);

  const refreshOrder = useCallback(async () => {
    const updated = await getOrderByOrderNo(params.orderNo);
    setOrder(updated);
    return updated;
  }, [params.orderNo]);

  // Delivery zones configured on /admin/settings/site-config.
  useEffect(() => {
    fetch('/api/admin/settings/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const areas = data?.deliveryAreas;
        if (Array.isArray(areas) && areas.length) {
          setDeliveryAreas(areas.map((a) => ({ name: String(a.name), charge: Number(a.charge) })));
        }
      })
      .catch(() => {});
  }, []);

  const handleStatusUpdate = async (field, value) => {
    if (!order) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateOrderStatus(order.id, { [field]: value });
      await refreshOrder();
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

  const handleDiscountUpdate = async () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0 || !order) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateOrderDetails(order.id, { discount: val });
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setDiscountInput(String(Number(updated.details?.discount || 0)));
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
  const discount = Number(order.details?.discount || 0);
  const maxDiscount = subtotal + deliveryCharge;
  const discountOverLimit = parseFloat(discountInput) > maxDiscount;
  const osColor = orderStatusColors[order.orderStatus] || { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' };
  const canEdit = order.orderStatus !== 'completed';

  /* ── Customer card: derived values for edit mode ── */
  const customerLocked = order.orderStatus === 'completed' || order.orderStatus === 'cancelled';
  const customerInitials =
    (order.details?.customerName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?';
  const currentArea = order.details?.shippingArea || '';
  // Keep the order's current zone selectable even if it was later removed from
  // the configured list, otherwise the select would render blank.
  const areaOptions =
    currentArea && !deliveryAreas.some((a) => a.name === currentArea)
      ? [...deliveryAreas, { name: currentArea, charge: Number(order.details?.deliveryCharge || 0) }]
      : deliveryAreas;
  const selectedCharge = editingCustomer
    ? (areaOptions.find((a) => a.name === customerForm.shippingArea)?.charge ?? null)
    : null;
  const areaChanged = editingCustomer && !!currentArea && customerForm.shippingArea !== currentArea;

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

  const startEditCustomer = () => {
    setCustomerForm({
      customerName: order.details?.customerName || '',
      phoneNumber: order.details?.phoneNumber || '',
      shippingArea: order.details?.shippingArea || '',
      shippingAddress: order.details?.shippingAddress || '',
      orderNote: order.details?.orderNote || '',
    });
    setCustomerErrors({});
    setEditingCustomer(true);
  };

  const cancelEditCustomer = () => {
    setCustomerForm({ customerName: '', phoneNumber: '', shippingArea: '', shippingAddress: '', orderNote: '' });
    setCustomerErrors({});
    setEditingCustomer(false);
  };

  const handleCustomerSave = async () => {
    const phone = (customerForm.phoneNumber || '').trim();
    const address = (customerForm.shippingAddress || '').trim();
    const note = (customerForm.orderNote || '').trim();

    const errs = {};
    if (!phone) errs.phone = 'Mobile number is required.';
    else if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phone)) errs.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
    if (!address) errs.address = 'Shipping address is required.';
    setCustomerErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      customerName: (customerForm.customerName || '').trim(),
      phoneNumber: phone,
      shippingArea: customerForm.shippingArea,
      shippingAddress: address,
      orderNote: note || null,
    };
    // Changing the zone swaps in that zone's configured charge; the server
    // recalculates the order total whenever deliveryCharge changes.
    if (areaChanged && selectedCharge !== null) payload.deliveryCharge = selectedCharge;

    setSaving(true);
    setSaved(false);
    try {
      await updateOrderDetails(order.id, payload);
      const updated = await getOrderByOrderNo(params.orderNo);
      setOrder(updated);
      setDeliveryInput(updated.details ? String(Number(updated.details.deliveryCharge)) : '0');
      setEditingCustomer(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.message || 'Failed to save customer details');
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
          <button
            onClick={() => setCourierOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2f0f6b]/90 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Courier Booking
          </button>
          <Link
            href={`/admin/orders/${order.orderNo}/invoice?autoprint=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Download Invoice
          </Link>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${osColor.bg} ${osColor.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${osColor.dot}`} />
            {order.orderStatus}
          </span>
        </div>
      </div>

      {/* ── Order Items ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order Items</h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {order.items.map((item) => {
            const lineTotal = Number(item.purchasePrice) * item.quantity;
            return (
              <li key={item.id} className="px-2 py-4 hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/30">
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
                    <div className='flex justify-between'>
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
        <div className="border-t border-slate-100 bg-slate-50/50 px-2 py-4 space-y-2 dark:bg-slate-900/30 dark:border-slate-700">
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
          <div className="border-b border-slate-100 bg-slate-50/80 flex items-center justify-between px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customer</h2>
            {!editingCustomer && !customerLocked && order.details && (
              <button
                onClick={startEditCustomer}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          <div className="p-5">
            {order.details ? (
              editingCustomer ? (
                /* ── Edit mode ── */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerForm.customerName}
                      onChange={(e) => setCustomerForm((f) => ({ ...f, customerName: e.target.value }))}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={customerForm.phoneNumber}
                      onChange={(e) => setCustomerForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      placeholder="01XXXXXXXXX"
                    />
                    {customerErrors.phone && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{customerErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                      Delivery Area
                    </label>
                    <div className="relative">
                      <select
                        value={customerForm.shippingArea}
                        onChange={(e) => setCustomerForm((f) => ({ ...f, shippingArea: e.target.value }))}
                        disabled={saving}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      >
                        {areaOptions.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {selectedCharge !== null && <>Charge for this area: ৳{selectedCharge.toLocaleString()}. </>}
                      {areaChanged && selectedCharge !== null && 'Changing area will replace the current delivery charge and recalculate the total.'}
                      {areaChanged && selectedCharge === null && 'Changing area will keep the current delivery charge.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                      Shipping Address
                    </label>
                    <textarea
                      rows={3}
                      value={customerForm.shippingAddress}
                      onChange={(e) => setCustomerForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      placeholder="House, road, area, city"
                    />
                    {customerErrors.address && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{customerErrors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                      Order Note
                    </label>
                    <textarea
                      rows={3}
                      value={customerForm.orderNote}
                      onChange={(e) => setCustomerForm((f) => ({ ...f, orderNote: e.target.value }))}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
                      placeholder="Internal note, not shown to the customer"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCustomerSave}
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
                    <button
                      onClick={cancelEditCustomer}
                      disabled={saving}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="space-y-4">
                  {/* Identity */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f0f6b]/10 text-sm font-bold uppercase text-[#2f0f6b] ring-1 ring-inset ring-[#2f0f6b]/10 dark:bg-[#a78bfa]/15 dark:text-[#a78bfa] dark:ring-[#a78bfa]/20">
                      {customerInitials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                          {order.details.customerName || '—'}
                        </p>
                        {customerLocked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700/60 dark:text-slate-400">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Locked
                          </span>
                        )}
                      </div>

                      {order.details.phoneNumber ? (
                        <a
                          href={`tel:${order.details.phoneNumber}`}
                          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-[#2f0f6b] dark:text-slate-300 dark:hover:text-[#a78bfa]"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {order.details.phoneNumber}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">No phone number</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery area */}
                  {order.details.shippingArea && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600/60">
                      <svg className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {order.details.shippingArea}
                    </span>
                  )}

                  {/* Address */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Delivery address
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {order.details.shippingAddress || '—'}
                    </p>
                  </div>

                  {/* Note */}
                  {order.details.orderNote && (
                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-900/15">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Order note
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                        {order.details.orderNote}
                      </p>
                    </div>
                  )}
                </div>
              )
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

      {/* ── Courier booking summary (only when booked) ── */}
      {order.courierBooking && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center justify-between dark:border-slate-700 dark:bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Courier</h2>
            <CourierStatusBadge
              provider={order.courierBooking.provider}
              status={order.courierBooking.courierStatus}
            />
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Courier</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {{ steadfast: 'Steadfast', pathao: 'Pathao', redx: 'REDX' }[order.courierBooking.provider] || order.courierBooking.provider}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Consignment</p>
                <p className="font-mono text-slate-900 dark:text-white">{order.courierBooking.consignmentId}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Tracking Code</p>
                <p className="font-mono text-slate-900 dark:text-white">{order.courierBooking.trackingCode || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5 dark:text-slate-400">Last Synced</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {order.courierBooking.lastSyncedAt
                    ? new Date(order.courierBooking.lastSyncedAt).toLocaleString('en-US', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : 'Never'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCourierOpen(true)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              View details &amp; sync
            </button>
          </div>
        </div>
      )}

      {/* Courier Booking modal */}
      {courierOpen && (
        <CourierBookingModal
          order={order}
          onClose={() => setCourierOpen(false)}
          onBooked={refreshOrder}
        />
      )}

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
