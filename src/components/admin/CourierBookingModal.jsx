'use client';

import { useEffect, useState } from 'react';
import {
  getAvailableCouriers,
  getCourierBooking,
  bookCourier,
  syncCourierStatus,
} from '../../actions/courier';
import CourierStatusBadge from './CourierStatusBadge';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]';
const LABEL = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400';
const FIELD_ERROR = 'mt-1 text-xs font-medium text-red-500';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Popup opened by the "Courier Booking" button on /admin/orders/[orderNo].
 *
 * Two states:
 *   A — not booked: Select Courier (Steadfast / Pathao / REDX) + prefilled form
 *   B — booked: booking info, courier status badge, Sync, tracking timeline
 */
export default function CourierBookingModal({ order, onClose, onBooked }) {
  const [loading, setLoading] = useState(true);
  const [couriers, setCouriers] = useState([]);
  const [provider, setProvider] = useState('steadfast');
  const [booked, setBooked] = useState(null);

  const [form, setForm] = useState(() => ({
    recipient_name: order?.details?.customerName || '',
    recipient_phone: order?.details?.phoneNumber || '',
    recipient_address: order?.details?.shippingAddress || '',
    cod_amount: Number(order?.total || 0),
    note: '',
    item_description: (order?.items || [])
      .map((i) => (i.variantName ? `${i.productTitle} (${i.variantName})` : i.productTitle))
      .join(', ')
      .slice(0, 255),
    total_lot: (order?.items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0) || 1,
    alternative_phone: '',
    delivery_type: 0,
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load couriers + existing booking; pick the default provider (last used,
  // else the first configured one).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [available, existing] = await Promise.all([
        getAvailableCouriers(),
        getCourierBooking(order.orderNo),
      ]);
      if (!alive) return;
      setCouriers(available);
      if (existing) setBooked(existing);

      let last = null;
      try {
        last = localStorage.getItem('courier:lastProvider');
      } catch {}
      const enabled = available.filter((c) => c.enabled);
      const preferred = enabled.find((c) => c.id === last) || enabled[0];
      setProvider(preferred ? preferred.id : 'steadfast');
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [order.orderNo]);

  // ESC to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const set = (name) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
  };

  const selectedCourier = couriers.find((c) => c.id === provider);
  const providerEnabled = Boolean(selectedCourier?.enabled);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerEnabled || submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const res = await bookCourier(order.orderNo, provider, form);
      if (res.ok) {
        try {
          localStorage.setItem('courier:lastProvider', provider);
        } catch {}
        const fresh = await getCourierBooking(order.orderNo);
        setBooked(fresh);
        onBooked?.();
      } else {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error || 'Booking failed.');
      }
    } catch (err) {
      setFormError(err.message || 'Unexpected error — see server logs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncNote(null);
    try {
      const res = await syncCourierStatus(order.orderNo);
      if (res.ok) {
        setBooked((prev) =>
          prev
            ? {
                ...prev,
                booking: {
                  ...prev.booking,
                  courierStatus: res.courierStatus,
                  lastSyncedAt: res.lastSyncedAt,
                },
                orderStatus: res.orderStatus,
              }
            : prev
        );
        setSyncNote(
          res.changed
            ? { tone: 'ok', text: `Updated — order status is now "${res.orderStatus}".` }
            : {
                tone: 'muted',
                text: res.flag
                  ? `Status "${res.courierStatus}" does not change the order status${res.flag === 'hold' ? ' (parcel on hold — contact support)' : ''}.`
                  : 'No change. Couriers cache status for ~60 seconds.',
              }
        );
        if (res.changed) onBooked?.();
      } else {
        setSyncNote({ tone: 'error', text: res.error || 'Sync failed.' });
      }
    } catch (err) {
      setSyncNote({ tone: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyTracking = async () => {
    const code = booked?.booking?.trackingCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const itemsSummary = order?.items || [];
  const booking = booked?.booking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-800"
        role="dialog"
        aria-modal="true"
        aria-label="Courier booking"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4 rounded-t-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2f0f6b]/10 text-[#2f0f6b] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Courier Booking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Order #{order.orderNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f0f6b] dark:border-slate-700 dark:border-t-[#a78bfa]" />
          </div>
        ) : booking ? (
          /* ── State B: already booked ── */
          <div className="px-6 py-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Courier" value={couriers.find((c) => c.id === booking.provider)?.label || booking.provider} />
              <Info label="Consignment ID" value={booking.consignmentId} mono />
              <Info label="Tracking Code" value={booking.trackingCode || '—'} mono />
              <Info label="Last Synced" value={formatDateTime(booking.lastSyncedAt)} />
              <div>
                <p className={LABEL}>Courier Status</p>
                <div className="mt-1">
                  <CourierStatusBadge provider={booking.provider} status={booking.courierStatus} />
                </div>
              </div>
              <div>
                <p className={LABEL}>Order Status</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700/60 dark:text-slate-300">
                  {booked.orderStatus}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {booking.trackingLink && (
                <a
                  href={booking.trackingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
                >
                  Track parcel
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {booking.trackingCode && (
                <button
                  onClick={handleCopyTracking}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {copied ? 'Copied!' : 'Copy tracking code'}
                </button>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {syncing && (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {syncing ? 'Syncing…' : 'Sync status'}
              </button>
            </div>

            {syncNote && (
              <p
                className={`text-xs font-medium ${
                  syncNote.tone === 'error'
                    ? 'text-red-500'
                    : syncNote.tone === 'ok'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {syncNote.text}
              </p>
            )}

            {/* Tracking timeline */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tracking history
              </h4>
              {booked.timelineError ? (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{booked.timelineError}</p>
              ) : booked.timeline?.length ? (
                <ol className="mt-3 space-y-3">
                  {[...booked.timeline]
                    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
                    .map((t, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f0f6b] dark:bg-[#a78bfa]" />
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{t.text}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(t.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No tracking steps yet.</p>
              )}
            </div>
          </div>
        ) : (
          /* ── State A: booking form ── */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Select Courier */}
            <div>
              <label className={LABEL} htmlFor="courier-provider">
                Select Courier
              </label>
              <div className="relative">
                <select
                  id="courier-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={submitting}
                  className={`${INPUT} appearance-none pr-8`}
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.enabled}>
                      {c.label}
                      {!c.enabled ? ` — ${c.reason || 'credentials pending'}` : ''}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {!providerEnabled && (
                <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {selectedCourier?.reason === 'disabled in settings'
                    ? 'This courier is disabled — turn it on in Settings → Courier Services.'
                    : selectedCourier?.reason === 'integration pending'
                      ? 'This courier has no booking integration yet — book it manually.'
                      : 'This courier’s credentials are not configured yet — add them in Settings → Courier Services.'}
                </p>
              )}
            </div>

            {/* Items summary (read-only) */}
            {itemsSummary.length > 0 && (
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Items ({itemsSummary.length})
                </p>
                <p className="mt-1 truncate text-sm text-slate-700 dark:text-slate-300">
                  {itemsSummary.map((i) => `${i.productTitle} × ${i.quantity}`).join(', ')}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="f-invoice">
                  Invoice
                </label>
                <input id="f-invoice" value={order.orderNo} disabled className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label className={LABEL} htmlFor="f-cod">
                  COD Amount (৳)
                </label>
                <input
                  id="f-cod"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={form.cod_amount}
                  onChange={set('cod_amount')}
                  disabled={submitting}
                  className={INPUT}
                />
                {fieldErrors.cod_amount && <p className={FIELD_ERROR}>{fieldErrors.cod_amount}</p>}
              </div>

              <div>
                <label className={LABEL} htmlFor="f-name">
                  Recipient Name
                </label>
                <input
                  id="f-name"
                  value={form.recipient_name}
                  onChange={set('recipient_name')}
                  disabled={submitting}
                  maxLength={100}
                  className={INPUT}
                />
                {fieldErrors.recipient_name && <p className={FIELD_ERROR}>{fieldErrors.recipient_name}</p>}
              </div>
              <div>
                <label className={LABEL} htmlFor="f-phone">
                  Recipient Phone
                </label>
                <input
                  id="f-phone"
                  value={form.recipient_phone}
                  onChange={set('recipient_phone')}
                  disabled={submitting}
                  placeholder="01XXXXXXXXX"
                  maxLength={40}
                  className={INPUT}
                />
                {fieldErrors.recipient_phone && <p className={FIELD_ERROR}>{fieldErrors.recipient_phone}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="f-address">
                  Recipient Address
                </label>
                <textarea
                  id="f-address"
                  value={form.recipient_address}
                  onChange={set('recipient_address')}
                  disabled={submitting}
                  rows={2}
                  maxLength={490}
                  className={INPUT}
                />
                {fieldErrors.recipient_address && <p className={FIELD_ERROR}>{fieldErrors.recipient_address}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="f-note">
                  Note for Rider <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="f-note"
                  value={form.note}
                  onChange={set('note')}
                  disabled={submitting}
                  rows={2}
                  maxLength={480}
                  placeholder="e.g. Call before 3 PM"
                  className={INPUT}
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="f-item-desc">
                  Item Description <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  id="f-item-desc"
                  value={form.item_description}
                  onChange={set('item_description')}
                  disabled={submitting}
                  maxLength={255}
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL} htmlFor="f-lots">
                    Lots
                  </label>
                  <input
                    id="f-lots"
                    type="number"
                    min="1"
                    value={form.total_lot}
                    onChange={set('total_lot')}
                    disabled={submitting}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="f-type">
                    Delivery
                  </label>
                  <select
                    id="f-type"
                    value={form.delivery_type}
                    onChange={set('delivery_type')}
                    disabled={submitting}
                    className={INPUT}
                  >
                    <option value={0}>Home</option>
                    <option value={1}>Point</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="f-alt-phone">
                  Alternative Phone <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  id="f-alt-phone"
                  value={form.alternative_phone}
                  onChange={set('alternative_phone')}
                  disabled={submitting}
                  placeholder="01XXXXXXXXX"
                  maxLength={40}
                  className={INPUT}
                />
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!providerEnabled || submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f0f6b] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#2f0f6b]/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#a78bfa] dark:text-slate-900 dark:hover:bg-[#a78bfa]/90"
              >
                {submitting && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? 'Booking…' : 'Book parcel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div>
      <p className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
        {label}
      </p>
      <p className={`text-sm text-slate-900 dark:text-white ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
